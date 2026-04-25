/**
 * Browser-safe entry point for `@cleverbrush/server`.
 *
 * Re-exports the endpoint builder, factory functions and type helpers
 * needed to **define** API contracts without pulling in the Node.js server
 * runtime.  Use this entry point in shared packages that are consumed by
 * both the backend (Node.js) and the frontend (browser).
 *
 * @example
 * ```ts
 * import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
 * import { array, number, object, string } from '@cleverbrush/schema';
 *
 * const TodoSchema = object({ id: number(), title: string() });
 *
 * export const api = defineApi({
 *     todos: {
 *         list: endpoint.resource('/api/todos').get()
 *             .responses({ 200: array(TodoSchema) }),
 *         get: endpoint.resource('/api/todos').get(
 *             route({ id: number().coerce() })`/${t => t.id}`
 *         ).responses({ 200: TodoSchema }),
 *     },
 * });
 * ```
 *
 * @module
 */

export {
    type ActionContext,
    type AllowedResponseReturn,
    type CallbackDefinition,
    createEndpoints,
    EndpointBuilder,
    type EndpointMetadata,
    type EndpointMetadataDescriptors,
    endpoint,
    type Handler,
    type LinkDefinition,
    type PropertyRefTree,
    type ResponsesOf,
    type ScopedEndpointFactory
} from './Endpoint.js';
export { route } from './route.js';
export {
    SubscriptionBuilder,
    type SubscriptionContext,
    type SubscriptionHandler,
    type SubscriptionHandlerEntry,
    type SubscriptionMetadata,
    type TrackedEvent,
    tracked
} from './Subscription.js';

import type { EndpointBuilder as _EB } from './Endpoint.js';
import type { SubscriptionBuilder as _SB } from './Subscription.js';

// ---------------------------------------------------------------------------
// defineApi — typed, one-level API contract grouping
// ---------------------------------------------------------------------------

/**
 * A record of named {@link EndpointBuilder} or {@link SubscriptionBuilder}
 * instances that form a single logical API group (e.g. "todos", "auth", "live").
 */
export type ApiGroup = Record<
    string,
    | _EB<any, any, any, any, any, any, any, any, any>
    | _SB<any, any, any, any, any, any, any, any>
>;

/**
 * A typed API contract with one level of grouping.
 *
 * Each key is a group name and each value is an {@link ApiGroup} — a
 * record of named endpoints.
 *
 * @example
 * ```ts
 * const contract: ApiContract = {
 *     todos: { list: todosResource.get(), create: todosResource.post() },
 *     auth:  { login: endpoint.post('/api/auth/login') },
 * };
 * ```
 */
export type ApiContract = Record<string, ApiGroup>;

/**
 * Defines a typed API contract with one level of grouping.
 *
 * The returned object is the **single source of truth** for both server and
 * client.  The server imports it and extends each endpoint with
 * `.authorize()`, `.inject()`, and OpenAPI metadata.  The client passes it
 * to `createClient()` from `@cleverbrush/client` to obtain a fully typed HTTP
 * client.
 *
 * At runtime the contract (and each group within it) is frozen with
 * `Object.freeze` to prevent accidental mutation — endpoint builders are
 * immutable by design, so every `.body()` / `.query()` / etc. call already
 * returns a **new** builder.
 *
 * @typeParam T - The exact shape of the contract, inferred from the argument.
 * @param contract - A record of named groups, each containing named endpoints.
 * @returns The same object, frozen and typed as `Readonly<T>`.
 *
 * @example
 * ```ts
 * import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
 * import { array, number, object, string } from '@cleverbrush/schema';
 *
 * const TodoSchema = object({ id: number(), title: string(), completed: boolean() });
 * const todosResource = endpoint.resource('/api/todos');
 * const ById = route({ id: number().coerce() })`/${t => t.id}`;
 *
 * export const api = defineApi({
 *     todos: {
 *         list: todosResource.get()
 *             .query(object({ page: number().optional(), limit: number().optional() }))
 *             .responses({ 200: array(TodoSchema) }),
 *         get: todosResource.get(ById)
 *             .responses({ 200: TodoSchema }),
 *         create: todosResource.post()
 *             .body(object({ title: string() }))
 *             .responses({ 201: TodoSchema }),
 *     },
 *     auth: {
 *         login: endpoint.post('/api/auth/login')
 *             .body(object({ email: string(), password: string() }))
 *             .responses({ 200: object({ token: string() }) }),
 *     },
 * });
 * ```
 */
export function defineApi<T extends ApiContract>(contract: T): Readonly<T> {
    for (const group of Object.values(contract)) {
        Object.freeze(group);
    }
    return Object.freeze(contract);
}

// ---------------------------------------------------------------------------
// Contract composition utilities
// ---------------------------------------------------------------------------

/**
 * Computes the merged type of two {@link ApiContract} objects.
 *
 * - Groups that only exist in `A` are kept as-is.
 * - Groups that only exist in `B` are kept as-is.
 * - Groups whose key appears in **both** `A` and `B` have their endpoint maps
 *   intersected (`A[K] & B[K]`), making all endpoints from both sources
 *   visible on the merged group.
 */
export type MergedContracts<A extends ApiContract, B extends ApiContract> = {
    readonly [K in keyof A | keyof B]: K extends keyof A
        ? K extends keyof B
            ? A[K] & B[K]
            : A[K]
        : K extends keyof B
          ? B[K]
          : never;
};

/**
 * Merges two API contracts into one.
 *
 * This is the primary building block for **audience-scoped bundles**: define
 * a `publicApi` that is safe to ship to every client, and a separate
 * `adminApi` that is only imported by the admin application.  Combine them
 * at the admin entry point with `mergeContracts`.
 *
 * - Groups that exist in only one contract are passed through unchanged.
 * - Groups that share a key have their endpoint maps **shallowly merged**
 *   (later endpoints with the same name override earlier ones, same semantics
 *   as `Object.assign`).
 * - The returned contract is frozen, matching the invariant of
 *   {@link defineApi}.
 *
 * @typeParam A - The shape of the first contract.
 * @typeParam B - The shape of the second contract.
 * @param a - The base contract (e.g. the public API).
 * @param b - The contract to merge in (e.g. admin-only groups).
 * @returns A new frozen contract whose type is {@link MergedContracts}`<A, B>`.
 *
 * @example
 * ```ts
 * // shared/public-api.ts  — safe to import in the client bundle
 * export const publicApi = defineApi({
 *     todos: { list: ..., get: ..., create: ... },
 *     auth:  { login: ..., register: ... },
 * });
 *
 * // shared/admin-api.ts   — only imported by the admin application
 * const adminApi = defineApi({
 *     admin: { activityLog: ..., banUser: ... },
 * });
 *
 * // admin-app/contract.ts
 * import { mergeContracts } from '@cleverbrush/server/contract';
 * export const fullApi = mergeContracts(publicApi, adminApi);
 * // TypeScript sees: { todos, auth, admin } — fully typed
 *
 * // client-app/contract.ts
 * import { publicApi } from 'shared/public-api';
 * // TypeScript sees: { todos, auth } — admin groups are absent
 * ```
 */
export function mergeContracts<A extends ApiContract, B extends ApiContract>(
    a: A,
    b: B
): Readonly<MergedContracts<A, B>> {
    const result: Record<string, ApiGroup> = {};

    for (const key of Object.keys(a) as (keyof A & string)[]) {
        result[key] = { ...a[key] };
    }

    for (const key of Object.keys(b) as (keyof B & string)[]) {
        if (Object.hasOwn(result, key)) {
            result[key] = { ...result[key], ...b[key] };
        } else {
            result[key] = { ...b[key] };
        }
    }

    for (const group of Object.values(result)) {
        Object.freeze(group);
    }

    return Object.freeze(result) as unknown as Readonly<MergedContracts<A, B>>;
}

/**
 * Returns a new contract containing only the specified groups.
 *
 * The TypeScript return type is `Pick<T, K>` — the compiler sees exactly the
 * selected groups and no others.  This provides full type safety on the
 * narrowed contract when passed to `createClient()` or used as a server
 * handler map.
 *
 * @typeParam T - The shape of the source contract.
 * @typeParam K - The union of group keys to keep.
 * @param contract - The contract to select from.
 * @param groups - The group keys to include.
 * @returns A new frozen contract with only the listed groups.
 *
 * @example
 * ```ts
 * const fullApi = defineApi({ todos: {...}, auth: {...}, admin: {...}, debug: {...} });
 *
 * // Pick only the groups the frontend needs
 * const clientApi = pickGroups(fullApi, 'todos', 'auth');
 * // TypeScript: { todos: ..., auth: ... }
 * ```
 */
export function pickGroups<T extends ApiContract, K extends keyof T>(
    contract: T,
    ...groups: K[]
): Readonly<Pick<T, K>> {
    const result = {} as Pick<T, K>;
    for (const key of groups) {
        (result as Record<string, ApiGroup>)[key as string] = contract[key];
        Object.freeze((result as Record<string, ApiGroup>)[key as string]);
    }
    return Object.freeze(result);
}

/**
 * Returns a new contract with the specified groups removed.
 *
 * The TypeScript return type is `Omit<T, K>` — the listed groups are absent
 * at both runtime and compile time.  Useful for stripping debug, internal, or
 * admin groups before sharing a contract with less-privileged consumers.
 *
 * @typeParam T - The shape of the source contract.
 * @typeParam K - The union of group keys to remove.
 * @param contract - The contract to omit from.
 * @param groups - The group keys to exclude.
 * @returns A new frozen contract without the listed groups.
 *
 * @example
 * ```ts
 * const fullApi = defineApi({ todos: {...}, auth: {...}, admin: {...}, debug: {...} });
 *
 * // Strip internal groups before exporting to clients
 * const publicApi = omitGroups(fullApi, 'admin', 'debug');
 * // TypeScript: { todos: ..., auth: ... }
 * ```
 */
export function omitGroups<T extends ApiContract, K extends keyof T>(
    contract: T,
    ...groups: K[]
): Readonly<Omit<T, K>> {
    const excluded = new Set<string>(groups as string[]);
    const result = {} as Omit<T, K>;
    for (const key of Object.keys(contract)) {
        if (!excluded.has(key)) {
            (result as Record<string, ApiGroup>)[key] = contract[key];
            Object.freeze((result as Record<string, ApiGroup>)[key]);
        }
    }
    return Object.freeze(result);
}
