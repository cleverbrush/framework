import {
    context,
    propagation,
    type Span,
    SpanKind,
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

function getEndpointMeta(ctx: any): any | undefined {
    const items: Map<string, unknown> | undefined = ctx?.items;
    return items?.get('__endpoint_meta');
}

function getRouteTemplate(meta: any): string | undefined {
    if (!meta) return undefined;
    const base: string = meta.basePath ?? '';
    const tpl = meta.pathTemplate;
    if (typeof tpl === 'string') return `${base}${tpl}`;
    // ParseStringSchemaBuilder — try its `template` getter, otherwise toString
    const candidate =
        tpl?.template ?? tpl?.pattern ?? tpl?.toString?.() ?? null;
    if (typeof candidate === 'string') return `${base}${candidate}`;
    return base || undefined;
}

/**
 * Creates a `@cleverbrush/server` middleware that opens an OpenTelemetry
 * `SERVER` span for every incoming request.
 *
 * Should be registered as the **first** middleware so that the span
 * wraps CORS, auth, request logging, and the handler — capturing the
 * full request lifetime.
 *
 * Behavior:
 * - Extracts inbound trace context from request headers
 *   (W3C `traceparent`, `baggage`).
 * - Names the span `${operationId}` if available, otherwise
 *   `${method} ${http.route}`, otherwise `${method} ${url.path}`.
 * - Sets HTTP semantic-convention attributes
 *   (`http.request.method`, `url.path`, `url.scheme`,
 *   `server.address`, `user_agent.original`, `http.route`).
 * - Records `http.response.status_code` after `next()` completes.
 * - Marks the span `ERROR` and records the exception on uncaught errors.
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
 *     .use(tracingMiddleware({ excludePaths: ['/health'] }))
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
        const parentCtx = propagation.extract(context.active(), headers);

        const meta = getEndpointMeta(ctx);
        const route = getRouteTemplate(meta);
        const method: string = (ctx.method ?? 'GET').toUpperCase();
        // Span name follows OTel HTTP semconv (low-cardinality, descending priority):
        //   1. operationId       — e.g. "getTodoById"
        //   2. METHOD ROUTE      — e.g. "GET /todos/{id}"
        //   3. METHOD pathname   — fallback when no route template is available
        const spanName: string =
            meta?.operationId ||
            (route ? `${method} ${route}` : `${method} ${pathname}`);

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

        await tracer.startActiveSpan(
            spanName,
            { kind: SpanKind.SERVER, attributes },
            parentCtx,
            async (span: Span) => {
                ctx.items?.set?.(OTEL_SPAN_ITEM_KEY, span);

                // Write the trace ID to the response so consumers can look
                // up the exact trace in SigNoz / Jaeger / any backend.
                if (responseTraceHeader) {
                    const { traceId } = span.spanContext();
                    if (traceId) {
                        const res = ctx.response;
                        if (res?.setHeader) {
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
                    const status: number =
                        ctx.response?.statusCode ?? ctx.statusCode ?? 200;
                    span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, status);
                    if (status >= 500) {
                        span.setStatus({ code: SpanStatusCode.ERROR });
                    } else {
                        span.setStatus({ code: SpanStatusCode.OK });
                    }
                } catch (err) {
                    const status: number =
                        ctx.response?.statusCode ?? ctx.statusCode ?? 500;
                    span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, status);
                    if (err instanceof Error) {
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message
                        });
                    } else {
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: String(err)
                        });
                    }
                    throw err;
                } finally {
                    span.end();
                }
            }
        );
    };
}
