import http from 'node:http';
import {
    type AuthenticationContext,
    type AuthenticationResult,
    type AuthenticationScheme,
    cookieScheme,
    jwtScheme,
    Principal,
    signJwt
} from '@cleverbrush/auth';
import { number, object, string } from '@cleverbrush/schema';
import {
    createServer,
    endpoint,
    type Handler,
    route,
    type Server
} from '@cleverbrush/server';
import { afterEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Shared HTTP request helper (same as in integration.test.ts)
// ---------------------------------------------------------------------------

function request(
    server: Server,
    method: string,
    urlPath: string,
    options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}> {
    const addr = server.address!;
    return new Promise((resolve, reject) => {
        const reqHeaders: Record<string, string> = {
            ...(options.headers ?? {})
        };
        if (options.body !== undefined && !reqHeaders['content-type']) {
            reqHeaders['content-type'] = 'application/json';
        }

        const req = http.request(
            {
                hostname: addr.host === '0.0.0.0' ? '127.0.0.1' : addr.host,
                port: addr.port,
                path: urlPath,
                method,
                headers: reqHeaders
            },
            res => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode!,
                        headers: res.headers,
                        body: Buffer.concat(chunks).toString()
                    });
                });
            }
        );
        req.on('error', reject);
        if (options.body !== undefined) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

function json(res: { body: string }) {
    return JSON.parse(res.body);
}

// ---------------------------------------------------------------------------
// Shared Constants
// ---------------------------------------------------------------------------

const JWT_SECRET = 'integration-test-secret-key-long-enough';

const IPrincipal = object({
    userId: string(),
    role: string()
});

// ===========================================================================
// A1. JWT Authentication — protected endpoint
// ===========================================================================

describe('Auth: JWT authentication', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('returns 401 when no token is provided', async () => {
        const ep = endpoint.get('/api/me').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const res = await request(server, 'GET', '/api/me');
        expect(res.status).toBe(401);
        expect(json(res).status).toBe(401);
        // Should include WWW-Authenticate challenge header
        expect(res.headers['www-authenticate']).toBe('Bearer');
    });

    it('returns 200 with valid JWT and typed principal', async () => {
        const ep = endpoint.get('/api/me').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId, role: principal.role };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const token = signJwt({ sub: 'user-42', role: 'admin' }, JWT_SECRET);

        const res = await request(server, 'GET', '/api/me', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ userId: 'user-42', role: 'admin' });
    });

    it('returns 401 with invalid JWT signature', async () => {
        const ep = endpoint.get('/api/me').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const token = signJwt({ sub: 'user-42', role: 'admin' }, 'wrong-key');

        const res = await request(server, 'GET', '/api/me', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(401);
    });
});

// ===========================================================================
// A2. Role-based authorization
// ===========================================================================

describe('Auth: Role-based authorization', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('returns 403 when user lacks the required role', async () => {
        const ep = endpoint.get('/api/admin').authorize(IPrincipal, 'admin');
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const token = signJwt({ sub: 'user-1', role: 'viewer' }, JWT_SECRET);

        const res = await request(server, 'GET', '/api/admin', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(403);
        expect(json(res).status).toBe(403);
    });

    it('returns 200 when user has the required role', async () => {
        const ep = endpoint.get('/api/admin').authorize(IPrincipal, 'admin');
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { allowed: true, userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const token = signJwt({ sub: 'admin-1', role: 'admin' }, JWT_SECRET);

        const res = await request(server, 'GET', '/api/admin', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ allowed: true, userId: 'admin-1' });
    });
});

// ===========================================================================
// A3. Resource-level authorize — all child endpoints inherit auth
// ===========================================================================

describe('Auth: Resource-level authorize', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('all endpoints under authorized resource require the role', async () => {
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;
        const adminApi = endpoint
            .resource('/api/admin')
            .authorize(IPrincipal, 'admin');

        const listEp = adminApi.get();
        const getByIdEp = adminApi.get(ByIdPath);

        const listHandler: Handler<typeof listEp> = () => {
            return { items: [] };
        };
        const getByIdHandler: Handler<typeof getByIdEp> = ({ params }) => {
            return { id: params.id };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(listEp, listHandler)
            .handle(getByIdEp, getByIdHandler)
            .listen(0);

        // No token → 401
        const res1 = await request(server, 'GET', '/api/admin');
        expect(res1.status).toBe(401);

        const res2 = await request(server, 'GET', '/api/admin/5');
        expect(res2.status).toBe(401);

        // Wrong role → 403
        const viewerToken = signJwt({ sub: 'u1', role: 'viewer' }, JWT_SECRET);
        const res3 = await request(server, 'GET', '/api/admin', {
            headers: { authorization: `Bearer ${viewerToken}` }
        });
        expect(res3.status).toBe(403);

        // Correct role → 200
        const adminToken = signJwt({ sub: 'u2', role: 'admin' }, JWT_SECRET);
        const res4 = await request(server, 'GET', '/api/admin', {
            headers: { authorization: `Bearer ${adminToken}` }
        });
        expect(res4.status).toBe(200);
        expect(json(res4)).toEqual({ items: [] });

        const res5 = await request(server, 'GET', '/api/admin/5', {
            headers: { authorization: `Bearer ${adminToken}` }
        });
        expect(res5.status).toBe(200);
        expect(json(res5)).toEqual({ id: 5 });
    });
});

// ===========================================================================
// A4. Cookie authentication
// ===========================================================================

describe('Auth: Cookie authentication', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('authenticates via cookie', async () => {
        const ep = endpoint.get('/api/me').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId, role: principal.role };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'cookie',
                schemes: [
                    cookieScheme({
                        cookieName: 'sid',
                        validate: async value =>
                            value === 'valid-session-123'
                                ? { userId: 'cookie-user', role: 'user' }
                                : null
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        // No cookie → 401
        const res1 = await request(server, 'GET', '/api/me');
        expect(res1.status).toBe(401);

        // Invalid cookie → 401
        const res2 = await request(server, 'GET', '/api/me', {
            headers: { cookie: 'sid=expired-session' }
        });
        expect(res2.status).toBe(401);

        // Valid cookie → 200
        const res3 = await request(server, 'GET', '/api/me', {
            headers: { cookie: 'sid=valid-session-123' }
        });
        expect(res3.status).toBe(200);
        expect(json(res3)).toEqual({
            userId: 'cookie-user',
            role: 'user'
        });
    });
});

// ===========================================================================
// A5. Custom authentication scheme
// ===========================================================================

describe('Auth: Custom authentication scheme', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('works with a user-defined scheme', async () => {
        // Custom API-key scheme
        const apiKeyScheme: AuthenticationScheme<{
            userId: string;
            role: string;
        }> = {
            name: 'api-key',
            async authenticate(
                context: AuthenticationContext
            ): Promise<AuthenticationResult<{ userId: string; role: string }>> {
                const key = context.headers['x-api-key'];
                if (key === 'secret-key-42') {
                    return {
                        succeeded: true,
                        principal: new Principal(
                            true,
                            { userId: 'api-user', role: 'service' },
                            new Map([
                                ['sub', 'api-user'],
                                ['role', 'service']
                            ])
                        )
                    };
                }
                return { succeeded: false, failure: 'Invalid API key' };
            }
        };

        const ep = endpoint.get('/api/data').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'api-key',
                schemes: [apiKeyScheme]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        // Without key → 401
        const res1 = await request(server, 'GET', '/api/data');
        expect(res1.status).toBe(401);

        // With key → 200
        const res2 = await request(server, 'GET', '/api/data', {
            headers: { 'x-api-key': 'secret-key-42' }
        });
        expect(res2.status).toBe(200);
        expect(json(res2)).toEqual({ userId: 'api-user' });
    });
});

// ===========================================================================
// A6. Mixed public + protected endpoints
// ===========================================================================

describe('Auth: Mixed public and protected endpoints', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('public endpoints work without auth, protected require it', async () => {
        const publicEp = endpoint.get('/api/health');
        const protectedEp = endpoint.get('/api/profile').authorize(IPrincipal);

        const publicHandler: Handler<typeof publicEp> = () => {
            return { status: 'ok' };
        };
        const protectedHandler: Handler<typeof protectedEp> = ({
            principal
        }) => {
            return { userId: principal.userId };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(publicEp, publicHandler)
            .handle(protectedEp, protectedHandler)
            .listen(0);

        // Public endpoint works without auth
        const res1 = await request(server, 'GET', '/api/health');
        expect(res1.status).toBe(200);
        expect(json(res1)).toEqual({ status: 'ok' });

        // Protected endpoint requires auth
        const res2 = await request(server, 'GET', '/api/profile');
        expect(res2.status).toBe(401);

        // Protected endpoint works with valid token
        const token = signJwt({ sub: 'user-7', role: 'user' }, JWT_SECRET);
        const res3 = await request(server, 'GET', '/api/profile', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res3.status).toBe(200);
        expect(json(res3)).toEqual({ userId: 'user-7' });
    });
});

// ===========================================================================
// A7. authorize() without roles (any authenticated user)
// ===========================================================================

describe('Auth: authorize() without roles', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('allows any authenticated user regardless of roles', async () => {
        const ep = endpoint.get('/api/protected').authorize(IPrincipal);
        const handler: Handler<typeof ep> = ({ principal }) => {
            return { userId: principal.userId, role: principal.role };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        // Any valid token works (no specific role required)
        const token = signJwt({ sub: 'user-99', role: 'guest' }, JWT_SECRET);
        const res = await request(server, 'GET', '/api/protected', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ userId: 'user-99', role: 'guest' });
    });
});

// ===========================================================================
// A8. authorize() without schema (untyped principal)
// ===========================================================================

describe('Auth: authorize() without principal schema', () => {
    let server: Server;

    afterEach(async () => {
        await server?.close();
    });

    it('works with untyped authorize (principal as unknown)', async () => {
        const ep = endpoint.get('/api/data').authorize('admin');
        const handler: Handler<typeof ep> = ({ principal }) => {
            // principal is typed as `unknown` here
            return { received: principal !== undefined };
        };

        server = await createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret: JWT_SECRET,
                        mapClaims: c => ({
                            userId: c.sub as string,
                            role: c.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .handle(ep, handler)
            .listen(0);

        const token = signJwt({ sub: 'admin-1', role: 'admin' }, JWT_SECRET);
        const res = await request(server, 'GET', '/api/data', {
            headers: { authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ received: true });
    });
});
