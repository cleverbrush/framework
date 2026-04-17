import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createClient } from './createQueryClient.js';

// ---------------------------------------------------------------------------
// Mock endpoint builder
// ---------------------------------------------------------------------------

function mockEndpoint(meta: {
    method: string;
    basePath: string;
    pathTemplate?:
        | string
        | { serialize: (p: Record<string, unknown>) => string };
}) {
    return {
        introspect: () => ({
            method: meta.method,
            basePath: meta.basePath,
            pathTemplate: meta.pathTemplate ?? ''
        })
    };
}

function createMockContract() {
    return {
        todos: {
            list: mockEndpoint({ method: 'GET', basePath: '/api/todos' }),
            get: mockEndpoint({
                method: 'GET',
                basePath: '/api/todos',
                pathTemplate: {
                    serialize: (p: Record<string, unknown>) => `/${p.id}`
                }
            }),
            create: mockEndpoint({ method: 'POST', basePath: '/api/todos' })
        },
        users: {
            me: mockEndpoint({ method: 'GET', basePath: '/api/users/me' })
        }
    } as any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
    });
}

function errorResponse(status: number, body?: unknown) {
    return new Response(body ? JSON.stringify(body) : null, {
        status,
        statusText: `HTTP ${status}`,
        headers: body ? { 'content-type': 'application/json' } : {}
    });
}

function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(
            QueryClientProvider,
            { client: queryClient },
            children
        );
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hooks integration', () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    let queryClient: QueryClient;
    let queryApi: ReturnType<typeof createQueryClient>;

    beforeEach(() => {
        mockFetch = vi.fn();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false }
            }
        });
        const contract = createMockContract();
        queryApi = createClient(contract, { fetch: mockFetch });
    });

    // -- useQuery -----------------------------------------------------------

    describe('useQuery', () => {
        test('fetches data and returns it', async () => {
            const todos = [{ id: 1, title: 'Test' }];
            mockFetch.mockResolvedValueOnce(jsonResponse(todos));

            const { result } = renderHook(
                () => queryApi.todos.list.useQuery(),
                { wrapper: createWrapper(queryClient) }
            );

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(todos);
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        test('passes args to the web client', async () => {
            const todo = { id: 42, title: 'Found' };
            mockFetch.mockResolvedValueOnce(jsonResponse(todo));

            const { result } = renderHook(
                () => queryApi.todos.get.useQuery({ params: { id: 42 } }),
                { wrapper: createWrapper(queryClient) }
            );

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(todo);
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        test('forwards query options like enabled', async () => {
            const { result } = renderHook(
                () => queryApi.todos.list.useQuery({ enabled: false }),
                { wrapper: createWrapper(queryClient) }
            );

            // Should not fetch when enabled is false
            expect(result.current.isLoading).toBe(false);
            expect(result.current.fetchStatus).toBe('idle');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('returns error on fetch failure', async () => {
            mockFetch.mockResolvedValueOnce(errorResponse(404));

            const { result } = renderHook(
                () => queryApi.todos.get.useQuery({ params: { id: 999 } }),
                { wrapper: createWrapper(queryClient) }
            );

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toBeDefined();
        });
    });

    // -- useMutation -------------------------------------------------------

    describe('useMutation', () => {
        test('calls web client on mutate', async () => {
            const created = { id: 1, title: 'New' };
            mockFetch.mockResolvedValueOnce(jsonResponse(created, 201));

            const { result } = renderHook(
                () => queryApi.todos.create.useMutation(),
                { wrapper: createWrapper(queryClient) }
            );

            await act(async () => {
                result.current.mutate({
                    body: { title: 'New' }
                } as any);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(created);
            expect(mockFetch).toHaveBeenCalledOnce();
        });

        test('calls onSuccess callback', async () => {
            const onSuccess = vi.fn();
            mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }, 201));

            const { result } = renderHook(
                () =>
                    queryApi.todos.create.useMutation({
                        onSuccess
                    }),
                { wrapper: createWrapper(queryClient) }
            );

            await act(async () => {
                result.current.mutate({ body: { title: 'Test' } } as any);
            });

            await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
        });

        test('calls onError callback on failure', async () => {
            const onError = vi.fn();
            mockFetch.mockResolvedValueOnce(errorResponse(400));

            const { result } = renderHook(
                () =>
                    queryApi.todos.create.useMutation({
                        onError
                    }),
                { wrapper: createWrapper(queryClient) }
            );

            await act(async () => {
                result.current.mutate({ body: { title: '' } } as any);
            });

            await waitFor(() => expect(onError).toHaveBeenCalledOnce());
        });
    });

    // -- prefetch -----------------------------------------------------------

    describe('prefetch', () => {
        test('populates the query cache', async () => {
            const todos = [{ id: 1, title: 'Cached' }];
            mockFetch.mockResolvedValueOnce(jsonResponse(todos));

            await queryApi.todos.list.prefetch(queryClient);

            // Data should now be in the cache
            const key = queryApi.todos.list.queryKey();
            const cached = queryClient.getQueryData(key);
            expect(cached).toEqual(todos);
        });

        test('prefetch with args populates the correct cache entry', async () => {
            const todo = { id: 5, title: 'Specific' };
            mockFetch.mockResolvedValueOnce(jsonResponse(todo));

            await queryApi.todos.get.prefetch(queryClient, {
                params: { id: 5 }
            });

            const key = queryApi.todos.get.queryKey({ params: { id: 5 } });
            const cached = queryClient.getQueryData(key);
            expect(cached).toEqual(todo);
        });
    });

    // -- queryKey -----------------------------------------------------------

    describe('queryKey', () => {
        test('group queryKey is prefix of endpoint queryKey', () => {
            const groupKey = queryApi.todos.queryKey();
            const endpointKey = queryApi.todos.list.queryKey();

            expect(groupKey.length).toBeLessThan(endpointKey.length);
            groupKey.forEach((segment: any, i: number) => {
                expect(endpointKey[i]).toEqual(segment);
            });
        });
    });
});
