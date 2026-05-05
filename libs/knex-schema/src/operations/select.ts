// @cleverbrush/knex-schema — SELECT / DISTINCT / aggregates / projections / scopes

import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from '../columns.js';
import { getProjections } from '../extension.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type { ColumnRef } from '../types.js';
import {
    assertNotExplicitSelect,
    assertNotProjection,
    invalidateCache,
    resolveColumn,
    resolveColumnArg
} from './helpers.js';
import { getState } from './state.js';

export function selectImpl(
    builder: SchemaQueryBuilder<any, any>,
    ...args: unknown[]
): any {
    const state = getState(builder);

    if (args.length === 1 && typeof args[0] === 'function') {
        const fn = args[0] as (t: any) => unknown;
        const tree = ObjectSchemaBuilder.getPropertiesFor(
            state.localSchema as any
        );
        const result = fn(tree);
        if (
            result &&
            typeof result === 'object' &&
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in (result as object))
        ) {
            invalidateCache(builder);
            assertNotProjection(builder, 'select');
            state.selectionMode = 'projection';
            state.appliedProjection = '<inline>';

            const aliasMap: Record<string, string> = {};
            state.explicitSelects ??= [];
            for (const [alias, descriptor] of Object.entries(
                result as Record<string, unknown>
            )) {
                if (
                    !descriptor ||
                    typeof descriptor !== 'object' ||
                    !(
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in
                        (descriptor as object)
                    )
                ) {
                    throw new Error(
                        `select(selector): value for alias "${alias}" must be a property descriptor (e.g. \`t.someProp\`).`
                    );
                }
                const col = resolveColumn(
                    builder,
                    (() => descriptor) as ColumnRef<any>,
                    `select(selector).${alias}`
                );
                aliasMap[alias] = col as string;
                state.explicitSelects.push(col as string);
            }
            state.baseQuery.select(aliasMap);
            return builder;
        }
    }

    invalidateCache(builder);
    assertNotProjection(builder, 'select');
    state.selectionMode = 'select';
    const resolved = (args as (ColumnRef<any> | Knex.Raw)[]).map(c =>
        resolveColumnArg(builder, c)
    );
    state.baseQuery.select(...(resolved as string[]));
    state.explicitSelects ??= [];
    for (const r of resolved) {
        if (typeof r === 'string') {
            state.explicitSelects.push(r);
        }
    }
    return builder;
}

export function distinctImpl(
    builder: SchemaQueryBuilder<any, any>,
    ...columns: (ColumnRef<any> | Knex.Raw)[]
): any {
    invalidateCache(builder);
    const resolved = columns.map(c => resolveColumnArg(builder, c));
    getState(builder).baseQuery.distinct(...(resolved as string[]));
    return builder;
}

export function countImpl(
    builder: SchemaQueryBuilder<any, any>,
    column?: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'count');
    state.selectionMode = 'aggregate';
    if (column) {
        state.baseQuery.count(resolveColumnArg(builder, column) as string);
    } else {
        state.baseQuery.count();
    }
    return builder;
}

export function countDistinctImpl(
    builder: SchemaQueryBuilder<any, any>,
    column?: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'countDistinct');
    state.selectionMode = 'aggregate';
    if (column) {
        state.baseQuery.countDistinct(
            resolveColumnArg(builder, column) as string
        );
    } else {
        state.baseQuery.countDistinct();
    }
    return builder;
}

export function minImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'min');
    state.selectionMode = 'aggregate';
    state.baseQuery.min(resolveColumnArg(builder, column) as string);
    return builder;
}

export function maxImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'max');
    state.selectionMode = 'aggregate';
    state.baseQuery.max(resolveColumnArg(builder, column) as string);
    return builder;
}

export function sumImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'sum');
    state.selectionMode = 'aggregate';
    state.baseQuery.sum(resolveColumnArg(builder, column) as string);
    return builder;
}

export function avgImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw
): any {
    const state = getState(builder);
    invalidateCache(builder);
    assertNotProjection(builder, 'avg');
    state.selectionMode = 'aggregate';
    state.baseQuery.avg(resolveColumnArg(builder, column) as string);
    return builder;
}

export function selectRawImpl(
    builder: SchemaQueryBuilder<any, any>,
    sql: string,
    bindings?: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    if (bindings) {
        state.baseQuery.select(state.knex.raw(sql, bindings));
    } else {
        state.baseQuery.select(state.knex.raw(sql));
    }
    return builder;
}

export function projectedImpl(
    builder: SchemaQueryBuilder<any, any>,
    name: string
): any {
    const state = getState(builder);
    assertNotExplicitSelect(builder, 'projected');
    if (state.selectionMode === 'projection') {
        throw new Error(
            `Cannot call .projected('${name}') — .projected('${
                state.appliedProjection
            }') was already applied. Only one projection per query.`
        );
    }
    const projections = getProjections(state.localSchema as any);
    const projection = projections[name];
    if (!projection) {
        throw new Error(
            `Unknown projection "${name}" on schema for table "${
                state.tableName
            }"`
        );
    }
    const { propToCol } = buildColumnMap(state.localSchema as any);
    const sqlCols = projection.keys.map(key => propToCol.get(key) ?? key);
    state.baseQuery.select(...sqlCols);
    state.explicitSelects ??= [];
    for (const col of sqlCols) {
        state.explicitSelects.push(col);
    }
    state.selectionMode = 'projection';
    state.appliedProjection = name;
    invalidateCache(builder);
    return builder;
}

export function scopedImpl(
    builder: SchemaQueryBuilder<any, any>,
    name: string
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const scopes = (state.localSchema as any).getExtension?.('scopes') as
        | Record<string, Function>
        | undefined;
    const scopeFn = scopes?.[name];
    if (!scopeFn) {
        throw new Error(
            `Unknown scope "${name}" on schema for table "${state.tableName}"`
        );
    }
    scopeFn(builder);
    return builder;
}

export function unscopedImpl(builder: SchemaQueryBuilder<any, any>): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.skipDefaultScope = true;
    state.includeDeleted = true;
    return builder;
}
