import type {
    AuthenticationConfig,
    EndpointRegistration,
    RequestContext
} from '@cleverbrush/server';
import {
    generateOpenApiSpec,
    type OpenApiDocument,
    type OpenApiInfo,
    type OpenApiServer,
    type OpenApiServer_ServerLike
} from './generateOpenApiSpec.js';
import type { OpenApiSecurityScheme } from './securityMapper.js';

/**
 * Options for the {@link serveOpenApi} middleware.
 *
 * When `server` is provided, `getRegistrations` and `authConfig` are derived
 * from it automatically (unless explicitly overridden).
 */
export interface ServeOpenApiOptions {
    /**
     * A `ServerBuilder` (or any structurally compatible object). When set,
     * endpoint registrations and auth config are read from the server
     * automatically. Explicit `getRegistrations` / `authConfig` values
     * take precedence.
     */
    readonly server?: OpenApiServer_ServerLike;
    /** Function that returns endpoint registrations. */
    readonly getRegistrations?: () => readonly EndpointRegistration[];
    /** OpenAPI info metadata. */
    readonly info: OpenApiInfo;
    /** Optional server entries. */
    readonly servers?: readonly OpenApiServer[];
    /** Optional auth config for security scheme generation. */
    readonly authConfig?: AuthenticationConfig | null;
    /** Override security schemes manually. */
    readonly securitySchemes?: Record<string, OpenApiSecurityScheme>;
    /** Path to serve the spec at (default: `/openapi.json`). */
    readonly path?: string;
}

/**
 * Returns a server middleware that serves the OpenAPI spec as JSON at
 * the configured path (default: `/openapi.json`).
 *
 * The spec is lazily generated on first request and cached.
 */
export function serveOpenApi(
    options: ServeOpenApiOptions
): (context: RequestContext, next: () => Promise<void>) => Promise<void> {
    const servePath = options.path ?? '/openapi.json';
    const srv = options.server;
    const getRegistrations =
        options.getRegistrations ??
        (srv ? () => srv.getRegistrations() : () => []);
    let cachedSpec: OpenApiDocument | null = null;

    return async (context, next) => {
        const url = context.url;
        const pathname = url.pathname;
        const method = context.method.toUpperCase();

        if (method === 'GET' && pathname === servePath) {
            if (!cachedSpec) {
                cachedSpec = generateOpenApiSpec({
                    registrations: getRegistrations(),
                    info: options.info,
                    servers: options.servers,
                    authConfig:
                        options.authConfig !== undefined
                            ? options.authConfig
                            : (srv?.getAuthenticationConfig() ?? undefined),
                    securitySchemes: options.securitySchemes
                });
            }
            const body = JSON.stringify(cachedSpec);
            context.response.writeHead(200, {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body).toString()
            });
            context.response.end(body);
            return;
        }

        await next();
    };
}
