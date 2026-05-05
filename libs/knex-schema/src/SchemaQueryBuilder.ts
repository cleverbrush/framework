// @cleverbrush/knex-schema — SchemaQueryBuilder

import type { InferType } from '@cleverbrush/schema';
import {
    EXTRA_TYPE_BRAND,
    METHOD_LITERAL_BRAND,
    type ObjectSchemaBuilder
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from './columns.js';
import { getTableName, POLYMORPHIC_TYPE_BRAND } from './extension.js';
// Operations
import {
    avgImpl,
    countDistinctImpl,
    countImpl,
    distinctImpl,
    maxImpl,
    minImpl,
    projectedImpl,
    scopedImpl,
    selectImpl,
    selectRawImpl,
    sumImpl,
    unscopedImpl
} from './operations/select.js';
import type {
    ColumnRef,
    CursorPaginationResult,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    PaginationResult,
    SelectProjection,
    SelectSelector
} from './types.js';

export { OnConflictBuilder } from './operations/insert.js';

import {
    deleteImpl,
    hardDeleteImpl,
    onlyDeletedImpl,
    restoreImpl,
    withDeletedImpl
} from './operations/delete.js';
import {
    ALLOWED_OPS,
    buildQuery,
    cleanAndMapRow,
    getQuery,
    getVariantConfig,
    invalidateCache,
    registerSchemaQueryBuilder,
    resolveColumn
} from './operations/helpers.js';
import {
    bulkInsertImpl,
    bulkUpsertImpl,
    insertImpl,
    insertManyImpl,
    onConflictImpl,
    upsertImpl
} from './operations/insert.js';
import {
    includeImpl,
    includeVariantImpl,
    joinManyImpl,
    joinOneImpl
} from './operations/join.js';
import {
    executeImpl,
    limitImpl,
    offsetImpl,
    paginateAfterImpl,
    paginateImpl
} from './operations/pagination.js';
import { getState, setState } from './operations/state.js';
import { bulkUpdateImpl, updateImpl } from './operations/update.js';
import {
    andWhereImpl,
    groupByImpl,
    groupByRawImpl,
    havingImpl,
    havingRawImpl,
    orderByImpl,
    orderByRawImpl,
    orWhereImpl,
    orWhereInImpl,
    orWhereNotInImpl,
    orWhereNotNullImpl,
    orWhereNullImpl,
    whereBetweenImpl,
    whereExistsImpl,
    whereILikeImpl,
    whereImpl,
    whereInImpl,
    whereJsonPathImpl,
    whereLikeImpl,
    whereNotBetweenImpl,
    whereNotExistsImpl,
    whereNotImpl,
    whereNotInImpl,
    whereNotNullImpl,
    whereNullImpl,
    whereRawImpl
} from './operations/where.js';

// ---------------------------------------------------------------------------
// Type-level helpers
// ---------------------------------------------------------------------------

type ScopesOf<S> = S extends {
    readonly [METHOD_LITERAL_BRAND]?: infer N;
}
    ? Extract<N, string>
    : never;

type ProjectionsOf<S> = S extends {
    readonly [EXTRA_TYPE_BRAND]?: infer P;
}
    ? P extends Record<string, readonly string[]>
        ? P
        : Record<never, never>
    : Record<never, never>;

type ProjectionKeysOf<
    S,
    K extends keyof ProjectionsOf<S> & string
> = ProjectionsOf<S>[K] extends readonly (infer T extends string)[]
    ? T
    : string;

type QueryResultType<TLocalSchema> = TLocalSchema extends {
    readonly [POLYMORPHIC_TYPE_BRAND]?: infer U;
}
    ? NonNullable<U>
    : InferType<TLocalSchema>;

// ---------------------------------------------------------------------------
// SchemaQueryBuilder
// ---------------------------------------------------------------------------

export class SchemaQueryBuilder<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TResult
> {
    constructor(
        knex: Knex,
        localSchema: TLocalSchema,
        baseQuery?: Knex.QueryBuilder
    ) {
        const tableName = getTableName(localSchema);
        setState(this, {
            knex,
            baseQuery: baseQuery ?? knex(tableName),
            localSchema,
            specs: [],
            tableName,
            explicitSelects: null,
            selectionMode: null,
            appliedProjection: null,
            includeDeleted: false,
            onlyDeleted: false,
            skipDefaultScope: false,
            variantConfig: undefined,
            enabledVariants: null,
            variantWhereFilters: [],
            variantRelationIncludes: [],
            cachedBuiltQuery: null
        });
    }

    // =======================================================================
    // SELECT / DISTINCT / AGGREGATES
    // =======================================================================

    select(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this;
    select<TSel extends SelectSelector<TLocalSchema>>(
        selector: TSel
    ): SchemaQueryBuilder<TLocalSchema, SelectProjection<ReturnType<TSel>>>;
    select(...args: unknown[]): any {
        return selectImpl(this as any, ...args);
    }

    distinct(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        return (distinctImpl as any)(this, ...columns);
    }

    count(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (countImpl as any)(this, column);
    }

    countDistinct(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (countDistinctImpl as any)(this, column);
    }

    min(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (minImpl as any)(this, column);
    }

    max(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (maxImpl as any)(this, column);
    }

    sum(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (sumImpl as any)(this, column);
    }

    avg(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (avgImpl as any)(this, column);
    }

    selectRaw(sql: string, bindings?: any[]): this {
        return selectRawImpl(this as any, sql, bindings);
    }

    projected<K extends keyof ProjectionsOf<TLocalSchema> & string>(
        name: K
    ): SchemaQueryBuilder<
        TLocalSchema,
        Pick<TResult, ProjectionKeysOf<TLocalSchema, K> & keyof TResult>
    > {
        return projectedImpl(this as any, name);
    }

    scoped<K extends ScopesOf<TLocalSchema>>(name: K): this {
        return scopedImpl(this as any, name as string);
    }

    unscoped(): this {
        return unscopedImpl(this as any);
    }

    // =======================================================================
    // WHERE
    // =======================================================================

    where(column: ColumnRef<TLocalSchema>, operator: string, value: any): this;
    where(column: ColumnRef<TLocalSchema>, value: any): this;
    where(raw: Knex.Raw, operator: string, value: any): this;
    where(callback: (builder: Knex.QueryBuilder) => void): this;
    where(record: Record<string, any>): this;
    where(raw: Knex.Raw): this;
    where(columnOrRaw: any, ...args: any[]): this {
        return whereImpl(this as any, columnOrRaw, ...args);
    }

    andWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    andWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    andWhere(record: Record<string, any>): this;
    andWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    andWhere(raw: Knex.Raw): this;
    andWhere(columnOrRaw: any, ...args: any[]): this {
        return andWhereImpl(this as any, columnOrRaw, ...args);
    }

    orWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    orWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    orWhere(record: Record<string, any>): this;
    orWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    orWhere(raw: Knex.Raw): this;
    orWhere(columnOrRaw: any, ...args: any[]): this {
        return orWhereImpl(this as any, columnOrRaw, ...args);
    }

    whereNot(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    whereNot(column: ColumnRef<TLocalSchema>, value: any): this;
    whereNot(record: Record<string, any>): this;
    whereNot(callback: (builder: Knex.QueryBuilder) => void): this;
    whereNot(raw: Knex.Raw): this;
    whereNot(columnOrRaw: any, ...args: any[]): this {
        return whereNotImpl(this as any, columnOrRaw, ...args);
    }

    whereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (whereInImpl as any)(this, column, values);
    }

    whereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (whereNotInImpl as any)(this, column, values);
    }

    orWhereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (orWhereInImpl as any)(this, column, values);
    }

    orWhereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (orWhereNotInImpl as any)(this, column, values);
    }

    whereNull(column: ColumnRef<TLocalSchema>): this {
        return (whereNullImpl as any)(this, column);
    }

    whereNotNull(column: ColumnRef<TLocalSchema>): this {
        return (whereNotNullImpl as any)(this, column);
    }

    orWhereNull(column: ColumnRef<TLocalSchema>): this {
        return (orWhereNullImpl as any)(this, column);
    }

    orWhereNotNull(column: ColumnRef<TLocalSchema>): this {
        return (orWhereNotNullImpl as any)(this, column);
    }

    whereBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        return (whereBetweenImpl as any)(this, column, range);
    }

    whereNotBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        return (whereNotBetweenImpl as any)(this, column, range);
    }

    whereLike(column: ColumnRef<TLocalSchema>, value: string): this {
        return (whereLikeImpl as any)(this, column, value);
    }

    whereILike(column: ColumnRef<TLocalSchema>, value: string): this {
        return (whereILikeImpl as any)(this, column, value);
    }

    whereRaw(sql: string, ...bindings: any[]): this {
        return (whereRawImpl as any)(this, sql, ...bindings);
    }

    whereExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        return (whereExistsImpl as any)(this, callback);
    }

    whereNotExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        return (whereNotExistsImpl as any)(this, callback);
    }

    whereJsonPath(
        column: ColumnRef<TLocalSchema>,
        path: string,
        operator?: string,
        value?: any
    ): this {
        return (whereJsonPathImpl as any)(this, column, path, operator, value);
    }

    // =======================================================================
    // ORDER BY
    // =======================================================================

    orderBy(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        direction?: 'asc' | 'desc'
    ): this {
        return (orderByImpl as any)(this, column, direction);
    }

    orderByRaw(sql: string, ...bindings: any[]): this {
        return (orderByRawImpl as any)(this, sql, ...bindings);
    }

    // =======================================================================
    // GROUP BY / HAVING
    // =======================================================================

    groupBy(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        return (groupByImpl as any)(this, ...columns);
    }

    groupByRaw(sql: string, ...bindings: any[]): this {
        return (groupByRawImpl as any)(this, sql, ...bindings);
    }

    having(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        operator: string,
        value: any
    ): this {
        return (havingImpl as any)(this, column, operator, value);
    }

    havingRaw(sql: string, ...bindings: any[]): this {
        return havingRawImpl(this as any, sql, ...bindings);
    }

    // =======================================================================
    // PAGINATION
    // =======================================================================

    limit(n: number): this {
        return limitImpl(this as any, n);
    }

    offset(n: number): this {
        return offsetImpl(this as any, n);
    }

    async paginate(opts: {
        page: number;
        pageSize: number;
    }): Promise<PaginationResult<TResult>> {
        return paginateImpl(this as any, opts) as Promise<
            PaginationResult<TResult>
        >;
    }

    async paginateAfter(opts: {
        cursor?: any;
        limit: number;
        column?: ColumnRef<TLocalSchema>;
        direction?: 'asc' | 'desc';
    }): Promise<CursorPaginationResult<TResult>> {
        return (paginateAfterImpl as any)(this, opts) as Promise<
            CursorPaginationResult<TResult>
        >;
    }

    // =======================================================================
    // WRITE OPERATIONS
    // =======================================================================

    async insert(data: InsertType<TLocalSchema>): Promise<TResult> {
        return insertImpl(this as any, data) as Promise<TResult>;
    }

    async insertMany(data: InsertType<TLocalSchema>[]): Promise<TResult[]> {
        return insertManyImpl(this as any, data) as Promise<TResult[]>;
    }

    onConflict(
        ...conflictColumns: ColumnRef<TLocalSchema>[]
    ): import('./operations/insert.js').OnConflictBuilder<
        TLocalSchema,
        TResult
    > {
        return (onConflictImpl as any)(this, ...conflictColumns);
    }

    async upsert(
        data: InsertType<TLocalSchema>,
        opts: {
            conflictColumns: ColumnRef<TLocalSchema>[];
            updateColumns?: ColumnRef<TLocalSchema>[];
        }
    ): Promise<TResult> {
        return (upsertImpl as any)(this, data, opts);
    }

    async bulkInsert(
        rows: InsertType<TLocalSchema>[],
        opts?: {
            chunkSize?: number;
            onConflict?: 'ignore' | 'merge';
            conflictColumns?: ColumnRef<TLocalSchema>[];
        }
    ): Promise<TResult[]> {
        return (bulkInsertImpl as any)(this, rows, opts);
    }

    async bulkUpsert(
        rows: InsertType<TLocalSchema>[],
        opts: {
            conflictColumns: ColumnRef<TLocalSchema>[];
            chunkSize?: number;
        }
    ): Promise<TResult[]> {
        return (bulkUpsertImpl as any)(this, rows, opts);
    }

    // =======================================================================
    // UPDATE
    // =======================================================================

    async update(data: Partial<InferType<TLocalSchema>>): Promise<TResult[]> {
        return updateImpl(this as any, data) as Promise<TResult[]>;
    }

    async bulkUpdate(
        updates: ReadonlyArray<{
            where: Partial<InferType<TLocalSchema>>;
            set: Partial<InferType<TLocalSchema>>;
        }>
    ): Promise<number> {
        return bulkUpdateImpl(this as any, updates as any);
    }

    // =======================================================================
    // DELETE / SOFT DELETE
    // =======================================================================

    async delete(): Promise<number> {
        return deleteImpl(this as any);
    }

    withDeleted(): this {
        return withDeletedImpl(this as any);
    }

    onlyDeleted(): this {
        return onlyDeletedImpl(this as any);
    }

    async hardDelete(): Promise<number> {
        return hardDeleteImpl(this as any);
    }

    async restore(): Promise<TResult[]> {
        return restoreImpl(this as any) as Promise<TResult[]>;
    }

    // =======================================================================
    // EAGER LOADING (JOIN)
    // =======================================================================

    joinOne<
        TForeignSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TFieldName extends string,
        TRequired extends boolean = true
    >(
        spec: JoinOneSpec<TLocalSchema, TForeignSchema, TFieldName, TRequired>
    ): SchemaQueryBuilder<
        TLocalSchema,
        import('./types.js').WithJoinedOne<
            TResult,
            TFieldName,
            TForeignSchema,
            TRequired
        >
    > {
        return joinOneImpl(this as any, spec);
    }

    joinMany<
        TForeignSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TFieldName extends string
    >(
        spec: JoinManySpec<TLocalSchema, TForeignSchema, TFieldName>
    ): SchemaQueryBuilder<
        TLocalSchema,
        import('./types.js').WithJoinedMany<TResult, TFieldName, TForeignSchema>
    > {
        return joinManyImpl(this as any, spec);
    }

    include(
        relationName: string,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): this {
        return includeImpl(this as any, relationName, customize);
    }

    includeVariant(
        variantKey: string,
        relationName: string,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): this {
        return includeVariantImpl(
            this as any,
            variantKey,
            relationName,
            customize
        );
    }

    // =======================================================================
    // POLYMORPHIC VARIANTS
    // =======================================================================

    whereVariant(
        key: string,
        column: string,
        operator: string,
        value: any
    ): this {
        const state = getState(this);
        const variantConfig = getVariantConfig(this);
        if (!variantConfig) {
            throw new Error(
                'whereVariant() can only be used on a polymorphic schema (created with .withVariants())'
            );
        }

        const spec = variantConfig.variants[key];
        if (!spec) {
            throw new Error(
                `whereVariant: unknown variant key "${key}". ` +
                    `Valid keys: ${Object.keys(variantConfig.variants).join(', ')}`
            );
        }

        const op = operator.toLowerCase();
        if (!ALLOWED_OPS.has(op)) {
            throw new Error(
                `whereVariant: operator "${operator}" is not allowed. ` +
                    `Allowed operators: ${[...ALLOWED_OPS].join(', ')}`
            );
        }

        const { propToCol } = buildColumnMap(spec.schema);
        const colName = propToCol.get(column) ?? column;

        let qualifiedColumn: string;
        if (spec.storage === 'cti') {
            qualifiedColumn = `__v_${key}.${colName}`;
        } else {
            qualifiedColumn = `${state.tableName}.${colName}`;
        }

        state.variantWhereFilters.push({ key, qualifiedColumn, op, value });
        invalidateCache(this);
        return this;
    }

    selectVariants(keys: string[]): this {
        const state = getState(this);
        if (!getVariantConfig(this)) {
            throw new Error(
                'selectVariants() can only be used on a polymorphic schema (created with .withVariants())'
            );
        }
        state.enabledVariants = new Set(keys);
        invalidateCache(this);
        return this;
    }

    // =======================================================================
    // ESCAPE HATCH
    // =======================================================================

    apply(fn: (builder: Knex.QueryBuilder) => void): this {
        const state = getState(this);
        invalidateCache(this);
        fn(state.baseQuery);
        return this;
    }

    // =======================================================================
    // TRANSACTION
    // =======================================================================

    transacting(
        trx: Knex.Transaction
    ): SchemaQueryBuilder<TLocalSchema, TResult> {
        const state = getState(this);
        const builder = new SchemaQueryBuilder<TLocalSchema, TResult>(
            trx as unknown as Knex,
            state.localSchema as TLocalSchema,
            state.baseQuery.clone().transacting(trx)
        );
        const builderState = getState(builder);
        for (const spec of state.specs) {
            builderState.specs.push({
                ...spec,
                foreignQuery: spec.foreignQuery.clone().transacting(trx)
            });
        }
        builderState.explicitSelects = state.explicitSelects
            ? [...state.explicitSelects]
            : null;
        builderState.selectionMode = state.selectionMode;
        builderState.appliedProjection = state.appliedProjection;
        builderState.includeDeleted = state.includeDeleted;
        builderState.onlyDeleted = state.onlyDeleted;
        builderState.skipDefaultScope = state.skipDefaultScope;
        builderState.variantConfig = state.variantConfig;
        builderState.enabledVariants =
            state.enabledVariants !== null
                ? new Set(state.enabledVariants)
                : null;
        builderState.variantWhereFilters = [...state.variantWhereFilters];
        builderState.variantRelationIncludes = [
            ...state.variantRelationIncludes
        ];
        return builder;
    }

    // =======================================================================
    // EXECUTION
    // =======================================================================

    toQuery(): string {
        return getQuery(this).toQuery();
    }

    toKnexQuery(): Knex.QueryBuilder {
        return getQuery(this);
    }

    toString(): string {
        return getQuery(this).toString();
    }

    async execute(): Promise<TResult[]> {
        return executeImpl(this) as Promise<TResult[]>;
    }

    async first(): Promise<TResult | undefined> {
        const query = getQuery(this).first();
        const row = await query;

        if (!row) return undefined;
        return cleanAndMapRow(this, row) as TResult;
    }

    async pluck<K extends keyof TResult & string>(
        column: ColumnRef<TLocalSchema>
    ): Promise<TResult[K][]> {
        const _state = getState(this);
        const col = resolveColumn(this, column, 'pluck') as string;
        const rows = await buildQuery(this).select(col);
        return rows.map(
            (row: any) => row[col] ?? row[column as string]
        ) as TResult[K][];
    }

    // biome-ignore lint/suspicious/noThenProperty: intentional thenable
    then<TReturn1 = TResult[], TReturn2 = never>(
        onfulfilled?:
            | ((value: TResult[]) => TReturn1 | PromiseLike<TReturn1>)
            | null,
        onrejected?: ((reason: any) => TReturn2 | PromiseLike<TReturn2>) | null
    ): Promise<TReturn1 | TReturn2> {
        return this.execute().then(onfulfilled, onrejected);
    }
}

// Register the constructor for circular-dependency-safe access
registerSchemaQueryBuilder(SchemaQueryBuilder);

// ---------------------------------------------------------------------------
// query() — main entry point
// ---------------------------------------------------------------------------

export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema
): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;

export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema,
    baseQuery: Knex.QueryBuilder
): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;

export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema,
    baseQuery?: Knex.QueryBuilder
): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>> {
    return new SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>(
        knex,
        schema,
        baseQuery
    );
}

// ---------------------------------------------------------------------------
// createQuery() — knex-bound factory
// ---------------------------------------------------------------------------

export interface BoundQuery {
    <
        TLocalSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >
    >(
        schema: TLocalSchema
    ): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;
    <
        TLocalSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >
    >(
        schema: TLocalSchema,
        baseQuery: Knex.QueryBuilder
    ): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;
    withTransaction(trx: Knex.Transaction): BoundQuery;
    transaction<T>(callback: (db: BoundQuery) => Promise<T>): Promise<T>;
}

export function createQuery(knexInstance: Knex): BoundQuery {
    function boundQuery<
        TLocalSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >
    >(
        schema: TLocalSchema,
        baseQuery?: Knex.QueryBuilder
    ): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>> {
        return baseQuery
            ? query(knexInstance, schema, baseQuery)
            : query(knexInstance, schema);
    }

    (boundQuery as BoundQuery).withTransaction = (
        trx: Knex.Transaction
    ): BoundQuery => createQuery(trx as unknown as Knex);

    (boundQuery as BoundQuery).transaction = <T>(
        callback: (db: BoundQuery) => Promise<T>
    ): Promise<T> =>
        knexInstance.transaction(trx =>
            callback(createQuery(trx as unknown as Knex))
        );

    return boundQuery as BoundQuery;
}
