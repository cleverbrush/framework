import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useOptimisticMutation } from './optimisticMutation.js';

describe('useOptimisticMutation', () => {
    let queryClient: QueryClient;

    function createWrapper() {
        return function Wrapper({ children }: { children: ReactNode }) {
            return createElement(
                QueryClientProvider,
                { client: queryClient },
                children
            );
        };
    }

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false }
            }
        });

        // Seed some initial data
        const initialData = [
            { id: 1, title: 'Buy milk', completed: false },
            { id: 2, title: 'Walk dog', completed: true }
        ];
        queryClient.setQueryData(['todos', 'list'], initialData);
    });

    test('applies optimistic update before mutation resolves', async () => {
        const mutationFn = vi
            .fn()
            .mockResolvedValue({ id: 1, title: 'Buy milk', completed: true });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any, args: any) =>
                        (oldData ?? []).map((t: any) =>
                            t.id === args.params.id
                                ? { ...t, completed: args.body.completed }
                                : t
                        )
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({
                params: { id: 1 },
                body: { completed: true }
            });
        });

        // The optimistic update should have been applied immediately
        const cached = queryClient.getQueryData(['todos', 'list']) as any[];
        expect(cached[0].completed).toBe(true);
    });

    test('rolls back on error', async () => {
        const mutationFn = vi.fn().mockRejectedValue(new Error('Server error'));

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any, args: any) =>
                        (oldData ?? []).map((t: any) =>
                            t.id === args.params.id
                                ? { ...t, completed: args.body.completed }
                                : t
                        )
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({
                params: { id: 1 },
                body: { completed: true }
            });
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        // Should have rolled back to original state
        const cached = queryClient.getQueryData(['todos', 'list']) as any[];
        expect(cached[0].completed).toBe(false);
    });

    test('cancels in-flight queries before optimistic update', async () => {
        const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');
        const mutationFn = vi.fn().mockResolvedValue({ ok: true });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'Test' } } as any);
        });

        expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['todos', 'list'] });
    });

    test('calls onSuccess callback when mutation succeeds', async () => {
        const onSuccess = vi.fn();
        const mutationFn = vi.fn().mockResolvedValue({ id: 3, title: 'New' });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData,
                    onSuccess
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'New' } } as any);
        });

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    });

    test('calls onError callback when mutation fails', async () => {
        const onError = vi.fn();
        const mutationFn = vi.fn().mockRejectedValue(new Error('Failed'));

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData,
                    onError
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'Fail' } } as any);
        });

        await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    });

    test('calls onSettled callback after mutation completes', async () => {
        const onSettled = vi.fn();
        const mutationFn = vi.fn().mockResolvedValue({ ok: true });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData,
                    onSettled
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'Test' } } as any);
        });

        await waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    });

    test('invalidates query cache on settled', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
        const mutationFn = vi.fn().mockResolvedValue({ ok: true });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'Test' } } as any);
        });

        await waitFor(() => {
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ['todos', 'list']
            });
        });
    });

    test('handles undefined cache data gracefully', async () => {
        queryClient.removeQueries({ queryKey: ['todos', 'list'] });
        const mutationFn = vi.fn().mockResolvedValue({ ok: true });

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (_oldData: any, args: any) => {
                        return [args.body];
                    }
                }),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            result.current.mutate({ body: { title: 'First' } } as any);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const cached = queryClient.getQueryData(['todos', 'list']) as any[];
        expect(cached).toEqual([{ title: 'First' }]);
    });

    test('returns standard UseMutationResult shape', () => {
        const mutationFn = vi.fn();

        const { result } = renderHook(
            () =>
                useOptimisticMutation(mutationFn, {
                    queryKey: ['todos', 'list'],
                    optimisticUpdate: (oldData: any) => oldData
                }),
            { wrapper: createWrapper() }
        );

        expect(result.current).toHaveProperty('mutate');
        expect(result.current).toHaveProperty('mutateAsync');
        expect(result.current).toHaveProperty('isPending');
        expect(result.current).toHaveProperty('isSuccess');
        expect(result.current).toHaveProperty('isError');
        expect(result.current).toHaveProperty('data');
        expect(result.current).toHaveProperty('error');
    });
});
