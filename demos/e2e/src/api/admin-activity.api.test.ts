import { afterAll, describe, expect, it } from 'vitest';
import { createUser } from '../support/auth.js';
import { closePool } from '../support/db.js';
import { request, streamRequest } from '../support/http.js';

afterAll(closePool);

describe('Admin activity — NDJSON stream', () => {
    it('requires admin role (403 for normal user)', async () => {
        const u = await createUser({ suite: 'admin-stream-403' });
        const res = await request('GET', '/api/admin/activity', {
            token: u.token
        });
        expect(res.status).toBe(403);
    });

    it('streams NDJSON entries to admin', async () => {
        const admin = await createUser({
            suite: 'admin-stream-ok',
            role: 'admin'
        });
        const stream = streamRequest('GET', '/api/admin/activity', {
            token: admin.token
        });
        const head = await stream.response;
        expect(head.status).toBe(200);
        expect(String(head.headers['content-type'])).toMatch(/ndjson|stream/);

        let buffer = '';
        const lines: string[] = [];
        const start = Date.now();
        for await (const chunk of stream.chunks) {
            buffer += chunk;
            let nl: number;
            // biome-ignore lint/suspicious/noAssignInExpressions: standard NDJSON parsing pattern
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl);
                buffer = buffer.slice(nl + 1);
                if (line) lines.push(line);
            }
            if (lines.length >= 3 || Date.now() - start > 10_000) break;
        }
        stream.close();

        expect(lines.length).toBeGreaterThanOrEqual(3);
        for (const line of lines.slice(0, 3)) {
            const parsed = JSON.parse(line) as Record<string, unknown>;
            expect(parsed.action).toBeTypeOf('string');
        }
    });
});
