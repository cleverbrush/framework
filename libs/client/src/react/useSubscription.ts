/**
 * `useSubscription` — React hook for consuming WebSocket subscriptions.
 *
 * Manages the subscription lifecycle: connects on mount, disconnects on
 * unmount, and provides reactive state (last event, connection status,
 * accumulated events, error).
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription } from '../types.js';

/**
 * The state returned by `useSubscription`.
 */
export interface UseSubscriptionState<TOutgoing, TIncoming> {
    /** The most recently received event. */
    lastEvent: TOutgoing | undefined;
    /** All events received so far (newest last). */
    events: TOutgoing[];
    /** Current connection state. */
    state: Subscription<TOutgoing, TIncoming>['state'];
    /** Send a message to the server (bidirectional subscriptions). */
    send: (message: TIncoming) => void;
    /** Close the subscription. */
    close: () => void;
    /** The last error that occurred, if any. */
    error: Error | undefined;
}

/**
 * Options for `useSubscription`.
 */
export interface UseSubscriptionOptions {
    /** Whether the subscription should be active. Defaults to `true`. */
    enabled?: boolean;
    /** Maximum number of events to keep in the `events` array. Defaults to unlimited. */
    maxEvents?: number;
}

/**
 * React hook that connects to a WebSocket subscription and provides
 * reactive state.
 *
 * @param subscribe - A function that creates a Subscription handle (e.g. `() => client.live.events()`).
 * @param options - Hook options (enabled, maxEvents).
 * @returns Reactive subscription state: `lastEvent`, `events`, `state`, `send`, `close`.
 *
 * @example
 * ```tsx
 * function LiveFeed() {
 *     const { events, state, send } = useSubscription(
 *         () => client.live.events(),
 *         { maxEvents: 100 }
 *     );
 *
 *     return (
 *         <div>
 *             <p>Status: {state}</p>
 *             {events.map((e, i) => <div key={i}>{e.message}</div>)}
 *             <button onClick={() => send({ text: 'hello' })}>Send</button>
 *         </div>
 *     );
 * }
 * ```
 */
export function useSubscription<TOutgoing, TIncoming = never>(
    subscribe: () => Subscription<TOutgoing, TIncoming>,
    options: UseSubscriptionOptions = {}
): UseSubscriptionState<TOutgoing, TIncoming> {
    const { enabled = true, maxEvents } = options;

    const [lastEvent, setLastEvent] = useState<TOutgoing | undefined>(
        undefined
    );
    const [events, setEvents] = useState<TOutgoing[]>([]);
    const [state, setState] =
        useState<Subscription<TOutgoing, TIncoming>['state']>('closed');
    const [error, setError] = useState<Error | undefined>(undefined);

    const subRef = useRef<Subscription<TOutgoing, TIncoming> | null>(null);
    const subscribeRef = useRef(subscribe);
    subscribeRef.current = subscribe;
    const maxEventsRef = useRef(maxEvents);
    maxEventsRef.current = maxEvents;

    const send = useCallback((message: TIncoming) => {
        subRef.current?.send(message);
    }, []);

    const close = useCallback(() => {
        subRef.current?.close();
        subRef.current = null;
        setState('closed');
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const sub = subscribeRef.current();
        subRef.current = sub;
        setState(sub.state);

        // Poll state changes (WebSocket readyState doesn't fire events)
        const stateInterval = setInterval(() => {
            setState(prev => (sub.state !== prev ? sub.state : prev));
        }, 200);

        // Consume the async iterable
        let cancelled = false;

        (async () => {
            try {
                for await (const event of sub) {
                    if (cancelled) break;
                    setLastEvent(event);
                    setEvents(prev => {
                        const next = [...prev, event];
                        const max = maxEventsRef.current;
                        if (max !== undefined && next.length > max) {
                            return next.slice(-max);
                        }
                        return next;
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err : new Error(String(err))
                    );
                }
            } finally {
                if (!cancelled) {
                    setState('closed');
                }
            }
        })();

        return () => {
            cancelled = true;
            clearInterval(stateInterval);
            sub.close();
            subRef.current = null;
        };
    }, [enabled]);

    return { lastEvent, events, state, send, close, error };
}
