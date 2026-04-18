/**
 * Hook factory functions for `@cleverbrush/client/react`.
 *
 * Each factory creates a hook function for a specific (group, endpoint)
 * pair.  The hooks delegate data fetching to the underlying typed client
 * and automatically manage query keys.
 *
 * @module
 */

import {
    type QueryKey,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useSuspenseQuery
} from '@tanstack/react-query';
import type { WebError } from '../index.js';
import { buildQueryKey } from './queryKeys.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type AnyClient = Record<string, Record<string, (args?: any) => Promise<any>>>;

function callEndpoint(
    webClient: AnyClient,
    group: string,
    endpoint: string,
    args: unknown
): Promise<any> {
    return webClient[group]![endpoint]!(args as any);
}

// ---------------------------------------------------------------------------
// useQuery factory
// ---------------------------------------------------------------------------

/**
 * Creates a `useQuery` hook for the given endpoint.
 *
 * @internal
 */
export function createUseQuery(
    webClient: AnyClient,
    group: string,
    endpoint: string
) {
    return function hookUseQuery(argsOrOptions?: any, maybeOptions?: any): any {
        // Two-arg form: useQuery(args, options?)
        // One-arg form: useQuery(argsOrOptions) — heuristic to distinguish args vs options
        // Zero-arg form: useQuery()
        let args: any;
        let options: any;

        if (maybeOptions !== undefined) {
            // Two args: first is args, second is options
            args = argsOrOptions;
            options = maybeOptions;
        } else if (argsOrOptions === undefined) {
            // Zero args
            args = undefined;
            options = undefined;
        } else if (isTanStackOptions(argsOrOptions)) {
            // One arg that looks like TanStack options
            args = undefined;
            options = argsOrOptions;
        } else {
            // One arg that looks like endpoint args
            args = argsOrOptions;
            options = undefined;
        }

        const queryKey = buildQueryKey(group, endpoint, args) as QueryKey;
        return useQuery<any, WebError>({
            ...options,
            queryKey,
            queryFn: () => callEndpoint(webClient, group, endpoint, args)
        });
    };
}

// ---------------------------------------------------------------------------
// useSuspenseQuery factory
// ---------------------------------------------------------------------------

/**
 * Creates a `useSuspenseQuery` hook for the given endpoint.
 *
 * @internal
 */
export function createUseSuspenseQuery(
    webClient: AnyClient,
    group: string,
    endpoint: string
) {
    return function hookUseSuspenseQuery(
        argsOrOptions?: any,
        maybeOptions?: any
    ): any {
        const args = maybeOptions !== undefined ? argsOrOptions : undefined;
        const options =
            maybeOptions !== undefined ? maybeOptions : argsOrOptions;

        const queryKey = buildQueryKey(group, endpoint, args) as QueryKey;
        return useSuspenseQuery<any, WebError>({
            ...options,
            queryKey,
            queryFn: () => callEndpoint(webClient, group, endpoint, args)
        });
    };
}

// ---------------------------------------------------------------------------
// useInfiniteQuery factory
// ---------------------------------------------------------------------------

/**
 * Creates a `useInfiniteQuery` hook for the given endpoint.
 *
 * @internal
 */
export function createUseInfiniteQuery(
    webClient: AnyClient,
    group: string,
    endpoint: string
) {
    return function hookUseInfiniteQuery(
        getArgs: (pageParam: any) => any,
        options: any
    ): any {
        const queryKey = buildQueryKey(
            group,
            endpoint,
            '__infinite__'
        ) as QueryKey;
        return useInfiniteQuery<any, WebError>({
            ...options,
            queryKey,
            queryFn: ({ pageParam }) => {
                const args = getArgs(pageParam);
                return callEndpoint(webClient, group, endpoint, args);
            }
        });
    };
}

// ---------------------------------------------------------------------------
// useMutation factory
// ---------------------------------------------------------------------------

/**
 * Creates a `useMutation` hook for the given endpoint.
 *
 * @internal
 */
export function createUseMutation(
    webClient: AnyClient,
    group: string,
    endpoint: string
) {
    return function hookUseMutation(options?: any): any {
        return useMutation<any, WebError, any>({
            ...options,
            mutationFn: (args: any) =>
                callEndpoint(webClient, group, endpoint, args)
        });
    };
}

// ---------------------------------------------------------------------------
// queryKey factory
// ---------------------------------------------------------------------------

/**
 * Creates a `queryKey` function for the given endpoint.
 *
 * @internal
 */
export function createQueryKey(group: string, endpoint: string) {
    return function getQueryKey(args?: any): QueryKey {
        return buildQueryKey(group, endpoint, args) as QueryKey;
    };
}

// ---------------------------------------------------------------------------
// prefetch factory
// ---------------------------------------------------------------------------

/**
 * Creates a `prefetch` function for the given endpoint.
 *
 * @internal
 */
export function createPrefetch(
    webClient: AnyClient,
    group: string,
    endpoint: string
) {
    return function prefetch(
        queryClientOrArgs?: any,
        maybeArgs?: any
    ): Promise<void> {
        // No-args endpoint: prefetch(queryClient)
        // With-args endpoint: prefetch(queryClient, args)
        const queryClient = queryClientOrArgs;
        const args = maybeArgs;
        const queryKey = buildQueryKey(group, endpoint, args) as QueryKey;
        return queryClient.prefetchQuery({
            queryKey,
            queryFn: () => callEndpoint(webClient, group, endpoint, args)
        });
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Heuristic: if an object has TanStack Query option keys, treat it as
 * options rather than endpoint args.
 */
function isTanStackOptions(obj: any): boolean {
    if (obj == null || typeof obj !== 'object') return false;
    return (
        'enabled' in obj ||
        'staleTime' in obj ||
        'gcTime' in obj ||
        'refetchInterval' in obj ||
        'retry' in obj ||
        'select' in obj ||
        'placeholderData' in obj
    );
}
