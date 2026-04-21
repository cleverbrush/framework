/**
 * Subscription handlers for real-time WebSocket endpoints.
 */

import type { SubscriptionHandler } from '@cleverbrush/server';
import type {
    ChatSubscription,
    TodoUpdatesSubscription
} from '../endpoints.js';

// ── Todo updates — broadcasts simulated todo changes ──────────────────────────

export const todoUpdatesHandler: SubscriptionHandler<
    typeof TodoUpdatesSubscription
> = async function* () {
    let id = 0;
    const actions = ['created', 'updated', 'deleted', 'completed'];
    const titles = [
        'Buy groceries',
        'Write tests',
        'Deploy app',
        'Review PR',
        'Fix bug'
    ];

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        id++;
        yield {
            action: actions[id % actions.length],
            todoId: id,
            title: titles[id % titles.length]
        };
    }
};

// ── Chat — echoes back incoming messages with metadata ────────────────────────

const chatClients = new Set<
    (msg: { user: string; text: string; ts: number }) => void
>();

export const chatHandler: SubscriptionHandler<typeof ChatSubscription> =
    async function* ({ incoming }) {
        // Broadcast helper
        const pending: { user: string; text: string; ts: number }[] = [];
        let resolve: (() => void) | null = null;

        const push = (msg: { user: string; text: string; ts: number }) => {
            pending.push(msg);
            resolve?.();
        };

        chatClients.add(push);

        // Spawn listener for incoming messages in background
        const userName = `user-${Math.random().toString(36).slice(2, 6)}`;

        // Announce join
        const joinMsg = {
            user: 'system',
            text: `${userName} joined`,
            ts: Date.now()
        };
        for (const client of chatClients) {
            client(joinMsg);
        }

        // Forward incoming messages to all clients
        const incomingDone = (async () => {
            for await (const msg of incoming) {
                const outMsg = {
                    user: userName,
                    text: msg.text,
                    ts: Date.now()
                };
                for (const client of chatClients) {
                    client(outMsg);
                }
            }
        })();

        try {
            // Yield pending messages as they arrive
            while (true) {
                if (pending.length === 0) {
                    await new Promise<void>(r => {
                        resolve = r;
                    });
                }
                while (pending.length > 0) {
                    yield pending.shift()!;
                }
            }
        } finally {
            chatClients.delete(push);
            await incomingDone.catch(() => {});
        }
    };
