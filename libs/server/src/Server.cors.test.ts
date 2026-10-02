import { Readable } from 'node:stream';
import { type AuthenticationScheme, Principal } from '@cleverbrush/auth';
import { number, object, string } from '@cleverbrush/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionResult } from './ActionResult.js';
import { endpoint } from './Endpoint.js';
import { HttpError } from './HttpError.js';
import { idempotency } from './middlewares/Idempotency.js';
import { cacheResponse } from './middlewares/ResponseCache.js';
import { route } from './route.js';
import { type Server, ServerBuilder } from './Server.js';

const origin = 'https://app.example.test';
const otherOrigin = 'https://other.example.test';
const servers: Server[] = [];

async function start(builder: ServerBuilder) {
    const server = await builder.listen(0, '127.0.0.1');
    servers.push(server);
    return `http://127.0.0.1:${server.address!.port}`;
}

async function send(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    return {
        status: response.status,
        headers: response.headers,
        body: await response.text()
    };
}

function preflight(url: string, method = 'POST', headers?: string) {
    return send(url, {
        method: 'OPTIONS',
        headers: {
            origin,
            'access-control-request-method': method,
            ...(headers === undefined
                ? {}
                : { 'access-control-request-headers': headers })
        }
    });
}

function authentication() {
    const scheme: AuthenticationScheme = {
        name: 'token',
        authenticate: vi.fn(async ctx =>
            ctx.headers.authorization === 'Bearer token'
                ? {
                      succeeded: true,
                      principal: new Principal(true, { id: 'reader' })
                  }
                : { succeeded: false }
        ),
        challenge: () => ({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        })
    };
    return { defaultScheme: 'token', schemes: [scheme] };
}

afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => server.close()));
    vi.restoreAllMocks();
});

describe('HTTP CORS preflights', () => {
    it('leaves routing, middleware and headers unchanged when disabled', async () => {
        const handler = vi.fn(() => ({ ok: true }));
        const middleware = vi.fn(async (_ctx, next) => next());
        const url = await start(
            new ServerBuilder()
                .use(middleware)
                .handle(endpoint.post('/records'), handler)
        );
        const before = await preflight(`${url}/records`);
        expect(before.status).toBe(405);
        expect(before.headers.get('allow')).toBe('POST');
        expect(before.headers.get('access-control-allow-origin')).toBeNull();
        expect(before.headers.get('vary')).toBeNull();
        expect(middleware).not.toHaveBeenCalled();
        const actual = await send(`${url}/records`, {
            method: 'POST',
            headers: { origin }
        });
        expect(actual.status).toBe(200);
        expect(actual.headers.get('access-control-allow-origin')).toBeNull();
        expect(middleware).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('accepts preflight before auth but still authenticates actual protected requests', async () => {
        const auth = authentication();
        const handler = vi.fn(() =>
            ActionResult.ok({ ok: true }, { 'x-request-id': 'request-1' })
        );
        const middleware = vi.fn(async (_ctx, next) => next());
        const url = await start(
            new ServerBuilder()
                .use(middleware)
                .useAuthentication(auth)
                .useAuthorization()
                .useCors({
                    origin,
                    methods: ['POST'],
                    allowedHeaders: ['Authorization', 'Content-Type'],
                    exposedHeaders: ['X-Request-Id', 'WWW-Authenticate'],
                    credentials: true,
                    maxAgeSeconds: 600
                })
                .handle(endpoint.post('/records').authorize(), handler)
        );
        const before = await preflight(
            `${url}/records`,
            'POST',
            'AUTHORIZATION, content-TYPE, authorization'
        );
        expect(before.status).toBe(204);
        expect(before.body).toBe('');
        expect(before.headers.get('access-control-allow-origin')).toBe(origin);
        expect(before.headers.get('access-control-allow-credentials')).toBe(
            'true'
        );
        expect(before.headers.get('access-control-allow-methods')).toBe('POST');
        expect(before.headers.get('access-control-allow-headers')).toBe(
            'authorization, content-type'
        );
        expect(before.headers.get('access-control-max-age')).toBe('600');
        expect(before.headers.get('access-control-expose-headers')).toBeNull();
        expect(before.headers.get('vary')).toBe(
            'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
        );
        expect(auth.schemes[0].authenticate).not.toHaveBeenCalled();
        expect(middleware).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
        const denied = await send(`${url}/records`, {
            method: 'POST',
            headers: { origin }
        });
        expect(denied.status).toBe(401);
        expect(denied.headers.get('access-control-allow-origin')).toBe(origin);
        expect(denied.headers.get('www-authenticate')).toBe('Bearer');
        expect(denied.headers.get('access-control-expose-headers')).toBe(
            'x-request-id, www-authenticate'
        );
        expect(handler).not.toHaveBeenCalled();
        const accepted = await send(`${url}/records`, {
            method: 'POST',
            headers: { origin, authorization: 'Bearer token' }
        });
        expect(accepted.status).toBe(200);
        expect(accepted.headers.get('access-control-allow-credentials')).toBe(
            'true'
        );
        expect(accepted.headers.get('access-control-allow-methods')).toBeNull();
        expect(accepted.headers.get('x-request-id')).toBe('request-1');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('rejects disallowed origins before authentication and handlers on actual and preflight requests', async () => {
        const auth = authentication();
        const handler = vi.fn(() => ({ ok: true }));
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .useAuthentication(auth)
                .useAuthorization()
                .handle(endpoint.post('/records').authorize(), handler)
        );
        for (const method of ['POST', 'OPTIONS']) {
            const response = await send(`${url}/records`, {
                method,
                headers: {
                    origin: otherOrigin,
                    'access-control-request-method': 'POST',
                    authorization: 'Bearer token'
                }
            });
            expect(response.status).toBe(403);
            expect(
                response.headers.get('access-control-allow-origin')
            ).toBeNull();
            expect(
                response.headers.get('access-control-allow-methods')
            ).toBeNull();
            expect(JSON.parse(response.body).status).toBe(403);
        }
        expect(auth.schemes[0].authenticate).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
    });

    it('restricts preflight methods and headers without changing ordinary routing', async () => {
        const url = await start(
            new ServerBuilder()
                .useCors({
                    origin,
                    methods: ['post'],
                    allowedHeaders: ['content-type']
                })
                .handle(endpoint.post('/records'), () => ({}))
                .handle(endpoint.delete('/records'), () => ({}))
        );
        const deniedMethod = await preflight(`${url}/records`, 'DELETE');
        const deniedHeader = await preflight(
            `${url}/records`,
            'POST',
            'authorization'
        );
        for (const response of [deniedMethod, deniedHeader]) {
            expect(response.status).toBe(403);
            expect(
                response.headers.get('access-control-allow-origin')
            ).toBeNull();
        }
        const allowed = await preflight(
            `${url}/records`,
            'POST',
            'Content-Type'
        );
        expect(allowed.status).toBe(204);
        expect(allowed.headers.get('access-control-max-age')).toBe('0');
        expect(
            allowed.headers.get('access-control-allow-credentials')
        ).toBeNull();
        expect(
            (
                await send(`${url}/records`, {
                    method: 'DELETE',
                    headers: { origin }
                })
            ).status
        ).toBe(200);
    });

    it('matches typed routes and distinguishes malformed URLs, missing paths and unsupported methods', async () => {
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .handle(
                    endpoint
                        .resource('/records')
                        .post(route({ id: number().coerce() })`/${p => p.id}`),
                    () => ({})
                )
        );
        expect((await preflight(`${url}/records/12?view=full`)).status).toBe(
            204
        );
        for (const [path, method, status] of [
            ['/records/12', 'DELETE', 405],
            ['/records/12', 'HEAD', 405],
            ['/records/not-a-number', 'POST', 404],
            ['/missing', 'POST', 404],
            ['/records/%ZZ', 'POST', 400]
        ] as const) {
            const response = await preflight(`${url}${path}`, method);
            expect(response.status).toBe(status);
            expect(
                response.headers.get('access-control-allow-origin')
            ).toBeNull();
            if (status === 405)
                expect(response.headers.get('allow')).toBe('POST');
        }
    });

    it('preserves ordinary OPTIONS handlers and intercepts only recognized preflights', async () => {
        const handler = vi.fn(() => ActionResult.status(202));
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .handle(endpoint.options('/records'), handler)
                .handle(endpoint.post('/records'), () => ({}))
        );
        expect(
            (
                await send(`${url}/records`, {
                    method: 'OPTIONS',
                    headers: { origin }
                })
            ).status
        ).toBe(202);
        expect(
            (
                await send(`${url}/records`, {
                    method: 'OPTIONS',
                    headers: { 'access-control-request-method': 'POST' }
                })
            ).status
        ).toBe(202);
        expect((await preflight(`${url}/records`)).status).toBe(204);
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('includes enabled health and batch routes using their actual configured paths', async () => {
        const url = await start(
            new ServerBuilder()
                .useCors({ origin, allowedHeaders: ['content-type'] })
                .withHealthcheck()
                .useBatching({ path: '/batch' })
        );
        expect((await preflight(`${url}/health`, 'GET')).status).toBe(204);
        expect(
            (await preflight(`${url}/batch`, 'POST', 'content-type')).status
        ).toBe(204);
        expect((await preflight(`${url}/__batch`)).status).toBe(404);
        const wrong = await preflight(`${url}/health`, 'POST');
        expect(wrong.status).toBe(405);
        expect(wrong.headers.get('allow')).toBe('GET');
        expect(
            (await send(`${url}/health`, { headers: { origin } })).headers.get(
                'access-control-allow-origin'
            )
        ).toBe(origin);
        const invalidBatch = await send(`${url}/batch`, {
            method: 'POST',
            headers: { origin, 'content-type': 'application/json' },
            body: '{}'
        });
        expect(invalidBatch.status).toBe(400);
        expect(invalidBatch.headers.get('access-control-allow-origin')).toBe(
            origin
        );
    });
});

describe('HTTP CORS origin policies', () => {
    it.each([
        false,
        true
    ])('evaluates %s async predicates on every request and skips absent origins', async asynchronous => {
        let allowed = true;
        const predicate = vi.fn((value: string) =>
            asynchronous
                ? Promise.resolve(allowed && value === origin)
                : allowed && value === origin
        );
        const handler = vi.fn(() => ({}));
        const url = await start(
            new ServerBuilder()
                .useCors({ origin: predicate })
                .handle(endpoint.get('/records'), handler)
        );
        expect((await preflight(`${url}/records`, 'GET')).status).toBe(204);
        expect(
            (await send(`${url}/records`, { headers: { origin } })).status
        ).toBe(200);
        allowed = false;
        expect((await preflight(`${url}/records`, 'GET')).status).toBe(403);
        expect(
            (await send(`${url}/records`, { headers: { origin } })).status
        ).toBe(403);
        const absent = await send(`${url}/records`);
        expect(absent.status).toBe(200);
        expect(absent.headers.get('access-control-allow-origin')).toBeNull();
        expect(absent.headers.get('vary')).toBe('Origin');
        expect(predicate).toHaveBeenCalledTimes(4);
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it.each([
        false,
        true
    ])('fails closed with a generic 500 on %s async callback errors', async asynchronous => {
        const handler = vi.fn(() => ({}));
        const predicate = () => {
            const error = new HttpError(418, 'private origin lookup failure');
            if (asynchronous) return Promise.reject(error);
            throw error;
        };
        const url = await start(
            new ServerBuilder()
                .useCors({ origin: predicate })
                .handle(endpoint.post('/records'), handler)
        );
        for (const response of [
            await preflight(`${url}/records`),
            await send(`${url}/records`, {
                method: 'POST',
                headers: { origin }
            })
        ]) {
            expect(response.status).toBe(500);
            expect(
                response.headers.get('access-control-allow-origin')
            ).toBeNull();
            expect(response.body).not.toContain('private');
        }
        expect(handler).not.toHaveBeenCalled();
    });

    it('supports explicit public wildcard and opaque-origin policies', async () => {
        const wildcard = await start(
            new ServerBuilder()
                .useCors({ origin: '*' })
                .handle(endpoint.get('/records'), () => ({}))
        );
        const response = await send(`${wildcard}/records`, {
            headers: { origin }
        });
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(
            response.headers.get('access-control-allow-credentials')
        ).toBeNull();
        const opaque = await start(
            new ServerBuilder()
                .useCors({ origin: ['null'] })
                .handle(endpoint.get('/records'), () => ({}))
        );
        expect(
            (
                await send(`${opaque}/records`, { headers: { origin: 'null' } })
            ).headers.get('access-control-allow-origin')
        ).toBe('null');
        expect(
            (await send(`${opaque}/records`, { headers: { origin } })).status
        ).toBe(403);
    });

    it('validates policy before opening a listening socket', async () => {
        await expect(
            new ServerBuilder()
                .useCors({ origin: '*', credentials: true })
                .listen(0, '127.0.0.1')
        ).rejects.toThrow('credentials require');
    });

    it('evaluates only the physical batch origin while subrequests retain authentication', async () => {
        const predicate = vi.fn((value: string) => value === origin);
        const handler = vi.fn(() => ({ ok: true }));
        const url = await start(
            new ServerBuilder()
                .useCors({ origin: predicate })
                .useBatching()
                .useAuthentication(authentication())
                .useAuthorization()
                .handle(endpoint.get('/private').authorize(), handler)
        );
        const response = await send(`${url}/__batch`, {
            method: 'POST',
            headers: { origin, 'content-type': 'application/json' },
            body: JSON.stringify({
                requests: [
                    {
                        method: 'GET',
                        url: '/private',
                        headers: { origin: otherOrigin }
                    },
                    {
                        method: 'GET',
                        url: '/private',
                        headers: {
                            origin: otherOrigin,
                            authorization: 'Bearer token'
                        }
                    }
                ]
            })
        });
        expect(response.status).toBe(200);
        expect(response.headers.get('access-control-allow-origin')).toBe(
            origin
        );
        const { responses } = JSON.parse(response.body);
        expect(responses.map((item: any) => item.status)).toEqual([401, 200]);
        for (const item of responses)
            expect(item.headers['access-control-allow-origin']).toBeUndefined();
        expect(predicate).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledTimes(1);
    });
});

describe('HTTP CORS response headers', () => {
    it('preserves CORS on validation, authorization, route and server errors', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .useAuthentication(authentication())
                .useAuthorization()
                .handle(
                    endpoint.post('/records').body(object({ name: string() })),
                    () => ({})
                )
                .handle(endpoint.get('/admin').authorize('admin'), () => ({}))
                .handle(endpoint.get('/limited'), () => {
                    throw new HttpError(429, 'Too Many Requests');
                })
                .handle(endpoint.get('/failure'), () => {
                    throw new Error('private handler failure');
                })
        );
        for (const [path, init, status] of [
            [
                '/records',
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: '{}'
                },
                400
            ],
            [
                '/records',
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-unknown' },
                    body: 'body'
                },
                415
            ],
            ['/records', { method: 'GET' }, 405],
            ['/missing', {}, 404],
            ['/admin', {}, 401],
            ['/admin', { headers: { authorization: 'Bearer token' } }, 403],
            ['/limited', {}, 429],
            ['/failure', {}, 500]
        ] as const) {
            const response = await send(`${url}${path}`, {
                ...init,
                headers: { origin, ...('headers' in init ? init.headers : {}) }
            });
            expect(response.status).toBe(status);
            expect(response.headers.get('access-control-allow-origin')).toBe(
                origin
            );
            expect(response.headers.get('vary')).toBe('Origin');
            expect(response.body).not.toContain('private handler failure');
        }
    });

    it.each([
        'implicit',
        'object',
        'array',
        'message-object',
        'message-array'
    ])('merges Vary and preserves cookies with native %s header writes', async mode => {
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .handle(endpoint.get('/records'), () =>
                    ActionResult.raw((_req, res) => {
                        res.setHeader('vary', 'Accept-Encoding, origin');
                        res.setHeader('access-control-allow-origin', '*');
                        res.setHeader(
                            'access-control-allow-credentials',
                            'true'
                        );
                        const headers = {
                            Vary: 'Accept, ORIGIN',
                            'Set-Cookie': ['a=1', 'b=2'],
                            'Access-Control-Allow-Origin': otherOrigin
                        };
                        const raw = [
                            'Vary',
                            'Accept, ORIGIN',
                            'Set-Cookie',
                            'a=1',
                            'Set-Cookie',
                            'b=2',
                            'Access-Control-Allow-Origin',
                            otherOrigin
                        ];
                        if (mode === 'object') res.writeHead(202, headers);
                        else if (mode === 'array') res.writeHead(202, raw);
                        else if (mode === 'message-object')
                            res.writeHead(202, 'Accepted', headers);
                        else if (mode === 'message-array')
                            res.writeHead(202, 'Accepted', raw);
                        else {
                            res.statusCode = 202;
                            res.setHeader('set-cookie', ['a=1', 'b=2']);
                            res.setHeader(
                                'vary',
                                'Accept-Encoding, origin, Accept'
                            );
                        }
                        res.end('raw');
                    })
                )
        );
        const response = await send(`${url}/records`, { headers: { origin } });
        expect(response.status).toBe(202);
        expect(response.body).toBe('raw');
        expect(response.headers.get('access-control-allow-origin')).toBe(
            origin
        );
        expect(
            response.headers.get('access-control-allow-credentials')
        ).toBeNull();
        expect(response.headers.get('vary')).toBe(
            'Accept-Encoding, origin, Accept'
        );
        expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
    });

    it('preserves Vary wildcard and CORS on streamed results', async () => {
        const url = await start(
            new ServerBuilder()
                .useCors({ origin })
                .use(async (ctx, next) => {
                    ctx.response.setHeader('vary', '*');
                    await next();
                })
                .handle(endpoint.get('/stream'), () =>
                    ActionResult.stream(
                        Readable.from(['streamed']),
                        'text/plain'
                    )
                )
        );
        const response = await send(`${url}/stream`, { headers: { origin } });
        expect(response.body).toBe('streamed');
        expect(response.headers.get('vary')).toBe('*');
        expect(response.headers.get('access-control-allow-origin')).toBe(
            origin
        );
    });

    it.each([
        'cache',
        'idempotency'
    ])('recomputes CORS on %s replay without mutating stored headers', async mode => {
        let calls = 0;
        const savedHeaders = Object.freeze({
            'content-type': 'text/plain',
            Vary: 'Accept',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
        });
        const url = await start(
            new ServerBuilder()
                .useCors({ origin: [origin, otherOrigin] })
                .handle(
                    mode === 'cache'
                        ? endpoint.get('/records').cacheTag('records')
                        : endpoint.post('/records'),
                    () =>
                        ActionResult.raw((_req, res) => {
                            calls++;
                            res.writeHead(200, savedHeaders);
                            res.end('saved body');
                        }),
                    {
                        middlewares: [
                            mode === 'cache' ? cacheResponse() : idempotency()
                        ]
                    }
                )
        );
        for (const value of [origin, otherOrigin, undefined]) {
            const response = await send(`${url}/records`, {
                method: mode === 'cache' ? 'GET' : 'POST',
                headers: {
                    ...(value ? { origin: value } : {}),
                    'x-idempotency-key': 'same-key'
                }
            });
            expect(response.body).toBe('saved body');
            expect(response.headers.get('access-control-allow-origin')).toBe(
                value ?? null
            );
            expect(
                response.headers.get('access-control-allow-credentials')
            ).toBeNull();
            expect(response.headers.get('vary')).toBe('Accept, Origin');
        }
        const denied = await send(`${url}/records`, {
            method: mode === 'cache' ? 'GET' : 'POST',
            headers: {
                origin: 'https://denied.example.test',
                'x-idempotency-key': 'same-key'
            }
        });
        expect(denied.status).toBe(403);
        expect(denied.headers.get('access-control-allow-origin')).toBeNull();
        expect(savedHeaders.Vary).toBe('Accept');
        expect(calls).toBe(1);
    });
});
