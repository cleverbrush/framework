import { afterAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser } from '../support/auth.js';
import { closePool } from '../support/db.js';
import { json } from '../support/http.js';
import { uniqueTitle } from '../support/ids.js';

afterAll(closePool);

describe('Activity — listAll (polymorphic)', () => {
    it('returns activity entries with correct discriminators after sendEvent calls', async () => {
        const u = await createUser({ suite: 'activity-list' });
        const r = authedRequest(u.token);
        const todoId = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('act') }
            })
        ).id;

        await r('POST', `/api/todos/${todoId}/events`, {
            body: { type: 'commented', comment: 'first comment' }
        });

        const list = await r('GET', '/api/activity?limit=50');
        expect(list.status).toBe(200);
        const entries = json<Array<{ id: number; type: string; todoId: number }>>(
            list
        );
        const ours = entries.filter(e => e.todoId === todoId);
        expect(ours.length).toBeGreaterThanOrEqual(1);
        const types = new Set(ours.map(e => e.type));
        expect(types.has('commented')).toBe(true);
    });

    it('deletes an activity entry (204) and it disappears from the list', async () => {
        const u = await createUser({ suite: 'activity-delete' });
        const r = authedRequest(u.token);
        const todoId = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('act-del') }
            })
        ).id;
        const created = await r('POST', `/api/todos/${todoId}/events`, {
            body: { type: 'commented', comment: 'to-delete' }
        });
        const activityId = json<{ id: number }>(created).id;

        const del = await r('DELETE', `/api/activity/${activityId}`);
        expect(del.status).toBe(204);

        const after = await r('GET', '/api/activity?limit=200');
        const entries = json<Array<{ id: number }>>(after);
        expect(entries.find(e => e.id === activityId)).toBeUndefined();
    });
});
