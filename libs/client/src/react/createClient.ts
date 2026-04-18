/**
 * Factory functions for creating typed clients with TanStack Query support.
 *
 * `createClient()` wraps the core `createClient()` and returns a two-level
 * proxy where each endpoint is **both** a callable function (direct HTTP
 * fetch) **and** an object with TanStack Query hooks (`useQuery`,
 * `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`) plus helper
 * methods (`queryKey`, `prefetch`).
 *
 * @module
 */

import {
    type ApiContract,
    type ClientOptions,
    createClient as createWebClient
} from '../index.js';
import {
    createPrefetch,
    createQueryKey,
    createUseInfiniteQuery,
    createUseMutation,
    createUseQuery,
    createUseSuspenseQuery
} from './hooks.js';
import { buildGroupQueryKey } from './queryKeys.js';
import type { UnifiedClient } from './types.js';

/**
 * Creates a unified typed client from an API contract.
 *
 * Each endpoint on the returned object is **callable** (direct HTTP fetch,
 * identical to `@cleverbrush/web`'s `createClient`) and also exposes
 * TanStack Query hooks as properties:
 *
 * - **Call directly**: `await client.todos.list()` — returns a Promise
 * - **useQuery**: `client.todos.list.useQuery(args?, options?)` — reactive fetch
 * - **useSuspenseQuery**: `client.todos.list.useSuspenseQuery(args?, options?)` — Suspense fetch
 * - **useInfiniteQuery**: `client.todos.list.useInfiniteQuery(getArgs, options)` — paginated fetch
 * - **useMutation**: `client.todos.create.useMutation(options?)` — mutations
 * - **queryKey**: `client.todos.list.queryKey(args?)` — cache key for manual ops
 * - **prefetch**: `client.todos.list.prefetch(queryClient, args?)` — pre-populate cache
 * - **stream**: `client.todos.export.stream(args?)` — NDJSON streaming
 *
 * Each group also exposes a `queryKey()` method for group-level
 * cache invalidation.
 *
 * @param contract - An API contract created with `defineApi()`.
 * @param options - Client options passed to `@cleverbrush/web`'s `createClient()`.
 * @returns A fully typed unified client proxy.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client/react';
 * import { api } from './contract';
 *
 * const client = createClient(api, {
 *     baseUrl: 'https://api.example.com',
 *     getToken: () => localStorage.getItem('token'),
 * });
 *
 * // Direct fetch
 * const todos = await client.todos.list();
 *
 * // React Query hooks
 * function TodoList() {
 *     const { data } = client.todos.list.useQuery();
 *     const mutation = client.todos.create.useMutation({
 *         onSuccess: () => {
 *             queryClient.invalidateQueries({
 *                 queryKey: client.todos.queryKey()
 *             });
 *         }
 *     });
 * }
 *
 * // Streaming
 * for await (const line of client.todos.export.stream()) { ... }
 * ```
 */
export function createClient<T extends ApiContract>(
    contract: T,
    options?: ClientOptions
): UnifiedClient<T> {
    const webClient = createWebClient(contract, options) as any;

    // Cache unified endpoint objects for stable React hook references
    const endpointCache = new Map<string, any>();

    function getUnifiedEndpoint(group: string, endpoint: string): any {
        const cacheKey = `${group}.${endpoint}`;
        let unified = endpointCache.get(cacheKey);
        if (!unified) {
            // Access the web client's endpoint callable (function + .stream)
            const webEndpoint = webClient[group][endpoint];

            // Create a wrapper function that delegates to the web endpoint
            const call = (args?: any) => webEndpoint(args);

            // Attach streaming from the web client
            call.stream = (...args: any[]) => webEndpoint.stream(...args);

            // Attach TanStack Query hooks
            call.useQuery = createUseQuery(webClient, group, endpoint);
            call.useSuspenseQuery = createUseSuspenseQuery(
                webClient,
                group,
                endpoint
            );
            call.useInfiniteQuery = createUseInfiniteQuery(
                webClient,
                group,
                endpoint
            );
            call.useMutation = createUseMutation(webClient, group, endpoint);
            call.queryKey = createQueryKey(group, endpoint);
            call.prefetch = createPrefetch(webClient, group, endpoint);

            endpointCache.set(cacheKey, call);
            unified = call;
        }
        return unified;
    }

    // Two-level proxy mirroring @cleverbrush/web's client.ts pattern
    return new Proxy(Object.create(null) as UnifiedClient<T>, {
        get(_target, groupName: string) {
            const group = (contract as any)[groupName];
            if (!group) return undefined;

            return new Proxy(Object.create(null), {
                get(_groupTarget, prop: string) {
                    // Group-level queryKey()
                    if (prop === 'queryKey') {
                        return () => buildGroupQueryKey(groupName);
                    }

                    if (!Object.hasOwn(group, prop)) return undefined;

                    return getUnifiedEndpoint(groupName, prop);
                }
            });
        }
    });
}
