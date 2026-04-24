/**
 * Save-graph executor: persists a nested write graph (root + related
 * entities) within a single transaction, deciding insert vs update from
 * the presence of primary-key fields.
 *
 * Topology:
 * 1. `belongsTo` parents are saved first; their generated PKs are written
 *    into the root's foreign-key columns.
 * 2. The root row is then inserted or updated.
 * 3. `hasOne` / `hasMany` children are saved with the root's PK propagated
 *    into their foreign-key column.
 * 4. `belongsToMany` children are saved, then through-table rows written.
 *
 * Hooks (`beforeInsert` / `afterInsert` / `beforeUpdate`) fire naturally
 * because all writes go through `SchemaQueryBuilder`.
 *
 * @packageDocumentation
 */

import {
    buildColumnMap,
    getPrimaryKeyColumns,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

/**
 * Spec entry persisted by `Entity.hasOne/hasMany/belongsTo/belongsToMany`
 * onto the schema's `'relations'` extension.
 *
 * @internal
 */
interface RelationSpec {
    readonly type: 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany';
    readonly name: string;
    readonly schema: any;
    readonly foreignKey?: string;
    readonly through?: {
        readonly table: string;
        readonly localKey: string;
        readonly foreignKey: string;
    };
}

/**
 * @internal Read the relations extension from a schema, returning `[]`
 * when none is declared.
 */
function getRelations(schema: any): readonly RelationSpec[] {
    const ext =
        (schema?.getExtension?.('relations') as RelationSpec[] | undefined) ??
        [];
    return ext;
}

/**
 * @internal Resolve a property name to its column name; falls back to the
 * input when the schema doesn't declare an explicit column mapping.
 */
function colFor(schema: any, prop: string): string {
    const { propToCol } = buildColumnMap(schema);
    return propToCol.get(prop) ?? prop;
}

/**
 * @internal Whether a graph node already carries values for every PK
 * column declared on the schema. Used to decide insert vs update.
 */
function hasFullPk(schema: any, node: Record<string, unknown>): boolean {
    const pk = getPrimaryKeyColumns(schema);
    if (pk.propertyKeys.length === 0) return false;
    return pk.propertyKeys.every(k => node[k] !== undefined);
}

/**
 * Persist a graph rooted at `node` whose shape matches `schema` (and its
 * declared relations). All writes are funnelled through `trx` so the
 * caller can compose this with an outer transaction.
 *
 * @internal — call via `DbSet.save()`.
 */
export async function saveGraph(
    knex: Knex,
    schema: any,
    node: Record<string, unknown>,
    trx?: Knex.Transaction
): Promise<Record<string, unknown>> {
    if (trx) return saveNode(trx as unknown as Knex, schema, node);
    return knex.transaction(t => saveNode(t as unknown as Knex, schema, node));
}

/**
 * @internal Recursive worker. Operates on the supplied `knex` (which is
 * already a transaction handle inside `saveGraph`).
 */
async function saveNode(
    trx: Knex,
    schema: any,
    node: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const relations = getRelations(schema);
    const relByName = new Map<string, RelationSpec>();
    for (const r of relations) relByName.set(r.name, r);

    // Split node into own fields vs nested relation values.
    const ownFields: Record<string, unknown> = {};
    const nested: Record<string, { spec: RelationSpec; value: unknown }> = {};
    for (const [k, v] of Object.entries(node)) {
        const spec = relByName.get(k);
        if (spec) {
            nested[k] = { spec, value: v };
        } else {
            ownFields[k] = v;
        }
    }

    // ---------------------------------------------------------------------
    // 1. belongsTo parents — save first; copy their PK into our FK column.
    // ---------------------------------------------------------------------
    for (const { spec, value } of Object.values(nested)) {
        if (spec.type !== 'belongsTo') continue;
        if (value == null) continue;
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(
                `save: relation "${spec.name}" expects an object (belongsTo).`
            );
        }
        const savedParent = await saveNode(
            trx,
            spec.schema,
            value as Record<string, unknown>
        );
        const parentPk = getPrimaryKeyColumns(spec.schema);
        if (parentPk.propertyKeys.length !== 1) {
            throw new Error(
                `save: belongsTo "${spec.name}" requires the parent ` +
                    `entity to have a single-column primary key.`
            );
        }
        const parentPkVal = savedParent[parentPk.propertyKeys[0]];
        if (!spec.foreignKey) {
            throw new Error(
                `save: belongsTo "${spec.name}" is missing a foreignKey.`
            );
        }
        // Resolve property-name FK to a property on this schema that the
        // SchemaQueryBuilder will translate to a column at write time.
        ownFields[spec.foreignKey] = parentPkVal;
    }

    // ---------------------------------------------------------------------
    // 2. Save self (insert vs update from PK presence).
    // ---------------------------------------------------------------------
    const isUpdate = hasFullPk(schema, ownFields);
    const sqb = schemaQuery(trx, schema) as unknown as {
        andWhere: (col: string, op: string, val: unknown) => unknown;
        update: (data: unknown) => Promise<unknown>;
        insert: (data: unknown) => Promise<unknown>;
    };

    let saved: Record<string, unknown>;

    if (isUpdate) {
        const pk = getPrimaryKeyColumns(schema);
        const updateData: Record<string, unknown> = { ...ownFields };
        for (const k of pk.propertyKeys) delete updateData[k];
        for (const k of pk.propertyKeys) {
            sqb.andWhere(k, '=', ownFields[k]);
        }
        // SchemaQueryBuilder.update returns the updated row(s).
        const result = (await sqb.update(updateData)) as unknown;
        if (Array.isArray(result)) {
            saved = (result[0] ?? ownFields) as Record<string, unknown>;
        } else if (result && typeof result === 'object') {
            saved = result as Record<string, unknown>;
        } else {
            saved = ownFields;
        }
        // Re-merge PK fields in case `update` returned a partial row.
        for (const k of pk.propertyKeys) saved[k] = ownFields[k];
    } else {
        const inserted = (await sqb.insert(ownFields)) as Record<
            string,
            unknown
        >;
        saved = inserted ?? ownFields;
    }

    // Pull back our own PK so children can reference it.
    const ownPk = getPrimaryKeyColumns(schema);
    if (ownPk.propertyKeys.length === 1) {
        const k = ownPk.propertyKeys[0];
        if (saved[k] === undefined && ownFields[k] !== undefined) {
            saved[k] = ownFields[k];
        }
    }

    // ---------------------------------------------------------------------
    // 3. hasOne / hasMany / belongsToMany children.
    // ---------------------------------------------------------------------
    for (const [name, { spec, value }] of Object.entries(nested)) {
        if (spec.type === 'belongsTo') continue;
        if (value == null) continue;

        if (spec.type === 'hasOne') {
            if (typeof value !== 'object' || Array.isArray(value)) {
                throw new Error(
                    `save: relation "${name}" expects a single object (hasOne).`
                );
            }
            const ownSinglePk = ownPk.propertyKeys[0];
            if (ownPk.propertyKeys.length !== 1) {
                throw new Error(
                    `save: hasOne "${name}" requires this entity to have ` +
                        `a single-column primary key.`
                );
            }
            const child = { ...(value as Record<string, unknown>) };
            if (spec.foreignKey) child[spec.foreignKey] = saved[ownSinglePk];
            const savedChild = await saveNode(trx, spec.schema, child);
            saved[name] = savedChild;
            continue;
        }

        if (spec.type === 'hasMany') {
            if (!Array.isArray(value)) {
                throw new Error(
                    `save: relation "${name}" expects an array (hasMany).`
                );
            }
            const ownSinglePk = ownPk.propertyKeys[0];
            if (ownPk.propertyKeys.length !== 1) {
                throw new Error(
                    `save: hasMany "${name}" requires this entity to have ` +
                        `a single-column primary key.`
                );
            }
            const savedChildren: Record<string, unknown>[] = [];
            for (const child of value as Record<string, unknown>[]) {
                const childCopy = { ...child };
                if (spec.foreignKey) {
                    childCopy[spec.foreignKey] = saved[ownSinglePk];
                }
                savedChildren.push(await saveNode(trx, spec.schema, childCopy));
            }
            saved[name] = savedChildren;
            continue;
        }

        // belongsToMany: insert children first, then write through-table rows.
        if (spec.type === 'belongsToMany') {
            if (!spec.through) {
                throw new Error(
                    `save: belongsToMany "${name}" is missing a through config.`
                );
            }
            if (!Array.isArray(value)) {
                throw new Error(
                    `save: relation "${name}" expects an array (belongsToMany).`
                );
            }
            const ownSinglePk = ownPk.propertyKeys[0];
            if (ownPk.propertyKeys.length !== 1) {
                throw new Error(
                    `save: belongsToMany "${name}" requires this entity ` +
                        `to have a single-column primary key.`
                );
            }
            const savedChildren: Record<string, unknown>[] = [];
            for (const child of value as Record<string, unknown>[]) {
                const childPk = getPrimaryKeyColumns(spec.schema);
                if (childPk.propertyKeys.length !== 1) {
                    throw new Error(
                        `save: belongsToMany "${name}" requires the ` +
                            `child entity to have a single-column primary key.`
                    );
                }
                const childKey = childPk.propertyKeys[0];
                let savedChild: Record<string, unknown>;
                if (child[childKey] !== undefined) {
                    // Reference-only: use as-is, do NOT touch the child row.
                    savedChild = { ...child };
                } else {
                    savedChild = await saveNode(trx, spec.schema, child);
                }
                savedChildren.push(savedChild);

                // Insert into the through table. Skip duplicates silently;
                // typical pivot tables have a composite PK on (a,b).
                await trx(spec.through.table)
                    .insert({
                        [spec.through.localKey]: saved[ownSinglePk],
                        [spec.through.foreignKey]: savedChild[childKey]
                    })
                    .onConflict([
                        spec.through.localKey,
                        spec.through.foreignKey
                    ])
                    .ignore();
            }
            saved[name] = savedChildren;
        }
    }

    // Silence unused-var warning for `colFor` exported helper (reserved
    // for future column-name normalisation when relations expose column
    // names rather than property names).
    void colFor;

    return saved;
}
