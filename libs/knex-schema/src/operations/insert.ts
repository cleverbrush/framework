// @cleverbrush/knex-schema — INSERT / upsert / bulk operations

import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap, resolveColumnRef } from '../columns.js';
import { getTableName } from '../extension.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type { ColumnRef, InsertType } from '../types.js';
import {
    getTimestamps,
    mapObjectToColumns,
    mapRow,
    resolveColumn
} from './helpers.js';
import { getState } from './state.js';

// ---------------------------------------------------------------------------
// OnConflictBuilder
// ---------------------------------------------------------------------------

type AnyObjectSchema = ObjectSchemaBuilder<any, any, any, any, any, any, any>;

/**
 * Helpers available to `onConflict().merge()` update expressions and
 * conditional `where` callbacks.
 */
export interface OnConflictMergeHelpers<TLocalSchema extends AnyObjectSchema> {
    /** The Knex instance used by the query builder. */
    readonly knex: Knex;

    /**
     * Resolve a schema property reference to its mapped database column name.
     */
    column(ref: ColumnRef<TLocalSchema>): string;

    /**
     * Create a raw SQL expression with Knex bindings.
     */
    raw(sql: string, bindings?: readonly unknown[]): Knex.Raw;

    /**
     * Reference the `excluded.<column>` value in an upsert merge expression.
     */
    excluded(ref: ColumnRef<TLocalSchema>): Knex.Raw;
}

/**
 * Value accepted in explicit `onConflict().merge(data, updateData)` payloads.
 */
export type OnConflictUpdateValue<
    TLocalSchema extends AnyObjectSchema,
    TValue
> =
    | TValue
    | Knex.Raw
    | ((helpers: OnConflictMergeHelpers<TLocalSchema>) => TValue | Knex.Raw);

/**
 * Explicit update payload accepted by `onConflict().merge()`.
 */
export type OnConflictUpdateData<TLocalSchema extends AnyObjectSchema> =
    Partial<{
        [K in keyof InferType<TLocalSchema>]: OnConflictUpdateValue<
            TLocalSchema,
            InferType<TLocalSchema>[K]
        >;
    }>;

/**
 * Options for `onConflict().merge()`.
 */
export interface OnConflictMergeOptions<TLocalSchema extends AnyObjectSchema> {
    /**
     * Attach a conditional `WHERE` clause to the generated merge.
     *
     * This is useful for row-version or timestamp guarded upserts.
     */
    where?: (
        query: Knex.QueryBuilder,
        helpers: OnConflictMergeHelpers<TLocalSchema>
    ) => void;
}

export class OnConflictBuilder<TLocalSchema extends AnyObjectSchema, TResult> {
    readonly #knex: Knex;
    readonly #localSchema: TLocalSchema;
    readonly #conflictColumns: string[];

    constructor(
        knex: Knex,
        localSchema: TLocalSchema,
        _parent: SchemaQueryBuilder<TLocalSchema, TResult>,
        conflictColumns: string[]
    ) {
        this.#knex = knex;
        this.#localSchema = localSchema;
        this.#conflictColumns = conflictColumns;
    }

    async merge(
        data: InsertType<TLocalSchema>,
        options?: OnConflictMergeOptions<TLocalSchema>
    ): Promise<TResult>;
    async merge(
        data: InsertType<TLocalSchema>,
        updateData?: OnConflictUpdateData<TLocalSchema>,
        options?: OnConflictMergeOptions<TLocalSchema>
    ): Promise<TResult>;
    async merge(
        data: InsertType<TLocalSchema>,
        updateData?:
            | OnConflictUpdateData<TLocalSchema>
            | OnConflictMergeOptions<TLocalSchema>,
        options?: OnConflictMergeOptions<TLocalSchema>
    ): Promise<TResult> {
        let resolvedUpdateData: OnConflictUpdateData<TLocalSchema> | undefined;
        let resolvedOptions = options;

        if (options === undefined && isMergeOptions(updateData)) {
            resolvedOptions = updateData;
        } else {
            resolvedUpdateData = updateData as
                | OnConflictUpdateData<TLocalSchema>
                | undefined;
        }

        return this.#execute(
            data,
            'merge',
            resolvedUpdateData,
            resolvedOptions
        ) as Promise<TResult>;
    }

    async ignore(data: InsertType<TLocalSchema>): Promise<TResult | undefined> {
        return this.#execute(data, 'ignore');
    }

    async #execute(
        data: InsertType<TLocalSchema>,
        mode: 'merge' | 'ignore',
        updateData?: OnConflictUpdateData<TLocalSchema>,
        options?: OnConflictMergeOptions<TLocalSchema>
    ): Promise<TResult | undefined> {
        const tableName = getTableName(this.#localSchema);
        const timestamps: { createdAt: string; updatedAt: string } | null =
            (this.#localSchema as any).getExtension?.('timestamps') ?? null;

        const beforeHooks: Function[] =
            (this.#localSchema as any).getExtension?.('beforeInsert') ?? [];

        let processed = { ...(data as Record<string, any>) };
        for (const hook of beforeHooks) {
            processed = (await hook(processed)) ?? processed;
        }

        const { propToCol } = buildColumnMap(this.#localSchema as any);
        const mapped: Record<string, any> = {};
        for (const [key, val] of Object.entries(processed)) {
            mapped[propToCol.get(key) ?? key] = val;
        }
        if (timestamps) {
            mapped[timestamps.createdAt] = this.#knex.fn.now();
            mapped[timestamps.updatedAt] = this.#knex.fn.now();
        }

        let qb = this.#knex(tableName)
            .insert(mapped)
            .onConflict(this.#conflictColumns);

        if (mode === 'ignore') {
            qb = (qb as any).ignore();
        } else {
            const helpers = this.#createMergeHelpers();
            let mergeObj: Record<string, any>;
            if (updateData) {
                mergeObj = {};
                for (const [key, val] of Object.entries(
                    updateData as Record<string, any>
                )) {
                    mergeObj[propToCol.get(key) ?? key] =
                        typeof val === 'function' ? val(helpers) : val;
                }
            } else {
                mergeObj = { ...mapped };
                if (timestamps) {
                    delete mergeObj[timestamps.createdAt];
                    mergeObj[timestamps.updatedAt] = this.#knex.fn.now();
                }
            }
            qb = (qb as any).merge(mergeObj);
            options?.where?.(qb as unknown as Knex.QueryBuilder, helpers);
        }

        const rows = await (qb as any).returning('*');
        if (!rows || rows.length === 0) return undefined;

        const { colToProp } = buildColumnMap(this.#localSchema as any);
        const result: Record<string, any> = {};
        for (const [col, val] of Object.entries(rows[0])) {
            result[colToProp.get(col) ?? col] = val;
        }
        return result as TResult;
    }

    #createMergeHelpers(): OnConflictMergeHelpers<TLocalSchema> {
        return {
            knex: this.#knex,
            column: ref => this.#resolveTopLevelColumn(ref),
            raw: (sql, bindings = []) => this.#knex.raw(sql, bindings as any),
            excluded: ref =>
                this.#knex.raw('excluded.??', [
                    this.#resolveTopLevelColumn(ref)
                ])
        };
    }

    #resolveTopLevelColumn(ref: ColumnRef<TLocalSchema>): string {
        const column = resolveColumnRef(
            ref as ColumnRef<any>,
            this.#localSchema as any,
            'onConflict.merge',
            this.#knex
        );
        if (typeof column !== 'string') {
            throw new Error(
                'onConflict.merge only accepts top-level column references'
            );
        }
        return column;
    }
}

function isMergeOptions<TLocalSchema extends AnyObjectSchema>(
    value: unknown
): value is OnConflictMergeOptions<TLocalSchema> {
    if (!value || typeof value !== 'object') return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every(key => key === 'where');
}

// ---------------------------------------------------------------------------
// Insert operation functions
// ---------------------------------------------------------------------------

export async function insertImpl(
    builder: SchemaQueryBuilder<any, any>,
    data: InsertType<any>
): Promise<any> {
    const state = getState(builder);

    let processedData = { ...(data as Record<string, any>) };

    const beforeHooks =
        ((state.localSchema as any).getExtension?.('beforeInsert') as
            | Function[]
            | undefined) ?? [];
    for (const hook of beforeHooks) {
        processedData = (await hook(processedData)) ?? processedData;
    }

    const mapped = mapObjectToColumns(builder, processedData);

    const timestamps = getTimestamps(builder);
    if (timestamps) {
        mapped[timestamps.createdAt] = state.knex.fn.now();
        mapped[timestamps.updatedAt] = state.knex.fn.now();
    }

    const [row] = await state
        .knex(state.tableName)
        .insert(mapped)
        .returning('*');
    const result = mapRow(builder, row);

    const afterHooks =
        ((state.localSchema as any).getExtension?.('afterInsert') as
            | Function[]
            | undefined) ?? [];
    for (const hook of afterHooks) {
        await hook(result);
    }

    return result;
}

export async function insertManyImpl(
    builder: SchemaQueryBuilder<any, any>,
    data: InsertType<any>[]
): Promise<any[]> {
    const state = getState(builder);
    const timestamps = getTimestamps(builder);
    const beforeHooks =
        ((state.localSchema as any).getExtension?.('beforeInsert') as
            | Function[]
            | undefined) ?? [];

    const mapped = [];
    for (const d of data) {
        let processedData = { ...(d as Record<string, any>) };
        for (const hook of beforeHooks) {
            processedData = (await hook(processedData)) ?? processedData;
        }
        const m = mapObjectToColumns(builder, processedData);
        if (timestamps) {
            m[timestamps.createdAt] = state.knex.fn.now();
            m[timestamps.updatedAt] = state.knex.fn.now();
        }
        mapped.push(m);
    }

    const rows = await state
        .knex(state.tableName)
        .insert(mapped)
        .returning('*');
    const results = rows.map((row: any) => mapRow(builder, row));

    const afterHooks =
        ((state.localSchema as any).getExtension?.('afterInsert') as
            | Function[]
            | undefined) ?? [];
    for (const result of results) {
        for (const hook of afterHooks) {
            await hook(result);
        }
    }

    return results;
}

export function onConflictImpl(
    builder: SchemaQueryBuilder<any, any>,
    ...conflictColumns: ColumnRef<any>[]
): OnConflictBuilder<any, any> {
    const state = getState(builder);
    const cols = conflictColumns.map(
        c => resolveColumn(builder, c, 'onConflict') as string
    );
    return new OnConflictBuilder(state.knex, state.localSchema, builder, cols);
}

export async function upsertImpl(
    builder: SchemaQueryBuilder<any, any>,
    data: InsertType<any>,
    opts: {
        conflictColumns: ColumnRef<any>[];
        updateColumns?: ColumnRef<any>[];
    }
): Promise<any> {
    const state = getState(builder);
    const cols = opts.conflictColumns.map(
        c => resolveColumn(builder, c, 'upsert') as string
    );

    const qb = state
        .knex(state.tableName)
        .insert(mapObjectToColumns(builder, data as Record<string, any>))
        .onConflict(cols);

    if (opts.updateColumns && opts.updateColumns.length > 0) {
        const updateCols = opts.updateColumns.map(
            c => resolveColumn(builder, c, 'upsert') as string
        );
        (qb as any).merge(updateCols);
    } else {
        (qb as any).merge();
    }

    const [row] = await (qb as any).returning('*');
    return mapRow(builder, row);
}

export async function bulkInsertImpl(
    builder: SchemaQueryBuilder<any, any>,
    rows: InsertType<any>[],
    opts?: {
        chunkSize?: number;
        onConflict?: 'ignore' | 'merge';
        conflictColumns?: ColumnRef<any>[];
    }
): Promise<any[]> {
    if (rows.length === 0) return [];

    const state = getState(builder);

    const requestedChunkSize = opts?.chunkSize ?? 500;
    const bindingsPerRow = Object.keys(rows[0] as object).length || 1;
    const safeChunkCap = Math.max(
        1,
        Math.floor(60000 / Math.max(1, bindingsPerRow))
    );
    const chunkSize = Math.max(1, Math.min(requestedChunkSize, safeChunkCap));

    const timestamps = getTimestamps(builder);
    const beforeHooks =
        ((state.localSchema as any).getExtension?.('beforeInsert') as
            | Function[]
            | undefined) ?? [];
    const afterHooks =
        ((state.localSchema as any).getExtension?.('afterInsert') as
            | Function[]
            | undefined) ?? [];

    const conflictCols =
        opts?.onConflict && opts.conflictColumns
            ? opts.conflictColumns.map(
                  c =>
                      resolveColumn(
                          builder,
                          c,
                          'bulkInsert.onConflict'
                      ) as string
              )
            : null;
    if (opts?.onConflict && (!conflictCols || conflictCols.length === 0)) {
        throw new Error(
            'bulkInsert: `conflictColumns` is required when `onConflict` is set.'
        );
    }

    const results: any[] = [];

    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const mapped: Record<string, any>[] = [];
        for (const row of chunk) {
            let processed = { ...(row as Record<string, any>) };
            for (const hook of beforeHooks) {
                processed = (await hook(processed)) ?? processed;
            }
            const m = mapObjectToColumns(builder, processed);
            if (timestamps) {
                m[timestamps.createdAt] = state.knex.fn.now();
                m[timestamps.updatedAt] = state.knex.fn.now();
            }
            mapped.push(m);
        }

        let qb: any = state.knex(state.tableName).insert(mapped);

        if (conflictCols) {
            qb = qb.onConflict(conflictCols);
            if (opts!.onConflict === 'ignore') {
                qb = qb.ignore();
            } else {
                const updateCols = new Set<string>();
                for (const m of mapped) {
                    for (const k of Object.keys(m)) updateCols.add(k);
                }
                for (const c of conflictCols) updateCols.delete(c);
                if (timestamps) {
                    updateCols.delete(timestamps.createdAt);
                    updateCols.add(timestamps.updatedAt);
                }
                qb = qb.merge(Array.from(updateCols));
            }
        }

        const inserted: any[] = await qb.returning('*');
        for (const row of inserted) {
            const mappedRow = mapRow(builder, row);
            for (const hook of afterHooks) {
                await hook(mappedRow);
            }
            results.push(mappedRow);
        }
    }

    return results;
}

export async function bulkUpsertImpl(
    builder: SchemaQueryBuilder<any, any>,
    rows: InsertType<any>[],
    opts: {
        conflictColumns: ColumnRef<any>[];
        chunkSize?: number;
    }
): Promise<any[]> {
    return bulkInsertImpl(builder, rows, {
        chunkSize: opts.chunkSize,
        onConflict: 'merge',
        conflictColumns: opts.conflictColumns
    });
}
