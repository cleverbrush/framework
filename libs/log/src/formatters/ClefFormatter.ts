import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { type SerializationOptions, safeSerialize } from '../serialization.js';

/**
 * Maps internal log levels to CLEF/Serilog level names.
 * `Information` is omitted in CLEF (it's the default).
 */
const clefLevelMap: Record<LogLevel, string | undefined> = {
    [LogLevel.Trace]: 'Verbose',
    [LogLevel.Debug]: 'Debug',
    [LogLevel.Information]: undefined,
    [LogLevel.Warning]: 'Warning',
    [LogLevel.Error]: 'Error',
    [LogLevel.Fatal]: 'Fatal'
};

/**
 * Formats a single `LogEvent` as a CLEF JSON string.
 *
 * CLEF (Compact Log Event Format) is the standard wire format for Seq
 * and compatible with the Serilog ecosystem.
 *
 * @param event - the log event to format
 * @param options - optional serialization limits
 * @returns a single-line JSON string in CLEF format
 *
 * @example
 * ```ts
 * const line = formatClef(event);
 * // '{"@t":"2026-04-20T14:30:00.123Z","@mt":"User {UserId} signed in","UserId":"usr_abc"}'
 * ```
 */
export function formatClef(
    event: LogEvent,
    options?: SerializationOptions
): string {
    const obj: Record<string, unknown> = {
        '@t': event.timestamp.toISOString(),
        '@mt': event.messageTemplate
    };

    // Only include @m if it differs from @mt
    if (event.renderedMessage !== event.messageTemplate) {
        obj['@m'] = event.renderedMessage;
    }

    // Omit @l for Information (CLEF default)
    const clefLevel = clefLevelMap[event.level];
    if (clefLevel !== undefined) {
        obj['@l'] = clefLevel;
    }

    // Exception stack trace
    if (event.exception) {
        obj['@x'] = event.exception.stack ?? event.exception.message;
    }

    // Event ID
    if (event.eventId) {
        obj['@i'] = event.eventId;
    }

    // Spread all properties as top-level CLEF fields.
    // Keys starting with '@' are reserved for CLEF itself; user-supplied keys
    // that collide are prefixed with '_' to avoid corrupting the event payload.
    if (event.properties) {
        for (const [key, value] of Object.entries(event.properties)) {
            const safeKey = key.startsWith('@') ? `_${key}` : key;
            obj[safeKey] = safeSerialize(value, options);
        }
    }

    return JSON.stringify(obj);
}

/**
 * Formats a batch of log events as newline-delimited CLEF.
 *
 * @param events - array of log events
 * @param options - optional serialization limits
 * @returns newline-delimited CLEF string
 *
 * @example
 * ```ts
 * const payload = formatClefBatch(events);
 * // Suitable for POST to Seq /ingest/clef
 * ```
 */
export function formatClefBatch(
    events: LogEvent[],
    options?: SerializationOptions
): string {
    return events.map(e => formatClef(e, options)).join('\n');
}
