import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with OpenTelemetry trace and span IDs
 * from the active context, if available.
 *
 * Reads from `globalThis.__OTEL_ACTIVE_SPAN__` or the standard
 * OpenTelemetry API if installed. No-op when no tracing is active.
 *
 * @returns an enricher that adds `{ TraceId: '...', SpanId: '...' }` if available
 */
export function traceEnricher(): Enricher {
    return event => {
        try {
            // Try the OpenTelemetry API if available
            const otel = (globalThis as any).opentelemetry;
            if (otel?.trace) {
                const span = otel.trace.getActiveSpan?.();
                if (span) {
                    const ctx = span.spanContext();
                    return {
                        ...event,
                        properties: {
                            ...event.properties,
                            TraceId: ctx.traceId,
                            SpanId: ctx.spanId
                        }
                    };
                }
            }
        } catch {
            // No OpenTelemetry available — no-op
        }
        return event;
    };
}
