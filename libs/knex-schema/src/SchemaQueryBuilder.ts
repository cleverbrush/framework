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

export class SchemaQueryBuilder<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TResult
> {
    readonly #knex: Knex;
    readonly #baseQuery: Knex.QueryBuilder;
    readonly #localSchema: TLocalSchema;
    readonly #specs: ValidatedSpec[] = [];
    readonly #tableName: string;

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

    whereNull(column: ColumnRef<TLocalSchema>): this {
        this.#baseQuery.whereNull(this.#resolveColumn(column, 'whereNull'));
        return this;
    }

    whereNotNull(column: ColumnRef<TLocalSchema>): this {
        this.#baseQuery.whereNotNull(
            this.#resolveColumn(column, 'whereNotNull')
        );
        return this;
    }

    orWhereNull(column: ColumnRef<TLocalSchema>): this {
        (this.#baseQuery as any).orWhereNull(
            this.#resolveColumn(column, 'orWhereNull')
        );
        return this;
    }

    orWhereNotNull(column: ColumnRef<TLocalSchema>): this {
        (this.#baseQuery as any).orWhereNotNull(
            this.#resolveColumn(column, 'orWhereNotNull')
        );
        return this;
    }

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

    whereLike(column: ColumnRef<TLocalSchema>, value: string): this {
        (this.#baseQuery as any).whereLike(
            this.#resolveColumn(column, 'whereLike'),
            value
        );
        return this;
    }

    whereILike(column: ColumnRef<TLocalSchema>, value: string): this {
        (this.#baseQuery as any).whereILike(
            this.#resolveColumn(column, 'whereILike'),
            value
        );
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

    // =======================================================================
    // ORDER BY
    // =======================================================================

    orderBy(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        direction?: 'asc' | 'desc'
    ): this {
        const col = this.#resolveColumnArg(column);
        this.#baseQuery.orderBy(col as string, direction);
        return this;
    }

    orderByRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.orderByRaw(sql, ...bindings);
        return this;
    }

    // =======================================================================
    // GROUP BY / HAVING
    // =======================================================================

    groupBy(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.groupBy(...(resolved as string[]));
        return this;
    }

    groupByRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.groupByRaw(sql, ...bindings);
        return this;
    }

    having(
        column: ColumnRef<TLocalSchema> | Knex.Raw,
        operator: string,
        value: any
    ): this {
        const col = this.#resolveColumnArg(column);
        this.#baseQuery.having(col as string, operator, value);
        return this;
    }

    havingRaw(sql: string, ...bindings: any[]): this {
        this.#baseQuery.havingRaw(sql, ...bindings);
        return this;
    }

    // =======================================================================
    // PAGINATION
    // =======================================================================

    limit(n: number): this {
        this.#baseQuery.limit(n);
        return this;
    }

    offset(n: number): this {
        this.#baseQuery.offset(n);
        return this;
    }

    // =======================================================================
    // SELECT / DISTINCT
    // =======================================================================

    select(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.select(...(resolved as string[]));
        return this;
    }

    distinct(...columns: (ColumnRef<TLocalSchema> | Knex.Raw)[]): this {
        const resolved = columns.map(c => this.#resolveColumnArg(c));
        this.#baseQuery.distinct(...(resolved as string[]));
        return this;
    }

    // =======================================================================
    // AGGREGATES
    // =======================================================================

    count(column?: ColumnRef<TLocalSchema> | Knex.Raw): this {
        if (column) {
            this.#baseQuery.count(this.#resolveColumnArg(column) as string);
        } else {
            this.#baseQuery.count();
        }
        return this;
    }

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

    min(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.min(this.#resolveColumnArg(column) as string);
        return this;
    }

    max(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.max(this.#resolveColumnArg(column) as string);
        return this;
    }

    sum(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.sum(this.#resolveColumnArg(column) as string);
        return this;
    }

    avg(column: ColumnRef<TLocalSchema> | Knex.Raw): this {
        this.#baseQuery.avg(this.#resolveColumnArg(column) as string);
        return this;
    }

    // =======================================================================
    // WRITE OPERATIONS
    // =======================================================================

    async insert(data: InsertType<TLocalSchema>): Promise<TResult> {
        const mapped = this.#mapObjectToColumns(data as Record<string, any>);
        const [row] = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        return this.#mapRow(row) as TResult;
    }

    async insertMany(data: InsertType<TLocalSchema>[]): Promise<TResult[]> {
        const mapped = data.map(d =>
            this.#mapObjectToColumns(d as Record<string, any>)
        );
        const rows = await this.#knex(this.#tableName)
            .insert(mapped)
            .returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    async update(data: Partial<InferType<TLocalSchema>>): Promise<TResult[]> {
        const mapped = this.#mapObjectToColumns(data as Record<string, any>);
        const rows = await this.#baseQuery.update(mapped).returning('*');
        return rows.map((row: any) => this.#mapRow(row) as TResult);
    }

    async delete(): Promise<number> {
        return this.#baseQuery.delete();
    }

    // =======================================================================
    // ESCAPE HATCH
    // =======================================================================

    /** Escape hatch: apply any Knex method to the base query */
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
        if (!Array.isArray(rows))
            return [this.#cleanAndMapRow(rows)] as TResult[];

        return rows.map((row: any) => this.#cleanAndMapRow(row)) as TResult[];
    }

    /** Execute the query and return the first row (or undefined) */
    async first(): Promise<TResult | undefined> {
        const query = this.#buildQuery().first();
        const row = await query;

        if (!row) return undefined;
        return this.#cleanAndMapRow(row) as TResult;
    }

    /** Thenable — allows `await query(knex, schema)` directly */
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

/** Create a typed schema query builder */
export function query<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TLocalSchema
): SchemaQueryBuilder<TLocalSchema, InferType<TLocalSchema>>;

/** Create a typed schema query builder from an existing Knex query */
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
