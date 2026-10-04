// Supplementary tests for JwtScheme — focused on uncovered branches.

import { createHmac, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { jwtScheme, signJwt } from './JwtScheme.js';

const SECRET = 'test-secret-key-that-is-long-enough';

const scheme = (opts: any = {}) =>
    jwtScheme({ secret: SECRET, mapClaims: () => ({}), ...opts });

const ctx = (authHeader?: string) => ({
    headers: authHeader === undefined ? {} : { authorization: authHeader },
    cookies: {},
    items: new Map<string, unknown>()
});

describe('JwtScheme — additional branch coverage', () => {
    const rawToken = (header: unknown, payload: unknown) => {
        const data = [header, payload]
            .map(value =>
                Buffer.from(JSON.stringify(value)).toString('base64url')
            )
            .join('.');
        return `${data}.${createHmac('sha256', SECRET).update(data).digest('base64url')}`;
    };

    it.each([null, [], 'header', 1])(
        'rejects non-object header %j without throwing',
        async header => {
            await expect(
                scheme().authenticate(ctx(`Bearer ${rawToken(header, {})}`))
            ).resolves.toMatchObject({ succeeded: false });
        }
    );

    it.each([null, [], 'payload', 1])(
        'rejects non-object payload %j without throwing',
        async payload => {
            await expect(
                scheme().authenticate(
                    ctx(`Bearer ${rawToken({ alg: 'HS256' }, payload)}`)
                )
            ).resolves.toMatchObject({ succeeded: false });
        }
    );

    it.each(['exp', 'nbf', 'iat'])(
        'rejects malformed %s claims',
        async name => {
            for (const value of ['9999999999', null, {}, []]) {
                const token = rawToken({ alg: 'HS256' }, { [name]: value });
                expect(
                    (await scheme().authenticate(ctx(`Bearer ${token}`)))
                        .succeeded
                ).toBe(false);
            }
        }
    );

    it('expires at the expiration instant, including tolerance', async () => {
        const now = Math.floor(Date.now() / 1000);
        for (const tolerance of [0, 60]) {
            const token = signJwt({ exp: now - tolerance }, SECRET);
            expect(
                (
                    await scheme({ clockTolerance: tolerance }).authenticate(
                        ctx(`Bearer ${token}`)
                    )
                ).succeeded
            ).toBe(false);
        }
    });

    it('does not ignore critical JOSE extensions', async () => {
        const token = rawToken(
            { alg: 'HS256', crit: ['unknown'], unknown: true },
            {}
        );
        expect(
            (await scheme().authenticate(ctx(`Bearer ${token}`))).succeeded
        ).toBe(false);
    });

    it('rejects asymmetric key material as an HMAC secret', () => {
        const { publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048
        });
        const pem = publicKey.export({ type: 'spki', format: 'pem' });
        expect(() =>
            scheme({ secret: pem, algorithms: ['HS256', 'RS256'] })
        ).toThrow();
        expect(() => signJwt({}, pem, 'HS256')).toThrow();
    });

    it.each([-1, NaN, Infinity])(
        'rejects invalid clock tolerance %s',
        clockTolerance => {
            expect(() => scheme({ clockTolerance })).toThrow();
        }
    );

    it('accepts case-insensitive bearer authentication', async () => {
        const token = signJwt({ sub: 'u1' }, SECRET);
        expect(
            (await scheme().authenticate(ctx(`bearer ${token}`))).succeeded
        ).toBe(true);
    });

    it('rejects an empty Bearer token', async () => {
        const result = await scheme().authenticate(ctx('Bearer    '));
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/Empty Bearer token/);
        }
    });

    it('rejects a malformed JWT (wrong number of segments)', async () => {
        const result = await scheme().authenticate(
            ctx('Bearer not.a.real.token')
        );
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/Malformed JWT/);
        }
    });

    it('rejects a JWT with an unparsable header', async () => {
        const result = await scheme().authenticate(
            ctx('Bearer !!!.payload.sig')
        );
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/Malformed JWT header/);
        }
    });

    it('rejects an algorithm not in the allow list', async () => {
        // Sign with HS512 but only HS256 is allowed.
        const token = signJwt({ sub: '1' }, SECRET, 'HS512');
        const result = await scheme({ algorithms: ['HS256'] }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/Unsupported algorithm: HS512/);
        }
    });

    it('rejects when nbf is in the future', async () => {
        const future = Math.floor(Date.now() / 1000) + 3600;
        const token = signJwt({ sub: '1', nbf: future }, SECRET);
        const result = await scheme().authenticate(ctx(`Bearer ${token}`));
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/not yet valid/);
        }
    });

    it('accepts a token expired within clockTolerance', async () => {
        const recentlyExpired = Math.floor(Date.now() / 1000) - 5;
        const token = signJwt({ sub: '1', exp: recentlyExpired }, SECRET);

        const ok = await scheme({ clockTolerance: 60 }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(ok.succeeded).toBe(true);
    });

    it('matches a single audience claim', async () => {
        const token = signJwt({ sub: '1', aud: 'web' }, SECRET);
        const result = await scheme({ audience: 'web' }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(result.succeeded).toBe(true);
    });

    it('matches when audience claim is an array containing the expected value', async () => {
        const token = signJwt({ sub: '1', aud: ['mobile', 'web'] }, SECRET);
        const result = await scheme({ audience: 'web' }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(result.succeeded).toBe(true);
    });

    it('rejects when audience does not match', async () => {
        const token = signJwt({ sub: '1', aud: 'web' }, SECRET);
        const result = await scheme({ audience: 'admin' }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(result.succeeded).toBe(false);
        if (!result.succeeded) {
            expect(result.failure).toMatch(/Invalid audience/);
        }
    });

    it('rejects when audience is required but missing from token', async () => {
        const token = signJwt({ sub: '1' }, SECRET);
        const result = await scheme({ audience: 'web' }).authenticate(
            ctx(`Bearer ${token}`)
        );
        expect(result.succeeded).toBe(false);
    });

    it('builds claims map preserving string and string[] values, dropping others', async () => {
        const token = signJwt(
            {
                sub: 'u1',
                role: 'admin',
                roles: ['a', 'b'],
                age: 42, // numeric → dropped
                mixed: ['x', 1] // mixed → dropped
            },
            SECRET
        );

        const result = await scheme().authenticate(ctx(`Bearer ${token}`));
        expect(result.succeeded).toBe(true);
        if (result.succeeded) {
            const claims = result.principal.claims;
            expect(claims.get('sub')).toBe('u1');
            expect(claims.get('role')).toBe('admin');
            expect(claims.get('roles')).toEqual(['a', 'b']);
            expect(claims.has('age')).toBe(false);
            expect(claims.has('mixed')).toBe(false);
        }
    });

    it('honours a custom scheme name', () => {
        const s = jwtScheme({
            secret: SECRET,
            mapClaims: () => ({}),
            name: 'bearer-jwt'
        });
        expect(s.name).toBe('bearer-jwt');
    });

    it('uses HS256 as the default algorithm', async () => {
        // signJwt defaults to HS256 — verify scheme without algorithms accepts it.
        const token = signJwt({ sub: '1' }, SECRET);
        const result = await scheme().authenticate(ctx(`Bearer ${token}`));
        expect(result.succeeded).toBe(true);
    });

    it('signJwt throws on unsupported algorithm', () => {
        expect(() => signJwt({}, SECRET, 'NONE')).toThrow(
            /Unsupported algorithm/
        );
    });
});
