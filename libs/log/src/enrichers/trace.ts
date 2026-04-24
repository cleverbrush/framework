import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with OpenTelemetry trace and span IDs
 * from the active context, if available.
 *
 * Reads from `globalThis.opentelemetry` (a shim some applications register).
 * No-op when no tracing is active.
 *
 * @deprecated Use `traceEnricher` from `@cleverbrush/otel` instead. The
 *   replacement reads the active span via `@opentelemetry/api` directly,
 *   does not depend on a global shim, and also captures `TraceFlags`.
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
