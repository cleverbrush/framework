import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TimeoutError } from '../errors.js';
import type { FetchLike } from '../middleware.js';
import { PER_CALL_OPTIONS } from '../middleware.js';
import { timeout } from './timeout.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A mock fetch that never resolves on its own but rejects on abort (like real fetch). */
function hangingFetch(): FetchLike {
    return (_url, init) =>
        new Promise((_resolve, reject) => {
            if (init.signal?.aborted) {
                reject(
                    new DOMException('The operation was aborted', 'AbortError')
                );
                return;
            }
            init.signal?.addEventListener(
                'abort',
                () =>
                    reject(
                        new DOMException(
                            'The operation was aborted',
                            'AbortError'
                        )
                    ),
                { once: true }
            );
        });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('timeout middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('passes through fast responses', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = timeout({ timeout: 5000 })(fetch);

        const res = await mw('/api/test', { method: 'GET' });
        expect(res.status).toBe(200);
    });

    test('throws TimeoutError when request exceeds timeout', async () => {
        const fetch = vi.fn<FetchLike>().mockImplementation(hangingFetch());
        const mw = timeout({ timeout: 1000 })(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        const result = promise.catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(1000);

        const err = await result;
        expect(err).toBeInstanceOf(TimeoutError);
        expect((err as TimeoutError).timeout).toBe(1000);
    });

    test('uses default timeout of 10000ms', async () => {
        const fetch = vi.fn<FetchLike>().mockImplementation(hangingFetch());
        const mw = timeout()(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        const result = promise.catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(10000);

        const err = await result;
        expect(err).toBeInstanceOf(TimeoutError);
        expect((err as TimeoutError).timeout).toBe(10000);
    });

    test('aborts the request signal on timeout', async () => {
        let capturedSignal: AbortSignal | undefined;

        const fetch = vi.fn<FetchLike>().mockImplementation((_url, init) => {
            capturedSignal = init.signal ?? undefined;
            return hangingFetch()(_url, init);
        });
        const mw = timeout({ timeout: 500 })(fetch);

        const promise = mw('/api/test', { method: 'GET' });
        const result = promise.catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(500);

        const err = await result;
        expect(err).toBeInstanceOf(TimeoutError);
        expect(capturedSignal?.aborted).toBe(true);
    });

    test('does not throw TimeoutError when caller aborts', async () => {
        const callerController = new AbortController();

        const fetch = vi.fn<FetchLike>().mockImplementation((_url, init) => {
            return new Promise((_, reject) => {
                init.signal?.addEventListener('abort', () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
        });
        const mw = timeout({ timeout: 5000 })(fetch);

        const promise = mw('/api/test', {
            method: 'GET',
            signal: callerController.signal
        });

        callerController.abort();

        const err = await promise.catch((e: unknown) => e);
        expect(err).not.toBeInstanceOf(TimeoutError);
        expect((err as DOMException).name).toBe('AbortError');
    });

    test('clears timer on success', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 200 }));
        const mw = timeout({ timeout: 5000 })(fetch);

        await mw('/api/test', { method: 'GET' });

        // Advancing past the timeout should not cause any issues
        await vi.advanceTimersByTimeAsync(10000);
    });

    test('preserves non-timeout fetch errors', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockRejectedValue(new Error('network failure'));
        const mw = timeout({ timeout: 5000 })(fetch);

        const err = await mw('/api/test', { method: 'GET' }).catch(
            (e: unknown) => e
        );
        expect(err).toBeInstanceOf(Error);
        expect(err).not.toBeInstanceOf(TimeoutError);
        expect((err as Error).message).toBe('network failure');
    });

    test('per-call timeout override takes precedence', async () => {
        const fetch = vi.fn<FetchLike>().mockImplementation(hangingFetch());
        const mw = timeout({ timeout: 10000 })(fetch);

        // Global timeout is 10000ms, but per-call override sets it to 500ms
        const init: RequestInit = { method: 'GET' };
        (init as any)[PER_CALL_OPTIONS] = { timeout: 500 };

        const promise = mw('/api/test', init);
        const result = promise.catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(500);

        const err = await result;
        expect(err).toBeInstanceOf(TimeoutError);
        expect((err as TimeoutError).timeout).toBe(500);
    });
});
