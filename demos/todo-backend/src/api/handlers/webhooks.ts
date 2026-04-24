import { randomBytes } from 'node:crypto';
import { ActionResult, type Handler } from '@cleverbrush/server';
import type { SubscribeWebhookEndpoint } from '../endpoints.js';

// ── Subscribe to webhook notifications ────────────────────────────────────────
// Demo endpoint — no actual delivery. Demonstrates .callbacks() in the OpenAPI spec.

export const subscribeWebhookHandler: Handler<
    typeof SubscribeWebhookEndpoint
> = async ({ body }) => {
    const allowedEvents = ['todo.created', 'todo.completed'];
    const invalid = body.events.filter(e => !allowedEvents.includes(e));

    if (invalid.length > 0) {
        return ActionResult.badRequest({
            message: `Unknown event types: ${invalid.join(', ')}. Allowed: ${allowedEvents.join(', ')}.`
        });
    }

    // Generate a fake subscription (demo — no persistence)
    const subscription = {
        id: randomBytes(12).toString('hex'),
        callbackUrl: body.callbackUrl,
        events: body.events,
        createdAt: new Date()
    };

    return ActionResult.created(
        subscription,
        `/api/webhooks/${subscription.id}`
    );
};
