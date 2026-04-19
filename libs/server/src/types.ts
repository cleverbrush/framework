import type { EndpointMetadata } from './Endpoint.js';
import type { RequestContext } from './RequestContext.js';
import type { SubscriptionMetadata } from './Subscription.js';

// ---------------------------------------------------------------------------
// Endpoint Registration
// ---------------------------------------------------------------------------

/**
 * A registered endpoint pairing its metadata (method, path, schemas) with
 * the handler function and any per-endpoint middleware.
 */
export interface EndpointRegistration {
    readonly endpoint: EndpointMetadata;
    readonly handler: (...args: any[]) => any;
    readonly middlewares?: readonly Middleware[];
}

// ---------------------------------------------------------------------------
// Subscription Registration
// ---------------------------------------------------------------------------

/**
 * A registered subscription pairing its metadata with the async generator
 * handler and any per-subscription middleware.
 */
export interface SubscriptionRegistration {
    readonly endpoint: SubscriptionMetadata;
    readonly handler: (...args: any[]) => any;
    readonly middlewares?: readonly Middleware[];
}

// ---------------------------------------------------------------------------
// Route Match
// ---------------------------------------------------------------------------

/**
 * The result of a successful router lookup: the matched endpoint registration
 * and any parsed path parameters extracted from the URL.
 */
export interface RouteMatch {
    readonly registration: EndpointRegistration;
    readonly parsedPath: Record<string, any> | null;
}

// ---------------------------------------------------------------------------
// Content Type Handler
// ---------------------------------------------------------------------------

/**
 * A pluggable serializer/deserializer for a specific MIME type.
 * Register instances with `ServerBuilder.contentType()` or
 * `ContentNegotiator.register()` to extend content negotiation.
 *
 * @example
 * ```ts
 * const msgpackHandler: ContentTypeHandler = {
 *     mimeType: 'application/msgpack',
 *     serialize: (value) => encode(value),
 *     deserialize: (raw) => decode(Buffer.from(raw))
 * };
 * server.contentType(msgpackHandler);
 * ```
 */
export interface ContentTypeHandler {
    readonly mimeType: string;
    serialize(value: unknown): string;
    deserialize(raw: string): unknown;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * A middleware function in the request pipeline.
 *
 * Call `next()` to pass control to the next middleware or the endpoint
 * handler. If `next()` is not called, the pipeline short-circuits.
 *
 * @example
 * ```ts
 * const logger: Middleware = async (ctx, next) => {
 *     console.log(ctx.method, ctx.url.pathname);
 *     await next();
 * };
 * ```
 */
export type Middleware = (
    context: RequestContext,
    next: () => Promise<void>
) => Promise<void>;

// ---------------------------------------------------------------------------
// Server Options
// ---------------------------------------------------------------------------

/**
 * Configuration options passed to `ServerBuilder.listen()` or the `Server`
 * constructor. All fields are optional; sensible defaults are applied.
 */
export interface ServerOptions {
    readonly port?: number;
    readonly host?: string;
    readonly https?: {
        readonly key: string;
        readonly cert: string;
    };

    /**
     * Maximum allowed size (in bytes) for incoming request bodies, batch
     * payloads, and WebSocket messages.
     *
     * Requests that exceed this limit are rejected with `413 Payload Too Large`.
     *
     * @default 5_242_880 (5 MB)
     */
    readonly maxBodySize?: number;
}

// ---------------------------------------------------------------------------
// Batching Options
// ---------------------------------------------------------------------------

/**
 * Configuration for the server-side request batching endpoint, enabled via
 * `ServerBuilder.useBatching()`.
 *
 * The batch endpoint accepts `POST <path>` with a JSON body containing an
 * array of sub-requests. It processes each through the full middleware and
 * handler pipeline, then returns an array of sub-responses in a single reply.
 *
 * @example
 * ```ts
 * new ServerBuilder()
 *     .useBatching({ path: '/__batch', maxSize: 20, parallel: true })
 *     .handleAll(mapping)
 *     .listen(3000);
 * ```
 */
export interface ServerBatchingOptions {
    /**
     * URL path of the batch endpoint.
     *
     * Must match the `batchPath` configured on the client-side
     * `batching()` middleware.
     *
     * @default '/__batch'
     */
    path?: string;

    /**
     * Maximum number of sub-requests allowed per batch.
     *
     * Requests exceeding this limit are rejected with `400 Bad Request`.
     *
     * @default 20
     */
    maxSize?: number;

    /**
     * Whether to execute sub-requests in parallel (`true`) or sequentially
     * (`false`).
     *
     * Parallel execution is faster but requires all handlers to be
     * concurrency-safe. Set to `false` if your handlers share mutable
     * request-scoped state that would cause conflicts when run concurrently.
     *
     * @default true
     */
    parallel?: boolean;
}
