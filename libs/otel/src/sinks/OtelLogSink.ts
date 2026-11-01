import type { LogEvent, LogSink } from '@cleverbrush/log';
import {
    LogLevel,
    levelToString,
    parseTemplate,
    renderTemplate
} from '@cleverbrush/log';
import { context } from '@opentelemetry/api';
import {
    logs,
    type Logger as OtelLogger,
    SeverityNumber
} from '@opentelemetry/api-logs';
import { type ExceptionPolicy, sanitizeException } from '../exceptionPolicy.js';

/**
 * Configuration for {@link otelLogSink}.
 */
export interface OtelLogSinkOptions {
    /** Automatic exception details. @default 'omit' */
    exceptionPolicy?: ExceptionPolicy;

    /** Redact the final rendered body; return undefined to omit it. */
    sanitizeBody?: (body: string) => string | undefined;
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
     * Redact every attribute, including automatic template and exception
     * fields. Return undefined to drop it. Templates are rendered again from
     * redacted properties; sanitizeBody also covers literal message text.
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
 * - `timestamp` → milliseconds, converted internally by the OTel SDK
 * - `level` → `severityNumber` and `severityText`
 * - `renderedMessage` → `body`
 * - `properties` → flat attribute map (functions / symbols dropped,
 *   nested objects JSON-stringified)
 * - `messageTemplate` → `cleverbrush.message_template` attribute
 * - `eventId` → `cleverbrush.event_id` attribute
 * - `exception.*` attributes only when the exception policy allows them
 *
 * Passes each event's captured context explicitly to the OTel Logs API,
 * preserving trace correlation through asynchronous queues and retries.
 * Manually constructed events without a snapshot use the calling context.
 *
 * The OTel SDK batches export; additional BatchingSink buffering is optional.
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

    const sanitizeValue = (key: string, value: unknown): unknown => {
        try {
            return sanitize ? sanitize(key, value) : value;
        } catch {
            return undefined;
        }
    };

    let cached: OtelLogger | undefined;
    const getLogger = (): OtelLogger => {
        if (!cached) cached = logs.getLogger(loggerName, loggerVersion);
        return cached;
    };

    return {
        async emit(events: LogEvent[]): Promise<void> {
            const otelLogger = getLogger();
            for (const event of events) {
                const emit = () => {
                    const attributes: Record<string, unknown> =
                        Object.create(null);
                    const properties: Record<string, unknown> =
                        Object.create(null);
                    const addAttribute = (key: string, value: unknown) => {
                        try {
                            const converted = toAttributeValue(value);
                            if (converted !== undefined)
                                attributes[key] = converted;
                        } catch {
                            // Inspection failures omit the affected field.
                        }
                    };
                    for (const [key, raw] of Object.entries(event.properties)) {
                        const value = sanitizeValue(key, raw);
                        if (value !== undefined) properties[key] = value;
                        addAttribute(key, value);
                    }
                    const automatic: Record<string, unknown> = {
                        'cleverbrush.message_template': event.messageTemplate,
                        'cleverbrush.event_id': event.eventId
                    };
                    const exception = sanitizeException(
                        event.exception,
                        event.exception === undefined
                            ? 'omit'
                            : options?.exceptionPolicy
                    );
                    if (exception) {
                        automatic['exception.type'] = exception.name;
                        automatic['exception.message'] = exception.message;
                        automatic['exception.stacktrace'] = exception.stack;
                    }
                    for (const [key, raw] of Object.entries(automatic)) {
                        if (raw !== undefined)
                            addAttribute(key, sanitizeValue(key, raw));
                    }

                    let body: string | undefined;
                    try {
                        body = sanitize
                            ? renderTemplate(
                                  parseTemplate(event.messageTemplate),
                                  properties
                              )
                            : event.renderedMessage;
                        if (options?.sanitizeBody)
                            body = options.sanitizeBody(body);
                    } catch {
                        // A failing body sanitizer must not export raw text.
                        body = undefined;
                    }
                    otelLogger.emit({
                        context: context.active(),
                        timestamp: event.timestamp.getTime(),
                        severityNumber: SEVERITY_NUMBER[event.level],
                        severityText: levelToString(event.level).toUpperCase(),
                        body,
                        attributes: attributes as any
                    });
                };
                if (event.runInContext) event.runInContext(emit);
                else emit();
            }
        },

        async [Symbol.asyncDispose](): Promise<void> {
            // The OTel SDK owns the LoggerProvider lifecycle —
            // it is shut down via `OtelHandle.shutdown()`.
        }
    };
}
