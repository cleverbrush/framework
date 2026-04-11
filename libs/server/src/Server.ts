import * as http from 'node:http';
import * as https from 'node:https';
import { ServiceCollection, type ServiceProvider } from '@cleverbrush/di';
import type {
    FunctionSchemaBuilder,
    ObjectSchemaBuilder
} from '@cleverbrush/schema';
import { ActionResult, JsonResult } from './ActionResult.js';
import { ContentNegotiator } from './ContentNegotiator.js';
import { createController } from './ControllerFactory.js';
import { HttpError } from './HttpError.js';
import { MiddlewarePipeline } from './MiddlewarePipeline.js';
import { needsBody, resolveContextObject } from './ParameterResolver.js';
import {
    createProblemDetails,
    PROBLEM_JSON_CONTENT_TYPE,
    serializeProblemDetails
} from './ProblemDetails.js';
import { RequestContext } from './RequestContext.js';
import { RouteBuilder } from './RouteBuilder.js';
import { Router } from './Router.js';
import type {
    ContentTypeHandler,
    ControllerConfig,
    ControllerRegistration,
    Middleware,
    ServerOptions
} from './types.js';

export class ServerBuilder {
    readonly #serviceCollection = new ServiceCollection();
    readonly #registrations: ControllerRegistration[] = [];
    readonly #globalMiddlewares: Middleware[] = [];
    readonly #contentNegotiator = new ContentNegotiator();
    #options: ServerOptions = {};

    services(configureFn: (svc: ServiceCollection) => void): this {
        configureFn(this.#serviceCollection);
        return this;
    }

    controller<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema,
        implementation: new (...args: any[]) => any,
        config:
            | ControllerConfig
            | ((builder: RouteBuilder<TSchema>) => RouteBuilder<TSchema>)
    ): this {
        const resolved =
            typeof config === 'function'
                ? config(new RouteBuilder(schema)).build()
                : config;
        this.#registrations.push({
            schema,
            implementation,
            config: resolved
        });
        return this;
    }

    use(middleware: Middleware): this {
        this.#globalMiddlewares.push(middleware);
        return this;
    }

    contentType(handler: ContentTypeHandler): this {
        this.#contentNegotiator.register(handler);
        return this;
    }

    async listen(port?: number, host?: string): Promise<Server> {
        const router = new Router();

        // Register all routes
        for (const reg of this.#registrations) {
            for (const [methodName, routeDef] of Object.entries(
                reg.config.routes
            )) {
                router.addRoute(reg, methodName, routeDef);
            }
        }

        const serviceProvider = this.#serviceCollection.buildServiceProvider({
            validateScopes: false
        });

        const server = new Server(
            router,
            serviceProvider,
            this.#contentNegotiator,
            this.#globalMiddlewares,
            this.#registrations
        );

        const listenPort = port ?? this.#options.port ?? 3000;
        const listenHost = host ?? this.#options.host ?? '0.0.0.0';

        await server.start(listenPort, listenHost, this.#options);
        return server;
    }
}

export class Server {
    readonly #router: Router;
    readonly #serviceProvider: ServiceProvider;
    readonly #contentNegotiator: ContentNegotiator;
    readonly #globalMiddlewares: Middleware[];
    #httpServer: http.Server | https.Server | null = null;

    constructor(
        router: Router,
        serviceProvider: ServiceProvider,
        contentNegotiator: ContentNegotiator,
        globalMiddlewares: Middleware[],
        _registrations: ControllerRegistration[]
    ) {
        this.#router = router;
        this.#serviceProvider = serviceProvider;
        this.#contentNegotiator = contentNegotiator;
        this.#globalMiddlewares = globalMiddlewares;
    }

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
    }

    async close(): Promise<void> {
        if (!this.#httpServer) return;
        await new Promise<void>((resolve, reject) => {
            this.#httpServer!.close((err: Error | undefined) => {
                if (err) reject(err);
                else resolve();
            });
        });
        this.#httpServer = null;
    }

    get address(): { port: number; host: string } | null {
        const addr = this.#httpServer?.address();
        if (!addr || typeof addr === 'string') return null;
        return { port: addr.port, host: addr.address };
    }

    async #handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        // Create DI scope
        const scope = this.#serviceProvider.createScope();

        try {
            // Build RequestContext
            const ctx = new RequestContext(req, res);

            // Parse URL path (strip query string)
            const urlPath = ctx.url.pathname;
            const method = ctx.method;

            // Match route
            const routeResult = this.#router.match(method, urlPath);

            if (!routeResult.match) {
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

            const match = routeResult.match;
            const { registration, methodName, parsedPath } = match;

            // Set path params on context (raw string form for middleware)
            if (parsedPath) {
                const rawParams: Record<string, string> = {};
                flattenToStrings(parsedPath, '', rawParams);
                ctx.pathParams = rawParams;
            }

            // Register RequestContext as scoped service
            // We manually register it so it's available in the DI scope
            ctx.services = scope.serviceProvider;

            // Build middleware pipeline
            const pipeline = new MiddlewarePipeline();
            for (const mw of this.#globalMiddlewares) {
                pipeline.add(mw);
            }
            if (registration.config.middlewares) {
                for (const mw of registration.config.middlewares) {
                    pipeline.add(mw);
                }
            }

            // Execute pipeline with final handler
            await pipeline.execute(ctx, async () => {
                if (ctx.responded) return;

                // Get the func schema for the method
                const controllerIntrospection =
                    registration.schema.introspect();
                const properties = (controllerIntrospection as any)
                    .properties as Record<string, any> | undefined;

                let funcSchema: FunctionSchemaBuilder<
                    any,
                    any,
                    any,
                    any,
                    any,
                    any
                > | null = null;
                if (properties?.[methodName]) {
                    funcSchema = properties[methodName];
                }

                // Parse body if needed
                let parsedBody: unknown;
                const hasBodySource =
                    funcSchema != null && needsBody(funcSchema);

                if (hasBodySource) {
                    const contentType = req.headers['content-type'];
                    const handler =
                        this.#contentNegotiator.selectRequestHandler(
                            contentType
                        );
                    if (handler) {
                        const rawBody = await ctx.body();
                        const bodyText = rawBody.toString('utf-8');
                        if (bodyText.length > 0) {
                            parsedBody = handler.deserialize(bodyText);
                        }
                    } else if (contentType) {
                        // Unknown content type → 415
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
                let args: unknown[] = [];
                if (funcSchema) {
                    const result = await resolveContextObject(
                        funcSchema,
                        match,
                        ctx,
                        parsedBody
                    );
                    if (!result.valid) {
                        res.writeHead(400, {
                            'content-type': PROBLEM_JSON_CONTENT_TYPE
                        });
                        res.end(serializeProblemDetails(result.problemDetails));
                        ctx.responded = true;
                        return;
                    }
                    args = result.args;
                }

                // Create controller
                const controller = createController(
                    registration.schema,
                    registration.implementation,
                    scope.serviceProvider
                );

                // Validate method exists
                if (typeof controller[methodName] !== 'function') {
                    throw new Error(
                        `Controller method '${methodName}' is not a function`
                    );
                }

                // Call method
                let result = controller[methodName](...args);
                if (result instanceof Promise) {
                    result = await result;
                }

                // Send response
                if (ctx.responded) return;

                if (result instanceof ActionResult) {
                    await result.executeAsync(
                        req,
                        res,
                        this.#contentNegotiator
                    );
                } else if (result === null || result === undefined) {
                    res.writeHead(204);
                    res.end();
                } else {
                    // Plain object — wrap in JsonResult for content-negotiated JSON
                    await new JsonResult(result, 200).executeAsync(
                        req,
                        res,
                        this.#contentNegotiator
                    );
                }

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
                const pd = createProblemDetails(500);
                res.writeHead(500, {
                    'content-type': PROBLEM_JSON_CONTENT_TYPE
                });
                res.end(serializeProblemDetails(pd));
            }
        } finally {
            // Dispose DI scope (LIFO cleanup)
            try {
                await scope.asyncDispose();
            } catch {
                // Swallow disposal errors
            }
        }
    }
}

export function createServer(options?: ServerOptions): ServerBuilder {
    const builder = new ServerBuilder();
    if (options) {
        // Store options for later use
        (builder as any).__options = options;
    }
    return builder;
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
