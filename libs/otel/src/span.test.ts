import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ExceptionPolicy } from './exceptionPolicy.js';
import { withSpan } from './span.js';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)]
});

beforeAll(() => provider.register());
afterAll(async () => provider.shutdown());
beforeEach(() => exporter.reset());

// ── Callback form ─────────────────────────────────────────────────────────────

describe('withSpan — callback form', () => {
    it.each([
        new Error('SELECT password; token; https://private.local'),
        'SELECT password; token; https://private.local',
        { credential: 'token' },
        undefined
    ])(
        'preserves thrown values through sync and async failure',
        async error => {
            let caught: unknown = Symbol();
            try {
                withSpan('sync.secret', () => {
                    throw error;
                });
            } catch (original) {
                caught = original;
            }
            expect(caught).toBe(error);
            await expect(
                withSpan('async.secret', async () => {
                    throw error;
                })
            ).rejects.toBe(error);
            for (const span of exporter.getFinishedSpans()) {
                expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
                expect(span.events).toHaveLength(0);
            }
        }
    );

    it.each<ExceptionPolicy>([
        () => ({ name: 'SafeFailure', message: 'Unavailable' }),
        () => {
            throw new Error('sanitizer secret');
        },
        'raw'
    ])(
        'applies explicit policies without changing original failures',
        async policy => {
            const error = new Error('provider secret');
            await expect(
                withSpan(
                    'policy',
                    async () => {
                        throw error;
                    },
                    {
                        exceptionPolicy: policy
                    }
                )
            ).rejects.toBe(error);
            const span = exporter.getFinishedSpans()[0]!;
            expect(span.status.message).toBeUndefined();
            if (policy === 'raw') {
                expect(span.events[0]?.attributes?.['exception.message']).toBe(
                    error.message
                );
            } else {
                expect(JSON.stringify(span.events)).not.toContain('secret');
            }
        }
    );
    it('ends the span after a sync fn completes', () => {
        withSpan('sync.op', () => 42);

        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(1);
        expect(spans[0]!.name).toBe('sync.op');
        expect(spans[0]!.status.code).toBe(SpanStatusCode.UNSET);
    });

    it('returns the value from a sync fn', () => {
        const result = withSpan('sync.op', () => 'hello');
        expect(result).toBe('hello');
    });

    it('ends the span after an async fn resolves', async () => {
        await withSpan('async.op', async () => 'done');

        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(1);
        expect(spans[0]!.name).toBe('async.op');
        expect(spans[0]!.status.code).toBe(SpanStatusCode.UNSET);
    });

    it('returns the resolved value from an async fn', async () => {
        const result = await withSpan('async.op', async () => 99);
        expect(result).toBe(99);
    });

    it('omits exception details and sets ERROR on sync throw', () => {
        const err = new Error('sync boom');

        expect(() =>
            withSpan('sync.err', () => {
                throw err;
            })
        ).toThrow('sync boom');

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(SpanStatusCode.ERROR);
        expect(span.events).toHaveLength(0);
    });

    it('omits exception details and sets ERROR on async rejection', async () => {
        const err = new Error('async boom');

        await expect(
            withSpan('async.err', async () => {
                throw err;
            })
        ).rejects.toThrow('async boom');

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(SpanStatusCode.ERROR);
        expect(span.events).toHaveLength(0);
    });

    it('applies initial attributes from options', () => {
        withSpan('attrs.op', () => {}, {
            attributes: { 'custom.key': 'val', 'custom.num': 7 }
        });

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.attributes['custom.key']).toBe('val');
        expect(span.attributes['custom.num']).toBe(7);
    });

    it('passes the Span instance to fn', () => {
        let received: unknown;
        withSpan('span.arg', span => {
            received = span;
        });
        expect(received).toBeDefined();
    });

    it('uses SpanKind.INTERNAL by default', () => {
        withSpan('kind.op', () => {});
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.kind).toBe(SpanKind.INTERNAL);
    });

    it('respects a custom SpanKind', () => {
        withSpan('producer.op', () => {}, { kind: SpanKind.PRODUCER });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.kind).toBe(SpanKind.PRODUCER);
    });

    it('activates the span in context so child spans nest under it', () => {
        withSpan('parent.op', () => {
            const childTracer = trace.getTracer('@cleverbrush/otel');
            const child = childTracer.startSpan('child.op');
            child.end();
        });

        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(2);
        const parent = spans.find(s => s.name === 'parent.op')!;
        const child = spans.find(s => s.name === 'child.op')!;
        expect(child.parentSpanContext?.spanId).toBe(
            parent.spanContext().spanId
        );
    });
});

// ── Disposable form ───────────────────────────────────────────────────────────

describe('withSpan — disposable form', () => {
    it('ends the span when the await using block exits', async () => {
        {
            await using _handle = withSpan('disposable.op');
        }

        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(1);
        expect(spans[0]!.name).toBe('disposable.op');
        expect(spans[0]!.status.code).toBe(SpanStatusCode.UNSET);
    });

    it('exposes the underlying span via handle.span', async () => {
        await using handle = withSpan('disposable.span');
        expect(handle.span).toBeDefined();
        handle.span.setAttribute('foo', 'bar');
    });

    it('sets attributes from options on the span', async () => {
        {
            await using _handle = withSpan('disposable.attrs', {
                attributes: { 'custom.key': 'value' }
            });
        }

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.attributes['custom.key']).toBe('value');
    });

    it('omits exception details and sets ERROR when fail() is called', async () => {
        const err = new Error('oops');
        {
            await using handle = withSpan('disposable.fail');
            handle.fail(err);
        }

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(SpanStatusCode.ERROR);
        expect(span.events).toHaveLength(0);
    });

    it('fail() is idempotent — calling twice does not double-record', async () => {
        const err = new Error('double');
        {
            await using handle = withSpan('disposable.idempotent', {
                exceptionPolicy: 'raw'
            });
            handle.fail(err);
            handle.fail(err);
        }

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.events).toHaveLength(1);
    });

    it('uses SpanKind.INTERNAL by default', async () => {
        {
            await using _handle = withSpan('disposable.kind');
        }
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.kind).toBe(SpanKind.INTERNAL);
    });
});
