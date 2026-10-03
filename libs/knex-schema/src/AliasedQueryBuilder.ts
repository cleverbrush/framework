import { type InferType, object } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type {
    AliasedQuerySource,
    AliasTables,
    JoinPredicate,
    TableAlias
} from './aliased-query.js';
import {
    assertParametersBound,
    COMPILE_PARAMETERS,
    COMPILED_READER,
    type CompiledReader,
    copyParameterOrder,
    finishParameterizedQuery,
    shareParameterCompilation,
    unwrapParameterizedQuery
} from './compiled-query.js';
import {
    type AggregateExpression,
    type AliasedColumn,
    COLUMN
} from './expressions.js';
import { OpaqueQuery, type QueryOutput } from './OpaqueQuery.js';
import type {
    ParameterReader,
    ParameterState,
    QueryView,
    WithoutParameters
} from './parameter-types.js';
import {
    bindReadPredicate,
    captureReadRaw,
    captureValue,
    predicateParameters,
    type ReadPredicate,
    type ReadPredicateContext,
    ReadPredicates
} from './read-predicates.js';
import { compileReadProjection, type ReadField } from './read-projection.js';
import {
    compileReadSchema,
    decodeObject,
    type ReadObject,
    ReadSchemaError,
    type ReadValue,
    type SchemaForValue
} from './read-schema.js';
import type { ReadColumn, ReadProjection } from './SchemaQueryBuilder.js';

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
export class AliasedQueryBuilder<
    T,
    Row extends ReadObject = never,
    P extends ParameterState = []
> extends ReadPredicates<ReadAliasTables<T>, P, AliasParameterReader<T, Row>> {
    private fields?: Record<string, ReadField>;
    private schema?: Row;
    private predicates: readonly ReadPredicate[] = [];
    /** @internal Create through query(knex, alias(schema, name)). */
    constructor(private planner: AliasedQuerySource<T, any>) {
        super();
    }

    /** Exact structural schema, stable across operations that do not change selection. */
    get rowSchema(): Row {
        if (!this.schema)
            throw new ReadSchemaError(
                'Aliased reads require an explicit select projection'
            );
        return this.schema;
    }
    private copy(): this {
        const copy = Object.assign(
            Object.create(Object.getPrototypeOf(this)),
            this,
            {
                planner: this.planner.cloneReadSource()
            }
        );
        copyParameterOrder(this, copy);
        return copy;
    }
    /** Add an immutable inner join with typed alias predicates. */
    join<S extends ReadObject, N extends string>(
        table: N extends keyof T ? never : TableAlias<S, N>,
        on: (tables: ReadAliasTables<T & AliasTables<S, N>>) => JoinPredicate
    ): QueryView<AliasedQueryBuilder<T & AliasTables<S, N>, Row, P>> {
        const copy = this.copy();
        copy.planner = copy.planner.join(table, on as any) as any;
        return finishParameterizedQuery(copy) as any;
    }
    /** Add an immutable left join; projected right-side fields are nullable. */
    leftJoin<S extends ReadObject, N extends string>(
        table: N extends keyof T ? never : TableAlias<S, N>,
        on: (
            tables: ReadAliasTables<T & AliasTables<S, N, true>>
        ) => JoinPredicate
    ): QueryView<AliasedQueryBuilder<T & AliasTables<S, N, true>, Row, P>> {
        const copy = this.copy();
        copy.planner = copy.planner.leftJoin(table, on as any) as any;
        return finishParameterizedQuery(copy) as any;
    }
    /** Select exact columns and aggregates; opaque raw expressions are deliberately unsupported. */
    select<Selected extends Selection>(
        select: (tables: ReadAliasTables<T>) => Selected
    ): QueryView<AliasedQueryBuilder<T, ReadProjection<Selected>, P>> {
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
        return finishParameterizedQuery(copy) as any;
    }
    protected readPredicateContext(): ReadPredicateContext<ReadAliasTables<T>> {
        const { knex, columns } = this.planner.readContext();
        const entries = Object.values(
            columns as Record<string, Record<string, AliasedColumn<any>>>
        ).flatMap(table => Object.values(table));
        const resolve: ReadPredicateContext<ReadAliasTables<T>>['resolve'] =
            selector => {
                if (typeof selector !== 'function')
                    throw new ReadSchemaError(
                        'Aliased predicates require a column selector'
                    );
                const column = selector(columns as ReadAliasTables<T>);
                if (!entries.includes(column))
                    throw new ReadSchemaError(
                        'Predicate column does not belong to this query'
                    );
                const info = column[COLUMN];
                return {
                    column: `${info.alias}.${info.column}`,
                    schema: compileReadSchema(info.schema).schema
                };
            };
        return { knex, resolve, column: selector => resolve(selector).column };
    }
    protected addReadPredicate(predicate: ReadPredicate): this {
        const copy = this.copy();
        copy.predicates = [...this.predicates, predicate];
        return finishParameterizedQuery(copy);
    }
    /** Order by native database values before decoding. */
    orderBy(
        column: Selector<T>,
        direction: 'asc' | 'desc' = 'asc'
    ): QueryView<this> {
        const copy = this.copy();
        copy.planner.orderBy(column as any, direction);
        return finishParameterizedQuery(copy) as any;
    }
    /** Append trusted raw ordering with captured bindings; ref() quotes mapped aliased columns. */
    orderByRaw<const A extends readonly Knex.RawBinding[]>(
        sql: string,
        bindings: A & WithoutParameters<NoInfer<A>> = [] as any
    ): QueryView<this> {
        const { knex } = this.planner.readContext();
        const captured = captureReadRaw(knex, sql, bindings)().toSQL();
        const copy = this.copy();
        copy.planner.orderByRaw(captured.sql, captured.bindings);
        return finishParameterizedQuery(copy) as any;
    }
    /** Group native columns for an aggregate projection. */
    groupBy(...columns: Selector<T>[]): QueryView<this> {
        const copy = this.copy();
        copy.planner.groupBy(...(columns as any));
        return finishParameterizedQuery(copy) as any;
    }
    /** Filter grouped rows using native SQL aggregate values. */
    having<V>(
        value: (
            tables: ReadAliasTables<T>
        ) => AggregateExpression<any> | AliasedColumn<any>,
        operator: string,
        right: V & WithoutParameters<NoInfer<V>>
    ): QueryView<this> {
        const copy = this.copy();
        copy.planner.having(
            value as any,
            operator,
            captureValue(this.planner.readContext().knex, right)()
        );
        return finishParameterizedQuery(copy) as any;
    }
    /** Limit the flat row count, including repeated parents produced by joins. */
    limit(count: number): QueryView<this> {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Limit must be a non-negative integer');
        const copy = this.copy();
        copy.planner.limit(count);
        return finishParameterizedQuery(copy) as any;
    }
    /** Offset flat rows using caller-supplied deterministic ordering. */
    offset(count: number): QueryView<this> {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Offset must be a non-negative integer');
        const copy = this.copy();
        copy.planner.offset(count);
        return finishParameterizedQuery(copy) as any;
    }
    /** Use a caller-owned transaction without mutating the original read query. */
    transacting(trx: Knex.Transaction): QueryView<this> {
        const copy = this.copy();
        copy.planner = copy.planner.transacting(trx);
        shareParameterCompilation(this, copy);
        return finishParameterizedQuery(copy) as any;
    }
    /** @internal Compile selected fields, casting exact numeric values before driver parsing. */
    compile(mode?: typeof COMPILE_PARAMETERS): Knex.QueryBuilder {
        assertParametersBound(this, mode);
        void this.rowSchema;
        const { sql, knex } = this.planner.readContext();
        for (const predicate of this.predicates) predicate(sql);
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
    /** Return an independent mutable Knex snapshot. */
    toKnexQuery(): Knex.QueryBuilder {
        return this.compile();
    }
    /** Configure raw SQL once and declare its complete output contract. */
    apply<O extends ReadObject>(
        configure: (query: Knex.QueryBuilder) => Knex.QueryBuilder | undefined,
        options: QueryOutput<O>
    ): OpaqueQuery<O> {
        assertParametersBound(this);
        const { knex, sql: source } = this.planner.readContext();
        const sql = this.fields ? this.compile() : source;
        if (!this.fields)
            for (const predicate of this.predicates) predicate(sql);
        const result = configure(sql);
        if (result !== undefined && result !== sql) {
            if (result instanceof Promise) void result.catch(() => {});
            throw new ReadSchemaError(
                'Raw configuration must synchronously configure the supplied Knex builder'
            );
        }
        return OpaqueQuery.capture(knex, sql, options);
    }
    /** Replace the projection with trusted SQL and an explicit output contract. */
    selectRaw<O extends ReadObject>(
        sql: string,
        bindings: readonly Knex.RawBinding[],
        options: QueryOutput<O>
    ): OpaqueQuery<O> {
        const { knex } = this.planner.readContext();
        const captured = captureReadRaw(knex, sql, bindings);
        return this.apply(
            query => query.clearSelect().select(captured()),
            options
        );
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
    /** @internal Cached SELECT execution and independent materialization. */
    [COMPILED_READER](): CompiledReader {
        const nodes = Object.fromEntries(
            Object.entries(this.fields ?? {}).map(([key, field]) => [
                key,
                field.node
            ])
        );
        return {
            knex: this.planner.readConnection(),
            uses: predicateParameters(this.predicates),
            compile: () => this.compile(COMPILE_PARAMETERS),
            decode: row => decodeObject(nodes, row, 'row'),
            bind: values => {
                const copy = this.copy();
                copy.predicates = this.predicates.map(predicate =>
                    bindReadPredicate(predicate, values)
                );
                return finishParameterizedQuery(copy);
            }
        };
    }
    /** Fetch the first selected row, or undefined. */
    async first(): Promise<InferType<Row> | undefined> {
        return (
            await (unwrapParameterizedQuery(this.limit(1)) as this).execute()
        )[0];
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

/** @internal Fluent return constructor for aliased SELECTs. */
export interface AliasParameterReader<T, Row extends ReadObject>
    extends ParameterReader {
    readonly result: QueryView<
        AliasedQueryBuilder<
            T,
            Row,
            this['parameters'] extends ParameterState
                ? this['parameters']
                : never
        >
    >;
}
