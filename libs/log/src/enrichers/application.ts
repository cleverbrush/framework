import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with the application name.
 *
 * @param application - the application name (e.g. `'order-service'`)
 * @returns an enricher that adds `{ Application: '...' }`
 */
export function applicationEnricher(application: string): Enricher {
    return event => ({
        ...event,
        properties: {
            ...event.properties,
            Application: application
        }
    });
}
