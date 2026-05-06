import { describe, expect, test, vi } from 'vitest';
import { NetworkError } from '../errors.js';
import {
    OPTIMISTIC_MUTATION_ID,
    optimisticUpdate
} from './optimisticUpdate.js';

describe('optimisticUpdate middleware', () => {
    function jsonResponse(data: unknown, status = 200): Response {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    test('passes GET requests through without tagging', async () => {
        const mw = optimisticUpdate();
        const next = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

        const response = await mw(next)('/api/todos', { method: 'GET' });

        expect(response).toBeDefined();
        expect(next).toHaveBeenCalledTimes(1);
        const init = next.mock.calls[0][1] as any;
        expect(init[OPTIMISTIC_MUTATION_ID]).toBeUndefined();
    });

    test('tags POST requests with a mutation ID', async () => {
        const mw = optimisticUpdate();
        const next = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));

        await mw(next)('/api/todos', {
            method: 'POST',
            body: '{"title":"test"}'
        });

        const init = next.mock.calls[0][1] as any;
        expect(init[OPTIMISTIC_MUTATION_ID]).toBeDefined();
        expect(typeof init[OPTIMISTIC_MUTATION_ID]).toBe('string');
    });

    test.each(['PUT', 'PATCH', 'DELETE'])('tags %s requests', async method => {
        const mw = optimisticUpdate();
        const next = vi.fn().mockResolvedValue(jsonResponse({}));

        await mw(next)('/api/todos/1', { method });

        const init = next.mock.calls[0][1] as any;
        expect(init[OPTIMISTIC_MUTATION_ID]).toBeDefined();
    });

    test('skip predicate bypasses tagging', async () => {
        const mw = optimisticUpdate({
            skip: url => url.includes('skip-me')
        });
        const next = vi.fn().mockResolvedValue(jsonResponse({}));

        await mw(next)('/api/skip-me', { method: 'POST' });

        const init = next.mock.calls[0][1] as any;
        expect(init[OPTIMISTIC_MUTATION_ID]).toBeUndefined();
    });

    test('captures NetworkError in the store', async () => {
        const store = { failures: [] };
        const mw = optimisticUpdate({ store });
        const next = vi.fn().mockRejectedValue(new NetworkError('offline'));

        await expect(
            mw(next)('/api/todos', { method: 'POST' })
        ).rejects.toThrow(NetworkError);

        expect(store.failures).toHaveLength(1);
        expect(store.failures[0].url).toBe('/api/todos');
        expect(store.failures[0].error).toBeInstanceOf(NetworkError);
        expect(store.failures[0].id).toBeDefined();
        expect(store.failures[0].timestamp).toBeDefined();
    });

    test('does NOT capture ApiError (HTTP errors) in the store', async () => {
        const store = { failures: [] };
        const mw = optimisticUpdate({ store });
        const next = vi.fn().mockResolvedValue(
            new Response('Not Found', {
                status: 404,
                statusText: 'Not Found'
            })
        );

        const response = await mw(next)('/api/todos/999', { method: 'DELETE' });

        expect(response.status).toBe(404);
        expect(store.failures).toHaveLength(0);
    });

    test('captures non-NetworkError rejections but does NOT add to store', async () => {
        const store = { failures: [] };
        const mw = optimisticUpdate({ store });
        const next = vi.fn().mockRejectedValue(new Error('Something broke'));

        await expect(
            mw(next)('/api/todos', { method: 'POST' })
        ).rejects.toThrow('Something broke');

        expect(store.failures).toHaveLength(0);
    });

    test('uses default internal store when none provided', async () => {
        const mw = optimisticUpdate();
        const next = vi.fn().mockRejectedValue(new NetworkError('offline'));

        await expect(
            mw(next)('/api/todos', { method: 'POST' })
        ).rejects.toThrow(NetworkError);

        // Middleware still works without a custom store
    });

    test('multiple failures accumulate in the store', async () => {
        const store = { failures: [] };
        const mw = optimisticUpdate({ store });
        const next = vi.fn().mockRejectedValue(new NetworkError('offline'));

        await expect(
            mw(next)('/api/todos/1', { method: 'DELETE' })
        ).rejects.toThrow(NetworkError);
        await expect(
            mw(next)('/api/todos', { method: 'POST' })
        ).rejects.toThrow(NetworkError);

        expect(store.failures).toHaveLength(2);
    });
});
