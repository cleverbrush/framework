// @cleverbrush/knex-schema — Extracted helper functions from SchemaQueryBuilder

import type { InferType } from '@cleverbrush/schema';
import {
    EXTRA_TYPE_BRAND,
    METHOD_LITERAL_BRAND,
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import {
    buildColumnMap,
    getPrimaryKeyColumns,
    resolveColumnRef
} from '../columns.js';
import {
    getTableName,
    getVariants,
    POLYMORPHIC_TYPE_BRAND
} from '../extension.js';
import { clearRow } from '../mappers.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type {
    ColumnRef,
    ResolvedVariantConfig,
    ResolvedVariantRelationSpec,
    ValidatedSpec
} from '../types.js';
import { getState } from './state.js';

// ---------------------------------------------------------------------------
// Type-level helpers
// ---------------------------------------------------------------------------

export type ScopesOf<S> = S extends {
    readonly [METHOD_LITERAL_BRAND]?: infer N;
}
    ? Extract<N, string>
    : never;

export type ProjectionsOf<S> = S extends {
    readonly [EXTRA_TYPE_BRAND]?: infer P;
}
    ? P extends Record<string, readonly string[]>
        ? P
        : Record<never, never>
    : Record<never, never>;

export type ProjectionKeysOf<
    S,
    K extends keyof ProjectionsOf<S> & string
> = ProjectionsOf<S>[K] extends readonly (infer T extends string)[]
    ? T
    : string;

export type QueryResultType<TLocalSchema> = TLocalSchema extends {
    readonly [POLYMORPHIC_TYPE_BRAND]?: infer U;
}
    ? NonNullable<U>
    : InferType<TLocalSchema>;

// ---------------------------------------------------------------------------
// State-based helpers
// ---------------------------------------------------------------------------

export function resolveColumn(
    builder: SchemaQueryBuilder<any, any>,
    ref: any,
    label = 'column'
): string | Knex.Raw {
    const state = getState(builder);
    return resolveColumnRef(
        ref as ColumnRef<any>,
        state.localSchema,
        label,
        state.knex
    );
}

export function invalidateCache(builder: SchemaQueryBuilder<any, any>): void {
    getState(builder).cachedBuiltQuery = null;
}

export function getSoftDelete(
    builder: SchemaQueryBuilder<any, any>
): { column: string } | null {
    const state = getState(builder);
    const ext = (state.localSchema as any).getExtension?.('softDelete');
    return ext ?? null;
}

export function getDefaultScope(
    builder: SchemaQueryBuilder<any, any>
): Function | null {
    const state = getState(builder);
    const fn = (state.localSchema as any).getExtension?.('defaultScope');
    return typeof fn === 'function' ? fn : null;
}

export function getTimestamps(
    builder: SchemaQueryBuilder<any, any>
): { createdAt: string; updatedAt: string } | null {
    const state = getState(builder);
    const ts = (state.localSchema as any).getExtension?.('timestamps');
    return ts ?? null;
}

const ALLOWED_OPS = new Set([
    '=',
    '!=',
    '<>',
    '<',
    '>',
    '<=',
    '>=',
    'like',
    'not like',
    'ilike',
    'not ilike',
    'in',
    'not in',
    'is',
    'is not'
]);

export { ALLOWED_OPS };

export function getVariantConfig(
    builder: SchemaQueryBuilder<any, any>
): ResolvedVariantConfig | null {
    const state = getState(builder);
    if (state.variantConfig !== undefined) return state.variantConfig;

    const raw = getVariants(state.localSchema);
    if (!raw) {
        state.variantConfig = null;
        return null;
    }

    const { propToCol } = buildColumnMap(state.localSchema);
    const discCol = propToCol.get(raw.discriminatorKey) ?? raw.discriminatorKey;

    state.variantConfig = {
        ...raw,
        discriminatorColumn: discCol
    };
    return state.variantConfig;
}

export function applyVariantJoins(
    builder: SchemaQueryBuilder<any, any>,
    base: Knex.QueryBuilder,
    variantConfig: ResolvedVariantConfig
): Knex.QueryBuilder {
    const state = getState(builder);
    const knex = state.knex;
    const baseTable = state.tableName;
    const basePkCol = findPrimaryKeyColumn(builder, state.localSchema);
    const discCol = variantConfig.discriminatorColumn;

    const qb = base.clone().select(`${baseTable}.*`);

    for (const [key, spec] of Object.entries(variantConfig.variants)) {
        if (state.enabledVariants !== null && !state.enabledVariants.has(key))
            continue;

        if (spec.storage === 'cti') {
            const variantAlias = `__v_${key}`;
            const variantTable = spec.tableName!;
            const fkCol = spec.foreignKey!;

            qb.leftJoin(
                `${variantTable} as ${variantAlias}`,
                knex.raw(`?? = ?? AND ?? = ?`, [
                    `${variantAlias}.${fkCol}`,
                    `${baseTable}.${basePkCol}`,
                    `${baseTable}.${discCol}`,
                    key
                ])
            );

            const { propToCol } = buildColumnMap(spec.schema);
            const variantIntrospect = spec.schema.introspect() as any;
            const variantProps: Record<string, unknown> =
                variantIntrospect.properties ?? {};

            for (const propKey of Object.keys(variantProps)) {
                const colName = propToCol.get(propKey) ?? propKey;
                qb.select(
                    knex.raw('?? as ??', [
                        `${variantAlias}.${colName}`,
                        `${variantAlias}__${colName}`
                    ])
                );
            }
        }
    }

    for (const vrInc of state.variantRelationIncludes) {
        const variantSpec = variantConfig.variants[vrInc.variantKey];
        if (!variantSpec) continue;

        const relSpec = variantSpec.relations.find(
            (r: ResolvedVariantRelationSpec) => r.name === vrInc.relationName
        );
        if (!relSpec) continue;

        const foreignSchema = resolveSchema(builder, relSpec.schema);
        const foreignTableName = getTableName(foreignSchema);
        const relAlias = `__v_${vrInc.variantKey}__rel_${vrInc.relationName}`;

        if (relSpec.type === 'belongsTo' || relSpec.type === 'hasOne') {
            let localCol: string;
            let foreignCol: string;

            if (relSpec.type === 'belongsTo') {
                localCol =
                    relSpec.foreignKey ??
                    ((): string => {
                        throw new Error(
                            `includeVariant: relation "${vrInc.relationName}" on variant "${vrInc.variantKey}" requires foreignKey`
                        );
                    })();
                foreignCol = findPrimaryKeyColumn(builder, foreignSchema);
            } else {
                localCol = findPrimaryKeyColumn(builder, state.localSchema);
                foreignCol =
                    relSpec.foreignKey ??
                    ((): string => {
                        throw new Error(
                            `includeVariant: relation "${vrInc.relationName}" on variant "${vrInc.variantKey}" requires foreignKey`
                        );
                    })();
            }

            let onExpr: string;
            const variantAlias = `__v_${vrInc.variantKey}`;

            if (variantSpec.storage === 'cti') {
                if (relSpec.type === 'belongsTo') {
                    onExpr = `${relAlias}.${foreignCol} = ${variantAlias}.${localCol} AND ${baseTable}.${discCol} = '${vrInc.variantKey}'`;
                } else {
                    onExpr = `${relAlias}.${foreignCol} = ${baseTable}.${localCol} AND ${baseTable}.${discCol} = '${vrInc.variantKey}'`;
                }
            } else {
                if (relSpec.type === 'belongsTo') {
                    onExpr = `${relAlias}.${foreignCol} = ${baseTable}.${localCol} AND ${baseTable}.${discCol} = '${vrInc.variantKey}'`;
                } else {
                    onExpr = `${relAlias}.${foreignCol} = ${baseTable}.${localCol} AND ${baseTable}.${discCol} = '${vrInc.variantKey}'`;
                }
            }

            const foreignKnex: Knex.QueryBuilder = state.knex(foreignTableName);

            const selectionSql = buildVariantRelationSelect(
                builder,
                foreignSchema,
                relAlias,
                foreignTableName,
                vrInc.customize
            );

            qb.leftJoin(
                knex.raw(`?? as ??`, [foreignTableName, relAlias]),
                knex.raw(onExpr)
            );
            void foreignKnex;

            for (const sel of selectionSql) {
                qb.select(sel);
            }
        }
    }

    for (const filter of state.variantWhereFilters) {
        const discColFull = `${baseTable}.${discCol}`;
        qb.where(function (this: Knex.QueryBuilder) {
            this.where(discColFull, filter.key)
                .andWhere(filter.qualifiedColumn, filter.op, filter.value)
                .orWhere(discColFull, '!=', filter.key);
        });
    }

    if (state.enabledVariants !== null) {
        qb.whereIn(`${baseTable}.${discCol}`, [...state.enabledVariants]);
    }

    return qb;
}

// Circular-dependency-safe SchemaQueryBuilder constructor reference
// Set by SchemaQueryBuilder.ts after the class is defined.
let SchemaQueryBuilderCtor: new (...args: any[]) => any = null!;
export function registerSchemaQueryBuilder(
    ctor: new (...args: any[]) => any
): void {
    SchemaQueryBuilderCtor = ctor;
}
export function getSchemaQueryBuilderCtor(): new (...args: any[]) => any {
    return SchemaQueryBuilderCtor;
}

export function buildVariantRelationSelect(
    builder: SchemaQueryBuilder<any, any>,
    foreignSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    relAlias: string,
    foreignTableName: string,
    customize?: (q: SchemaQueryBuilder<any, any>) => void
): Knex.Raw[] {
    const state = getState(builder);
    const knex = state.knex;
    const { propToCol } = buildColumnMap(foreignSchema);
    const foreignIntrospect = foreignSchema.introspect() as any;
    const foreignProps: Record<string, unknown> =
        foreignIntrospect.properties ?? {};

    let columnsToSelect: string[];

    if (customize) {
        const probe = new (SchemaQueryBuilderCtor as any)(
            state.knex,
            foreignSchema,
            state.knex(foreignTableName)
        );
        customize(probe);
        const state2 = getState(probe);
        const explicit = state2.explicitSelects;
        if (explicit && explicit.length > 0) {
            columnsToSelect = explicit;
        } else {
            columnsToSelect = Object.keys(foreignProps).map(
                p => propToCol.get(p) ?? p
            );
        }
    } else {
        columnsToSelect = Object.keys(foreignProps).map(
            p => propToCol.get(p) ?? p
        );
    }

    return columnsToSelect.map(colName =>
        knex.raw('?? as ??', [
            `${relAlias}.${colName}`,
            `${relAlias}__${colName}`
        ])
    );
}

export function mapPolymorphicRow(
    builder: SchemaQueryBuilder<any, any>,
    row: Record<string, any>,
    variantConfig: ResolvedVariantConfig
): Record<string, any> {
    const state = getState(builder);
    const { colToProp: baseColToProp } = buildColumnMap(state.localSchema);
    const result: Record<string, any> = {};

    for (const [colName, value] of Object.entries(row)) {
        if (colName.startsWith('__v_')) continue;
        const propName = baseColToProp.get(colName);
        if (propName) {
            result[propName] = value;
        } else {
            result[colName] = value;
        }
    }

    const discPropKey = variantConfig.discriminatorKey;
    const discValue: string | undefined = result[discPropKey];

    if (discValue != null) {
        const variantSpec = variantConfig.variants[discValue];
        if (variantSpec) {
            if (variantSpec.storage === 'cti') {
                const { colToProp: varColToProp } = buildColumnMap(
                    variantSpec.schema
                );
                const variantAlias = `__v_${discValue}`;
                const prefix = `${variantAlias}__`;
                const fkCol = variantSpec.foreignKey;

                if (fkCol) {
                    const fkAlias = `${prefix}${fkCol}`;
                    if (!variantSpec.allowOrphan && row[fkAlias] == null) {
                        throw new Error(
                            `Polymorphic orphan: "${discPropKey}" = "${discValue}" ` +
                                `but no matching row found in variant table ` +
                                `"${variantSpec.tableName}". ` +
                                `Set allowOrphan: true on this variant to suppress.`
                        );
                    }
                }

                for (const [colName, value] of Object.entries(row)) {
                    if (!colName.startsWith(prefix)) continue;
                    const origCol = colName.slice(prefix.length);
                    if (origCol === fkCol) continue;
                    const propName = varColToProp.get(origCol) ?? origCol;
                    result[propName] = value;
                }
            } else {
                const { colToProp: varColToProp } = buildColumnMap(
                    variantSpec.schema
                );
                for (const [colName, value] of Object.entries(row)) {
                    if (colName.startsWith('__v_')) continue;
                    if (baseColToProp.has(colName)) continue;
                    const propName = varColToProp.get(colName);
                    if (propName) {
                        result[propName] = value;
                    }
                }
            }
        }
    }

    if (state.variantRelationIncludes.length > 0 && discValue != null) {
        const variantSpec3 = variantConfig.variants[discValue];
        if (variantSpec3) {
            for (const vrInc of state.variantRelationIncludes) {
                if (vrInc.variantKey !== discValue) continue;

                const relSpec = variantSpec3.relations.find(
                    (r: ResolvedVariantRelationSpec) =>
                        r.name === vrInc.relationName
                );
                if (!relSpec) continue;

                if (relSpec.type === 'belongsTo' || relSpec.type === 'hasOne') {
                    const relAlias = `__v_${discValue}__rel_${vrInc.relationName}`;
                    const prefix = `${relAlias}__`;
                    const foreignSchema = resolveSchema(
                        builder,
                        relSpec.schema
                    );
                    const { colToProp: relColToProp } =
                        buildColumnMap(foreignSchema);
                    const nested: Record<string, unknown> = {};
                    let anyNonNull = false;

                    for (const [colName, value] of Object.entries(row)) {
                        if (!colName.startsWith(prefix)) continue;
                        const origCol = colName.slice(prefix.length);
                        const propName = relColToProp.get(origCol) ?? origCol;
                        nested[propName] = value;
                        if (value !== null && value !== undefined) {
                            anyNonNull = true;
                        }
                    }
                    result[vrInc.relationName] = anyNonNull ? nested : null;
                }
            }
        }
    }

    return result;
}

export function resolveSchema(
    _builder: SchemaQueryBuilder<any, any>,
    schema: any
): ObjectSchemaBuilder<any, any, any, any, any, any, any> {
    return typeof schema === 'function' ? schema() : schema;
}

export function findPrimaryKeyColumn(
    _builder: SchemaQueryBuilder<any, any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): string {
    const pk = getPrimaryKeyColumns(schema);
    if (pk.columnNames.length > 0) return pk.columnNames[0];
    return 'id';
}

export function resolvePkColumns(builder: SchemaQueryBuilder<any, any>): {
    propertyKeys: readonly string[];
    columnNames: readonly string[];
} {
    const state = getState(builder);
    const pk = getPrimaryKeyColumns(state.localSchema as any);
    if (pk.columnNames.length === 0) {
        throw new Error(
            'No primary key declared on this schema. Use `.primaryKey()` on a column or `.hasPrimaryKey([...])` on the schema.'
        );
    }
    return pk;
}

export function getEffectiveBaseQuery(
    builder: SchemaQueryBuilder<any, any>
): Knex.QueryBuilder {
    const state = getState(builder);
    let effectiveBase = state.baseQuery;
    let cloned = false;

    const softDelete = getSoftDelete(builder);
    if (softDelete && state.onlyDeleted) {
        if (!cloned) {
            effectiveBase = effectiveBase.clone();
            cloned = true;
        }
        effectiveBase.whereNotNull(softDelete.column);
    } else if (softDelete && !state.includeDeleted) {
        if (!cloned) {
            effectiveBase = effectiveBase.clone();
            cloned = true;
        }
        effectiveBase.whereNull(softDelete.column);
    }

    if (!state.skipDefaultScope) {
        const defaultScopeFn = getDefaultScope(builder);
        if (defaultScopeFn) {
            if (!cloned) {
                effectiveBase = effectiveBase.clone();
                cloned = true;
            }
            const proxy = new (SchemaQueryBuilderCtor as any)(
                state.knex,
                state.localSchema,
                effectiveBase
            );
            const proxyState = getState(proxy);
            proxyState.skipDefaultScope = true;
            defaultScopeFn(proxy);
        }
    }

    return effectiveBase;
}

export function buildJoinOne(
    builder: SchemaQueryBuilder<any, any>,
    resultQuery: Knex.QueryBuilder,
    spec: ValidatedSpec & { type: 'one' },
    relationAlias: string
): void {
    const state = getState(builder);
    const knex = state.knex;
    const foreignTable = spec.foreignQuery;
    const foreignTableName = (foreignTable as any)._single?.table;

    if (!foreignTableName) {
        throw new Error(
            `Could not determine table name from foreignQuery for "${spec.as}". ` +
                'Make sure foreignQuery is created via knex("tableName").'
        );
    }

    resultQuery.select(
        knex.raw(':relationAlias:.:as:->0 as :as:', {
            relationAlias,
            as: spec.as
        })
    );

    const subquery = knex
        .from(foreignTable.as(foreignTableName))
        .select(
            knex.raw(':foreignTable:.:foreignColumn:', {
                foreignTable: foreignTableName,
                foreignColumn: spec.foreignColumn
            })
        )
        .select(
            knex.raw('jsonb_agg(:foreignTable:) as :as:', {
                foreignTable: foreignTableName,
                as: spec.as
            })
        )
        .groupByRaw(':foreignTable:.:foreignColumn:', {
            foreignTable: foreignTableName,
            foreignColumn: spec.foreignColumn
        })
        .as(relationAlias);

    const joinMethod = spec.required ? 'join' : 'leftJoin';
    resultQuery[joinMethod](subquery, function () {
        this.on(
            knex.raw(
                ':relationAlias:.:foreignColumn: = :originalQuery:.:localColumn:',
                {
                    originalQuery: 'originalQuery',
                    relationAlias,
                    foreignColumn: spec.foreignColumn,
                    localColumn: spec.localColumn
                }
            )
        );
    });
}

export function buildJoinMany(
    builder: SchemaQueryBuilder<any, any>,
    resultQuery: Knex.QueryBuilder,
    spec: ValidatedSpec & { type: 'many' },
    relationAlias: string,
    i: number
): void {
    const state = getState(builder);
    const knex = state.knex;
    const filterName = `withFilter${i}`;

    const hasLimitOffset =
        (spec.limit !== null && spec.limit > 0) ||
        (spec.offset !== null && spec.offset > 0);

    const orderByColumn = spec.orderBy
        ? spec.orderBy.column
        : spec.foreignColumn;
    const orderByDirection = spec.orderBy ? spec.orderBy.direction : 'asc';

    if (hasLimitOffset) {
        resultQuery.with(
            filterName,
            knex
                .from(
                    spec.foreignQuery
                        .clone()
                        .whereIn(
                            spec.foreignColumn,
                            knex
                                .from(
                                    knex.raw(':originalQuery:', {
                                        originalQuery: 'originalQuery'
                                    })
                                )
                                .distinct(spec.localColumn)
                                .as(`__wf_inner_${i}`)
                        )
                        .as(`__wf_inner_${i}`)
                )
                .select(`__wf_inner_${i}.*`)
                .select(
                    knex.raw(
                        `row_number() over(partition by :foreignColumn: order by :orderByColumn: ${orderByDirection}) as "__rn__"`,
                        {
                            foreignColumn: spec.foreignColumn,
                            orderByColumn
                        }
                    )
                )
        );
    } else {
        resultQuery.with(
            filterName,
            spec.foreignQuery.clone().whereIn(
                spec.foreignColumn,
                knex
                    .from(
                        knex.raw(':originalQuery:', {
                            originalQuery: 'originalQuery'
                        })
                    )
                    .distinct(spec.localColumn)
            )
        );
    }

    const aggSubquery = knex.from(filterName);

    if (hasLimitOffset) {
        const hasLimit = spec.limit !== null && spec.limit > 0;
        const hasOffset = spec.offset !== null && spec.offset > 0;
        const effectiveOffset = spec.offset ?? 0;
        const effectiveLimit = effectiveOffset + (spec.limit ?? 0);

        const condition =
            hasLimit && hasOffset
                ? '"__rn__" > :offset and "__rn__" <= :limit'
                : hasLimit
                  ? '"__rn__" <= :limit'
                  : '"__rn__" > :offset';

        aggSubquery.whereRaw(condition, {
            limit: effectiveLimit,
            offset: effectiveOffset
        });

        aggSubquery.select(
            knex.raw(':foreignColumn:', {
                foreignColumn: spec.foreignColumn
            })
        );
        aggSubquery.select(
            knex.raw(
                "coalesce(jsonb_agg(to_jsonb(:filterName:) - '__rn__' order by \"__rn__\"), '[]'::jsonb) as :as:",
                { filterName, as: spec.as }
            )
        );
    } else {
        aggSubquery.select(
            knex.raw(':foreignColumn:', {
                foreignColumn: spec.foreignColumn
            })
        );

        const orderClause = spec.orderBy
            ? `jsonb_agg(:filterName: order by :filterName:.:orderByColumn: ${orderByDirection})`
            : 'jsonb_agg(:filterName:)';

        aggSubquery.select(
            knex.raw(
                `coalesce(${orderClause}, '[]'::jsonb) as :as:`,
                spec.orderBy
                    ? { filterName, orderByColumn, as: spec.as }
                    : { filterName, as: spec.as }
            )
        );
    }

    aggSubquery.groupByRaw(':foreignColumn:', {
        foreignColumn: spec.foreignColumn
    });

    const subquery = aggSubquery.as(relationAlias);

    resultQuery.select(
        knex.raw("coalesce(:relationAlias:.:as:, '[]'::jsonb) as :as:", {
            relationAlias,
            as: spec.as
        })
    );

    resultQuery.leftJoin(subquery, function () {
        this.on(
            knex.raw(
                ':relationAlias:.:foreignColumn: = :originalQuery:.:localColumn:',
                {
                    relationAlias,
                    foreignColumn: spec.foreignColumn,
                    originalQuery: 'originalQuery',
                    localColumn: spec.localColumn
                }
            )
        );
    });
}

export function buildQuery(
    builder: SchemaQueryBuilder<any, any>
): Knex.QueryBuilder {
    const state = getState(builder);
    const effectiveBase = getEffectiveBaseQuery(builder);

    const variantConfig = getVariantConfig(builder);
    const queryBase = variantConfig
        ? applyVariantJoins(builder, effectiveBase, variantConfig)
        : effectiveBase;

    if (state.specs.length === 0) {
        return queryBase;
    }

    const knex = state.knex;
    const specs = state.specs;

    const requiredLocalColumns = [...new Set(specs.map(s => s.localColumn))];

    let cteQuery = queryBase;
    let extraColumns: string[] = [];

    if (state.explicitSelects !== null) {
        const selectedSet = new Set(state.explicitSelects);
        extraColumns = requiredLocalColumns.filter(
            col => !selectedSet.has(col)
        );
        if (extraColumns.length > 0) {
            cteQuery = queryBase.clone();
            for (const col of extraColumns) {
                cteQuery.column(col);
            }
        }
    }

    const resultQuery = knex.queryBuilder().with('originalQuery', cteQuery);

    if (extraColumns.length > 0 && state.explicitSelects !== null) {
        for (const col of state.explicitSelects) {
            resultQuery.select(
                knex.raw(':originalQuery:.:col: as :col:', {
                    originalQuery: 'originalQuery',
                    col
                })
            );
        }
    } else {
        resultQuery.select('originalQuery.*');
    }

    resultQuery.from(
        knex.raw(':originalQuery:', {
            originalQuery: 'originalQuery'
        })
    );

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const relationAlias = `eagerRelation${i}`;

        if (spec.type === 'one') {
            buildJoinOne(builder, resultQuery, spec, relationAlias);
        } else {
            buildJoinMany(builder, resultQuery, spec, relationAlias, i);
        }
    }

    return resultQuery;
}

export function getQuery(
    builder: SchemaQueryBuilder<any, any>
): Knex.QueryBuilder {
    const state = getState(builder);
    if (!state.cachedBuiltQuery) {
        state.cachedBuiltQuery = buildQuery(builder);
    }
    return state.cachedBuiltQuery;
}

export function mapRow(
    builder: SchemaQueryBuilder<any, any>,
    row: Record<string, any>
): Record<string, any> {
    if (!row) return row;

    const variantConfig = getVariantConfig(builder);
    if (variantConfig) {
        return mapPolymorphicRow(builder, row, variantConfig);
    }

    const state = getState(builder);
    const { colToProp } = buildColumnMap(state.localSchema);
    const result: Record<string, any> = {};

    for (const [colName, value] of Object.entries(row)) {
        const propName = colToProp.get(colName);
        if (propName) {
            result[propName] = value;
        } else {
            result[colName] = value;
        }
    }

    return result;
}

export function cleanAndMapRow(
    builder: SchemaQueryBuilder<any, any>,
    row: Record<string, any>
): Record<string, any> {
    const state = getState(builder);
    const oneSpecs = state.specs.filter(
        (s): s is ValidatedSpec & { type: 'one' } => s.type === 'one'
    );
    const manySpecs = state.specs.filter(
        (s): s is ValidatedSpec & { type: 'many' } => s.type === 'many'
    );
    const cleaned = clearRow(row, oneSpecs, manySpecs);
    return mapRow(builder, cleaned);
}

export function mapObjectToColumns(
    builder: SchemaQueryBuilder<any, any>,
    obj: Record<string, any>
): Record<string, any> {
    const state = getState(builder);
    const { propToCol } = buildColumnMap(state.localSchema);
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        const colName = propToCol.get(key);
        if (colName) {
            result[colName] = value;
        } else {
            result[key] = value;
        }
    }

    return result;
}

export function mapRecordToColumns(
    builder: SchemaQueryBuilder<any, any>,
    record: Record<string, any>
): Record<string, any> {
    return mapObjectToColumns(builder, record);
}

export function resolveColumnArg(
    builder: SchemaQueryBuilder<any, any>,
    col: any
): string | Knex.Raw {
    if (typeof col === 'string') {
        return resolveColumn(builder, col, 'column');
    }
    if (typeof col === 'function') {
        return resolveColumn(builder, col, 'column');
    }
    return col;
}

export function isColumnAccessor(
    builder: SchemaQueryBuilder<any, any>,
    fn: Function
): boolean {
    const state = getState(builder);
    try {
        const tree = ObjectSchemaBuilder.getPropertiesFor(
            state.localSchema as any
        );
        const result = fn(tree);
        if (
            result &&
            typeof result === 'object' &&
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in result
        ) {
            return true;
        }
    } catch {}
    return false;
}

export function assertNotProjection(
    builder: SchemaQueryBuilder<any, any>,
    method: string
): void {
    const state = getState(builder);
    if (state.selectionMode === 'projection') {
        throw new Error(
            `Cannot call .${method}() after .projected('${
                state.appliedProjection
            }'). Choose one column-selection mode per query.`
        );
    }
}

export function assertNotExplicitSelect(
    builder: SchemaQueryBuilder<any, any>,
    method: string
): void {
    const state = getState(builder);
    if (state.selectionMode === 'select') {
        throw new Error(
            `Cannot call .${method}() after .select(). Choose one column-selection mode per query.`
        );
    }
    if (state.selectionMode === 'aggregate') {
        throw new Error(
            `Cannot call .${method}() after an aggregate method. Choose one column-selection mode per query.`
        );
    }
    if (state.selectionMode === 'projection') {
        throw new Error(
            `Cannot call .${method}() after .projected('${
                state.appliedProjection
            }'). Choose one column-selection mode per query.`
        );
    }
}
