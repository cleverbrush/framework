import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { RequestContext } from '../RequestContext.js';
import { idempotency } from './Idempotency.js';

function context(scope = 'user-a', url = '/records', method = 'POST') {
    const request = new IncomingMessage(new Socket());
    request.method = method;
    request.url = url;
    request.headers = { 'x-idempotency-key': 'same-key' };
    const ctx = new RequestContext(request, new ServerResponse(request));
    ctx.items.set('verified-scope', scope);
    return ctx;
}

describe('idempotent replay isolation and concurrency', () => {
    const scoped = (options = {}) =>
        idempotency({
            scope: ctx => ctx.items.get('verified-scope') as string,
            ...options
        });

    it('separates callers, methods and URLs using the same client key', async () => {
        const middleware = scoped();
        for (const ctx of [
            context(),
            context('user-b'),
            context('user-a', '/other'),
            context('user-a', '/records', 'PATCH')
        ]) {
            const handler = vi.fn(async () => {
                ctx.response.end('ok');
            });
            await middleware(ctx, handler);
            expect(handler).toHaveBeenCalledOnce();
        }
        const handler = vi.fn();
        await middleware(context(), handler);
        expect(handler).not.toHaveBeenCalled();
    });

    it('coalesces simultaneous requests before the first response exists', async () => {
        const middleware = scoped();
        const first = context();
        let release!: () => void;
        const wait = new Promise<void>(resolve => {
            release = resolve;
        });
        const original = middleware(first, async () => {
            await wait;
            first.response.end('done');
        });
        const duplicate = vi.fn();
        const replay = middleware(context(), duplicate);
        release();
        await Promise.all([original, replay]);
        expect(duplicate).not.toHaveBeenCalled();
    });

    it('propagates failures to waiters and releases the reservation', async () => {
        const middleware = scoped();
        const original = middleware(context(), async () => {
            throw new Error('failed');
        });
        const waiter = middleware(context(), vi.fn());
        const results = await Promise.allSettled([original, waiter]);
        expect(results.map(result => result.status)).toEqual([
            'rejected',
            'rejected'
        ]);
        const ctx = context();
        const handler = vi.fn(async () => {
            ctx.response.end('ok');
        });
        await middleware(ctx, handler);
        expect(handler).toHaveBeenCalledOnce();
    });

    it('does not re-execute a completed operation whose response was too large', async () => {
        const middleware = scoped({ maxResponseBytes: 1 });
        const ctx = context();
        await middleware(ctx, async () => {
            ctx.response.end('large');
        });
        const handler = vi.fn();
        await expect(middleware(context(), handler)).rejects.toMatchObject({
            status: 409
        });
        expect(handler).not.toHaveBeenCalled();
    });

    it('rejects capacity overflow without executing and allows unscoped pass-through', async () => {
        const middleware = scoped({ maxEntries: 1 });
        const ctx = context();
        await middleware(ctx, async () => {
            ctx.response.end('ok');
        });
        const handler = vi.fn();
        await expect(
            middleware(context('user-b'), handler)
        ).rejects.toMatchObject({ status: 503 });
        expect(handler).not.toHaveBeenCalled();
        await idempotency({ scope: () => undefined })(context(), handler);
        expect(handler).toHaveBeenCalledOnce();
    });
});
