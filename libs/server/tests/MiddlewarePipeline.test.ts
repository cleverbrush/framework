import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { MiddlewarePipeline } from '../src/MiddlewarePipeline.js';
import { RequestContext } from '../src/RequestContext.js';

function createMockContext(): RequestContext {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.url = '/';
    req.method = 'GET';
    const res = new ServerResponse(req);
    return new RequestContext(req, res);
}

describe('MiddlewarePipeline', () => {
    it('executes middlewares in order', async () => {
        const pipeline = new MiddlewarePipeline();
        const order: number[] = [];

        pipeline.add(async (_ctx, next) => {
            order.push(1);
            await next();
            order.push(4);
        });
        pipeline.add(async (_ctx, next) => {
            order.push(2);
            await next();
            order.push(3);
        });

        const ctx = createMockContext();
        await pipeline.execute(ctx, async () => {
            order.push(99);
        });

        expect(order).toEqual([1, 2, 99, 3, 4]);
    });

    it('short-circuits when middleware does not call next', async () => {
        const pipeline = new MiddlewarePipeline();
        let finalCalled = false;

        pipeline.add(async (_ctx, _next) => {
            // intentionally not calling next()
        });

        const ctx = createMockContext();
        await pipeline.execute(ctx, async () => {
            finalCalled = true;
        });

        expect(finalCalled).toBe(false);
    });

    it('executes empty pipeline (just calls final handler)', async () => {
        const pipeline = new MiddlewarePipeline();
        let called = false;

        const ctx = createMockContext();
        await pipeline.execute(ctx, async () => {
            called = true;
        });

        expect(called).toBe(true);
    });

    it('propagates errors from middleware', async () => {
        const pipeline = new MiddlewarePipeline();
        pipeline.add(async () => {
            throw new Error('middleware error');
        });

        const ctx = createMockContext();
        await expect(pipeline.execute(ctx, async () => {})).rejects.toThrow(
            'middleware error'
        );
    });

    it('propagates errors from final handler', async () => {
        const pipeline = new MiddlewarePipeline();
        pipeline.add(async (_ctx, next) => {
            await next();
        });

        const ctx = createMockContext();
        await expect(
            pipeline.execute(ctx, async () => {
                throw new Error('handler error');
            })
        ).rejects.toThrow('handler error');
    });

    it('supports async middleware', async () => {
        const pipeline = new MiddlewarePipeline();
        const order: string[] = [];

        pipeline.add(async (_ctx, next) => {
            order.push('before');
            await new Promise(r => setTimeout(r, 5));
            await next();
            order.push('after');
        });

        const ctx = createMockContext();
        await pipeline.execute(ctx, async () => {
            order.push('handler');
        });

        expect(order).toEqual(['before', 'handler', 'after']);
    });

    it('preserves context through pipeline', async () => {
        const pipeline = new MiddlewarePipeline();

        pipeline.add(async (ctx, next) => {
            ctx.items.set('key', 'value');
            await next();
        });

        const ctx = createMockContext();
        let itemValue: unknown;
        await pipeline.execute(ctx, async () => {
            itemValue = ctx.items.get('key');
        });

        expect(itemValue).toBe('value');
    });
});
