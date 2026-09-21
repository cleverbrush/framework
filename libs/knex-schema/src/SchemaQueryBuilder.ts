// @cleverbrush/knex-schema — SchemaQueryBuilder

import type { InferType } from '@cleverbrush/schema';
import {
    EXTRA_TYPE_BRAND,
    METHOD_LITERAL_BRAND,
    type ObjectSchemaBuilder
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import {
    AliasedQueryBuilder,
    type AliasTables,
    isTableAlias,
    type TableAlias
} from './aliased-query.js';
import { buildColumnMap } from './columns.js';
import type {
    AggregateOptions,
    AggregateResult,
    ExtremumResult,
    ExtremumValue,
    OutputSchema
} from './expressions.js';
import { getTableName, POLYMORPHIC_TYPE_BRAND } from './extension.js';
import { scalarAggregate } from './operations/aggregate.js';
import {
    type CompositeCursorOptions,
    compositeCursor
} from './operations/composite-cursor.js';
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

export {
    OnConflictBuilder,
    type OnConflictMergeHelpers,
    type OnConflictMergeOptions,
    type OnConflictUpdateData,
    type OnConflictUpdateValue
} from './operations/insert.js';

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

/**
 * Build schema-aware SQL with mapped columns, projections and eager relations.
 * Fluent configuration methods mutate this builder; create a fresh query for each
 * independent operation. Await the builder or call execute() to obtain mapped rows.
 * Use query() to infer both the schema and result types automatically.
 */
export class SchemaQueryBuilder<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TResult
> {
    /**
     * Create a query over the schema's configured table.
     * @param knex - Database connection or transaction used to execute the query.
     * @param localSchema - Schema containing property/column and relation metadata.
     * @param baseQuery - Optional existing Knex query to configure; it is not cloned.
     */
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
            projectionColumns: null,
            projectionDecoders: {},
            hiddenColumns: new Set(),
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

    /**
     * Choose columns, or use an object selector to infer a flat result shape.
     * Object values can be schema descriptors or aggregate expressions. Column-list
     * selection retains the existing result type; raw SQL cannot infer a new shape.
     * @returns This builder, narrowed to the object projection when one is supplied.
     */
    select(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this;
    /**
     * Choose columns, or use an object selector to infer a flat result shape.
     * Object values can be schema descriptors or aggregate expressions. Column-list
     * selection retains the existing result type; raw SQL cannot infer a new shape.
     * @returns This builder, narrowed to the object projection when one is supplied.
     */
    select<TSel extends SelectSelector<TLocalSchema>>(
        selector: TSel
    ): SchemaQueryBuilder<TLocalSchema, SelectProjection<ReturnType<TSel>>>;
    /**
     * Choose columns, or use an object selector to infer a flat result shape.
     * Object values can be schema descriptors or aggregate expressions. Column-list
     * selection retains the existing result type; raw SQL cannot infer a new shape.
     * @returns This builder, narrowed to the object projection when one is supplied.
     */
    select(...args: unknown[]): any {
        return selectImpl(this as any, ...args);
    }

    /**
     * Apply SQL DISTINCT to the selected columns, optionally adding columns.
     * Property selectors are mapped to database names; SQL decides row equality.
     */
    distinct(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        return (distinctImpl as any)(this, ...columns);
    }

    /**
     * Append a legacy SQL COUNT selection without executing the query.
     * The driver controls the result shape/value type. Prefer countValue() for a
     * checked scalar number, or aggregate.count() in a typed object projection.
     */
    count(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (countImpl as any)(this, column);
    }

    /**
     * Append a legacy COUNT(DISTINCT column) selection.
     * Prefer countDistinctValue() for a checked scalar or aggregate.countDistinct()
     * for an inferred grouped result; this legacy method retains the builder type.
     */
    countDistinct(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (countDistinctImpl as any)(this, column);
    }

    /**
     * Append a legacy MIN selection without changing the result type.
     * Use minValue() for a scalar with explicit decoding, or aggregate.min() in a
     * typed projection. SQL returns null for an empty/all-null input.
     */
    min(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (minImpl as any)(this, column);
    }

    /**
     * Append a legacy MAX selection without changing the result type.
     * Use maxValue() for a scalar with explicit decoding, or aggregate.max() in a
     * typed projection. SQL returns null for an empty/all-null input.
     */
    max(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (maxImpl as any)(this, column);
    }

    /**
     * Append a legacy SUM selection, leaving numeric conversion to the driver.
     * Prefer sumValue() or aggregate.sum() to preserve exact numeric text by default.
     */
    sum(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (sumImpl as any)(this, column);
    }

    /**
     * Append a legacy AVG selection, leaving numeric conversion to the driver.
     * Prefer avgValue() or aggregate.avg() for a typed, precision-preserving result.
     */
    avg(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        return (avgImpl as any)(this, column);
    }

    /**
     * Count matching rows, or non-null column values, without mutating this query.
     * Ignores source ordering/limits/offsets while retaining filters and transactions.
     * @param options - Optional output parser; receives the raw driver value.
     * @returns A safe integer by default, including zero for an empty source.
     * @throws If the default count overflows, the source is grouped/distinct, or parsing fails.
     */
    countValue<S extends OutputSchema<any> | undefined = undefined>(
        options?: AggregateOptions<S>
    ): Promise<AggregateResult<S, number>>;
    /**
     * Count non-null column values without mutating the source query.
     * Source paging/order is ignored; filters, scopes and transactions remain.
     * @param column - Mapped schema property to count.
     * @param options - Optional parser replacing safe-integer decoding.
     * @throws If the default result overflows or the source is grouped/distinct.
     */
    countValue<S extends OutputSchema<any> | undefined = undefined>(
        column: ColumnRef<TLocalSchema>,
        options?: AggregateOptions<S>
    ): Promise<AggregateResult<S, number>>;
    /**
     * Count matching rows, or non-null column values, without mutating this query.
     * Ignores source ordering/limits/offsets while retaining filters and transactions.
     * @param options - Optional output parser; receives the raw driver value.
     * @returns A safe integer by default, including zero for an empty source.
     * @throws If the default count overflows, the source is grouped/distinct, or parsing fails.
     */
    countValue(
        columnOrOptions?: ColumnRef<TLocalSchema> | AggregateOptions<any>,
        options?: AggregateOptions<any>
    ): Promise<any> {
        const hasColumn =
            typeof columnOrOptions === 'string' ||
            typeof columnOrOptions === 'function';
        return scalarAggregate(
            this,
            'count',
            hasColumn ? columnOrOptions : undefined,
            hasColumn ? options : columnOrOptions
        );
    }

    /**
     * Count distinct non-null values in an unpaginated clone of this query.
     * @param column - Schema property to count; SQL nulls do not contribute.
     * @param options - Optional parser replacing default safe-integer conversion.
     * @returns A safe integer, or the parser's inferred output type.
     * @throws If the count is unsafe, the source is grouped/distinct, or parsing fails.
     */
    countDistinctValue<S extends OutputSchema<any> | undefined = undefined>(
        column: ColumnRef<TLocalSchema>,
        options?: AggregateOptions<S>
    ): Promise<AggregateResult<S, number>> {
        return scalarAggregate(this, 'countDistinct', column, options);
    }

    /**
     * Sum non-null values in an unpaginated clone, preserving numeric precision.
     * @param column - Numeric schema property to sum.
     * @param options - Optional parser receiving the raw driver value, including null.
     * @returns Database numeric text, or null for empty/all-null input by default.
     * An output parser replaces default decoding and controls the result type.
     */
    sumValue<S extends OutputSchema<any> | undefined = undefined>(
        column: ColumnRef<TLocalSchema>,
        options?: AggregateOptions<S>
    ): Promise<AggregateResult<S, string | null>> {
        return scalarAggregate(this, 'sum', column, options);
    }

    /**
     * Average non-null values in an unpaginated clone of this query.
     * @param column - Numeric schema property to aggregate.
     * @param options - Optional parser receiving the raw driver result, including null.
     * @returns Exact database numeric text or null by default; a parser overrides this.
     * @remarks Text preserves database precision, not precision already lost in floating-point storage.
     */
    avgValue<S extends OutputSchema<any> | undefined = undefined>(
        column: ColumnRef<TLocalSchema>,
        options?: AggregateOptions<S>
    ): Promise<AggregateResult<S, string | null>> {
        return scalarAggregate(this, 'avg', column, options);
    }

    /**
     * Find the smallest non-null column value without retaining source paging.
     * @param column - Schema property to aggregate.
     * @param options - Optional parser replacing default decoding, including null handling.
     * @returns Null for empty/all-null input; otherwise the column representation.
     * Dates return Date; numeric SQL overrides may return exact strings.
     */
    minValue<
        C extends ColumnRef<TLocalSchema>,
        S extends OutputSchema<any> | undefined = undefined
    >(
        column: C,
        options?: AggregateOptions<S>
    ): Promise<
        AggregateResult<
            S,
            C extends (...args: any[]) => infer D
                ? ExtremumValue<D>
                : C extends keyof InferType<TLocalSchema>
                  ? ExtremumResult<InferType<TLocalSchema>[C]>
                  : unknown
        >
    > {
        return scalarAggregate(this, 'min', column, options);
    }

    /**
     * Find the largest non-null column value without retaining source paging.
     * @param column - Schema property to aggregate.
     * @param options - Optional parser replacing default decoding, including null handling.
     * @returns Null for empty/all-null input; otherwise the column representation.
     * Dates return Date; numeric SQL overrides may return exact strings.
     */
    maxValue<
        C extends ColumnRef<TLocalSchema>,
        S extends OutputSchema<any> | undefined = undefined
    >(
        column: C,
        options?: AggregateOptions<S>
    ): Promise<
        AggregateResult<
            S,
            C extends (...args: any[]) => infer D
                ? ExtremumValue<D>
                : C extends keyof InferType<TLocalSchema>
                  ? ExtremumResult<InferType<TLocalSchema>[C]>
                  : unknown
        >
    > {
        return scalarAggregate(this, 'max', column, options);
    }

    /**
     * Append a raw SELECT expression with optional Knex value/identifier bindings.
     * The caller owns its SQL and result shape; this does not infer a new result type.
     */
    selectRaw(sql: string, bindings?: any[]): this {
        return selectRawImpl(this as any, sql, bindings);
    }

    /**
     * Apply a named schema projection and narrow the selected property type.
     * @param name - Projection registered with the schema's projection() extension.
     * @throws If the projection is unknown or conflicts with a prior selection.
     */
    projected<K extends keyof ProjectionsOf<TLocalSchema> & string>(
        name: K
    ): SchemaQueryBuilder<
        TLocalSchema,
        Pick<TResult, ProjectionKeysOf<TLocalSchema, K> & keyof TResult>
    > {
        return projectedImpl(this as any, name);
    }

    /**
     * Apply a named schema scope to this query.
     * @param name - Scope registered with the schema's scope() extension.
     * @throws If the requested scope is not registered.
     */
    scoped<K extends ScopesOf<TLocalSchema>>(name: K): this {
        return scopedImpl(this as any, name as string);
    }

    /**
     * Disable the default read scope and include soft-deleted rows.
     * Explicit filters already added to this builder remain in place.
     */
    unscoped(): this {
        return unscopedImpl(this as any);
    }

    // =======================================================================
    // WHERE
    // =======================================================================

    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(column: ColumnRef<TLocalSchema>, operator: string, value: any): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(column: ColumnRef<TLocalSchema>, value: any): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(raw: Knex.Raw, operator: string, value: any): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(callback: (builder: Knex.QueryBuilder) => void): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(record: Record<string, any>): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(raw: Knex.Raw): this;
    /**
     * Add an AND filter using mapped schema columns, a record, or raw Knex SQL.
     * Selector/key and record forms map property names to database columns. Grouped
     * callbacks receive a Knex builder and therefore use database column names.
     * Values are bound; use the operator form for comparisons other than equality.
     */
    where(columnOrRaw: any, ...args: any[]): this {
        return whereImpl(this as any, columnOrRaw, ...args);
    }

    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(record: Record<string, any>): this;
    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(raw: Knex.Raw): this;
    /**
     * Add an AND condition; an explicit synonym for where().
     * Property references and record keys are mapped; raw callbacks use Knex columns.
     */
    andWhere(columnOrRaw: any, ...args: any[]): this {
        return andWhereImpl(this as any, columnOrRaw, ...args);
    }

    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(record: Record<string, any>): this;
    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(raw: Knex.Raw): this;
    /**
     * Add an OR condition using a mapped property, record, raw SQL or Knex group.
     * Group mixed AND/OR conditions explicitly when SQL precedence would change intent.
     */
    orWhere(columnOrRaw: any, ...args: any[]): this {
        return orWhereImpl(this as any, columnOrRaw, ...args);
    }

    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(column: ColumnRef<TLocalSchema>, value: any): this;
    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(record: Record<string, any>): this;
    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(callback: (builder: Knex.QueryBuilder) => void): this;
    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(raw: Knex.Raw): this;
    /**
     * Add a negated condition using a mapped property, record or Knex group.
     * Use whereNotIn()/whereNotBetween() for their dedicated SQL operators.
     */
    whereNot(columnOrRaw: any, ...args: any[]): this {
        return whereNotImpl(this as any, columnOrRaw, ...args);
    }

    /**
     * Require the mapped column to match a value list or a single-column subquery.
     * An empty list matches no rows. Subqueries use Knex's database column names.
     */
    whereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (whereInImpl as any)(this, column, values);
    }

    /**
     * Exclude values returned by a list or single-column subquery.
     * SQL null semantics apply; a null in the set is not equivalent to a missing value.
     */
    whereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (whereNotInImpl as any)(this, column, values);
    }

    /**
     * Add an OR membership condition against a list or single-column subquery.
     */
    orWhereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (orWhereInImpl as any)(this, column, values);
    }

    /**
     * Add an OR non-membership condition; SQL NOT IN null semantics apply.
     */
    orWhereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        return (orWhereNotInImpl as any)(this, column, values);
    }

    /**
     * Add an AND IS NULL condition for a mapped schema property.
     */
    whereNull(column: ColumnRef<TLocalSchema>): this {
        return (whereNullImpl as any)(this, column);
    }

    /**
     * Add an AND IS NOT NULL condition for a mapped schema property.
     */
    whereNotNull(column: ColumnRef<TLocalSchema>): this {
        return (whereNotNullImpl as any)(this, column);
    }

    /**
     * Add an OR IS NULL condition for a mapped schema property.
     */
    orWhereNull(column: ColumnRef<TLocalSchema>): this {
        return (orWhereNullImpl as any)(this, column);
    }

    /**
     * Add an OR IS NOT NULL condition for a mapped schema property.
     */
    orWhereNotNull(column: ColumnRef<TLocalSchema>): this {
        return (orWhereNotNullImpl as any)(this, column);
    }

    /**
     * Require the mapped column to lie within an inclusive [lower, upper] range.
     */
    whereBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        return (whereBetweenImpl as any)(this, column, range);
    }

    /**
     * Exclude the inclusive [lower, upper] range from a mapped column.
     */
    whereNotBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        return (whereNotBetweenImpl as any)(this, column, range);
    }

    /**
     * Match a mapped column against a SQL LIKE pattern.
     * Percent and underscore remain wildcards; values are bound, not wildcard-escaped.
     */
    whereLike(column: ColumnRef<TLocalSchema>, value: string): this {
        return (whereLikeImpl as any)(this, column, value);
    }

    /**
     * Match a mapped column using PostgreSQL's case-insensitive ILIKE operator.
     * Percent and underscore remain pattern wildcards.
     */
    whereILike(column: ColumnRef<TLocalSchema>, value: string): this {
        return (whereILikeImpl as any)(this, column, value);
    }

    /**
     * Append raw WHERE SQL with Knex bindings. Never interpolate untrusted values.
     * Raw SQL uses database names and is outside schema-level result/type checking.
     */
    whereRaw(sql: string, ...bindings: any[]): this {
        return (whereRawImpl as any)(this, sql, ...bindings);
    }

    /**
     * Add an EXISTS filter from a Knex subquery or query-building callback.
     * Use qualified database columns to correlate it with the parent query.
     */
    whereExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        return (whereExistsImpl as any)(this, callback);
    }

    /**
     * Add a NOT EXISTS filter from a Knex subquery or query-building callback.
     */
    whereNotExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        return (whereNotExistsImpl as any)(this, callback);
    }

    /**
     * Compare a JSON-path value inside a mapped JSON column.
     * @param path - JSON path understood by the Knex database dialect.
     * @param operator - SQL comparison operator forwarded to Knex.
     * @param value - Bound comparison value.
     */
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

    /**
     * Append ordering by a mapped property or raw expression (ascending by default).
     * Add a unique tie-breaker for stable pages. Eager loading retains parent order.
     */
    orderBy(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        direction?: 'asc' | 'desc'
    ): this {
        return (orderByImpl as any)(this, column, direction);
    }

    /**
     * Append a raw ORDER BY expression with Knex bindings.
     * Use database column names; parent ordering is retained during eager loading.
     */
    orderByRaw(sql: string, ...bindings: any[]): this {
        return (orderByRawImpl as any)(this, sql, ...bindings);
    }

    // =======================================================================
    // GROUP BY / HAVING
    // =======================================================================

    /**
     * Group rows by mapped schema properties or raw expressions.
     * Combine with aggregate expressions in select() to infer grouped DTO results.
     */
    groupBy(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        return (groupByImpl as any)(this, ...columns);
    }

    /**
     * Append raw GROUP BY SQL with optional Knex bindings.
     */
    groupByRaw(sql: string, ...bindings: any[]): this {
        return (groupByRawImpl as any)(this, sql, ...bindings);
    }

    /**
     * Filter SQL groups by a mapped column/raw expression, operator and bound value.
     */
    having(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        operator: string,
        value: any
    ): this {
        return (havingImpl as any)(this, column, operator, value);
    }

    /**
     * Append raw HAVING SQL with Knex bindings, for example aggregate comparisons.
     */
    havingRaw(sql: string, ...bindings: any[]): this {
        return havingRawImpl(this as any, sql, ...bindings);
    }

    // =======================================================================
    // PAGINATION
    // =======================================================================

    /**
     * Set the maximum number of parent rows to select; mutates this query.
     * Included collections do not consume the parent limit.
     */
    limit(n: number): this {
        return limitImpl(this as any, n);
    }

    /**
     * Skip this many parent rows before applying the limit; mutates this query.
     * Use deterministic ordering when navigating offset-based pages.
     */
    offset(n: number): this {
        return offsetImpl(this as any, n);
    }

    /**
     * Execute a one-based offset page and a separate matching-source count query.
     * Mutates this builder's limit/offset and returns mapped rows plus page metadata.
     * The count and page are separate reads, not a snapshot unless your transaction provides one.
     */
    async paginate(opts: {
        /** One-based page number. */
        page: number;
        /** Maximum parent rows in a page. */
        pageSize: number;
    }): Promise<PaginationResult<TResult>> {
        return paginateImpl(this as any, opts) as Promise<
            PaginationResult<TResult>
        >;
    }

    /**
     * Read a cursor page without running a total-count query.
     * The orderBy form clones the source and preserves exact composite sort values;
     * its non-null sort must contain a declared unique key. The legacy column form
     * mutates this builder and defaults to id descending. Reapply access filters on
     * every request: cursors are positions, not authorization or snapshots.
     * @returns Mapped data, hasMore, and a nextCursor that is null on the last page.
     * @throws For invalid composite cursors or unsupported composite query shapes.
     */
    paginateAfter(
        opts: CompositeCursorOptions<TLocalSchema>
    ): Promise<CursorPaginationResult<TResult>>;
    /**
     * Read a cursor page without running a total-count query.
     * The orderBy form clones the source and preserves exact composite sort values;
     * its non-null sort must contain a declared unique key. The legacy column form
     * mutates this builder and defaults to id descending. Reapply access filters on
     * every request: cursors are positions, not authorization or snapshots.
     * @returns Mapped data, hasMore, and a nextCursor that is null on the last page.
     * @throws For invalid composite cursors or unsupported composite query shapes.
     */
    paginateAfter(opts: {
        /** Previous raw single-column position; omit for the first page. */
        cursor?: any;
        /** Maximum parent rows to return; one extra row determines hasMore. */
        limit: number;
        /** Unique sort property; defaults to id in the legacy API. */
        column?: ColumnRef<TLocalSchema>;
        /** Sort/continuation direction; defaults to descending. */
        direction?: 'asc' | 'desc';
    }): Promise<CursorPaginationResult<TResult>>;
    /**
     * Read a cursor page without running a total-count query.
     * The orderBy form clones the source and preserves exact composite sort values;
     * its non-null sort must contain a declared unique key. The legacy column form
     * mutates this builder and defaults to id descending. Reapply access filters on
     * every request: cursors are positions, not authorization or snapshots.
     * @returns Mapped data, hasMore, and a nextCursor that is null on the last page.
     * @throws For invalid composite cursors or unsupported composite query shapes.
     */
    async paginateAfter(opts: any): Promise<CursorPaginationResult<TResult>> {
        if ('orderBy' in opts) return compositeCursor(this as any, opts);
        return (paginateAfterImpl as any)(this, opts) as Promise<
            CursorPaginationResult<TResult>
        >;
    }

    // =======================================================================
    // WRITE OPERATIONS
    // =======================================================================

    /**
     * Insert one schema-shaped row and return its mapped database representation.
     * Applies configured insert hooks, column mappings and timestamp defaults.
     */
    async insert(data: InsertType<TLocalSchema>): Promise<TResult> {
        return insertImpl(this as any, data) as Promise<TResult>;
    }

    /**
     * Insert an array of schema-shaped rows and return their mapped representations.
     * Returns an empty array for empty input; use bulkInsert() to control chunking.
     */
    async insertMany(data: InsertType<TLocalSchema>[]): Promise<TResult[]> {
        return insertManyImpl(this as any, data) as Promise<TResult[]>;
    }

    /**
     * Configure an upsert conflict target using mapped properties.
     * Call merge() or ignore() on the returned builder to insert the row.
     */
    onConflict(
        ...conflictColumns: ColumnRef<TLocalSchema>[]
    ): import('./operations/insert.js').OnConflictBuilder<
        TLocalSchema,
        TResult
    > {
        return (onConflictImpl as any)(this, ...conflictColumns);
    }

    /**
     * Insert one row or update it when the chosen conflict target already exists.
     * @param opts - Conflict properties and optional subset of properties to update.
     * @returns The inserted or updated row mapped to schema property names.
     */
    async upsert(
        data: InsertType<TLocalSchema>,
        opts: {
            /** Properties identifying an existing row on conflict. */
            conflictColumns: ColumnRef<TLocalSchema>[];
            /** Properties to update on conflict; omit to merge insert values. */
            updateColumns?: ColumnRef<TLocalSchema>[];
        }
    ): Promise<TResult> {
        return (upsertImpl as any)(this, data, opts);
    }

    /**
     * Insert rows in chunks, optionally ignoring or merging conflicts.
     * @param opts - Chunk size (default 500), conflict policy and conflict properties.
     * @returns Mapped rows returned by PostgreSQL; ignored conflicts produce no row.
     */
    async bulkInsert(
        rows: InsertType<TLocalSchema>[],
        opts?: {
            /** Requested rows per statement, capped by parameter limits; default 500. */
            chunkSize?: number;
            /** Optional PostgreSQL conflict policy applied to each chunk. */
            onConflict?: 'ignore' | 'merge';
            /** Conflict target properties when a conflict policy is supplied. */
            conflictColumns?: ColumnRef<TLocalSchema>[];
        }
    ): Promise<TResult[]> {
        return (bulkInsertImpl as any)(this, rows, opts);
    }

    /**
     * Insert/update rows in chunks using the specified conflict properties.
     * @param opts - Required conflict target and optional chunk size (default 500).
     * @returns The database rows produced by each chunk, mapped to schema properties.
     */
    async bulkUpsert(
        rows: InsertType<TLocalSchema>[],
        opts: {
            /** Properties identifying an existing row on conflict. */
            conflictColumns: ColumnRef<TLocalSchema>[];
            /** Requested rows per statement, capped by parameter limits; default 500. */
            chunkSize?: number;
        }
    ): Promise<TResult[]> {
        return (bulkUpsertImpl as any)(this, rows, opts);
    }

    // =======================================================================
    // UPDATE
    // =======================================================================

    /**
     * Update rows matching this query's explicit filters and return mapped rows.
     * Applies update hooks and timestamp metadata. Add a WHERE clause to avoid a
     * table-wide update; this method does not track entity identity.
     */
    async update(data: Partial<InferType<TLocalSchema>>): Promise<TResult[]> {
        return updateImpl(this as any, data) as Promise<TResult[]>;
    }

    /**
     * Apply per-row where/set pairs and return the total affected-row count.
     * Maps both filter and update property names and applies configured update hooks.
     */
    async bulkUpdate(
        updates: ReadonlyArray<{
            /** Equality filters identifying the rows for this update. */
            where: Partial<InferType<TLocalSchema>>;
            /** Schema properties to assign to those rows. */
            set: Partial<InferType<TLocalSchema>>;
        }>
    ): Promise<number> {
        return bulkUpdateImpl(this as any, updates as any);
    }

    // =======================================================================
    // DELETE / SOFT DELETE
    // =======================================================================

    /**
     * Delete rows matching explicit filters and return the affected-row count.
     * Runs beforeDelete hooks; with soft-delete metadata it sets the deletion timestamp
     * instead of removing rows. Add filters to avoid a table-wide write.
     */
    async delete(): Promise<number> {
        return deleteImpl(this as any);
    }

    /**
     * Include soft-deleted rows in read results without removing explicit filters.
     */
    withDeleted(): this {
        return withDeletedImpl(this as any);
    }

    /**
     * Restrict reads to rows whose configured soft-delete column is non-null.
     */
    onlyDeleted(): this {
        return onlyDeletedImpl(this as any);
    }

    /**
     * Permanently delete rows matching explicit filters, even on a soft-delete schema.
     * Runs beforeDelete hooks and returns the affected count. This cannot be undone
     * without a transaction rollback or backup.
     */
    async hardDelete(): Promise<number> {
        return hardDeleteImpl(this as any);
    }

    /**
     * Clear the deletion timestamp on rows matching explicit filters and return them.
     * @throws If the schema has no soft-delete configuration.
     */
    async restore(): Promise<TResult[]> {
        return restoreImpl(this as any) as Promise<TResult[]>;
    }

    // =======================================================================
    // EAGER LOADING (JOIN)
    // =======================================================================

    /**
     * Eager-load a related object under spec.as using mapped join columns.
     * Required joins remove unmatched parents; optional joins return null. Unlike a
     * flat join, related fields remain nested and are mapped with the foreign schema.
     */
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

    /**
     * Eager-load a nested array without multiplying parent rows.
     * The relation's own order/limit/offset controls children separately from parent paging.
     */
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

    /**
     * Eager-load a relation registered on the schema by name.
     * @param customize - Optional callback configuring the related query.
     * Use an ORM DbSet when you need typed relation names and customization fields.
     */
    include(
        relationName: string,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): this {
        return includeImpl(this as any, relationName, customize);
    }

    /**
     * Eager-load a relation declared for one polymorphic discriminator value.
     * Other variants are not populated with this relation. Use ORM entity declarations
     * to retain known relation customization types.
     */
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

    /**
     * Add a filter applying only to the named polymorphic branch.
     * Other discriminator values remain eligible. Maps the variant property to its
     * CTI/STI storage column; throws for unknown variants or unsupported operators.
     */
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

    /**
     * Choose which polymorphic variant bodies are loaded.
     * This controls variant joins/selection, not a discriminator filter on base rows.
     * @throws If the schema is not polymorphic.
     */
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

    /**
     * Configure the underlying mutable Knex query as an escape hatch.
     * Raw changes do not infer a new result type; the caller owns column names,
     * result shape and cardinality introduced by the callback.
     */
    apply(fn: (builder: Knex.QueryBuilder) => void): this {
        const state = getState(this);
        invalidateCache(this);
        fn(state.baseQuery);
        return this;
    }

    // =======================================================================
    // TRANSACTION
    // =======================================================================

    /**
     * Clone this query and its eager-relation queries onto an existing transaction.
     * The source builder is unchanged; transaction commit/rollback stays with the caller.
     */
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
        builderState.projectionColumns = state.projectionColumns
            ? { ...state.projectionColumns }
            : null;
        builderState.projectionDecoders = { ...state.projectionDecoders };
        builderState.hiddenColumns = new Set(state.hiddenColumns);
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

    /**
     * Render SQL for debugging without executing it.
     * Bindings may appear as literal values; avoid logging sensitive inputs.
     */
    toQuery(): string {
        return getQuery(this).toQuery();
    }

    /** @internal ORM tracking must never attach aggregate or DTO rows as entities. */
    get returnsEntityRows(): boolean {
        return getState(this).selectionMode === null;
    }

    /**
     * Expose the built Knex query without executing Framework row mapping.
     * Direct execution returns raw database rows, potentially including internal fields.
     * Treat mutations as an escape hatch rather than typed Framework configuration.
     */
    toKnexQuery(): Knex.QueryBuilder {
        return getQuery(this);
    }

    /**
     * Render the query as a debugging SQL string; equivalent to toQuery().
     */
    toString(): string {
        return getQuery(this).toString();
    }

    /**
     * Execute SQL and map all rows, including eager relations and aggregate decoders.
     * @returns An empty array when no rows match.
     * @throws Database errors and output-parser validation failures.
     */
    async execute(): Promise<TResult[]> {
        return executeImpl(this) as Promise<TResult[]>;
    }

    /**
     * Execute this query for its first mapped row, or undefined if none matches.
     * Set ordering when the choice of first row matters.
     */
    async first(): Promise<TResult | undefined> {
        const query = getQuery(this).first();
        const row = await query;

        if (!row) return undefined;
        return cleanAndMapRow(this, row) as TResult;
    }

    /**
     * Execute a selection and collect one mapped column's values into an array.
     * @param column - Schema property whose database column should be read.
     */
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

    /**
     * Promise-compatible execution hook enabling await query(...).
     * Runs execute() and forwards fulfillment/rejection; repeated awaits may execute again.
     */
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

/**
 * Create a schema-aware query while preserving its schema and inferred row type.
 * Pass a table alias for a flat multi-table query requiring an explicit projection;
 * pass an ordinary schema for nested eager loading and schema-aware writes.
 * @param knex - Knex connection or transaction.
 * @param schema - Table schema or immutable alias(schema, name).
 * @returns The appropriately typed, unexecuted query builder.
 */
export function query<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    N extends string
>(knex: Knex, schema: TableAlias<S, N>): AliasedQueryBuilder<AliasTables<S, N>>;
/**
 * Create a schema-aware query while preserving its schema and inferred row type.
 * Pass a table alias for a flat multi-table query requiring an explicit projection;
 * pass an ordinary schema for nested eager loading and schema-aware writes.
 * @param knex - Knex connection or transaction.
 * @param schema - Table schema or immutable alias(schema, name).
 * @returns The appropriately typed, unexecuted query builder.
 */
export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema
): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;

/**
 * Create a schema-aware query while preserving its schema and inferred row type.
 * Pass a table alias for a flat multi-table query requiring an explicit projection;
 * pass an ordinary schema for nested eager loading and schema-aware writes.
 * @param knex - Knex connection or transaction.
 * @param schema - Table schema or immutable alias(schema, name).
 * @returns The appropriately typed, unexecuted query builder.
 */
export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema,
    baseQuery: Knex.QueryBuilder
): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;

/**
 * Create a schema-aware query while preserving its schema and inferred row type.
 * Pass a table alias for a flat multi-table query requiring an explicit projection;
 * pass an ordinary schema for nested eager loading and schema-aware writes.
 * @param knex - Knex connection or transaction.
 * @param schema - Table schema or immutable alias(schema, name).
 * @returns The appropriately typed, unexecuted query builder.
 */
export function query<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    N extends string
>(
    knex: Knex,
    schema: S | TableAlias<S, N>,
    baseQuery?: Knex.QueryBuilder
):
    | SchemaQueryBuilder<S, QueryResultType<S>>
    | AliasedQueryBuilder<AliasTables<S, N>> {
    if (isTableAlias(schema))
        return new AliasedQueryBuilder<AliasTables<S, N>>(knex, schema);
    return new SchemaQueryBuilder<S, QueryResultType<S>>(
        knex,
        schema,
        baseQuery
    );
}

// ---------------------------------------------------------------------------
// createQuery() — knex-bound factory
// ---------------------------------------------------------------------------

/**
 * A query factory bound to a connection or transaction.
 * Ordinary schemas retain schema/result inference; aliases retain the table context.
 * Use withTransaction() to reuse a transaction or transaction() to create one.
 */
export interface BoundQuery {
    /**
     * Start a typed query on the bound connection using a schema or table alias.
     * Only ordinary schema calls accept an existing Knex base query.
     */
    <
        S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
        N extends string
    >(
        schema: TableAlias<S, N>
    ): AliasedQueryBuilder<AliasTables<S, N>>;
    /**
     * Start a typed query on the bound connection using a schema or table alias.
     * Only ordinary schema calls accept an existing Knex base query.
     */
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
    /**
     * Start a typed query on the bound connection using a schema or table alias.
     * Only ordinary schema calls accept an existing Knex base query.
     */
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
    /**
     * Create a factory bound to an existing transaction without committing it.
     */
    withTransaction(trx: Knex.Transaction): BoundQuery;
    /**
     * Run a callback with a transaction-bound factory.
     * Resolves to the callback result on commit; rejects and rolls back on failure.
     */
    transaction<T>(callback: (db: BoundQuery) => Promise<T>): Promise<T>;
}

/**
 * Bind query() to a connection, retaining all schema/alias overloads.
 * @param knexInstance - Connection or existing transaction to bind.
 * @returns A callable factory with transaction helpers.
 * @example
 * const db = createQuery(knex);
 * const rows = await db(TaskSchema).select(t => ({ id: t.id }));
 */
export function createQuery(knexInstance: Knex): BoundQuery {
    function boundQuery<
        S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
        N extends string
    >(schema: TableAlias<S, N>): AliasedQueryBuilder<AliasTables<S, N>>;
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
    ): SchemaQueryBuilder<TLocalSchema, QueryResultType<TLocalSchema>>;
    function boundQuery<
        S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
        N extends string
    >(
        schema: S | TableAlias<S, N>,
        baseQuery?: Knex.QueryBuilder
    ):
        | SchemaQueryBuilder<S, QueryResultType<S>>
        | AliasedQueryBuilder<AliasTables<S, N>> {
        if (isTableAlias(schema)) return query(knexInstance, schema);
        return baseQuery
            ? query(knexInstance, schema, baseQuery)
            : query(knexInstance, schema);
    }

    return Object.assign(boundQuery, {
        withTransaction(trx: Knex.Transaction): BoundQuery {
            return createQuery(trx);
        },
        transaction<T>(callback: (db: BoundQuery) => Promise<T>): Promise<T> {
            return knexInstance.transaction(trx => callback(createQuery(trx)));
        }
    }) satisfies BoundQuery;
}
