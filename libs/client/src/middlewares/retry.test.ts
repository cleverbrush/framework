import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { FetchLike } from '../middleware.js';
import { PER_CALL_OPTIONS } from '../middleware.js';
import { retry } from './retry.js';

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
        statusText: status >= 400 ? 'Error' : 'OK',
        headers: { 'content-type': 'application/json', ...headers }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('retry middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('passes through successful response without retry', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(jsonResponse(200, { ok: true }));
        const mw = retry()(fetch);

        const res = await mw('/api/test', { method: 'GET' });
        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('retries on 500 status', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

        const mw = retry({ limit: 3 })(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        // Advance timers for each retry delay
        await vi.advanceTimersByTimeAsync(10000);
        const res = await promise;

        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('retries on 502, 503, 504, 429, 408', async () => {
        for (const status of [502, 503, 504, 429, 408]) {
            const fetch = vi
                .fn<FetchLike>()
                .mockResolvedValueOnce(jsonResponse(status))
                .mockResolvedValueOnce(jsonResponse(200));

            const mw = retry({ limit: 2 })(fetch);
            const promise = mw('/api/test', { method: 'GET' });
            await vi.advanceTimersByTimeAsync(5000);
            const res = await promise;

            expect(res.status).toBe(200);
            expect(fetch).toHaveBeenCalledTimes(2);
        }
    });

    test('does not retry non-retryable status codes (e.g. 404)', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(404));
        const mw = retry({ limit: 2 })(fetch);

        const res = await mw('/api/test', { method: 'GET' });
        expect(res.status).toBe(404);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('does not retry POST by default', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(500));
        const mw = retry({ limit: 2 })(fetch);

        const res = await mw('/api/test', { method: 'POST' });
        expect(res.status).toBe(500);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('retries POST when included in methods', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 2, methods: ['POST'] })(fetch);
        const promise = mw('/api/test', { method: 'POST' });
        await vi.advanceTimersByTimeAsync(5000);
        const res = await promise;

        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('gives up after limit is reached', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(500));
        const mw = retry({ limit: 2 })(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(10000);
        const res = await promise;

        expect(res.status).toBe(500);
        // 1 initial + 2 retries = 3
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('uses exponential backoff by default', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(500));
        const mw = retry({ limit: 3 })(fetch);

        const promise = mw('/api/test', { method: 'GET' });

        // Default delay: 0.3 * 2^(attempt-1) * 1000
        // attempt 1: 300ms, attempt 2: 600ms, attempt 3: 1200ms
        await vi.advanceTimersByTimeAsync(300);
        expect(fetch).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(600);
        expect(fetch).toHaveBeenCalledTimes(3);

        await vi.advanceTimersByTimeAsync(1200);
        expect(fetch).toHaveBeenCalledTimes(4);

        await promise;
    });

    test('respects Retry-After header (seconds)', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                jsonResponse(429, {}, { 'retry-after': '2' })
            )
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1 })(fetch);
        const promise = mw('/api/test', { method: 'GET' });

        // Should wait 2000ms (2 seconds)
        await vi.advanceTimersByTimeAsync(1999);
        expect(fetch).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1);
        expect(fetch).toHaveBeenCalledTimes(2);

        const res = await promise;
        expect(res.status).toBe(200);
    });

    test('respects backoffLimit', async () => {
        const delays: number[] = [];
        const originalSetTimeout = globalThis.setTimeout;
        vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
            fn: () => void,
            ms: number
        ) => {
            if (ms > 0) delays.push(ms);
            return originalSetTimeout(fn, ms);
        }) as typeof setTimeout);

        const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(500));
        const mw = retry({
            limit: 3,
            delay: () => 10000,
            backoffLimit: 5000
        })(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(30000);
        await promise;

        // All delays should be capped at 5000
        for (const d of delays) {
            expect(d).toBeLessThanOrEqual(5000);
        }
    });

    test('jitter: true applies randomization', async () => {
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1, jitter: true })(fetch);
        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(5000);
        await promise;

        expect(mockRandom).toHaveBeenCalled();
        mockRandom.mockRestore();
    });

    test('custom shouldRetry can prevent retry', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockRejectedValue(new Error('do not retry'));

        const mw = retry({
            limit: 3,
            shouldRetry: () => false
        })(fetch);

        await expect(mw('/api/test', { method: 'GET' })).rejects.toThrow(
            'do not retry'
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('retries on fetch error (network failure)', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockRejectedValueOnce(new Error('network error'))
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 2 })(fetch);
        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(5000);
        const res = await promise;

        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('custom delay function is used', async () => {
        const delayFn = vi.fn((attempt: number) => attempt * 100);

        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1, delay: delayFn })(fetch);
        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(5000);
        await promise;

        expect(delayFn).toHaveBeenCalledWith(1);
    });

    test('per-call limit override takes precedence', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(500))
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1, delay: () => 0 })(fetch);

        // Global limit is 1, but per-call override sets it to 3
        const init: RequestInit = { method: 'GET' };
        (init as any)[PER_CALL_OPTIONS] = { retry: { limit: 3 } };

        const promise = mw('/api/test', init);
        await vi.advanceTimersByTimeAsync(1000);
        const res = await promise;

        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    test('respects Retry-After header as HTTP-date', async () => {
        // Provide a date 3 seconds in the future
        const futureDate = new Date(Date.now() + 3_000).toUTCString();
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                jsonResponse(429, {}, { 'retry-after': futureDate })
            )
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1, delay: () => 0 })(fetch);
        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(10_000);
        const res = await promise;

        expect(res.status).toBe(200);
    });

    test('ignores invalid Retry-After header', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValueOnce(
                jsonResponse(429, {}, { 'retry-after': 'not-a-date' })
            )
            .mockResolvedValueOnce(jsonResponse(200));

        const mw = retry({ limit: 1, delay: () => 0 })(fetch);
        const promise = mw('/api/test', { method: 'GET' });
        await vi.advanceTimersByTimeAsync(10_000);
        const res = await promise;

        expect(res.status).toBe(200);
    });
});
