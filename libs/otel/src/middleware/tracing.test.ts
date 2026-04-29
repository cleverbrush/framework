import { propagation, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OTEL_SPAN_ITEM_KEY, tracingMiddleware } from './tracing.js';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)]
});

beforeAll(() => {
    provider.register();
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
});

afterAll(async () => {
    await provider.shutdown();
});

beforeEach(() => exporter.reset());

function makeCtx(overrides: Partial<any> = {}): any {
    const items = new Map<string, unknown>();
    return {
        method: 'GET',
        url: new URL('http://localhost:3000/todos/42?token=secret'),
        headers: { 'user-agent': 'vitest' },
        items,
        response: { statusCode: 200 },
        ...overrides
    };
}

describe('tracingMiddleware', () => {
    it('creates a SERVER span with HTTP semconv attributes', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        await mw(ctx, async () => {
            ctx.response.statusCode = 201;
        });
        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(1);
        const span = spans[0]!;
        expect(span.kind).toBe(1); // SpanKind.SERVER
        expect(span.attributes['http.request.method']).toBe('GET');
        expect(span.attributes['url.path']).toBe('/todos/42');
        expect(span.attributes['url.scheme']).toBe('http');
        expect(span.attributes['server.address']).toBe('localhost');
        expect(span.attributes['user_agent.original']).toBe('vitest');
        expect(span.attributes['http.response.status_code']).toBe(201);
    });

    it('uses operationId as span name when present', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        ctx.items.set('__endpoint_meta', {
            method: 'GET',
            basePath: '',
            pathTemplate: '/todos/{id}',
            operationId: 'getTodoById',
            tags: ['todos']
        });
        await mw(ctx, async () => {});
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.name).toBe('getTodoById');
        expect(span.attributes['http.route']).toBe('/todos/{id}');
        expect(span.attributes['cleverbrush.endpoint.operationId']).toBe(
            'getTodoById'
        );
        expect(span.attributes['cleverbrush.endpoint.tags']).toBe('todos');
    });

    it('falls back to METHOD ROUTE name when no operationId', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx({ method: 'POST' });
        ctx.items.set('__endpoint_meta', {
            basePath: '/api',
            pathTemplate: '/things'
        });
        await mw(ctx, async () => {});
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.name).toBe('POST /api/things');
    });

    it('records exception and ERROR status on throw', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        await expect(
            mw(ctx, async () => {
                ctx.response.statusCode = 500;
                throw new Error('boom');
            })
        ).rejects.toThrow('boom');
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(2); // SpanStatusCode.ERROR
        expect(span.status.message).toBe('boom');
        expect(span.events.some(e => e.name === 'exception')).toBe(true);
        expect(span.attributes['http.response.status_code']).toBe(500);
    });

    it('marks 5xx responses as ERROR', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        await mw(ctx, async () => {
            ctx.response.statusCode = 503;
        });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(2);
    });

    it('honors excludePaths (no span emitted)', async () => {
        const mw = tracingMiddleware({ excludePaths: ['/health'] });
        const ctx = makeCtx({
            url: new URL('http://localhost/health')
        });
        await mw(ctx, async () => {});
        expect(exporter.getFinishedSpans()).toHaveLength(0);
    });

    it('extracts inbound traceparent and links span to remote parent', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx({
            headers: {
                traceparent:
                    '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
            }
        });
        await mw(ctx, async () => {});
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.spanContext().traceId).toBe(
            '0af7651916cd43dd8448eb211c80319c'
        );
        expect(span.parentSpanContext?.spanId).toBe('b7ad6b7169203331');
    });

    it('stashes the span at OTEL_SPAN_ITEM_KEY for downstream code', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        let stashed: unknown;
        await mw(ctx, async () => {
            stashed = ctx.items.get(OTEL_SPAN_ITEM_KEY);
        });
        expect(stashed).toBeDefined();
        expect((stashed as any).spanContext().traceId).toMatch(/^[0-9a-f]+$/);
    });

    it('does not record query string by default but does when recordQuery=true', async () => {
        const mw1 = tracingMiddleware();
        const ctx1 = makeCtx();
        await mw1(ctx1, async () => {});
        expect(
            exporter.getFinishedSpans()[0]!.attributes['url.query']
        ).toBeUndefined();

        exporter.reset();

        const mw2 = tracingMiddleware({ recordQuery: true });
        const ctx2 = makeCtx();
        await mw2(ctx2, async () => {});
        expect(exporter.getFinishedSpans()[0]!.attributes['url.query']).toBe(
            'token=secret'
        );
    });

    it('child spans started within next() are parented under the server span', async () => {
        const mw = tracingMiddleware();
        const ctx = makeCtx();
        const tracer = trace.getTracer('child');
        let childTraceId: string | undefined;
        let parentTraceId: string | undefined;
        await mw(ctx, async () => {
            const child = tracer.startSpan('inner');
            childTraceId = child.spanContext().traceId;
            parentTraceId = (
                ctx.items.get(OTEL_SPAN_ITEM_KEY) as any
            ).spanContext().traceId;
            child.end();
        });
        expect(childTraceId).toBe(parentTraceId);
    });

    it('enrichSpan hook is called with span and ctx', async () => {
        let calledSpan: unknown;
        const mw = tracingMiddleware({
            enrichSpan: span => {
                calledSpan = span;
                span.setAttribute('custom.attr', 'yes');
            }
        });
        const ctx = makeCtx();
        await mw(ctx, async () => {});
        expect(calledSpan).toBeDefined();
        expect(exporter.getFinishedSpans()[0]!.attributes['custom.attr']).toBe(
            'yes'
        );
    });

    it('swallows enrichSpan errors', async () => {
        const mw = tracingMiddleware({
            enrichSpan: () => {
                throw new Error('boom');
            }
        });
        const ctx = makeCtx();
        await expect(mw(ctx, async () => {})).resolves.toBeUndefined();
    });
});
