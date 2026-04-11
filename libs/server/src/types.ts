import type {
    ParseStringSchemaBuilder,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { RequestContext } from './RequestContext.js';

// ---------------------------------------------------------------------------
// Parameter Sources
// ---------------------------------------------------------------------------

export type ParameterSourceType =
    | 'path'
    | 'query'
    | 'body'
    | 'header'
    | 'context';

export interface ParameterSource {
    readonly from: ParameterSourceType;
    readonly name?: string;
}

/** Injects the fully-parsed path object from the route's parseString schema. */
export function path(): ParameterSource {
    return { from: 'path' };
}

/** Extracts a named query string parameter. */
export function query(name: string): ParameterSource {
    return { from: 'query', name };
}

/** Extracts the parsed request body. */
export function body(): ParameterSource {
    return { from: 'body' };
}

/** Extracts a named request header. */
export function header(name: string): ParameterSource {
    return { from: 'header', name: name.toLowerCase() };
}

/** Injects the RequestContext instance. */
export function context(): ParameterSource {
    return { from: 'context' };
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface RouteDefinition {
    readonly method: string;
    readonly path: string | ParseStringSchemaBuilder<any, any, any, any, any>;
    readonly params?: readonly ParameterSource[];
}

export interface ControllerRoutes {
    readonly [methodName: string]: RouteDefinition;
}

// ---------------------------------------------------------------------------
// Controller Registration
// ---------------------------------------------------------------------------

export interface ControllerConfig {
    readonly basePath?: string;
    readonly routes: ControllerRoutes;
    readonly middlewares?: readonly Middleware[];
}

export interface ControllerRegistration {
    readonly schema: SchemaBuilder<any, any, any, any, any>;
    readonly implementation: new (...args: any[]) => any;
    readonly config: ControllerConfig;
}

// ---------------------------------------------------------------------------
// Route Match
// ---------------------------------------------------------------------------

export interface RouteMatch {
    readonly registration: ControllerRegistration;
    readonly methodName: string;
    readonly routeDef: RouteDefinition;
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
