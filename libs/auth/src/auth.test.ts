import { describe, expect, it } from 'vitest';
import {
    AuthorizationService,
    cookieScheme,
    defineRoles,
    jwtScheme,
    PolicyBuilder,
    Principal,
    parseCookies,
    requireRole,
    serializeCookie,
    signJwt
} from '../src/index.js';

// -----------------------------------------------------------------------
// Principal
// -----------------------------------------------------------------------

describe('Principal', () => {
    it('creates an authenticated principal with value and claims', () => {
        const claims = new Map<string, string | string[]>([
            ['sub', '42'],
            ['role', 'admin']
        ]);
        const p = new Principal(true, { userId: '42' }, claims);
        expect(p.isAuthenticated).toBe(true);
        expect(p.value).toEqual({ userId: '42' });
        expect(p.claims.get('sub')).toBe('42');
    });

    it('creates an anonymous principal', () => {
        const p = Principal.anonymous();
        expect(p.isAuthenticated).toBe(false);
        expect(p.value).toBeUndefined();
    });

    it('hasRole checks single-value claim', () => {
        const claims = new Map<string, string | string[]>([['role', 'admin']]);
        const p = new Principal(true, {}, claims);
        expect(p.hasRole('admin')).toBe(true);
        expect(p.hasRole('user')).toBe(false);
    });

    it('hasRole checks array-value claim', () => {
        const claims = new Map<string, string | string[]>([
            ['role', ['admin', 'editor']]
        ]);
        const p = new Principal(true, {}, claims);
        expect(p.hasRole('admin')).toBe(true);
        expect(p.hasRole('editor')).toBe(true);
        expect(p.hasRole('viewer')).toBe(false);
    });

    it('hasRole supports custom claim key', () => {
        const claims = new Map<string, string | string[]>([['roles', 'admin']]);
        const p = new Principal(true, {}, claims);
        expect(p.hasRole('admin', 'roles')).toBe(true);
        expect(p.hasRole('admin')).toBe(false); // default key is 'role'
    });

    it('hasClaim checks existence', () => {
        const claims = new Map<string, string | string[]>([
            ['email', 'a@b.com']
        ]);
        const p = new Principal(true, {}, claims);
        expect(p.hasClaim('email')).toBe(true);
        expect(p.hasClaim('phone')).toBe(false);
    });

    it('hasClaim checks value match', () => {
        const claims = new Map<string, string | string[]>([
            ['role', ['admin', 'editor']]
        ]);
        const p = new Principal(true, {}, claims);
        expect(p.hasClaim('role', 'admin')).toBe(true);
        expect(p.hasClaim('role', 'viewer')).toBe(false);
    });
});

// -----------------------------------------------------------------------
// Cookie utilities
// -----------------------------------------------------------------------

describe('parseCookies', () => {
    it('parses multiple cookies', () => {
        expect(parseCookies('a=1; b=hello; c=world')).toEqual({
            a: '1',
            b: 'hello',
            c: 'world'
        });
    });

    it('returns empty object for empty string', () => {
        expect(parseCookies('')).toEqual({});
    });

    it('decodes URI-encoded values', () => {
        expect(parseCookies('name=hello%20world')).toEqual({
            name: 'hello world'
        });
    });
});

describe('serializeCookie', () => {
    it('serializes name and value', () => {
        expect(serializeCookie('sid', 'abc123')).toBe('sid=abc123');
    });

    it('serializes with all options', () => {
        const result = serializeCookie('sid', 'abc', {
            maxAge: 3600,
            path: '/',
            domain: 'example.com',
            secure: true,
            httpOnly: true,
            sameSite: 'Strict'
        });
        expect(result).toContain('Max-Age=3600');
        expect(result).toContain('Path=/');
        expect(result).toContain('Domain=example.com');
        expect(result).toContain('Secure');
        expect(result).toContain('HttpOnly');
        expect(result).toContain('SameSite=Strict');
    });

    it('encodes special characters in name and value', () => {
        const result = serializeCookie('my cookie', 'hello world');
        expect(result).toBe('my%20cookie=hello%20world');
    });
});

// -----------------------------------------------------------------------
// Authorization
// -----------------------------------------------------------------------

describe('AuthorizationService', () => {
    it('allows authenticated principal with matching role', async () => {
        const svc = new AuthorizationService();
        const claims = new Map<string, string | string[]>([['role', 'admin']]);
        const p = new Principal(true, {}, claims);
        const result = await svc.authorize(p, [requireRole('admin')]);
        expect(result.allowed).toBe(true);
    });

    it('denies unauthenticated principal', async () => {
        const svc = new AuthorizationService();
        const p = Principal.anonymous();
        const result = await svc.authorize(p, [requireRole('admin')]);
        expect(result.allowed).toBe(false);
    });

    it('denies authenticated principal without matching role', async () => {
        const svc = new AuthorizationService();
        const claims = new Map<string, string | string[]>([['role', 'user']]);
        const p = new Principal(true, {}, claims);
        const result = await svc.authorize(p, [requireRole('admin')]);
        expect(result.allowed).toBe(false);
    });

    it('allows if principal has any of the required roles', async () => {
        const svc = new AuthorizationService();
        const claims = new Map<string, string | string[]>([['role', 'editor']]);
        const p = new Principal(true, {}, claims);
        const result = await svc.authorize(p, [requireRole('admin', 'editor')]);
        expect(result.allowed).toBe(true);
    });

    it('resolves named policies', async () => {
        const policies = new Map([
            [
                'admin-only',
                { name: 'admin-only', requirements: [requireRole('admin')] }
            ]
        ]);
        const svc = new AuthorizationService(policies);
        const claims = new Map<string, string | string[]>([['role', 'admin']]);
        const p = new Principal(true, {}, claims);
        const result = await svc.authorize(p, 'admin-only');
        expect(result.allowed).toBe(true);
    });

    it('rejects unknown policy name', async () => {
        const svc = new AuthorizationService();
        const p = new Principal(true, {});
        const result = await svc.authorize(p, 'nonexistent');
        expect(result.allowed).toBe(false);
        if (!result.allowed) {
            expect(result.reason).toContain('nonexistent');
        }
    });
});

// -----------------------------------------------------------------------
// JWT scheme
// -----------------------------------------------------------------------

describe('jwtScheme', () => {
    const secret = 'test-secret-key-that-is-long-enough';

    it('authenticates a valid HS256 token', async () => {
        const token = signJwt(
            { sub: '42', role: 'admin', email: 'a@b.com' },
            secret
        );

        const scheme = jwtScheme({
            secret,
            mapClaims: claims => ({
                userId: claims.sub as string,
                role: claims.role as string
            })
        });

        const result = await scheme.authenticate({
            headers: { authorization: `Bearer ${token}` },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(true);
        if (result.succeeded) {
            expect(result.principal.isAuthenticated).toBe(true);
            expect(result.principal.value).toEqual({
                userId: '42',
                role: 'admin'
            });
            expect(result.principal.claims.get('sub')).toBe('42');
        }
    });

    it('rejects missing authorization header', async () => {
        const scheme = jwtScheme({
            secret,
            mapClaims: () => ({})
        });

        const result = await scheme.authenticate({
            headers: {},
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
    });

    it('rejects non-Bearer scheme', async () => {
        const scheme = jwtScheme({
            secret,
            mapClaims: () => ({})
        });

        const result = await scheme.authenticate({
            headers: { authorization: 'Basic abc123' },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
    });

    it('rejects invalid signature', async () => {
        const token = signJwt({ sub: '42' }, 'wrong-secret-key-completely');

        const scheme = jwtScheme({
            secret,
            mapClaims: () => ({})
        });

        const result = await scheme.authenticate({
            headers: { authorization: `Bearer ${token}` },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toContain('Invalid signature');
        }
    });

    it('rejects expired token', async () => {
        const token = signJwt({ sub: '42', exp: 1000 }, secret);

        const scheme = jwtScheme({
            secret,
            mapClaims: () => ({})
        });

        const result = await scheme.authenticate({
            headers: { authorization: `Bearer ${token}` },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toContain('expired');
        }
    });

    it('validates issuer', async () => {
        const token = signJwt({ sub: '42', iss: 'wrong' }, secret);

        const scheme = jwtScheme({
            secret,
            issuer: 'my-app',
            mapClaims: () => ({})
        });

        const result = await scheme.authenticate({
            headers: { authorization: `Bearer ${token}` },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toContain('issuer');
        }
    });

    it('provides challenge header', () => {
        const scheme = jwtScheme({ secret, mapClaims: () => ({}) });
        const challenge = scheme.challenge?.();
        expect(challenge).toEqual({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        });
    });
});

// -----------------------------------------------------------------------
// Cookie scheme
// -----------------------------------------------------------------------

describe('cookieScheme', () => {
    it('authenticates from cookie header', async () => {
        const scheme = cookieScheme({
            cookieName: 'sid',
            validate: async value =>
                value === 'valid-session'
                    ? { userId: '42', role: 'user' }
                    : null
        });

        const result = await scheme.authenticate({
            headers: { cookie: 'sid=valid-session; other=x' },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(true);
        if (result.succeeded) {
            expect(result.principal.value).toEqual({
                userId: '42',
                role: 'user'
            });
        }
    });

    it('authenticates from pre-parsed cookies', async () => {
        const scheme = cookieScheme({
            cookieName: 'sid',
            validate: async () => ({ userId: '42' })
        });

        const result = await scheme.authenticate({
            headers: {},
            cookies: { sid: 'abc' },
            items: new Map()
        });

        expect(result.succeeded).toBe(true);
    });

    it('fails when cookie is missing', async () => {
        const scheme = cookieScheme({
            cookieName: 'sid',
            validate: async () => ({ userId: '42' })
        });

        const result = await scheme.authenticate({
            headers: {},
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
    });

    it('fails when validation returns null', async () => {
        const scheme = cookieScheme({
            cookieName: 'sid',
            validate: async () => null
        });

        const result = await scheme.authenticate({
            headers: { cookie: 'sid=expired' },
            cookies: {},
            items: new Map()
        });

        expect(result.succeeded).toBe(false);
    });
});

// -----------------------------------------------------------------------
// PolicyBuilder
// -----------------------------------------------------------------------

describe('PolicyBuilder', () => {
    it('builds a policy with a name and role requirement', async () => {
        const policy = new PolicyBuilder()
            .requireRole('admin')
            .build('admin-only');

        expect(policy.name).toBe('admin-only');
        expect(policy.requirements).toHaveLength(1);
        const claims = new Map<string, string | string[]>([['role', 'admin']]);
        const allowed = await policy.requirements[0](
            new Principal(true, {}, claims)
        );
        expect(allowed).toBe(true);
    });

    it('builds a policy with a custom requirement', async () => {
        const policy = new PolicyBuilder()
            .require(p => p.isAuthenticated)
            .build('authenticated');

        expect(policy.name).toBe('authenticated');
        expect(await policy.requirements[0](new Principal(true, {}))).toBe(
            true
        );
        expect(await policy.requirements[0](Principal.anonymous())).toBe(false);
    });

    it('accumulates multiple requirements', () => {
        const policy = new PolicyBuilder()
            .requireRole('editor')
            .require(p => p.isAuthenticated)
            .build('strict');

        expect(policy.requirements).toHaveLength(2);
    });

    it('is chainable (returns this)', () => {
        const builder = new PolicyBuilder();
        const returned = builder.requireRole('admin');
        expect(returned).toBe(builder);
    });
});

// -----------------------------------------------------------------------
// defineRoles
// -----------------------------------------------------------------------

describe('defineRoles', () => {
    it('returns a frozen object with the provided roles', () => {
        const Roles = defineRoles({ admin: 'admin', editor: 'editor' });
        expect(Roles.admin).toBe('admin');
        expect(Roles.editor).toBe('editor');
        expect(Object.isFrozen(Roles)).toBe(true);
    });

    it('preserves all keys', () => {
        const Roles = defineRoles({ a: 'a', b: 'b', c: 'c' });
        expect(Object.keys(Roles)).toEqual(['a', 'b', 'c']);
    });
});
