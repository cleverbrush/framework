// @cleverbrush/orm — Polymorphic write helpers
//
// Runtime implementations for `insertVariant`, `updateVariant`,
// `deleteVariant`, and `findVariant`. These are invoked from `DbSet` /
// `EntityQuery` and handle the two-table atomicity required for CTI
// (Class Table Inheritance) variants.

import {
    buildColumnMap,
    getPrimaryKeyColumns,
    getVariants,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the variant config for a schema, throwing if the schema is not
 * polymorphic or if the requested variant key is unknown.
 * @internal
 */
function requireVariantSpec(schema: any, variantKey: string) {
    const raw = getVariants(schema);
    if (!raw) {
        throw new Error(
            `insertVariant / deleteVariant / updateVariant / findVariant: ` +
                `entity schema is not polymorphic (no variants declared).`
        );
    }
    const spec = raw.variants[variantKey];
    if (!spec) {
        const known = Object.keys(raw.variants).join(', ');
        throw new Error(
            `Variant key "${variantKey}" is unknown. Known variants: ${known}.`
        );
    }
    return { config: raw, spec };
}

/**
 * Derive the SQL discriminator column name from the schema's propToCol map.
 * @internal
 */
function _resolveDiscriminatorColumn(
    schema: any,
    discriminatorKey: string
): string {
    const { propToCol } = buildColumnMap(schema);
    return propToCol.get(discriminatorKey) ?? discriminatorKey;
}

// ---------------------------------------------------------------------------
// insertVariant
// ---------------------------------------------------------------------------

/**
 * Transactionally insert a polymorphic entity row.
 *
 * For CTI variants:
 *   1. Inserts the base row with `discriminatorColumn = variantKey` and all
 *      base-table payload columns; captures the auto-generated PK.
 *   2. Inserts the variant row with the FK set to the base PK and all
 *      variant-table payload columns.
 *
 * For STI variants:
 *   - Inserts a single row into the base table with the discriminator set.
 *
 * @internal
 */
export async function insertVariant(
    knex: Knex,
    schema: any,
    variantKey: string,
    payload: Record<string, unknown>,
    trx?: Knex.Transaction
): Promise<Record<string, unknown>> {
    // Validate before opening a transaction so errors surface immediately.
    const { config, spec } = requireVariantSpec(schema, variantKey);

    const run = async (t: Knex): Promise<Record<string, unknown>> => {
        const discKey = config.discriminatorKey;
        const baseTableName = schema.getExtension?.('tableName') as string;
        if (!baseTableName) {
            throw new Error('insertVariant: base schema has no table name.');
        }

        if (spec.storage === 'sti') {
            // Single-table: insert into base table with discriminator column
            const row = { ...payload, [discKey]: variantKey };
            const sqb = schemaQuery(t, schema) as unknown as {
                insert: (data: unknown) => Promise<Record<string, unknown>>;
            };
            return (await sqb.insert(row)) ?? row;
        }

        // CTI: two-table insert
        const variantSchema = spec.schema;
        const variantTableName = spec.tableName as string;
        const fkCol = spec.foreignKey as string;

        // Split payload between base-schema columns and variant-schema columns
        const baseIntrospected = (schema as any).introspect?.() as {
            properties?: Record<string, unknown>;
        };
        const variantIntrospected = variantSchema.introspect?.() as {
            properties?: Record<string, unknown>;
        };
        const basePropKeys = new Set(
            Object.keys(baseIntrospected?.properties ?? {})
        );
        const variantPropKeys = new Set(
            Object.keys(variantIntrospected?.properties ?? {})
        );

        const basePayload: Record<string, unknown> = { [discKey]: variantKey };
        const variantPayload: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(payload)) {
            // Discriminator is set automatically; FK is set from base PK
            if (key === discKey || key === fkCol) continue;
            if (basePropKeys.has(key)) {
                basePayload[key] = val;
            } else if (variantPropKeys.has(key)) {
                variantPayload[key] = val;
            }
            // Keys that match neither schema are silently dropped
        }

        // 1. Insert base row using raw knex (not SchemaQueryBuilder) to avoid
        //    polymorphic result-resolution running before the variant row exists.
        const { propToCol: basePropToCol } = buildColumnMap(schema);
        const baseRowForInsert: Record<string, unknown> = {};
        for (const [propKey, val] of Object.entries(basePayload)) {
            baseRowForInsert[basePropToCol.get(propKey) ?? propKey] = val;
        }
        const baseInsertResult = await (t as unknown as Knex)(baseTableName)
            .insert(baseRowForInsert)
            .returning('*');
        const baseRow: Record<string, unknown> =
            Array.isArray(baseInsertResult) && baseInsertResult.length > 0
                ? (baseInsertResult[0] as Record<string, unknown>)
                : baseRowForInsert;

        // Resolve the base PK value from the returned row
        const pkInfo = getPrimaryKeyColumns(schema);
        if (pkInfo.propertyKeys.length === 0) {
            throw new Error(
                `insertVariant: base schema has no primary key declared.`
            );
        }
        if (pkInfo.propertyKeys.length > 1) {
            throw new Error(
                `insertVariant: composite primary keys are not yet supported for polymorphic CTI inserts.`
            );
        }
        const pkPropKey = pkInfo.propertyKeys[0];
        const pkColName = pkInfo.columnNames[0];
        const pkValue = baseRow[pkPropKey] ?? baseRow[pkColName];
        if (pkValue === undefined) {
            throw new Error(
                `insertVariant: could not resolve PK value from base insert result.`
            );
        }

        // 2. Insert variant row using raw knex (not SchemaQueryBuilder) so we
        //    can set the FK column even if it isn't in the schema's column map.
        const { propToCol: varPropToCol } = buildColumnMap(variantSchema);
        const variantRow: Record<string, unknown> = { [fkCol]: pkValue };
        for (const [propKey, val] of Object.entries(variantPayload)) {
            const colName = varPropToCol.get(propKey) ?? propKey;
            variantRow[colName] = val;
        }
        const discColInVariant = varPropToCol.get(discKey);
        if (discColInVariant) {
            variantRow[discColInVariant] = variantKey;
        }
        await (t as unknown as Knex)(variantTableName).insert(variantRow);

        // 3. Merge and return
        const { colToProp: baseColToProp } = buildColumnMap(schema);
        const result: Record<string, unknown> = {};
        for (const [col, val] of Object.entries(baseRow)) {
            result[baseColToProp.get(col) ?? col] = val;
        }
        // Ensure discriminator and variant payload are in the result
        result[discKey] = variantKey;
        for (const [propKey, val] of Object.entries(variantPayload)) {
            result[propKey] = val;
        }
        return result;
    };

    if (trx) return run(trx as unknown as Knex);
    return (knex as Knex).transaction(t => run(t as unknown as Knex));
}

// ---------------------------------------------------------------------------
// updateVariant
// ---------------------------------------------------------------------------

/**
 * Update variant-specific columns for all rows matching the current query
 * whose discriminator equals `variantKey`.
 *
 * For CTI: runs UPDATE on the variant table, joining on the FK = base PK.
 * For STI: runs UPDATE on the base table filtered by discriminator.
 *
 * The `getPks` callback must return the PK values of all rows the caller's
 * WHERE clause matched (resolved before this function is called).
 *
 * @internal
 */
export async function updateVariant(
    knex: Knex,
    schema: any,
    variantKey: string,
    set: Record<string, unknown>,
    pkValues: readonly unknown[],
    trx?: Knex.Transaction
): Promise<void> {
    if (pkValues.length === 0) return;

    const db: Knex = (trx as unknown as Knex) ?? knex;
    const { config, spec } = requireVariantSpec(schema, variantKey);
    const discKey = config.discriminatorKey;

    if (spec.storage === 'sti') {
        // STI: update the base table restricted to the discriminator value
        const { propToCol } = buildColumnMap(schema);
        const discCol = propToCol.get(discKey) ?? discKey;
        const pkInfo = getPrimaryKeyColumns(schema);
        if (pkInfo.columnNames.length === 0) {
            throw new Error(
                `updateVariant: base schema has no primary key declared.`
            );
        }
        if (pkInfo.columnNames.length > 1) {
            throw new Error(
                `updateVariant: composite primary keys are not supported for STI updates.`
            );
        }
        const pkColName = pkInfo.columnNames[0];
        const baseTable = schema.getExtension?.('tableName') as string;

        const updateData: Record<string, unknown> = {};
        for (const [propKey, val] of Object.entries(set)) {
            updateData[propToCol.get(propKey) ?? propKey] = val;
        }

        await db(baseTable)
            .whereIn(pkColName, pkValues as any[])
            .andWhere(discCol, variantKey)
            .update(updateData);
        return;
    }

    // CTI: update the variant table
    const variantSchema = spec.schema;
    const variantTableName = spec.tableName as string;
    const fkCol = spec.foreignKey as string;
    const { propToCol: varPropToCol } = buildColumnMap(variantSchema);

    const updateData: Record<string, unknown> = {};
    for (const [propKey, val] of Object.entries(set)) {
        // Don't allow updating the FK (it's the join column)
        if (propKey === fkCol) continue;
        updateData[varPropToCol.get(propKey) ?? propKey] = val;
    }

    if (Object.keys(updateData).length === 0) return;

    await db(variantTableName)
        .whereIn(fkCol, pkValues as any[])
        .update(updateData);
}

// ---------------------------------------------------------------------------
// deleteVariant
// ---------------------------------------------------------------------------

/**
 * Delete rows for a specific variant key, given their base-table PK values.
 *
 * For CTI: deletes variant rows first (FK-constraint order), then base rows.
 * For STI: deletes the single base-table row filtered by discriminator.
 *
 * @internal
 */
export async function deleteVariant(
    knex: Knex,
    schema: any,
    variantKey: string,
    pkValues: readonly unknown[],
    trx?: Knex.Transaction
): Promise<void> {
    if (pkValues.length === 0) return;

    const run = async (t: Knex): Promise<void> => {
        const { config, spec } = requireVariantSpec(schema, variantKey);
        const discKey = config.discriminatorKey;
        const baseTable = schema.getExtension?.('tableName') as string;
        const pkInfo = getPrimaryKeyColumns(schema);
        if (pkInfo.columnNames.length === 0) {
            throw new Error(
                `deleteVariant: base schema has no primary key declared.`
            );
        }
        if (pkInfo.columnNames.length > 1) {
            throw new Error(
                `deleteVariant: composite primary keys are not supported for variant deletes.`
            );
        }
        const pkColName = pkInfo.columnNames[0];

        if (spec.storage === 'sti') {
            const { propToCol } = buildColumnMap(schema);
            const discCol = propToCol.get(discKey) ?? discKey;
            await (t as unknown as Knex)(baseTable)
                .whereIn(pkColName, pkValues as any[])
                .andWhere(discCol, variantKey)
                .delete();
            return;
        }

        // CTI: variant rows first, then base rows
        const variantTableName = spec.tableName as string;
        const fkCol = spec.foreignKey as string;

        await (t as unknown as Knex)(variantTableName)
            .whereIn(fkCol, pkValues as any[])
            .delete();

        await (t as unknown as Knex)(baseTable)
            .whereIn(pkColName, pkValues as any[])
            .delete();
    };

    if (trx) return run(trx as unknown as Knex);
    return (knex as Knex).transaction(t => run(t as unknown as Knex));
}
