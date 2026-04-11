import * as http from 'node:http';
import * as https from 'node:https';
import { ServiceCollection, type ServiceProvider } from '@cleverbrush/di';
import { ActionResult, JsonResult } from './ActionResult.js';
import { ContentNegotiator } from './ContentNegotiator.js';
import type { EndpointBuilder, Handler } from './Endpoint.js';
import { HttpError } from './HttpError.js';
import { MiddlewarePipeline } from './MiddlewarePipeline.js';
import { needsBody, resolveArgs } from './ParameterResolver.js';
import {
    createProblemDetails,
    PROBLEM_JSON_CONTENT_TYPE,
    serializeProblemDetails
} from './ProblemDetails.js';
import { RequestContext } from './RequestContext.js';
import { Router } from './Router.js';
import type {
    ContentTypeHandler,
    EndpointRegistration,
    Middleware,
    ServerOptions
} from './types.js';

export class ServerBuilder {
    readonly #serviceCollection = new ServiceCollection();
    readonly #registrations: EndpointRegistration[] = [];
    readonly #globalMiddlewares: Middleware[] = [];
    readonly #contentNegotiator = new ContentNegotiator();
    #options: ServerOptions = {};

    services(configureFn: (svc: ServiceCollection) => void): this {
        configureFn(this.#serviceCollection);
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

    handle<E extends EndpointBuilder<any, any, any, any>>(
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

    async listen(port?: number, host?: string): Promise<Server> {
        const router = new Router();

        for (const reg of this.#registrations) {
            router.addRoute(reg);
        }

        const serviceProvider = this.#serviceCollection.buildServiceProvider({
            validateScopes: false
        });

        const server = new Server(
            router,
            serviceProvider,
            this.#contentNegotiator,
            this.#globalMiddlewares
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
        globalMiddlewares: Middleware[]
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
        const scope = this.#serviceProvider.createScope();

        try {
            const ctx = new RequestContext(req, res);
            const urlPath = ctx.url.pathname;
            const method = ctx.method;

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

            const { registration, parsedPath } = routeResult.match;
            const meta = registration.endpoint;

            // Set path params on context (raw string form for middleware)
            if (parsedPath) {
                const rawParams: Record<string, string> = {};
                flattenToStrings(parsedPath, '', rawParams);
                ctx.pathParams = rawParams;
            }

            ctx.services = scope.serviceProvider;

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
                            parsedBody = ctHandler.deserialize(bodyText);
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
}

export function createServer(options?: ServerOptions): ServerBuilder {
    const builder = new ServerBuilder();
    if (options) {
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
