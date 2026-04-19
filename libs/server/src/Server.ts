import * as http from 'node:http';
import * as https from 'node:https';
import type { Duplex } from 'node:stream';
import type {
    AuthenticationContext,
    AuthenticationScheme,
    AuthorizationPolicy
} from '@cleverbrush/auth';
import {
    AuthorizationService,
    PolicyBuilder,
    Principal,
    parseCookies,
    requireRole
} from '@cleverbrush/auth';
import { ServiceCollection, type ServiceProvider } from '@cleverbrush/di';
import { type WebSocket, WebSocketServer } from 'ws';
import { ActionResult, JsonResult } from './ActionResult.js';
import { ContentNegotiator } from './ContentNegotiator.js';
import type { EndpointBuilder, Handler, HandlerMapping } from './Endpoint.js';
import { HttpError } from './HttpError.js';
import { MiddlewarePipeline } from './MiddlewarePipeline.js';
import { needsBody, resolveArgs } from './ParameterResolver.js';
import {
    createProblemDetails,
    PROBLEM_JSON_CONTENT_TYPE,
    serializeProblemDetails
} from './ProblemDetails.js';
import { DEFAULT_MAX_BODY_SIZE, RequestContext } from './RequestContext.js';
import { Router } from './Router.js';
import type { SubscriptionMetadata } from './Subscription.js';
import { isTrackedEvent } from './Subscription.js';
import { checkJsonDepth, safeJsonParse } from './safeJson.js';
import type {
    ContentTypeHandler,
    EndpointRegistration,
    Middleware,
    ServerBatchingOptions,
    ServerOptions,
    SubscriptionRegistration
} from './types.js';
import {
    VirtualIncomingMessage,
    VirtualServerResponse
} from './VirtualHttp.js';
import type { WebhookDefinition } from './Webhook.js';
import {
    errorFrame,
    messageFrame,
    parseClientFrame,
    pongFrame,
    trackedFrame
} from './WebSocketProtocol.js';

// ---------------------------------------------------------------------------
// Authentication / Authorization Config Types
// ---------------------------------------------------------------------------

/**
 * Authentication configuration passed to `ServerBuilder.useAuthentication()`.
 *
 * At least one scheme must be listed. The `defaultScheme` name must match
 * one of the registered scheme `name` values — it is used when no specific
 * scheme is requested.
 */
export interface AuthenticationConfig {
    /** Name of the default scheme to use (must match a scheme's `name`). */
    defaultScheme: string;
    /** Registered authentication schemes. */
    schemes: AuthenticationScheme<any>[];
}

/**
 * Authorization configuration passed to `ServerBuilder.useAuthorization()`.
 *
 * Named policies can be referenced by string in future `authorize('policy-name')`
 * calls (currently resolved at startup time).
 */
export interface AuthorizationConfig {
    /** Named policies (looked up by `authorize('policy-name')` — future use). */
    policies?: Record<string, (builder: PolicyBuilder) => void>;
}

/**
 * Fluent builder for constructing and starting an HTTP server.
 *
 * @example
 * ```ts
 * const server = new ServerBuilder();
 *
 * server
 *     .services(svc => svc.addSingleton(IDb, () => new Db()))
 *     .use(loggingMiddleware)
 *     .handle(GetUser, ({ params }) => db.find(params.id));
 *
 * await server.listen(3000);
 * ```
 */
export class ServerBuilder {
    readonly #serviceCollection = new ServiceCollection();
    readonly #registrations: EndpointRegistration[] = [];
    readonly #subscriptionRegistrations: SubscriptionRegistration[] = [];
    readonly #webhooks: WebhookDefinition[] = [];
    readonly #globalMiddlewares: Middleware[] = [];
    readonly #contentNegotiator = new ContentNegotiator();
    #options: ServerOptions = {};
    #authConfig: AuthenticationConfig | null = null;
    #authzConfig: AuthorizationConfig | null = null;
    #healthcheck = false;
    #batchConfig: ServerBatchingOptions | null = null;

    /**
     * Configure the DI service collection.
     *
     * @param configureFn - Receives the `ServiceCollection` for registrations.
     */
    services(configureFn: (svc: ServiceCollection) => void): this {
        configureFn(this.#serviceCollection);
        return this;
    }

    /**
     * Add a global middleware that runs for every request.
     * Middleware is executed in the order it is added.
     */
    use(middleware: Middleware): this {
        this.#globalMiddlewares.push(middleware);
        return this;
    }

    /**
     * Register an additional content type handler for content negotiation.
     * JSON is registered by default.
     */
    contentType(handler: ContentTypeHandler): this {
        this.#contentNegotiator.register(handler);
        return this;
    }

    /**
     * Enable authentication with one or more schemes.
     * Registers a global middleware that authenticates every request and
     * sets `ctx.principal`.
     */
    useAuthentication(config: AuthenticationConfig): this {
        this.#authConfig = config;
        return this;
    }

    /**
     * Enable authorization enforcement.
     * Registers a global middleware that checks endpoint `authorize()`
     * metadata against the authenticated principal.
     * Must be called after `useAuthentication()`.
     */
    useAuthorization(config?: AuthorizationConfig): this {
        this.#authzConfig = config ?? {};
        return this;
    }

    /**
     * Enable the `GET /health` endpoint that returns `{ ok: true }` (200).
     * Useful for load balancer and container readiness probes.
     */
    withHealthcheck(): this {
        this.#healthcheck = true;
        return this;
    }

    /**
     * Enable the server-side request batching endpoint.
     *
     * Once enabled, the server accepts `POST <path>` (default `/__batch`)
     * containing an array of sub-requests and processes each one through the
     * full middleware and handler pipeline, returning an array of
     * sub-responses in a single HTTP reply.
     *
     * Pair this with the `batching()` middleware from `@cleverbrush/client/batching`
     * on the client side.
     *
     * @param options - {@link ServerBatchingOptions} (all fields optional).
     *
     * @example
     * ```ts
     * new ServerBuilder()
     *     .useBatching()
     *     .handleAll(mapping)
     *     .listen(3000);
     * ```
     */
    useBatching(options: ServerBatchingOptions = {}): this {
        this.#batchConfig = options;
        return this;
    }

    /**
     * Register an endpoint and its handler.
     *
     * @param endpointDef - An `EndpointBuilder` instance (e.g. from `endpoint.get(...)`).
     * @param handler - The typed handler function.
     * @param options - Optional per-endpoint middleware.
     */
    handle<
        E extends EndpointBuilder<any, any, any, any, any, any, any, any, any>
    >(
        endpointDef: E,
        handler: Handler<E>,
        options?: { middlewares?: Middleware[] }
    ): this {
        this.#registrations.push({
            endpoint: endpointDef.introspect(),
            handler,
            middlewares: options?.middlewares
        });
        return this;
    }

    /**
     * Register all endpoints from a {@link HandlerMapping} created by
     * {@link mapHandlers}. This is the bulk equivalent of calling
     * `.handle()` for each endpoint individually.
     *
     * @param mapping - The mapping produced by `mapHandlers(endpoints, handlers)`.
     */
    handleAll(mapping: HandlerMapping): this {
        for (const entry of mapping._entries) {
            this.#registrations.push({
                endpoint: entry.endpoint.introspect(),
                handler: entry.handler,
                middlewares: entry.middlewares
            });
        }
        for (const entry of mapping._subscriptions) {
            this.#subscriptionRegistrations.push({
                endpoint: entry.endpoint.introspect(),
                handler: entry.handler,
                middlewares: entry.middlewares
            });
        }
        return this;
    }

    /**
     * Returns a snapshot of all registered endpoints.
     * Useful for generating OpenAPI specs or other documentation.
     */
    getRegistrations(): readonly EndpointRegistration[] {
        return [...this.#registrations];
    }

    /**
     * Returns a snapshot of all registered WebSocket subscription endpoints.
     * Consumed by `@cleverbrush/server-openapi` to emit the AsyncAPI spec.
     */
    getSubscriptionRegistrations(): readonly SubscriptionRegistration[] {
        return [...this.#subscriptionRegistrations];
    }

    /**
     * Register a webhook definition.
     *
     * Webhooks are recorded for OpenAPI spec generation only — they are not
     * served as HTTP routes by the runtime server.
     *
     * @param def - A {@link WebhookDefinition} created with {@link defineWebhook}.
     */
    webhook(def: WebhookDefinition): this {
        this.#webhooks.push(def);
        return this;
    }

    /**
     * Returns a snapshot of all registered webhook definitions.
     * Consumed by `@cleverbrush/server-openapi` to emit the `webhooks` map.
     */
    getWebhooks(): readonly WebhookDefinition[] {
        return [...this.#webhooks];
    }

    /**
     * Returns the authentication configuration, or `null` if
     * `useAuthentication()` has not been called.
     */
    getAuthenticationConfig(): AuthenticationConfig | null {
        return this.#authConfig;
    }

    /**
     * Start listening on the given port and host. Resolves with the running
     * {@link Server} instance.
     *
     * @param port - TCP port (default: `ServerOptions.port ?? 3000`).
     * @param host - Bind address (default: `ServerOptions.host ?? '0.0.0.0'`).
     */
    async listen(port?: number, host?: string): Promise<Server> {
        const router = new Router();

        for (const reg of this.#registrations) {
            router.addRoute(reg);
        }
        for (const reg of this.#subscriptionRegistrations) {
            router.addSubscriptionRoute(reg);
        }

        const serviceProvider = this.#serviceCollection.buildServiceProvider({
            validateScopes: false
        });

        // Build auth middleware stack
        const authMiddlewares: Middleware[] = [];

        if (this.#authConfig) {
            authMiddlewares.push(
                createAuthenticationMiddleware(this.#authConfig)
            );
        }

        if (this.#authzConfig !== null) {
            const policies = new Map<string, AuthorizationPolicy>();
            if (this.#authzConfig.policies) {
                for (const [name, configureFn] of Object.entries(
                    this.#authzConfig.policies
                )) {
                    const builder = new PolicyBuilder();
                    configureFn(builder);
                    policies.set(name, builder.build(name));
                }
            }
            const authzService = new AuthorizationService(policies);
            authMiddlewares.push(
                createAuthorizationMiddleware(authzService, this.#authConfig)
            );
        }

        // Auth middlewares go before user-registered global middlewares
        const allMiddlewares = [...authMiddlewares, ...this.#globalMiddlewares];

        const server = new Server(
            router,
            serviceProvider,
            this.#contentNegotiator,
            allMiddlewares,
            this.#healthcheck,
            this.#subscriptionRegistrations.length > 0,
            this.#batchConfig,
            this.#options.maxBodySize
        );

        const listenPort = port ?? this.#options.port ?? 3000;
        const listenHost = host ?? this.#options.host ?? '0.0.0.0';

        await server.start(listenPort, listenHost, this.#options);
        return server;
    }
}

/**
 * The running HTTP/HTTPS server instance returned by `ServerBuilder.listen()`.
 *
 * Use `close()` to gracefully shut down the server.
 */
/** Maximum number of queued incoming WebSocket messages before the connection is closed. */
const MAX_WS_QUEUE_SIZE = 1024;

export class Server {
    readonly #router: Router;
    readonly #serviceProvider: ServiceProvider;
    readonly #contentNegotiator: ContentNegotiator;
    readonly #globalMiddlewares: Middleware[];
    readonly #healthcheck: boolean;
    readonly #hasSubscriptions: boolean;
    readonly #batchConfig: ServerBatchingOptions | null;
    readonly #maxBodySize: number;
    #httpServer: http.Server | https.Server | null = null;
    #wss: WebSocketServer | null = null;
    readonly #activeConnections: Set<WebSocket> = new Set();

    constructor(
        router: Router,
        serviceProvider: ServiceProvider,
        contentNegotiator: ContentNegotiator,
        globalMiddlewares: Middleware[],
        healthcheck = false,
        hasSubscriptions = false,
        batchConfig: ServerBatchingOptions | null = null,
        maxBodySize: number = DEFAULT_MAX_BODY_SIZE
    ) {
        this.#router = router;
        this.#serviceProvider = serviceProvider;
        this.#contentNegotiator = contentNegotiator;
        this.#globalMiddlewares = globalMiddlewares;
        this.#healthcheck = healthcheck;
        this.#hasSubscriptions = hasSubscriptions;
        this.#batchConfig = batchConfig;
        this.#maxBodySize = maxBodySize;
    }

    /**
     * Start listening. Called internally by `ServerBuilder.listen()` after
     * the server is fully configured.
     */
    async start(
        port: number,
        host: string,
        options: ServerOptions
    ): Promise<void> {
        const handler = (
            req: http.IncomingMessage,
            res: http.ServerResponse
        ) => {
            this.#handleRequest(req, res).catch((_err: unknown) => {
                if (!res.headersSent) {
                    res.writeHead(500, {
                        'content-type': PROBLEM_JSON_CONTENT_TYPE
                    });
                    res.end(serializeProblemDetails(createProblemDetails(500)));
                }
            });
        };

        if (options.https) {
            this.#httpServer = https.createServer(
                { key: options.https.key, cert: options.https.cert },
                handler
            );
        } else {
            this.#httpServer = http.createServer(handler);
        }

        await new Promise<void>(resolve => {
            this.#httpServer!.listen(port, host, resolve);
        });

        // Set up WebSocket server if subscriptions are registered
        if (this.#hasSubscriptions) {
            this.#wss = new WebSocketServer({
                noServer: true,
                maxPayload: this.#maxBodySize
            });

            this.#httpServer!.on(
                'upgrade',
                (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
                    const urlPath = new URL(
                        req.url ?? '/',
                        `http://${req.headers.host ?? 'localhost'}`
                    ).pathname;

                    const result = this.#router.matchSubscription(urlPath);
                    if (!result) {
                        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    this.#wss!.handleUpgrade(req, socket, head, ws => {
                        this.#handleWebSocket(
                            ws,
                            req,
                            result.registration,
                            result.parsedPath
                        );
                    });
                }
            );
        }
    }

    /** Gracefully stop the server and free the TCP port. */
    async close(): Promise<void> {
        // Close all active WebSocket connections
        for (const ws of this.#activeConnections) {
            ws.close(1001, 'Server shutting down');
        }
        this.#activeConnections.clear();

        // Close the WebSocket server
        if (this.#wss) {
            await new Promise<void>((resolve, reject) => {
                this.#wss!.close((err?: Error) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            this.#wss = null;
        }

        if (!this.#httpServer) return;
        await new Promise<void>((resolve, reject) => {
            this.#httpServer!.close((err: Error | undefined) => {
                if (err) reject(err);
                else resolve();
            });
        });
        this.#httpServer = null;
    }

    /**
     * The bound address after `listen()` resolves.
     * Returns `null` if the server has been closed or not yet started.
     */
    get address(): { port: number; host: string } | null {
        const addr = this.#httpServer?.address();
        if (!addr || typeof addr === 'string') return null;
        return { port: addr.port, host: addr.address };
    }

    async #handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const scope = this.#serviceProvider.createScope();

        try {
            const ctx = new RequestContext(req, res, this.#maxBodySize);
            const urlPath = ctx.url.pathname;
            const method = ctx.method;

            if (
                this.#healthcheck &&
                method === 'GET' &&
                urlPath === '/health'
            ) {
                res.writeHead(200);
                res.end();
                return;
            }

            // Batch endpoint — handled before routing and auth.
            if (
                this.#batchConfig !== null &&
                method === 'POST' &&
                urlPath === (this.#batchConfig.path ?? '/__batch')
            ) {
                await this.#handleBatchRequest(req, res);
                return;
            }

            const routeResult = this.#router.match(method, urlPath);

            if (!routeResult.match) {
                if (routeResult.badRequest) {
                    const pd = createProblemDetails(400);
                    res.writeHead(400, {
                        'content-type': PROBLEM_JSON_CONTENT_TYPE
                    });
                    res.end(serializeProblemDetails(pd));
                    return;
                }

                if (routeResult.methodNotAllowed) {
                    const pd = createProblemDetails(405, 'Method Not Allowed');
                    res.writeHead(405, {
                        'content-type': PROBLEM_JSON_CONTENT_TYPE,
                        allow: routeResult.allowedMethods!.join(', ')
                    });
                    res.end(serializeProblemDetails(pd));
                    return;
                }

                const pd = createProblemDetails(404);
                res.writeHead(404, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                res.end(serializeProblemDetails(pd));
                return;
            }

            const { registration, parsedPath } = routeResult.match;
            const meta = registration.endpoint;

            // Set path params on context (raw string form for middleware)
            if (parsedPath) {
                const rawParams: Record<string, string> = {};
                flattenToStrings(parsedPath, '', rawParams);
                ctx.pathParams = rawParams;
            }

            ctx.services = scope.serviceProvider;

            // Store endpoint metadata for authorization middleware
            ctx.items.set('__endpoint_meta', meta);

            // Build middleware pipeline
            const pipeline = new MiddlewarePipeline();
            for (const mw of this.#globalMiddlewares) {
                pipeline.add(mw);
            }
            if (registration.middlewares) {
                for (const mw of registration.middlewares) {
                    pipeline.add(mw);
                }
            }

            await pipeline.execute(ctx, async () => {
                if (ctx.responded) return;

                // Parse body if needed
                let parsedBody: unknown;
                if (needsBody(meta)) {
                    const contentType = req.headers['content-type'];
                    const ctHandler =
                        this.#contentNegotiator.selectRequestHandler(
                            contentType
                        );
                    if (ctHandler) {
                        const rawBody = await ctx.body();
                        const bodyText = rawBody.toString('utf-8');
                        if (bodyText.length > 0) {
                            try {
                                parsedBody = ctHandler.deserialize(bodyText);
                            } catch {
                                const pd = createProblemDetails(
                                    400,
                                    'Malformed request body'
                                );
                                res.writeHead(400, {
                                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                                });
                                res.end(serializeProblemDetails(pd));
                                ctx.responded = true;
                                return;
                            }
                        }
                    } else if (contentType) {
                        const pd = createProblemDetails(415);
                        res.writeHead(415, {
                            'content-type': PROBLEM_JSON_CONTENT_TYPE
                        });
                        res.end(serializeProblemDetails(pd));
                        ctx.responded = true;
                        return;
                    }
                }

                // Resolve parameters
                const resolveResult = await resolveArgs(
                    meta,
                    parsedPath,
                    ctx,
                    parsedBody
                );
                if (!resolveResult.valid) {
                    res.writeHead(400, {
                        'content-type': PROBLEM_JSON_CONTENT_TYPE
                    });
                    res.end(
                        serializeProblemDetails(resolveResult.problemDetails)
                    );
                    ctx.responded = true;
                    return;
                }

                // Call handler
                let result = registration.handler(...resolveResult.args);
                if (result instanceof Promise) {
                    result = await result;
                }

                if (ctx.responded) return;
                await this.#sendResult(req, res, result);
                ctx.responded = true;
            });
        } catch (err) {
            if (res.headersSent) return;

            if (err instanceof HttpError) {
                const pd = err.toProblemDetails();
                res.writeHead(pd.status, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                res.end(serializeProblemDetails(pd));
            } else {
                console.error('[server] Unhandled error:', err);
                const pd = createProblemDetails(500);
                res.writeHead(500, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                res.end(serializeProblemDetails(pd));
            }
        } finally {
            try {
                await scope.asyncDispose();
            } catch {
                // Swallow disposal errors
            }
        }
    }

    // -----------------------------------------------------------------------
    // Batch request handler
    // -----------------------------------------------------------------------

    async #handleBatchRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const config = this.#batchConfig!;
        const maxSize = config.maxSize ?? 20;
        const parallel = config.parallel ?? true;

        // Read the outer body.
        let outerBody: { requests: Array<BatchSubRequest> };
        try {
            const raw = await readBuffer(req, this.#maxBodySize);
            const parsed = safeJsonParse(raw.toString('utf-8'));
            checkJsonDepth(parsed);
            outerBody = parsed as {
                requests: Array<BatchSubRequest>;
            };
            if (!Array.isArray(outerBody?.requests)) {
                throw new Error('requests must be an array');
            }
        } catch (err) {
            if (err instanceof HttpError && err.status === 413) {
                const pd = createProblemDetails(413, 'Payload Too Large');
                res.writeHead(413, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                res.end(serializeProblemDetails(pd));
                return;
            }
            const pd = createProblemDetails(400, 'Invalid batch request body');
            res.writeHead(400, { 'content-type': PROBLEM_JSON_CONTENT_TYPE });
            res.end(serializeProblemDetails(pd));
            return;
        }

        if (outerBody.requests.length > maxSize) {
            const pd = createProblemDetails(
                400,
                `Batch size ${outerBody.requests.length} exceeds maximum of ${maxSize}`
            );
            res.writeHead(400, { 'content-type': PROBLEM_JSON_CONTENT_TYPE });
            res.end(serializeProblemDetails(pd));
            return;
        }

        const execute = async (
            item: BatchSubRequest
        ): Promise<BatchSubResponse> => {
            const virtualReq = new VirtualIncomingMessage({
                method: (item.method ?? 'GET').toUpperCase(),
                url: item.url,
                headers: item.headers ?? {},
                body: item.body
            });
            const virtualRes = new VirtualServerResponse();

            await this.#handleRequest(
                virtualReq as unknown as http.IncomingMessage,
                virtualRes as unknown as http.ServerResponse
            );

            return virtualRes.toResult();
        };

        let results: BatchSubResponse[];
        if (parallel) {
            results = await Promise.all(outerBody.requests.map(execute));
        } else {
            results = [];
            for (const item of outerBody.requests) {
                results.push(await execute(item));
            }
        }

        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ responses: results }));
    }

    async #sendResult(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        result: unknown
    ): Promise<void> {
        if (result instanceof ActionResult) {
            await result.executeAsync(req, res, this.#contentNegotiator);
        } else if (result === null || result === undefined) {
            res.writeHead(204);
            res.end();
        } else {
            await new JsonResult(result, 200).executeAsync(
                req,
                res,
                this.#contentNegotiator
            );
        }
    }

    // -----------------------------------------------------------------------
    // WebSocket subscription handler
    // -----------------------------------------------------------------------

    #handleWebSocket(
        ws: WebSocket,
        req: http.IncomingMessage,
        registration: SubscriptionRegistration,
        parsedPath: Record<string, any> | null
    ): void {
        this.#activeConnections.add(ws);
        const scope = this.#serviceProvider.createScope();
        const abortController = new AbortController();
        const meta = registration.endpoint;

        // Build RequestContext for middleware / auth
        const dummyRes = new http.ServerResponse(req);
        const ctx = new RequestContext(req, dummyRes);
        if (parsedPath) {
            const rawParams: Record<string, string> = {};
            flattenToStrings(parsedPath, '', rawParams);
            ctx.pathParams = rawParams;
        }
        ctx.services = scope.serviceProvider;
        ctx.items.set('__endpoint_meta', meta);

        // Authenticate via the same auth middleware pipeline
        const authPipeline = new MiddlewarePipeline();
        for (const mw of this.#globalMiddlewares) {
            authPipeline.add(mw);
        }
        if (registration.middlewares) {
            for (const mw of registration.middlewares) {
                authPipeline.add(mw);
            }
        }

        authPipeline
            .execute(ctx, async () => {
                if (ctx.responded) {
                    // Middleware rejected the request
                    ws.close(1008, 'Unauthorized');
                    return;
                }

                this.#runSubscription(
                    ws,
                    ctx,
                    meta,
                    registration.handler,
                    parsedPath,
                    scope,
                    abortController
                );
            })
            .catch(() => {
                ws.close(1011, 'Internal Server Error');
            });

        ws.on('close', () => {
            this.#activeConnections.delete(ws);
            abortController.abort();
            scope.asyncDispose().catch(() => {});
        });

        ws.on('error', () => {
            this.#activeConnections.delete(ws);
            abortController.abort();
            scope.asyncDispose().catch(() => {});
        });
    }

    #runSubscription(
        ws: WebSocket,
        ctx: RequestContext,
        meta: SubscriptionMetadata,
        handler: (...args: any[]) => any,
        parsedPath: Record<string, any> | null,
        scope: {
            serviceProvider: import('@cleverbrush/di').IServiceProvider;
            asyncDispose(): Promise<void>;
        },
        abortController: AbortController
    ): void {
        // Build incoming async iterable from client messages
        const incomingQueue: unknown[] = [];
        let incomingResolve: (() => void) | null = null;
        let incomingDone = false;

        const incoming: AsyncIterable<unknown> = {
            [Symbol.asyncIterator]() {
                return {
                    next(): Promise<IteratorResult<unknown>> {
                        if (incomingQueue.length > 0) {
                            return Promise.resolve({
                                value: incomingQueue.shift()!,
                                done: false
                            });
                        }
                        if (incomingDone) {
                            return Promise.resolve({
                                value: undefined,
                                done: true
                            });
                        }
                        return new Promise(resolve => {
                            incomingResolve = () => {
                                incomingResolve = null;
                                if (incomingQueue.length > 0) {
                                    resolve({
                                        value: incomingQueue.shift()!,
                                        done: false
                                    });
                                } else {
                                    resolve({ value: undefined, done: true });
                                }
                            };
                        });
                    },
                    return(): Promise<IteratorResult<unknown>> {
                        incomingDone = true;
                        return Promise.resolve({
                            value: undefined,
                            done: true
                        });
                    }
                };
            }
        };

        // Handle incoming WebSocket messages
        ws.on('message', (raw: Buffer | string) => {
            const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
            const frame = parseClientFrame(text);

            if (!frame) {
                ws.send(
                    JSON.stringify(errorFrame(400, 'Invalid frame format'))
                );
                return;
            }

            if (frame.type === 'ping') {
                ws.send(JSON.stringify(pongFrame()));
                return;
            }

            // Enforce queue size limit to prevent memory exhaustion
            if (incomingQueue.length >= MAX_WS_QUEUE_SIZE) {
                ws.send(
                    JSON.stringify(
                        errorFrame(
                            429,
                            'Message queue full — slow down or reconnect'
                        )
                    )
                );
                ws.close(1008, 'Message queue overflow');
                return;
            }

            // frame.type === 'message'
            if (meta.incomingSchema) {
                const result = meta.incomingSchema.validate(frame.data);
                if (!result.valid) {
                    const errors = (result.errors ?? [])
                        .map((e: { message: string }) => e.message)
                        .join('; ');
                    ws.send(
                        JSON.stringify(
                            errorFrame(422, `Validation failed: ${errors}`)
                        )
                    );
                    return;
                }
                incomingQueue.push(result.object);
            } else {
                incomingQueue.push(frame.data);
            }

            if (incomingResolve) incomingResolve();
        });

        // On close, finish the incoming stream
        ws.on('close', () => {
            incomingDone = true;
            if (incomingResolve) incomingResolve();
        });

        // Build subscription context
        const subscriptionCtx: Record<string, unknown> = {
            context: ctx,
            signal: abortController.signal
        };

        if (parsedPath && Object.keys(parsedPath).length > 0) {
            // Validate path params through the path schema if present
            subscriptionCtx.params = parsedPath;
        }

        // Parse query params
        if (meta.querySchema) {
            const queryObj: Record<string, string> = {};
            for (const [k, v] of ctx.url.searchParams.entries()) {
                queryObj[k] = v;
            }
            const result = meta.querySchema.validate(queryObj);
            if (!result.valid) {
                const errors = (result.errors ?? [])
                    .map((e: { message: string }) => e.message)
                    .join('; ');
                ws.close(1002, `Query validation failed: ${errors}`);
                return;
            }
            subscriptionCtx.query = result.object;
        }

        // Parse headers
        if (meta.headerSchema) {
            const result = meta.headerSchema.validate(ctx.headers);
            if (!result.valid) {
                const errors = (result.errors ?? [])
                    .map((e: { message: string }) => e.message)
                    .join('; ');
                ws.close(1002, `Header validation failed: ${errors}`);
                return;
            }
            subscriptionCtx.headers = result.object;
        }

        // Set principal if auth was performed
        if (ctx.principal !== undefined) {
            subscriptionCtx.principal = ctx.principal;
        }

        // Add incoming iterable if there's an incoming schema (or just the raw iterable)
        if (meta.incomingSchema) {
            subscriptionCtx.incoming = incoming;
        } else {
            subscriptionCtx.incoming = incoming;
        }

        // Resolve DI services
        const handlerArgs: unknown[] = [subscriptionCtx];
        if (meta.serviceSchemas) {
            const services: Record<string, unknown> = {};
            for (const [key, schema] of Object.entries(meta.serviceSchemas)) {
                services[key] = scope.serviceProvider.get(schema);
            }
            handlerArgs.push(services);
        }

        // Run the async generator
        (async () => {
            try {
                const generator = handler(...handlerArgs);
                for await (const value of generator) {
                    if (ws.readyState !== ws.OPEN) break;

                    let frameToSend: string;
                    if (isTrackedEvent(value)) {
                        const outData = meta.outgoingSchema
                            ? meta.outgoingSchema.validate(value.data)
                            : { valid: true, object: value.data };

                        if (!(outData as any).valid) {
                            ws.send(
                                JSON.stringify(
                                    errorFrame(
                                        500,
                                        'Outgoing validation failed'
                                    )
                                )
                            );
                            continue;
                        }
                        frameToSend = JSON.stringify(
                            trackedFrame(value.id, (outData as any).object)
                        );
                    } else {
                        const outData = meta.outgoingSchema
                            ? meta.outgoingSchema.validate(value)
                            : { valid: true, object: value };

                        if (!(outData as any).valid) {
                            ws.send(
                                JSON.stringify(
                                    errorFrame(
                                        500,
                                        'Outgoing validation failed'
                                    )
                                )
                            );
                            continue;
                        }
                        frameToSend = JSON.stringify(
                            messageFrame((outData as any).object)
                        );
                    }

                    ws.send(frameToSend);
                }
            } catch (err) {
                if (ws.readyState === ws.OPEN) {
                    // Never leak raw error messages to clients
                    if (err instanceof Error) {
                        console.error(
                            '[server] Subscription handler error:',
                            err
                        );
                    }
                    ws.send(JSON.stringify(errorFrame(500, 'Internal error')));
                    ws.close(1011, 'Handler error');
                }
            }
        })();
    }
}

export function createServer(options?: ServerOptions): ServerBuilder {
    const builder = new ServerBuilder();
    if (options) {
        (builder as any).__options = options;
    }
    return builder;
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/** A single sub-request within a batch body. */
interface BatchSubRequest {
    method: string;
    /** Path + query string, e.g. `/api/todos?page=1`. */
    url: string;
    headers?: Record<string, string>;
    /** Raw JSON-serialised body string. Absent for GET/HEAD/DELETE. */
    body?: string;
}

/** A single sub-response within the batch reply. */
interface BatchSubResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}

/** Reads the entire body of an `IncomingMessage` into a `Buffer`. */
function readBuffer(
    req: http.IncomingMessage,
    maxSize: number = DEFAULT_MAX_BODY_SIZE
): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        req.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;
            if (totalSize > maxSize) {
                req.destroy();
                reject(new HttpError(413, 'Payload Too Large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/** Flatten a nested object to a flat Record<string, string> for raw pathParams */
function flattenToStrings(
    obj: Record<string, any>,
    prefix: string,
    result: Record<string, string>
): void {
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            flattenToStrings(value, fullKey, result);
        } else {
            result[fullKey] = String(value);
        }
    }
}

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------

function createAuthenticationMiddleware(
    config: AuthenticationConfig
): Middleware {
    const schemeMap = new Map<string, AuthenticationScheme<any>>();
    for (const scheme of config.schemes) {
        schemeMap.set(scheme.name, scheme);
    }

    return async (ctx, next) => {
        const scheme = schemeMap.get(config.defaultScheme);
        if (!scheme) {
            // No matching scheme — leave principal as anonymous
            ctx.principal = Principal.anonymous();
            await next();
            return;
        }

        // Build transport-agnostic auth context
        const authCtx: AuthenticationContext = {
            headers: ctx.headers,
            cookies: parseCookies(ctx.headers['cookie'] ?? ''),
            items: ctx.items
        };

        const result = await scheme.authenticate(authCtx);

        if (result.succeeded) {
            ctx.principal = result.principal;
        } else {
            ctx.principal = Principal.anonymous();
        }

        await next();
    };
}

// ---------------------------------------------------------------------------
// Authorization Middleware
// ---------------------------------------------------------------------------

function createAuthorizationMiddleware(
    authzService: AuthorizationService,
    authConfig: AuthenticationConfig | null
): Middleware {
    // Collect challenge headers from schemes for 401 responses
    const challengeHeaders: Record<string, string> = {};
    if (authConfig) {
        for (const scheme of authConfig.schemes) {
            if (scheme.challenge) {
                const ch = scheme.challenge();
                challengeHeaders[ch.headerName.toLowerCase()] = ch.headerValue;
            }
        }
    }

    return async (ctx, next) => {
        const meta = ctx.items.get('__endpoint_meta') as
            | import('./Endpoint.js').EndpointMetadata
            | undefined;

        // No auth metadata or authRoles is null → public endpoint
        if (!meta || meta.authRoles === null) {
            await next();
            return;
        }

        // Endpoint requires auth — check principal
        const principal = ctx.principal;

        if (
            !principal ||
            !(principal instanceof Principal) ||
            !principal.isAuthenticated
        ) {
            // 401 Unauthorized
            const pd = createProblemDetails(401, 'Unauthorized');
            const headers: Record<string, string> = {
                'content-type': PROBLEM_JSON_CONTENT_TYPE,
                ...challengeHeaders
            };
            ctx.response.writeHead(401, headers);
            ctx.response.end(serializeProblemDetails(pd));
            ctx.responded = true;
            return;
        }

        // If roles are specified, check them
        if (meta.authRoles.length > 0) {
            const result = await authzService.authorize(principal, [
                requireRole(...meta.authRoles)
            ]);
            if (!result.allowed) {
                const pd = createProblemDetails(403, 'Forbidden');
                ctx.response.writeHead(403, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                ctx.response.end(serializeProblemDetails(pd));
                ctx.responded = true;
                return;
            }
        }

        // For typed handler access — set the principal value
        if (principal instanceof Principal) {
            ctx.principal = principal.value;
        }

        await next();
    };
}
