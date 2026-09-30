import { type InferType, object } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type {
    AliasedQueryBuilder,
    AliasTables,
    JoinPredicate,
    TableAlias
} from './aliased-query.js';
import {
    type AggregateExpression,
    type AliasedColumn,
    COLUMN
} from './expressions.js';
import { compileReadProjection, type ReadField } from './read-projection.js';
import {
    compileReadSchema,
    decodeObject,
    type ReadObject,
    ReadSchemaError,
    type ReadValue,
    type SchemaForValue
} from './read-schema.js';
import type { ReadColumn, ReadProjection } from './SchemaReadQuery.js';

/** Schema-backed aliases whose exact numeric and outer-join values match decoded rows. */
export type ReadAliasTables<T> = {
    [A in keyof T]: {
        [K in keyof T[A]]: T[A][K] extends AliasedColumn<any, infer S, infer N>
            ? ReadColumn<
                  SchemaForValue<ReadValue<S> | (N extends true ? null : never)>
              >
            : never;
    };
};
type Selection = Record<string, ReadColumn<any> | AggregateExpression<any>>;
type Selector<T> = (tables: ReadAliasTables<T>) => AliasedColumn<any>;

/** Immutable flat joined read. Supply select() before accessing rowSchema or executing. */
export class AliasedReadQuery<T, Row extends ReadObject = never> {
    private fields?: Record<string, ReadField>;
    private schema?: Row;
    /** @internal Enter through an aliased query's withRowSchema() method. */
    constructor(private planner: AliasedQueryBuilder<T, any>) {}

    /** Exact structural schema, stable across operations that do not change selection. */
    get rowSchema(): Row {
        if (!this.schema)
            throw new ReadSchemaError(
                'Aliased reads require an explicit select projection'
            );
        return this.schema;
    }
    private copy(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
            planner: this.planner.cloneReadSource()
        });
    }
    /** Add an immutable inner join with typed alias predicates. */
    join<S extends ReadObject, N extends string>(
        table: N extends keyof T ? never : TableAlias<S, N>,
        on: (tables: ReadAliasTables<T & AliasTables<S, N>>) => JoinPredicate
    ): AliasedReadQuery<T & AliasTables<S, N>, Row> {
        const copy = this.copy();
        copy.planner = copy.planner.join(table, on as any) as any;
        return copy as any;
    }
    /** Add an immutable left join; projected right-side fields are nullable. */
    leftJoin<S extends ReadObject, N extends string>(
        table: N extends keyof T ? never : TableAlias<S, N>,
        on: (
            tables: ReadAliasTables<T & AliasTables<S, N, true>>
        ) => JoinPredicate
    ): AliasedReadQuery<T & AliasTables<S, N, true>, Row> {
        const copy = this.copy();
        copy.planner = copy.planner.leftJoin(table, on as any) as any;
        return copy as any;
    }
    /** Select exact columns and aggregates; opaque raw expressions are deliberately unsupported. */
    select<P extends Selection>(
        select: (tables: ReadAliasTables<T>) => P
    ): AliasedReadQuery<T, ReadProjection<P>> {
        if (this.fields)
            throw new ReadSchemaError(
                'Only one projection is allowed per read query'
            );
        const { knex, columns } = this.planner.readContext();
        const entries = Object.values(
            columns as Record<string, Record<string, AliasedColumn<any>>>
        ).flatMap(table => Object.values(table));
        const copy = this.copy();
        copy.fields = compileReadProjection(
            knex,
            select(columns as ReadAliasTables<T>),
            column => {
                if (!entries.includes(column))
                    throw new ReadSchemaError(
                        'Projection column does not belong to this query'
                    );
                const info = column[COLUMN];
                return {
                    name: `${info.alias}.${info.column}`,
                    node: compileReadSchema(info.schema)
                };
            }
        );
        copy.schema = object(
            Object.fromEntries(
                Object.entries(copy.fields).map(([key, field]) => [
                    key,
                    field.node.schema
                ])
            )
        ) as unknown as Row;
        return copy as any;
    }
    /** Add a bound equality predicate. */
    where(column: Selector<T>, value: unknown): this;
    /** Add a bound predicate with an explicit supported operator. */
    where(column: Selector<T>, operator: string, value: unknown): this;
    /** Return a filtered clone without changing metadata identity. */
    where(column: Selector<T>, ...args: [unknown] | [string, unknown]): this {
        const copy = this.copy();
        if (args.length === 1) copy.planner.where(column as any, args[0]);
        else copy.planner.where(column as any, args[0], args[1]);
        return copy;
    }
    /** Match SQL null, including absent outer-joined rows. */
    whereNull(column: Selector<T>): this {
        const copy = this.copy();
        copy.planner.whereNull(column as any);
        return copy;
    }
    /** Exclude SQL null without silently narrowing result types. */
    whereNotNull(column: Selector<T>): this {
        const copy = this.copy();
        copy.planner.whereNotNull(column as any);
        return copy;
    }
    /** Match a bound value list. */
    whereIn(column: Selector<T>, values: readonly unknown[]): this {
        const copy = this.copy();
        copy.planner.whereIn(column as any, values);
        return copy;
    }
    /** Order by native database values before decoding. */
    orderBy(column: Selector<T>, direction: 'asc' | 'desc' = 'asc'): this {
        const copy = this.copy();
        copy.planner.orderBy(column as any, direction);
        return copy;
    }
    /** Group native columns for an aggregate projection. */
    groupBy(...columns: Selector<T>[]): this {
        const copy = this.copy();
        copy.planner.groupBy(...(columns as any));
        return copy;
    }
    /** Filter grouped rows using native SQL aggregate values. */
    having(
        value: (
            tables: ReadAliasTables<T>
        ) => AggregateExpression<any> | AliasedColumn<any>,
        operator: string,
        right: unknown
    ): this {
        const copy = this.copy();
        copy.planner.having(value as any, operator, right);
        return copy;
    }
    /** Limit the flat row count, including repeated parents produced by joins. */
    limit(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Limit must be a non-negative integer');
        const copy = this.copy();
        copy.planner.limit(count);
        return copy;
    }
    /** Offset flat rows using caller-supplied deterministic ordering. */
    offset(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Offset must be a non-negative integer');
        const copy = this.copy();
        copy.planner.offset(count);
        return copy;
    }
    /** Use a caller-owned transaction without mutating the original read query. */
    transacting(trx: Knex.Transaction): this {
        const copy = this.copy();
        copy.planner = copy.planner.transacting(trx);
        return copy;
    }
    /** @internal Compile selected fields, casting exact numeric values before driver parsing. */
    compile(): Knex.QueryBuilder {
        void this.rowSchema;
        const { sql, knex } = this.planner.readContext();
        return sql
            .clearSelect()
            .select(
                Object.fromEntries(
                    Object.entries(this.fields!).map(([key, field]) => [
                        key,
                        field.expression(knex)
                    ])
                )
            );
    }
    /** Render SQL for debugging without executing it. */
    toQuery(): string {
        return this.compile().toQuery();
    }
    /** Execute one statement and validate/decode its detached results. */
    async execute(): Promise<InferType<Row>[]> {
        const nodes = Object.fromEntries(
            Object.entries(this.fields ?? {}).map(([key, field]) => [
                key,
                field.node
            ])
        );
        return (await this.compile()).map((row: unknown) =>
            decodeObject(nodes, row, 'row')
        );
    }
    /** Fetch the first selected row, or undefined. */
    async first(): Promise<InferType<Row> | undefined> {
        return (await this.limit(1).execute())[0];
    }
    /** Awaiting executes this reader; repeated awaits execute again. */
    // biome-ignore lint/suspicious/noThenProperty: query readers intentionally support await
    then<R = InferType<Row>[], E = never>(
        resolve?: ((rows: InferType<Row>[]) => R | PromiseLike<R>) | null,
        reject?: ((error: any) => E | PromiseLike<E>) | null
    ): Promise<R | E> {
        return this.execute().then(resolve, reject);
    }
}
