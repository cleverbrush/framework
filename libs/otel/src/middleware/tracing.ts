import type { ResponseCompletion } from '@cleverbrush/server';
import {
    context,
    propagation,
    type Span,
    type SpanContext,
    SpanKind,
    type SpanOptions,
    SpanStatusCode,
    type Tracer,
    trace
} from '@opentelemetry/api';
import {
    ATTR_HTTP_REQUEST_METHOD,
    ATTR_HTTP_RESPONSE_STATUS_CODE,
    ATTR_HTTP_ROUTE,
    ATTR_SERVER_ADDRESS,
    ATTR_SERVER_PORT,
    ATTR_URL_PATH,
    ATTR_URL_QUERY,
    ATTR_URL_SCHEME,
    ATTR_USER_AGENT_ORIGINAL
} from '@opentelemetry/semantic-conventions';
import {
    type ExceptionPolicy,
    recordSpanException
} from '../exceptionPolicy.js';

/**
 * Attribute key under which the OTel server span is stashed on the
 * per-request `RequestContext.items` map.
 *
 * Downstream middleware/handlers can read this with
 * `ctx.items.get(OTEL_SPAN_ITEM_KEY)` to attach custom attributes
 * or events to the active server span.
 */
export const OTEL_SPAN_ITEM_KEY = 'otel.span';

/**
 * Configuration for {@link tracingMiddleware}.
 */
export interface TracingMiddlewareOptions {
    /** Automatic exception details. @default 'omit' */
    exceptionPolicy?: ExceptionPolicy;
    /**
     * Tracer name used when resolving the OTel tracer.
     *
     * @default '@cleverbrush/otel'
     */
    tracerName?: string;

    /** Tracer version. */
    tracerVersion?: string;

    /**
     * Paths to exclude from tracing entirely (no span created).
     *
     * Accepts plain strings or objects with a `path` property
     * (e.g. an `EndpointBuilder`). Useful for `/health` and other
     * high-frequency, low-value endpoints.
     */
    excludePaths?: (string | { readonly path: string })[];

    /**
     * Hook for adding custom attributes to the server span just before
     * the inner pipeline runs. Errors thrown here are swallowed.
     */
    enrichSpan?: (span: Span, ctx: any) => void;

    /**
     * Whether to record the URL query string as `url.query`.
     *
     * Disabled by default because query strings frequently contain PII
     * (search terms, tokens). Enable explicitly only when you have
     * verified your URLs are safe to record.
     *
     * @default false
     */
    recordQuery?: boolean;

    /**
     * Name of the response header that carries the W3C trace ID for the
     * current request span.
     *
     * Expose this so API consumers can include it in bug reports and you
     * can look up the exact trace in SigNoz / Jaeger / etc.
     *
     * Set to `false` to disable the header entirely.
     *
     * @default 'X-Trace-Id'
     */
    responseTraceHeader?: string | false;
}

interface BatchSubrequestMeta {
    index: number;
    size: number;
    path: string;
}

function getBatchSubrequestMeta(ctx: any): BatchSubrequestMeta | undefined {
    const items: Map<string, unknown> | undefined = ctx?.items;
    const meta = items?.get('__batch_subrequest') as
        | Partial<BatchSubrequestMeta>
        | undefined;
    if (
        typeof meta?.index !== 'number' ||
        typeof meta.size !== 'number' ||
        typeof meta.path !== 'string'
    ) {
        return undefined;
    }
    return {
        index: meta.index,
        size: meta.size,
        path: meta.path
    };
}

function hasValidTraceparent(headers: Record<string, string>): boolean {
    return /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i.test(
        headers.traceparent ?? ''
    );
}

/**
 * Creates a `@cleverbrush/server` middleware that opens an OpenTelemetry
 * `SERVER` span for every incoming request.
 *
 * Register first with `useRequest()` so that the span
 * wraps CORS, auth, request logging, and the handler — capturing the
 * full request lifetime.
 *
 * Behavior:
 * - Extracts inbound trace context from request headers
 *   (W3C `traceparent`, `baggage`).
 * - Names the span `${operationId}` if available, otherwise
 *   `${method} ${http.route}`, otherwise `${method}`.
 * - Sets HTTP semantic-convention attributes
 *   (`http.request.method`, `url.path`, `url.scheme`,
 *   `server.address`, `user_agent.original`, `http.route`).
 * - Records final HTTP status and ends once on response finish/close.
 * - Marks server failures, timeouts and interruptions as ERROR. Exception
 *   details are omitted unless an explicit policy allows them.
 * - Stashes the span at `ctx.items.get(OTEL_SPAN_ITEM_KEY)` for
 *   downstream code to enrich.
 *
 * @param options - tracing configuration
 * @returns a `Middleware` compatible with `@cleverbrush/server`
 *
 * @example
 * ```ts
 * import { tracingMiddleware } from '@cleverbrush/otel';
 *
 * createServer()
 *     .useRequest(tracingMiddleware({ excludePaths: ['/health'] }))
 *     .use(corsMiddleware)
 *     .use(authMiddleware)
 *     .listen(3000);
 * ```
 */
export function tracingMiddleware(options?: TracingMiddlewareOptions) {
    const tracerName = options?.tracerName ?? '@cleverbrush/otel';
    const tracerVersion = options?.tracerVersion;
    const excludePaths = new Set(
        (options?.excludePaths ?? []).map(p =>
            typeof p === 'string' ? p : p.path
        )
    );
    const enrichSpan = options?.enrichSpan;
    const recordQuery = options?.recordQuery ?? false;
    const responseTraceHeader =
        options?.responseTraceHeader === false
            ? false
            : (options?.responseTraceHeader ?? 'X-Trace-Id');

    let cachedTracer: Tracer | undefined;
    const getTracer = (): Tracer => {
        if (!cachedTracer) {
            cachedTracer = trace.getTracer(tracerName, tracerVersion);
        }
        return cachedTracer;
    };

    return async (ctx: any, next: () => Promise<void>): Promise<void> => {
        const url: URL | undefined = ctx.url;
        const pathname = url?.pathname ?? ctx.path ?? '';

        if (excludePaths.has(pathname)) {
            await next();
            return;
        }

        const tracer = getTracer();
        const headers: Record<string, string> = ctx.headers ?? {};

        // Extract inbound trace context (W3C traceparent + baggage).
        const extractedCtx = propagation.extract(context.active(), headers);
        const batchSubrequest = getBatchSubrequestMeta(ctx);
        const parentCtx = batchSubrequest ? context.active() : extractedCtx;
        const linkedSpanContext: SpanContext | undefined =
            batchSubrequest && hasValidTraceparent(headers)
                ? trace.getSpanContext(extractedCtx)
                : undefined;

        const meta = ctx.route;
        const route = meta?.pathTemplate;
        const method: string = (ctx.method ?? 'GET').toUpperCase();
        // Span name follows OTel HTTP semconv (low-cardinality, descending priority):
        //   1. operationId       — e.g. "getTodoById"
        //   2. METHOD ROUTE      — e.g. "GET /todos/{id}"
        //   3. METHOD            — no route has been matched yet
        const spanName: string =
            meta?.operationId || (route ? `${method} ${route}` : method);

        const attributes: Record<string, string | number> = {
            [ATTR_HTTP_REQUEST_METHOD]: method,
            [ATTR_URL_PATH]: pathname
        };
        if (url?.protocol) {
            attributes[ATTR_URL_SCHEME] = url.protocol.replace(/:$/, '');
        }
        if (url?.hostname) {
            attributes[ATTR_SERVER_ADDRESS] = url.hostname;
        }
        if (url?.port) {
            const port = Number(url.port);
            if (Number.isFinite(port)) attributes[ATTR_SERVER_PORT] = port;
        }
        if (route) attributes[ATTR_HTTP_ROUTE] = route;
        if (headers['user-agent']) {
            attributes[ATTR_USER_AGENT_ORIGINAL] = headers['user-agent'];
        }
        if (recordQuery && url?.search) {
            attributes[ATTR_URL_QUERY] = url.search.replace(/^\?/, '');
        }
        if (meta?.tags?.length) {
            attributes['cleverbrush.endpoint.tags'] = meta.tags.join(',');
        }
        if (meta?.operationId) {
            attributes['cleverbrush.endpoint.operationId'] = meta.operationId;
        }
        if (batchSubrequest) {
            attributes['cleverbrush.batch.index'] = batchSubrequest.index;
            attributes['cleverbrush.batch.size'] = batchSubrequest.size;
            attributes['cleverbrush.batch.path'] = batchSubrequest.path;
        }

        const spanOptions: SpanOptions = {
            kind: SpanKind.SERVER,
            attributes,
            ...(linkedSpanContext
                ? { links: [{ context: linkedSpanContext }] }
                : {})
        };

        await tracer.startActiveSpan(
            spanName,
            spanOptions,
            parentCtx,
            async (span: Span) => {
                ctx.items?.set?.(OTEL_SPAN_ITEM_KEY, span);
                const started = performance.now();
                let completed = false;
                const complete = (result: ResponseCompletion) => {
                    if (completed) return;
                    completed = true;
                    const route = ctx.route;
                    if (route) {
                        span.updateName(
                            route.operationId ||
                                `${method} ${route.pathTemplate}`
                        );
                        span.setAttribute(ATTR_HTTP_ROUTE, route.pathTemplate);
                        if (route.operationId)
                            span.setAttribute(
                                'cleverbrush.endpoint.operationId',
                                route.operationId
                            );
                        if (route.tags?.length)
                            span.setAttribute(
                                'cleverbrush.endpoint.tags',
                                route.tags.join(',')
                            );
                    }
                    if (result.statusCode !== undefined)
                        span.setAttribute(
                            ATTR_HTTP_RESPONSE_STATUS_CODE,
                            result.statusCode
                        );
                    span.setAttribute(
                        'cleverbrush.http.outcome',
                        result.outcome
                    );
                    if (
                        result.outcome === 'failure' ||
                        result.outcome === 'timeout' ||
                        result.outcome === 'interrupted'
                    ) {
                        if ('error' in result)
                            recordSpanException(
                                span,
                                result.error,
                                options?.exceptionPolicy
                            );
                        else span.setStatus({ code: SpanStatusCode.ERROR });
                    }
                    span.end();
                };
                const observesResponse =
                    typeof ctx.onResponseCompleted === 'function';
                if (observesResponse)
                    ctx.onResponseCompleted(
                        context.bind(context.active(), complete)
                    );

                // Write the trace ID to the response so consumers can look
                // up the exact trace in SigNoz / Jaeger / any backend.
                if (responseTraceHeader) {
                    const { traceId } = span.spanContext();
                    if (traceId) {
                        const res = ctx.response;
                        if (res?.setHeader && !res.headersSent) {
                            res.setHeader(responseTraceHeader, traceId);
                        } else if (ctx.setHeader) {
                            ctx.setHeader(responseTraceHeader, traceId);
                        }
                    }
                }

                if (enrichSpan) {
                    try {
                        enrichSpan(span, ctx);
                    } catch {
                        // ignore enrichment errors
                    }
                }

                try {
                    await next();
                } catch (err) {
                    if (!observesResponse)
                        complete({
                            statusCode:
                                ctx.response?.statusCode >= 400
                                    ? ctx.response.statusCode
                                    : 500,
                            elapsedMs: performance.now() - started,
                            outcome: 'failure',
                            error: err
                        });
                    throw err;
                } finally {
                    // Structural/legacy contexts lack response completion.
                    // Current RequestContext always takes the lifecycle path.
                    if (!observesResponse && !completed) {
                        const statusCode =
                            ctx.response?.statusCode ?? ctx.statusCode ?? 200;
                        complete({
                            statusCode,
                            elapsedMs: performance.now() - started,
                            outcome:
                                statusCode >= 500
                                    ? 'failure'
                                    : statusCode >= 400
                                      ? 'rejected'
                                      : 'success'
                        });
                    }
                }
            }
        );
    };
}
