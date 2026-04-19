import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
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
