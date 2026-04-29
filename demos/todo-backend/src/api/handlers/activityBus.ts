/**
 * In-process pub/sub bus for todo activity events.
 *
 * Follows the same Set-of-callbacks pattern used by the chat subscription
 * so that `activityFeedHandler` can broadcast events to all connected WS clients
 * whenever `sendTodoEventHandler` commits a new activity row.
 */

import type { TodoActivityResponse } from '../schemas.js';

type ActivityCallback = (event: TodoActivityResponse) => void;

const subscribers = new Set<ActivityCallback>();

/** Deliver an activity event to every connected subscriber. */
export function publishActivity(event: TodoActivityResponse): void {
    for (const cb of subscribers) {
        cb(event);
    }
}

/** Register a callback; returns an unsubscribe function. */
export function subscribeActivity(cb: ActivityCallback): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
}
