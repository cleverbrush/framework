import type { Knex } from 'knex';
import type { AliasedColumn } from './expressions.js';
import { ALLOWED_OPS } from './operations/helpers.js';
import {
    assertNoParameters,
    copyBinding,
    isParameter,
    type ParameterUse,
    type ParameterValues,
    parameterBinding
} from './parameter.js';
import {
    type CheckParameterState,
    type CheckParameterValue,
    type CheckScalarParameter,
    type MergeParameters,
    PARAMETER_READER,
    PARAMETER_STATE,
    type ParameterReader,
    type ParameterState,
    type ParametersOf,
    type Reparameterize,
    type ValueParameters,
    type WithoutParameters
} from './parameter-types.js';
import { type ReadSchema, ReadSchemaError } from './read-schema.js';
import {
    assertPortableBindings,
    isConnectionDescription
} from './sql-description.js';

const finishGroup = Symbol('finishReadPredicateGroup');

/** Select a column from the current reader's ordinary or aliased table context. */
export type ReadPredicateSelector<C> =
    | ((columns: C) => AliasedColumn<any>)
    | (keyof C & string);
/** @internal Infer the storage representation from the selected column. */
export type PredicateValue<C, S> = S extends (
    columns: C
) => AliasedColumn<infer V>
    ? V
    : S extends keyof C
      ? C[S] extends AliasedColumn<infer V>
          ? V
          : never
      : never;

/** A synchronous, parenthesized predicate group; configuration never executes SQL. */
export type ReadPredicateGroup<C, G = ReadPredicateBuilder<C, any>> = (
    predicates: ReadPredicateBuilder<C>
) => G;
/** A bound value list or a caller-built SELECT subquery, captured without execution. */
export type ReadMembership = readonly unknown[] | Knex.QueryBuilder;

/** @internal Captured library operation; user callbacks are never replayed. */
export interface ReadPredicate {
    (query: Knex.QueryBuilder, values?: ParameterValues): void;
    readonly parameters?: readonly ParameterUse[];
}

/** @internal Resolve SQL and storage metadata together, invoking selectors once. */
export interface ReadPredicateContext<C> {
    knex: Knex;
    column: (selector: ReadPredicateSelector<C>) => string | Knex.Raw;
    resolve: (selector: ReadPredicateSelector<C>) => {
        column: string | Knex.Raw;
        schema: ReadSchema;
    };
}

/** @internal */
export function predicateParameters(
    predicates: readonly ReadPredicate[]
): ParameterUse[] {
    return predicates.flatMap(predicate => predicate.parameters ?? []);
}
/** @internal Materialize captured operations, not user configuration callbacks. */
export function bindReadPredicate(
    predicate: ReadPredicate,
    values: ParameterValues
): ReadPredicate {
    return query => predicate(query, values);
}
function capturedPredicate(
    predicate: ReadPredicate,
    parameters: readonly ParameterUse[]
): ReadPredicate {
    return Object.assign(predicate, { parameters });
}

function captureSql(
    knex: Knex,
    source: Knex.Raw | Knex.QueryBuilder
): () => Knex.Raw {
    const compiled = source.toSQL();
    if (Array.isArray(compiled))
        throw new ReadSchemaError(
            'Read predicates require a single SQL expression'
        );
    assertNoParameters(compiled.bindings);
    const sql = compiled.sql;
    const bindings = compiled.bindings?.map(copyBinding) ?? [];
    return () => knex.raw(sql, bindings.map(copyBinding));
}
/** @internal Capture trusted SQL and bindings, including nested raw expressions. */
export function captureReadRaw(
    knex: Knex,
    sql: string,
    bindings: readonly Knex.RawBinding[] = []
): () => Knex.Raw {
    assertNoParameters(bindings);
    if (isConnectionDescription(knex)) {
        assertPortableBindings(bindings);
        const captured = bindings.map(copyBinding);
        return () => knex.raw(sql, captured.map(copyBinding));
    }
    return captureSql(knex, knex.raw(sql, [...bindings]));
}
function captureSubquery(knex: Knex, query: Knex.QueryBuilder): () => Knex.Raw {
    if (isConnectionDescription(knex)) assertPortableBindings(query);
    if (
        !query ||
        typeof query.toSQL !== 'function' ||
        typeof query.clone !== 'function'
    )
        throw new ReadSchemaError('Expected a Knex SELECT subquery');
    const compiled = query.clone().toSQL();
    if (
        Array.isArray(compiled) ||
        !['select', 'first'].includes(compiled.method)
    )
        throw new ReadSchemaError('Read predicates require a SELECT subquery');
    assertNoParameters(compiled.bindings);
    return captureSql(
        knex,
        knex.raw(compiled.sql, [...(compiled.bindings ?? [])])
    );
}
/** @internal Snapshot concrete bindings; placeholders require a typed predicate. */
export function captureValue(knex: Knex, value: any): () => any {
    assertNoParameters(value);
    if (isConnectionDescription(knex)) assertPortableBindings(value);
    if (value && typeof value.toSQL === 'function')
        return typeof value.clone === 'function'
            ? captureSubquery(knex, value)
            : captureSql(knex, value);
    if (typeof value === 'function')
        throw new ReadSchemaError('Predicate values cannot be callbacks');
    const captured = copyBinding(value);
    return () => copyBinding(captured);
}
function typedValue(knex: Knex, value: unknown, schema: ReadSchema) {
    return isParameter(value)
        ? {
              parameters: [{ name: value.name, schema }],
              get: (values?: ParameterValues) =>
                  parameterBinding(
                      value,
                      values,
                      ['object', 'array'].includes(schema.introspect().type)
                          ? 'json'
                          : 'value'
                  )
          }
        : { parameters: [] as ParameterUse[], get: captureValue(knex, value) };
}

/** @internal Higher-kinded predicate group return type; groups are never executable. */
export interface GroupParameterReader<C> extends ParameterReader {
    readonly result: ReadPredicateBuilder<
        C,
        this['parameters'] extends ParameterState ? this['parameters'] : never
    >;
}

/** Shared immutable predicates for schema readers and grouped conditions. */
export abstract class ReadPredicates<
    C,
    P extends ParameterState = [],
    Self extends ParameterReader = GroupParameterReader<C>
> {
    /** @internal Type-only ordered argument contract. */
    declare readonly [PARAMETER_STATE]: P;
    /** @internal Type-only fluent return constructor. */
    declare readonly [PARAMETER_READER]: Self;
    protected abstract readPredicateContext(): ReadPredicateContext<C>;
    protected abstract addReadPredicate(predicate: ReadPredicate): any;

    /** Quote a mapped column for trusted raw SQL or correlated subqueries. */
    ref(selector: ReadPredicateSelector<C>): Knex.Ref<string, {}> | Knex.Raw {
        const { knex, column } = this.readPredicateContext();
        if (isConnectionDescription(knex))
            throw new ReadSchemaError('Bind a connection before calling ref()');
        const resolved = column(selector);
        return typeof resolved === 'string' ? knex.ref(resolved) : resolved;
    }

    /** Add a synchronous group, retaining the group's inferred named parameters. */
    where<G extends ReadPredicateBuilder<C, any>>(
        group: ReadPredicateGroup<
            C,
            G &
                CheckParameterState<
                    MergeParameters<P, ParametersOf<NoInfer<G>>>
                >
        >
    ): Reparameterize<Self, MergeParameters<P, ParametersOf<G>>>;
    /** Match a record of concrete equality values. Use selectors for parameters. */
    where<const V extends Partial<Record<keyof C, unknown>>>(
        values: V & WithoutParameters<NoInfer<V>>
    ): Reparameterize<Self, P>;
    /** Match a column and infer a named parameter's storage type. */
    where<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    /** Add a bound comparison using a supported SQL operator. */
    where<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        operator: string,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    where(first: any, ...args: any[]): any {
        if (typeof first === 'object' && first !== null && !args.length) {
            assertNoParameters(first);
            return Object.entries(first).reduce(
                (q: any, [key, value]) => q.where(key, value),
                this
            );
        }
        return this.comparison('and', first, args);
    }
    /** Explicit AND spelling of where(), including groups and typed parameters. */
    andWhere<G extends ReadPredicateBuilder<C, any>>(
        group: ReadPredicateGroup<
            C,
            G &
                CheckParameterState<
                    MergeParameters<P, ParametersOf<NoInfer<G>>>
                >
        >
    ): Reparameterize<Self, MergeParameters<P, ParametersOf<G>>>;
    andWhere<const V extends Partial<Record<keyof C, unknown>>>(
        values: V & WithoutParameters<NoInfer<V>>
    ): Reparameterize<Self, P>;
    andWhere<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    andWhere<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        operator: string,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    andWhere(first: any, ...args: any[]): any {
        if (typeof first === 'object' && first !== null && !args.length)
            return this.where(first);
        return this.comparison('and', first, args);
    }
    /** Add an OR comparison or parenthesized group. */
    orWhere<G extends ReadPredicateBuilder<C, any>>(
        group: ReadPredicateGroup<
            C,
            G &
                CheckParameterState<
                    MergeParameters<P, ParametersOf<NoInfer<G>>>
                >
        >
    ): Reparameterize<Self, MergeParameters<P, ParametersOf<G>>>;
    orWhere<const V extends Partial<Record<keyof C, unknown>>>(
        values: V & WithoutParameters<NoInfer<V>>
    ): Reparameterize<Self, P>;
    orWhere<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    orWhere<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        operator: string,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>>;
    orWhere(first: any, ...args: any[]): any {
        if (typeof first === 'object' && first !== null && !args.length) {
            assertNoParameters(first);
            return this.comparison(
                'or',
                (group: ReadPredicateBuilder<C>) => group.where(first),
                []
            );
        }
        return this.comparison('or', first, args);
    }

    private comparison(
        boolean: 'and' | 'or' | 'not',
        selector: any,
        args: any[]
    ): any {
        const context = this.readPredicateContext();
        const method =
            boolean === 'or'
                ? 'orWhere'
                : boolean === 'not'
                  ? 'whereNot'
                  : 'where';
        if (!args.length) {
            const group = new ReadPredicateBuilder(context);
            const result = selector(group);
            if (result && typeof result.then === 'function') {
                if (result instanceof Promise) void result.catch(() => {});
                throw new ReadSchemaError(
                    'Read predicate groups must be synchronous'
                );
            }
            if (
                !(result instanceof ReadPredicateBuilder) ||
                !result.sameSource(group)
            )
                throw new ReadSchemaError(
                    'Predicate callbacks must return a builder from the supplied group'
                );
            const operations = result[finishGroup]();
            return this.addReadPredicate(
                capturedPredicate((query, values) => {
                    query[method](nested => {
                        for (const operation of operations)
                            operation(nested, values);
                    });
                }, predicateParameters(operations))
            );
        }
        const operator = args.length === 1 ? '=' : args[0];
        if (
            typeof operator !== 'string' ||
            !ALLOWED_OPS.has(operator.toLowerCase())
        )
            throw new ReadSchemaError(
                `Unsupported comparison operator: ${operator}`
            );
        const { column, schema } = context.resolve(selector);
        const input = args.length === 1 ? args[0] : args[1];
        if (isParameter(input)) {
            if (
                ['in', 'not in', 'is', 'is not'].includes(
                    operator.toLowerCase()
                )
            )
                throw new ReadSchemaError(
                    'Use a typed scalar comparison or fixed whereIn tuple for parameters'
                );
            if (
                operator.toLowerCase().includes('like') &&
                schema.introspect().type !== 'string'
            )
                throw new ReadSchemaError(
                    'LIKE parameters require a string column'
                );
        }
        const value = typedValue(context.knex, input, schema);
        return this.addReadPredicate(
            capturedPredicate((query, values) => {
                if (
                    isParameter(input) &&
                    schema.introspect().isNullable &&
                    args.length === 1
                ) {
                    // Knex rewrites shorthand where(column, null) to IS NULL.
                    // Explicit operators retain SQL's three-valued null semantics.
                    const expression = context.knex.raw(
                        'case when ? then ?? is null else ?? = ? end',
                        [
                            parameterBinding(input, values, 'isNull'),
                            column,
                            column,
                            value.get(values)
                        ]
                    );
                    query[method](expression);
                } else if (args.length === 1)
                    query[method](column as any, value.get(values));
                else query[method](column as any, operator, value.get(values));
            }, value.parameters)
        );
    }

    private nullPredicate(
        column: ReadPredicateSelector<C>,
        method: 'whereNull' | 'whereNotNull' | 'orWhereNull' | 'orWhereNotNull'
    ): any {
        const name = this.readPredicateContext().column(column);
        return this.addReadPredicate(query => {
            query[method](name as any);
        });
    }
    /** Match SQL null without changing the declared result type. */
    whereNull(column: ReadPredicateSelector<C>): Reparameterize<Self, P> {
        return this.nullPredicate(column, 'whereNull');
    }
    whereNotNull(column: ReadPredicateSelector<C>): Reparameterize<Self, P> {
        return this.nullPredicate(column, 'whereNotNull');
    }
    orWhereNull(column: ReadPredicateSelector<C>): Reparameterize<Self, P> {
        return this.nullPredicate(column, 'orWhereNull');
    }
    orWhereNotNull(column: ReadPredicateSelector<C>): Reparameterize<Self, P> {
        return this.nullPredicate(column, 'orWhereNotNull');
    }

    private membership(
        column: ReadPredicateSelector<C>,
        values: ReadMembership,
        method: 'whereIn' | 'whereNotIn' | 'orWhereIn' | 'orWhereNotIn'
    ): any {
        const context = this.readPredicateContext();
        const resolved = context.resolve(column);
        const captured = Array.isArray(values)
            ? values.map(value =>
                  typedValue(context.knex, value, resolved.schema)
              )
            : captureSubquery(context.knex, values as Knex.QueryBuilder);
        return this.addReadPredicate(
            capturedPredicate(
                (query, parameters) => {
                    if (typeof captured === 'function') {
                        const rawMethod = method.startsWith('or')
                            ? 'orWhereRaw'
                            : 'whereRaw';
                        const operator = method.includes('Not')
                            ? 'not in'
                            : 'in';
                        query[rawMethod](`?? ${operator} (?)`, [
                            resolved.column,
                            captured()
                        ]);
                    } else
                        query[method](
                            resolved.column as any,
                            captured.map(value => value.get(parameters))
                        );
                },
                typeof captured === 'function'
                    ? []
                    : captured.flatMap(value => value.parameters)
            )
        );
    }
    /** Match a fixed value tuple or captured SELECT subquery. */
    whereIn<S extends ReadPredicateSelector<C>, const A extends ReadMembership>(
        column: S,
        values: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.membership(column, values, 'whereIn');
    }
    whereNotIn<
        S extends ReadPredicateSelector<C>,
        const A extends ReadMembership
    >(
        column: S,
        values: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.membership(column, values, 'whereNotIn');
    }
    orWhereIn<
        S extends ReadPredicateSelector<C>,
        const A extends ReadMembership
    >(
        column: S,
        values: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.membership(column, values, 'orWhereIn');
    }
    orWhereNotIn<
        S extends ReadPredicateSelector<C>,
        const A extends ReadMembership
    >(
        column: S,
        values: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.membership(column, values, 'orWhereNotIn');
    }

    private exists(
        subquery: Knex.QueryBuilder,
        method:
            | 'whereExists'
            | 'whereNotExists'
            | 'orWhereExists'
            | 'orWhereNotExists'
    ): any {
        const captured = captureSubquery(
            this.readPredicateContext().knex,
            subquery
        );
        return this.addReadPredicate(query => {
            const rawMethod = method.startsWith('or')
                ? 'orWhereRaw'
                : 'whereRaw';
            const operator = method.includes('Not') ? 'not exists' : 'exists';
            query[rawMethod](`${operator} (?)`, [captured()]);
        });
    }
    whereExists(query: Knex.QueryBuilder): Reparameterize<Self, P> {
        return this.exists(query, 'whereExists');
    }
    whereNotExists(query: Knex.QueryBuilder): Reparameterize<Self, P> {
        return this.exists(query, 'whereNotExists');
    }
    orWhereExists(query: Knex.QueryBuilder): Reparameterize<Self, P> {
        return this.exists(query, 'orWhereExists');
    }
    orWhereNotExists(query: Knex.QueryBuilder): Reparameterize<Self, P> {
        return this.exists(query, 'orWhereNotExists');
    }

    /** Trusted SQL with concrete bindings; use a typed predicate for placeholders. */
    whereRaw<const A extends readonly Knex.RawBinding[]>(
        sql: string,
        bindings: A & WithoutParameters<NoInfer<A>>
    ): Reparameterize<Self, P>;
    whereRaw(sql: string): Reparameterize<Self, P>;
    whereRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): any {
        const captured = captureReadRaw(
            this.readPredicateContext().knex,
            sql,
            bindings
        );
        return this.addReadPredicate(query => {
            query.whereRaw(captured());
        });
    }
    orWhereRaw<const A extends readonly Knex.RawBinding[]>(
        sql: string,
        bindings: A & WithoutParameters<NoInfer<A>>
    ): Reparameterize<Self, P>;
    orWhereRaw(sql: string): Reparameterize<Self, P>;
    orWhereRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): any {
        const captured = captureReadRaw(
            this.readPredicateContext().knex,
            sql,
            bindings
        );
        return this.addReadPredicate(query => {
            query.orWhereRaw(captured());
        });
    }
    /** Negate equality while preserving ordinary SQL null semantics. */
    whereNot<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A & CheckScalarParameter<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.comparison('not', column, [value]);
    }
    whereBetween<
        S extends ReadPredicateSelector<C>,
        const A extends readonly [unknown, unknown]
    >(
        column: S,
        range: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.range(column, range, false);
    }
    whereNotBetween<
        S extends ReadPredicateSelector<C>,
        const A extends readonly [unknown, unknown]
    >(
        column: S,
        range: A & CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.range(column, range, true);
    }
    private range(
        column: ReadPredicateSelector<C>,
        range: readonly [unknown, unknown],
        not: boolean
    ): any {
        const context = this.readPredicateContext();
        const resolved = context.resolve(column);
        const values = range.map(value =>
            typedValue(context.knex, value, resolved.schema)
        );
        return this.addReadPredicate(
            capturedPredicate(
                (query, parameters) => {
                    query[not ? 'whereNotBetween' : 'whereBetween'](
                        resolved.column as any,
                        [values[0].get(parameters), values[1].get(parameters)]
                    );
                },
                values.flatMap(value => value.parameters)
            )
        );
    }
    whereLike<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A &
            (A extends import('./parameter.js').QueryParameter
                ? CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
                : string)
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.comparison('and', column, ['like', value]);
    }
    whereILike<S extends ReadPredicateSelector<C>, const A>(
        column: S,
        value: A &
            (A extends import('./parameter.js').QueryParameter
                ? CheckParameterValue<P, NoInfer<A>, PredicateValue<C, S>>
                : string)
    ): Reparameterize<Self, ValueParameters<P, A, PredicateValue<C, S>>> {
        return this.comparison('and', column, ['ilike', value]);
    }
    /** JSON-path strings do not provide a schema-derived parameter type. */
    whereJsonPath<A>(
        column: ReadPredicateSelector<C>,
        path: string,
        operator?: string,
        value?: A & WithoutParameters<NoInfer<A>>
    ): Reparameterize<Self, P>;
    whereJsonPath(
        column: ReadPredicateSelector<C>,
        path: string,
        operator = '=',
        value?: unknown
    ): any {
        assertNoParameters(value);
        const context = this.readPredicateContext();
        const name = context.column(column);
        if (
            !isConnectionDescription(context.knex) &&
            !['pg', 'postgres', 'postgresql'].includes(
                context.knex.client.config.client as string
            )
        )
            throw new ReadSchemaError(
                'whereJsonPath() is only supported on PostgreSQL'
            );
        const predicateOperator = operator === '@?' || operator === '@@';
        if (!predicateOperator && !ALLOWED_OPS.has(operator.toLowerCase()))
            throw new ReadSchemaError('Unsupported JSON comparison operator');
        const captured = captureReadRaw(
            context.knex,
            predicateOperator
                ? `?? ${operator === '@?' ? '@\\?' : '@@'} ?`
                : `jsonb_path_query_first(??, ?) ${operator} ?::jsonb`,
            predicateOperator
                ? [name, path]
                : [
                      name,
                      path.startsWith('$') ? path : `$.${path}`,
                      JSON.stringify(value)
                  ]
        );
        return this.addReadPredicate(query => {
            if (
                !['pg', 'postgres', 'postgresql'].includes(
                    query.client.config.client as string
                )
            )
                throw new ReadSchemaError(
                    'whereJsonPath() is only supported on PostgreSQL'
                );
            query.whereRaw(captured());
        });
    }
}

/** Predicate-only immutable builder; no execution, projection or ordering methods. */
export class ReadPredicateBuilder<
    C,
    P extends ParameterState = []
> extends ReadPredicates<C, P, GroupParameterReader<C>> {
    #context: ReadPredicateContext<C>;
    #operations: readonly ReadPredicate[] = [];
    /** @internal Created by a reader to capture a synchronous predicate group. */
    constructor(context: ReadPredicateContext<C>) {
        super();
        this.#context = context;
    }
    protected readPredicateContext(): ReadPredicateContext<C> {
        return this.#context;
    }
    protected addReadPredicate(predicate: ReadPredicate): any {
        const copy = new ReadPredicateBuilder(this.#context);
        copy.#operations = [...this.#operations, predicate];
        return copy;
    }
    /** @internal Reject builders belonging to another predicate group. */
    sameSource(other: ReadPredicateBuilder<C, any>): boolean {
        return this.#context === other.#context;
    }
    /** @internal Snapshot the configured group without executing its callbacks again. */
    [finishGroup](): readonly ReadPredicate[] {
        return [...this.#operations];
    }
}

/** @internal ORM readers specialize the same predicate signatures with their own return type. */
export type ReadPredicateMethods<
    C,
    P extends ParameterState,
    Self extends ParameterReader
> = Pick<ReadPredicates<C, P, Self>, keyof ReadPredicates<C, P, Self>>;
