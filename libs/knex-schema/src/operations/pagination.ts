// @cleverbrush/knex-schema — Pagination (offset & cursor-based)

import { resolvePropertyKey } from '../columns.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type {
    ColumnRef,
    CursorPaginationResult,
    PaginationResult
} from '../types.js';
import {
    cleanAndMapRow,
    getEffectiveBaseQuery,
    getQuery,
    invalidateCache
} from './helpers.js';
import { getState } from './state.js';
import { orderByImpl, whereImpl } from './where.js';

export function limitImpl(
    builder: SchemaQueryBuilder<any, any>,
    n: number
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.limit(n);
    return builder;
}

export function offsetImpl(
    builder: SchemaQueryBuilder<any, any>,
    n: number
): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.baseQuery.offset(n);
    return builder;
}

export async function paginateImpl(
    builder: SchemaQueryBuilder<any, any>,
    opts: {
        page: number;
        pageSize: number;
    }
): Promise<PaginationResult<any>> {
    const { page, pageSize } = opts;
    const _state = getState(builder);

    const effectiveBase = getEffectiveBaseQuery(builder);

    const countResult = await effectiveBase
        .clone()
        .clearSelect()
        .clearOrder()
        .count('* as count')
        .first();
    const total = Number((countResult as any)?.count ?? 0);

    limitImpl(builder, pageSize);
    offsetImpl(builder, (page - 1) * pageSize);
    const data = await executeImpl(builder);

    const totalPages = Math.ceil(total / pageSize);

    return {
        data,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    } as PaginationResult<any>;
}

export async function paginateAfterImpl(
    builder: SchemaQueryBuilder<any, any>,
    opts: {
        cursor?: any;
        limit: number;
        column?: ColumnRef<any>;
        direction?: 'asc' | 'desc';
    }
): Promise<CursorPaginationResult<any>> {
    const direction = opts.direction ?? 'desc';
    const column = opts.column ?? ('id' as any);
    const state = getState(builder);

    if (opts.cursor != null) {
        const op = direction === 'desc' ? '<' : '>';
        whereImpl(builder, column, op, opts.cursor);
    }

    orderByImpl(builder, column, direction);
    limitImpl(builder, opts.limit + 1);
    const rows = await executeImpl(builder);

    const hasMore = rows.length > opts.limit;
    const data = hasMore ? rows.slice(0, opts.limit) : rows;

    const propKey =
        typeof column === 'string'
            ? column
            : resolvePropertyKey(column, state.localSchema, 'cursor');

    const nextCursor =
        hasMore && data.length > 0
            ? String((data[data.length - 1] as any)[propKey])
            : null;

    return { data, nextCursor, hasMore } as CursorPaginationResult<any>;
}

export async function executeImpl(
    builder: SchemaQueryBuilder<any, any>
): Promise<any[]> {
    const query = getQuery(builder);
    const rows = await query;

    if (!rows) return [];
    if (!Array.isArray(rows)) return [cleanAndMapRow(builder, rows)];

    return rows.map((row: any) => cleanAndMapRow(builder, row));
}
