import type { Knex } from 'knex';
import type { AliasedColumn } from './expressions.js';
import { ALLOWED_OPS } from './operations/helpers.js';
import { ReadSchemaError } from './read-schema.js';

const finishGroup = Symbol('finishReadPredicateGroup');

/** Select a column from the current reader's ordinary or aliased table context. */
export type ReadPredicateSelector<C> = (columns: C) => AliasedColumn<any>;

/** A synchronous, parenthesized predicate group. The callback cannot shape or execute a query. */
export type ReadPredicateGroup<C> = (
    predicates: ReadPredicateBuilder<C>
    // biome-ignore lint/suspicious/noConfusingVoidType: Accept existing void-returning callbacks while rejecting async callbacks via the explicit return union.
) => ReadPredicateBuilder<C> | void;

/** A bound value list or a caller-built SELECT subquery; captured without executing it. */
export type ReadMembership = readonly unknown[] | Knex.QueryBuilder;

/** @internal Predicate application contains only library-owned, already captured operations. */
export type ReadPredicate = (query: Knex.QueryBuilder) => void;

/** @internal Resolve references without exposing the parent's mutable SQL builder. */
export interface ReadPredicateContext<C> {
    knex: Knex;
    column: (selector: ReadPredicateSelector<C>) => string;
}

/** @internal Snapshot common mutable binding values independently of query builders. */
function copyValue(value: any): any {
    if (value instanceof Date) return new Date(value.getTime());
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    if (Array.isArray(value)) return value.map(copyValue);
    if (value && typeof value === 'object') {
        const prototype = Object.getPrototypeOf(value);
        if (prototype === Object.prototype || prototype === null) {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    copyValue(item)
                ])
            );
        }
    }
    return value;
}

/** @internal Compiled SQL is recreated per use, so externally owned builders are never retained. */
function captureSql(
    knex: Knex,
    source: Knex.Raw | Knex.QueryBuilder
): () => Knex.Raw {
    const compiled = source.toSQL();
    if (Array.isArray(compiled))
        throw new ReadSchemaError(
            'Read predicates require a single SQL expression'
        );
    const sql = compiled.sql;
    const bindings = compiled.bindings?.map(copyValue) ?? [];
    return () => knex.raw(sql, bindings.map(copyValue));
}

/** @internal Capture trusted SQL and positional bindings now, including refs and nested raw expressions. */
export function captureReadRaw(
    knex: Knex,
    sql: string,
    bindings: readonly Knex.RawBinding[] = []
): () => Knex.Raw {
    return captureSql(knex, knex.raw(sql, [...bindings]));
}

function captureSubquery(knex: Knex, query: Knex.QueryBuilder): () => Knex.Raw {
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
    // Rewrap the compiled statement, not the original builder or its callbacks.
    return captureSql(
        knex,
        knex.raw(compiled.sql, [...(compiled.bindings ?? [])])
    );
}

function captureValue(knex: Knex, value: any): () => any {
    if (value && typeof value.toSQL === 'function') {
        return typeof value.clone === 'function'
            ? captureSubquery(knex, value)
            : captureSql(knex, value);
    }
    if (typeof value === 'function')
        throw new ReadSchemaError('Predicate values cannot be callbacks');
    const captured = copyValue(value);
    return () => copyValue(captured);
}

/**
 * Shared shape-preserving predicate methods for immutable readers and scoped groups.
 * @internal Consumers obtain these methods through withRowSchema(), not inheritance.
 */
export abstract class ReadPredicates<C> {
    protected abstract readPredicateContext(): ReadPredicateContext<C>;
    protected abstract addReadPredicate(predicate: ReadPredicate): this;

    /**
     * Quote a schema-backed column for raw bindings or correlated subqueries.
     * The reference uses this reader's actual SQL alias and never executes SQL.
     * @example read.whereRaw('lower(??) = ?', [read.ref(t => t.name), 'alice'])
     */
    ref(selector: ReadPredicateSelector<C>): Knex.Ref<string, {}> {
        const { knex, column } = this.readPredicateContext();
        return knex.ref(column(selector));
    }

    /** Add a parenthesized AND group using a synchronous predicate-only callback. */
    where(group: ReadPredicateGroup<C>): this;
    /** Add a bound equality comparison. Null uses SQL IS NULL. */
    where(column: ReadPredicateSelector<C>, value: unknown): this;
    /** Add a bound comparison using a supported SQL operator. */
    where(
        column: ReadPredicateSelector<C>,
        operator: string,
        value: unknown
    ): this;
    where(
        first: ReadPredicateSelector<C> | ReadPredicateGroup<C>,
        ...args: [] | [unknown] | [string, unknown]
    ): this {
        return this.comparison('and', first, args);
    }

    /** Explicit AND spelling of where(), including nested groups. */
    andWhere(group: ReadPredicateGroup<C>): this;
    /** Add a bound AND equality comparison. */
    andWhere(column: ReadPredicateSelector<C>, value: unknown): this;
    /** Add a bound AND comparison. */
    andWhere(
        column: ReadPredicateSelector<C>,
        operator: string,
        value: unknown
    ): this;
    andWhere(
        first: ReadPredicateSelector<C> | ReadPredicateGroup<C>,
        ...args: [] | [unknown] | [string, unknown]
    ): this {
        return this.comparison('and', first, args);
    }

    /** Add a parenthesized OR group. Use an enclosing AND group beside authorization filters. */
    orWhere(group: ReadPredicateGroup<C>): this;
    /** Add a bound OR equality comparison. */
    orWhere(column: ReadPredicateSelector<C>, value: unknown): this;
    /** Add a bound OR comparison. */
    orWhere(
        column: ReadPredicateSelector<C>,
        operator: string,
        value: unknown
    ): this;
    orWhere(
        first: ReadPredicateSelector<C> | ReadPredicateGroup<C>,
        ...args: [] | [unknown] | [string, unknown]
    ): this {
        return this.comparison('or', first, args);
    }

    private comparison(
        boolean: 'and' | 'or',
        first: ReadPredicateSelector<C> | ReadPredicateGroup<C>,
        args: [] | [unknown] | [string, unknown]
    ): this {
        const context = this.readPredicateContext();
        const method = boolean === 'and' ? 'where' : 'orWhere';
        if (!args.length) {
            const group = new ReadPredicateBuilder(context);
            let operations: readonly ReadPredicate[];
            try {
                const result: unknown = (first as ReadPredicateGroup<C>)(group);
                if (
                    result &&
                    typeof (result as PromiseLike<unknown>).then === 'function'
                ) {
                    // Consume native async rejection without assimilating foreign
                    // thenables (a Knex query's then() would execute SQL).
                    if (result instanceof Promise) void result.catch(() => {});
                    throw new ReadSchemaError(
                        'Read predicate groups must be synchronous'
                    );
                }
                operations = group[finishGroup]();
            } finally {
                group[finishGroup]();
            }
            return this.addReadPredicate(query => {
                query[method](nested => {
                    for (const operation of operations) operation(nested);
                });
            });
        }
        const operator = args.length === 1 ? '=' : args[0];
        if (
            typeof operator !== 'string' ||
            !ALLOWED_OPS.has(operator.toLowerCase())
        )
            throw new ReadSchemaError(
                `Unsupported comparison operator: ${operator}`
            );
        const column = context.column(first as ReadPredicateSelector<C>);
        const value = captureValue(
            context.knex,
            args.length === 1 ? args[0] : args[1]
        );
        return this.addReadPredicate(query => {
            if (args.length === 1) query[method](column, value());
            else query[method](column, operator, value());
        });
    }

    private nullPredicate(
        column: ReadPredicateSelector<C>,
        method: 'whereNull' | 'whereNotNull' | 'orWhereNull' | 'orWhereNotNull'
    ): this {
        const name = this.readPredicateContext().column(column);
        return this.addReadPredicate(query => {
            query[method](name);
        });
    }
    /** Match SQL null without changing the row schema. */
    whereNull(column: ReadPredicateSelector<C>): this {
        return this.nullPredicate(column, 'whereNull');
    }
    /** Exclude SQL null without narrowing the declared row schema. */
    whereNotNull(column: ReadPredicateSelector<C>): this {
        return this.nullPredicate(column, 'whereNotNull');
    }
    /** Add an OR SQL-null condition. */
    orWhereNull(column: ReadPredicateSelector<C>): this {
        return this.nullPredicate(column, 'orWhereNull');
    }
    /** Add an OR SQL-not-null condition. */
    orWhereNotNull(column: ReadPredicateSelector<C>): this {
        return this.nullPredicate(column, 'orWhereNotNull');
    }

    private membership(
        column: ReadPredicateSelector<C>,
        values: ReadMembership,
        method: 'whereIn' | 'whereNotIn' | 'orWhereIn' | 'orWhereNotIn'
    ): this {
        const context = this.readPredicateContext();
        const name = context.column(column);
        const captured = Array.isArray(values)
            ? values.map(value => captureValue(context.knex, value))
            : captureSubquery(context.knex, values as Knex.QueryBuilder);
        return this.addReadPredicate(query => {
            if (typeof captured === 'function') {
                const rawMethod = method.startsWith('or')
                    ? 'orWhereRaw'
                    : 'whereRaw';
                const operator = method.includes('Not') ? 'not in' : 'in';
                query[rawMethod](`?? ${operator} (?)`, [name, captured()]);
            } else {
                query[method](
                    name,
                    captured.map(value => value())
                );
            }
        });
    }
    /** Match captured values or a SELECT subquery. An empty list matches no rows. */
    whereIn(column: ReadPredicateSelector<C>, values: ReadMembership): this {
        return this.membership(column, values, 'whereIn');
    }
    /** Exclude captured values or a SELECT subquery. SQL NOT IN null semantics apply. */
    whereNotIn(column: ReadPredicateSelector<C>, values: ReadMembership): this {
        return this.membership(column, values, 'whereNotIn');
    }
    /** Add an OR membership condition. */
    orWhereIn(column: ReadPredicateSelector<C>, values: ReadMembership): this {
        return this.membership(column, values, 'orWhereIn');
    }
    /** Add an OR negative membership condition. */
    orWhereNotIn(
        column: ReadPredicateSelector<C>,
        values: ReadMembership
    ): this {
        return this.membership(column, values, 'orWhereNotIn');
    }

    private exists(
        subquery: Knex.QueryBuilder,
        method:
            | 'whereExists'
            | 'whereNotExists'
            | 'orWhereExists'
            | 'orWhereNotExists'
    ): this {
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
    /** Require a row in a captured SELECT subquery; use ref() to correlate it. */
    whereExists(subquery: Knex.QueryBuilder): this {
        return this.exists(subquery, 'whereExists');
    }
    /** Require no rows in a captured SELECT subquery. */
    whereNotExists(subquery: Knex.QueryBuilder): this {
        return this.exists(subquery, 'whereNotExists');
    }
    /** Add an OR EXISTS predicate. */
    orWhereExists(subquery: Knex.QueryBuilder): this {
        return this.exists(subquery, 'orWhereExists');
    }
    /** Add an OR NOT EXISTS predicate. */
    orWhereNotExists(subquery: Knex.QueryBuilder): this {
        return this.exists(subquery, 'orWhereNotExists');
    }

    /** Trusted SQL predicate with positional value (?) and identifier (??) bindings; not a SQL sandbox. */
    whereRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): this {
        const captured = captureReadRaw(
            this.readPredicateContext().knex,
            sql,
            bindings
        );
        return this.addReadPredicate(query => {
            query.whereRaw(captured());
        });
    }
    /** Add an OR trusted SQL predicate with captured positional bindings. */
    orWhereRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): this {
        const captured = captureReadRaw(
            this.readPredicateContext().knex,
            sql,
            bindings
        );
        return this.addReadPredicate(query => {
            query.orWhereRaw(captured());
        });
    }
}

/**
 * Predicate-only builder supplied to grouped where/andWhere/orWhere callbacks.
 * Group methods accumulate synchronously; outer readers remain immutable.
 * No select, join, order, raw-query escape hatch, then, or execution method exists.
 * Retaining this builder and mutating it after the callback throws.
 */
export class ReadPredicateBuilder<C> extends ReadPredicates<C> {
    #context: ReadPredicateContext<C>;
    #operations: ReadPredicate[] = [];
    #closed = false;
    /** @internal Created only for grouped predicates. */
    constructor(context: ReadPredicateContext<C>) {
        super();
        this.#context = context;
    }
    protected readPredicateContext(): ReadPredicateContext<C> {
        return this.#context;
    }
    protected addReadPredicate(predicate: ReadPredicate): this {
        if (this.#closed)
            throw new ReadSchemaError('Predicate group is already closed');
        this.#operations.push(predicate);
        return this;
    }
    /** @internal Close the scoped builder and snapshot its predicate list. */
    [finishGroup](): readonly ReadPredicate[] {
        this.#closed = true;
        return [...this.#operations];
    }
}
