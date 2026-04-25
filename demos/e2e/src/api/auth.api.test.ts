import { afterAll, describe, expect, it } from 'vitest';
import { json, request } from '../support/http.js';
import { uniqueEmail } from '../support/ids.js';
import { closePool, getUserByEmail } from '../support/db.js';

afterAll(closePool);

describe('Auth — registration', () => {
    it('registers a new user, returns 201, persists row, and password is not exposed', async () => {
        const email = uniqueEmail('auth-register');
        const res = await request('POST', '/api/auth/register', {
            body: { email, password: 'TestPass123!' }
        });
        expect(res.status).toBe(201);
        expect(res.headers['location']).toMatch(/^\/api\/users\/\d+$/);

        const user = json<{ id: number; email: string; role: string }>(res);
        expect(user.email).toBe(email);
        expect(user.role).toBe('user');
        // Sensitive fields must NOT appear in the response.
        expect(res.body).not.toMatch(/password/i);
        expect(res.body).not.toMatch(/hash/i);

        const row = await getUserByEmail(email);
        expect(row).not.toBeNull();
        expect(row!.email).toBe(email);
        expect(row!.role).toBe('user');
    });

    it('rejects duplicate email with 400', async () => {
        const email = uniqueEmail('auth-dup');
        const first = await request('POST', '/api/auth/register', {
            body: { email, password: 'TestPass123!' }
        });
        expect(first.status).toBe(201);

        const second = await request('POST', '/api/auth/register', {
            body: { email, password: 'TestPass123!' }
        });
        expect(second.status).toBe(400);
        expect(json<{ message: string }>(second).message).toBeTypeOf('string');
    });

    it('rejects passwords shorter than 8 characters', async () => {
        const email = uniqueEmail('auth-shortpw');
        const res = await request('POST', '/api/auth/register', {
            body: { email, password: 'short' }
        });
        // Schema validation should fail before reaching the handler.
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
    });
});

describe('Auth — login', () => {
    it('issues a JWT for valid credentials', async () => {
        const email = uniqueEmail('auth-login');
        const password = 'TestPass123!';
        await request('POST', '/api/auth/register', {
            body: { email, password }
        });
        const res = await request('POST', '/api/auth/login', {
            body: { email, password }
        });
        expect(res.status).toBe(200);
        const token = json<{ token: string }>(res).token;
        expect(token).toBeTypeOf('string');
        // JWT has three dot-separated base64url segments.
        expect(token.split('.')).toHaveLength(3);
    });

    it('rejects wrong password with 401', async () => {
        const email = uniqueEmail('auth-bad');
        await request('POST', '/api/auth/register', {
            body: { email, password: 'TestPass123!' }
        });
        const res = await request('POST', '/api/auth/login', {
            body: { email, password: 'WrongPass!!' }
        });
        expect(res.status).toBe(401);
    });

    it('rejects unknown email with 401', async () => {
        const res = await request('POST', '/api/auth/login', {
            body: {
                email: uniqueEmail('auth-nouser'),
                password: 'AnyPassword99'
            }
        });
        expect(res.status).toBe(401);
    });
});

describe('Auth — current user', () => {
    it('GET /api/users/me requires auth', async () => {
        const res = await request('GET', '/api/users/me');
        expect(res.status).toBe(401);
    });

    it('GET /api/users/me returns the authenticated user', async () => {
        const email = uniqueEmail('auth-me');
        await request('POST', '/api/auth/register', {
            body: { email, password: 'TestPass123!' }
        });
        const loginRes = await request('POST', '/api/auth/login', {
            body: { email, password: 'TestPass123!' }
        });
        const token = json<{ token: string }>(loginRes).token;

        const meRes = await request('GET', '/api/users/me', { token });
        expect(meRes.status).toBe(200);
        const me = json<{ email: string; role: string }>(meRes);
        expect(me.email).toBe(email);
        expect(me.role).toBe('user');
    });
});
