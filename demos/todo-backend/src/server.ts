import { jwtScheme } from '@cleverbrush/auth';
import type { Logger } from '@cleverbrush/log';
import { useLogging } from '@cleverbrush/log';
import {
    createServer,
    endpoint,
    type Middleware,
    mapHandlers
} from '@cleverbrush/server';
import { tracingMiddleware } from '@cleverbrush/otel';
import {
    generateOpenApiSpec,
    type OpenApiDocument,
    serveAsyncApi
} from '@cleverbrush/server-openapi';
import {
    endpoints,
    todoCompletedWebhook,
    todoCreatedWebhook
} from './api/endpoints.js';
import { activityLogHandler } from './api/handlers/admin.js';
import { handlers } from './api/handlers/index.js';
import { exportTodosHandler } from './api/handlers/todos.js';
import type { Config } from './config.js';
import { configureDI } from './di/setup.js';
import { AuditEnd, AuditStart } from './logTemplates.js';

// ── Per-endpoint middlewares ──────────────────────────────────────────────────

/** Audit logging middleware — logs export requests via structured logger. */
function createAuditLogMiddleware(logger: Logger): Middleware {
    const auditLog = logger.forContext('SourceContext', 'AuditLog');
    return async (ctx, next) => {
        const start = Date.now();
        auditLog.info(AuditStart, {
            Method: ctx.method,
            Path: ctx.url.pathname,
            Principal: String(ctx.principal ?? 'anonymous')
        });
        await next();
        auditLog.info(AuditEnd, {
            Method: ctx.method,
            Path: ctx.url.pathname,
            Elapsed: Date.now() - start
        });
    };
}

/** Request timing middleware — adds X-Response-Time header. */
const timingMiddleware: Middleware = async (ctx, next) => {
    const start = Date.now();
    await next();
    ctx.response.setHeader('x-response-time', `${Date.now() - start}ms`);
};

export function buildServer(config: Config, logger: Logger) {
    const auditLogMiddleware = createAuditLogMiddleware(logger);

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
        ctx.response.setHeader(
            'Access-Control-Expose-Headers',
            'X-Trace-Id, X-Response-Time'
        );
        if (ctx.method === 'OPTIONS') {
            ctx.response.writeHead(204);
            ctx.response.end();
            return;
        }
        await next();
    };

    const [correlationMiddleware, requestLogMiddleware] = useLogging(logger, {
        excludePaths: ['/health'],
        correlationResponseHeader: false
    });

    const server = createServer()
        .use(tracingMiddleware({ excludePaths: ['/health'] }))
        .use(corsMiddleware)
        .use(correlationMiddleware)
        .use(requestLogMiddleware)
        .services(svc => configureDI(svc, config, logger))
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
        .withHealthcheck()
        .useBatching();

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

    // ── AsyncAPI spec middleware (registered after server is assigned)
    server.use(
        serveAsyncApi({
            server,
            info: {
                title: 'ToDo Management API – WebSocket',
                version: '1.0.0'
            },
            servers: {
                local: {
                    host: `${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}`,
                    protocol: 'ws'
                }
            }
        })
    );

    // ── Register webhooks on the server (for getWebhooks() introspection)
    server.webhook(todoCreatedWebhook).webhook(todoCompletedWebhook);

    // ── Register all contract endpoints via compile-time checked mapping
    server.handle(openApiEndpoint, openApiHandler).handleAll(
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
