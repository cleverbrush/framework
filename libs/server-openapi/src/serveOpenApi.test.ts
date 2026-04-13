import type { ServerResponse } from 'node:http';
import type { EndpointRegistration } from '@cleverbrush/server';
import { describe, expect, it, vi } from 'vitest';
import { serveOpenApi } from './serveOpenApi.js';

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
        } as unknown as ServerResponse
    };
}

function makeMiddleware(path?: string) {
    return serveOpenApi({
        getRegistrations: () => [] as EndpointRegistration[],
        info: { title: 'Test', version: '0.1.0' },
        path
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serveOpenApi', () => {
    it('responds with JSON at /openapi.json by default', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('GET', '/openapi.json');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(ctx.response.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ 'content-type': 'application/json' })
        );
        expect(ctx.response.end).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
        // Verify the body is valid JSON
        const body = (ctx.response.end as any).mock.calls[0][0];
        const parsed = JSON.parse(body);
        expect(parsed.openapi).toBe('3.1.0');
    });

    it('serves at a custom path', async () => {
        const mw = makeMiddleware('/docs/spec.json');
        const ctx = makeContext('GET', '/docs/spec.json');
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

    it('passes through for non-GET methods on the spec path', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('POST', '/openapi.json');
        const next = vi.fn();
        await mw(ctx as any, next);

        expect(next).toHaveBeenCalledOnce();
        expect(ctx.response.writeHead).not.toHaveBeenCalled();
    });

    it('caches the spec after first request', async () => {
        let callCount = 0;
        const mw = serveOpenApi({
            getRegistrations: () => {
                callCount++;
                return [] as EndpointRegistration[];
            },
            info: { title: 'Test', version: '1.0.0' }
        });

        const ctx1 = makeContext('GET', '/openapi.json');
        await mw(ctx1 as any, vi.fn());
        const ctx2 = makeContext('GET', '/openapi.json');
        await mw(ctx2 as any, vi.fn());

        // getRegistrations should only be called once due to caching
        expect(callCount).toBe(1);
    });

    it('sets content-length header', async () => {
        const mw = makeMiddleware();
        const ctx = makeContext('GET', '/openapi.json');
        await mw(ctx as any, vi.fn());

        const headers = (ctx.response.writeHead as any).mock.calls[0][1];
        expect(headers['content-length']).toBeDefined();
        expect(Number(headers['content-length'])).toBeGreaterThan(0);
    });
});
