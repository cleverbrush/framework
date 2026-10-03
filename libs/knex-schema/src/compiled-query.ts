import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import {
    copyBinding,
    ParameterSlot,
    type ParameterUse,
    type ParameterValues,
    validateParameterUses,
    validateParameterValue
} from './parameter.js';
import type { BoundQuerySql, UnderlyingQuery } from './parameter-types.js';
import { ReadSchemaError } from './read-schema.js';

/** @internal Internal compilation is the only path allowed to emit placeholder slots. */
export const COMPILE_PARAMETERS = Symbol('compile-query-parameters');
/** @internal Shared reader protocol; ORM wrappers preserve it. */
export const COMPILED_READER = Symbol('compiled-reader');

/** @internal A reader's captured graph, decoder, and independent binding operation. */
export interface CompiledReader {
    readonly knex: Knex;
    readonly uses: readonly ParameterUse[];
    compile(): Knex.QueryBuilder;
    decode(row: unknown): unknown;
    bind(values: ParameterValues): unknown;
}

type Reader = { [COMPILED_READER](): CompiledReader };
type Plan = {
    statement: Knex.Sql;
    slots: readonly (ParameterSlot | unknown)[];
    decode: (row: unknown) => unknown;
    context: unknown;
};
type Cache = { plan?: Plan };
const originals = new WeakMap<object, Reader>();
const facades = new WeakMap<object, object>();
const orders = new WeakMap<object, readonly string[]>();
const caches = new WeakMap<object, Cache>();
const runtimes = new WeakMap<object, CompiledReader>();

function runtimeFor(reader: Reader): CompiledReader {
    let runtime = runtimes.get(reader);
    if (!runtime) {
        runtime = reader[COMPILED_READER]();
        runtimes.set(reader, runtime);
    }
    return runtime;
}

/** @internal Recover a class reader from its callable facade without losing source identity. */
export function unwrapParameterizedQuery<T>(value: T): UnderlyingQuery<T> {
    return (
        value && (typeof value === 'object' || typeof value === 'function')
            ? (originals.get(value as object) ?? value)
            : value
    ) as UnderlyingQuery<T>;
}

/** @internal Detect a callable template without assimilating its Promise interface. */
export function isParameterizedQuery(value: unknown): boolean {
    return typeof value === 'function' && originals.has(value);
}

/** @internal Runtime reader metadata; intended for query/ORM composition only. */
export function readerParameters(value: unknown): readonly ParameterUse[] {
    const reader = unwrapParameterizedQuery(value) as Reader | undefined;
    return reader && typeof reader[COMPILED_READER] === 'function'
        ? reader[COMPILED_READER]().uses
        : [];
}

/** @internal Copy construction order, not a shape-dependent compiled cache. */
export function copyParameterOrder(source: object, target: object): void {
    orders.set(target, orders.get(source) ?? []);
}

/** @internal Transaction-only derivatives share an immutable statement holder. */
export function shareParameterCompilation(
    source: object,
    target: object
): void {
    // Identifier formatting and other client options can change SQL. A caller
    // using another Knex instance gets its own plan, even on the same dialect.
    if (
        (source as Reader)[COMPILED_READER]().knex.client.config !==
        (target as Reader)[COMPILED_READER]().knex.client.config
    )
        return;
    let cache = caches.get(source);
    if (!cache) {
        cache = {};
        caches.set(source, cache);
    }
    caches.set(target, cache);
}

/** @internal Guard SQL escape hatches and ordinary terminals before touching Knex. */
export function assertParametersBound(
    reader: object,
    mode?: typeof COMPILE_PARAMETERS
): void {
    if (mode !== COMPILE_PARAMETERS && readerParameters(reader).length)
        throw new ReadSchemaError(
            'This query has unbound parameters; call it with arguments or use query(...args)'
        );
}

function names(
    reader: Reader,
    uses: readonly ParameterUse[]
): readonly string[] {
    const active = new Set(uses.map(use => use.name));
    const result = (orders.get(reader) ?? []).filter(name => active.has(name));
    for (const use of uses)
        if (!result.includes(use.name)) result.push(use.name);
    orders.set(reader, result);
    return result;
}

function valuesFor(reader: Reader, args: readonly unknown[]): ParameterValues {
    const uses = runtimeFor(reader).uses;
    const declared = names(reader, uses);
    if (args.length !== declared.length)
        throw new ReadSchemaError(
            `Expected ${declared.length} query arguments (${declared.join(', ')}), received ${args.length}`
        );
    const values = new Map(declared.map((name, i) => [name, args[i]]));
    for (const use of uses) validateParameterValue(use, values.get(use.name));
    return new Map(
        [...values].map(([name, value]) => [name, copyBinding(value)])
    );
}

function planFor(reader: Reader): Plan {
    let cache = caches.get(reader);
    if (!cache) {
        cache = {};
        caches.set(reader, cache);
    }
    if (!cache.plan) {
        const runtime = runtimeFor(reader);
        if (
            !['pg', 'postgres', 'postgresql'].includes(
                runtime.knex.client.config.client as string
            )
        )
            throw new ReadSchemaError(
                'Compiled queries currently require PostgreSQL'
            );
        const query = runtime.compile();
        const statement = query.toSQL();
        if (Array.isArray(statement) || statement.method !== 'select')
            throw new ReadSchemaError(
                'A compiled query must produce one SELECT'
            );
        const declared = new Set(names(reader, runtime.uses));
        const slots = (statement.bindings ?? []).map(value => {
            if (value instanceof ParameterSlot && !declared.has(value.name))
                throw new ReadSchemaError(
                    `Undeclared query parameter: ${value.name}`
                );
            return copyBinding(value);
        });
        cache.plan = {
            statement: { ...statement, bindings: [] },
            slots,
            decode: runtime.decode,
            context: query.queryContext()
        };
    }
    return cache.plan;
}

function bindSlots(plan: Plan, values: ParameterValues): unknown[] {
    return plan.slots.map(slot =>
        slot instanceof ParameterSlot
            ? slot.mode === 'isNull'
                ? values.get(slot.name) === null
                : slot.mode === 'json' && values.get(slot.name) !== null
                  ? JSON.stringify(copyBinding(values.get(slot.name)))
                  : copyBinding(values.get(slot.name))
            : copyBinding(slot)
    );
}

function inspect(reader: Reader, args: readonly unknown[]): BoundQuerySql {
    const values = valuesFor(reader, args);
    const plan = planFor(reader);
    return { sql: plan.statement.sql, bindings: bindSlots(plan, values) };
}

async function execute(
    reader: Reader,
    args: readonly unknown[]
): Promise<unknown[]> {
    const values = valuesFor(reader, args);
    const plan = planFor(reader);
    const { knex } = runtimeFor(reader);
    // A fresh carrier retains Knex's runner, pooling, events, transactions and
    // response processing. Only its SQL compilation is replaced by a snapshot.
    const execution = knex.raw('');
    execution.queryContext(plan.context);
    execution.toSQL = () =>
        ({
            ...plan.statement,
            bindings: bindSlots(plan, values),
            __knexQueryUid: randomUUID()
        }) as Knex.Sql;
    const rows = await execution;
    return rows.map(plan.decode);
}

const blocked = new Set<PropertyKey>([
    'execute',
    'first',
    'all',
    'find',
    'findOrFail',
    'findMany',
    'paginate',
    'paginateAfter',
    'pluck',
    'countValue',
    'countDistinctValue',
    'sumValue',
    'avgValue',
    'minValue',
    'maxValue',
    'compile',
    'toKnexQuery',
    'toQuery',
    'apply',
    'selectRaw',
    'insert',
    'insertMany',
    'update',
    'delete',
    'hardDelete',
    'restore',
    'bulkInsert',
    'bulkUpdate',
    'bulkUpsert',
    'upsert',
    'onConflict',
    'save',
    'storageQuery',
    'mutationTargets'
]);

/** @internal Finish immutable composition; ordinary readers remain ordinary objects. */
export function finishParameterizedQuery<T>(value: T): T {
    const reader = unwrapParameterizedQuery(value) as T & Reader;
    if (!reader || typeof reader[COMPILED_READER] !== 'function') return value;
    const uses = reader[COMPILED_READER]().uses;
    validateParameterUses(uses);
    names(reader, uses);
    if (!uses.length) return reader;
    const previous = facades.get(reader);
    if (previous) return previous as T;
    const callable = (...args: unknown[]) => execute(reader, args);
    // Keep source checks and instanceof working; actual class methods are bound
    // to the captured reader, never to the function object.
    Object.setPrototypeOf(callable, Object.getPrototypeOf(reader));
    const proxy = new Proxy(callable, {
        get(_target, prop) {
            if (prop === 'then') return undefined;
            if (prop === 'query')
                return (...args: unknown[]) =>
                    reader[COMPILED_READER]().bind(valuesFor(reader, args));
            if (prop === 'toSQL')
                return (...args: unknown[]) => inspect(reader, args);
            if (blocked.has(prop))
                return () => {
                    throw new ReadSchemaError(
                        `Bind query parameters before calling ${String(prop)}()`
                    );
                };
            const member = Reflect.get(reader, prop, reader);
            return typeof member === 'function' ? member.bind(reader) : member;
        }
    });
    originals.set(proxy, reader);
    facades.set(reader, proxy);
    return proxy as T;
}
