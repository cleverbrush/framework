import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { HttpError } from './HttpError.js';
import { RequestContext } from './RequestContext.js';

function createReqRes(
    options: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
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

function createStreamingContext(
    chunks: Buffer[],
    maxBodySize: number
): RequestContext {
    const req = new IncomingMessage(new Socket());
    req.url = '/';
    req.method = 'POST';

    const readable = new Readable({
        read() {
            for (const chunk of chunks) {
                this.push(chunk);
            }
            this.push(null);
        }
    });

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
    return new RequestContext(req, res, maxBodySize);
}

describe('RequestContext — security', () => {
    it('rejects chunked body exceeding maxBodySize with HttpError 413', async () => {
        const chunk = Buffer.alloc(512, 'x');
        const ctx = createStreamingContext([chunk, chunk], 512);

        await expect(ctx.body()).rejects.toThrow(HttpError);
    });

    it('rejects single oversized chunk with status 413', async () => {
        const ctx = createStreamingContext([Buffer.alloc(1024, 'x')], 512);

        await expect(ctx.body()).rejects.toMatchObject({
            status: 413
        });
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

        expect(result.safe).toBe('ok');
        expect(result.__proto__).toBe(Object.prototype);
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
