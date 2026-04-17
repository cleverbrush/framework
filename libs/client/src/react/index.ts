/**
 * `@cleverbrush/client/react` — TanStack Query integration for the typed
 * HTTP client.
 *
 * Creates a unified client where every endpoint is **both** a callable
 * function (direct HTTP fetch) and an object with TanStack Query hooks —
 * no code generation, zero boilerplate.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client/react';
 * import { api } from './contract';
 *
 * export const client = createClient(api, {
 *     baseUrl: '/api',
 *     getToken: () => localStorage.getItem('token'),
 * });
 *
 * // Direct fetch
 * const todos = await client.todos.list();
 *
 * // React hooks
 * const { data } = client.todos.list.useQuery();
 * ```
 *
 * @packageDocumentation
 */

export { createClient } from './createClient.js';
export {
    buildGroupQueryKey,
    buildQueryKey,
    QUERY_KEY_PREFIX
} from './queryKeys.js';
export type {
    EndpointQueryHooks,
    InfiniteQueryHookOptions,
    MutationHookOptions,
    QueryHookOptions,
    SuspenseQueryHookOptions,
    TypedQueryClient,
    TypedQueryGroup,
    UnifiedClient,
    UnifiedEndpointCall,
    UnifiedGroup
} from './types.js';
