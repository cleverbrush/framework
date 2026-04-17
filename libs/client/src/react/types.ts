/**
 * Type definitions for `@cleverbrush/client/react`.
 *
 * These types map an API contract (from `@cleverbrush/server/contract`) to
 * a typed client whose groups and endpoints expose TanStack Query hooks
 * (`useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`)
 * with full type inference for arguments, responses, and errors.
 *
 * @module
 */

import type { SubscriptionBuilder } from '@cleverbrush/server/contract';
import type {
    InfiniteData,
    QueryClient,
    QueryKey,
    UseInfiniteQueryOptions,
    UseInfiniteQueryResult,
    UseMutationOptions,
    UseMutationResult,
    UseQueryOptions,
    UseQueryResult,
    UseSuspenseQueryOptions,
    UseSuspenseQueryResult
} from '@tanstack/react-query';
import type {
    ApiContract,
    EndpointCall,
    EndpointCallArgs,
    EndpointResponse,
    SubscriptionCall,
    WebError
} from '../index.js';

// ---------------------------------------------------------------------------
// Hook option types — strip keys managed by the library
// ---------------------------------------------------------------------------

/**
 * Options for `useQuery` hooks, with `queryKey` and `queryFn` managed
 * automatically by the library.
 *
 * @typeParam TData - The endpoint's success response type.
 */
export type QueryHookOptions<TData> = Omit<
    UseQueryOptions<TData, WebError, TData, QueryKey>,
    'queryKey' | 'queryFn'
>;

/**
 * Options for `useSuspenseQuery` hooks, with `queryKey` and `queryFn`
 * managed automatically.
 *
 * @typeParam TData - The endpoint's success response type.
 */
export type SuspenseQueryHookOptions<TData> = Omit<
    UseSuspenseQueryOptions<TData, WebError, TData, QueryKey>,
    'queryKey' | 'queryFn'
>;

/**
 * Options for `useInfiniteQuery` hooks. You must provide
 * `initialPageParam` and `getNextPageParam` as required by TanStack Query.
 * `queryKey` and `queryFn` are managed automatically.
 *
 * @typeParam TData - The endpoint's success response type.
 * @typeParam TPageParam - The page parameter type (e.g. `number`).
 */
export type InfiniteQueryHookOptions<TData, TPageParam> = Omit<
    UseInfiniteQueryOptions<
        TData,
        WebError,
        InfiniteData<TData, TPageParam>,
        QueryKey,
        TPageParam
    >,
    'queryKey' | 'queryFn'
>;

/**
 * Options for `useMutation` hooks, with `mutationFn` managed automatically.
 *
 * @typeParam TData - The endpoint's success response type.
 * @typeParam TArgs - The endpoint's call arguments type.
 */
export type MutationHookOptions<TData, TArgs> = Omit<
    UseMutationOptions<TData, WebError, TArgs>,
    'mutationFn'
>;

// ---------------------------------------------------------------------------
// Per-endpoint hook object
// ---------------------------------------------------------------------------

/**
 * The set of TanStack Query hooks and helpers exposed for each endpoint
 * on the typed query client.
 *
 * When `TArgs` is `undefined` (endpoint requires no arguments), the hooks
 * can be called without an arguments parameter.
 *
 * @typeParam TArgs - The endpoint's call arguments type (`EndpointCallArgs<E>`).
 * @typeParam TData - The endpoint's success response type (`EndpointResponse<E>`).
 */
export type EndpointQueryHooks<TArgs, TData> = TArgs extends undefined
    ? {
          /**
           * Fetches data using TanStack Query's `useQuery`.
           * @param options - Optional query options (e.g. `enabled`, `staleTime`).
           */
          useQuery(
              options?: QueryHookOptions<TData>
          ): UseQueryResult<TData, WebError>;

          /**
           * Fetches data using `useSuspenseQuery` — suspends the component
           * until data is available.
           * @param options - Optional query options.
           */
          useSuspenseQuery(
              options?: SuspenseQueryHookOptions<TData>
          ): UseSuspenseQueryResult<TData, WebError>;

          /**
           * Performs a mutation (create/update/delete) via `useMutation`.
           * @param options - Optional mutation options (e.g. `onSuccess`, `onError`).
           */
          useMutation(
              options?: MutationHookOptions<TData, void>
          ): UseMutationResult<TData, WebError, void>;

          /**
           * Returns the query key for this endpoint (without arguments).
           * Useful for manual cache operations like `invalidateQueries`.
           */
          queryKey(): QueryKey;

          /**
           * Prefetches data into the query cache. Use for SSR/RSC or
           * hover-based prefetching.
           * @param queryClient - The TanStack `QueryClient` instance.
           */
          prefetch(queryClient: QueryClient): Promise<void>;
      }
    : {
          /**
           * Fetches data using TanStack Query's `useQuery`.
           * @param args - The endpoint call arguments (params, query, body, headers).
           * @param options - Optional query options (e.g. `enabled`, `staleTime`).
           */
          useQuery(
              args?: TArgs,
              options?: QueryHookOptions<TData>
          ): UseQueryResult<TData, WebError>;

          /**
           * Fetches data using `useSuspenseQuery` — suspends the component
           * until data is available.
           * @param args - The endpoint call arguments.
           * @param options - Optional query options.
           */
          useSuspenseQuery(
              args?: TArgs,
              options?: SuspenseQueryHookOptions<TData>
          ): UseSuspenseQueryResult<TData, WebError>;

          /**
           * Fetches paginated data using `useInfiniteQuery`.
           * @param getArgs - A function that receives the page param and returns endpoint arguments.
           * @param options - Infinite query options (must include `initialPageParam` and `getNextPageParam`).
           */
          useInfiniteQuery<TPageParam = unknown>(
              getArgs: (pageParam: TPageParam) => TArgs,
              options: InfiniteQueryHookOptions<TData, TPageParam>
          ): UseInfiniteQueryResult<InfiniteData<TData, TPageParam>, WebError>;

          /**
           * Performs a mutation (create/update/delete) via `useMutation`.
           * @param options - Optional mutation options (e.g. `onSuccess`, `onError`).
           */
          useMutation(
              options?: MutationHookOptions<TData, TArgs>
          ): UseMutationResult<TData, WebError, TArgs>;

          /**
           * Returns the query key for this endpoint with the given arguments.
           * Useful for manual cache operations like `invalidateQueries`.
           * @param args - Optional endpoint arguments to include in the key.
           */
          queryKey(args?: TArgs): QueryKey;

          /**
           * Prefetches data into the query cache. Use for SSR/RSC or
           * hover-based prefetching.
           * @param queryClient - The TanStack `QueryClient` instance.
           * @param args - The endpoint call arguments.
           */
          prefetch(queryClient: QueryClient, args: TArgs): Promise<void>;
      };

// ---------------------------------------------------------------------------
// Group-level type — adds a group-wide queryKey() method
// ---------------------------------------------------------------------------

/**
 * A single API group on the typed query client.
 *
 * Each endpoint in the group is mapped to its `EndpointQueryHooks`.
 * The group also exposes a `queryKey()` method for group-level
 * cache invalidation.
 */
export type TypedQueryGroup<TGroup extends Record<string, any>> = {
    [E in keyof TGroup]: EndpointQueryHooks<
        EndpointCallArgs<TGroup[E]>,
        EndpointResponse<TGroup[E]>
    >;
} & {
    /**
     * Returns a query key prefix for this entire group.
     * Use with `queryClient.invalidateQueries()` to invalidate all
     * queries in the group at once.
     *
     * @example
     * ```ts
     * queryClient.invalidateQueries({
     *     queryKey: queryApi.todos.queryKey()
     * });
     * ```
     */
    queryKey(): QueryKey;
};

// ---------------------------------------------------------------------------
// TypedQueryClient — the top-level type
// ---------------------------------------------------------------------------

/**
 * Maps an API contract to a fully typed query client.
 *
 * Each group becomes a namespace containing endpoint hooks, plus a
 * group-level `queryKey()` method for bulk invalidation.
 *
 * @typeParam T - The exact API contract type from `defineApi()`.
 *
 * @example
 * ```ts
 * const queryApi = createQueryClient(api, { baseUrl: '/api' });
 *
 * // In a component:
 * const { data } = queryApi.todos.list.useQuery({ query: { page: 1 } });
 * const mutation = queryApi.todos.create.useMutation({
 *     onSuccess: () => {
 *         queryClient.invalidateQueries({
 *             queryKey: queryApi.todos.queryKey()
 *         });
 *     }
 * });
 * ```
 */
export type TypedQueryClient<T extends ApiContract> = {
    [G in keyof T]: TypedQueryGroup<T[G]>;
};

// ---------------------------------------------------------------------------
// Unified client types — callable endpoints with hooks attached
// ---------------------------------------------------------------------------

/**
 * A single endpoint on the unified client.
 *
 * The endpoint is **callable** (direct HTTP fetch, same as `@cleverbrush/web`)
 * and also exposes TanStack Query hooks (`useQuery`, `useMutation`, etc.)
 * as properties on the same object.
 *
 * @typeParam E - An `EndpointBuilder` instance type.
 *
 * @example
 * ```ts
 * // Direct fetch
 * const todos = await client.todos.list();
 *
 * // React Query hooks
 * const { data } = client.todos.list.useQuery();
 * const mutation = client.todos.create.useMutation();
 *
 * // Streaming
 * for await (const line of client.todos.export.stream()) { ... }
 * ```
 */
export type UnifiedEndpointCall<E> = EndpointCall<E> &
    EndpointQueryHooks<EndpointCallArgs<E>, EndpointResponse<E>>;

/**
 * Resolves the correct unified type for a contract member:
 * - `SubscriptionBuilder` → `SubscriptionCall` (no query hooks)
 * - `EndpointBuilder` → `UnifiedEndpointCall` (callable + hooks)
 */
type UnifiedMemberCall<E> =
    E extends SubscriptionBuilder<any, any, any, any, any, any, any, any>
        ? SubscriptionCall<E>
        : UnifiedEndpointCall<E>;

/**
 * A group on the unified client.
 *
 * Each endpoint is a {@link UnifiedEndpointCall} — callable with hooks.
 * The group also exposes a `queryKey()` method for bulk cache invalidation.
 */
export type UnifiedGroup<TGroup extends Record<string, any>> = {
    [E in keyof TGroup]: UnifiedMemberCall<TGroup[E]>;
} & {
    /** Returns a query key prefix for this entire group. */
    queryKey(): QueryKey;
};

/**
 * Maps an API contract to a unified client where every endpoint is both
 * a callable function (direct HTTP fetch) and an object with TanStack
 * Query hooks.
 *
 * @typeParam T - The exact API contract type from `defineApi()`.
 *
 * @example
 * ```ts
 * const client = createClient(api, { baseUrl: '/api' });
 *
 * // Direct fetch
 * const todos = await client.todos.list();
 *
 * // React hooks
 * const { data } = client.todos.list.useQuery();
 * ```
 */
export type UnifiedClient<T extends ApiContract> = {
    [G in keyof T]: UnifiedGroup<T[G]>;
};
