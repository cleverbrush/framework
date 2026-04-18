import { describe, expect, test, vi } from 'vitest';
import type { FetchLike } from '../middleware.js';
import { dedupe } from './dedupe.js';

describe('dedupe middleware', () => {
    test('deduplicates concurrent GET requests with the same URL', async () => {
        let callCount = 0;
        const fetch = vi.fn<FetchLike>().mockImplementation(() => {
            callCount++;
            return Promise.resolve(
                new Response(JSON.stringify({ n: callCount }), { status: 200 })
            );
        });
        const mw = dedupe()(fetch);

        const [r1, r2, r3] = await Promise.all([
            mw('/api/items', { method: 'GET' }),
            mw('/api/items', { method: 'GET' }),
            mw('/api/items', { method: 'GET' })
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
        // First caller gets original, others get clones — all readable
        expect(await r1.json()).toEqual({ n: 1 });
        expect(await r2.json()).toEqual({ n: 1 });
        expect(await r3.json()).toEqual({ n: 1 });
    });

    test('does not deduplicate POST requests by default', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = dedupe()(fetch);

        await Promise.all([
            mw('/api/items', { method: 'POST', body: '{}' }),
            mw('/api/items', { method: 'POST', body: '{}' })
        ]);

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not deduplicate requests with different URLs', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = dedupe()(fetch);

        await Promise.all([
            mw('/api/items/1', { method: 'GET' }),
            mw('/api/items/2', { method: 'GET' })
        ]);

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('clones responses so each caller can read the body', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            new Response(JSON.stringify({ hello: 'world' }), {
                status: 200
            })
        );
        const mw = dedupe()(fetch);

        const [r1, r2] = await Promise.all([
            mw('/api/data', { method: 'GET' }),
            mw('/api/data', { method: 'GET' })
        ]);

        // Both callers can independently read the body
        const b1 = await r1.json();
        const b2 = await r2.json();
        expect(b1).toEqual({ hello: 'world' });
        expect(b2).toEqual({ hello: 'world' });
    });

    test('cleans up inflight map after resolution', async () => {
        let resolve!: (value: Response) => void;
        const fetch = vi
            .fn<FetchLike>()
            .mockImplementationOnce(
                () =>
                    new Promise<Response>(r => {
                        resolve = r;
                    })
            )
            .mockResolvedValueOnce(new Response('ok2', { status: 200 }));
        const mw = dedupe()(fetch);

        // First call — starts inflight
        const p1 = mw('/api/items', { method: 'GET' });
        // Second concurrent call — deduped
        const p2 = mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(1);

        // Resolve the inflight request
        resolve(new Response('ok', { status: 200 }));
        await Promise.all([p1, p2]);

        // Third call — inflight map is clean, so a new fetch starts
        await mw('/api/items', { method: 'GET' });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('propagates errors to all waiting callers', async () => {
        const error = new Error('network failure');
        const fetch = vi.fn<FetchLike>().mockRejectedValue(error);
        const mw = dedupe()(fetch);

        const [e1, e2] = await Promise.all([
            mw('/api/items', { method: 'GET' }).catch((e: unknown) => e),
            mw('/api/items', { method: 'GET' }).catch((e: unknown) => e)
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(e1).toBe(error);
        expect(e2).toBe(error);
    });

    test('supports custom key function', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        // Key ignores query params — /api/items?page=1 and /api/items?page=2 deduped
        const mw = dedupe({
            key: url => url.split('?')[0]
        })(fetch);

        await Promise.all([
            mw('/api/items?page=1', { method: 'GET' }),
            mw('/api/items?page=2', { method: 'GET' })
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('supports custom skip function', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        // Never skip — dedupe ALL methods including POST
        const mw = dedupe({ skip: () => false })(fetch);

        await Promise.all([
            mw('/api/items', { method: 'POST', body: '{}' }),
            mw('/api/items', { method: 'POST', body: '{}' })
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
