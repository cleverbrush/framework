import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRequestSignal } from './withRequestSignal.js';

const fixture = () => {
    const request = new IncomingMessage(new Socket());
    return { request, response: new ServerResponse(request) };
};
const untilAbort = (signal: AbortSignal) =>
    new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
            once: true
        });
    });
const options = { timeoutMs: 100 };
afterEach(() => vi.useRealTimers());

describe('withRequestSignal', () => {
    it('returns the result and removes lifecycle listeners and timer', async () => {
        vi.useFakeTimers();
        const context = fixture();
        expect(await withRequestSignal(context, () => 42, options)).toBe(42);
        expect(context.request.listenerCount('aborted')).toBe(0);
        expect(context.response.listenerCount('close')).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });
    it('cleans up synchronous and asynchronous failures', async () => {
        const context = fixture();
        const failure = new Error('work failed');
        for (const work of [
            () => {
                throw failure;
            },
            async () => {
                throw failure;
            }
        ]) {
            await expect(
                withRequestSignal(context, work, options)
            ).rejects.toBe(failure);
            expect(context.request.listenerCount('aborted')).toBe(0);
            expect(context.response.listenerCount('close')).toBe(0);
        }
    });
    it('cancels on an aborted request', async () => {
        const context = fixture();
        const work = withRequestSignal(context, untilAbort, options);
        context.request.emit('aborted');
        await expect(work).rejects.toMatchObject({ name: 'AbortError' });
    });
    it('cancels on an unfinished response close', async () => {
        const context = fixture();
        const work = withRequestSignal(context, untilAbort, options);
        context.response.emit('close');
        await expect(work).rejects.toMatchObject({ name: 'AbortError' });
    });
    it('does not cancel on a normally finished response', async () => {
        const context = fixture();
        Object.defineProperty(context.response, 'writableFinished', {
            value: true
        });
        await withRequestSignal(
            context,
            signal => {
                context.response.emit('close');
                expect(signal.aborted).toBe(false);
            },
            options
        );
    });
    it('cancels at the deadline and removes the timer', async () => {
        vi.useFakeTimers();
        const work = withRequestSignal(fixture(), untilAbort, options);
        const assertion = expect(work).rejects.toMatchObject({
            name: 'TimeoutError'
        });
        await vi.advanceTimersByTimeAsync(100);
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
    });
    it('propagates caller cancellation and removes its listener', async () => {
        const context = fixture();
        const caller = new AbortController();
        const remove = vi.spyOn(caller.signal, 'removeEventListener');
        const reason = new Error('shutdown');
        const work = withRequestSignal(context, untilAbort, {
            ...options,
            signal: caller.signal
        });
        caller.abort(reason);
        await expect(work).rejects.toBe(reason);
        expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    });
    it.each(['request', 'response', 'caller'] as const)(
        'does not start already-cancelled %s work',
        async kind => {
            const context = fixture();
            const caller = new AbortController();
            if (kind === 'request') context.request.aborted = true;
            if (kind === 'response') context.response.destroyed = true;
            if (kind === 'caller') caller.abort();
            const work = vi.fn();
            await expect(
                withRequestSignal(context, work, {
                    ...options,
                    signal: caller.signal
                })
            ).rejects.toMatchObject({ name: 'AbortError' });
            expect(work).not.toHaveBeenCalled();
        }
    );
    it('accepts a finished and destroyed response without a false disconnect', async () => {
        const context = fixture();
        context.response.destroyed = true;
        Object.defineProperty(context.response, 'writableFinished', {
            value: true
        });
        expect(await withRequestSignal(context, () => 'done', options)).toBe(
            'done'
        );
    });
    it.each([0, -1, NaN, Infinity, 1.5, 2_147_483_648])(
        'rejects invalid deadline %s',
        async timeoutMs => {
            const context = fixture();
            await expect(
                withRequestSignal(context, () => {}, { timeoutMs })
            ).rejects.toBeInstanceOf(RangeError);
            expect(context.response.listenerCount('close')).toBe(0);
        }
    );
});
