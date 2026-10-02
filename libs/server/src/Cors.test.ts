import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { CorsPolicy, type ServerCorsOptions } from './Cors.js';

function exchange(headers: IncomingMessage['headers'] = {}) {
    const req = new IncomingMessage(new Socket());
    req.method = 'OPTIONS';
    req.url = '/records';
    req.headers = headers;
    return { req, res: new ServerResponse(req) };
}

const origin = 'https://app.example.test';
const match = () => ({ status: 200 as const });

describe('CORS policy configuration', () => {
    it.each([
        {},
        { origin: true },
        { origin: '' },
        { origin: 'https://app.example.test/' },
        { origin: 'https://user:password@app.example.test' },
        { origin: ['*'] },
        { origin: ['https://app.example.test', 42] },
        { origin: '*', credentials: true },
        { origin, credentials: 'true' },
        { origin, methods: ['*'] },
        { origin, methods: ['POST, DELETE'] },
        { origin, methods: ['POST\n'] },
        { origin, allowedHeaders: ['*'] },
        { origin, allowedHeaders: 'authorization' },
        { origin, exposedHeaders: ['x-test\r\nx-other'] },
        { origin, exposedHeaders: ['*'] },
        { origin, exposedHeaders: ['x-test\n'] },
        { origin, maxAgeSeconds: -1 },
        { origin, maxAgeSeconds: 1.5 },
        { origin, maxAgeSeconds: Infinity },
        { origin, maxAgeSeconds: NaN },
        { origin, maxAgeSeconds: null },
        { origin, maxAgeSeconds: '600' }
    ])('rejects invalid configuration %j', options => {
        expect(() => new CorsPolicy(options as ServerCorsOptions)).toThrow(
            TypeError
        );
    });

    it('copies configured arrays so later mutation cannot expand permission', async () => {
        const options = {
            origin: [origin],
            methods: ['POST'],
            allowedHeaders: ['Authorization'],
            exposedHeaders: ['X-Request-Id']
        };
        const policy = new CorsPolicy(options);
        options.origin.push('https://untrusted.example.test');
        options.methods.push('DELETE');
        options.allowedHeaders.push('x-other');
        options.exposedHeaders.push('x-secret');
        const allowed = exchange({
            origin,
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'authorization'
        });
        expect(await policy.handle(allowed.req, allowed.res, match)).toBe(true);
        expect(allowed.res.statusCode).toBe(204);
        for (const headers of [
            { origin: 'https://untrusted.example.test' },
            { origin, 'access-control-request-method': 'DELETE' },
            {
                origin,
                'access-control-request-method': 'POST',
                'access-control-request-headers': 'x-other'
            }
        ]) {
            const { req, res } = exchange(headers);
            await policy.handle(req, res, match);
            expect(res.statusCode).toBe(403);
        }
        const actual = exchange({ origin });
        actual.req.method = 'GET';
        expect(await policy.handle(actual.req, actual.res, match)).toBe(false);
        actual.res.end();
        expect(actual.res.getHeader('access-control-expose-headers')).toBe(
            'x-request-id'
        );
    });
});

describe('CORS policy parsing', () => {
    it.each([
        '',
        'https://app.example.test, https://other.example.test',
        'https://app.example.test/path',
        'null https://app.example.test'
    ])('rejects malformed Origin without calling a predicate: %s', async value => {
        const predicate = vi.fn(() => true);
        const { req, res } = exchange({ origin: value });
        await new CorsPolicy({ origin: predicate }).handle(req, res, match);
        expect(res.statusCode).toBe(403);
        expect(predicate).not.toHaveBeenCalled();
        expect(res.getHeader('access-control-allow-origin')).toBeUndefined();
    });
    it.each([
        { 'access-control-request-method': '' },
        { 'access-control-request-method': 'POST, DELETE' },
        { 'access-control-request-method': '*' },
        {
            'access-control-request-method': 'POST',
            'access-control-request-headers': ''
        },
        {
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'x-one,,x-two'
        },
        {
            'access-control-request-method': 'POST',
            'access-control-request-headers': '*'
        },
        {
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'x bad'
        }
    ])('rejects malformed preflight fields %j', async headers => {
        const { req, res } = exchange({ origin, ...headers });
        const route = vi.fn(match);
        await new CorsPolicy({ origin }).handle(req, res, route);
        expect(res.statusCode).toBe(400);
        expect(route).not.toHaveBeenCalled();
        expect(res.getHeader('access-control-allow-origin')).toBeUndefined();
    });
    it('treats a non-boolean callback result as a configuration failure', async () => {
        const { req, res } = exchange({ origin });
        const policy = new CorsPolicy({ origin: (() => 'yes') as any });
        await policy.handle(req, res, match);
        expect(res.statusCode).toBe(500);
        expect(res.getHeader('access-control-allow-origin')).toBeUndefined();
    });
});
