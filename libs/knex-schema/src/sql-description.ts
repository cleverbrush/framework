import type { Knex } from 'knex';
import { copyBinding } from './parameter.js';
import { ReadSchemaError } from './read-schema.js';

// This is an internal SQL operation graph, not a Knex client. It records only
// library-owned planner operations. Public native SQL escape hatches require a
// connection; consumer selectors/scopes/customizers run before recording SQL.
const DESCRIPTION = Symbol('sql-description');
const CONNECTION = Symbol('description-connection');
type Operation = readonly [method: string, args: readonly unknown[]];
type Native = Knex.QueryBuilder | Knex.Raw;

class SqlDescription {
    readonly operations: Operation[] = [];
    constructor(
        readonly method: string,
        readonly args: readonly unknown[]
    ) {}
}

function describe(method: string, args: readonly unknown[]): any {
    const description = new SqlDescription(method, args.map(snapshot));
    const proxy = new Proxy(description, {
        get(target, key) {
            if (key === DESCRIPTION) return target;
            if (key === 'then') return undefined;
            if (key === 'clone')
                return () => {
                    const copy = describe(target.method, target.args);
                    copy[DESCRIPTION].operations.push(...target.operations);
                    return copy;
                };
            if (key === 'toSQL' || key === 'toQuery')
                return () => {
                    throw new ReadSchemaError(
                        'Bind a connection before compiling SQL'
                    );
                };
            if (typeof key !== 'string' || key.startsWith('_'))
                throw new ReadSchemaError(
                    `Unsupported SQL description access: ${String(key)}`
                );
            return (...values: unknown[]) => {
                target.operations.push([key, values.map(snapshot)]);
                return proxy;
            };
        }
    });
    return proxy;
}

function descriptionOf(value: any): SqlDescription | undefined {
    return value && typeof value === 'object' ? value[DESCRIPTION] : undefined;
}

function snapshot(value: any): any {
    if (descriptionOf(value)) return value.clone();
    if (Array.isArray(value)) return value.map(snapshot);
    if (value && Object.getPrototypeOf(value) === Object.prototype)
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, snapshot(item)])
        );
    return copyBinding(value);
}

/** @internal Build SQL descriptions without instantiating a client or choosing a dialect. */
export function describeConnection(): Knex {
    return new Proxy((...args: unknown[]) => describe('table', args), {
        get(_target, key) {
            if (key === CONNECTION) return true;
            if (key === 'then') return undefined;
            if (typeof key !== 'string' || key === 'client')
                throw new ReadSchemaError(
                    'A query definition has no connection'
                );
            return (...args: unknown[]) => describe(key, args);
        }
    }) as unknown as Knex;
}

/** @internal Whether a planner is capturing an unbound SQL description. */
export function isConnectionDescription(knex: Knex): boolean {
    return (knex as any)[CONNECTION] === true;
}

/** @internal Native SQL objects cannot be imported into connection-independent definitions. */
export function assertPortableBindings(value: unknown): void {
    if (descriptionOf(value)) return;
    if (value && typeof (value as any).toSQL === 'function')
        throw new ReadSchemaError(
            'Bind a connection before using native SQL expressions or subqueries'
        );
    if (Array.isArray(value)) value.forEach(assertPortableBindings);
    else if (value && Object.getPrototypeOf(value) === Object.prototype)
        Object.values(value).forEach(assertPortableBindings);
}

const connections = new WeakMap<Knex, Knex>();
const nativeConnections = new WeakMap<Knex, Knex>();
const nativeBuilders = new WeakMap<object, Native>();
const builderConnections = new WeakMap<object, Knex>();

/** @internal Public escape hatches receive native Knex objects, not planner adapters. */
export function nativeSql<T extends Native>(query: T): T {
    return (nativeBuilders.get(query) ?? query) as T;
}

/** @internal Connection supplied to a deferred internal planner callback. */
export function connectionForSql(query: Knex.QueryBuilder): Knex {
    const connection = builderConnections.get(query);
    if (!connection) throw new ReadSchemaError('SQL planner is not bound');
    return connection;
}

/** @internal Recover the supplied connection, including transaction identity. */
export function actualConnection(knex: Knex): Knex {
    return nativeConnections.get(knex) ?? knex;
}

/** @internal Preserve fragment resolution when a bound definition enters a transaction. */
export function transactionConnection(
    source: Knex,
    trx: Knex.Transaction
): Knex {
    return nativeConnections.has(source) ? bindDescriptionConnection(trx) : trx;
}

/** @internal Materialize library SQL descriptions with the supplied client's configuration. */
export function materializeSql<T>(value: T, knex: Knex): T {
    const connection = actualConnection(knex);
    const description = descriptionOf(value);
    if (description) {
        const args = description.args.map(arg =>
            materializeSql(arg, connection)
        );
        let result = (connection as any)[description.method](...args);
        for (const [method, values] of description.operations)
            result = result[method](
                ...values.map(arg => materializeSql(arg, connection))
            );
        return result;
    }
    if (Array.isArray(value))
        return value.map(arg => materializeSql(arg, connection)) as T;
    if (value && typeof value === 'object') {
        const native = nativeBuilders.get(value);
        if (native) return native as T;
        if (Object.getPrototypeOf(value) === Object.prototype)
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    materializeSql(item, connection)
                ])
            ) as T;
    }
    // Only internal SQL callbacks can enter a description. Bind their nested
    // builders too, so captured fragments always use the execution connection.
    if (typeof value === 'function' && 'client' in value)
        return actualConnection(value as unknown as Knex) as T;
    if (typeof value === 'function')
        return function (this: Knex.QueryBuilder, ...args: unknown[]) {
            return value.apply(
                bindSql(this, connection),
                args.map(arg =>
                    isBuilder(arg) ? bindSql(arg, connection) : arg
                )
            );
        } as T;
    return copyBinding(value);
}

function isBuilder(value: any): value is Knex.QueryBuilder {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof value.toSQL === 'function' &&
        typeof value.clone === 'function'
    );
}

/** @internal Retain ordinary Knex behavior while resolving captured SQL fragments at its boundary. */
export function bindSql<T extends Native>(value: T, knex: Knex): T {
    const connection = actualConnection(knex);
    const native = materializeSql(value, connection);
    const proxy = new Proxy(native, {
        get(target, key, receiver) {
            if (key === DESCRIPTION) return undefined;
            const member = Reflect.get(target, key, receiver);
            if (typeof member !== 'function') return member;
            if (['then', 'catch', 'finally'].includes(String(key)))
                return member.bind(target);
            return (...args: unknown[]) => {
                const result = member.apply(
                    target,
                    args.map(arg => materializeSql(arg, connection))
                );
                if (result === target) return proxy;
                return isBuilder(result) ? bindSql(result, connection) : result;
            };
        }
    });
    nativeBuilders.set(proxy, native);
    builderConnections.set(proxy, connection);
    return proxy;
}

/** @internal A bound planner uses the real client, never an ambient/global connection. */
export function bindDescriptionConnection(knex: Knex): Knex {
    const connection = actualConnection(knex);
    const cached = connections.get(connection);
    if (cached) return cached;
    const bound = new Proxy(connection, {
        apply(target, _this, args) {
            return bindSql(
                (target as any)(
                    ...args.map(arg => materializeSql(arg, connection))
                ),
                connection
            );
        },
        get(target, key) {
            if (key === CONNECTION) return false;
            const member = Reflect.get(target, key, target);
            if (typeof member !== 'function' || key === 'client') return member;
            return (...args: unknown[]) => {
                const result = member.apply(
                    target,
                    args.map(arg => materializeSql(arg, connection))
                );
                return isBuilder(result) ? bindSql(result, connection) : result;
            };
        }
    });
    connections.set(connection, bound);
    nativeConnections.set(bound, connection);
    return bound;
}

/** @internal Defer private planner inspection until a real Knex builder exists. */
export function configureSql(
    query: Knex.QueryBuilder,
    configure: (query: Knex.QueryBuilder) => void
): Knex.QueryBuilder {
    if (descriptionOf(query)) return query.modify(configure);
    configure(query);
    return query;
}
