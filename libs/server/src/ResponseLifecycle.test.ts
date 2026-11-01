import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { ResponseLifecycle } from './ResponseLifecycle.js';

const fixture = () => {
    const response = Object.assign(new EventEmitter(), {
        headersSent: true,
        statusCode: 200,
        writableFinished: false
    });
    const lifecycle = new ResponseLifecycle(
        response as unknown as ServerResponse
    );
    return { response, lifecycle };
};

describe('response lifecycle', () => {
    it.each([
        [200, 'success'],
        [302, 'success'],
        [400, 'rejected'],
        [401, 'rejected'],
        [500, 'failure']
    ] as const)('observes final status %s exactly once', (status, outcome) => {
        const { response, lifecycle } = fixture();
        const observe = vi.fn();
        lifecycle.subscribe(observe);
        response.statusCode = status;
        response.writableFinished = true;
        response.emit('finish');
        response.emit('close');
        response.emit('finish');
        expect(observe).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                statusCode: status,
                outcome
            })
        );
        expect(Object.isFrozen(observe.mock.calls[0]![0])).toBe(true);
        for (const event of ['finish', 'close', 'error'])
            expect(response.listenerCount(event)).toBe(0);
    });

    it('counts full elapsed time until response completion', () => {
        const now = vi.spyOn(performance, 'now').mockReturnValue(10);
        try {
            const { response, lifecycle } = fixture();
            const observe = vi.fn();
            lifecycle.subscribe(observe);
            now.mockReturnValue(125);
            expect(observe).not.toHaveBeenCalled();
            response.emit('finish');
            expect(observe.mock.calls[0]![0].elapsedMs).toBe(115);
        } finally {
            now.mockRestore();
        }
    });

    it('does not invent a 200 status or cancellation on premature close', () => {
        const { response, lifecycle } = fixture();
        response.headersSent = false;
        const observe = vi.fn();
        lifecycle.subscribe(observe);
        response.emit('close');
        response.emit('finish');
        expect(observe).toHaveBeenCalledTimes(1);
        expect(observe.mock.calls[0]![0]).toMatchObject({
            outcome: 'interrupted'
        });
        expect(observe.mock.calls[0]![0].statusCode).toBeUndefined();
    });

    it.each(['timeout', 'cancelled'] as const)(
        'preserves explicit %s causes',
        outcome => {
            const { response, lifecycle } = fixture();
            const observe = vi.fn();
            lifecycle.subscribe(observe);
            lifecycle.mark(outcome);
            response.emit('close');
            expect(observe.mock.calls[0]![0].outcome).toBe(outcome);
        }
    );

    it('classifies stream failures after headers separately from disconnects', () => {
        const { response, lifecycle } = fixture();
        const error = new Error('private provider failure');
        const observe = vi.fn();
        lifecycle.subscribe(observe);
        response.emit('error', error);
        response.emit('close');
        expect(observe.mock.calls[0]![0]).toMatchObject({
            statusCode: 200,
            outcome: 'failure',
            error
        });
    });

    it('keeps connection-reset interruptions distinct from application cancellation', () => {
        const { response, lifecycle } = fixture();
        const observe = vi.fn();
        lifecycle.subscribe(observe);
        response.emit(
            'error',
            Object.assign(new Error('reset'), { code: 'ECONNRESET' })
        );
        response.emit('close');
        expect(observe.mock.calls[0]![0].outcome).toBe('interrupted');
    });

    it('allows successful recovery from an earlier timeout', () => {
        const { response, lifecycle } = fixture();
        const observe = vi.fn();
        lifecycle.subscribe(observe);
        lifecycle.mark('timeout');
        response.emit('finish');
        expect(observe.mock.calls[0]![0].outcome).toBe('success');
    });

    it('binds callbacks to registration context, supports late subscribers and isolates failures', async () => {
        const storage = new AsyncLocalStorage<string>();
        const { response, lifecycle } = fixture();
        const origins: (string | undefined)[] = [];
        const observe = vi.fn(() => {
            origins.push(storage.getStore());
        });
        storage.run('request-A', () => lifecycle.subscribe(observe));
        const removed = vi.fn();
        lifecycle.subscribe(removed)();
        lifecycle.subscribe(() => {
            throw new Error('observer');
        });
        lifecycle.subscribe(async () => {
            throw new Error('async observer');
        });
        storage.run('request-B', () => response.emit('finish'));
        const late = vi.fn();
        lifecycle.subscribe(late);
        expect(observe).toHaveBeenCalledTimes(1);
        expect(origins).toEqual(['request-A']);
        expect(removed).not.toHaveBeenCalled();
        expect(late).toHaveBeenCalledExactlyOnceWith(observe.mock.calls[0]![0]);
        await Promise.resolve();
    });
});
