import {
    context,
    propagation,
    type Span,
    type SpanAttributes,
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
    ATTR_URL_FULL,
    ATTR_URL_PATH,
    ATTR_URL_SCHEME
} from '@opentelemetry/semantic-conventions';

/**
 * A function with the same shape as `fetch`.
 *
 * Kept local instead of importing from `@cleverbrush/client` so this
 * entrypoint remains structurally compatible without a runtime dependency.
 */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Middleware shape accepted by `@cleverbrush/client`.
 */
export type ClientMiddleware = (next: FetchLike) => FetchLike;

/**
 * Endpoint metadata attached to `RequestInit` by `@cleverbrush/client`.
 *
 * This is intentionally structural and partial so the OTel package can read
 * metadata when present without coupling to client internals at runtime.
 */
export interface ClientTracingEndpointMeta {
    group?: string;
    endpoint?: string;
    method?: string;
    path?: string;
    collectionPath?: string;
    operationId?: string | null;
    tags?: readonly string[];
}

/**
 * Information passed to the `enrichSpan` hook.
 */
export interface ClientTracingInfo {
    url: string;
    method: string;
    headers: Record<string, string>;
    endpoint?: ClientTracingEndpointMeta;
}

/**
 * Configuration for {@link clientTracingMiddleware}.
 */
export interface ClientTracingMiddlewareOptions {
    /**
     * Tracer name used when resolving the OTel tracer.
     *
     * @default '@cleverbrush/otel'
     */
    tracerName?: string;

    /** Tracer version. */
    tracerVersion?: string;

    /**
     * Predicate for skipping tracing on selected outbound requests.
     */
    skip?: (url: string, init: RequestInit) => boolean;

    /**
     * Hook for adding custom attributes/events before the request is sent.
     * Errors thrown here are swallowed.
     */
    enrichSpan?: (span: Span, info: ClientTracingInfo) => void;

    /**
     * Whether to record `url.full`.
     *
     * Disabled by default because full URLs can include query strings with
     * sensitive values.
     *
     * @default false
     */
    recordUrlFull?: boolean;
}

const DEFAULT_TRACER_NAME = '@cleverbrush/otel';

function flattenHeaders(
    headers: RequestInit['headers'] | undefined
): Record<string, string> {
    if (!headers) return {};

    if (headers instanceof Headers) {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    if (Array.isArray(headers)) {
        const result: Record<string, string> = {};
        for (const [key, value] of headers) {
            result[key] = value;
        }
        return result;
    }

    return { ...headers } as Record<string, string>;
}

function getEndpointMeta(
    init: RequestInit
): ClientTracingEndpointMeta | undefined {
    return (init as any).__endpointMeta as
        | ClientTracingEndpointMeta
        | undefined;
}

function parseUrl(url: string):
    | {
          path: string;
          scheme?: string;
          host?: string;
          port?: number;
      }
    | undefined {
    try {
        const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
        const parsed = new URL(url, 'http://localhost');
        const result: {
            path: string;
            scheme?: string;
            host?: string;
            port?: number;
        } = {
            path: parsed.pathname
        };

        if (absolute) {
            result.scheme = parsed.protocol.replace(/:$/, '');
            result.host = parsed.hostname;
            if (parsed.port) {
                const port = Number(parsed.port);
                if (Number.isFinite(port)) result.port = port;
            }
        }

        return result;
    } catch {
        return undefined;
    }
}

function getRoute(meta: ClientTracingEndpointMeta | undefined): string | null {
    return meta?.path ?? meta?.collectionPath ?? null;
}

function getSpanName(
    method: string,
    url: string,
    meta: ClientTracingEndpointMeta | undefined
): string {
    if (meta?.operationId) return meta.operationId;

    const route = getRoute(meta);
    if (route) return `${method} ${route}`;

    const parsed = parseUrl(url);
    return `${method} ${parsed?.path ?? url}`;
}

function buildAttributes(
    method: string,
    url: string,
    meta: ClientTracingEndpointMeta | undefined,
    recordUrlFull: boolean
): SpanAttributes {
    const parsed = parseUrl(url);
    const route = getRoute(meta);
    const attributes: SpanAttributes = {
        [ATTR_HTTP_REQUEST_METHOD]: method
    };

    if (parsed?.path) attributes[ATTR_URL_PATH] = parsed.path;
    if (parsed?.scheme) attributes[ATTR_URL_SCHEME] = parsed.scheme;
    if (parsed?.host) attributes[ATTR_SERVER_ADDRESS] = parsed.host;
    if (parsed?.port !== undefined) {
        attributes[ATTR_SERVER_PORT] = parsed.port;
    }
    if (recordUrlFull) attributes[ATTR_URL_FULL] = url;
    if (route) attributes[ATTR_HTTP_ROUTE] = route;
    if (meta?.group) attributes['cleverbrush.client.group'] = meta.group;
    if (meta?.endpoint) {
        attributes['cleverbrush.client.endpoint'] = meta.endpoint;
    }
    if (meta?.operationId) {
        attributes['cleverbrush.endpoint.operationId'] = meta.operationId;
    }
    if (meta?.tags?.length) {
        attributes['cleverbrush.endpoint.tags'] = meta.tags.join(',');
    }

    return attributes;
}

function markError(span: Span, err: unknown): void {
    if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message
        });
        return;
    }

    span.recordException(new Error(String(err)));
    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(err)
    });
}

/**
 * Creates a `@cleverbrush/client` middleware that traces outbound HTTP calls
 * and injects W3C Trace Context headers.
 *
 * Register this as the first client middleware so it wraps retries, timeouts,
 * and batching. The server-side `tracingMiddleware` already extracts these
 * headers, so downstream services join the same distributed trace.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client';
 * import { clientTracingMiddleware } from '@cleverbrush/otel/client';
 *
 * const client = createClient(api, {
 *     baseUrl: 'http://service-b:3000',
 *     middlewares: [clientTracingMiddleware()]
 * });
 * ```
 */
export function clientTracingMiddleware(
    options: ClientTracingMiddlewareOptions = {}
): ClientMiddleware {
    const tracerName = options.tracerName ?? DEFAULT_TRACER_NAME;
    const tracerVersion = options.tracerVersion;
    const skip = options.skip;
    const enrichSpan = options.enrichSpan;
    const recordUrlFull = options.recordUrlFull ?? false;

    let cachedTracer: Tracer | undefined;
    const getTracer = (): Tracer => {
        if (!cachedTracer) {
            cachedTracer = trace.getTracer(tracerName, tracerVersion);
        }
        return cachedTracer;
    };

    return next => async (url, init) => {
        if (skip?.(url, init)) {
            return next(url, init);
        }

        const method = (init.method ?? 'GET').toUpperCase();
        const meta = getEndpointMeta(init);
        const spanName = getSpanName(method, url, meta);
        const attributes = buildAttributes(method, url, meta, recordUrlFull);

        const tracer = getTracer();
        return tracer.startActiveSpan(
            spanName,
            { kind: SpanKind.CLIENT, attributes },
            async span => {
                const headers = flattenHeaders(init.headers);
                propagation.inject(context.active(), headers);

                const tracedInit = {
                    ...init,
                    headers
                };
                const info: ClientTracingInfo = {
                    url,
                    method,
                    headers,
                    ...(meta ? { endpoint: meta } : {})
                };

                if (enrichSpan) {
                    try {
                        enrichSpan(span, info);
                    } catch {
                        // Ignore enrichment errors.
                    }
                }

                try {
                    const response = await next(url, tracedInit);
                    span.setAttribute(
                        ATTR_HTTP_RESPONSE_STATUS_CODE,
                        response.status
                    );
                    if (response.status >= 400) {
                        span.setStatus({ code: SpanStatusCode.ERROR });
                    } else {
                        span.setStatus({ code: SpanStatusCode.OK });
                    }
                    return response;
                } catch (err) {
                    markError(span, err);
                    throw err;
                } finally {
                    span.end();
                }
            }
        );
    };
}
