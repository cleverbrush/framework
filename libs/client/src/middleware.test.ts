import { describe, expect, test, vi } from 'vitest';
import {
    composeMiddleware,
    type FetchLike,
    type Middleware
} from './middleware.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse(body = 'ok'): Response {
    return new Response(body, { status: 200, statusText: 'OK' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('composeMiddleware', () => {
    test('calls fetch directly when no middlewares', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(okResponse());
        const composed = composeMiddleware([], fetch);

        await composed('/api/test', { method: 'GET' });

        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith('/api/test', { method: 'GET' });
    });

    test('single middleware wraps fetch', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(okResponse());
        const order: string[] = [];

        const mw: Middleware = next => async (url, init) => {
            order.push('before');
            const res = await next(url, init);
            order.push('after');
            return res;
        };

        const composed = composeMiddleware([mw], fetch);
        await composed('/api/test', { method: 'GET' });

        expect(order).toEqual(['before', 'after']);
        expect(fetch).toHaveBeenCalledOnce();
    });

    test('middlewares execute in array order (first is outermost)', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(okResponse());
        const order: string[] = [];

        const mw1: Middleware = next => async (url, init) => {
            order.push('mw1-before');
            const res = await next(url, init);
            order.push('mw1-after');
            return res;
        };
        const mw2: Middleware = next => async (url, init) => {
            order.push('mw2-before');
            const res = await next(url, init);
            order.push('mw2-after');
            return res;
        };

        const composed = composeMiddleware([mw1, mw2], fetch);
        await composed('/api/test', { method: 'GET' });

        expect(order).toEqual([
            'mw1-before',
            'mw2-before',
            'mw2-after',
            'mw1-after'
        ]);
    });

    test('middleware can modify request', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(okResponse());

        const addHeader: Middleware = next => (url, init) => {
            const headers = {
                ...(init.headers as Record<string, string>),
                'X-Custom': 'yes'
            };
            return next(url, { ...init, headers });
        };

        const composed = composeMiddleware([addHeader], fetch);
        await composed('/api/test', { method: 'GET' });

        expect(
            (fetch.mock.calls[0][1].headers as Record<string, string>)[
                'X-Custom'
            ]
        ).toBe('yes');
    });

    test('middleware can replace response', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(okResponse('original'));

        const replace: Middleware = next => async (url, init) => {
            await next(url, init);
            return new Response('replaced', { status: 200 });
        };

        const composed = composeMiddleware([replace], fetch);
        const res = await composed('/api/test', { method: 'GET' });

        expect(await res.text()).toBe('replaced');
    });

    test('middleware can short-circuit without calling next', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(okResponse());

        const shortCircuit: Middleware = _next => async () => {
            return new Response('cached', { status: 200 });
        };

        const composed = composeMiddleware([shortCircuit], fetch);
        const res = await composed('/api/test', { method: 'GET' });

        expect(await res.text()).toBe('cached');
        expect(fetch).not.toHaveBeenCalled();
    });

    test('error propagates through middleware chain', async () => {
        const fetchError = new Error('Network failure');
        const fetch = vi.fn<FetchLike>().mockRejectedValue(fetchError);
        const order: string[] = [];

        const mw: Middleware = next => async (url, init) => {
            order.push('before');
            try {
                return await next(url, init);
            } catch (err) {
                order.push('caught');
                throw err;
            }
        };

        const composed = composeMiddleware([mw], fetch);
        await expect(composed('/api/test', { method: 'GET' })).rejects.toThrow(
            'Network failure'
        );
        expect(order).toEqual(['before', 'caught']);
    });
});
