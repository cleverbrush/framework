import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { offlineQueue } from './offlineQueue.js';

describe('offlineQueue middleware', () => {
    function jsonResponse(data: unknown, status = 200): Response {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    beforeEach(() => {
        if (typeof navigator !== 'undefined') {
            Object.defineProperty(navigator, 'onLine', {
                configurable: true,
                value: true
            });
        }
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('passes GET requests through immediately when online', async () => {
        const mw = offlineQueue();
        const next = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        const response = await mw(next)('/api/todos', { method: 'GET' });

        expect(response).toBeDefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('passes POST requests through when online', async () => {
        const mw = offlineQueue();
        const next = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));

        const response = await mw(next)('/api/todos', {
            method: 'POST',
            body: '{"title":"test"}'
        });

        expect(await response.json()).toEqual({ id: 1 });
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('queues POST requests when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const mw = offlineQueue();
        const next = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));

        const promise = mw(next)('/api/todos', {
            method: 'POST',
            body: '{"title":"test"}'
        });

        // Should NOT call next while offline
        expect(next).not.toHaveBeenCalled();
        // Should return a pending promise
        expect(promise).toBeInstanceOf(Promise);
    });

    test('store reflects queued requests', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const store = { queue: [], isOnline: false, isReplaying: false };
        const mw = offlineQueue({ store });

        mw(vi.fn())('/api/todos', { method: 'POST', body: '{}' });
        mw(vi.fn())('/api/todos/1', { method: 'DELETE' });

        expect(store.queue).toHaveLength(2);
        expect(store.queue[0].url).toBe('/api/todos');
        expect(store.queue[0].init.method).toBe('POST');
        expect(store.queue[1].url).toBe('/api/todos/1');
        expect(typeof store.queue[0].id).toBe('string');
        expect(typeof store.queue[0].timestamp).toBe('number');
    });

    test('flushes queue when going back online via flush', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const mw = offlineQueue();
        const next = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));

        const promise = mw(next)('/api/todos', {
            method: 'POST',
            body: '{"title":"test"}'
        });

        expect(next).not.toHaveBeenCalled();

        // Simulate going online
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));

        // Wait a tick for the flush to process
        await vi.waitFor(() => {
            expect(next).toHaveBeenCalled();
        });

        // The promise should resolve
        const response = await promise;
        expect(response).toBeDefined();
    });

    test('online event triggers automatic flush', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const store = { queue: [], isOnline: false, isReplaying: false };
        const mw = offlineQueue({ store });
        const next = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        mw(next)('/api/todos', { method: 'POST', body: '{}' });

        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));

        await vi.waitFor(() => {
            expect(store.isOnline).toBe(true);
            expect(next).toHaveBeenCalled();
        });
    });

    test('offline event updates store.isOnline', () => {
        const store = { queue: [], isOnline: true, isReplaying: false };
        offlineQueue({ store });

        window.dispatchEvent(new Event('offline'));

        expect(store.isOnline).toBe(false);
    });

    test('skip predicate bypasses queue for specific requests', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const mw = offlineQueue({
            skip: url => url.includes('skip-me')
        });
        const next = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        await mw(next)('/api/skip-me', { method: 'POST' });

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('works in non-browser environments (defaults online)', async () => {
        const originalWindow = globalThis.window;
        const originalNavigator = globalThis.navigator;
        (globalThis as any).window = undefined;
        (globalThis as any).navigator = undefined;

        try {
            const mw = offlineQueue();
            const next = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

            const response = await mw(next)('/api/todos', { method: 'POST' });

            expect(response).toBeDefined();
            expect(next).toHaveBeenCalledTimes(1);
        } finally {
            (globalThis as any).window = originalWindow;
            (globalThis as any).navigator = originalNavigator;
        }
    });

    test('store.isReplaying is true during flush', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const store = { queue: [], isOnline: false, isReplaying: false };
        const mw = offlineQueue({ store });
        const next = vi
            .fn()
            .mockImplementation(
                () =>
                    new Promise(resolve =>
                        setTimeout(
                            () => resolve(jsonResponse({ ok: true })),
                            50
                        )
                    )
            );

        mw(next)('/api/todos', { method: 'POST', body: '{}' });

        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));

        expect(store.isReplaying).toBe(true);

        await vi.waitFor(() => {
            expect(store.isReplaying).toBe(false);
        });
    });

    test('multiple queued requests are flushed in order', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        const mw = offlineQueue();
        const next = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(jsonResponse({ ok: true }))
            );

        const p1 = mw(next)('/api/todos', { method: 'POST', body: '{"n":1}' });
        const p2 = mw(next)('/api/todos', { method: 'POST', body: '{"n":2}' });
        const p3 = mw(next)('/api/todos', { method: 'POST', body: '{"n":3}' });

        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));

        const responses = await Promise.all([p1, p2, p3]);
        expect(responses).toHaveLength(3);
        expect(next).toHaveBeenCalledTimes(3);
    });
});
