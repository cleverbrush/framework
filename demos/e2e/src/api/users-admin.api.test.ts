import { afterAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser } from '../support/auth.js';
import { closePool } from '../support/db.js';
import { json } from '../support/http.js';

afterAll(closePool);

describe('Users — admin endpoints', () => {
    it('non-admin cannot list users (403)', async () => {
        const u = await createUser({ suite: 'users-nonadmin' });
        const res = await authedRequest(u.token)('GET', '/api/users');
        expect(res.status).toBe(403);
    });

    it('admin can list users with pagination', async () => {
        const admin = await createUser({ suite: 'users-admin', role: 'admin' });
        // Create a few extra users so the list has data.
        await Promise.all([
            createUser({ suite: 'users-listed-1' }),
            createUser({ suite: 'users-listed-2' })
        ]);

        const res = await authedRequest(admin.token)(
            'GET',
            '/api/users?page=1&limit=20'
        );
        expect(res.status).toBe(200);
        const list = json<Array<{ id: number; email: string }>>(res);
        expect(list.length).toBeGreaterThanOrEqual(3);
    });

    it('admin can delete a normal user (204)', async () => {
        const admin = await createUser({ suite: 'users-delete-admin', role: 'admin' });
        const victim = await createUser({ suite: 'users-victim' });

        const res = await authedRequest(admin.token)(
            'DELETE',
            `/api/users/${victim.id}`
        );
        expect(res.status).toBe(204);
    });

    it('admin self-deletion returns 400', async () => {
        const admin = await createUser({ suite: 'users-self-delete', role: 'admin' });
        const res = await authedRequest(admin.token)(
            'DELETE',
            `/api/users/${admin.id}`
        );
        expect(res.status).toBe(400);
    });

    it('non-admin cannot delete other users (403)', async () => {
        const a = await createUser({ suite: 'users-cross-a' });
        const b = await createUser({ suite: 'users-cross-b' });
        const res = await authedRequest(a.token)(
            'DELETE',
            `/api/users/${b.id}`
        );
        expect(res.status).toBe(403);
    });
});
