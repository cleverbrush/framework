import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser, type AuthedUser } from '../support/auth.js';
import { closePool, query } from '../support/db.js';
import { json } from '../support/http.js';
import { shortId, uniqueTitle } from '../support/ids.js';

afterAll(closePool);

describe('Todos — bulk import / export', () => {
    let user: AuthedUser;
    let req: ReturnType<typeof authedRequest>;

    beforeAll(async () => {
        user = await createUser({ suite: 'import-export' });
        req = authedRequest(user.token);
    });

    it('imports a small batch and returns 207 with per-item results', async () => {
        const items = [
            { title: uniqueTitle('imp-1') },
            { title: uniqueTitle('imp-2') },
            { title: uniqueTitle('imp-3') }
        ];
        const res = await req('POST', '/api/todos/import', {
            body: { items }
        });
        expect(res.status).toBe(207);
        const result = json<{
            imported: number;
            total: number;
            items: { title: string; success: boolean }[];
        }>(res);
        expect(result.total).toBe(3);
        expect(result.imported).toBe(3);
        expect(result.items.every(i => i.success)).toBe(true);
    });

    it('returns 202 Accepted for large batches (> 100 items)', async () => {
        const items = Array.from({ length: 105 }, (_, i) => ({
            title: uniqueTitle(`large-${i}`)
        }));
        const res = await req('POST', '/api/todos/import', {
            body: { items }
        });
        expect(res.status).toBe(202);
        const body = json<{ message: string; total: number }>(res);
        expect(body.total).toBe(105);
    });

    it('accepts the X-Idempotency-Key header (contract-only in this demo)', async () => {
        const idemUser = await createUser({ suite: 'import-idem' });
        const r = authedRequest(idemUser.token);
        const idempotencyKey = `e2e-${shortId()}`;
        const items = [
            { title: uniqueTitle('idem-a') },
            { title: uniqueTitle('idem-b') }
        ];

        // The header is part of the OpenAPI contract; the demo handler does
        // not currently dedupe — we only assert the contract is satisfied
        // (no validation error) and that the response shape is consistent.
        const first = await r('POST', '/api/todos/import', {
            body: { items },
            headers: { 'x-idempotency-key': idempotencyKey }
        });
        expect(first.status).toBe(207);
        expect(json<{ imported: number }>(first).imported).toBe(2);

        const second = await r('POST', '/api/todos/import', {
            body: { items },
            headers: { 'x-idempotency-key': idempotencyKey }
        });
        expect(second.status).toBe(207);

        const rows = await query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM todos WHERE user_id = $1',
            [idemUser.id]
        );
        // Demo behaviour: replay re-imports. If real idempotency is added
        // later, tighten this to expect 2.
        expect(Number(rows[0].count)).toBe(4);
    });

    it('exports todos as CSV with correct content-type and headers', async () => {
        const exportUser = await createUser({ suite: 'export' });
        const r = authedRequest(exportUser.token);
        await r('POST', '/api/todos', {
            body: { title: uniqueTitle('export-1') }
        });
        await r('POST', '/api/todos', {
            body: { title: uniqueTitle('export-2,with,commas') }
        });

        const res = await r('GET', '/api/todos/export');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.headers['x-export-format']).toBe('csv');
        expect(Number(res.headers['x-total-count'])).toBeGreaterThanOrEqual(2);
        // RFC 4180: a field containing commas must be quoted.
        expect(res.body).toMatch(/"export-2,with,commas"|"\[E2E\] export-2,with,commas/);
    });
});
