import type { LogEvent, LogSink } from '@cleverbrush/log';
import { LogLevel, levelToString } from '@cleverbrush/log';
import {
    logs,
    type Logger as OtelLogger,
    SeverityNumber
} from '@opentelemetry/api-logs';

/**
 * Configuration for {@link otelLogSink}.
 */
export interface OtelLogSinkOptions {
    /**
     * Logger name (`InstrumentationScope`) under which records are
     * emitted via the OTel Logs API.
     *
     * @default '@cleverbrush/otel'
     */
    loggerName?: string;

    /** Optional logger version. */
    loggerVersion?: string;

    /**
     * Hook for redacting / dropping properties before they become
     * OTel log record attributes. Return `undefined` to drop the
     * attribute entirely.
     */
    sanitizeAttribute?: (key: string, value: unknown) => unknown | undefined;
}

const SEVERITY_NUMBER: Record<LogLevel, SeverityNumber> = {
    [LogLevel.Trace]: SeverityNumber.TRACE,
    [LogLevel.Debug]: SeverityNumber.DEBUG,
    [LogLevel.Information]: SeverityNumber.INFO,
    [LogLevel.Warning]: SeverityNumber.WARN,
    [LogLevel.Error]: SeverityNumber.ERROR,
    [LogLevel.Fatal]: SeverityNumber.FATAL
};

const SCALAR_TYPES = new Set(['string', 'number', 'boolean', 'bigint']);

function toAttributeValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
    }
    if (SCALAR_TYPES.has(typeof value)) return value;
    if (Array.isArray(value)) {
        return value.map(toAttributeValue).filter(v => v !== undefined);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Creates a {@link LogSink} that forwards every event to the
 * OpenTelemetry Logs API.
 *
 * Maps each `LogEvent` to an OTel `LogRecord`:
 * - `timestamp` → nanoseconds via `Date.getTime()` × 1e6
 * - `level` → `severityNumber` and `severityText`
 * - `renderedMessage` → `body`
 * - `properties` → flat attribute map (functions / symbols dropped,
 *   nested objects JSON-stringified)
 * - `messageTemplate` → `cleverbrush.message_template` attribute
 * - `eventId` → `cleverbrush.event_id` attribute
 * - `exception.*` attributes when the event carries an `Error`
 *
 * Trace correlation (`traceId`, `spanId`) is filled in automatically
 * by the OTel SDK from the active context — typically established by
 * `tracingMiddleware`.
 *
 * The sink itself is per-event; for high-throughput services wrap it
 * with `BatchingSink` from `@cleverbrush/log`.
 *
 * Requires that `setupOtel({ ... })` has been called so the global
 * `LoggerProvider` is set; otherwise emissions become no-ops.
 *
 * @param options - logger name and attribute sanitization
 * @returns a `LogSink` that emits to the OTel Logs pipeline
 *
 * @example
 * ```ts
 * import { createLogger, consoleSink } from '@cleverbrush/log';
 * import { otelLogSink } from '@cleverbrush/otel';
 *
 * const logger = createLogger({
 *     minimumLevel: 'information',
 *     sinks: [consoleSink(), otelLogSink()],
 * });
 * ```
 */
export function otelLogSink(options?: OtelLogSinkOptions): LogSink {
    const loggerName = options?.loggerName ?? '@cleverbrush/otel';
    const loggerVersion = options?.loggerVersion;
    const sanitize = options?.sanitizeAttribute;

    let cached: OtelLogger | undefined;
    const getLogger = (): OtelLogger => {
        if (!cached) cached = logs.getLogger(loggerName, loggerVersion);
        return cached;
    };

    return {
        async emit(events: LogEvent[]): Promise<void> {
            const otelLogger = getLogger();
            for (const event of events) {
                const attributes: Record<string, unknown> = {};
                for (const [key, raw] of Object.entries(event.properties)) {
                    const value = sanitize
                        ? sanitize(key, raw)
                        : toAttributeValue(raw);
                    if (value !== undefined) attributes[key] = value;
                }

                if (event.messageTemplate) {
                    attributes['cleverbrush.message_template'] =
                        event.messageTemplate;
                }
                if (event.eventId) {
                    attributes['cleverbrush.event_id'] = event.eventId;
                }
                if (event.exception) {
                    attributes['exception.type'] = event.exception.name;
                    attributes['exception.message'] = event.exception.message;
                    if (event.exception.stack) {
                        attributes['exception.stacktrace'] =
                            event.exception.stack;
                    }
                }

                otelLogger.emit({
                    timestamp: event.timestamp.getTime(), // milliseconds; OTel SDK converts to ns internally
                    severityNumber: SEVERITY_NUMBER[event.level],
                    severityText: levelToString(event.level).toUpperCase(),
                    body: event.renderedMessage,
                    attributes: attributes as any
                });
            }
        },

        async [Symbol.asyncDispose](): Promise<void> {
            // The OTel SDK owns the LoggerProvider lifecycle —
            // it is shut down via `OtelHandle.shutdown()`.
        }
    };
}
