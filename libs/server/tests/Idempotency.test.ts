import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { idempotency } from '../src/middlewares/Idempotency.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
    headers: Record<string, string> = {},
    method = 'POST'
): any {
    const response: any = {
        statusCode: 200,
        _headers: {} as Record<string, string>,
        _body: null as any,
        writeHead(statusCode: number, hdrs?: any) {
            this.statusCode = statusCode;
            if (hdrs) this._headers = hdrs;
            return this;
        },
        end(chunk?: any) {
            this._body = chunk;
            return this;
        }
    };

    return {
        method,
        headers,
        response,
        responded: false,
        pathParams: {},
        queryParams: {},
        items: new Map()
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('idempotency middleware', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('passes through GET requests', async () => {
        const mw = idempotency({ ttl: 5000 });
        const ctx = makeContext({ 'x-idempotency-key': 'key-1' }, 'GET');
        const next = vi.fn().mockResolvedValue(undefined);
        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });

    test('passes through mutations without idempotency key', async () => {
        const mw = idempotency({ ttl: 5000 });
        const ctx = makeContext({}, 'POST');
        const next = vi.fn().mockResolvedValue(undefined);
        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });

    test('passes through on first request with key', async () => {
        const mw = idempotency({ ttl: 5000 });
        const ctx = makeContext({ 'x-idempotency-key': 'key-1' }, 'POST');
        let handlerCalled = false;
        await mw(ctx, async () => {
            handlerCalled = true;
            ctx.response.writeHead(201);
            ctx.response.end('created');
        });
        expect(handlerCalled).toBe(true);
    });

    test('returns stored response on duplicate key', async () => {
        const mw = idempotency({ ttl: 10_000 });

        // First request
        const ctx1 = makeContext({ 'x-idempotency-key': 'key-dup' }, 'POST');
        await mw(ctx1, async () => {
            ctx1.response.writeHead(201, {
                'content-type': 'application/json'
            });
            ctx1.response.end(JSON.stringify({ id: 1 }));
        });

        // Duplicate with same key
        const ctx2 = makeContext({ 'x-idempotency-key': 'key-dup' }, 'POST');
        let handlerCalled = false;
        await mw(ctx2, async () => {
            handlerCalled = true;
        });

        expect(handlerCalled).toBe(false);
        expect(ctx2.responded).toBe(true);
    });

    test('different keys store independently', async () => {
        const mw = idempotency({ ttl: 10_000 });

        const ctx1 = makeContext({ 'x-idempotency-key': 'key-a' }, 'POST');
        await mw(ctx1, async () => {
            ctx1.response.writeHead(200);
            ctx1.response.end('result-a');
        });

        const ctx2 = makeContext({ 'x-idempotency-key': 'key-b' }, 'POST');
        let handlerCalled = false;
        await mw(ctx2, async () => {
            handlerCalled = true;
        });

        expect(handlerCalled).toBe(true);
    });

    test('expired key calls handler again', async () => {
        const mw = idempotency({ ttl: 1000 });

        const ctx1 = makeContext({ 'x-idempotency-key': 'key-exp' }, 'POST');
        await mw(ctx1, async () => {
            ctx1.response.writeHead(200);
            ctx1.response.end('first');
        });

        // Advance past TTL
        vi.advanceTimersByTime(1001);

        const ctx2 = makeContext({ 'x-idempotency-key': 'key-exp' }, 'POST');
        let handlerCalled = false;
        await mw(ctx2, async () => {
            handlerCalled = true;
        });

        expect(handlerCalled).toBe(true);
    });

    test('handles case-insensitive header name', async () => {
        const mw = idempotency({
            ttl: 10_000,
            headerName: 'X-Idempotency-Key'
        });

        const ctx1 = makeContext({ 'x-idempotency-key': 'key-ci' }, 'POST');
        await mw(ctx1, async () => {
            ctx1.response.writeHead(200);
            ctx1.response.end('ok');
        });

        const ctx2 = makeContext({ 'x-idempotency-key': 'key-ci' }, 'POST');
        let handlerCalled = false;
        await mw(ctx2, async () => {
            handlerCalled = true;
        });

        expect(handlerCalled).toBe(false);
    });

    test('stores error responses too (non-2xx under 500)', async () => {
        const mw = idempotency({ ttl: 10_000 });

        const ctx1 = makeContext({ 'x-idempotency-key': 'key-err' }, 'POST');
        await mw(ctx1, async () => {
            ctx1.response.writeHead(422);
            ctx1.response.end('validation error');
        });

        const ctx2 = makeContext({ 'x-idempotency-key': 'key-err' }, 'POST');
        let handlerCalled = false;
        await mw(ctx2, async () => {
            handlerCalled = true;
        });

        expect(handlerCalled).toBe(false);
    });

    test('custom skip predicate', async () => {
        const mw = idempotency({
            ttl: 10_000,
            skip: ctx => ctx.method === 'DELETE'
        });

        const ctx = makeContext({ 'x-idempotency-key': 'key-skip' }, 'DELETE');
        const next = vi.fn().mockResolvedValue(undefined);
        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
