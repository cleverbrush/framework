import type { LogEvent } from './LogEvent.js';

/**
 * An enricher adds or transforms properties on a log event.
 *
 * Enrichers are pure functions that return a new event with additional
 * properties — they must not mutate the input event.
 */
export type Enricher = (event: LogEvent) => LogEvent;
