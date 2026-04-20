import type { Enricher } from '../Enricher.js';
import { LogContext } from '../LogContext.js';

/**
 * Enriches log events with the correlation ID from `AsyncLocalStorage`.
 * Zero-cost when no context is active — simply returns the event unchanged.
 *
 * @returns an enricher that adds `{ CorrelationId: '...' }` if available
 */
export function correlationIdEnricher(): Enricher {
    return event => {
        const store = LogContext.getStore();
        if (!store?.correlationId) return event;
        return {
            ...event,
            properties: {
                ...event.properties,
                CorrelationId: store.correlationId
            }
        };
    };
}
