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
            .with(
                'originalQueryIdentity',
                knex
                    .from('originalQuery')
                    .select([
                        knex.raw('row_number() over () as row_number'),
                        'originalQuery.*'
                    ])
            )
            .select('originalQueryIdentity.*')
            .from(
                knex.raw(':originalQueryIdentity:', {
                    originalQueryIdentity: 'originalQueryIdentity'
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

        resultQuery.select(
            knex.raw(
                'CASE WHEN NULLIF(:relationAlias:.:as:, NULL) is NULL THEN NULL ELSE :relationAlias:.:as:->0 END as :as:',
                { relationAlias, as: spec.as }
            )
        );

        const subquery = knex
            .from(foreignTable.as(foreignTableName))
            .select(
                knex.raw(
                    'row_number() over(partition by :foreignTable:.:foreignColumn:) as "rn"',
                    {
                        foreignTable: foreignTableName,
                        foreignColumn: spec.foreignColumn
                    }
                )
            )
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
                    ':relationAlias:.:foreignColumn: = :originalQueryIdentity:.:localColumn: and :relationAlias:."rn" = 1',
                    {
                        originalQueryIdentity: 'originalQueryIdentity',
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

        const orderByColumn = spec.orderBy
            ? spec.orderBy.column
            : spec.foreignColumn;
        const orderByDirection = spec.orderBy ? spec.orderBy.direction : 'asc';

        const innerRelation = knex
            .from(
                knex
                    .from(filterName)
                    .select(
                        knex.raw(
                            `row_number() over(partition by :foreignColumn: order by :order_by_column: ${orderByDirection}) as "row_number"`,
                            {
                                foreignColumn: spec.foreignColumn,
                                order_by_column: orderByColumn
                            }
                        )
                    )
                    .select(`${filterName}.*`)
                    .orderBy(
                        knex.raw(':row_number:', { row_number: 'row_number' }),
                        'desc'
                    )
                    .as(`inner${i}`)
            )
            .select(knex.raw(':inner:.*', { inner: `inner${i}` }))
            .orderBy(knex.raw(':row_number:', { row_number: 'row_number' }))
            .as(`${relationAlias}Outer`);

        if (
            (spec.limit !== null && spec.limit > 0) ||
            (spec.offset !== null && spec.offset > 0)
        ) {
            const hasLimit = spec.limit !== null && spec.limit > 0;
            const hasOffset = spec.offset !== null && spec.offset > 0;
            const effectiveOffset = spec.offset ?? 0;
            const effectiveLimit = effectiveOffset + (spec.limit ?? 0);

            const condition =
                hasLimit && hasOffset
                    ? ':innerTable:.:row_number: > :offset and :innerTable:.:row_number: <= :limit'
                    : hasLimit
                      ? ':innerTable:.:row_number: <= :limit'
                      : ':innerTable:.:row_number: > :offset';

            innerRelation.whereRaw(condition, {
                limit: effectiveLimit,
                offset: effectiveOffset,
                row_number: 'row_number',
                innerTable: `inner${i}`
            });
        }

        const relation = knex
            .from(
                knex.raw(':originalQueryIdentity:', {
                    originalQueryIdentity: 'originalQueryIdentity'
                })
            )
            .select(
                knex.raw(':originalQueryIdentity:.:row_number:', {
                    originalQueryIdentity: 'originalQueryIdentity',
                    row_number: 'row_number'
                })
            )
            .select(
                knex.raw(
                    "coalesce(jsonb_agg(:foreignTable: order by :foreignTable:.:row_number:),'[]'::jsonb) as :as:",
                    {
                        row_number: 'row_number',
                        foreignTable: `${relationAlias}Outer`,
                        as: spec.as
                    }
                )
            )
            .leftJoin(innerRelation, function () {
                this.on(
                    knex.raw(
                        ':innerTable:.:foreignColumn: = :outerTable:.:localColumn:',
                        {
                            innerTable: `${relationAlias}Outer`,
                            foreignColumn: spec.foreignColumn,
                            outerTable: 'originalQueryIdentity',
                            localColumn: spec.localColumn
                        }
                    )
                );
            })
            .groupByRaw(':originalQueryIdentity:.:row_number:', {
                originalQueryIdentity: 'originalQueryIdentity',
                row_number: 'row_number'
            })
            .as(relationAlias);

        resultQuery.with(
            filterName,
            spec.foreignQuery.clone().whereIn(
                spec.foreignColumn,
                knex
                    .from(
                        knex.raw(':originalQueryIdentity:', {
                            originalQueryIdentity: 'originalQueryIdentity'
                        })
                    )
                    .distinct(spec.localColumn)
            )
        );

        resultQuery.select(
            knex.raw(
                "case when jsonb_array_length(:relationAlias:.:as:) = 1 and :relationAlias:.:as:->0 = :null then '[]'::jsonb else :relationAlias:.:as: end as :as:",
                { null: 'null', relationAlias, as: spec.as }
            )
        );

        resultQuery.join(relation, function () {
            this.on(
                knex.raw(
                    ':relationAlias:.:row_number: = :originalQueryIdentity:.:row_number:',
                    {
                        originalQueryIdentity: 'originalQueryIdentity',
                        relationAlias,
                        row_number: 'row_number'
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
