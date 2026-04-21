// @cleverbrush/knex-schema — SchemaQueryBuilder

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
    resolveColumnRef,
    resolvePropertyKey
} from './columns.js';
import { getColumnName, getProjections, getTableName } from './extension.js';
import { clearRow } from './mappers.js';
import type {
    ColumnRef,
    CursorPaginationResult,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    PaginationResult,
    RelationSpec,
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the scope names registered on a schema via `.scope(name, fn)`.
 * Returns `never` when no scopes are defined (making `.scoped()` uncallable).
 * Falls back to `string` for `any`-typed schemas to preserve loose behaviour.
 *
 * @internal
 */
type ScopesOf<S> = S extends {
    readonly [METHOD_LITERAL_BRAND]?: infer N;
}
    ? Extract<N, string>
    : never;

/**
 * Extracts the named projection map from a schema type.
 * Returns a `Record<name, readonly keys[]>` type where each key is a
 * registered projection name and the value is the tuple of property keys.
 * Returns `Record<never, never>` (no projections) when the schema has none,
 * making `.projected()` uncallable on undecorated schemas.
 *
 * @internal
 */
type ProjectionsOf<S> = S extends {
    readonly [EXTRA_TYPE_BRAND]?: infer P;
}
    ? P extends Record<string, readonly string[]>
        ? P
        : Record<never, never>
    : Record<never, never>;

/**
 * Extracts the string-key union for a specific projection name from a schema
 * type. This indirection is needed because TypeScript cannot directly index
 * `ProjectionsOf<S>[K]` with `number` inside a generic function signature.
 *
 * @internal
 */
type ProjectionKeysOf<
    S,
    K extends keyof ProjectionsOf<S> & string
> = ProjectionsOf<S>[K] extends readonly (infer T extends string)[]
    ? T
    : string;

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
     * Tracks the SQL column names that were explicitly passed to `.select()`.
     * `null` means no explicit select was made (SELECT *).
     */
    #explicitSelects: string[] | null = null;

    /**
     * Tracks which column-selection mode is active on this builder.
     * - `null`          — no explicit SELECT issued yet (SELECT *).
     * - `'select'`      — `.select()` / `.distinct()` was called.
     * - `'aggregate'`   — `.count()` / `.countDistinct()` / `.min()` / etc.
     * - `'projection'`  — `.projected()` was called.
     *
     * Only one mode is allowed per query. Calling a method that would switch
     * to a different mode throws an error.
     */
    #selectionMode: 'select' | 'aggregate' | 'projection' | null = null;
    /** Name of the projection currently applied, for use in error messages. */
    #appliedProjection: string | null = null;

    /** When true, soft-delete filter is not applied to SELECT queries. */
    #includeDeleted = false;
    /** When true, only soft-deleted rows are returned. */
    #onlyDeleted = false;
    /** When true, default scope is not applied. */
    #skipDefaultScope = false;

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

    /** @internal Read soft-delete extension from schema. */
    #getSoftDelete(): { column: string } | null {
        const ext = (this.#localSchema as any).getExtension?.('softDelete');
        return ext ?? null;
    }

    /** @internal Read default scope function from schema. */
    #getDefaultScope(): Function | null {
        const fn = (this.#localSchema as any).getExtension?.('defaultScope');
        return typeof fn === 'function' ? fn : null;
    }

    /** @internal Read timestamps config from schema. */
    #getTimestamps(): { createdAt: string; updatedAt: string } | null {
        const ts = (this.#localSchema as any).getExtension?.('timestamps');
        return ts ?? null;
    }

    /**
     * Build the effective base query with soft-delete and default-scope
     * filters applied lazily. Does NOT include CTE wrapping.
     */
    #getEffectiveBaseQuery(): Knex.QueryBuilder {
        let effectiveBase = this.#baseQuery;
        let cloned = false;

        // Apply soft delete filter
        const softDelete = this.#getSoftDelete();
        if (softDelete && this.#onlyDeleted) {
            if (!cloned) {
                effectiveBase = effectiveBase.clone();
                cloned = true;
            }
            effectiveBase.whereNotNull(softDelete.column);
        } else if (softDelete && !this.#includeDeleted) {
            if (!cloned) {
                effectiveBase = effectiveBase.clone();
                cloned = true;
            }
            effectiveBase.whereNull(softDelete.column);
        }

        // Apply default scope
        if (!this.#skipDefaultScope) {
            const defaultScopeFn = this.#getDefaultScope();
            if (defaultScopeFn) {
                if (!cloned) {
                    effectiveBase = effectiveBase.clone();
                    cloned = true;
                }
                const proxy = new SchemaQueryBuilder(
                    this.#knex,
                    this.#localSchema,
                    effectiveBase
                );
                proxy.#skipDefaultScope = true;
                defaultScopeFn(proxy);
            }
        }

        return effectiveBase;
    }

    /** @internal Resolve a lazy schema reference `schema | () => schema`. */
    #resolveSchema(
        schema: any
    ): ObjectSchemaBuilder<any, any, any, any, any, any, any> {
        return typeof schema === 'function' ? schema() : schema;
    }

    /** @internal Find the primary key column name from schema extensions. */
    #findPrimaryKeyColumn(
        schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
    ): string {
        const introspected = schema.introspect() as any;
        const properties = introspected.properties ?? {};
        for (const [key, propSchema] of Object.entries(properties)) {
            const ext = (propSchema as any).introspect?.().extensions ?? {};
            if (ext.primaryKey) {
                return getColumnName(propSchema as any, key);
            }
        }
        return 'id';
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
    where(raw: Knex.Raw, operator: string, value: any): this;
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
        this.#assertNotProjection('select');
        this.#selectionMode = 'select';
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.select(...(resolved as string[]));
        // Track the string-resolved columns (not Knex.Raw) for CTE column management
        this.#explicitSelects ??= [];
        for (const r of resolved) {
            if (typeof r === 'string') {
                this.#explicitSelects.push(r);
            }
        }
        return this;
    }

    /** @internal Throw if a projection has already been applied. */
    #assertNotProjection(method: string): void {
        if (this.#selectionMode === 'projection') {
            throw new Error(
                `Cannot call .${method}() after .projected('${
                    this.#appliedProjection
                }'). Choose one column-selection mode per query.`
            );
        }
    }

    /** @internal Throw if .select() or .projected() has already been applied. */
    #assertNotExplicitSelect(method: string): void {
        if (this.#selectionMode === 'select') {
            throw new Error(
                `Cannot call .${method}() after .select(). Choose one column-selection mode per query.`
            );
        }
        if (this.#selectionMode === 'aggregate') {
            throw new Error(
                `Cannot call .${method}() after an aggregate method. Choose one column-selection mode per query.`
            );
        }
        if (this.#selectionMode === 'projection') {
            throw new Error(
                `Cannot call .${method}() after .projected('${
                    this.#appliedProjection
                }'). Choose one column-selection mode per query.`
            );
        }
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
        this.#assertNotProjection('count');
        this.#selectionMode = 'aggregate';
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
        this.#assertNotProjection('countDistinct');
        this.#selectionMode = 'aggregate';
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
        this.#assertNotProjection('min');
        this.#selectionMode = 'aggregate';
        this.#baseQuery.min(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add a `MAX(column)` aggregate.
     * @returns `this` for chaining.
     */
    max(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#assertNotProjection('max');
        this.#selectionMode = 'aggregate';
        this.#baseQuery.max(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add a `SUM(column)` aggregate.
     * @returns `this` for chaining.
     */
    sum(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#assertNotProjection('sum');
        this.#selectionMode = 'aggregate';
        this.#baseQuery.sum(this.#resolveColumnArg(column) as string);
        return this;
    }

    /**
     * Add an `AVG(column)` aggregate.
     * @returns `this` for chaining.
     */
    avg(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#assertNotProjection('avg');
        this.#selectionMode = 'aggregate';
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
        let processedData = { ...(data as Record<string, any>) };

        // Run beforeInsert hooks
        const beforeHooks =
            ((this.#localSchema as any).getExtension?.('beforeInsert') as
                | Function[]
                | undefined) ?? [];
        for (const hook of beforeHooks) {
            processedData = (await hook(processedData)) ?? processedData;
        }

        const mapped = this.#mapObjectToColumns(processedData);

        // Apply timestamps
        const timestamps = this.#getTimestamps();
        if (timestamps) {
            mapped[timestamps.createdAt] = this.#knex.fn.now();
            mapped[timestamps.updatedAt] = this.#knex.fn.now();
        }

        const [row] = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        const result = this.#mapRow(row) as TResult;

        // Run afterInsert hooks
        const afterHooks =
            ((this.#localSchema as any).getExtension?.('afterInsert') as
                | Function[]
                | undefined) ?? [];
        for (const hook of afterHooks) {
            await hook(result);
        }

        return result;
    }

    /**
     * Insert multiple rows in a single `INSERT` statement and return all
     * inserted records.
     *
     * @param data - Array of objects to insert.
     * @returns The full inserted rows in insertion order.
     */
    async insertMany(data: InsertType<TLocalSchema>[]): Promise<TResult[]> {
        const timestamps = this.#getTimestamps();
        const beforeHooks =
            ((this.#localSchema as any).getExtension?.('beforeInsert') as
                | Function[]
                | undefined) ?? [];

        const mapped = [];
        for (const d of data) {
            let processedData = { ...(d as Record<string, any>) };
            for (const hook of beforeHooks) {
                processedData = (await hook(processedData)) ?? processedData;
            }
            const m = this.#mapObjectToColumns(processedData);
            if (timestamps) {
                m[timestamps.createdAt] = this.#knex.fn.now();
                m[timestamps.updatedAt] = this.#knex.fn.now();
            }
            mapped.push(m);
        }

        const rows = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        const results = rows.map((row: any) => this.#mapRow(row) as TResult);

        // Run afterInsert hooks
        const afterHooks =
            ((this.#localSchema as any).getExtension?.('afterInsert') as
                | Function[]
                | undefined) ?? [];
        for (const result of results) {
            for (const hook of afterHooks) {
                await hook(result);
            }
        }

        return results;
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
        let processedData = { ...(data as Record<string, any>) };

        // Run beforeUpdate hooks
        const beforeHooks =
            ((this.#localSchema as any).getExtension?.('beforeUpdate') as
                | Function[]
                | undefined) ?? [];
        for (const hook of beforeHooks) {
            processedData = (await hook(processedData)) ?? processedData;
        }

        const mapped = this.#mapObjectToColumns(processedData);

        // Apply timestamps
        const timestamps = this.#getTimestamps();
        if (timestamps) {
            mapped[timestamps.updatedAt] = this.#knex.fn.now();
        }

        const rows = await this.#baseQuery.update(mapped).returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    /**
     * Delete all rows that match the current `WHERE` clause.
     *
     * If the schema has soft-delete enabled via `.softDelete()`, this performs
     * an `UPDATE SET deleted_at = NOW()` instead of a real `DELETE`.
     * Use {@link hardDelete} for permanent deletion.
     *
     * @returns The number of rows deleted (or soft-deleted).
     *
     * @example
     * ```ts
     * const count = await query(db, UserSchema).where(t => t.id, id).delete();
     * ```
     */
    async delete(): Promise<number> {
        // Run beforeDelete hooks
        const hooks =
            ((this.#localSchema as any).getExtension?.('beforeDelete') as
                | Function[]
                | undefined) ?? [];
        for (const hook of hooks) {
            await hook(this);
        }

        const softDelete = this.#getSoftDelete();
        if (softDelete) {
            return this.#baseQuery.update({
                [softDelete.column]: this.#knex.fn.now()
            });
        }
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
    // Transaction support
    // =======================================================================

    /**
     * Bind this query builder to a Knex transaction.
     *
     * Returns a **new** builder that runs all operations — SELECT, INSERT,
     * UPDATE, DELETE, and eager-loaded sub-queries — within the given
     * transaction. The original builder is left unchanged.
     *
     * Use this when you already have a transaction obtained from
     * `knex.transaction()` and want all operations performed by the returned
     * builder to participate in that transaction.
     *
     * @param trx - The Knex transaction obtained from `knex.transaction()`.
     * @returns A new {@link SchemaQueryBuilder} bound to the transaction.
     *
     * @example
     * ```ts
     * async function createUser(
     *     data: InsertType<typeof UserSchema>,
     *     trx: Knex.Transaction
     * ) {
     *     return query(db, UserSchema).transacting(trx).insert(data);
     * }
     *
     * await db.transaction(async trx => {
     *     const user = await createUser({ name: 'Alice' }, trx);
     *     await query(db, PostSchema).transacting(trx).insert({ authorId: user.id, title: 'Hello' });
     * });
     * ```
     */
    transacting(
        trx: Knex.Transaction
    ): SchemaQueryBuilder<TLocalSchema, TResult> {
        const builder = new SchemaQueryBuilder<TLocalSchema, TResult>(
            trx as unknown as Knex,
            this.#localSchema,
            this.#baseQuery.clone().transacting(trx)
        );
        for (const spec of this.#specs) {
            builder.#specs.push({
                ...spec,
                foreignQuery: spec.foreignQuery.clone().transacting(trx)
            });
        }
        builder.#explicitSelects = this.#explicitSelects
            ? [...this.#explicitSelects]
            : null;
        builder.#selectionMode = this.#selectionMode;
        builder.#appliedProjection = this.#appliedProjection;
        builder.#includeDeleted = this.#includeDeleted;
        builder.#onlyDeleted = this.#onlyDeleted;
        builder.#skipDefaultScope = this.#skipDefaultScope;
        return builder;
    }

    // =======================================================================
    // Include (relation-based eager loading)
    // =======================================================================

    /**
     * Eager-load a named relation defined via `.hasMany()`, `.belongsTo()`,
     * `.hasOne()`, or `.belongsToMany()` on the schema.
     *
     * @param relationName - The relation name passed to the schema's relation method.
     * @param customize - Optional callback to customise the foreign query
     *   (e.g. add ordering, limits).
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * const posts = await query(db, PostWithRelations)
     *     .include('author')
     *     .include('tags');
     * ```
     */
    include(
        relationName: string,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): this {
        const relations: RelationSpec[] =
            (this.#localSchema as any).getExtension?.('relations') ?? [];
        const relation = relations.find(
            (r: RelationSpec) => r.name === relationName
        );
        if (!relation) {
            throw new Error(
                `Unknown relation "${relationName}" on schema for table "${this.#tableName}"`
            );
        }

        const foreignSchema = this.#resolveSchema(relation.schema);
        const foreignTableName = getTableName(foreignSchema);

        switch (relation.type) {
            case 'belongsTo': {
                const localColumn = resolveColumnRef(
                    relation.foreignKey,
                    this.#localSchema,
                    'foreignKey'
                );
                const foreignColumn = this.#findPrimaryKeyColumn(foreignSchema);

                const foreignQuery1: Knex.QueryBuilder =
                    this.#knex(foreignTableName);
                if (customize) {
                    const proxy = new SchemaQueryBuilder(
                        this.#knex,
                        foreignSchema,
                        foreignQuery1
                    );
                    customize(proxy);
                }

                this.joinOne({
                    foreignSchema,
                    localColumn,
                    foreignColumn,
                    as: relationName,
                    foreignQuery: foreignQuery1
                } as any);
                break;
            }
            case 'hasOne': {
                const localColumn = this.#findPrimaryKeyColumn(
                    this.#localSchema
                );
                const foreignColumn = resolveColumnRef(
                    relation.foreignKey,
                    foreignSchema,
                    'foreignKey'
                );

                const foreignQuery2: Knex.QueryBuilder =
                    this.#knex(foreignTableName);
                if (customize) {
                    const proxy = new SchemaQueryBuilder(
                        this.#knex,
                        foreignSchema,
                        foreignQuery2
                    );
                    customize(proxy);
                }

                this.joinOne({
                    foreignSchema,
                    localColumn,
                    foreignColumn,
                    as: relationName,
                    required: false,
                    foreignQuery: foreignQuery2
                } as any);
                break;
            }
            case 'hasMany': {
                const localColumn = this.#findPrimaryKeyColumn(
                    this.#localSchema
                );
                const foreignColumn = resolveColumnRef(
                    relation.foreignKey,
                    foreignSchema,
                    'foreignKey'
                );

                const foreignQuery3: Knex.QueryBuilder =
                    this.#knex(foreignTableName);
                if (customize) {
                    const proxy = new SchemaQueryBuilder(
                        this.#knex,
                        foreignSchema,
                        foreignQuery3
                    );
                    customize(proxy);
                }

                this.joinMany({
                    foreignSchema,
                    localColumn,
                    foreignColumn,
                    as: relationName,
                    foreignQuery: foreignQuery3
                } as any);
                break;
            }
            case 'belongsToMany': {
                const through = relation.through!;
                const localColumn = this.#findPrimaryKeyColumn(
                    this.#localSchema
                );

                const foreignQuery = this.#knex(foreignTableName)
                    .join(
                        through.table,
                        `${through.table}.${through.foreignKey}`,
                        `${foreignTableName}.${this.#findPrimaryKeyColumn(foreignSchema)}`
                    )
                    .select(
                        `${foreignTableName}.*`,
                        `${through.table}.${through.localKey}`
                    );

                if (customize) {
                    const proxy = new SchemaQueryBuilder(
                        this.#knex,
                        foreignSchema,
                        foreignQuery
                    );
                    customize(proxy);
                }

                this.joinMany({
                    foreignSchema,
                    localColumn,
                    foreignColumn: through.localKey,
                    as: relationName,
                    foreignQuery
                } as any);
                break;
            }
        }

        return this;
    }

    // =======================================================================
    // Scopes
    // =======================================================================

    /**
     * Apply a named scope defined on the schema via `.scope(name, fn)`.
     *
     * The `name` parameter is constrained to the literal scope names registered
     * on the schema, so IDEs show only valid completions and typos are caught
     * at compile time.
     *
     * @param name - The scope name.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * await query(db, Post).scoped('published').scoped('recent');
     * ```
     */
    /**
     * Apply a **named projection** defined on the schema via
     * `.projection(name, columns)`.
     *
     * Calling `.projected()` on the query builder does two things:
     * 1. Restricts the SQL `SELECT` clause to the columns registered under
     *    `name` (SQL column names are resolved via `.hasColumnName()`).
     * 2. Narrows the TypeScript result row type to `Pick<Row, Keys>` so
     *    accessing columns outside the projection is a compile-time error.
     *
     * The `name` parameter is constrained to the literal projection names
     * registered on the schema — TypeScript will report an error for any
     * unregistered name.
     *
     * Calling `.projected()` after `.select()`, any aggregate method
     * (`.count()`, `.min()`, etc.), or a second `.projected()` call throws
     * at runtime with a clear error message.
     *
     * @param name - The projection name.
     * @returns A new builder whose result type is `Pick<Row, ProjectionKeys>`.
     *
     * @example
     * ```ts
     * const PostSchema = object({ id: number(), title: string(), body: string() })
     *   .hasTableName('posts')
     *   .projection('summary', 'id', 'title');
     *
     * const rows = await query(db, PostSchema)
     *   .scoped('published')
     *   .projected('summary');
     * // rows: Array<Pick<Post, 'id' | 'title'>>
     * // rows[0].body  // ← TS error: not in projection
     * ```
     *
     * @see {@link ddlExtension} `.projection()` for schema-side definition.
     */
    projected<K extends keyof ProjectionsOf<TLocalSchema> & string>(
        name: K
    ): SchemaQueryBuilder<
        TLocalSchema,
        Pick<TResult, ProjectionKeysOf<TLocalSchema, K> & keyof TResult>
    > {
        this.#assertNotExplicitSelect('projected');
        if (this.#selectionMode === 'projection') {
            throw new Error(
                `Cannot call .projected('${name}') — .projected('${
                    this.#appliedProjection
                }') was already applied. Only one projection per query.`
            );
        }
        const projections = getProjections(this.#localSchema as any);
        const projection = projections[name];
        if (!projection) {
            throw new Error(
                `Unknown projection "${name}" on schema for table "${
                    this.#tableName
                }"`
            );
        }
        // Translate property keys → SQL column names
        const { propToCol } = buildColumnMap(this.#localSchema as any);
        const sqlCols = projection.keys.map(key => propToCol.get(key) ?? key);
        this.#baseQuery.select(...sqlCols);
        this.#explicitSelects ??= [];
        for (const col of sqlCols) {
            this.#explicitSelects.push(col);
        }
        this.#selectionMode = 'projection';
        this.#appliedProjection = name;
        return this as any;
    }

    scoped<K extends ScopesOf<TLocalSchema>>(name: K): this {
        const scopes = (this.#localSchema as any).getExtension?.('scopes') as
            | Record<string, Function>
            | undefined;
        const scopeFn = scopes?.[name];
        if (!scopeFn) {
            throw new Error(
                `Unknown scope "${name}" on schema for table "${this.#tableName}"`
            );
        }
        scopeFn(this);
        return this;
    }

    /**
     * Bypass the default scope (and soft-delete scope) for this query.
     *
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * await query(db, Post).unscoped().where(t => t.id, 1);
     * ```
     */
    unscoped(): this {
        this.#skipDefaultScope = true;
        this.#includeDeleted = true;
        return this;
    }

    // =======================================================================
    // Soft delete methods
    // =======================================================================

    /**
     * Include soft-deleted rows in the results.
     *
     * By default, schemas with `.softDelete()` automatically filter out
     * rows where `deleted_at IS NOT NULL`. Call `.withDeleted()` to
     * include them.
     *
     * @returns `this` for chaining.
     */
    withDeleted(): this {
        this.#includeDeleted = true;
        return this;
    }

    /**
     * Return only soft-deleted rows (`WHERE deleted_at IS NOT NULL`).
     *
     * @returns `this` for chaining.
     */
    onlyDeleted(): this {
        this.#onlyDeleted = true;
        this.#includeDeleted = true;
        return this;
    }

    /**
     * Permanently delete rows matching the current WHERE clause, bypassing
     * the soft-delete mechanism.
     *
     * @returns The number of rows deleted.
     */
    async hardDelete(): Promise<number> {
        // Run beforeDelete hooks
        const hooks =
            ((this.#localSchema as any).getExtension?.('beforeDelete') as
                | Function[]
                | undefined) ?? [];
        for (const hook of hooks) {
            await hook(this);
        }
        return this.#baseQuery.delete();
    }

    /**
     * Restore soft-deleted rows by setting `deleted_at = NULL`.
     *
     * @returns The restored rows.
     */
    async restore(): Promise<TResult[]> {
        const softDelete = this.#getSoftDelete();
        if (!softDelete) {
            throw new Error(
                'Schema does not have soft delete enabled. Use .softDelete() on the schema.'
            );
        }
        const rows = await this.#baseQuery
            .update({ [softDelete.column]: null })
            .returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    // =======================================================================
    // Pagination
    // =======================================================================

    /**
     * Execute an offset-based paginated query.
     *
     * Runs a count query and a data query in parallel. Returns the page data
     * along with pagination metadata.
     *
     * @param opts - `{ page, pageSize }` — 1-based page number and page size.
     * @returns A {@link PaginationResult} with data, total count, and page info.
     *
     * @example
     * ```ts
     * const page = await query(db, Post)
     *     .where(t => t.status, 'published')
     *     .paginate({ page: 2, pageSize: 20 });
     * // page.data, page.total, page.totalPages, page.hasNextPage, ...
     * ```
     */
    async paginate(opts: {
        page: number;
        pageSize: number;
    }): Promise<PaginationResult<TResult>> {
        const { page, pageSize } = opts;

        const effectiveBase = this.#getEffectiveBaseQuery();

        // Count query (no CTE, no ordering, no eager loading)
        const countResult = await effectiveBase
            .clone()
            .clearSelect()
            .clearOrder()
            .count('* as count')
            .first();
        const total = Number((countResult as any)?.count ?? 0);

        // Data query (with CTE for eager loading)
        this.limit(pageSize).offset((page - 1) * pageSize);
        const data = await this.execute();

        const totalPages = Math.ceil(total / pageSize);

        return {
            data,
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        };
    }

    /**
     * Execute a cursor-based (keyset) paginated query.
     *
     * More efficient than offset pagination for large datasets. Fetches one
     * extra row to determine whether more data exists.
     *
     * @param opts - `{ cursor, limit, column?, direction? }`.
     * @returns A {@link CursorPaginationResult} with data, next cursor, and
     *   `hasMore` flag.
     *
     * @example
     * ```ts
     * const page = await query(db, Post)
     *     .orderBy(t => t.createdAt, 'desc')
     *     .paginateAfter({ cursor: lastCreatedAt, limit: 20 });
     * ```
     */
    async paginateAfter(opts: {
        cursor?: any;
        limit: number;
        column?: ColumnRef<TLocalSchema>;
        direction?: 'asc' | 'desc';
    }): Promise<CursorPaginationResult<TResult>> {
        const direction = opts.direction ?? 'desc';
        const column = opts.column ?? ('id' as any);

        if (opts.cursor != null) {
            const op = direction === 'desc' ? '<' : '>';
            this.where(column, op, opts.cursor);
        }

        this.orderBy(column, direction).limit(opts.limit + 1);
        const rows = await this.execute();

        const hasMore = rows.length > opts.limit;
        const data = hasMore ? rows.slice(0, opts.limit) : rows;

        const propKey =
            typeof column === 'string'
                ? column
                : resolvePropertyKey(
                      column as any,
                      this.#localSchema,
                      'cursor'
                  );

        const nextCursor =
            hasMore && data.length > 0
                ? String((data[data.length - 1] as any)[propKey])
                : null;

        return { data, nextCursor, hasMore };
    }

    // =======================================================================
    // Select Raw
    // =======================================================================

    /**
     * Add a raw SQL expression to the SELECT clause.
     *
     * @param sql - Raw SQL (e.g. `'*, ts_rank(vector, query) AS rank'`).
     * @param bindings - Optional parameter bindings.
     * @returns `this` for chaining.
     */
    selectRaw(sql: string, bindings?: any[]): this {
        if (bindings) {
            this.#baseQuery.select(this.#knex.raw(sql, bindings));
        } else {
            this.#baseQuery.select(this.#knex.raw(sql));
        }
        return this;
    }

    // =======================================================================
    // CTE-based eager loading query building (from knex-eager)
    // =======================================================================

    #buildQuery(): Knex.QueryBuilder {
        const effectiveBase = this.#getEffectiveBaseQuery();

        if (this.#specs.length === 0) {
            return effectiveBase;
        }

        const knex = this.#knex;
        const specs = this.#specs;

        // Collect all localColumns needed for CTE joins
        const requiredLocalColumns = [
            ...new Set(specs.map(s => s.localColumn))
        ];

        // If the caller used .select(...), some localColumns may have been
        // omitted. Clone the base query and ensure those columns are always
        // included in the CTE so the join conditions work at runtime.
        // Track which columns we added so they can be excluded from the
        // final SELECT (preserving the original column set the caller asked for).
        let cteQuery = effectiveBase;
        let extraColumns: string[] = [];

        if (this.#explicitSelects !== null) {
            const selectedSet = new Set(this.#explicitSelects);
            extraColumns = requiredLocalColumns.filter(
                col => !selectedSet.has(col)
            );
            if (extraColumns.length > 0) {
                cteQuery = effectiveBase.clone();
                for (const col of extraColumns) {
                    cteQuery.column(col);
                }
            }
        }

        // Build the outer query that wraps the CTE.
        // When we added extra columns, select only the original columns + joined
        // aliases (instead of originalQuery.*) so the caller's column set is
        // preserved in the final result.
        const resultQuery = knex.queryBuilder().with('originalQuery', cteQuery);

        if (extraColumns.length > 0 && this.#explicitSelects !== null) {
            // Explicit column list: original user selections only
            for (const col of this.#explicitSelects) {
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
    /**
     * Return a version of this bound factory whose queries all run within the
     * given Knex transaction. Equivalent to calling `.transacting(trx)` on
     * each individual builder, but more convenient when every query in a block
     * must share the same transaction.
     *
     * @example
     * ```ts
     * const db = createQuery(knex);
     *
     * await knex.transaction(async trx => {
     *     const dbTrx = db.withTransaction(trx);
     *     const user = await dbTrx(UserSchema).insert({ name: 'Alice' });
     *     await dbTrx(PostSchema).insert({ authorId: user.id, title: 'Hello' });
     * });
     * ```
     */
    withTransaction(trx: Knex.Transaction): BoundQuery;
    /**
     * Start a Knex transaction and run `callback` inside it, passing a
     * transaction-bound `BoundQuery` factory as the argument. The transaction
     * is committed when the callback resolves and rolled back if it rejects.
     *
     * This is the callback-style counterpart to {@link withTransaction} — you
     * don't need to obtain a `Knex.Transaction` object yourself.
     *
     * @param callback - An async function that receives a transaction-bound
     *   `BoundQuery` and returns a value. The returned value is forwarded as
     *   the resolved value of the outer `Promise`.
     * @returns A `Promise` that resolves with the value returned by `callback`.
     *
     * @example
     * ```ts
     * const db = createQuery(knex);
     *
     * const user = await db.transaction(async dbTrx => {
     *     const newUser = await dbTrx(UserSchema).insert({ name: 'Alice' });
     *     await dbTrx(PostSchema).insert({ authorId: newUser.id, title: 'Hello' });
     *     return newUser;
     * });
     * ```
     */
    transaction<T>(callback: (db: BoundQuery) => Promise<T>): Promise<T>;
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
    ): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>> {
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
