import { batching } from '@cleverbrush/client/batching';
import {
    propagation,
    SpanKind,
    SpanStatusCode,
    trace
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { clientTracingMiddleware } from './client.js';
import { tracingMiddleware } from './middleware/tracing.js';

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

function parseTraceparent(value: string): {
    traceId: string;
    spanId: string;
} {
    const parts = value.split('-');
    return {
        traceId: parts[1]!,
        spanId: parts[2]!
    };
}

function batchResponse(count: number): Response {
    return new Response(
        JSON.stringify({
            responses: Array.from({ length: count }, () => ({
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: '{}'
            }))
        }),
        {
            status: 200,
            headers: { 'content-type': 'application/json' }
        }
    );
}

describe('clientTracingMiddleware', () => {
    it('creates a CLIENT span and injects traceparent from that span', async () => {
        const mw = clientTracingMiddleware();
        let injectedTraceparent = '';
        const send = mw(async (_url, init) => {
            const headers = init.headers as Record<string, string>;
            injectedTraceparent = headers.traceparent;
            expect(headers.Accept).toBe('application/json');
            return new Response(null, { status: 200 });
        });

        const tracer = trace.getTracer('client-test');
        await tracer.startActiveSpan('service-a.request', async parent => {
            try {
                await send('http://service-b.local/api/todos', {
                    method: 'GET',
                    headers: { Accept: 'application/json' }
                });
            } finally {
                parent.end();
            }
        });

        const spans = exporter.getFinishedSpans();
        const parent = spans.find(s => s.name === 'service-a.request')!;
        const client = spans.find(s => s.kind === SpanKind.CLIENT)!;
        const traceparent = parseTraceparent(injectedTraceparent);

        expect(client.name).toBe('GET /api/todos');
        expect(client.parentSpanContext?.spanId).toBe(
            parent.spanContext().spanId
        );
        expect(traceparent.traceId).toBe(client.spanContext().traceId);
        expect(traceparent.spanId).toBe(client.spanContext().spanId);
    });

    it('lets downstream server middleware extract the client span as parent', async () => {
        let outboundHeaders: Record<string, string> = {};
        const clientSend = clientTracingMiddleware()(async (_url, init) => {
            outboundHeaders = init.headers as Record<string, string>;
            return new Response(null, { status: 204 });
        });

        const tracer = trace.getTracer('distributed-test');
        await tracer.startActiveSpan('service-a.request', async parent => {
            try {
                await clientSend('http://service-b.local/api/downstream', {
                    method: 'POST'
                });
            } finally {
                parent.end();
            }
        });

        const clientSpan = exporter
            .getFinishedSpans()
            .find(s => s.kind === SpanKind.CLIENT)!;
        const serverMw = tracingMiddleware();
        const ctx = {
            method: 'POST',
            url: new URL('http://service-b.local/api/downstream'),
            headers: outboundHeaders,
            items: new Map<string, unknown>(),
            response: {
                statusCode: 200,
                setHeader: vi.fn()
            }
        };

        await serverMw(ctx, async () => {});

        const serverSpan = exporter
            .getFinishedSpans()
            .find(s => s.kind === SpanKind.SERVER)!;

        expect(serverSpan.spanContext().traceId).toBe(
            clientSpan.spanContext().traceId
        );
        expect(serverSpan.parentSpanContext?.spanId).toBe(
            clientSpan.spanContext().spanId
        );
    });

    it('uses typed client endpoint metadata for span names and attributes', async () => {
        const send = clientTracingMiddleware()(async () => {
            return new Response(null, { status: 201 });
        });

        await send('http://service-b.local/api/todos', {
            method: 'POST',
            headers: {},
            __endpointMeta: {
                group: 'todos',
                endpoint: 'create',
                path: '/api/todos',
                operationId: 'createTodo',
                tags: ['todos']
            }
        } as RequestInit);

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.name).toBe('createTodo');
        expect(span.attributes['http.route']).toBe('/api/todos');
        expect(span.attributes['cleverbrush.client.group']).toBe('todos');
        expect(span.attributes['cleverbrush.client.endpoint']).toBe('create');
        expect(span.attributes['cleverbrush.endpoint.operationId']).toBe(
            'createTodo'
        );
        expect(span.attributes['cleverbrush.endpoint.tags']).toBe('todos');
    });

    it('marks HTTP error responses as failed client spans', async () => {
        const send = clientTracingMiddleware()(async () => {
            return new Response(null, { status: 503 });
        });

        await send('http://service-b.local/api/todos', { method: 'GET' });

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(SpanStatusCode.ERROR);
        expect(span.attributes['http.response.status_code']).toBe(503);
    });

    it('records thrown fetch errors on the client span', async () => {
        const send = clientTracingMiddleware()(async () => {
            throw new TypeError('fetch failed');
        });

        await expect(
            send('http://service-b.local/api/todos', { method: 'GET' })
        ).rejects.toThrow('fetch failed');

        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(SpanStatusCode.ERROR);
        expect(span.events.some(e => e.name === 'exception')).toBe(true);
    });

    it('preserves logical subrequest trace headers when wrapping batching', async () => {
        const fetch = vi.fn().mockResolvedValue(batchResponse(2));
        const send = clientTracingMiddleware()(
            batching({ windowMs: 1 })(fetch)
        );

        await Promise.all([
            send('http://service-b.local/api/a', { method: 'GET' }),
            send('http://service-b.local/api/b', { method: 'GET' })
        ]);

        expect(fetch).toHaveBeenCalledOnce();
        const init = fetch.mock.calls[0]![1] as RequestInit;
        const body = JSON.parse(String(init.body)) as {
            requests: Array<{ headers: Record<string, string> }>;
        };

        const firstTraceparent = body.requests[0]!.headers.traceparent;
        const secondTraceparent = body.requests[1]!.headers.traceparent;

        expect(firstTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-/);
        expect(secondTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-/);
        expect(firstTraceparent).not.toBe(secondTraceparent);
    });
});
