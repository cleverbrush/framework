/**
 * `@cleverbrush/client` — typed HTTP client for `@cleverbrush/server` API contracts.
 *
 * For React + TanStack Query hooks, import from `@cleverbrush/client/react`.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client';
 * import { api } from 'todo-shared';
 *
 * const client = createClient(api, {
 *     baseUrl: 'https://api.example.com',
 *     getToken: () => localStorage.getItem('token'),
 * });
 *
 * const todos = await client.todos.list();
 * ```
 *
 * @packageDocumentation
 */

export { createClient } from './client.js';
export {
    ApiError,
    isApiError,
    isNetworkError,
    isTimeoutError,
    isWebError,
    NetworkError,
    TimeoutError,
    WebError
} from './errors.js';
export type { FetchLike, Middleware } from './middleware.js';
export {
    composeMiddleware,
    getPerCallOptions,
    PER_CALL_OPTIONS
} from './middleware.js';
export type {
    ApiContract,
    ClientHooks,
    ClientOptions,
    EndpointCall,
    EndpointCallArgs,
    EndpointResponse,
    PerCallOverrides,
    Subscription,
    SubscriptionCall,
    SubscriptionCallArgs,
    SubscriptionIncoming,
    SubscriptionOutgoing,
    TypedClient
} from './types.js';
