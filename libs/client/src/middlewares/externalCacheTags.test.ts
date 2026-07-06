import { describe, expect, test, vi } from 'vitest';
import type { EndpointMeta, FetchLike } from '../middleware.js';
import { externalCacheTags } from './externalCacheTags.js';

function makeMeta(overrides: Partial<EndpointMeta> = {}): EndpointMeta {
    return {
        group: 'expenses',
        endpoint: 'update',
        method: 'PATCH',
        path: '/api/expenses/:id',
        basePath: '/api/expenses/:id',
        collectionPath: '/api/expenses',
        baseUrl: '',
        fullCollectionUrl: '/api/expenses',
        pathParamNames: ['id'],
        params: { id: 42 },
        body: undefined,
        query: {},
        headers: {},
        operationId: null,
        tags: [],
        cacheTags: [
            {
                name: 'expense',
                properties: {
                    id: {
                        getValue: root => ({
                            success: true,
                            value: root.params.id
                        })
                    }
                }
            }
        ],
        ...overrides
    };
}

describe('externalCacheTags middleware', () => {
    test('invalidates base and dynamic tags after a successful mutation', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response(null, { status: 204 }));
        const invalidateTag = vi.fn();
        const middleware = externalCacheTags({ invalidateTag })(fetch);

        const response = await middleware('/api/expenses/42', {
            method: 'PATCH',
            __endpointMeta: makeMeta()
        } as any);

        expect(response.status).toBe(204);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(invalidateTag).toHaveBeenCalledWith('expense');
        expect(invalidateTag).toHaveBeenCalledWith('expense:id=42');
        expect(invalidateTag).toHaveBeenCalledTimes(2);
    });

    test('does not invalidate failed mutation responses by default', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('bad', { status: 400 }));
        const invalidateTag = vi.fn();
        const middleware = externalCacheTags({ invalidateTag })(fetch);

        await middleware('/api/expenses/42', {
            method: 'PATCH',
            __endpointMeta: makeMeta()
        } as any);

        expect(invalidateTag).not.toHaveBeenCalled();
    });

    test('does not invalidate reads or requests without cache metadata', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response(null, { status: 200 }));
        const invalidateTag = vi.fn();
        const middleware = externalCacheTags({ invalidateTag })(fetch);

        await middleware('/api/expenses/42', {
            method: 'GET',
            __endpointMeta: makeMeta({ method: 'GET' })
        } as any);
        await middleware('/api/expenses/42', { method: 'PATCH' });

        expect(invalidateTag).not.toHaveBeenCalled();
    });

    test('can invalidate only computed dynamic keys', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response(null, { status: 200 }));
        const invalidateTag = vi.fn();
        const middleware = externalCacheTags({
            invalidateTag,
            invalidateBaseTags: false
        })(fetch);

        await middleware('/api/expenses/42', {
            method: 'DELETE',
            __endpointMeta: makeMeta()
        } as any);

        expect(invalidateTag).toHaveBeenCalledWith('expense:id=42');
        expect(invalidateTag).toHaveBeenCalledTimes(1);
    });
});
