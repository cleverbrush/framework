import { Readable } from 'node:stream';
import { ActionResult, type Handler } from '@cleverbrush/server';
import type { AdminActivityEndpoint } from '../endpoints.js';

// ── Admin activity log stream ─────────────────────────────────────────────────
// Generates synthetic NDJSON activity entries to demonstrate ActionResult.stream().

export const activityLogHandler: Handler<
    typeof AdminActivityEndpoint
> = async () => {
    const entries = [
        {
            ts: new Date().toISOString(),
            action: 'user.login',
            userId: 1,
            detail: 'Admin logged in'
        },
        {
            ts: new Date(Date.now() - 60_000).toISOString(),
            action: 'todo.created',
            userId: 2,
            detail: 'User created todo "Buy groceries"'
        },
        {
            ts: new Date(Date.now() - 120_000).toISOString(),
            action: 'todo.completed',
            userId: 2,
            detail: 'User completed todo "Read book"'
        },
        {
            ts: new Date(Date.now() - 180_000).toISOString(),
            action: 'user.registered',
            userId: 3,
            detail: 'New user signed up'
        },
        {
            ts: new Date(Date.now() - 240_000).toISOString(),
            action: 'todo.deleted',
            userId: 1,
            detail: 'Admin deleted todo #42'
        }
    ];

    const ndjson = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    const readable = Readable.from(Buffer.from(ndjson, 'utf-8'));

    return ActionResult.stream(readable, 'application/x-ndjson');
};
