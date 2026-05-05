import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cacheResponse } from '../src/middlewares/ResponseCache.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConstAccessor(value: unknown) {
    return {
        getValue: () => ({ success: true, value })
    };
}

function makeContext(
    meta: { cacheTags?: any } = {},
    overrides: Partial<{
        method: string;
    }> = {}
): any {
    const items = new Map<string, unknown>();
    items.set('__endpoint_meta', meta);

    const response: any = {
        statusCode: 200,
        _headers: {} as Record<string, string>,
        _body: null as any,
        writeHead(statusCode: number, headers?: any) {
            this.statusCode = statusCode;
            if (headers) this._headers = headers;
            return this;
        },
        end(chunk?: any) {
            this._body = chunk;
            return this;
        }
    };

    return {
        method: overrides.method ?? 'GET',
        pathParams: {},
        queryParams: {},
        headers: {},
        items,
        response,
        responded: false
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cacheResponse middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('passes through when endpoint has no cache tags', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });
        const ctx = makeContext({ cacheTags: [] });
        const next = vi.fn().mockResolvedValue(undefined);
        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });

    test('serves cached response on second GET', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });
        const meta = {
            cacheTags: [
                { name: 'todo', properties: { id: makeConstAccessor(42) } }
            ]
        };

        const ctx1 = makeContext(meta);
        let handlerCalled1 = false;
        await mw(ctx1, async () => {
            handlerCalled1 = true;
            ctx1.response.writeHead(200, {
                'content-type': 'application/json'
            });
            ctx1.response.end(JSON.stringify({ name: 'test' }));
        });
        expect(handlerCalled1).toBe(true);

        const ctx2 = makeContext(meta);
        let handlerCalled2 = false;
        await mw(ctx2, async () => {
            handlerCalled2 = true;
        });
        expect(handlerCalled2).toBe(false);
    });

    test('does not serve cached response after TTL expiry', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });
        const meta = {
            cacheTags: [
                { name: 'todo', properties: { id: makeConstAccessor(42) } }
            ]
        };

        const ctx1 = makeContext(meta);
        await mw(ctx1, async () => {
            ctx1.response.writeHead(200);
            ctx1.response.end('ok');
        });

        vi.advanceTimersByTime(5001);

        const ctx2 = makeContext(meta);
        let handlerCalled2 = false;
        await mw(ctx2, async () => {
            handlerCalled2 = true;
        });
        expect(handlerCalled2).toBe(true);
    });

    test('different property values produce different cache keys', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });

        const ctx1 = makeContext({
            cacheTags: [
                { name: 'todo', properties: { id: makeConstAccessor(1) } }
            ]
        });
        let handlerCalled1 = false;
        await mw(ctx1, async () => {
            handlerCalled1 = true;
            ctx1.response.writeHead(200);
            ctx1.response.end('value-1');
        });
        expect(handlerCalled1).toBe(true);

        const ctx2 = makeContext({
            cacheTags: [
                { name: 'todo', properties: { id: makeConstAccessor(2) } }
            ]
        });
        let handlerCalled2 = false;
        await mw(ctx2, async () => {
            handlerCalled2 = true;
        });
        expect(handlerCalled2).toBe(true);
    });

    test('simple tags (no properties) cache key is tag name', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });
        const meta = {
            cacheTags: [{ name: 'global', properties: {} }]
        };

        const ctx1 = makeContext(meta);
        let handlerCalled1 = false;
        await mw(ctx1, async () => {
            handlerCalled1 = true;
            ctx1.response.writeHead(200);
            ctx1.response.end('ok');
        });
        expect(handlerCalled1).toBe(true);

        const ctx2 = makeContext(meta);
        let handlerCalled2 = false;
        await mw(ctx2, async () => {
            handlerCalled2 = true;
        });
        expect(handlerCalled2).toBe(false);
    });

    test('mutation invalidates cache entries by tag name prefix', async () => {
        const mw = cacheResponse({ defaultTtl: 10_000 });
        const getMeta = {
            cacheTags: [{ name: 'todo-list', properties: {} }]
        };
        const mutMeta = {
            cacheTags: [{ name: 'todo-list', properties: {} }]
        };

        // Populate cache with GET
        const ctxGet = makeContext(getMeta);
        await mw(ctxGet, async () => {
            ctxGet.response.writeHead(200);
            ctxGet.response.end('list');
        });

        // Mutation
        const ctxMut = makeContext(mutMeta, { method: 'POST' });
        await mw(ctxMut, async () => {
            ctxMut.response.writeHead(201);
            ctxMut.response.end('created');
        });

        // GET after mutation — should miss cache
        const ctxGetAfter = makeContext(getMeta);
        let handlerCalled = false;
        await mw(ctxGetAfter, async () => {
            handlerCalled = true;
        });
        expect(handlerCalled).toBe(true);
    });

    test('mutation does not invalidate on non-2xx status', async () => {
        const mw = cacheResponse({ defaultTtl: 10_000 });
        const meta = {
            cacheTags: [{ name: 'todo-list', properties: {} }]
        };

        // Populate cache with GET
        const ctxGet = makeContext(meta);
        await mw(ctxGet, async () => {
            ctxGet.response.writeHead(200);
            ctxGet.response.end('list');
        });

        // Failed mutation (404)
        const ctxMut = makeContext(meta, { method: 'DELETE' });
        ctxMut.response.statusCode = 404;
        await mw(ctxMut, async () => {
            // Handler sets 404 — no writeHead needed
        });

        // GET after failed mutation — should hit cache
        const ctxGetAfter = makeContext(meta);
        let handlerCalled = false;
        await mw(ctxGetAfter, async () => {
            handlerCalled = true;
        });
        expect(handlerCalled).toBe(false);
    });

    test('uses per-tag TTL when configured', async () => {
        const mw = cacheResponse({
            defaultTtl: 5000,
            ttlByTag: { 'fast-tag': 1000 }
        });
        const meta = {
            cacheTags: [{ name: 'fast-tag', properties: {} }]
        };

        // Populate cache
        const ctx1 = makeContext(meta);
        await mw(ctx1, async () => {
            ctx1.response.writeHead(200);
            ctx1.response.end('ok');
        });

        // Within per-tag TTL — should hit cache
        vi.advanceTimersByTime(500);
        const ctx2 = makeContext(meta);
        let handlerCalled2 = false;
        await mw(ctx2, async () => {
            handlerCalled2 = true;
        });
        expect(handlerCalled2).toBe(false);

        // Past per-tag TTL but within default — should miss cache
        vi.advanceTimersByTime(501);
        const ctx3 = makeContext(meta);
        let handlerCalled3 = false;
        await mw(ctx3, async () => {
            handlerCalled3 = true;
        });
        expect(handlerCalled3).toBe(true);
    });

    test('non-GET non-mutation passes through', async () => {
        const mw = cacheResponse({ defaultTtl: 5000 });
        const meta = {
            cacheTags: [{ name: 'tag', properties: {} }]
        };
        const ctx = makeContext(meta, { method: 'OPTIONS' });
        const next = vi.fn().mockResolvedValue(undefined);
        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
