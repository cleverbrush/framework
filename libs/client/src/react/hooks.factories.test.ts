import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createPrefetch,
    createUseInfiniteQuery,
    createUseMutation,
    createUseQuery,
    createUseSuspenseQuery
} from './hooks.js';

const mocks = vi.hoisted(() => ({
    query: vi.fn(o => o),
    suspense: vi.fn(o => o),
    infinite: vi.fn(o => o),
    mutation: vi.fn(o => o),
    invalidate: vi.fn()
}));
vi.mock('@tanstack/react-query', () => ({
    useQuery: mocks.query,
    useSuspenseQuery: mocks.suspense,
    useInfiniteQuery: mocks.infinite,
    useMutation: mocks.mutation,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidate })
}));
describe('endpoint hook factories', () => {
    const call = vi.fn().mockResolvedValue('response');
    const client = { items: { list: call, create: call } };
    beforeEach(() => vi.clearAllMocks());
    it.each([
        undefined,
        null,
        3,
        { query: { page: 1 } },
        ...[
            'enabled',
            'staleTime',
            'gcTime',
            'refetchInterval',
            'retry',
            'select',
            'placeholderData'
        ].map(key => ({ [key]: false }))
    ])('distinguishes query arguments from options: %j', async value => {
        const hook = createUseQuery(client, 'items', 'list');
        const options = hook(value);
        expect(await options.queryFn()).toBe('response');
        const isOptions =
            value && typeof value === 'object' && !('query' in value);
        expect(call).toHaveBeenCalledWith(isOptions ? undefined : value);
        expect(options.queryKey.slice(0, 3)).toEqual([
            '@cleverbrush',
            'items',
            'list'
        ]);
    });
    it('executes suspense queries, argument queries and paginated query functions', async () => {
        const args = { query: { page: 2 } };
        await createUseQuery(
            client,
            'items',
            'list'
        )(args, { enabled: true }).queryFn();
        expect(call).toHaveBeenLastCalledWith(args);
        await createUseSuspenseQuery(
            client,
            'items',
            'list'
        )(args, { staleTime: 100 }).queryFn();
        expect(call).toHaveBeenLastCalledWith(args);
        await createUseSuspenseQuery(
            client,
            'items',
            'list'
        )({ staleTime: 100 }).queryFn();
        expect(call).toHaveBeenLastCalledWith(undefined);
        await createUseInfiniteQuery(
            client,
            'items',
            'list'
        )(page => ({ query: { page } }), { initialPageParam: 1 }).queryFn({
            pageParam: 3
        });
        expect(call).toHaveBeenLastCalledWith({ query: { page: 3 } });
    });
    it('invalidates only tagged mutations and preserves success callbacks', async () => {
        const success = vi.fn();
        const hook = createUseMutation(client, 'items', 'create', ['items']);
        const options = hook({ onSuccess: success });
        await options.mutationFn({ body: { name: 'new' } });
        options.onSuccess('saved', {}, undefined);
        expect(success).toHaveBeenCalledWith('saved', {}, undefined);
        expect(mocks.invalidate).toHaveBeenCalledWith({
            queryKey: ['@cleverbrush', 'items']
        });
        mocks.invalidate.mockClear();
        createUseMutation(client, 'items', 'create')().onSuccess();
        createUseMutation(client, 'items', 'create', [])().onSuccess();
        expect(mocks.invalidate).not.toHaveBeenCalled();
    });
    it('prefetches using the same query arguments and key', async () => {
        const prefetchQuery = vi.fn(async opts => {
            await opts.queryFn();
        });
        await createPrefetch(
            client,
            'items',
            'list'
        )({ prefetchQuery }, { query: { page: 2 } });
        expect(call).toHaveBeenCalledWith({ query: { page: 2 } });
        expect(prefetchQuery.mock.calls[0][0].queryKey).toEqual(
            createUseQuery(client, 'items', 'list')({ query: { page: 2 } })
                .queryKey
        );
    });
});
