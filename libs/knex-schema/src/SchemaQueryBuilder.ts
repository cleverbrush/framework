// @cleverbrush/knex-schema — SchemaQueryBuilder

import type { InferType } from '@cleverbrush/schema';
import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap, resolveColumnRef } from './columns.js';
import { getTableName } from './extension.js';
import { clearRow } from './mappers.js';
import type {
    ColumnRef,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    ValidatedSpec,
    WithJoinedMany,
    WithJoinedOne
} from './types.js';
import {
    validateJoinMany,
    validateJoinOne,
    validateUniqueFieldNames
} from './validate.js';

// ---------------------------------------------------------------------------
// SchemaQueryBuilder
// ---------------------------------------------------------------------------

/**
 * Type-safe, schema-driven query builder for Knex.
 *
 * `SchemaQueryBuilder` wraps a Knex.QueryBuilder and adds:
 * - **Type-safe column references** — pass a property accessor (`t => t.name`)
 *   or a string property name; both are resolved to the correct SQL column
 *   through the schema's `hasColumnName()` metadata automatically.
 * - **Eager loading without N+1** — {@link joinOne} and {@link joinMany} use
 *   PostgreSQL CTEs and `jsonb_agg` to load related rows in a single query.
 * - **Bidirectional result mapping** — rows returned from Postgres (column
 *   names) are converted back to schema property names before being returned.
 * - **Thenable protocol** — the builder itself is `await`-able so you can
 *   write `await query(db, Schema)` without calling {@link execute} explicitly.
 *
 * Create instances via the {@link query} factory function rather than
 * calling the constructor directly.
 *
 * @typeParam TLocalSchema - The `ObjectSchemaBuilder` describing the main table.
 * @typeParam TResult - The inferred row type, widened automatically as joins
 *   are registered via {@link joinOne} / {@link joinMany}.
 *
 * @example
 * ```ts
 * import knex from 'knex';
 * import { query, object, string, number } from '@cleverbrush/knex-schema';
 *
 * const UserSchema = object({
 *     id:   number(),
 *     name: string(),
 *     age:  number().optional(),
 * }).hasTableName('users');
 *
 * const db = knex({ client: 'pg', connection: process.env.DB_URL });
 *
 * // Fetch all users older than 18, ordered by name
 * const adults = await query(db, UserSchema)
 *     .where(t => t.age, '>', 18)
 *     .orderBy(t => t.name);
 * // adults: Array<{ id: number; name: string; age?: number }>
 * ```
 */
export class SchemaQueryBuilder<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TResult
> {
    readonly #knex: Knex;
    readonly #baseQuery: Knex.QueryBuilder;
    readonly #localSchema: TLocalSchema;
    readonly #specs: ValidatedSpec[] = [];
    readonly #tableName: string;

    /**
     * @param knex - A configured Knex instance.
     * @param localSchema - The `ObjectSchemaBuilder` for the primary table.
     *   Must have a table name set via `.hasTableName()`.
     * @param baseQuery - Optional pre-configured `Knex.QueryBuilder` to use as
     *   the base query instead of the default `knex(tableName)`. Useful when you
     *   need custom joins, CTEs, or other Knex features not exposed by this API.
     */
    constructor(
        knex: Knex,
        localSchema: TLocalSchema,
        baseQuery?: Knex.QueryBuilder
    ) {
        this.#knex = knex;
        this.#localSchema = localSchema;
        this.#tableName = getTableName(localSchema);
        this.#baseQuery = baseQuery ?? knex(this.#tableName);
    }

    // =======================================================================
    // Private helpers
    // =======================================================================

    #resolveColumn(ref: any, label = 'column'): string {
        return resolveColumnRef(
            ref as ColumnRef<any>,
            this.#localSchema,
            label
        );
    }

    // =======================================================================
    // Relation methods — eager loading (absorbed from knex-eager)
    // =======================================================================

    /**
     * Eager-load a single related row (one-to-one / many-to-one relationship).
     *
     * The related rows are fetched using a single CTE + `jsonb_agg` — no N+1
     * queries. The related object is attached to each result row under the
     * field name specified by `spec.as`.
     *
     * @param spec - Join specification. Key fields:
     *   - `foreignSchema` — the `ObjectSchemaBuilder` of the related table.
     *   - `localColumn` — the local column that holds the foreign-table reference.
     *   - `foreignColumn` — the primary/unique key on the foreign table.
     *   - `as` — the property name to attach the related object under.
     *   - `required` — if `true` (default), rows without a matching related
     *     record are excluded (inner join); if `false`, they are included with
     *     `null` (left join).
     *   - `foreignQuery` — optional pre-filtered `Knex.QueryBuilder` for the
     *     foreign table (e.g. to apply scopes).
     *
     * @returns `this` (with an updated `TResult` type that includes the new field)
     *   for chaining.
     *
     * @example
     * ```ts
     * const PostSchema = object({
     *     id:       number(),
     *     title:    string(),
     *     authorId: number(),
     * }).hasTableName('posts');
     *
     * const AuthorSchema = object({
     *     id:   number(),
     *     name: string(),
     * }).hasTableName('authors');
     *
     * const posts = await query(db, PostSchema)
     *     .joinOne({
     *         foreignSchema: AuthorSchema,
     *         localColumn:   t => t.authorId,
     *         foreignColumn: t => t.id,
     *         as:            'author',
     *     });
     * // posts[0].author.name — typed as string ✓
     * ```
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
        WithJoinedOne<TResult, TFieldName, TForeignSchema, TRequired>
    > {
        const validated = validateJoinOne(spec, this.#localSchema, this.#knex);
        this.#specs.push({ type: 'one' as const, ...validated });
        validateUniqueFieldNames(this.#specs);
        return this as any;
    }

    /**
     * Eager-load a collection of related rows (one-to-many relationship).
     *
     * Related rows are fetched via a single CTE + `jsonb_agg` query. The
     * collection is attached to each result row under the field name specified
     * by `spec.as`. Supports `limit`, `offset`, and `orderBy` per-parent
     * using a `row_number()` window function to avoid fetching the full
     * relation before slicing.
     *
     * @param spec - Join specification. Key fields:
     *   - `foreignSchema` — the `ObjectSchemaBuilder` of the related table.
     *   - `localColumn` — the primary/unique key on the local table.
     *   - `foreignColumn` — the column on the foreign table that references `localColumn`.
     *   - `as` — the property name to attach the array under.
     *   - `limit` / `offset` — optional pagination per parent row.
     *   - `orderBy` — optional `{ column, direction }` for the sub-collection.
     *   - `foreignQuery` — optional pre-filtered `Knex.QueryBuilder`.
     *
     * @returns `this` (with an updated `TResult` type that includes the new field)
     *   for chaining.
     *
     * @example
     * ```ts
     * const UserSchema = object({
     *     id:   number(),
     *     name: string(),
     * }).hasTableName('users');
     *
     * const PostSchema = object({
     *     id:       number(),
     *     title:    string(),
     *     authorId: number(),
     * }).hasTableName('posts');
     *
     * const users = await query(db, UserSchema)
     *     .joinMany({
     *         foreignSchema: PostSchema,
     *         localColumn:   t => t.id,
     *         foreignColumn: t => t.authorId,
     *         as:            'posts',
     *         limit:         5,
     *         orderBy:       { column: t => t.id, direction: 'desc' },
     *     });
     * // users[0].posts — typed as Array<{ id: number; title: string; authorId: number }>
     * ```
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
        WithJoinedMany<TResult, TFieldName, TForeignSchema>
    > {
        const validated = validateJoinMany(spec, this.#localSchema, this.#knex);
        this.#specs.push({ type: 'many' as const, ...validated });
        validateUniqueFieldNames(this.#specs);
        return this as any;
    }

    // =======================================================================
    // WHERE methods
    // =======================================================================

    /**
     * Add a `WHERE` clause to the query.
     *
     * Accepts a column reference, an optional operator, and a value:
     * - `where(t => t.age, '>', 18)` — property accessor + operator + value.
     * - `where('age', 18)` — string key + value (defaults to `=`).
     * - `where({ name: 'Alice' })` — record object; property keys are mapped
     *   to column names automatically.
     * - `where(builder => { ... })` — Knex sub-builder callback for grouped
     *   conditions.
     * - `where(knex.raw('...'))` — raw SQL expression.
     *
     * Multiple `.where()` calls are combined with `AND`.
     *
     * @returns `this` for chaining.
     */
    where(column: ColumnRef<TLocalSchema>, operator: string, value: any): this;
    where(column: ColumnRef<TLocalSchema>, value: any): this;
    where(callback: (builder: Knex.QueryBuilder) => void): this;
    where(record: Record<string, any>): this;
    where(raw: Knex.Raw): this;
    where(
        columnOrRaw:
            | ColumnRef<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        if (
            typeof columnOrRaw === 'function' &&
            !this.#isColumnAccessor(columnOrRaw)
        ) {
            (this.#baseQuery.where as any)(columnOrRaw, ...args);
        } else if (
            typeof columnOrRaw === 'object' &&
            columnOrRaw !== null &&
            !('toSQL' in columnOrRaw)
        ) {
            // Record<string, any> — map property keys to column names
            const mapped = this.#mapRecordToColumns(
                columnOrRaw as Record<string, any>
            );
            (this.#baseQuery.where as any)(mapped, ...args);
        } else {
            const col = this.#resolveColumnArg(columnOrRaw);
            (this.#baseQuery.where as any)(col, ...args);
        }
        return this;
    }

    /**
     * Alias for {@link where} — explicitly adds an `AND WHERE` clause.
     * Identical to calling `.where()` when no logical-OR grouping is needed.
     * @returns `this` for chaining.
     */
    andWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    andWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    andWhere(record: Record<string, any>): this;
    andWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    andWhere(raw: Knex.Raw): this;
    andWhere(
        columnOrRaw:
            | ColumnRef<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        if (
            typeof columnOrRaw === 'function' &&
            !this.#isColumnAccessor(columnOrRaw)
        ) {
            (this.#baseQuery.andWhere as any)(columnOrRaw, ...args);
        } else if (
            typeof columnOrRaw === 'object' &&
            columnOrRaw !== null &&
            !('toSQL' in columnOrRaw)
        ) {
            const mapped = this.#mapRecordToColumns(
                columnOrRaw as Record<string, any>
            );
            (this.#baseQuery.andWhere as any)(mapped, ...args);
        } else {
            const col = this.#resolveColumnArg(columnOrRaw);
            (this.#baseQuery.andWhere as any)(col, ...args);
        }
        return this;
    }

    /**
     * Add an `OR WHERE` clause. Use this to create alternative filter branches.
     * @returns `this` for chaining.
     */
    orWhere(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    orWhere(column: ColumnRef<TLocalSchema>, value: any): this;
    orWhere(record: Record<string, any>): this;
    orWhere(callback: (builder: Knex.QueryBuilder) => void): this;
    orWhere(raw: Knex.Raw): this;
    orWhere(
        columnOrRaw:
            | ColumnRef<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        if (
            typeof columnOrRaw === 'function' &&
            !this.#isColumnAccessor(columnOrRaw)
        ) {
            (this.#baseQuery.orWhere as any)(columnOrRaw, ...args);
        } else if (
            typeof columnOrRaw === 'object' &&
            columnOrRaw !== null &&
            !('toSQL' in columnOrRaw)
        ) {
            const mapped = this.#mapRecordToColumns(
                columnOrRaw as Record<string, any>
            );
            (this.#baseQuery.orWhere as any)(mapped, ...args);
        } else {
            const col = this.#resolveColumnArg(columnOrRaw);
            (this.#baseQuery.orWhere as any)(col, ...args);
        }
        return this;
    }

    /**
     * Add a `WHERE NOT` clause — negates the condition.
     * @returns `this` for chaining.
     */
    whereNot(
        column: ColumnRef<TLocalSchema>,
        operator: string,
        value: any
    ): this;
    whereNot(column: ColumnRef<TLocalSchema>, value: any): this;
    whereNot(record: Record<string, any>): this;
    whereNot(callback: (builder: Knex.QueryBuilder) => void): this;
    whereNot(raw: Knex.Raw): this;
    whereNot(
        columnOrRaw:
            | ColumnRef<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        if (
            typeof columnOrRaw === 'function' &&
            !this.#isColumnAccessor(columnOrRaw)
        ) {
            (this.#baseQuery.whereNot as any)(columnOrRaw, ...args);
        } else if (
            typeof columnOrRaw === 'object' &&
            columnOrRaw !== null &&
            !('toSQL' in columnOrRaw)
        ) {
            const mapped = this.#mapRecordToColumns(
                columnOrRaw as Record<string, any>
            );
            (this.#baseQuery.whereNot as any)(mapped, ...args);
        } else {
            const col = this.#resolveColumnArg(columnOrRaw);
            (this.#baseQuery.whereNot as any)(col, ...args);
        }
        return this;
    }

    /**
     * Add a `WHERE column IN (values)` clause.
     * @param column - Column reference (property accessor or string key).
     * @param values - Array of values or a sub-query.
     * @returns `this` for chaining.
     */
    whereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        this.#baseQuery.whereIn(
            this.#resolveColumn(column, 'whereIn'),
            values as any
        );
        return this;
    }

    /**
     * Add a `WHERE column NOT IN (values)` clause.
     * @param column - Column reference.
     * @param values - Array of values or a sub-query.
     * @returns `this` for chaining.
     */
    whereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        this.#baseQuery.whereNotIn(
            this.#resolveColumn(column, 'whereNotIn'),
            values as any
        );
        return this;
    }

    /**
     * Add an `OR WHERE column IN (values)` clause.
     * @returns `this` for chaining.
     */
    orWhereIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        (this.#baseQuery as any).orWhereIn(
            this.#resolveColumn(column, 'orWhereIn'),
            values as any
        );
        return this;
    }

    /**
     * Add an `OR WHERE column NOT IN (values)` clause.
     * @returns `this` for chaining.
     */
    orWhereNotIn(
        column: ColumnRef<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        (this.#baseQuery as any).orWhereNotIn(
            this.#resolveColumn(column, 'orWhereNotIn'),
            values as any
        );
        return this;
    }

    /**
     * Add a `WHERE column IS NULL` clause.
     * @returns `this` for chaining.
     */
    whereNull(column: ColumnRef<TLocalSchema>): this {
        this.#baseQuery.whereNull(this.#resolveColumn(column, 'whereNull'));
        return this;
    }

    /**
     * Add a `WHERE column IS NOT NULL` clause.
     * @returns `this` for chaining.
     */
    whereNotNull(column: ColumnRef<TLocalSchema>): this {
        this.#baseQuery.whereNotNull(
            this.#resolveColumn(column, 'whereNotNull')
        );
        return this;
    }

    /**
     * Add an `OR WHERE column IS NULL` clause.
     * @returns `this` for chaining.
     */
    orWhereNull(column: ColumnRef<TLocalSchema>): this {
        (this.#baseQuery as any).orWhereNull(
            this.#resolveColumn(column, 'orWhereNull')
        );
        return this;
    }

    /**
     * Add an `OR WHERE column IS NOT NULL` clause.
     * @returns `this` for chaining.
     */
    orWhereNotNull(column: ColumnRef<TLocalSchema>): this {
        (this.#baseQuery as any).orWhereNotNull(
            this.#resolveColumn(column, 'orWhereNotNull')
        );
        return this;
    }

    /**
     * Add a `WHERE column BETWEEN low AND high` clause.
     * @param range - A two-element tuple `[low, high]`.
     * @returns `this` for chaining.
     */
    whereBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        this.#baseQuery.whereBetween(
            this.#resolveColumn(column, 'whereBetween'),
            range as [any, any]
        );
        return this;
    }

    /**
     * Add a `WHERE column NOT BETWEEN low AND high` clause.
     * @param range - A two-element tuple `[low, high]`.
     * @returns `this` for chaining.
     */
    whereNotBetween(
        column: ColumnRef<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        this.#baseQuery.whereNotBetween(
            this.#resolveColumn(column, 'whereNotBetween'),
            range as [any, any]
        );
        return this;
    }

    /**
     * Add a case-sensitive `WHERE column LIKE value` clause.
     * @param value - A SQL LIKE pattern (e.g. `'Alice%'`).
     * @returns `this` for chaining.
     */
    whereLike(column: ColumnRef<TLocalSchema>, value: string): this {
        (this.#baseQuery as any).whereLike(
            this.#resolveColumn(column, 'whereLike'),
            value
        );
        return this;
    }

    /**
     * Add a case-insensitive `WHERE column ILIKE value` clause (PostgreSQL).
     * @param value - A SQL LIKE pattern (e.g. `'alice%'`).
     * @returns `this` for chaining.
     */
    whereILike(column: ColumnRef<TLocalSchema>, value: string): this {
        (this.#baseQuery as any).whereILike(
            this.#resolveColumn(column, 'whereILike'),
            value
        );
        return this;
    }

    /**
     * Add a raw `WHERE` clause. Useful for database-specific expressions.
     * @param sql - Raw SQL string with optional `:binding:` or `?` placeholders.
     * @param bindings - Values for the placeholders.
     * @returns `this` for chaining.
     */
    whereRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.whereRaw(sql, ...bindings);
        return this;
    }

    /**
     * Add a `WHERE EXISTS (subquery)` clause.
     * @param callback - A Knex query callback or sub-query builder.
     * @returns `this` for chaining.
     */
    whereExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        this.#baseQuery.whereExists(callback as any);
        return this;
    }

    // =======================================================================
    // ORDER BY
    // =======================================================================

    /**
     * Order the results by a column.
     * @param column - Column reference or raw expression.
     * @param direction - `'asc'` (default) or `'desc'`.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * query(db, UserSchema).orderBy(t => t.name).orderBy(t => t.createdAt, 'desc');
     * ```
     */
    orderBy(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        direction?: 'asc' | 'desc'
    ): this {
        const col = this.#resolveColumnArg(column);
        this.#baseQuery.orderBy(col as string, direction);
        return this;
    }

    /**
     * Order the results by a raw SQL expression.
     * @param sql - Raw SQL (e.g. `'LOWER(name) ASC'`).
     * @returns `this` for chaining.
     */
    orderByRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.orderByRaw(sql, ...bindings);
        return this;
    }

    // =======================================================================
    // GROUP BY / HAVING
    // =======================================================================

    /**
     * Add a `GROUP BY` clause.
     * @param columns - One or more column references or raw expressions.
     * @returns `this` for chaining.
     */
    groupBy(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.groupBy(...(resolved as string[]));
        return this;
    }

    /**
     * Add a raw `GROUP BY` expression.
     * @returns `this` for chaining.
     */
    groupByRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.groupByRaw(sql, ...bindings);
        return this;
    }

    /**
     * Add a `HAVING column operator value` clause (used with `GROUP BY`).
     * @returns `this` for chaining.
     */
    having(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        operator: string,
        value: any
    ): this {
        const col = this.#resolveColumnArg(column);
        this.#baseQuery.having(col as string, operator, value);
        return this;
    }

    /**
     * Add a raw `HAVING` expression.
     * @returns `this` for chaining.
     */
    havingRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.havingRaw(sql, ...bindings);
        return this;
    }

    // =======================================================================
    // PAGINATION
    // =======================================================================

    /**
     * Limit the number of rows returned.
     * @param n - Maximum number of rows.
     * @returns `this` for chaining.
     */
    limit(n: number): this {
        this.#baseQuery.limit(n);
        return this;
    }

    /**
     * Skip the first `n` rows in the result set (for cursor/offset pagination).
     * @param n - Number of rows to skip.
     * @returns `this` for chaining.
     */
    offset(n: number): this {
        this.#baseQuery.offset(n);
        return this;
    }

    // =======================================================================
    // SELECT / DISTINCT
    // =======================================================================

    /**
     * Select specific columns instead of `*`. Each column reference is
     * resolved to its SQL column name through the schema.
     * @param columns - One or more column references or raw expressions.
     * @returns `this` for chaining.
     */
    select(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.select(...(resolved as string[]));
        return this;
    }

    /**
     * Add `DISTINCT` to the select clause. Duplicate rows are eliminated.
     * @param columns - One or more column references or raw expressions.
     * @returns `this` for chaining.
     */
    distinct(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.distinct(...(resolved as string[]));
        return this;
    }

    // =======================================================================
    // AGGREGATES
    // =======================================================================

    /**
     * Add a `COUNT(*)` or `COUNT(column)` aggregate to the select list.
     * @param column - Optional column to count (defaults to `*`).
     * @returns `this` for chaining.
     */
    count(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        if (column) {
            this.#baseQuery.count(this.#resolveColumnArg(column) as string);
        } else {
            this.#baseQuery.count();
        }
        return this;
    }

    /**
     * Add a `COUNT(DISTINCT column)` aggregate to the select list.
     * @param column - Optional column (defaults to `*`).
     * @returns `this` for chaining.
     */
    countDistinct(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        if (column) {
            this.#baseQuery.countDistinct(
                this.#resolveColumnArg(column) as string
            );
        } else {
            this.#baseQuery.countDistinct();
        }
        return this;
    }

    /**
     * Add a `MIN(column)` aggregate.
     * @returns `this` for chaining.
     */
    min(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.min(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add a `MAX(column)` aggregate.
     * @returns `this` for chaining.
     */
    max(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.max(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add a `SUM(column)` aggregate.
     * @returns `this` for chaining.
     */
    sum(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.sum(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add an `AVG(column)` aggregate.
     * @returns `this` for chaining.
     */
    avg(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.avg(this.#resolveColumnArg(column) as string);
        return this;
    }

    // =======================================================================
    // WRITE OPERATIONS
    // =======================================================================

    /**
     * Insert a single row into the table and return the inserted record.
     *
     * Property keys are mapped to SQL column names via the schema's
     * `hasColumnName()` metadata before the `INSERT` is executed. The
     * returned row is mapped back to property names.
     *
     * @param data - The object to insert. Keys must be valid schema property names.
     * @returns The full inserted row (including database-generated fields).
     *
     * @example
     * ```ts
     * const user = await query(db, UserSchema).insert({ name: 'Alice', age: 30 });
     * // user.id is populated by the database DEFAULT / SERIAL
     * ```
     */
    async insert(data: InsertType<TLocalSchema>): Promise<TResult> {
        const mapped = this.#mapObjectToColumns(data as Record<string, any>);
        const [row] = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        return this.#mapRow(row) as TResult;
    }

    /**
     * Insert multiple rows in a single `INSERT` statement and return all
     * inserted records.
     *
     * @param data - Array of objects to insert.
     * @returns The full inserted rows in insertion order.
     */
    async insertMany(data: InsertType<TLocalSchema>[]): Promise<TResult[]> {
        const mapped = data.map(d =>
            this.#mapObjectToColumns(d as Record<string, any>)
        );
        const rows = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    /**
     * Update all rows that match the current `WHERE` clause and return the
     * updated records.
     *
     * Only the keys present in `data` are updated (partial update). Property
     * keys are resolved to column names automatically.
     *
     * @param data - Partial schema object with fields to update.
     * @returns All rows that were updated.
     *
     * @example
     * ```ts
     * const updated = await query(db, UserSchema)
     *     .where(t => t.id, userId)
     *     .update({ name: 'Bob' });
     * ```
     */
    async update(data: Partial<InferType<TLocalSchema>>): Promise<TResult[]> {
        const mapped = this.#mapObjectToColumns(data as Record<string, any>);
        const rows = await this.#baseQuery.update(mapped).returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    /**
     * Delete all rows that match the current `WHERE` clause.
     * @returns The number of rows deleted.
     *
     * @example
     * ```ts
     * const count = await query(db, UserSchema).where(t => t.id, id).delete();
     * ```
     */
    async delete(): Promise<number> {
        return this.#baseQuery.delete();
    }

    // =======================================================================
    // ESCAPE HATCH
    // =======================================================================

    /**
     * Escape hatch: apply any Knex method to the underlying base query.
     *
     * Use this when you need a Knex feature not exposed by this API (e.g.
     * `forUpdate()`, CTEs, `join()`, `union()`).
     *
     * @param fn - A callback that receives the raw `Knex.QueryBuilder` and
     *   may mutate it in place.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * query(db, UserSchema).apply(qb => qb.forUpdate().noWait());
     * ```
     */
    apply(fn: (builder: Knex.QueryBuilder) => void): this {
        fn(this.#baseQuery);
        return this;
    }

    // =======================================================================
    // CTE-based eager loading query building (from knex-eager)
    // =======================================================================

    #buildQuery(): Knex.QueryBuilder {
        if (this.#specs.length === 0) {
            return this.#baseQuery;
        }

        const knex = this.#knex;
        const specs = this.#specs;

        const resultQuery = knex
            .queryBuilder()
            .with('originalQuery', this.#baseQuery)
            .select('originalQuery.*')
            .from(
                knex.raw(':originalQuery:', {
                    originalQuery: 'originalQuery'
                })
            );

        for (let i = 0; i < specs.length; i++) {
            const spec = specs[i];
            const relationAlias = `eagerRelation${i}`;

            if (spec.type === 'one') {
                this.#buildJoinOne(resultQuery, spec, relationAlias);
            } else {
                this.#buildJoinMany(resultQuery, spec, relationAlias, i);
            }
        }

        return resultQuery;
    }

    #buildJoinOne(
        resultQuery: Knex.QueryBuilder,
        spec: ValidatedSpec & { type: 'one' },
        relationAlias: string
    ): void {
        const knex = this.#knex;
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

    #buildJoinMany(
        resultQuery: Knex.QueryBuilder,
        spec: ValidatedSpec & { type: 'many' },
        relationAlias: string,
        i: number
    ): void {
        const knex = this.#knex;
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

    // =======================================================================
    // Result mapping
    // =======================================================================

    /**
     * Map a SQL result row (column names) back to schema property names.
     * Also handles joined fields (which are already named by `as`).
     */
    #mapRow(row: Record<string, any>): Record<string, any> {
        if (!row) return row;

        const { colToProp } = buildColumnMap(this.#localSchema);
        const result: Record<string, any> = {};

        // Map known columns back to property names
        for (const [colName, value] of Object.entries(row)) {
            const propName = colToProp.get(colName);
            if (propName) {
                result[propName] = value;
            } else {
                // Unknown column (e.g., joined field, raw expression) — pass through
                result[colName] = value;
            }
        }

        return result;
    }

    /**
     * Clean a row that has eager-loaded relations (apply mappers, then map columns).
     */
    #cleanAndMapRow(row: Record<string, any>): Record<string, any> {
        const oneSpecs = this.#specs.filter(
            (s): s is ValidatedSpec & { type: 'one' } => s.type === 'one'
        );
        const manySpecs = this.#specs.filter(
            (s): s is ValidatedSpec & { type: 'many' } => s.type === 'many'
        );
        const cleaned = clearRow(row, oneSpecs, manySpecs);
        return this.#mapRow(cleaned);
    }

    // =======================================================================
    // Column mapping helpers
    // =======================================================================

    /**
     * Map a schema-shaped object (property keys) to a SQL object (column names).
     * Used for INSERT / UPDATE.
     */
    #mapObjectToColumns(obj: Record<string, any>): Record<string, any> {
        const { propToCol } = buildColumnMap(this.#localSchema);
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            const colName = propToCol.get(key);
            if (colName) {
                result[colName] = value;
            } else {
                // Unknown key — pass through (could be a raw column)
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Map a Record<propertyKey, value> to Record<columnName, value>.
     * Used for `.where({ name: 'John' })` style calls.
     */
    #mapRecordToColumns(record: Record<string, any>): Record<string, any> {
        return this.#mapObjectToColumns(record);
    }

    /**
     * Resolve a column argument that could be a ColumnRef, Knex.Raw, or callback.
     * Returns the resolved string or passes through Knex.Raw.
     */
    #resolveColumnArg(col: any): string | Knex.Raw {
        if (typeof col === 'string') {
            return this.#resolveColumn(col, 'column');
        }
        if (typeof col === 'function') {
            // Property descriptor accessor
            return this.#resolveColumn(col, 'column');
        }
        // Knex.Raw — pass through
        return col;
    }

    /**
     * Detect if a function is a property descriptor accessor (takes tree, returns descriptor)
     * vs a knex sub-builder callback (takes builder, returns void).
     *
     * Heuristic: property descriptor accessors are arrow functions that access
     * tree properties. We cannot distinguish at runtime, so we try the accessor
     * and fallback to callback if it fails.
     *
     * For safety, we check if the function parameter count can help:
     * - Knex callbacks typically have 1 parameter named `builder` or `qb`
     * - Property accessors typically have 1 parameter named `t` or similar
     *
     * Since both are `(arg) => result`, we use a try/catch approach:
     * attempt to resolve as column accessor first.
     */
    #isColumnAccessor(fn: Function): boolean {
        // Try to invoke the accessor with the property descriptor tree
        try {
            const tree = ObjectSchemaBuilder.getPropertiesFor(
                this.#localSchema as any
            );
            const result = fn(tree);
            // If it returns a valid property descriptor, it's an accessor
            if (
                result &&
                typeof result === 'object' &&
                SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in result
            ) {
                return true;
            }
        } catch {
            // Not an accessor
        }
        return false;
    }

    // =======================================================================
    // Execution
    // =======================================================================

    /**
     * Return the raw SQL string that would be executed, for debugging.
     * Does not execute the query against the database.
     */
    toQuery(): string {
        return this.#buildQuery().toQuery();
    }

    /**
     * Returns the underlying Knex query builder. Useful when passing this
     * query as a `foreignQuery` in `.joinOne()` / `.joinMany()`, or any context
     * that expects a raw `Knex.QueryBuilder`.
     */
    toKnexQuery(): Knex.QueryBuilder {
        return this.#buildQuery();
    }

    /**
     * Alias for {@link toQuery} — returns the raw SQL string.
     */
    toString(): string {
        return this.#buildQuery().toString();
    }

    /**
     * Execute the query and return all matching rows, mapped back to schema
     * property names.
     *
     * @returns A promise that resolves to an array of result objects typed as
     *   `TResult[]`.
     *
     * @example
     * ```ts
     * const users = await query(db, UserSchema).execute();
     * ```
     */
    async execute(): Promise<TResult[]> {
        const query = this.#buildQuery();
        const rows = await query;

        if (!rows) return [];
        if (!Array.isArray(rows))
            return [this.#cleanAndMapRow(rows)] as TResult[];

        return rows.map((row: any) => this.#cleanAndMapRow(row)) as TResult[];
    }

    /**
     * Execute the query and return only the first row, or `undefined` if no
     * rows match.
     *
     * @example
     * ```ts
     * const user = await query(db, UserSchema).where(t => t.id, id).first();
     * if (user) { /* ... *\/ }
     * ```
     */
    async first(): Promise<TResult | undefined> {
        const query = this.#buildQuery().first();
        const row = await query;

        if (!row) return undefined;
        return this.#cleanAndMapRow(row) as TResult;
    }

    /**
     * Thenable implementation — allows the builder to be awaited directly
     * without calling {@link execute} explicitly.
     *
     * @example
     * ```ts
     * const users = await query(db, UserSchema).where(t => t.name, 'Alice');
     * // Equivalent to: await query(db, UserSchema).where(...).execute()
     * ```
     */
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable for `await builder` support
    then<TReturn1 = TResult[], TReturn2 = never>(
        onfulfilled?:
            | ((value: TResult[]) => TReturn1 | PromiseLike<TReturn1>)
            | null,
        onrejected?: ((reason: any) => TReturn2 | PromiseLike<TReturn2>) | null
    ): Promise<TReturn1 | TReturn2> {
        return this.execute().then(onfulfilled, onrejected);
    }
}

// ---------------------------------------------------------------------------
// query() — main entry point
// ---------------------------------------------------------------------------

/**
 * Create a typed {@link SchemaQueryBuilder} for the table described by `schema`.
 *
 * The schema must have a table name configured via `.hasTableName()`.
 * Column name mappings set via `.hasColumnName()` are applied automatically
 * to all query methods. The returned builder is thenable — you can `await` it
 * directly to execute the query and get `TResult[]`.
 *
 * @param knex - A configured Knex instance.
 * @param schema - The `ObjectSchemaBuilder` describing the table.
 * @returns A new {@link SchemaQueryBuilder} ready for chaining.
 *
 * @example
 * ```ts
 * import knex from 'knex';
 * import { query, object, string, number } from '@cleverbrush/knex-schema';
 *
 * const UserSchema = object({ id: number(), name: string() }).hasTableName('users');
 * const db = knex({ client: 'pg', connection: process.env.DB_URL });
 *
 * const users = await query(db, UserSchema).where(t => t.name, 'like', 'A%');
 * ```
 */
export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema
): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>;

/**
 * Create a typed {@link SchemaQueryBuilder} from an existing Knex query builder.
 *
 * Use this overload when you need to supply a pre-configured base query —
 * for example one that already has a sub-query, CTE, or a schema scope applied.
 *
 * @param knex - A configured Knex instance.
 * @param schema - The `ObjectSchemaBuilder` describing the table.
 * @param baseQuery - An existing `Knex.QueryBuilder` to use as the base.
 * @returns A new {@link SchemaQueryBuilder} wrapping `baseQuery`.
 *
 * @example
 * ```ts
 * // Use a scoped base query (e.g. soft-delete filter applied globally)
 * const base = db('users').where('deleted_at', null);
 * const activeUsers = await query(db, UserSchema, base).where(t => t.age, '>', 18);
 * ```
 */
export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema,
    baseQuery: Knex.QueryBuilder
): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>;

export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema,
    baseQuery?: Knex.QueryBuilder
): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>> {
    return new SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>(
        knex,
        schema,
        baseQuery
    );
}

// ---------------------------------------------------------------------------
// createQuery() — knex-bound factory
// ---------------------------------------------------------------------------

/** Bound query function returned by {@link createQuery}. */
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
    ): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>;
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
    ): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>;
}

/**
 * Bind a Knex instance once and get back a `query(schema)` function that
 * doesn't require repeating the knex argument on every call.
 *
 * @param knex - A configured Knex instance.
 * @returns A bound query factory: `(schema, baseQuery?) => SchemaQueryBuilder`.
 *
 * @example
 * ```ts
 * import Knex from 'knex';
 * import { createQuery } from '@cleverbrush/knex-schema';
 *
 * const knex = Knex({ client: 'pg', connection: process.env.DB_URL });
 * const query = createQuery(knex);
 *
 * // No knex argument needed from here on
 * const users = await query(UserSchema).where(t => t.role, '=', 'admin');
 * const post = await query(PostSchema).where(t => t.id, '=', 42).first();
 *
 * // Optional base query (e.g. soft-delete scope applied globally)
 * const active = query(UserSchema, knex('users').where('deleted_at', null));
 * ```
 */
export function createQuery(knexInstance: Knex): BoundQuery {
    return function boundQuery<
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
    ): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>> {
        return baseQuery
            ? query(knexInstance, schema, baseQuery)
            : query(knexInstance, schema);
    } as BoundQuery;
}
