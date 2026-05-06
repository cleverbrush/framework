// @cleverbrush/knex-schema — WHERE / ORDER BY / GROUP BY / HAVING operations

import type { Knex } from 'knex';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type { ColumnRef } from '../types.js';
import {
    invalidateCache,
    isColumnAccessor,
    mapRecordToColumns,
    resolveColumn,
    resolveColumnArg
} from './helpers.js';
import { getState } from './state.js';

export function whereImpl(
    builder: SchemaQueryBuilder<any, any>,
    columnOrRaw: any,
    ...args: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    if (
        typeof columnOrRaw === 'function' &&
        !isColumnAccessor(builder, columnOrRaw)
    ) {
        (state.baseQuery.where as any)(columnOrRaw, ...args);
    } else if (
        typeof columnOrRaw === 'object' &&
        columnOrRaw !== null &&
        !('toSQL' in columnOrRaw)
    ) {
        const mapped = mapRecordToColumns(
            builder,
            columnOrRaw as Record<string, any>
        );
        (state.baseQuery.where as any)(mapped, ...args);
    } else {
        const col = resolveColumnArg(builder, columnOrRaw);
        (state.baseQuery.where as any)(col, ...args);
    }
    return builder;
}

export function andWhereImpl(
    builder: SchemaQueryBuilder<any, any>,
    columnOrRaw: any,
    ...args: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    if (
        typeof columnOrRaw === 'function' &&
        !isColumnAccessor(builder, columnOrRaw)
    ) {
        (state.baseQuery.andWhere as any)(columnOrRaw, ...args);
    } else if (
        typeof columnOrRaw === 'object' &&
        columnOrRaw !== null &&
        !('toSQL' in columnOrRaw)
    ) {
        const mapped = mapRecordToColumns(
            builder,
            columnOrRaw as Record<string, any>
        );
        (state.baseQuery.andWhere as any)(mapped, ...args);
    } else {
        const col = resolveColumnArg(builder, columnOrRaw);
        (state.baseQuery.andWhere as any)(col, ...args);
    }
    return builder;
}

export function orWhereImpl(
    builder: SchemaQueryBuilder<any, any>,
    columnOrRaw: any,
    ...args: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    if (
        typeof columnOrRaw === 'function' &&
        !isColumnAccessor(builder, columnOrRaw)
    ) {
        (state.baseQuery.orWhere as any)(columnOrRaw, ...args);
    } else if (
        typeof columnOrRaw === 'object' &&
        columnOrRaw !== null &&
        !('toSQL' in columnOrRaw)
    ) {
        const mapped = mapRecordToColumns(
            builder,
            columnOrRaw as Record<string, any>
        );
        (state.baseQuery.orWhere as any)(mapped, ...args);
    } else {
        const col = resolveColumnArg(builder, columnOrRaw);
        (state.baseQuery.orWhere as any)(col, ...args);
    }
    return builder;
}

export function whereNotImpl(
    builder: SchemaQueryBuilder<any, any>,
    columnOrRaw: any,
    ...args: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    if (
        typeof columnOrRaw === 'function' &&
        !isColumnAccessor(builder, columnOrRaw)
    ) {
        (state.baseQuery.whereNot as any)(columnOrRaw, ...args);
    } else if (
        typeof columnOrRaw === 'object' &&
        columnOrRaw !== null &&
        !('toSQL' in columnOrRaw)
    ) {
        const mapped = mapRecordToColumns(
            builder,
            columnOrRaw as Record<string, any>
        );
        (state.baseQuery.whereNot as any)(mapped, ...args);
    } else {
        const col = resolveColumnArg(builder, columnOrRaw);
        (state.baseQuery.whereNot as any)(col, ...args);
    }
    return builder;
}

export function whereInImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    values: readonly any[] | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereIn(
        resolveColumn(builder, column, 'whereIn') as any,
        values as any
    );
    return builder;
}

export function whereNotInImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    values: readonly any[] | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereNotIn(
        resolveColumn(builder, column, 'whereNotIn') as any,
        values as any
    );
    return builder;
}

export function orWhereInImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    values: readonly any[] | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).orWhereIn(
        resolveColumn(builder, column, 'orWhereIn'),
        values as any
    );
    return builder;
}

export function orWhereNotInImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    values: readonly any[] | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).orWhereNotIn(
        resolveColumn(builder, column, 'orWhereNotIn'),
        values as any
    );
    return builder;
}

export function whereNullImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereNull(
        resolveColumn(builder, column, 'whereNull') as any
    );
    return builder;
}

export function whereNotNullImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereNotNull(
        resolveColumn(builder, column, 'whereNotNull') as any
    );
    return builder;
}

export function orWhereNullImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).orWhereNull(
        resolveColumn(builder, column, 'orWhereNull')
    );
    return builder;
}

export function orWhereNotNullImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).orWhereNotNull(
        resolveColumn(builder, column, 'orWhereNotNull')
    );
    return builder;
}

export function whereBetweenImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    range: readonly [any, any]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereBetween(
        resolveColumn(builder, column, 'whereBetween') as any,
        range as [any, any]
    );
    return builder;
}

export function whereNotBetweenImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    range: readonly [any, any]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereNotBetween(
        resolveColumn(builder, column, 'whereNotBetween') as any,
        range as [any, any]
    );
    return builder;
}

export function whereLikeImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    value: string
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).whereLike(
        resolveColumn(builder, column, 'whereLike'),
        value
    );
    return builder;
}

export function whereILikeImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    value: string
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).whereILike(
        resolveColumn(builder, column, 'whereILike'),
        value
    );
    return builder;
}

export function whereRawImpl(
    builder: SchemaQueryBuilder<any, any>,
    sql: string,
    ...bindings: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereRaw(sql, ...bindings);
    return builder;
}

export function whereExistsImpl(
    builder: SchemaQueryBuilder<any, any>,
    callback: Knex.QueryCallback | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.whereExists(callback as any);
    return builder;
}

export function whereNotExistsImpl(
    builder: SchemaQueryBuilder<any, any>,
    callback: Knex.QueryCallback | Knex.QueryBuilder
): any {
    const state = getState(builder);
    invalidateCache(builder);
    (state.baseQuery as any).whereNotExists(callback as any);
    return builder;
}

export function whereJsonPathImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any>,
    path: string,
    operator?: string,
    value?: any
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const client = (state.knex as any).client?.config?.client as
        | string
        | undefined;
    if (client !== 'pg' && client !== 'postgresql' && client !== 'postgres') {
        throw new Error(
            `whereJsonPath() is only supported on PostgreSQL (got client: "${client ?? 'unknown'}")`
        );
    }

    const col = resolveColumn(builder, column, 'whereJsonPath');
    const op = operator ?? '=';

    if (op === '@?' || op === '@@') {
        const escapedOp = op === '@?' ? '@\\?' : '@@';
        state.baseQuery.whereRaw(`?? ${escapedOp} ?`, [col, path]);
    } else {
        const jsonPath = path.startsWith('$')
            ? path
            : `$.${path.replace(/\./g, '.')}`;
        state.baseQuery.whereRaw(
            `jsonb_path_query_first(??, ?) ${op} ?::jsonb`,
            [col, jsonPath, JSON.stringify(value)]
        );
    }
    return builder;
}

export function orderByImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw,
    direction?: 'asc' | 'desc'
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const col = resolveColumnArg(builder, column);
    state.baseQuery.orderBy(col as string, direction);
    return builder;
}

export function orderByRawImpl(
    builder: SchemaQueryBuilder<any, any>,
    sql: string,
    ...bindings: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.orderByRaw(sql, ...bindings);
    return builder;
}

export function groupByImpl(
    builder: SchemaQueryBuilder<any, any>,
    ...columns: (ColumnRef<any> | Knex.Raw)[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const resolved = columns.map(c => resolveColumnArg(builder, c));
    state.baseQuery.groupBy(...(resolved as string[]));
    return builder;
}

export function groupByRawImpl(
    builder: SchemaQueryBuilder<any, any>,
    sql: string,
    ...bindings: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.groupByRaw(sql, ...bindings);
    return builder;
}

export function havingImpl(
    builder: SchemaQueryBuilder<any, any>,
    column: ColumnRef<any> | Knex.Raw,
    operator: string,
    value: any
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const col = resolveColumnArg(builder, column);
    state.baseQuery.having(col as string, operator, value);
    return builder;
}

export function havingRawImpl(
    builder: SchemaQueryBuilder<any, any>,
    sql: string,
    ...bindings: any[]
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.havingRaw(sql, ...bindings);
    return builder;
}
