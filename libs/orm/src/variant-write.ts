// Polymorphic writes share the ordinary storage codecs and timestamp pipeline.
// Hooks operate on one logical entity before payloads are split across tables.
import {
    buildColumnMap,
    getPrimaryKeyColumns,
    getVariants,
    object,
    type PolymorphicQueryBuilder,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { ObjectSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';

type Row = Record<string, any>;
type Schema = ObjectSchemaBuilder<any, any, any, any, any, any, any>;
type Mutation = 'update' | 'delete' | 'restore' | 'hardDelete';

const lifecycle = new Set([
    'beforeInsert',
    'afterInsert',
    'beforeUpdate',
    'beforeDelete'
]);

/** Keep physical-table metadata; lifecycle hooks run once on the logical row. */
function storageSchema(
    schema: Schema,
    properties: Record<
        string,
        SchemaBuilder<any, any, any, any, any>
    > = schema.introspect().properties,
    relations: readonly { name: string }[] = []
): Schema {
    const navigation = new Set(
        [
            ...((schema.getExtension('relations') as
                | { name: string }[]
                | undefined) ?? []),
            ...relations
        ].map(relation => relation.name)
    );
    let stored: Schema = object(
        Object.fromEntries(
            Object.entries(properties).filter(([name]) => !navigation.has(name))
        )
    );
    for (const [key, value] of Object.entries(
        schema.introspect().extensions ?? {}
    )) {
        if (
            key !== 'variants' &&
            key !== 'polymorphicVariants' &&
            key !== 'defaultScope' &&
            !lifecycle.has(key)
        )
            stored = stored.withExtension(key, value) as Schema;
    }
    return stored;
}

function layout(schema: Schema, key: string) {
    const config = getVariants(schema);
    const spec = config?.variants[key];
    if (!config || !spec)
        throw new Error(`Unknown polymorphic variant: ${key}`);
    const pk = getPrimaryKeyColumns(schema);
    if (pk.propertyKeys.length !== 1)
        throw new Error('Variant writes require a single-column primary key');
    const baseMap = buildColumnMap(storageSchema(schema));
    const body = storageSchema(spec.schema, undefined, spec.relations);
    const bodyMap = buildColumnMap(body);
    const base = storageSchema(
        schema,
        spec.storage === 'sti'
            ? {
                  ...schema.introspect().properties,
                  ...spec.schema.introspect().properties
              }
            : undefined,
        spec.storage === 'sti'
            ? [
                  ...spec.relations,
                  ...((spec.schema.getExtension('relations') as
                      | { name: string }[]
                      | undefined) ?? [])
              ]
            : []
    );
    return {
        config,
        spec,
        base,
        body,
        baseMap,
        bodyMap,
        pk: pk.propertyKeys[0],
        pkColumn: pk.columnNames[0],
        foreignKey: bodyMap.colToProp.get(spec.foreignKey ?? ''),
        table: schema.getExtension('tableName') as string,
        discriminatorColumn: baseMap.propToCol.get(config.discriminatorKey)!,
        hooks: (name: string): Function[] =>
            [schema, spec.schema].flatMap(
                s => (s.getExtension(name) as Function[] | undefined) ?? []
            )
    };
}

function assertPatch(meta: ReturnType<typeof layout>, patch: Row): void {
    const protectedKeys = new Set([
        meta.pk,
        meta.pkColumn,
        meta.config.discriminatorKey,
        meta.discriminatorColumn,
        ...(meta.spec.storage === 'cti'
            ? [meta.foreignKey, meta.spec.foreignKey]
            : [])
    ]);
    for (const prop of Object.keys(patch)) {
        if (protectedKeys.has(prop))
            throw new Error(
                `Variant updates cannot change identity property "${prop}"`
            );
        if (
            !meta.baseMap.propToCol.has(prop) &&
            !meta.bodyMap.propToCol.has(prop)
        )
            throw new Error(`Unknown variant property: ${prop}`);
    }
}

async function prepare(hooks: Function[], input: Row): Promise<Row> {
    let data = { ...input };
    for (const hook of hooks) data = (await hook(data)) ?? data;
    return data;
}

function split(meta: ReturnType<typeof layout>, data: Row): [Row, Row] {
    const base: Row = {};
    const body: Row = {};
    for (const [key, value] of Object.entries(data)) {
        if (meta.baseMap.propToCol.has(key)) base[key] = value;
        else if (meta.bodyMap.propToCol.has(key)) body[key] = value;
    }
    return [base, body];
}

// An STI body shares the physical base table, but can name additional timestamp
// columns. The ordinary writer handles the base schema's timestamps itself.
function stiTimestamps(
    meta: ReturnType<typeof layout>,
    db: Knex,
    data: Row,
    insert: boolean
): Row {
    const timestamps = meta.body.getExtension('timestamps') as
        | { createdAt: string; updatedAt: string }
        | undefined;
    if (!timestamps) return data;
    const columns = buildColumnMap(meta.base).colToProp;
    return {
        ...data,
        ...(insert
            ? {
                  [columns.get(timestamps.createdAt) ?? timestamps.createdAt]:
                      db.fn.now()
              }
            : {}),
        [columns.get(timestamps.updatedAt) ?? timestamps.updatedAt]: db.fn.now()
    };
}

// RETURNING must not replay default-scope callbacks or hide a row which a
// successful mutation just moved outside a scope. Decode the stored branch.
function storedVariantQuery(db: Knex, schema: Schema, key: string) {
    const config = getVariants(schema)!;
    const spec = config.variants[key];
    const stored = schema
        .withExtension('defaultScope', undefined)
        .withExtension('variants', {
            ...config,
            variants: {
                [key]: {
                    ...spec,
                    schema: spec.schema
                        .withExtension('defaultScope', undefined)
                        .withExtension('softDelete', undefined)
                }
            }
        });
    return (schemaQuery(db, stored) as any).selectVariants([key]).withDeleted();
}

function readRows(
    db: Knex,
    schema: Schema,
    key: string,
    ids: readonly unknown[]
): Promise<Row[]> {
    const pk = getPrimaryKeyColumns(schema).propertyKeys[0];
    return storedVariantQuery(db, schema, key).whereIn(pk, ids).execute();
}

/** @internal Atomic insert, including hooks and both CTI storage rows. */
export async function insertVariant(
    knex: Knex,
    schema: Schema,
    variantKey: string,
    payload: Row,
    trx?: Knex.Transaction
): Promise<Row> {
    const meta = layout(schema, variantKey);
    // A transaction on an existing transaction creates a savepoint. A caller
    // may catch a failed write without retaining a partially inserted entity.
    return (trx ?? knex).transaction(async t => {
        const data = await prepare(meta.hooks('beforeInsert'), {
            ...payload,
            [meta.config.discriminatorKey]: variantKey
        });
        data[meta.config.discriminatorKey] = variantKey;
        const [baseData, bodyData] = split(meta, data);
        let result: Row;
        if (meta.spec.storage === 'sti') {
            result = await schemaQuery(t, meta.base).insert(
                stiTimestamps(meta, t, { ...baseData, ...bodyData }, true)
            );
        } else {
            const base = await schemaQuery(t, meta.base).insert(baseData);
            // foreignKey is the schema property name, not its SQL column name.
            bodyData[meta.foreignKey!] = base[meta.pk];
            if (meta.bodyMap.propToCol.has(meta.config.discriminatorKey))
                bodyData[meta.config.discriminatorKey] = variantKey;
            await schemaQuery(t, meta.body).insert(bodyData);
            [result] = await readRows(t, schema, variantKey, [base[meta.pk]]);
            if (!result)
                throw new Error('Inserted variant could not be read back');
        }
        for (const hook of meta.hooks('afterInsert')) await hook(result);
        return result;
    });
}

/** @internal Shared result for explicit writes and optimistic tracked saves. */
export interface VariantMutationResult {
    rows: Row[];
    count: number;
}

/**
 * @internal Apply a single variant mutation within a transaction/savepoint.
 * Selection is untracked and locks base rows, then CTI rows, in primary-key order.
 * Recheck predicates after waiting for locks before invoking any lifecycle hook.
 */
export async function mutateVariant(
    knex: Knex,
    schema: Schema,
    variantKey: string,
    query: PolymorphicQueryBuilder<any, any>,
    operation: Mutation,
    patch: Row = {},
    managedValues: Row = {}
): Promise<VariantMutationResult> {
    const meta = layout(schema, variantKey);
    query.mutationTargets(variantKey); // Validate before executing any SQL.
    if (operation === 'update') assertPatch(meta, patch);
    if (operation === 'restore' && !meta.base.getExtension('softDelete'))
        throw new Error(
            'Schema does not have soft delete enabled. Use .softDelete() on the base schema.'
        );
    return knex.transaction(async t => {
        const selected = query.transacting(t);
        const targets = () =>
            t(meta.table)
                .whereIn(meta.pkColumn, selected.mutationTargets(variantKey))
                .andWhere(meta.discriminatorColumn, variantKey);
        // Cast before pg's parsers, which may otherwise round a bigint key.
        const keyColumn = t.raw('cast(?? as text) as ??', [
            meta.pkColumn,
            meta.pk
        ]);
        const locked = await targets()
            .orderBy(meta.pkColumn)
            .forUpdate()
            .select(keyColumn);
        let ids = locked.map(row => row[meta.pk]);
        if (!ids.length) return { rows: [], count: 0 };
        if (meta.spec.storage === 'cti') {
            await t(meta.spec.tableName!)
                .whereIn(meta.spec.foreignKey!, ids)
                .orderBy(meta.spec.foreignKey!)
                .forUpdate()
                .select(t.raw('1'));
        }
        const confirmed = await targets()
            .whereIn(meta.pkColumn, ids)
            .select(keyColumn);
        ids = confirmed.map(row => row[meta.pk]);
        if (!ids.length) return { rows: [], count: 0 };
        const baseQuery = () =>
            schemaQuery(t, meta.base)
                .unscoped()
                .withDeleted()
                .whereIn(meta.pk, ids);
        const bodyQuery = () =>
            schemaQuery(t, meta.body)
                .unscoped()
                .withDeleted()
                .whereIn(meta.foreignKey!, ids);

        if (operation === 'update') {
            const data = await prepare(meta.hooks('beforeUpdate'), patch);
            assertPatch(meta, data);
            Object.assign(data, managedValues); // Tracker owns automatic row versions.
            const [baseData, bodyData] = split(meta, data);
            if (meta.spec.storage === 'sti') {
                const combined = stiTimestamps(
                    meta,
                    t,
                    { ...baseData, ...bodyData },
                    false
                );
                if (
                    Object.keys(combined).length ||
                    meta.base.getExtension('timestamps')
                )
                    await baseQuery().update(combined);
            } else {
                if (
                    Object.keys(baseData).length ||
                    meta.base.getExtension('timestamps')
                )
                    await baseQuery().update(baseData);
                if (
                    Object.keys(bodyData).length ||
                    meta.body.getExtension('timestamps')
                )
                    await bodyQuery().update(bodyData);
            }
            return {
                rows: await readRows(t, schema, variantKey, ids),
                count: ids.length
            };
        }
        if (operation === 'restore') {
            await baseQuery().restore();
            return {
                rows: await readRows(t, schema, variantKey, ids),
                count: ids.length
            };
        }
        // IDs already include scopes and pagination; do not apply an offset twice.
        const hookQuery = storedVariantQuery(t, schema, variantKey).whereIn(
            meta.pk,
            ids
        );
        for (const hook of meta.hooks('beforeDelete')) await hook(hookQuery);
        if (operation === 'delete' && meta.base.getExtension('softDelete')) {
            await baseQuery().delete();
        } else {
            if (meta.spec.storage === 'cti') await bodyQuery().hardDelete();
            await baseQuery().hardDelete();
        }
        return { rows: [], count: ids.length };
    });
}
