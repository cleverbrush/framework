import type { Enricher } from '@cleverbrush/log';
import { trace } from '@opentelemetry/api';

/**
 * Creates a log enricher that attaches the active span's
 * `TraceId`, `SpanId`, and `TraceFlags` to every log event.
 *
 * Reads from the OpenTelemetry context via `@opentelemetry/api`,
 * so it works with any tracer provider — including the one
 * configured by {@link import('../setupOtel.js').setupOtel}.
 *
 * No-op when no span is active.
 *
 * @returns an enricher that adds `{ TraceId, SpanId, TraceFlags }` if a span is active
 *
 * @example
 * ```ts
 * import { createLogger, consoleSink } from '@cleverbrush/log';
 * import { traceEnricher } from '@cleverbrush/otel';
 *
 * const logger = createLogger({
 *     sinks: [consoleSink()],
 *     enrichers: [traceEnricher()],
 * });
 * ```
 */
export function traceEnricher(): Enricher {
    return event => {
        const span = trace.getActiveSpan();
        if (!span) return event;
        const ctx = span.spanContext();
        if (!ctx?.traceId) return event;
        return {
            ...event,
            properties: {
                ...event.properties,
                TraceId: ctx.traceId,
                SpanId: ctx.spanId,
                TraceFlags: ctx.traceFlags
            }
        };
    };
}
