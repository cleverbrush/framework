import { jwtScheme } from '@cleverbrush/auth';
import { createServer, type Middleware } from '@cleverbrush/server';
import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';
import { JWT_SECRET, PORT } from './config.js';
import {
    createTodoEp,
    deleteAllTodosEp,
    deleteTodoEp,
    getTodoEp,
    listTodosEp,
    listUsersEp,
    loginEp,
    SomeRouteGet,
    SomeRoutePost,
    updateTodoEp
} from './endpoints.js';
import { deleteAllTodos, listUsers } from './handlers/admin.js';
import { login } from './handlers/auth.js';
import {
    createTodo,
    deleteTodo,
    getTodo,
    listTodos,
    updateTodo
} from './handlers/todos.js';

// ---------------------------------------------------------------------------
// CORS middleware (permissive, for local dev)
// ---------------------------------------------------------------------------

const cors: Middleware = async (ctx, next) => {
    ctx.response.setHeader('access-control-allow-origin', '*');
    ctx.response.setHeader(
        'access-control-allow-methods',
        'GET,POST,PATCH,DELETE,OPTIONS'
    );
    ctx.response.setHeader(
        'access-control-allow-headers',
        'content-type,authorization'
    );
    if (ctx.method === 'OPTIONS') {
        ctx.response.writeHead(204);
        ctx.response.end();
        ctx.responded = true;
        return;
    }
    await next();
};

// ---------------------------------------------------------------------------
// Build server
// ---------------------------------------------------------------------------

const builder = createServer()
    .use(cors)
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [
            jwtScheme({
                secret: JWT_SECRET,
                mapClaims: claims => ({
                    userId: claims.sub as string,
                    name: (claims.name as string) ?? claims.sub,
                    role: claims.role as string
                })
            })
        ]
    })
    .useAuthorization()

    // --- Auth -----------------------------------------------------------
    .handle(loginEp, login)

    // --- Todos ----------------------------------------------------------
    .handle(listTodosEp, listTodos)
    .handle(getTodoEp, getTodo)
    .handle(createTodoEp, createTodo)
    .handle(updateTodoEp, updateTodo)
    .handle(deleteTodoEp, deleteTodo)
    .handle(
        SomeRouteGet,
        async ({ context: _context, params }) =>
            `Hello world! You requested id: ${params.id}`
    )
    .handle(SomeRoutePost, async ({ body }) => `You said: ${body.msg}`)

    // --- Admin ----------------------------------------------------------
    .handle(deleteAllTodosEp, deleteAllTodos)
    .handle(listUsersEp, listUsers);

// --- OpenAPI endpoint (registered after all other handlers) ----------------
const { endpoint: openApiEp, handler: openApiHandler } = createOpenApiEndpoint({
    getRegistrations: () => builder.getRegistrations(),
    info: {
        title: 'Todo API',
        version: '1.0.0',
        description:
            'A simple in-memory Todo API with JWT auth and role-based access control.'
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local' }],
    authConfig: builder.getAuthenticationConfig()
});
builder.handle(openApiEp, openApiHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = await builder.listen(PORT);
const addr = server.address;

console.log(`\n  Todo API running at http://${addr!.host}:${addr!.port}`);
console.log(
    `  OpenAPI spec:       http://${addr!.host}:${addr!.port}/openapi.json`
);
console.log();
console.log('  Test accounts:');
console.log('    alice / alice123  (admin)');
console.log('    bob   / bob123    (user)');
console.log('    carol / carol123  (user)');
console.log();
console.log('  Quick start:');
console.log(
    `    curl -s -X POST http://localhost:${addr!.port}/api/auth/login \\`
);
console.log("         -H 'content-type: application/json' \\");
console.log('         -d \'{"username":"alice","password":"alice123"}\'');
console.log();
