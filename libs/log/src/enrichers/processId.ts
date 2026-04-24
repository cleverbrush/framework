import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with the current process ID.
 * The PID is cached on first call.
 *
 * @returns an enricher that adds `{ ProcessId: number }`
 */
export function processIdEnricher(): Enricher {
    let pid: number | undefined;
    return event => {
        if (pid === undefined) {
            pid = process.pid;
        }
        return {
            ...event,
            properties: { ...event.properties, ProcessId: pid }
        };
    };
}
