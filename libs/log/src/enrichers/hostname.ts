import os from 'node:os';
import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with the machine hostname.
 * The hostname is cached on first call.
 *
 * @returns an enricher that adds `{ Hostname: '...' }`
 */
export function hostnameEnricher(): Enricher {
    let hostname: string | undefined;
    return event => {
        if (hostname === undefined) {
            hostname = os.hostname();
        }
        return {
            ...event,
            properties: { ...event.properties, Hostname: hostname }
        };
    };
}
