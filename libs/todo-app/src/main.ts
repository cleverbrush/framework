import { defineRoles, jwtScheme, signJwt } from '@cleverbrush/auth';
import { array, boolean, number, object, string } from '@cleverbrush/schema';
import {
    ActionResult,
    createServer,
    endpoint,
    ForbiddenError,
    type Middleware,
    NotFoundError,
    route
} from '@cleverbrush/server';
import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'todo-app-dev-secret';

// ---------------------------------------------------------------------------
// Roles & Principal
// ---------------------------------------------------------------------------

const Roles = defineRoles({ user: 'user', admin: 'admin' });

const IPrincipal = object({
    userId: string(),
    name: string(),
    role: string()
});

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

interface Todo {
    id: number;
    title: string;
    completed: boolean;
    ownerId: string;
}

let nextId = 1;
const todos = new Map<number, Todo>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateTodoBody = object({
    title: string().minLength(1).maxLength(200)
});

const UpdateTodoBody = object({
    title: string().minLength(1).maxLength(200).optional(),
    completed: boolean().optional()
});

const TodoSchema = object({
    id: number(),
    title: string(),
    completed: boolean(),
    ownerId: string()
});

const TodoListSchema = array(TodoSchema);

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

const ById = route({ id: number().coerce() })`/${t => t.id}`;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// Public
const loginEp = endpoint
    .post('/api/auth/login')
    .body(object({ username: string(), password: string() }))
    .summary('Authenticate and receive a JWT')
    .tags('Auth')
    .operationId('login')
    .returns(object({ token: string() }));

// Authenticated (any role)
const listTodosEp = endpoint
    .resource('/api/todos')
    .get()
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .query(object({ ownerId: string().optional() }))
    .summary('List todos')
    .description(
        'Returns todos visible to the caller. Regular users see only their own; admins can filter by ownerId.'
    )
    .tags('Todos')
    .operationId('listTodos')
    .returns(TodoListSchema);

const getTodoEp = endpoint
    .resource('/api/todos')
    .get(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .summary('Get a todo by id')
    .tags('Todos')
    .operationId('getTodo')
    .returns(TodoSchema);

const createTodoEp = endpoint
    .resource('/api/todos')
    .post()
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .body(CreateTodoBody)
    .summary('Create a new todo')
    .tags('Todos')
    .operationId('createTodo')
    .returns(TodoSchema);

const updateTodoEp = endpoint
    .resource('/api/todos')
    .patch(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .body(UpdateTodoBody)
    .summary('Update a todo')
    .tags('Todos')
    .operationId('updateTodo')
    .returns(TodoSchema);

const deleteTodoEp = endpoint
    .resource('/api/todos')
    .delete(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .summary('Delete a todo')
    .tags('Todos')
    .operationId('deleteTodo');

// Admin-only
const deleteAllTodosEp = endpoint
    .delete('/api/admin/todos')
    .authorize(IPrincipal, Roles.admin)
    .summary('Delete all todos (admin)')
    .tags('Admin')
    .operationId('deleteAllTodos');

const listUsersEp = endpoint
    .get('/api/admin/users')
    .authorize(IPrincipal, Roles.admin)
    .summary('List known user ids')
    .description('Returns the set of unique owner ids from all todos.')
    .tags('Admin')
    .operationId('listUsers')
    .returns(array(string()));

// ---------------------------------------------------------------------------
// Fake user database (for the login endpoint)
// ---------------------------------------------------------------------------

const USERS: Record<string, { password: string; name: string; role: string }> =
    {
        alice: { password: 'alice123', name: 'Alice', role: 'admin' },
        bob: { password: 'bob123', name: 'Bob', role: 'user' },
        carol: { password: 'carol123', name: 'Carol', role: 'user' }
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertCanAccess(
    principal: { userId: string; role: string },
    todo: Todo
): void {
    if (principal.role !== 'admin' && todo.ownerId !== principal.userId) {
        throw new ForbiddenError('You can only access your own todos');
    }
}

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
    .handle(loginEp, ({ body: { username, password } }) => {
        const user = USERS[username];
        if (!user || user.password !== password) {
            return ActionResult.json(
                { error: 'Invalid username or password' },
                401
            );
        }
        const token = signJwt(
            { sub: username, name: user.name, role: user.role },
            JWT_SECRET
        );
        return { token };
    })

    // --- Todos ----------------------------------------------------------
    .handle(listTodosEp, ({ principal, query }) => {
        const all = [...todos.values()];
        if (principal.role === 'admin' && query.ownerId) {
            return all.filter(t => t.ownerId === query.ownerId);
        }
        if (principal.role !== 'admin') {
            return all.filter(t => t.ownerId === principal.userId);
        }
        return all;
    })

    .handle(getTodoEp, ({ params, principal }) => {
        const todo = todos.get(params.id);
        if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
        assertCanAccess(principal, todo);
        return todo;
    })

    .handle(createTodoEp, ({ body, principal }) => {
        const todo: Todo = {
            id: nextId++,
            title: body.title,
            completed: false,
            ownerId: principal.userId
        };
        todos.set(todo.id, todo);
        return ActionResult.created(todo, `/api/todos/${todo.id}`);
    })

    .handle(updateTodoEp, ({ params, body, principal }) => {
        const todo = todos.get(params.id);
        if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
        assertCanAccess(principal, todo);
        if (body.title !== undefined) todo.title = body.title;
        if (body.completed !== undefined) todo.completed = body.completed;
        return todo;
    })

    .handle(deleteTodoEp, ({ params, principal }) => {
        const todo = todos.get(params.id);
        if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
        assertCanAccess(principal, todo);
        todos.delete(params.id);
        return ActionResult.noContent();
    })

    // --- Admin ----------------------------------------------------------
    .handle(deleteAllTodosEp, () => {
        todos.clear();
        nextId = 1;
        return ActionResult.noContent();
    })

    .handle(listUsersEp, () => {
        const owners = new Set<string>();
        for (const t of todos.values()) owners.add(t.ownerId);
        return [...owners];
    });

// --- OpenAPI endpoint (must be registered after all other .handle() calls) ---
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
