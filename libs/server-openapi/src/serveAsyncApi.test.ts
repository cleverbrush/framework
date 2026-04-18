import type { SubscriptionRegistration } from '@cleverbrush/server';
import { describe, expect, it, vi } from 'vitest';
import { serveAsyncApi } from './serveAsyncApi.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
    method: string,
    pathname: string
): { url: URL; method: string; response: any } {
    let endedBody: string | undefined;
    return {
        url: new URL(`http://localhost${pathname}`),
        method,
        response: {
            writeHead: vi.fn(),
            end: vi.fn((body?: string) => {
                endedBody = body;
            }),
            get _endedBody() {
                return endedBody;
            }
        } as unknown
    };
}

function makeMiddleware(path?: string) {
    return serveAsyncApi({
        getSubscriptionRegistrations: () => [] as SubscriptionRegistration[],
        info: { title: 'Test', version: '0.1.0' },
        path
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serveAsyncApi', () => {
    it('responds with JSON at /asyncapi.json by default', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('GET', '/asyncapi.json');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(ctx.response.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ 'content-type': 'application/json' })
        );
        expect(ctx.response.end).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();

        const body = (ctx.response.end as any).mock.calls[0][0];
        const parsed = JSON.parse(body);
        expect(parsed.asyncapi).toBe('3.0.0');
    });

    it('serves at a custom path', async () => {
        const mw = makeMiddleware('/docs/asyncapi.json');
        const ctx = makeContext('GET', '/docs/asyncapi.json');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(ctx.response.writeHead).toHaveBeenCalledWith(
            200,
            expect.any(Object)
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('passes through for non-matching paths', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('GET', '/api/items');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(next).toHaveBeenCalledOnce();
        expect(ctx.response.writeHead).not.toHaveBeenCalled();
    });

    it('passes through for non-GET requests', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('POST', '/asyncapi.json');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(next).toHaveBeenCalledOnce();
        expect(ctx.response.writeHead).not.toHaveBeenCalled();
    });

    it('caches the spec and calls getSubscriptionRegistrations only once', async () => {
        const getSubs = vi.fn().mockReturnValue([]);
        const mw = serveAsyncApi({
            getSubscriptionRegistrations: getSubs,
            info: { title: 'Test', version: '1.0.0' }
        });

        const ctx1 = makeContext('GET', '/asyncapi.json');
        const ctx2 = makeContext('GET', '/asyncapi.json');
        await mw(ctx1 as any, vi.fn());
        await mw(ctx2 as any, vi.fn());

        expect(getSubs).toHaveBeenCalledTimes(1);
    });

    it('reads subscriptions from server.getSubscriptionRegistrations()', async () => {
        const server = {
            getSubscriptionRegistrations: vi.fn().mockReturnValue([])
        };
        const mw = serveAsyncApi({
            server,
            info: { title: 'Test', version: '1.0.0' }
        });

        const ctx = makeContext('GET', '/asyncapi.json');
        await mw(ctx as any, vi.fn());

        expect(server.getSubscriptionRegistrations).toHaveBeenCalledTimes(1);
        const body = (ctx.response.end as any).mock.calls[0][0];
        const parsed = JSON.parse(body);
        expect(parsed.asyncapi).toBe('3.0.0');
    });
});
