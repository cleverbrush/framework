import type { LogEvent } from './LogEvent.js';

/**
 * A filter that determines whether a log event should be emitted.
 *
 * Return `true` to keep the event, `false` to discard it.
 */
export type LogFilter = (event: LogEvent) => boolean;
