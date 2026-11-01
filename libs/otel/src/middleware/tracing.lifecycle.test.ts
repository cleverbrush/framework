import { PassThrough } from 'node:stream';
import {
    createLogger,
    type LogEvent,
    requestLoggingMiddleware
} from '@cleverbrush/log';
import { number, object } from '@cleverbrush/schema';
import { SpanStatusCode } from '@opentelemetry/api';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import {
    ActionResult,
    StatusCodeResult
} from '../../../server/src/ActionResult.js';
import { endpoint } from '../../../server/src/Endpoint.js';
import type { RequestContext } from '../../../server/src/RequestContext.js';
import { route } from '../../../server/src/route.js';
import { createServer, type Server } from '../../../server/src/Server.js';
import { withRequestSignal } from '../../../server/src/withRequestSignal.js';
import { tracingMiddleware } from './tracing.js';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)]
});
const events: LogEvent[] = [];
const logger = createLogger({
    sinks: [
        {
            async emit(batch) {
                events.push(...batch);
            },
            async [Symbol.asyncDispose]() {}
        }
    ]
});
let server: Server | undefined;
const builder = () =>
    createServer()
        .useRequest(tracingMiddleware())
        .useRequest(requestLoggingMiddleware(logger));
const base = () => `http://127.0.0.1:${server!.address!.port}`;
const observe = async (outcome: string, statusCode?: number) => {
    await vi.waitFor(() => expect(exporter.getFinishedSpans()).toHaveLength(1));
    await logger.flush();
    expect(events).toHaveLength(1);
    const span = exporter.getFinishedSpans()[0]!;
    expect(span.attributes['cleverbrush.http.outcome']).toBe(outcome);
    expect(span.attributes['http.response.status_code']).toBe(statusCode);
    expect(events[0]!.properties.Outcome).toBe(outcome);
    expect(events[0]!.properties.StatusCode).toBe(statusCode);
    return span;
};

beforeAll(() => provider.register());
beforeEach(() => {
    exporter.reset();
    events.length = 0;
});
afterEach(async () => {
    await server?.close();
    server = undefined;
    vi.restoreAllMocks();
});
afterAll(async () => {
    await logger.dispose();
    await provider.shutdown();
});

describe('final HTTP tracing and logging', () => {
    it.each([200, 302, 400, 500])('uses on-wire status %s', async status => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server = await builder()
            .handle(endpoint.get('/result'), () => {
                if (status === 500)
                    throw new Error(
                        'SELECT password; https://private.local; bound-secret'
                    );
                if (status === 302) return ActionResult.redirect('/other');
                return new StatusCodeResult(status);
            })
            .listen(0, '127.0.0.1');
        const response = await fetch(`${base()}/result`, {
            redirect: 'manual'
        });
        await response.text();
        expect(response.status).toBe(status);
        const span = await observe(
            status >= 500 ? 'failure' : status >= 400 ? 'rejected' : 'success',
            status
        );
        expect(span.status.code).toBe(
            status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.UNSET
        );
        expect(response.headers.get('x-trace-id')).toBe(
            span.spanContext().traceId
        );
        expect(span.events).toHaveLength(0);
        expect(
            JSON.stringify({
                status: span.status,
                attributes: span.attributes,
                events: span.events,
                logs: events
            })
        ).not.toContain('bound-secret');
        expect(
            JSON.stringify(vi.mocked(console.error).mock.calls)
        ).not.toContain('bound-secret');
    });

    it('observes authentication rejections before ordinary middleware', async () => {
        const ordinary = vi.fn(async (_ctx, next) => next());
        server = await builder()
            .use(ordinary)
            .useAuthorization()
            .handle(endpoint.get('/private').authorize(), () => ({ ok: true }))
            .listen(0, '127.0.0.1');
        const response = await fetch(`${base()}/private`);
        await response.text();
        expect(response.status).toBe(401);
        expect(ordinary).not.toHaveBeenCalled();
        const span = await observe('rejected', 401);
        expect(span.status.code).toBe(SpanStatusCode.UNSET);
        expect(span.attributes['http.route']).toBe('/private');
    });

    it('observes schema validation failures without marking a server failure', async () => {
        server = await builder()
            .handle(
                endpoint.get('/validate').query(
                    object({
                        count: number().coerce()
                    })
                ),
                () => ({ ok: true })
            )
            .listen(0, '127.0.0.1');
        const response = await fetch(`${base()}/validate?count=invalid`);
        await response.text();
        expect(response.status).toBe(400);
        expect((await observe('rejected', 400)).status.code).toBe(
            SpanStatusCode.UNSET
        );
    });

    it.each(['missing', 'cors', 'preflight'] as const)(
        'includes %s responses in early observation',
        async kind => {
            server = await builder()
                .useCors({ origin: 'https://allowed.local' })
                .handle(endpoint.get('/ok'), () => ({ ok: true }))
                .listen(0, '127.0.0.1');
            const response = await fetch(
                `${base()}/${kind === 'missing' ? 'missing' : 'ok'}`,
                {
                    method: kind === 'preflight' ? 'OPTIONS' : 'GET',
                    headers:
                        kind === 'missing'
                            ? {}
                            : kind === 'cors'
                              ? { origin: 'https://denied.local' }
                              : {
                                    origin: 'https://allowed.local',
                                    'access-control-request-method': 'GET'
                                }
                }
            );
            await response.text();
            const status =
                kind === 'missing' ? 404 : kind === 'cors' ? 403 : 204;
            expect(response.status).toBe(status);
            await observe(status < 400 ? 'success' : 'rejected', status);
        }
    );

    it('publishes an immutable route template after routing', async () => {
        let context: RequestContext | undefined;
        server = await builder()
            .useRequest(async (ctx, next) => {
                context = ctx;
                expect(ctx.route).toBeUndefined();
                await next();
            })
            .handle(
                endpoint
                    .get(
                        '/items',
                        route({ id: number().coerce() })`/${t => t.id}`
                    )
                    .operationId('getItem')
                    .tags('items'),
                () => ({ ok: true })
            )
            .listen(0, '127.0.0.1');
        const response = await fetch(`${base()}/items/42`);
        await response.text();
        const span = await observe('success', 200);
        expect(context!.route).toEqual({
            pathTemplate: '/items/{id}',
            operationId: 'getItem',
            tags: ['items']
        });
        expect(Object.isFrozen(context!.route)).toBe(true);
        expect(Object.isFrozen(context!.route!.tags)).toBe(true);
        expect(span.name).toBe('getItem');
        expect(span.attributes['http.route']).toBe('/items/{id}');
    });

    it('waits beyond middleware return for a raw asynchronous response', async () => {
        let finish: (() => void) | undefined;
        server = await builder()
            .handle(endpoint.get('/raw'), () =>
                ActionResult.raw((_req, res) => {
                    res.writeHead(200);
                    res.write('first');
                    finish = () => res.end('last');
                })
            )
            .listen(0, '127.0.0.1');
        const response = await fetch(`${base()}/raw`);
        expect(exporter.getFinishedSpans()).toHaveLength(0);
        expect(events).toHaveLength(0);
        finish!();
        expect(await response.text()).toBe('firstlast');
        await observe('success', 200);
    });

    it.each(['finish', 'failure', 'disconnect'] as const)(
        'handles stream %s exactly once',
        async terminal => {
            const stream = new PassThrough();
            server = await builder()
                .handle(endpoint.get('/stream'), () =>
                    ActionResult.stream(stream, 'text/plain')
                )
                .listen(0, '127.0.0.1');
            const abort = new AbortController();
            const request = fetch(`${base()}/stream`, { signal: abort.signal });
            stream.write('first');
            const response = await request;
            expect(exporter.getFinishedSpans()).toHaveLength(0);
            if (terminal === 'finish') {
                stream.end('last');
                expect(await response.text()).toBe('firstlast');
            } else {
                const read = expect(response.text()).rejects.toBeDefined();
                if (terminal === 'failure')
                    stream.destroy(
                        new Error(
                            'SELECT password; bound-secret; https://private.local'
                        )
                    );
                else abort.abort();
                await read;
            }
            const span = await observe(
                terminal === 'finish'
                    ? 'success'
                    : terminal === 'failure'
                      ? 'failure'
                      : 'interrupted',
                200
            );
            expect(span.status.code).toBe(
                terminal === 'finish'
                    ? SpanStatusCode.UNSET
                    : SpanStatusCode.ERROR
            );
            expect(span.events).toHaveLength(0);
            expect(stream.destroyed).toBe(true);
            expect(JSON.stringify(events)).not.toContain('bound-secret');
        }
    );

    it('does not report the default 200 when a client closes before headers', async () => {
        const entered = Promise.withResolvers<void>();
        server = await builder()
            .handle(endpoint.get('/pending'), () =>
                ActionResult.raw(async (_req, res) => {
                    entered.resolve();
                    await new Promise<void>(resolve =>
                        res.once('close', resolve)
                    );
                })
            )
            .listen(0, '127.0.0.1');
        const abort = new AbortController();
        const request = expect(
            fetch(`${base()}/pending`, { signal: abort.signal })
        ).rejects.toBeDefined();
        await entered.promise;
        abort.abort();
        await request;
        await observe('interrupted');
    });

    it.each(['timeout', 'cancelled', 'recovered'] as const)(
        'reports explicit %s semantics',
        async cause => {
            const caller = new AbortController();
            server = await builder()
                .handle(endpoint.get('/work'), async ({ context }) => {
                    try {
                        await withRequestSignal(
                            context,
                            signal =>
                                new Promise<never>((_, reject) => {
                                    signal.addEventListener(
                                        'abort',
                                        () => reject(signal.reason),
                                        { once: true }
                                    );
                                    if (cause === 'cancelled')
                                        caller.abort(
                                            new Error(
                                                'private cancellation reason'
                                            )
                                        );
                                }),
                            {
                                timeoutMs: cause === 'cancelled' ? 1000 : 5,
                                signal: caller.signal
                            }
                        );
                    } catch {
                        return new StatusCodeResult(
                            cause === 'recovered'
                                ? 200
                                : cause === 'timeout'
                                  ? 504
                                  : 503
                        );
                    }
                    return new StatusCodeResult(200);
                })
                .listen(0, '127.0.0.1');
            const response = await fetch(`${base()}/work`);
            await response.text();
            const span = await observe(
                cause === 'recovered' ? 'success' : cause,
                cause === 'recovered' ? 200 : cause === 'timeout' ? 504 : 503
            );
            expect(span.status.code).toBe(
                cause === 'timeout'
                    ? SpanStatusCode.ERROR
                    : SpanStatusCode.UNSET
            );
        }
    );
});
