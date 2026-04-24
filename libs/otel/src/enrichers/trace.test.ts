import { LogLevel } from '@cleverbrush/log';
import { context, trace } from '@opentelemetry/api';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { traceEnricher } from './trace.js';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)]
});

beforeAll(() => provider.register());
afterAll(async () => provider.shutdown());

const baseEvent = {
    timestamp: new Date(),
    level: LogLevel.Information,
    messageTemplate: 't',
    renderedMessage: 't',
    properties: { existing: 1 }
};

describe('traceEnricher', () => {
    it('adds TraceId/SpanId/TraceFlags when a span is active', () => {
        const enricher = traceEnricher();
        const tracer = trace.getTracer('t');
        const span = tracer.startSpan('work');
        let enriched: ReturnType<typeof enricher>;
        context.with(trace.setSpan(context.active(), span), () => {
            enriched = enricher({ ...baseEvent });
        });
        span.end();
        expect(enriched!.properties.TraceId).toBe(span.spanContext().traceId);
        expect(enriched!.properties.SpanId).toBe(span.spanContext().spanId);
        expect(enriched!.properties.TraceFlags).toBe(
            span.spanContext().traceFlags
        );
        // Doesn't mutate input
        expect(enriched!.properties.existing).toBe(1);
    });

    it('returns the event unchanged when no span is active', () => {
        const enricher = traceEnricher();
        const out = enricher({ ...baseEvent });
        expect(out.properties.TraceId).toBeUndefined();
        expect(out.properties.SpanId).toBeUndefined();
    });
});
