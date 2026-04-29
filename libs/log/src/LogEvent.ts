import type { LogLevel } from './LogLevel.js';

/**
 * Represents a single structured log event in the pipeline.
 *
 * Log events carry both a human-readable rendered message and the original
 * message template with structured property values, enabling both
 * human-friendly display and machine-queryable structured search.
 */
export interface LogEvent {
    /** ISO timestamp when the event occurred. */
    timestamp: Date;
    /** Severity level of the event. */
    level: LogLevel;
    /** The raw message template with `{Property}` holes. */
    messageTemplate: string;
    /** The fully interpolated, human-readable message. */
    renderedMessage: string;
    /** Structured properties extracted from the template and enrichers. */
    properties: Record<string, unknown>;
    /** The exception associated with this event, if any. */
    exception?: Error;
    /** Deterministic hex hash of `messageTemplate` — maps to CLEF `@i`. */
    eventId?: string;
}
