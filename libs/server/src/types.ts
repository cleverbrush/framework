import type { EndpointMetadata } from './Endpoint.js';
import type { RequestContext } from './RequestContext.js';

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
}
