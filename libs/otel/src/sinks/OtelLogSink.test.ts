import {
    BatchingSink,
    createLogEvent,
    createLogger,
    LogLevel
} from '@cleverbrush/log';
import {
    type Context,
    context,
    propagation,
    ROOT_CONTEXT,
    trace
} from '@opentelemetry/api';
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
import { traceEnricher } from '../enrichers/trace.js';
import { otelLogSink } from './OtelLogSink.js';

const logExporter = new InMemoryLogRecordExporter();
const emittedContexts = new Map<string, Context>();
const loggerProvider = new LoggerProvider({
    processors: [
        {
            onEmit(record, context) {
                const origin = record.attributes.Origin;
                if (typeof origin === 'string')
                    emittedContexts.set(origin, context);
            },
            async forceFlush() {},
            async shutdown() {}
        },
        new SimpleLogRecordProcessor({ exporter: logExporter })
    ]
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
    emittedContexts.clear();
});

describe('otelLogSink', () => {
    it('omits automatic exception details by default', async () => {
        const error = new Error(
            'SELECT password; bound-secret; https://private.local'
        );
        await otelLogSink().emit([
            createLogEvent(LogLevel.Error, 'Database unavailable', {}, error)
        ]);
        const record = logExporter.getFinishedLogRecords()[0]!;
        expect(record.body).toBe('Database unavailable');
        expect(
            Object.keys(record.attributes).some(key =>
                key.startsWith('exception.')
            )
        ).toBe(false);
        expect(
            JSON.stringify({ body: record.body, attributes: record.attributes })
        ).not.toContain('bound-secret');
    });

    it('redacts body, structured fields and all automatic attributes', async () => {
        const keys: string[] = [];
        const sink = otelLogSink({
            exceptionPolicy: 'raw',
            sanitizeAttribute: (key, value) => {
                keys.push(key);
                if (key === 'Password' || key === 'exception.stacktrace')
                    return undefined;
                if (key === 'exception.message') return 'Unavailable';
                if (typeof value === 'string')
                    return value.replaceAll('https://private.local', '[url]');
                return value;
            },
            sanitizeBody: body =>
                body.replaceAll('https://private.local', '[url]')
        });
        await sink.emit([
            createLogEvent(
                LogLevel.Error,
                'https://private.local {Password} {@Payload}',
                { Password: 'bound-secret', Payload: { ok: true } },
                new Error(
                    'SELECT password; bound-secret; https://private.local'
                )
            )
        ]);
        const record = logExporter.getFinishedLogRecords()[0]!;
        expect(record.body).toBe('[url] {Password} {"ok":true}');
        expect(record.attributes['exception.message']).toBe('Unavailable');
        expect(keys).toEqual(
            expect.arrayContaining([
                'cleverbrush.message_template',
                'cleverbrush.event_id',
                'exception.type',
                'exception.message',
                'exception.stacktrace'
            ])
        );
        const output = JSON.stringify({
            body: record.body,
            attributes: record.attributes
        });
        for (const secret of [
            'SELECT password',
            'bound-secret',
            'private.local'
        ])
            expect(output).not.toContain(secret);
    });

    it('fails closed when sanitizers throw', async () => {
        const secret = new Error('provider-secret');
        const sink = otelLogSink({
            exceptionPolicy: () => {
                throw secret;
            },
            sanitizeAttribute: () => {
                throw secret;
            },
            sanitizeBody: () => {
                throw secret;
            }
        });
        await sink.emit([
            createLogEvent(
                LogLevel.Error,
                'provider-secret',
                {
                    Password: 'provider-secret'
                },
                secret
            )
        ]);
        const record = logExporter.getFinishedLogRecords()[0]!;
        expect(record.body).toBeUndefined();
        expect(record.attributes).toEqual({});
    });

    it('keeps originating context through queues, copies, batching and retry', async () => {
        const sink = otelLogSink();
        let attempts = 0;
        const batching = new BatchingSink({
            batchSize: 100,
            flushInterval: 60000,
            maxRetries: 1,
            retryDelay: 1,
            emit: async events => {
                if (attempts++ === 0) throw new Error('transient');
                await sink.emit(events);
            }
        });
        const logger = createLogger({
            sinks: [batching],
            enrichers: [
                traceEnricher(),
                ({ runInContext: _snapshot, ...event }) => event
            ]
        });
        const tracer = trace.getTracer('origins');
        const a = tracer.startSpan('A');
        const b = tracer.startSpan('B');
        const forSpan = (span: typeof a, tenant: string) =>
            propagation.setBaggage(
                trace.setSpan(ROOT_CONTEXT, span),
                propagation.createBaggage({
                    tenant: { value: tenant }
                })
            );
        const contextA = forSpan(a, 'A');
        const contextB = forSpan(b, 'B');
        context.with(contextA, () => logger.info('event', { Origin: 'A' }));
        context.with(contextB, () => logger.info('event', { Origin: 'B' }));
        a.end();
        b.end();
        context.with(contextA, () =>
            logger.info('event', { Origin: 'A-ended' })
        );
        context.with(ROOT_CONTEXT, () =>
            logger.info('event', {
                Origin: 'none',
                TraceId: a.spanContext().traceId,
                SpanId: a.spanContext().spanId,
                TraceFlags: 1
            })
        );
        const unsampled = {
            traceId: 'a'.repeat(32),
            spanId: 'b'.repeat(16),
            traceFlags: 0
        };
        context.with(trace.setSpanContext(ROOT_CONTEXT, unsampled), () =>
            logger.info('event', { Origin: 'unsampled' })
        );
        await context.with(contextB, () => logger.flush());
        const records = logExporter.getFinishedLogRecords();
        expect(records).toHaveLength(5);
        expect(attempts).toBe(2);
        const byOrigin = (origin: string) =>
            records.find(r => r.attributes.Origin === origin)!;
        for (const origin of ['A', 'A-ended']) {
            expect(byOrigin(origin).spanContext).toMatchObject(a.spanContext());
            expect(
                propagation
                    .getBaggage(emittedContexts.get(origin)!)
                    ?.getEntry('tenant')?.value
            ).toBe('A');
        }
        expect(byOrigin('B').spanContext).toMatchObject(b.spanContext());
        expect(byOrigin('none').spanContext).toBeUndefined();
        expect(byOrigin('unsampled').spanContext).toMatchObject(unsampled);
        expect(byOrigin('A').attributes.TraceId).toBe(a.spanContext().traceId);
        expect(byOrigin('B').attributes.TraceId).toBe(b.spanContext().traceId);
        await logger.dispose();
    });
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
        const sink = otelLogSink({ exceptionPolicy: 'raw' });
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
