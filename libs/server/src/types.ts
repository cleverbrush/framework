import type {
    ParseStringSchemaBuilder,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { RequestContext } from './RequestContext.js';

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface RouteDefinition {
    readonly method: string;
    readonly path: string | ParseStringSchemaBuilder<any, any, any, any, any>;
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
