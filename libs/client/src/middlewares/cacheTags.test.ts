import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { EndpointMeta, FetchLike } from '../middleware.js';
import { cacheTags } from './cacheTags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTagMeta(
    tags: Array<{
        name: string;
        properties: Record<
            string,
            {
                getValue(root: any): {
                    value?: unknown;
                    success: boolean;
                };
            }
        >;
    }>,
    overrides: Partial<EndpointMeta> = {}
): EndpointMeta {
    return {
        group: 'test',
        endpoint: 'test',
        method: 'GET',
        path: '/api/test',
        basePath: '/api/test',
        collectionPath: '/api/test',
        baseUrl: '',
        fullCollectionUrl: '/api/test',
        pathParamNames: [],
        params: {},
        body: undefined,
        query: {},
        headers: {},
        operationId: null,
        tags: [],
        cacheTags: tags,
        ...overrides
    } as EndpointMeta;
}

function makeInit(meta: EndpointMeta, method = 'GET'): RequestInit {
    return {
        method,
        headers: {},
        __endpointMeta: meta
    } as any;
}

function makeConstAccessor(value: unknown) {
    return {
        getValue: () => ({ success: true, value })
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cacheTags middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // -- GET caching --------------------------------------------------------

    test('caches GET response within TTL', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(42) }
            }
        ]);
        const init = makeInit(meta);

        // First call — hits network
        const r1 = await mw('/api/test', init);
        expect(r1.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);

        // Second call within TTL — should be cached
        const r2 = await mw('/api/test', init);
        expect(r2.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('fetches again after TTL expiry', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 1 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 2 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );

        const mw = cacheTags({ defaultTtl: 1000 })(fetch);

        const meta = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(1) }
            }
        ]);
        const init = makeInit(meta);

        // First call
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(1);

        // Advance past TTL
        vi.advanceTimersByTime(1001);

        // Second call — should fetch again
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not cache when TTL is 0 (invalidates only)', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 0 })(fetch);

        const meta = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(42) }
            }
        ]);
        const init = makeInit(meta);

        await mw('/api/test', init);
        await mw('/api/test', init);

        // Both calls should hit the network
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('caches per unique key', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta1 = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(1) }
            }
        ]);
        const meta2 = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(2) }
            }
        ]);

        await mw('/api/test', makeInit(meta1));
        await mw('/api/test', makeInit(meta2));

        // Two different keys → two network calls
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not cache error responses', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('Not Found', { status: 404 }));

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(42) }
            }
        ]);
        const init = makeInit(meta);

        await mw('/api/test', init);
        await mw('/api/test', init);

        // Error responses not cached
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('uses per-tag TTL when configured', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 1 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 2 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );

        const mw = cacheTags({
            defaultTtl: 0,
            ttlByTag: { 'cached-tag': 2000 }
        })(fetch);

        const meta = makeTagMeta([
            {
                name: 'cached-tag',
                properties: { id: makeConstAccessor(42) }
            }
        ]);
        const init = makeInit(meta);

        // First call
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(1);

        // Within 2000ms TTL
        vi.advanceTimersByTime(500);
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(1);

        // Past TTL
        vi.advanceTimersByTime(1501);
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    // -- Invalidation -------------------------------------------------------

    test('invalidates cache on mutating requests by tag name prefix', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 1 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ v: 2 }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const getMeta = makeTagMeta([
            {
                name: 'test-tag',
                properties: { id: makeConstAccessor(42) }
            }
        ]);

        // GET — cache populated
        await mw('/api/test', makeInit(getMeta, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(1);

        // POST — should invalidate 'test-tag' keys
        await mw('/api/test', makeInit(getMeta, 'POST'));
        expect(fetch).toHaveBeenCalledTimes(2);

        // GET again — should re-fetch after invalidation
        await mw('/api/test', makeInit(getMeta, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('invalidates exact key and all prefixed variants', async () => {
        const fetch = vi.fn<FetchLike>().mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );

        const mw = cacheTags({ defaultTtl: 10000 })(fetch);

        // Cache entries with different ids under same tag
        const meta1 = makeTagMeta([
            { name: 'todo', properties: { id: makeConstAccessor(1) } }
        ]);
        const meta2 = makeTagMeta([
            { name: 'todo', properties: { id: makeConstAccessor(2) } }
        ]);

        await mw('/api/todo/1', makeInit(meta1, 'GET'));
        await mw('/api/todo/2', makeInit(meta2, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(2);

        // Mutate todo:2 — should invalidate 'todo' prefix = all todo keys
        await mw('/api/todo/2', makeInit(meta2, 'POST'));
        expect(fetch).toHaveBeenCalledTimes(3);

        // Both GETs should re-fetch
        await mw('/api/todo/1', makeInit(meta1, 'GET'));
        await mw('/api/todo/2', makeInit(meta2, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(5);
    });

    test('does not invalidate when no cache tags', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([]);
        const getInit = makeInit(meta, 'GET');

        // GET — passes through
        await mw('/api/test', getInit);
        expect(fetch).toHaveBeenCalledTimes(1);

        // POST — passes through
        await mw('/api/test', makeInit(meta, 'POST'));
        expect(fetch).toHaveBeenCalledTimes(2);

        // GET — still goes through (no caching without tags)
        await mw('/api/test', getInit);
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    // -- Simple tags --------------------------------------------------------

    test('simple tags (no properties) work as cache keys', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([{ name: 'global', properties: {} }]);

        await mw('/api/test', makeInit(meta, 'GET'));
        await mw('/api/test', makeInit(meta, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    // -- Multiple tags ------------------------------------------------------

    test('multiple tags: first matching cache hit is used', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([
            { name: 'tag-a', properties: { id: makeConstAccessor(1) } },
            { name: 'tag-b', properties: { id: makeConstAccessor(2) } }
        ]);

        // First request populates both tags
        await mw('/api/test', makeInit(meta, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(1);

        // Second request — tag-a key still valid
        await mw('/api/test', makeInit(meta, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    // -- Headers-based tag --------------------------------------------------

    test('uses headers in tag key computation', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        // Two requests with different tenant headers
        const meta1 = makeTagMeta(
            [
                {
                    name: 'tenant',
                    properties: {
                        tenant: {
                            getValue: (root: any) => ({
                                success: true,
                                value: root.headers?.['x-tenant']
                            })
                        }
                    }
                }
            ],
            { headers: { 'x-tenant': 'acme' } }
        );

        const meta2 = makeTagMeta(
            [
                {
                    name: 'tenant',
                    properties: {
                        tenant: {
                            getValue: (root: any) => ({
                                success: true,
                                value: root.headers?.['x-tenant']
                            })
                        }
                    }
                }
            ],
            { headers: { 'x-tenant': 'beta' } }
        );

        await mw('/api/test', makeInit(meta1, 'GET'));
        await mw('/api/test', makeInit(meta2, 'GET'));
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    // -- Pass-through for non-tagged requests -------------------------------

    test('passes through requests without cache tags', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const init: RequestInit = {
            method: 'GET',
            headers: {}
        };

        await mw('/api/test', init);
        await mw('/api/test', init);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    // -- Cloned responses are independent -----------------------------------

    test('cached responses are clones', async () => {
        const responseBody = JSON.stringify({ data: 'test' });
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(responseBody, {
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mw = cacheTags({ defaultTtl: 5000 })(fetch);

        const meta = makeTagMeta([
            { name: 'test', properties: { id: makeConstAccessor(1) } }
        ]);

        const r1 = await mw('/api/test', makeInit(meta, 'GET'));
        const body1 = await r1.text();

        const r2 = await mw('/api/test', makeInit(meta, 'GET'));
        const body2 = await r2.text();

        expect(body1).toBe(responseBody);
        expect(body2).toBe(responseBody);
        expect(r1).not.toBe(r2);
    });
});
