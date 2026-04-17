import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { FetchLike } from '../middleware.js';
import { throttlingCache } from './cache.js';

describe('throttlingCache middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('caches GET response within TTL', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(
                new Response(JSON.stringify({ data: 1 }), { status: 200 })
            );
        const mw = throttlingCache({ throttle: 5000 })(fetch);

        const r1 = await mw('/api/items', { method: 'GET' });
        const r2 = await mw('/api/items', { method: 'GET' });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(await r1.json()).toEqual({ data: 1 });
        expect(await r2.json()).toEqual({ data: 1 });
    });

    test('cache miss after TTL expires', async () => {
        let callCount = 0;
        const fetch = vi.fn<FetchLike>().mockImplementation(() => {
            callCount++;
            return Promise.resolve(
                new Response(JSON.stringify({ n: callCount }), { status: 200 })
            );
        });
        const mw = throttlingCache({ throttle: 1000 })(fetch);

        await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(1);

        // Advance past TTL
        vi.advanceTimersByTime(1001);

        const r2 = await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(await r2.json()).toEqual({ n: 2 });
    });

    test('does not cache non-GET requests by default', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = throttlingCache({ throttle: 5000 })(fetch);

        await mw('/api/items', { method: 'POST', body: '{}' });
        await mw('/api/items', { method: 'POST', body: '{}' });

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not cache error responses by default', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(new Response('error', { status: 500 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        const mw = throttlingCache({ throttle: 5000 })(fetch);

        const r1 = await mw('/api/items', { method: 'GET' });
        expect(r1.status).toBe(500);

        const r2 = await mw('/api/items', { method: 'GET' });
        expect(r2.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('invalidates cache on mutating request', async () => {
        let callCount = 0;
        const fetch = vi.fn<FetchLike>().mockImplementation(() => {
            callCount++;
            return Promise.resolve(
                new Response(JSON.stringify({ n: callCount }), { status: 200 })
            );
        });
        const mw = throttlingCache({
            throttle: 5000,
            invalidate: (url, init) => {
                const method = (init.method ?? 'GET').toUpperCase();
                if (method !== 'GET') return `GET@${url}`;
                return null;
            }
        })(fetch);

        // Cache the GET
        const r1 = await mw('/api/items', { method: 'GET' });
        expect(await r1.json()).toEqual({ n: 1 });
        expect(fetch).toHaveBeenCalledTimes(1);

        // POST invalidates the cache
        await mw('/api/items', { method: 'POST', body: '{}' });
        expect(fetch).toHaveBeenCalledTimes(2);

        // Next GET is a cache miss
        const r3 = await mw('/api/items', { method: 'GET' });
        expect(await r3.json()).toEqual({ n: 3 });
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('supports custom key function', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        // Use only base URL (ignore query params)
        const mw = throttlingCache({
            throttle: 5000,
            key: url => url.split('?')[0]
        })(fetch);

        await mw('/api/items?page=1', { method: 'GET' });
        await mw('/api/items?page=2', { method: 'GET' });

        // Same key → cache hit
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('supports custom condition function', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(new Response('partial', { status: 206 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        // Only cache 200s
        const mw = throttlingCache({
            throttle: 5000,
            condition: res => res.status === 200
        })(fetch);

        await mw('/api/items', { method: 'GET' }); // 206 — not cached
        await mw('/api/items', { method: 'GET' }); // 200 — cached

        expect(fetch).toHaveBeenCalledTimes(2);

        // Now cached
        await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('cached responses are independent clones', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(
                new Response(JSON.stringify({ value: 42 }), { status: 200 })
            );
        const mw = throttlingCache({ throttle: 5000 })(fetch);

        const r1 = await mw('/api/data', { method: 'GET' });
        const r2 = await mw('/api/data', { method: 'GET' });

        // Both can independently read the body
        expect(await r1.json()).toEqual({ value: 42 });
        expect(await r2.json()).toEqual({ value: 42 });
    });

    test('uses default throttle of 1000ms', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = throttlingCache()(fetch);

        await mw('/api/items', { method: 'GET' });

        // Within default 1000ms
        vi.advanceTimersByTime(999);
        await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(1);

        // After 1000ms
        vi.advanceTimersByTime(2);
        await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
