import type { EndpointMetadata } from './Endpoint.js';
import type { RequestContext } from './RequestContext.js';

// ---------------------------------------------------------------------------
// Endpoint Registration
// ---------------------------------------------------------------------------

export interface EndpointRegistration {
    readonly endpoint: EndpointMetadata;
    readonly handler: (...args: any[]) => any;
    readonly middlewares?: readonly Middleware[];
}

// ---------------------------------------------------------------------------
// Route Match
// ---------------------------------------------------------------------------

export interface RouteMatch {
    readonly registration: EndpointRegistration;
    readonly parsedPath: Record<string, any> | null;
}

// ---------------------------------------------------------------------------
// Content Type Handler
// ---------------------------------------------------------------------------

export interface ContentTypeHandler {
    readonly mimeType: string;
    serialize(value: unknown): string;
    deserialize(raw: string): unknown;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export type Middleware = (
    context: RequestContext,
    next: () => Promise<void>
) => Promise<void>;

// ---------------------------------------------------------------------------
// Server Options
// ---------------------------------------------------------------------------

export interface ServerOptions {
    readonly port?: number;
    readonly host?: string;
    readonly https?: {
        readonly key: string;
        readonly cert: string;
    };
}
