import { afterAll, describe, expect, it } from 'vitest';
import { authedRequest, createUser } from '../support/auth.js';
import { closePool } from '../support/db.js';
import { json } from '../support/http.js';
import { uniqueTitle } from '../support/ids.js';
import { connectWs } from '../support/ws.js';

afterAll(closePool);

describe('Live — /ws/todos (server-push)', () => {
    it('receives at least 2 server-pushed messages within 6 s', async () => {
        const u = await createUser({ suite: 'ws-todos' });
        const ws = connectWs('/ws/todos', { token: u.token });
        try {
            await ws.open;
            const messages = await ws.collect(2, 6_000);
            for (const m of messages) {
                expect(m).toMatchObject({
                    action: expect.any(String),
                    todoId: expect.any(Number),
                    title: expect.any(String)
                });
            }
        } finally {
            ws.close();
        }
    });
});

describe('Live — /ws/chat (bidirectional broadcast)', () => {
    it('sender messages are broadcast to a second client', async () => {
        const u1 = await createUser({ suite: 'ws-chat-1' });
        const u2 = await createUser({ suite: 'ws-chat-2' });
        const a = connectWs('/ws/chat', { token: u1.token });
        const b = connectWs('/ws/chat', { token: u2.token });
        try {
            await Promise.all([a.open, b.open]);

            const seen: unknown[] = [];
            const collector = (async () => {
                while (seen.length < 6) {
                    try {
                        const msg = await b.next(6_000);
                        seen.push(msg);
                    } catch {
                        break;
                    }
                }
            })();

            // Small delay so the chat handler registers both clients before send.
            await new Promise(r => setTimeout(r, 200));
            const text = `hello-${Date.now()}`;
            a.send({ text });

            await collector;
            const userMsg = seen.find(
                (m): m is { user: string; text: string } =>
                    typeof (m as { text?: unknown }).text === 'string' &&
                    (m as { text: string }).text === text
            );
            expect(userMsg).toBeDefined();
            expect(userMsg!.user).toMatch(/^user-/);
        } finally {
            a.close();
            b.close();
        }
    });
});

describe('Live — /ws/activity (REST → WS bridge)', () => {
    it('forwards a sendEvent triggered via REST to subscribed clients', async () => {
        const u = await createUser({ suite: 'ws-activity' });
        const r = authedRequest(u.token);
        const todoId = json<{ id: number }>(
            await r('POST', '/api/todos', {
                body: { title: uniqueTitle('ws-activity') }
            })
        ).id;

        const ws = connectWs('/ws/activity', { token: u.token });
        try {
            await ws.open;
            // Brief delay so the subscription is registered with activityBus
            // before the REST event is published.
            await new Promise(r => setTimeout(r, 200));

            await r('POST', `/api/todos/${todoId}/events`, {
                body: { type: 'commented', comment: 'live!' }
            });

            const event = (await ws.next(5_000)) as {
                type: string;
                todoId: number;
            };
            expect(event.type).toBe('commented');
            expect(event.todoId).toBe(todoId);
        } finally {
            ws.close();
        }
    });
});
