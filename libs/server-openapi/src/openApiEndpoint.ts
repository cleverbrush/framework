import type {
    AuthenticationConfig,
    EndpointRegistration
} from '@cleverbrush/server';
import { endpoint } from '@cleverbrush/server';
import {
    generateOpenApiSpec,
    type OpenApiDocument,
    type OpenApiInfo,
    type OpenApiServer
} from './generateOpenApiSpec.js';
import type { OpenApiSecurityScheme } from './securityMapper.js';

/**
 * Options for {@link createOpenApiEndpoint}.
 */
export interface OpenApiEndpointOptions {
    /** Function that returns endpoint registrations. */
    readonly getRegistrations: () => readonly EndpointRegistration[];
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
 * Creates an endpoint definition and handler that serves the OpenAPI spec
 * as JSON. Register it with `builder.handle(ep, handler)`.
 *
 * The spec is lazily generated on first request and cached.
 *
 * @example
 * ```ts
 * const { endpoint: openApiEp, handler } = createOpenApiEndpoint({
 *     getRegistrations: () => builder.getRegistrations(),
 *     info: { title: 'My API', version: '1.0.0' }
 * });
 * builder.handle(openApiEp, handler);
 * ```
 */
export function createOpenApiEndpoint(options: OpenApiEndpointOptions): {
    endpoint: ReturnType<(typeof endpoint)['get']>;
    handler: () => OpenApiDocument;
} {
    const servePath = options.path ?? '/openapi.json';

    const ep = endpoint
        .get(servePath)
        .summary('OpenAPI specification')
        .tags('OpenAPI')
        .operationId('getOpenApiSpec');

    let cachedSpec: OpenApiDocument | null = null;

    const handler = (): OpenApiDocument => {
        if (!cachedSpec) {
            cachedSpec = generateOpenApiSpec({
                registrations: options.getRegistrations(),
                info: options.info,
                servers: options.servers,
                authConfig: options.authConfig,
                securitySchemes: options.securitySchemes
            });
        }
        return cachedSpec;
    };

    return { endpoint: ep, handler };
}
