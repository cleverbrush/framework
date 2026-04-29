import { afterAll, describe, expect, it } from 'vitest';
import { closePool } from '../support/db.js';
import { json, request } from '../support/http.js';
import { shortId } from '../support/ids.js';

afterAll(closePool);

describe('Demo — slow', () => {
    it('responds after the requested delay', async () => {
        const start = Date.now();
        const res = await request('GET', '/api/demo/slow?delay=300');
        const elapsed = Date.now() - start;
        expect(res.status).toBe(200);
        expect(elapsed).toBeGreaterThanOrEqual(280);
        expect(json<{ ok: string }>(res).ok).toMatch(/responded/);
    });
});

describe('Demo — flaky', () => {
    it('fails N times then succeeds for the same key', async () => {
        const key = `e2e-${shortId()}`;
        const failCount = 2;

        const a = await request(
            'GET',
            `/api/demo/flaky?failCount=${failCount}&key=${key}`
        );
        expect(a.status).toBeGreaterThanOrEqual(500);
        const b = await request(
            'GET',
            `/api/demo/flaky?failCount=${failCount}&key=${key}`
        );
        expect(b.status).toBeGreaterThanOrEqual(500);
        const c = await request(
            'GET',
            `/api/demo/flaky?failCount=${failCount}&key=${key}`
        );
        expect(c.status).toBe(200);
        expect(json<{ attempt: number }>(c).attempt).toBe(failCount + 1);
    });
});

describe('Demo — echo', () => {
    it('echoes the request body', async () => {
        const res = await request('POST', '/api/demo/echo', {
            body: { message: 'hello e2e' }
        });
        expect(res.status).toBe(200);
        expect(json<{ message: string }>(res).message).toBe('hello e2e');
    });
});

describe('Demo — crash endpoints return 5xx with traceId', () => {
    it('crash-sql returns 500', async () => {
        const res = await request('GET', '/api/demo/crash-sql');
        expect(res.status).toBeGreaterThanOrEqual(500);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('crash-runtime returns 500', async () => {
        const res = await request('GET', '/api/demo/crash-runtime');
        expect(res.status).toBeGreaterThanOrEqual(500);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
