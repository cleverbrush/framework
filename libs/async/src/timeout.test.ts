import { describe, expect, test, vi } from 'vitest';
import { TimeoutError, withTimeout } from './timeout.js';

describe('withTimeout', () => {
    test('resolves when fn completes before timeout', async () => {
        const result = await withTimeout(() => Promise.resolve(42), 1000);
        expect(result).toBe(42);
    });

    test('rejects with TimeoutError when fn exceeds timeout', async () => {
        const err = await withTimeout(
            () => new Promise(resolve => setTimeout(resolve, 500)),
            50
        ).catch((e: unknown) => e);

        expect(err).toBeInstanceOf(TimeoutError);
        expect((err as TimeoutError).timeout).toBe(50);
        expect((err as TimeoutError).message).toBe(
            'Operation timed out after 50ms'
        );
    });

    test('aborts the signal on timeout', async () => {
        let aborted = false;

        await withTimeout(signal => {
            signal.addEventListener('abort', () => {
                aborted = true;
            });
            return new Promise(resolve => setTimeout(resolve, 500));
        }, 50).catch(() => {});

        expect(aborted).toBe(true);
    });

    test('does not abort signal on success', async () => {
        let aborted = false;

        await withTimeout(signal => {
            signal.addEventListener('abort', () => {
                aborted = true;
            });
            return Promise.resolve('ok');
        }, 1000);

        expect(aborted).toBe(false);
    });

    test('clears timer on success (no leaked timers)', async () => {
        vi.useFakeTimers();
        try {
            const promise = withTimeout(() => Promise.resolve('done'), 10000);
            await vi.advanceTimersByTimeAsync(0);
            const result = await promise;
            expect(result).toBe('done');
            // If timer leaked, advancing would cause issues
            await vi.advanceTimersByTimeAsync(20000);
        } finally {
            vi.useRealTimers();
        }
    });

    test('propagates errors from fn (not timeout)', async () => {
        const err = await withTimeout(
            () => Promise.reject(new Error('inner fail')),
            1000
        ).catch((e: unknown) => e);

        expect(err).toBeInstanceOf(Error);
        expect(err).not.toBeInstanceOf(TimeoutError);
        expect((err as Error).message).toBe('inner fail');
    });
});
