import { jwtScheme } from '@cleverbrush/auth';
import {
    createServer,
    endpoint,
    mapHandlers,
    type Middleware
} from '@cleverbrush/server';
import {
    generateOpenApiSpec,
    type OpenApiDocument
} from '@cleverbrush/server-openapi';
import {
    endpoints,
    todoCompletedWebhook,
    todoCreatedWebhook
} from './api/endpoints.js';
import { handlers } from './api/handlers/index.js';
import { exportTodosHandler } from './api/handlers/todos.js';
import { activityLogHandler } from './api/handlers/admin.js';
import type { Config } from './config.js';
import { configureDI } from './di/setup.js';

// ── Per-endpoint middlewares ──────────────────────────────────────────────────

/** Audit logging middleware — logs export requests to stdout. */
const auditLogMiddleware: Middleware = async (ctx, next) => {
    const start = Date.now();
    console.log(
        `[audit] ${ctx.method} ${ctx.url.pathname} by principal=${JSON.stringify(ctx.principal ?? 'anonymous')}`
    );
    await next();
    console.log(
        `[audit] ${ctx.method} ${ctx.url.pathname} completed in ${Date.now() - start}ms`
    );
};

/** Request timing middleware — adds X-Response-Time header. */
const timingMiddleware: Middleware = async (ctx, next) => {
    const start = Date.now();
    await next();
    ctx.response.setHeader('x-response-time', `${Date.now() - start}ms`);
};

export function buildServer(config: Config) {
    const corsMiddleware: Middleware = async (ctx, next) => {
        ctx.response.setHeader('Access-Control-Allow-Origin', '*');
        ctx.response.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );
        ctx.response.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, X-Idempotency-Key, If-Match'
        );
        if (ctx.method === 'OPTIONS') {
            ctx.response.writeHead(204);
            ctx.response.end();
            return;
        }
        await next();
    };

    const server = createServer()
        .use(corsMiddleware)
        .services(svc => configureDI(svc, config))
        .useAuthentication({
            defaultScheme: 'jwt',
            schemes: [
                jwtScheme({
                    secret: config.jwt.secret,
                    mapClaims: claims => ({
                        userId: Number(claims.sub),
                        role: claims.role as string
                    })
                })
            ]
        })
        .useAuthorization()
        .withHealthcheck();

    // ── OpenAPI spec endpoint (using generateOpenApiSpec directly for tags + webhooks support)

    const openApiEndpoint = endpoint
        .get('/openapi.json')
        .summary('OpenAPI specification')
        .tags('OpenAPI')
        .operationId('getOpenApiSpec');

    let cachedSpec: OpenApiDocument | null = null;

    const openApiHandler = (): OpenApiDocument => {
        if (!cachedSpec) {
            cachedSpec = generateOpenApiSpec({
                server,
                info: {
                    title: 'ToDo Management API',
                    version: '1.0.0',
                    description:
                        'A production-ready ToDo management REST API built with @cleverbrush/server, ' +
                        'featuring JWT authentication, role-based access control (user / admin), ' +
                        'full CRUD operations, and demonstrations of every OpenAPI 3.1 feature ' +
                        'supported by the framework.'
                },
                servers: [
                    {
                        url: `http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}`,
                        description: 'Local server'
                    }
                ],
                tags: [
                    {
                        name: 'auth',
                        description:
                            'Authentication endpoints — register new accounts and obtain JWT tokens.'
                    },
                    {
                        name: 'todos',
                        description:
                            'CRUD operations on todos, plus import/export, file downloads, and event handling.',
                        externalDocs: {
                            url: 'https://github.com/cleverbrush/framework',
                            description: 'Framework repository'
                        }
                    },
                    {
                        name: 'users',
                        description:
                            'User management — profile retrieval and admin user operations.'
                    },
                    {
                        name: 'webhooks',
                        description:
                            'Webhook subscription and out-of-band notification definitions.'
                    },
                    {
                        name: 'admin',
                        description:
                            'Administrative endpoints — activity logs, system monitoring (admin only).'
                    },
                    {
                        name: 'OpenAPI',
                        description:
                            'The auto-generated OpenAPI 3.1 specification for this API.'
                    }
                ]
            });
        }
        return cachedSpec;
    };

    // ── Register webhooks on the server (for getWebhooks() introspection)
    server.webhook(todoCreatedWebhook).webhook(todoCompletedWebhook);

    // ── Register all contract endpoints via compile-time checked mapping
    server
        .handle(openApiEndpoint, openApiHandler)
        .handleAll(
            mapHandlers(endpoints, {
                ...handlers,
                todos: {
                    ...handlers.todos,
                    exportCsv: {
                        handler: exportTodosHandler,
                        middlewares: [auditLogMiddleware]
                    }
                },
                admin: {
                    activityLog: {
                        handler: activityLogHandler,
                        middlewares: [timingMiddleware]
                    }
                }
            })
        );

    return server;
}
