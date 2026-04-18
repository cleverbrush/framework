import type {
    RequestContext,
    SubscriptionRegistration
} from '@cleverbrush/server';
import {
    type AsyncApiDocument,
    type AsyncApiInfo,
    type AsyncApiServer_ServerLike,
    type AsyncApiServerEntry,
    generateAsyncApiSpec
} from './generateAsyncApiSpec.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Options for the {@link serveAsyncApi} middleware.
 *
 * When `server` is provided, `getSubscriptionRegistrations` is derived
 * from it automatically (unless explicitly overridden).
 */
export interface ServeAsyncApiOptions {
    /**
     * A `ServerBuilder` (or any structurally compatible object). When set,
     * subscription registrations are read from the server automatically.
     * An explicit `getSubscriptionRegistrations` value takes precedence.
     */
    readonly server?: AsyncApiServer_ServerLike;
    /**
     * Function that returns subscription registrations.
     * Takes precedence over `server.getSubscriptionRegistrations()`.
     */
    readonly getSubscriptionRegistrations?: () => readonly SubscriptionRegistration[];
    /** AsyncAPI info metadata (title, version, description). */
    readonly info: AsyncApiInfo;
    /**
     * Server entries to include in the spec's `servers` map.
     * Keys are server IDs (e.g. `'production'`, `'staging'`).
     */
    readonly servers?: Record<string, AsyncApiServerEntry>;
    /** Path to serve the spec at. Defaults to `/asyncapi.json`. */
    readonly path?: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Returns a server middleware that serves the AsyncAPI 3.0 spec as JSON at
 * the configured path (default: `/asyncapi.json`).
 *
 * The spec is lazily generated on the first request and cached for subsequent
 * requests.
 *
 * @example
 * ```ts
 * import { serveAsyncApi } from '@cleverbrush/server-openapi';
 *
 * server.use(
 *     serveAsyncApi({
 *         server,
 *         info: { title: 'My API', version: '1.0.0' },
 *         servers: {
 *             production: { host: 'api.example.com', protocol: 'wss' },
 *         },
 *     })
 * );
 * ```
 */
export function serveAsyncApi(
    options: ServeAsyncApiOptions
): (context: RequestContext, next: () => Promise<void>) => Promise<void> {
    const servePath = options.path ?? '/asyncapi.json';
    const srv = options.server;
    const getSubscriptionRegistrations =
        options.getSubscriptionRegistrations ??
        (srv ? () => srv.getSubscriptionRegistrations() : () => []);
    let cachedSpec: AsyncApiDocument | null = null;

    return async (context, next) => {
        const url = context.url;
        const pathname = url.pathname;
        const method = context.method.toUpperCase();

        if (method === 'GET' && pathname === servePath) {
            if (!cachedSpec) {
                cachedSpec = generateAsyncApiSpec({
                    subscriptions: getSubscriptionRegistrations(),
                    info: options.info,
                    servers: options.servers
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
