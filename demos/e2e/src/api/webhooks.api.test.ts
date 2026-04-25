import { afterAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser } from '../support/auth.js';
import { closePool } from '../support/db.js';
import { json } from '../support/http.js';

afterAll(closePool);

describe('Webhooks — subscribe', () => {
    it('subscribes with valid event types and returns 201 + Location', async () => {
        const u = await createUser({ suite: 'webhooks-ok' });
        const res = await authedRequest(u.token)(
            'POST',
            '/api/webhooks/subscribe',
            {
                body: {
                    callbackUrl: 'https://example.com/hook',
                    events: ['todo.created', 'todo.completed']
                }
            }
        );
        expect(res.status).toBe(201);
        expect(res.headers['location']).toBeTruthy();
        const body = json<{ id: string; events: string[] }>(res);
        expect(body.id).toBeTypeOf('string');
        expect(body.events).toEqual(['todo.created', 'todo.completed']);
    });

    it('rejects unknown event types with 400', async () => {
        const u = await createUser({ suite: 'webhooks-bad' });
        const res = await authedRequest(u.token)(
            'POST',
            '/api/webhooks/subscribe',
            {
                body: {
                    callbackUrl: 'https://example.com/hook',
                    events: ['todo.never_existed']
                }
            }
        );
        expect(res.status).toBe(400);
    });
});
