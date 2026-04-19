import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/HttpError.js';
import { IRequestContext, RequestContext } from '../src/RequestContext.js';

function createReqRes(
    options: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        /** Supply a Buffer directly for binary/chunked tests. */
        bodyBuffer?: Buffer;
    } = {}
) {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.url = options.url ?? '/';
    req.method = options.method ?? 'GET';
    if (options.headers) {
        req.headers = { ...req.headers, ...options.headers };
    }

    // If body provided, simulate readable stream
    const rawBody =
        options.bodyBuffer ??
        (options.body !== undefined ? Buffer.from(options.body) : undefined);
    if (rawBody !== undefined) {
        const readable = new Readable({
            read() {
                this.push(rawBody);
                this.push(null);
            }
        });
        // Replace event listeners to use the readable
        const origOn = req.on.bind(req);
        req.on = ((event: string, listener: (...args: any[]) => void) => {
            if (event === 'data' || event === 'end' || event === 'error') {
                readable.on(event, listener);
                return req;
            }
            return origOn(event, listener);
        }) as any;
    }

    const res = new ServerResponse(req);
    return { req, res };
}

describe('RequestContext', () => {
    it('parses method and URL', () => {
        const { req, res } = createReqRes({
            url: '/api/users?page=2',
            method: 'POST'
        });
        const ctx = new RequestContext(req, res);
        expect(ctx.method).toBe('POST');
        expect(ctx.url.pathname).toBe('/api/users');
    });

    it('extracts query params', () => {
        const { req, res } = createReqRes({ url: '/api?page=2&limit=10' });
        const ctx = new RequestContext(req, res);
        expect(ctx.queryParams).toEqual({ page: '2', limit: '10' });
    });

    it('extracts headers as lowercased keys', () => {
        const { req, res } = createReqRes({
            headers: { 'content-type': 'application/json', 'x-custom': 'test' }
        });
        const ctx = new RequestContext(req, res);
        expect(ctx.headers['content-type']).toBe('application/json');
        expect(ctx.headers['x-custom']).toBe('test');
    });

    it('reads and caches body', async () => {
        const { req, res } = createReqRes({ body: 'hello world' });
        const ctx = new RequestContext(req, res);
        const body1 = await ctx.body();
        const body2 = await ctx.body();
        expect(body1.toString()).toBe('hello world');
        expect(body1).toBe(body2); // cached
    });

    it('parses JSON body', async () => {
        const data = { name: 'Alice', age: 30 };
        const { req, res } = createReqRes({ body: JSON.stringify(data) });
        const ctx = new RequestContext(req, res);
        const json1 = await ctx.json();
        const json2 = await ctx.json();
        expect(json1).toEqual(data);
        expect(json1).toBe(json2); // cached
    });

    it('handles empty body for json()', async () => {
        const { req, res } = createReqRes({ body: '' });
        const ctx = new RequestContext(req, res);
        const json = await ctx.json();
        expect(json).toBeUndefined();
    });

    it('manages path params', () => {
        const { req, res } = createReqRes();
        const ctx = new RequestContext(req, res);
        ctx.pathParams = { id: '42', slug: 'hello' };
        expect(ctx.pathParams).toEqual({ id: '42', slug: 'hello' });
    });

    it('provides items map', () => {
        const { req, res } = createReqRes();
        const ctx = new RequestContext(req, res);
        ctx.items.set('userId', 42);
        expect(ctx.items.get('userId')).toBe(42);
    });

    it('tracks responded flag', () => {
        const { req, res } = createReqRes();
        const ctx = new RequestContext(req, res);
        expect(ctx.responded).toBe(false);
        ctx.responded = true;
        expect(ctx.responded).toBe(true);
    });

    it('IRequestContext is an object schema', () => {
        const introspect = IRequestContext.introspect();
        expect(introspect.type).toBe('object');
    });
});

describe('RequestContext — security', () => {
    it('rejects body exceeding maxBodySize with HttpError 413', async () => {
        // Simulate a stream that emits data in chunks
        const socket = new Socket();
        const req = new IncomingMessage(socket);
        req.url = '/';
        req.method = 'POST';

        const chunk = Buffer.alloc(512, 'x');
        const readable = new Readable({
            read() {
                // Push two 512-byte chunks = 1024 bytes total
                this.push(chunk);
                this.push(chunk);
                this.push(null);
            }
        });

        // Wire up request.destroy() to also destroy the readable
        const origDestroy = req.destroy.bind(req);
        req.destroy = ((err?: Error) => {
            readable.destroy();
            return origDestroy(err);
        }) as any;

        const origOn = req.on.bind(req);
        req.on = ((event: string, listener: (...args: any[]) => void) => {
            if (event === 'data' || event === 'end' || event === 'error') {
                readable.on(event, listener);
                return req;
            }
            return origOn(event, listener);
        }) as any;

        const res = new ServerResponse(req);
        const ctx = new RequestContext(req, res, 512); // limit to 512 bytes

        await expect(ctx.body()).rejects.toThrow(HttpError);

        // Verify a fresh instance also gives 413
        const req2 = new IncomingMessage(new Socket());
        req2.url = '/';
        req2.method = 'POST';
        const readable2 = new Readable({
            read() {
                this.push(Buffer.alloc(1024, 'x'));
                this.push(null);
            }
        });
        const origDestroy2 = req2.destroy.bind(req2);
        req2.destroy = ((err?: Error) => {
            readable2.destroy();
            return origDestroy2(err);
        }) as any;
        const origOn2 = req2.on.bind(req2);
        req2.on = ((event: string, listener: (...args: any[]) => void) => {
            if (event === 'data' || event === 'end' || event === 'error') {
                readable2.on(event, listener);
                return req2;
            }
            return origOn2(event, listener);
        }) as any;

        const res2 = new ServerResponse(req2);
        const ctx2 = new RequestContext(req2, res2, 512);

        try {
            await ctx2.body();
            expect.unreachable('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).status).toBe(413);
        }
    });

    it('accepts body within maxBodySize', async () => {
        const { req, res } = createReqRes({ body: 'hello' });
        const ctx = new RequestContext(req, res, 1024);
        const body = await ctx.body();
        expect(body.toString()).toBe('hello');
    });

    it('uses default maxBodySize of 5 MB', () => {
        const { req, res } = createReqRes();
        const ctx = new RequestContext(req, res);
        expect(ctx.maxBodySize).toBe(5 * 1024 * 1024);
    });

    it('json() strips __proto__ keys from parsed body', async () => {
        const malicious = '{"__proto__":{"polluted":true},"safe":"ok"}';
        const { req, res } = createReqRes({ body: malicious });
        const ctx = new RequestContext(req, res);
        const result = (await ctx.json()) as any;

        // __proto__ should not have been injected
        expect(result.safe).toBe('ok');
        expect(result.__proto__).toBe(Object.prototype);
        // Global Object.prototype must not be polluted
        expect(({} as any).polluted).toBeUndefined();
    });

    it('json() strips constructor keys from parsed body', async () => {
        const malicious =
            '{"constructor":{"prototype":{"polluted":true}},"ok":1}';
        const { req, res } = createReqRes({ body: malicious });
        const ctx = new RequestContext(req, res);
        const result = (await ctx.json()) as any;

        expect(result.ok).toBe(1);
        expect(result.constructor).toBe(Object);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('json() rejects deeply nested JSON exceeding max depth', async () => {
        // Build a JSON string nested 70 levels deep
        let json = '"leaf"';
        for (let i = 0; i < 70; i++) {
            json = `{"d":${json}}`;
        }
        const { req, res } = createReqRes({ body: json });
        const ctx = new RequestContext(req, res);

        await expect(ctx.json()).rejects.toThrow(
            'JSON nesting depth exceeds maximum of 64'
        );
    });

    it('json() accepts JSON within max nesting depth', async () => {
        let json = '"leaf"';
        for (let i = 0; i < 60; i++) {
            json = `{"d":${json}}`;
        }
        const { req, res } = createReqRes({ body: json });
        const ctx = new RequestContext(req, res);

        const result = await ctx.json();
        expect(result).toBeDefined();
    });
});
