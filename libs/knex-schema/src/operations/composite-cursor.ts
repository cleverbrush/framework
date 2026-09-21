import { Buffer } from 'node:buffer';
import type { ObjectSchemaBuilder } from '@cleverbrush/schema';
import {
    buildColumnMap,
    getPrimaryKeyColumns,
    resolvePropertyKey
} from '../columns.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type { ColumnRef, CursorPaginationResult } from '../types.js';
import { cloneQuery, statements } from './aggregate.js';
import { cleanAndMapRow, getEffectiveBaseQuery, getQuery } from './helpers.js';
import { privateColumn } from './ordering.js';
import { getState } from './state.js';

/** Opt-in, non-null, uniquely ordered keyset pagination. */
export interface CompositeCursorOptions<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> {
    /** Opaque nextCursor from a compatible page; null/undefined starts a new stream. */
    cursor?: string | null;
    /** Positive safe integer page size; one extra row determines whether more exist. */
    limit: number;
    /** Complete non-null sort, including a declared primary/unique key; replaces prior ordering. */
    orderBy: readonly {
        /** Required, non-null scalar schema property participating in the sort. */
        column: ColumnRef<S>;
        /** Direction for this component; mixed directions are supported. */
        direction: 'asc' | 'desc';
    }[];
}

export async function compositeCursor(
    builder: SchemaQueryBuilder<any, any>,
    options: CompositeCursorOptions<any>
): Promise<CursorPaginationResult<any>> {
    if (
        !Number.isSafeInteger(options.limit) ||
        options.limit < 1 ||
        options.limit >= Number.MAX_SAFE_INTEGER
    ) {
        throw new Error('Cursor limit must be a positive safe integer');
    }
    if (!Array.isArray(options.orderBy) || !options.orderBy.length) {
        throw new Error('Composite cursors require a non-empty orderBy');
    }
    const copy = cloneQuery(builder);
    const state = getState(copy);
    state.baseQuery = getEffectiveBaseQuery(copy).clone();
    state.skipDefaultScope = true;
    state.includeDeleted = true;
    state.onlyDeleted = false;
    const sql = state.baseQuery;
    if (
        (sql as any)._single.offset != null ||
        Object.keys(state.projectionDecoders).length ||
        statements(sql).some(
            s =>
                ['join', 'group', 'having', 'union'].includes(s.grouping) ||
                s.distinct ||
                s.distinctOn ||
                s.type === 'aggregate' ||
                s.type === 'aggregateRaw'
        )
    ) {
        throw new Error(
            'Composite cursors do not support offsets, flat joins, distinct, grouped or aggregate queries'
        );
    }
    const { properties, extensions } = state.localSchema.introspect() as any;
    const { propToCol, colToProp } = buildColumnMap(state.localSchema);
    const order = options.orderBy.map(item => {
        if (item.direction !== 'asc' && item.direction !== 'desc')
            throw new Error('Invalid cursor direction');
        const key = resolvePropertyKey(
            item.column,
            state.localSchema,
            'cursor'
        );
        const property = properties[key];
        const info = property?.introspect();
        if (
            !info ||
            !['number', 'string', 'date', 'boolean'].includes(info.type) ||
            !info.isRequired ||
            info.isNullable
        ) {
            throw new Error(
                'Cursor columns must be declared non-null scalar fields'
            );
        }
        return {
            key,
            column: propToCol.get(key)!,
            direction: item.direction,
            type: info.type
        };
    });
    if (new Set(order.map(item => item.column)).size !== order.length)
        throw new Error('Duplicate cursor columns');
    const normalize = (keys: string[]) =>
        keys.map(key => propToCol.get(key) ?? key);
    const uniqueKeys: string[][] = [
        [...getPrimaryKeyColumns(state.localSchema).columnNames],
        ...Object.entries(properties)
            .filter(([, p]: [string, any]) => p.getExtension('unique'))
            .map(([key]) => [propToCol.get(key)!]),
        ...(extensions?.uniques ?? []).map((entry: any) =>
            normalize(entry.columns)
        ),
        ...(extensions?.indexes ?? [])
            .filter((entry: any) => entry.unique)
            .map((entry: any) => normalize(entry.columns))
    ].filter(keys => keys.length);
    if (
        !uniqueKeys.some(keys =>
            keys.every(key => order.some(item => item.column === key))
        )
    ) {
        throw new Error(
            'Cursor order must contain a schema-declared primary or unique key'
        );
    }
    const identity = JSON.stringify([
        state.tableName,
        order.map(({ column, direction, type }) => [column, direction, type])
    ]);
    let values: string[] | undefined;
    if (options.cursor != null) {
        try {
            if (
                typeof options.cursor !== 'string' ||
                !/^[A-Za-z0-9_-]+$/.test(options.cursor)
            )
                throw new Error();
            const payload = JSON.parse(
                Buffer.from(options.cursor, 'base64url').toString('utf8')
            );
            if (
                payload.v !== 1 ||
                payload.order !== identity ||
                !Array.isArray(payload.values) ||
                payload.values.length !== order.length ||
                payload.values.some((v: unknown) => typeof v !== 'string')
            )
                throw new Error();
            values = payload.values;
            for (let i = 0; i < order.length; i++) {
                const value = values![i];
                if (
                    (order[i].type === 'number' &&
                        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
                            value
                        )) ||
                    (order[i].type === 'boolean' &&
                        !['true', 'false'].includes(value)) ||
                    (order[i].type === 'date' &&
                        !Number.isFinite(Date.parse(value)))
                )
                    throw new Error();
            }
        } catch {
            throw new Error('Invalid cursor or incompatible cursor ordering');
        }
    }
    const requiredRelations = state.specs.filter(
        spec => spec.type === 'one' && spec.required
    );
    if (values || requiredRelations.length) {
        const filters = statements(sql).filter(s => s.grouping === 'where');
        sql.clear('where');
        if (filters.length)
            sql.where(function () {
                (this as any)._statements.push(...filters);
            });
    }
    // Required eager relations filter parents. Apply that existence condition
    // before limit+1 so an unmatched parent cannot truncate the cursor stream.
    const requiredAlias = privateColumn([state.tableName], 'required');
    for (const spec of requiredRelations) {
        sql.whereExists(
            state.knex
                .from(spec.foreignQuery.clone().as(requiredAlias))
                .select(state.knex.raw('1'))
                .whereRaw('?? = ??', [
                    `${requiredAlias}.${spec.foreignColumn}`,
                    `${state.tableName}.${spec.localColumn}`
                ])
        );
    }
    if (values) {
        const cursorValues = values;
        sql.where(function () {
            order.forEach((item, index) => {
                this.orWhere(function () {
                    for (let before = 0; before < index; before++) {
                        this.where(order[before].column, cursorValues[before]);
                    }
                    this.where(
                        item.column,
                        item.direction === 'desc' ? '<' : '>',
                        cursorValues[index]
                    );
                });
            });
        });
    }
    sql.clearOrder().clear('limit');
    const hidden: string[] = [];
    if (!statements(sql).some(s => s.grouping === 'columns'))
        sql.select(`${state.tableName}.*`);
    for (const item of order) {
        sql.orderBy(item.column, item.direction);
        const key = privateColumn(
            [
                ...colToProp.keys(),
                ...Object.keys(state.projectionColumns ?? {}),
                ...hidden,
                ...state.hiddenColumns
            ],
            'cursor'
        );
        const value = state.knex.raw('cast(?? as text)', [item.column]);
        sql.select({ [key]: value });
        state.explicitSelects?.push(key);
        // Object projections must carry hidden cursor values through eager wrapping.
        if (state.projectionColumns) state.projectionColumns[key] = value;
        hidden.push(key);
        state.hiddenColumns.add(key);
    }
    sql.limit(options.limit + 1);
    const rows: Record<string, unknown>[] = await getQuery(copy);
    for (const row of rows) {
        if (hidden.some(key => typeof row[key] !== 'string')) {
            throw new Error(
                'Cursor sort value is null or not losslessly encoded'
            );
        }
    }
    const hasMore = rows.length > options.limit;
    const page = rows.slice(0, options.limit);
    const last = page.at(-1);
    const nextCursor =
        hasMore && last
            ? Buffer.from(
                  JSON.stringify({
                      v: 1,
                      order: identity,
                      values: hidden.map(key => {
                          if (typeof last[key] !== 'string')
                              throw new Error(
                                  'Cursor sort value is null or not losslessly encoded'
                              );
                          return last[key];
                      })
                  })
              ).toString('base64url')
            : null;
    return {
        data: page.map(row => cleanAndMapRow(copy, row)),
        nextCursor,
        hasMore
    };
}
