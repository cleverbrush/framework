import { jwtScheme } from '@cleverbrush/auth';
import { createServer, type Middleware } from '@cleverbrush/server';
import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';
import {
    CreateTodoEndpoint,
    DeleteTodoEndpoint,
    DeleteUserEndpoint,
    GetTodoEndpoint,
    GetTodoWithAuthorEndpoint,
    ListTodosEndpoint,
    ListUsersEndpoint,
    LoginEndpoint,
    RegisterEndpoint,
    SendTodoEventEndpoint,
    UpdateTodoEndpoint
} from './api/endpoints.js';
import { loginHandler, registerHandler } from './api/handlers/auth.js';
import {
    createTodoHandler,
    deleteTodoHandler,
    getTodoHandler,
    getTodoWithAuthorHandler,
    listTodosHandler,
    sendTodoEventHandler,
    updateTodoHandler
} from './api/handlers/todos.js';
import { deleteUserHandler, listUsersHandler } from './api/handlers/users.js';
import type { Config } from './config.js';
import { configureDI } from './di/setup.js';

export function buildServer(config: Config) {
    const corsMiddleware: Middleware = async (ctx, next) => {
        ctx.response.setHeader('Access-Control-Allow-Origin', '*');
        ctx.response.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );
        ctx.response.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization'
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

    const { endpoint: openApiEndpoint, handler: openApiHandler } =
        createOpenApiEndpoint({
            getRegistrations: () => server.getRegistrations(),
            info: {
                title: 'ToDo Management API',
                version: '1.0.0',
                description:
                    'A production-ready ToDo management REST API built with @cleverbrush/server, featuring JWT authentication, role-based access control (user / admin), and full CRUD operations.'
            },
            servers: [
                {
                    url: `http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}`,
                    description: 'Local server'
                }
            ],
            path: '/openapi.json'
        });

    server
        .handle(openApiEndpoint, openApiHandler)
        // Auth
        .handle(RegisterEndpoint, registerHandler)
        .handle(LoginEndpoint, loginHandler)
        // Todos
        .handle(ListTodosEndpoint, listTodosHandler)
        .handle(GetTodoEndpoint, getTodoHandler)
        .handle(GetTodoWithAuthorEndpoint, getTodoWithAuthorHandler)
        .handle(CreateTodoEndpoint, createTodoHandler)
        .handle(UpdateTodoEndpoint, updateTodoHandler)
        .handle(DeleteTodoEndpoint, deleteTodoHandler)
        .handle(SendTodoEventEndpoint, sendTodoEventHandler)
        // Users (admin)
        .handle(ListUsersEndpoint, listUsersHandler)
        .handle(DeleteUserEndpoint, deleteUserHandler);

    return server;
}
