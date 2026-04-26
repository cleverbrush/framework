import { LogLevel } from '@cleverbrush/log';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
    InMemoryLogRecordExporter,
    LoggerProvider,
    SimpleLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { otelLogSink } from './OtelLogSink.js';

const logExporter = new InMemoryLogRecordExporter();
const loggerProvider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor(logExporter)]
});

const spanExporter = new InMemorySpanExporter();
const tracerProvider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(spanExporter)]
});

beforeAll(() => {
    logs.setGlobalLoggerProvider(loggerProvider);
    tracerProvider.register();
});

afterAll(async () => {
    await loggerProvider.shutdown();
    await tracerProvider.shutdown();
});

beforeEach(() => {
    logExporter.reset();
    spanExporter.reset();
});

describe('otelLogSink', () => {
    it('maps LogEvent to OTel LogRecord (severity, body, attributes)', async () => {
        const sink = otelLogSink();
        await sink.emit([
            {
                timestamp: new Date('2026-01-01T00:00:00Z'),
                level: LogLevel.Information,
                messageTemplate: 'Hello {Name}',
                renderedMessage: 'Hello world',
                properties: { Name: 'world', Count: 3 },
                eventId: 'abc123'
            }
        ]);
        const records = logExporter.getFinishedLogRecords();
        expect(records).toHaveLength(1);
        const r = records[0]!;
        expect(r.severityNumber).toBe(SeverityNumber.INFO);
        expect(r.severityText).toBe('INFORMATION');
        expect(r.body).toBe('Hello world');
        expect(r.attributes?.Name).toBe('world');
        expect(r.attributes?.Count).toBe(3);
        expect(r.attributes?.['cleverbrush.message_template']).toBe(
            'Hello {Name}'
        );
        expect(r.attributes?.['cleverbrush.event_id']).toBe('abc123');
    });

    it('emits exception attributes when an Error is attached', async () => {
        const sink = otelLogSink();
        const err = new Error('boom');
        await sink.emit([
            {
                timestamp: new Date(),
                level: LogLevel.Error,
                messageTemplate: 'oops',
                renderedMessage: 'oops',
                properties: {},
                exception: err
            }
        ]);
        const r = logExporter.getFinishedLogRecords()[0]!;
        expect(r.severityNumber).toBe(SeverityNumber.ERROR);
        expect(r.attributes?.['exception.type']).toBe('Error');
        expect(r.attributes?.['exception.message']).toBe('boom');
        expect(r.attributes?.['exception.stacktrace']).toBeDefined();
    });

    it('drops function/symbol attributes and stringifies objects', async () => {
        const sink = otelLogSink();
        await sink.emit([
            {
                timestamp: new Date(),
                level: LogLevel.Debug,
                messageTemplate: 't',
                renderedMessage: 't',
                properties: {
                    Func: () => 1,
                    Sym: Symbol('s'),
                    Obj: { a: 1 }
                }
            }
        ]);
        const r = logExporter.getFinishedLogRecords()[0]!;
        expect(r.attributes?.Func).toBeUndefined();
        expect(r.attributes?.Sym).toBeUndefined();
        expect(r.attributes?.Obj).toBe('{"a":1}');
    });

    it('honors sanitizeAttribute hook', async () => {
        const sink = otelLogSink({
            sanitizeAttribute: (k, v) => (k === 'Password' ? undefined : v)
        });
        await sink.emit([
            {
                timestamp: new Date(),
                level: LogLevel.Information,
                messageTemplate: 't',
                renderedMessage: 't',
                properties: { Password: 'secret', Name: 'ok' }
            }
        ]);
        const r = logExporter.getFinishedLogRecords()[0]!;
        expect(r.attributes?.Password).toBeUndefined();
        expect(r.attributes?.Name).toBe('ok');
    });

    it('correlates with active span (traceId/spanId)', async () => {
        const sink = otelLogSink();
        const tracer = trace.getTracer('t');
        const span = tracer.startSpan('work');
        await context.with(trace.setSpan(context.active(), span), async () => {
            await sink.emit([
                {
                    timestamp: new Date(),
                    level: LogLevel.Information,
                    messageTemplate: 't',
                    renderedMessage: 't',
                    properties: {}
                }
            ]);
        });
        span.end();

        const r = logExporter.getFinishedLogRecords()[0]!;
        expect(r.spanContext?.traceId).toBe(span.spanContext().traceId);
        expect(r.spanContext?.spanId).toBe(span.spanContext().spanId);
    });

    it('asyncDispose is a no-op', async () => {
        const sink = otelLogSink();
        await expect(sink[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });

    it('maps array property values', async () => {
        const sink = otelLogSink();
        await sink.emit([
            {
                timestamp: new Date(),
                level: LogLevel.Information,
                messageTemplate: 't',
                renderedMessage: 't',
                properties: { Tags: ['a', 'b', 'c'] }
            }
        ]);
        const r = logExporter.getFinishedLogRecords().at(-1)!;
        expect(r.attributes?.Tags).toEqual(['a', 'b', 'c']);
    });

    it('serializes non-JSON-safe objects with String() fallback', async () => {
        const circular: Record<string, unknown> = {};
        circular['self'] = circular;
        const sink = otelLogSink();
        await sink.emit([
            {
                timestamp: new Date(),
                level: LogLevel.Information,
                messageTemplate: 't',
                renderedMessage: 't',
                properties: { Circ: circular }
            }
        ]);
        const r = logExporter.getFinishedLogRecords().at(-1)!;
        expect(typeof r.attributes?.Circ).toBe('string');
    });
});
