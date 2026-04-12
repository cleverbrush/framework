import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { clearRow } from './mappers.js';
import type {
    JoinManySpec,
    JoinOneSpec,
    SchemaKeys,
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
// RelationBuilder — wraps a Knex QueryBuilder, accumulates eager-load specs,
// and forwards standard Knex methods for seamless chaining.
//
// Usage:
//   withRelations(knex, 'users', userSchema)
//       .where('active', true)
//       .joinOne({ ... })
//       .orderBy('name')
//       .joinMany({ ... })
//       .execute()
// ---------------------------------------------------------------------------
export class RelationBuilder<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TResult
> {
    readonly #knex: Knex;
    readonly #baseQuery: Knex.QueryBuilder;
    readonly #localSchema: TLocalSchema;
    readonly #specs: ValidatedSpec[] = [];

    constructor(
        knex: Knex,
        baseQuery: Knex.QueryBuilder,
        localSchema: TLocalSchema
    ) {
        this.#knex = knex;
        this.#baseQuery = baseQuery;
        this.#localSchema = localSchema;
    }

    // =======================================================================
    // Relation methods — return `this` with expanded result type
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
    ): RelationBuilder<
        TLocalSchema,
        WithJoinedOne<TResult, TFieldName, TForeignSchema, TRequired>
    > {
        const validated = validateJoinOne(spec, this.#localSchema);
        this.#specs.push({ type: 'one' as const, ...validated });
        validateUniqueFieldNames(this.#specs);
        return this as any;
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
    ): RelationBuilder<
        TLocalSchema,
        WithJoinedMany<TResult, TFieldName, TForeignSchema>
    > {
        const validated = validateJoinMany(spec, this.#localSchema);
        this.#specs.push({ type: 'many' as const, ...validated });
        validateUniqueFieldNames(this.#specs);
        return this as any;
    }

    // =======================================================================
    // Forwarded Knex methods — modify the base query, return `this`
    // =======================================================================

    where(
        columnOrRaw:
            | SchemaKeys<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        (this.#baseQuery.where as any)(columnOrRaw, ...args);
        return this;
    }

    andWhere(
        columnOrRaw:
            | SchemaKeys<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        (this.#baseQuery.andWhere as any)(columnOrRaw, ...args);
        return this;
    }

    orWhere(
        columnOrRaw:
            | SchemaKeys<TLocalSchema>
            | Knex.Raw
            | Record<string, any>
            | ((builder: Knex.QueryBuilder) => void),
        ...args: any[]
    ): this {
        (this.#baseQuery.orWhere as any)(columnOrRaw, ...args);
        return this;
    }

    whereIn(
        column: SchemaKeys<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        this.#baseQuery.whereIn(column, values as any);
        return this;
    }

    whereNotIn(
        column: SchemaKeys<TLocalSchema>,
        values: readonly any[] | Knex.QueryBuilder
    ): this {
        this.#baseQuery.whereNotIn(column, values as any);
        return this;
    }

    whereNull(column: SchemaKeys<TLocalSchema>): this {
        this.#baseQuery.whereNull(column);
        return this;
    }

    whereNotNull(column: SchemaKeys<TLocalSchema>): this {
        this.#baseQuery.whereNotNull(column);
        return this;
    }

    whereBetween(
        column: SchemaKeys<TLocalSchema>,
        range: readonly [any, any]
    ): this {
        this.#baseQuery.whereBetween(column, range as [any, any]);
        return this;
    }

    whereRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.whereRaw(sql, ...bindings);
        return this;
    }

    whereExists(callback: Knex.QueryCallback | Knex.QueryBuilder): this {
        this.#baseQuery.whereExists(callback as any);
        return this;
    }

    orderBy(
        column: SchemaKeys<TLocalSchema> | Knex.Raw,
        direction?: 'asc' | 'desc'
    ): this {
        this.#baseQuery.orderBy(column as string, direction);
        return this;
    }

    orderByRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.orderByRaw(sql, ...bindings);
        return this;
    }

    groupBy(...columns: (SchemaKeys<TLocalSchema> | Knex.Raw)[]): this {
        this.#baseQuery.groupBy(...(columns as string[]));
        return this;
    }

    having(
        column: SchemaKeys<TLocalSchema> | Knex.Raw,
        operator: string,
        value: any
    ): this {
        this.#baseQuery.having(column as string, operator, value);
        return this;
    }

    havingRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.havingRaw(sql, ...bindings);
        return this;
    }

    limit(n: number): this {
        this.#baseQuery.limit(n);
        return this;
    }

    offset(n: number): this {
        this.#baseQuery.offset(n);
        return this;
    }

    distinct(...columns: (SchemaKeys<TLocalSchema> | Knex.Raw)[]): this {
        this.#baseQuery.distinct(...(columns as string[]));
        return this;
    }

    select(...columns: (SchemaKeys<TLocalSchema> | Knex.Raw)[]): this {
        this.#baseQuery.select(...(columns as string[]));
        return this;
    }

    /** Escape hatch: apply any Knex method to the base query */
    apply(fn: (builder: Knex.QueryBuilder) => void): this {
        fn(this.#baseQuery);
        return this;
    }

    // =======================================================================
    // Build the CTE-based SQL query
    // =======================================================================

    #buildQuery(): Knex.QueryBuilder {
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
                this.#buildJoinOne(resultQuery, spec, relationAlias, i);
            } else {
                this.#buildJoinMany(resultQuery, spec, relationAlias, i);
            }
        }

        return resultQuery;
    }

    #buildJoinOne(
        resultQuery: Knex.QueryBuilder,
        spec: ValidatedSpec & { type: 'one' },
        relationAlias: string,
        _index: number
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

        // SELECT: extract the first (only) element from the jsonb array
        resultQuery.select(
            knex.raw(':relationAlias:.:as:->0 as :as:', {
                relationAlias,
                as: spec.as
            })
        );

        // Subquery: aggregate foreign rows into a jsonb array grouped by join column
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

        // -- CTE: withFilterN — clone the foreign query filtered to matching local keys
        if (hasLimitOffset) {
            // With limit/offset: add row_number for per-group pagination
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
            // Without limit/offset: simple filtered CTE
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

        // -- Aggregation subquery: group by foreign key, produce jsonb array
        const aggSubquery = knex.from(filterName);

        if (hasLimitOffset) {
            // Apply limit/offset filter on __rn__
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

            // Aggregate with to_jsonb() - '__rn__' to strip internal column, ordered by __rn__
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
            // Simple aggregation — optionally ordered
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

        // -- SELECT the aggregated array column
        resultQuery.select(
            knex.raw("coalesce(:relationAlias:.:as:, '[]'::jsonb) as :as:", {
                relationAlias,
                as: spec.as
            })
        );

        // -- LEFT JOIN on the actual foreign key
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
    // Execution
    // =======================================================================

    /** Returns the raw SQL string for debugging */
    toQuery(): string {
        return this.#buildQuery().toQuery();
    }

    /** Returns the raw SQL string */
    toString(): string {
        return this.#buildQuery().toString();
    }

    /** Execute the query and return all rows */
    async execute(): Promise<TResult[]> {
        const query = this.#buildQuery();
        const rows = await query;

        if (!rows) return [];
        if (!Array.isArray(rows)) return [this.#cleanRow(rows)] as TResult[];

        return rows.map((row: any) => this.#cleanRow(row)) as TResult[];
    }

    /** Execute the query and return the first row (or undefined) */
    async first(): Promise<TResult | undefined> {
        const query = this.#buildQuery().first();
        const row = await query;

        if (!row) return undefined;
        return this.#cleanRow(row) as TResult;
    }

    /** Thenable — allows `await withRelations(...)` directly */
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable for `await builder` support
    then<TReturn1 = TResult[], TReturn2 = never>(
        onfulfilled?:
            | ((value: TResult[]) => TReturn1 | PromiseLike<TReturn1>)
            | null,
        onrejected?: ((reason: any) => TReturn2 | PromiseLike<TReturn2>) | null
    ): Promise<TReturn1 | TReturn2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    #cleanRow(row: Record<string, any>): Record<string, any> {
        const oneSpecs = this.#specs.filter(
            (s): s is ValidatedSpec & { type: 'one' } => s.type === 'one'
        );
        const manySpecs = this.#specs.filter(
            (s): s is ValidatedSpec & { type: 'many' } => s.type === 'many'
        );
        return clearRow(row, oneSpecs, manySpecs);
    }
}

// ---------------------------------------------------------------------------
// withRelations — entry point
// ---------------------------------------------------------------------------

/** Create a typed eager-loading query from a table name */
export function withRelations<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    table: string,
    schema: TLocalSchema
): RelationBuilder<TLocalSchema, InferType<TLocalSchema>>;

/** Create a typed eager-loading query from an existing Knex query builder */
export function withRelations<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    query: Knex.QueryBuilder,
    schema: TLocalSchema
): RelationBuilder<TLocalSchema, InferType<TLocalSchema>>;

export function withRelations<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    tableOrQuery: string | Knex.QueryBuilder,
    schema: TLocalSchema
): RelationBuilder<TLocalSchema, InferType<TLocalSchema>> {
    const baseQuery =
        typeof tableOrQuery === 'string' ? knex(tableOrQuery) : tableOrQuery;
    return new RelationBuilder<TLocalSchema, InferType<TLocalSchema>>(
        knex,
        baseQuery,
        schema
    );
}
