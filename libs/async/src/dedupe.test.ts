import { describe, expect, test, vi } from 'vitest';
import { dedupe } from './dedupe.js';

describe('dedupe', () => {
    test('concurrent calls with same key share a single promise', async () => {
        const fn = vi.fn(
            (id: number) =>
                new Promise<string>(resolve =>
                    setTimeout(() => resolve(`user-${id}`), 50)
                )
        );
        const deduped = dedupe((id: number) => `${id}`, fn);

        const [a, b, c] = await Promise.all([
            deduped(1),
            deduped(1),
            deduped(1)
        ]);

        expect(a).toBe('user-1');
        expect(b).toBe('user-1');
        expect(c).toBe('user-1');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('different keys do not share promises', async () => {
        const fn = vi.fn((id: number) => Promise.resolve(`user-${id}`));
        const deduped = dedupe((id: number) => `${id}`, fn);

        const [a, b] = await Promise.all([deduped(1), deduped(2)]);

        expect(a).toBe('user-1');
        expect(b).toBe('user-2');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('sequential calls start new operations', async () => {
        const fn = vi.fn((id: number) => Promise.resolve(`user-${id}`));
        const deduped = dedupe((id: number) => `${id}`, fn);

        await deduped(1);
        await deduped(1);

        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('cleans up after resolution', async () => {
        const fn = vi.fn(() => Promise.resolve('ok'));
        const deduped = dedupe(() => 'key', fn);

        await deduped();
        // Second call should start a new operation since first completed
        await deduped();

        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('error propagates to all concurrent callers', async () => {
        const fn = vi.fn(() => Promise.reject(new Error('boom')));
        const deduped = dedupe(() => 'key', fn);

        const results = await Promise.allSettled([deduped(), deduped()]);

        expect(results[0].status).toBe('rejected');
        expect(results[1].status).toBe('rejected');
        expect((results[0] as PromiseRejectedResult).reason.message).toBe(
            'boom'
        );
        expect((results[1] as PromiseRejectedResult).reason.message).toBe(
            'boom'
        );
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('cleans up after rejection', async () => {
        let callCount = 0;
        const fn = vi.fn(() => {
            callCount++;
            if (callCount === 1) return Promise.reject(new Error('first fail'));
            return Promise.resolve('ok');
        });
        const deduped = dedupe(() => 'key', fn);

        await deduped().catch(() => {});
        const result = await deduped();

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
