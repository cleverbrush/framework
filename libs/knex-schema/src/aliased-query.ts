import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from './columns.js';
import {
    type AggregateExpression,
    type AliasedColumn,
    COLUMN,
    compileAggregate,
    isAggregate
} from './expressions.js';
import {
    ALLOWED_OPS,
    getEffectiveBaseQuery,
    getSchemaQueryBuilderCtor
} from './operations/helpers.js';
import { isSqlIdentifier } from './sql-identifiers.js';

type TableSchema = ObjectSchemaBuilder<any, any, any, any, any, any, any>;
const ALIAS = Symbol('table-alias');
const PREDICATE = Symbol('join-predicate');

/** Immutable table identity; does not mutate the schema's column metadata. */
export interface TableAlias<S extends TableSchema, N extends string> {
    readonly [ALIAS]: true;
    /**
     * The original immutable schema used to resolve columns and read scopes.
     */
    readonly schema: S;
    /**
     * Literal SQL alias exposed as a key in joined selector callbacks.
     */
    readonly name: N;
}

/**
 * Create an immutable table identity for typed flat joins and projections.
 * The schema is not modified, so it can be joined repeatedly under different names.
 * @param schema - Source table schema, including mapped columns and read scopes.
 * @param name - Unique identifier within the query, checked by isSqlIdentifier().
 * @throws If name is not a supported single SQL identifier.
 * @example
 * const owner = alias(UserSchema, 'owner');
 */
export function alias<S extends TableSchema, const N extends string>(
    schema: S,
    name: N
): TableAlias<S, N> {
    if (!isSqlIdentifier(name)) {
        throw new Error('Table aliases must be non-empty SQL identifier names');
    }
    return Object.freeze({ [ALIAS]: true as const, schema, name });
}

/** @internal Narrow a query source without losing its schema or alias literal. */
export function isTableAlias<S extends TableSchema, N extends string>(
    value: S | TableAlias<S, N>
): value is TableAlias<S, N>;
export function isTableAlias(
    value: unknown
): value is TableAlias<TableSchema, string>;
export function isTableAlias(value: unknown): boolean {
    return !!value && typeof value === 'object' && ALIAS in value;
}

type Columns<S extends TableSchema, Nullable extends boolean = false> = {
    [K in keyof InferType<S>]-?: AliasedColumn<
        | Exclude<InferType<S>[K], undefined>
        | (undefined extends InferType<S>[K] ? null : never)
        | (Nullable extends true ? null : never)
    >;
};

/**
 * Map a literal alias to its schema columns; optional/left-joined fields include SQL null.
 */
export type AliasTables<
    S extends TableSchema,
    N extends string,
    Nullable extends boolean = false
> = Record<N, Columns<S, Nullable>>;
type Selection = Record<string, AliasedColumn<any> | AggregateExpression<any>>;
/**
 * Infer the exact selected DTO fields from aliased columns and aggregate expressions.
 */
export type JoinedProjection<S extends Selection> = {
    [K in keyof S]: S[K] extends AggregateExpression<infer T>
        ? T
        : S[K] extends AliasedColumn<infer T>
          ? T
          : never;
};

/**
 * An opaque SQL condition composed with eq(), and() and or(); never evaluated per row in JavaScript.
 */
export interface JoinPredicate {
    readonly [PREDICATE]:
        | { op: 'eq'; left: AliasedColumn<any>; right: AliasedColumn<any> }
        | { op: 'and' | 'or'; items: readonly JoinPredicate[] };
}

/** Equality between two schema-backed columns, never interpolated SQL strings. */
export function eq(
    left: AliasedColumn<any>,
    right: AliasedColumn<any>
): JoinPredicate {
    return { [PREDICATE]: { op: 'eq', left, right } };
}

/**
 * Combine one or more predicates into a parenthesized SQL AND group.
 * Groups may contain nested and()/or() calls at any depth.
 * @throws If no predicates are supplied.
 * @example
 * and(eq(t.task.ownerId, t.owner.id), or(eq(t.task.id, t.owner.id), eq(t.task.ownerId, t.owner.managerId)))
 */
export function and(...items: JoinPredicate[]): JoinPredicate {
    if (!items.length) throw new Error('and() requires at least one predicate');
    return { [PREDICATE]: { op: 'and', items } };
}

/**
 * Combine one or more predicates into a parenthesized SQL OR group.
 * Nesting preserves explicit grouping independently of SQL operator precedence.
 * @throws If no predicates are supplied.
 * @example
 * or(eq(t.task.ownerId, t.owner.id), eq(t.task.approverId, t.owner.id))
 */
export function or(...items: JoinPredicate[]): JoinPredicate {
    if (!items.length) throw new Error('or() requires at least one predicate');
    return { [PREDICATE]: { op: 'or', items } };
}

/** Read-only flat query builder. Explicit projections avoid ambiguous SELECT *. */
export class AliasedQueryBuilder<TTables, TResult = never> {
    private sql: Knex.QueryBuilder;
    private tables = new Map<string, TableSchema>();
    private selected = false;
    private decoders: Record<string, (value: unknown) => unknown> = {};

    /**
     * Create a read-only query for one aliased schema.
     * Prefer query(knex, alias(schema, name)) so the table-context type is inferred.
     * The source retains its schema's default scope and soft-delete filters.
     */
    constructor(
        private knex: Knex,
        source: TableAlias<TableSchema, string>
    ) {
        this.tables.set(source.name, source.schema);
        this.sql = knex.from(this.source(source));
    }

    private source(table: TableAlias<TableSchema, string>): Knex.QueryBuilder {
        const Constructor = getSchemaQueryBuilderCtor();
        return getEffectiveBaseQuery(new Constructor(this.knex, table.schema))
            .clone()
            .as(table.name);
    }

    private tree(): TTables {
        return Object.fromEntries(
            [...this.tables].map(([name, schema]) => {
                const { propToCol } = buildColumnMap(schema);
                const properties = schema.introspect().properties;
                return [
                    name,
                    Object.fromEntries(
                        [...propToCol].map(([key, column]) => [
                            key,
                            {
                                [COLUMN]: {
                                    alias: name,
                                    column,
                                    schema: properties[key]
                                }
                            }
                        ])
                    )
                ];
            })
        ) as TTables;
    }

    private column(value: AliasedColumn<any>): string {
        if (!value || !(COLUMN in value))
            throw new TypeError('Expected an aliased column');
        const column = value[COLUMN];
        const schema = this.tables.get(column.alias);
        if (
            !schema ||
            ![...buildColumnMap(schema).propToCol.values()].includes(
                column.column
            )
        ) {
            throw new Error('Column does not belong to this query');
        }
        return `${column.alias}.${column.column}`;
    }

    private predicate(value: JoinPredicate): Knex.Raw {
        if (!value || !(PREDICATE in value))
            throw new TypeError('Expected a join predicate');
        const node = value[PREDICATE];
        if (node.op === 'eq') {
            return this.knex.raw('?? = ??', [
                this.column(node.left),
                this.column(node.right)
            ]);
        }
        return this.knex.raw(
            `(${node.items.map(() => '?').join(` ${node.op} `)})`,
            node.items.map(item => this.predicate(item))
        );
    }

    /**
     * Add an inner join using a typed, composable column predicate.
     * Unmatched rows are removed; one-to-many matches can repeat parent rows.
     * @throws If the alias already exists or a predicate uses an unknown column.
     */
    join<S extends TableSchema, const N extends string>(
        table: N extends keyof TTables ? never : TableAlias<S, N>,
        on: (tables: TTables & AliasTables<S, N>) => JoinPredicate
    ): AliasedQueryBuilder<TTables & AliasTables<S, N>, TResult> {
        this.addJoin(table, on as any, false);
        return this as any;
    }

    /**
     * Add a left join and make the new alias's projected fields nullable.
     * The right-hand schema's read filters stay inside its source so unmatched parents
     * are retained. Nested eq()/and()/or() conditions are supported.
     */
    leftJoin<S extends TableSchema, const N extends string>(
        table: N extends keyof TTables ? never : TableAlias<S, N>,
        on: (tables: TTables & AliasTables<S, N>) => JoinPredicate
    ): AliasedQueryBuilder<TTables & AliasTables<S, N, true>, TResult> {
        this.addJoin(table, on as any, true);
        return this as any;
    }

    private addJoin(
        table: TableAlias<TableSchema, string>,
        on: (tables: TTables) => JoinPredicate,
        left: boolean
    ): void {
        if (this.tables.has(table.name))
            throw new Error(`Duplicate table alias: ${table.name}`);
        this.tables.set(table.name, table.schema);
        try {
            const predicate = this.predicate(on(this.tree()));
            this.sql[left ? 'leftJoin' : 'join'](this.source(table), predicate);
        } catch (error) {
            this.tables.delete(table.name);
            throw error;
        }
    }

    /**
     * Add an AND comparison on a column from the joined table context.
     * Omitting the operator means equality. Values are bound and columns quoted.
     * @throws If the operator or selected column is unsupported.
     */
    where(
        column: (tables: TTables) => AliasedColumn<any>,
        value: unknown
    ): this;
    /**
     * Add an AND comparison on a column from the joined table context.
     * Omitting the operator means equality. Values are bound and columns quoted.
     * @throws If the operator or selected column is unsupported.
     */
    where(
        column: (tables: TTables) => AliasedColumn<any>,
        operator: string,
        value: unknown
    ): this;
    /**
     * Add an AND comparison on a column from the joined table context.
     * Omitting the operator means equality. Values are bound and columns quoted.
     * @throws If the operator or selected column is unsupported.
     */
    where(
        column: (tables: TTables) => AliasedColumn<any>,
        ...args: [value: unknown] | [operator: string, value: unknown]
    ): this {
        const operator = args.length === 1 ? '=' : args[0].toLowerCase();
        if (!ALLOWED_OPS.has(operator))
            throw new Error(`Unsupported operator: ${operator}`);
        this.sql.where(
            this.column(column(this.tree())),
            operator,
            (args.length === 1 ? args[0] : args[1]) as any
        );
        return this;
    }

    /**
     * Require an aliased column to match one of the bound values; an empty list matches no rows.
     */
    whereIn(
        column: (tables: TTables) => AliasedColumn<any>,
        values: readonly unknown[]
    ): this {
        this.sql.whereIn(this.column(column(this.tree())), values as any[]);
        return this;
    }

    /**
     * Add IS NULL for an aliased column, including a missing left-joined row.
     */
    whereNull(column: (tables: TTables) => AliasedColumn<any>): this {
        this.sql.whereNull(this.column(column(this.tree())));
        return this;
    }

    /**
     * Add IS NOT NULL for an aliased column; this can exclude unmatched left joins.
     */
    whereNotNull(column: (tables: TTables) => AliasedColumn<any>): this {
        this.sql.whereNotNull(this.column(column(this.tree())));
        return this;
    }

    /**
     * Append ordering on an aliased column, ascending unless a direction is supplied.
     */
    orderBy(
        column: (tables: TTables) => AliasedColumn<any>,
        direction: 'asc' | 'desc' = 'asc'
    ): this {
        this.sql.orderBy(this.column(column(this.tree())), direction);
        return this;
    }

    /**
     * Append raw ordering with Knex bindings; the caller owns aliases and SQL syntax.
     */
    orderByRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): this {
        this.sql.orderByRaw(sql, bindings);
        return this;
    }

    /**
     * Group joined rows by aliased columns before evaluating aggregate projections.
     */
    groupBy(...columns: Array<(tables: TTables) => AliasedColumn<any>>): this {
        this.sql.groupBy(
            columns.map(column => this.column(column(this.tree())))
        );
        return this;
    }

    /**
     * Filter groups by an aliased column or aggregate expression.
     * Comparisons use native SQL aggregate values, not output-schema conversions or
     * text casts, so numeric comparisons retain database semantics.
     */
    having(
        value: (
            tables: TTables
        ) => AggregateExpression<any> | AliasedColumn<any>,
        operator: string,
        right: unknown
    ): this {
        if (!ALLOWED_OPS.has(operator.toLowerCase()))
            throw new Error('Unsupported HAVING operator');
        const expression = value(this.tree());
        const left = isAggregate(expression)
            ? compileAggregate(this.knex, expression, c =>
                  this.column(c as AliasedColumn<any>)
              ).native
            : this.knex.raw('??', [this.column(expression)]);
        this.sql.havingRaw(`? ${operator} ?`, [left, right as any]);
        return this;
    }

    /**
     * Choose the exact flat DTO shape from aliased columns and aggregate expressions.
     * Aggregates are decoded after execution; left-joined fields include null.
     * @throws If the projection is empty or select() was already called.
     * @returns This builder with an inferred result type for the selected fields.
     */
    select<S extends Selection>(
        selector: (tables: TTables) => S
    ): AliasedQueryBuilder<TTables, JoinedProjection<S>> {
        if (this.selected)
            throw new Error('Only one object projection per query');
        const columns: Record<string, string | Knex.Raw> = {};
        for (const [key, value] of Object.entries(selector(this.tree()))) {
            if (isAggregate(value)) {
                const compiled = compileAggregate(this.knex, value, c =>
                    this.column(c as AliasedColumn<any>)
                );
                columns[key] = compiled.sql;
                this.decoders[key] = compiled.decode;
            } else columns[key] = this.column(value);
        }
        if (!Object.keys(columns).length)
            throw new Error('A non-empty projection is required');
        this.sql.select(columns);
        this.selected = true;
        return this as any;
    }

    /**
     * Set the maximum number of flat result rows; repeated joined parents each count as a row.
     */
    limit(limit: number): this {
        this.sql.limit(limit);
        return this;
    }
    /**
     * Skip flat result rows; pair with deterministic ordering for repeatable pages.
     */
    offset(offset: number): this {
        this.sql.offset(offset);
        return this;
    }

    /** Raw escape hatch; callers own any effects on result shape or cardinality. */
    apply(callback: (query: Knex.QueryBuilder) => void): this {
        callback(this.sql);
        return this;
    }

    /**
     * Clone this builder onto an existing transaction, preserving its tables/projection.
     * Does not modify the source or commit/roll back the transaction.
     */
    transacting(trx: Knex.Transaction): AliasedQueryBuilder<TTables, TResult> {
        const [name, schema] = this.tables.entries().next().value!;
        const copy = new AliasedQueryBuilder<TTables, TResult>(
            trx as unknown as Knex,
            alias(schema, name)
        );
        copy.sql = this.sql.clone().transacting(trx);
        copy.tables = new Map(this.tables);
        copy.selected = this.selected;
        copy.decoders = { ...this.decoders };
        return copy;
    }

    /**
     * Return a clone of the underlying Knex query after validating the projection.
     * Executing the clone bypasses aggregate output decoding.
     * @throws If no explicit projection has been selected.
     */
    toKnexQuery(): Knex.QueryBuilder {
        if (!this.selected)
            throw new Error(
                'Aliased queries require an explicit select projection'
            );
        return this.sql.clone();
    }
    /**
     * Render debugging SQL without execution; interpolated bindings may contain sensitive values.
     */
    toQuery(): string {
        return this.toKnexQuery().toQuery();
    }

    private decode(row: Record<string, unknown>): TResult {
        const result = { ...row };
        for (const [key, decode] of Object.entries(this.decoders))
            result[key] = decode(row[key]);
        return result as TResult;
    }
    /**
     * Execute the flat query and decode aggregate outputs for each returned row.
     * @throws Database errors, missing projection errors and output-parser failures.
     */
    async execute(): Promise<TResult[]> {
        return (await this.toKnexQuery()).map((row: Record<string, unknown>) =>
            this.decode(row)
        );
    }
    /**
     * Execute a limited clone and return its first decoded DTO, or undefined when no row matches.
     */
    async first(): Promise<TResult | undefined> {
        const row = await this.toKnexQuery().first();
        return row === undefined ? undefined : this.decode(row);
    }
    /**
     * Enable awaiting the builder by executing and forwarding its decoded result or error.
     */
    // biome-ignore lint/suspicious/noThenProperty: intentional query thenable
    then<T = TResult[], E = never>(
        resolve?: ((rows: TResult[]) => T | PromiseLike<T>) | null,
        reject?: ((error: any) => E | PromiseLike<E>) | null
    ): Promise<T | E> {
        return this.execute().then(resolve, reject);
    }
}
