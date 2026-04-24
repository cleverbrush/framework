import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with the deployment environment name.
 *
 * @param environment - the environment name (e.g. `'production'`, `'staging'`)
 * @returns an enricher that adds `{ Environment: '...' }`
 */
export function environmentEnricher(environment: string): Enricher {
    return event => ({
        ...event,
        properties: {
            ...event.properties,
            Environment: environment
        }
    });
}
