import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { FetchLike } from '../middleware.js';
import { batching } from './batching.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
    status: number,
    body: unknown = {},
    headers: Record<string, string> = {}
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers }
    });
}

/** Build a fake batch response wrapping individual sub-responses. */
function batchResponse(
    items: Array<{
        status: number;
        body: unknown;
        headers?: Record<string, string>;
    }>
): Response {
    const responses = items.map(item => ({
        status: item.status,
        headers: {
            'content-type': 'application/json',
            ...(item.headers ?? {})
        },
        body: JSON.stringify(item.body)
    }));
    return jsonResponse(200, { responses });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('batching middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // Single-item passthrough
    // -----------------------------------------------------------------------

    test('single request is sent directly (no batching overhead)', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(200, { ok: true }));
        const mw = batching()(fetch);

        const promise = mw('http://localhost/api/todos', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(20);
        const res = await promise;

        expect(res.status).toBe(200);
        // The call went directly to fetch, NOT to /__batch
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/todos');
    });

    // -----------------------------------------------------------------------
    // Batching concurrent requests
    // -----------------------------------------------------------------------

    test('concurrent requests within windowMs are batched into one fetch', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: [{ id: 1 }] },
                { status: 200, body: { name: 'Alice' } }
            ])
        );
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('http://localhost/api/todos', { method: 'GET' });
        const p2 = mw('http://localhost/api/users/me', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(15);
        const [r1, r2] = await Promise.all([p1, p2]);

        // Only ONE real fetch was made
        expect(fetch).toHaveBeenCalledOnce();
        // That fetch targeted the batch endpoint
        expect(fetch.mock.calls[0][0]).toBe('http://localhost/__batch');

        // Each caller got its own reconstructed Response
        expect(r1.status).toBe(200);
        expect(r2.status).toBe(200);
        expect(await r1.json()).toEqual([{ id: 1 }]);
        expect(await r2.json()).toEqual({ name: 'Alice' });
    });

    test('batch request body contains correct request descriptors', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: [] },
                { status: 201, body: { id: 2 } }
            ])
        );
        const mw = batching({ windowMs: 10 })(fetch);

        mw('http://localhost/api/todos', {
            method: 'GET',
            headers: { authorization: 'Bearer tok' }
        });
        mw('http://localhost/api/todos', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: 'Bearer tok'
            },
            body: JSON.stringify({ title: 'Buy milk' })
        });

        await vi.advanceTimersByTimeAsync(15);

        const sentBody = JSON.parse(fetch.mock.calls[0][1]!.body as string);
        expect(sentBody.requests).toHaveLength(2);

        const [r1, r2] = sentBody.requests;
        expect(r1.method).toBe('GET');
        expect(r1.url).toBe('/api/todos');
        expect(r1.headers.authorization).toBe('Bearer tok');
        expect(r1.body).toBeUndefined();

        expect(r2.method).toBe('POST');
        expect(r2.url).toBe('/api/todos');
        expect(r2.body).toBe(JSON.stringify({ title: 'Buy milk' }));
    });

    // -----------------------------------------------------------------------
    // maxSize flush
    // -----------------------------------------------------------------------

    test('flushes immediately when maxSize is reached', async () => {
        const fetch = vi
            .fn<FetchLike>()
            // First batch flush (2 items)
            .mockResolvedValueOnce(
                batchResponse([
                    { status: 200, body: 'a' },
                    { status: 200, body: 'b' }
                ])
            )
            // Single-item passthrough for the 3rd call (after first flush)
            .mockResolvedValueOnce(jsonResponse(200, 'c'));

        const mw = batching({ maxSize: 2, windowMs: 100 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        const p2 = mw('http://localhost/api/b', { method: 'GET' });
        // 3rd request added after flush — goes to next batch/passthrough
        const p3 = mw('http://localhost/api/c', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(120);
        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

        expect(r1.status).toBe(200);
        expect(r2.status).toBe(200);
        expect(r3.status).toBe(200);
        // Two fetches total: one batch (p1+p2) + one single passthrough (p3)
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    // -----------------------------------------------------------------------
    // windowMs flush
    // -----------------------------------------------------------------------

    test('flushes after windowMs even with a single queued request', async () => {
        // Second call after timer — would be passthrough
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(200, { ok: true }));
        const mw = batching({ windowMs: 50 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        // Don't advance yet — p1 is queued but timer not fired
        expect(fetch).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(60);
        await p1;

        // Single-item passthrough (not batched)
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/a');
    });

    test('requests arriving before windowMs are all included in the same batch', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: 1 },
                { status: 200, body: 2 },
                { status: 200, body: 3 }
            ])
        );
        const mw = batching({ windowMs: 30 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(10); // still within window
        const p2 = mw('http://localhost/api/b', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(10); // still within window
        const p3 = mw('http://localhost/api/c', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(20); // timer fires

        await Promise.all([p1, p2, p3]);
        expect(fetch).toHaveBeenCalledOnce();
    });

    // -----------------------------------------------------------------------
    // Skip predicate
    // -----------------------------------------------------------------------

    test('skip predicate bypasses batching', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(200, { ok: true }));
        const mw = batching({
            windowMs: 50,
            skip: (_url, init) => init.method === 'POST'
        })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'POST', body: '{}' });
        // Not batched — sent immediately
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/a');
        await p1;
    });

    test('batch endpoint itself is never batched (prevents recursion)', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(200, { responses: [] }));
        const mw = batching({ windowMs: 20, batchPath: '/__batch' })(fetch);

        const p = mw('http://localhost/__batch', {
            method: 'POST',
            body: '{}'
        });
        // Passes through directly without queuing
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][0]).toBe('http://localhost/__batch');
        await p;
    });

    // -----------------------------------------------------------------------
    // Error propagation
    // -----------------------------------------------------------------------

    test('batch fetch error rejects all queued promises', async () => {
        const networkError = new TypeError('fetch failed');
        const fetch = vi.fn<FetchLike>().mockRejectedValue(networkError);
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        const p2 = mw('http://localhost/api/b', { method: 'GET' });

        // Attach catch handlers via allSettled BEFORE advancing timers to avoid
        // unhandled rejection warnings when the batch flush fires.
        const settled = Promise.allSettled([p1, p2]);
        await vi.advanceTimersByTimeAsync(15);
        const [r1, r2] = await settled;

        expect(r1.status).toBe('rejected');
        expect((r1 as PromiseRejectedResult).reason.message).toBe(
            'fetch failed'
        );
        expect(r2.status).toBe('rejected');
        expect((r2 as PromiseRejectedResult).reason.message).toBe(
            'fetch failed'
        );
    });

    test('non-ok batch response rejects all queued promises', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(503, { error: 'unavailable' }));
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        const p2 = mw('http://localhost/api/b', { method: 'GET' });

        const settled = Promise.allSettled([p1, p2]);
        await vi.advanceTimersByTimeAsync(15);
        const [r1, r2] = await settled;

        expect(r1.status).toBe('rejected');
        expect((r1 as PromiseRejectedResult).reason.message).toBe(
            'Batch request failed with status 503'
        );
        expect(r2.status).toBe('rejected');
        expect((r2 as PromiseRejectedResult).reason.message).toBe(
            'Batch request failed with status 503'
        );
    });

    test('missing sub-response entry rejects corresponding promise', async () => {
        // Server returns only 1 response for 2 requests
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(batchResponse([{ status: 200, body: 'ok' }]));
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('http://localhost/api/a', { method: 'GET' });
        const p2 = mw('http://localhost/api/b', { method: 'GET' });

        const settled = Promise.allSettled([p1, p2]);
        await vi.advanceTimersByTimeAsync(15);
        const [r1, r2] = await settled;

        expect(r1.status).toBe('fulfilled');
        expect((r1 as PromiseFulfilledResult<Response>).value.status).toBe(200);
        expect(r2.status).toBe('rejected');
        expect((r2 as PromiseRejectedResult).reason.message).toBe(
            'Missing batch response for request 1'
        );
    });

    // -----------------------------------------------------------------------
    // Sub-response status codes
    // -----------------------------------------------------------------------

    test('sub-response non-ok statuses are returned as Response (not thrown)', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: { id: 1 } },
                { status: 404, body: { detail: 'not found' } }
            ])
        );
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('http://localhost/api/todos/1', { method: 'GET' });
        const p2 = mw('http://localhost/api/todos/999', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(15);
        const [r1, r2] = await Promise.all([p1, p2]);

        expect(r1.status).toBe(200);
        expect(r2.status).toBe(404);
    });

    // -----------------------------------------------------------------------
    // Custom batchPath
    // -----------------------------------------------------------------------

    test('custom batchPath is used for batch requests', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: 'ok' },
                { status: 200, body: 'ok2' }
            ])
        );
        const mw = batching({ windowMs: 10, batchPath: '/_batch' })(fetch);

        mw('http://localhost/api/a', { method: 'GET' });
        mw('http://localhost/api/b', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(15);

        expect(fetch.mock.calls[0][0]).toBe('http://localhost/_batch');
    });

    // -----------------------------------------------------------------------
    // Relative URLs
    // -----------------------------------------------------------------------

    test('works with relative URLs', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(
            batchResponse([
                { status: 200, body: 'a' },
                { status: 200, body: 'b' }
            ])
        );
        const mw = batching({ windowMs: 10 })(fetch);

        const p1 = mw('/api/a', { method: 'GET' });
        const p2 = mw('/api/b', { method: 'GET' });

        await vi.advanceTimersByTimeAsync(15);
        await Promise.all([p1, p2]);

        // Batch endpoint URL should be the batchPath directly
        expect(fetch.mock.calls[0][0]).toBe('/__batch');

        const sentBody = JSON.parse(fetch.mock.calls[0][1]!.body as string);
        expect(sentBody.requests[0].url).toBe('/api/a');
        expect(sentBody.requests[1].url).toBe('/api/b');
    });
});
