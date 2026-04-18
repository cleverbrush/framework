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
