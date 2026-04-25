import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser, type AuthedUser } from '../support/auth.js';
import { closePool, getTodoById } from '../support/db.js';
import { json, request } from '../support/http.js';
import { uniqueTitle } from '../support/ids.js';

afterAll(closePool);

describe('Todos — CRUD lifecycle', () => {
    let user: AuthedUser;
    let req: ReturnType<typeof authedRequest>;

    beforeAll(async () => {
        user = await createUser({ suite: 'todos-crud' });
        req = authedRequest(user.token);
    });

    it('creates a todo and returns 201 + Location header', async () => {
        const title = uniqueTitle('create');
        const res = await req('POST', '/api/todos', {
            body: { title, description: 'first' }
        });
        expect(res.status).toBe(201);
        expect(res.headers['location']).toMatch(/^\/api\/todos\/\d+$/);
        const todo = json<{
            id: number;
            title: string;
            completed: boolean;
            userId: number;
        }>(res);
        expect(todo.title).toBe(title);
        expect(todo.completed).toBe(false);
        expect(todo.userId).toBe(user.id);

        const row = await getTodoById(todo.id);
        expect(row).not.toBeNull();
        expect(row!.title).toBe(title);
        expect(row!.user_id).toBe(user.id);
    });

    it('reads, patches, and deletes a todo', async () => {
        const created = await req('POST', '/api/todos', {
            body: { title: uniqueTitle('lifecycle') }
        });
        const id = json<{ id: number }>(created).id;

        const got = await req('GET', `/api/todos/${id}`);
        expect(got.status).toBe(200);
        expect(json<{ id: number }>(got).id).toBe(id);

        const newTitle = uniqueTitle('renamed');
        const patched = await req('PATCH', `/api/todos/${id}`, {
            body: { title: newTitle, completed: true }
        });
        expect(patched.status).toBe(200);
        const patchedBody = json<{ title: string; completed: boolean }>(
            patched
        );
        expect(patchedBody.title).toBe(newTitle);
        expect(patchedBody.completed).toBe(true);

        const dbAfterPatch = await getTodoById(id);
        expect(dbAfterPatch!.title).toBe(newTitle);
        expect(dbAfterPatch!.completed).toBe(true);

        const deleted = await req('DELETE', `/api/todos/${id}`);
        expect(deleted.status).toBe(204);

        const after = await req('GET', `/api/todos/${id}`);
        expect(after.status).toBe(404);
    });

    it('lists todos with pagination', async () => {
        const pageUser = await createUser({ suite: 'todos-list' });
        const r = authedRequest(pageUser.token);
        for (let i = 0; i < 3; i++) {
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle(`bulk-${i}`) }
            });
        }
        const res = await r('GET', '/api/todos?page=1&limit=10');
        expect(res.status).toBe(200);
        const list = json<unknown[]>(res);
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThanOrEqual(3);
    });
});

describe('Todos — getWithAuthor', () => {
    it('returns nested todo + author', async () => {
        const u = await createUser({ suite: 'todos-author' });
        const r = authedRequest(u.token);
        const created = await r('POST', '/api/todos', {
            body: { title: uniqueTitle('with-author') }
        });
        const id = json<{ id: number }>(created).id;

        const res = await r('GET', `/api/todos/${id}/with-author`);
        expect(res.status).toBe(200);
        const body = json<{
            todo: { id: number; userId: number };
            author: { id: number; email: string };
        }>(res);
        expect(body.todo.id).toBe(id);
        expect(body.author.id).toBe(u.id);
        expect(body.author.email).toBe(u.email);
    });
});

describe('Todos — events / activity (polymorphic)', () => {
    it('records assigned, commented, completed events with correct discriminators', async () => {
        const u = await createUser({ suite: 'todos-events' });
        const r = authedRequest(u.token);
        const otherUser = await createUser({ suite: 'todos-events-other' });

        const todoId = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('events') }
            })
        ).id;

        const assigned = await r('POST', `/api/todos/${todoId}/events`, {
            body: { type: 'assigned', assignedTo: otherUser.id }
        });
        expect(assigned.status).toBe(200);
        expect(json<{ type: string }>(assigned).type).toBe('assigned');

        const commented = await r('POST', `/api/todos/${todoId}/events`, {
            body: { type: 'commented', comment: 'Looks good' }
        });
        expect(commented.status).toBe(200);
        expect(json<{ type: string; comment: string }>(commented).comment).toBe(
            'Looks good'
        );

        const completed = await r('POST', `/api/todos/${todoId}/events`, {
            body: { type: 'completed', completedAt: new Date().toISOString() }
        });
        expect(completed.status).toBe(200);
        expect(json<{ type: string }>(completed).type).toBe('completed');

        const list = await r('GET', `/api/todos/${todoId}/activity`);
        expect(list.status).toBe(200);
        const entries = json<Array<{ type: string }>>(list);
        const types = entries.map(e => e.type).sort();
        expect(types).toEqual(['assigned', 'commented', 'completed']);
    });
});

describe('Todos — complete with optimistic concurrency', () => {
    it('completes successfully without If-Match', async () => {
        const u = await createUser({ suite: 'todos-complete' });
        const r = authedRequest(u.token);
        const created = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('complete-ok') }
            })
        );
        const res = await r('POST', `/api/todos/${created.id}/complete`);
        expect(res.status).toBe(200);
        expect(json<{ completed: boolean }>(res).completed).toBe(true);
    });

    it('completes successfully with matching If-Match', async () => {
        const u = await createUser({ suite: 'todos-complete-etag' });
        const r = authedRequest(u.token);
        const created = json<{ id: number; updatedAt: string }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('complete-etag') }
            })
        );
        const res = await r('POST', `/api/todos/${created.id}/complete`, {
            headers: { 'if-match': created.updatedAt }
        });
        expect(res.status).toBe(200);
    });

    it('returns 409 when If-Match does not match the current ETag', async () => {
        const u = await createUser({ suite: 'todos-complete-conflict' });
        const r = authedRequest(u.token);
        const created = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('conflict') }
            })
        );
        const res = await r('POST', `/api/todos/${created.id}/complete`, {
            headers: { 'if-match': '1970-01-01T00:00:00.000Z' }
        });
        expect(res.status).toBe(409);
    });
});

describe('Todos — cross-user isolation', () => {
    it('forbids access to another user’s todo', async () => {
        const owner = await createUser({ suite: 'isolation-owner' });
        const intruder = await createUser({ suite: 'isolation-intruder' });
        const created = json<{ id: number }>(
            await authedRequest(owner.token)('POST', '/api/todos', {
                body: { title: uniqueTitle('private') }
            })
        );

        const intruderReq = authedRequest(intruder.token);
        const get = await intruderReq('GET', `/api/todos/${created.id}`);
        expect(get.status).toBe(403);

        const patch = await intruderReq('PATCH', `/api/todos/${created.id}`, {
            body: { title: 'hijacked' }
        });
        expect(patch.status).toBe(403);

        const del = await intruderReq('DELETE', `/api/todos/${created.id}`);
        expect(del.status).toBe(403);
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request('GET', '/api/todos');
        expect(res.status).toBe(401);
    });
});

describe('Todos — attachment & legacyReplace', () => {
    it('downloads a text attachment with correct headers', async () => {
        const u = await createUser({ suite: 'todos-attachment' });
        const r = authedRequest(u.token);
        const created = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('attach') }
            })
        );
        const res = await r('GET', `/api/todos/${created.id}/attachment`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/plain/);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('legacyReplace (PUT) returns a redirect', async () => {
        const u = await createUser({ suite: 'todos-legacy' });
        const r = authedRequest(u.token);
        const created = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('legacy') }
            })
        );
        const res = await r('PUT', `/api/todos/${created.id}`, {
            body: { title: 'replaced' }
        });
        // ActionResult.redirect → 3xx with Location pointing back to PATCH path.
        expect(res.status).toBeGreaterThanOrEqual(300);
        expect(res.status).toBeLessThan(400);
        expect(res.headers['location']).toBe(`/api/todos/${created.id}`);
    });
});
