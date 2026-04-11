import http from 'node:http';
import { Readable } from 'node:stream';
import {
    any,
    func,
    number,
    object,
    promise,
    string
} from '@cleverbrush/schema';
import {
    ActionResult,
    body,
    context,
    createServer,
    defineController,
    header,
    type Middleware,
    NotFoundError,
    path,
    query,
    type RequestContext,
    route,
    type Server
} from '@cleverbrush/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Shared HTTP request helper
// ---------------------------------------------------------------------------

function request(
    server: Server,
    method: string,
    urlPath: string,
    options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}> {
    const addr = server.address!;
    return new Promise((resolve, reject) => {
        const reqHeaders: Record<string, string> = {
            ...(options.headers ?? {})
        };
        if (options.body !== undefined && !reqHeaders['content-type']) {
            reqHeaders['content-type'] = 'application/json';
        }

        const req = http.request(
            {
                hostname: addr.host === '0.0.0.0' ? '127.0.0.1' : addr.host,
                port: addr.port,
                path: urlPath,
                method,
                headers: reqHeaders
            },
            res => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode!,
                        headers: res.headers,
                        body: Buffer.concat(chunks).toString()
                    });
                });
            }
        );
        req.on('error', reject);
        if (options.body !== undefined) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

function json(res: { body: string }) {
    return JSON.parse(res.body);
}

// ===========================================================================
// 1. Todo CRUD lifecycle — realistic multi-endpoint integration
// ===========================================================================

describe('Integration: Todo CRUD lifecycle', () => {
    let server: Server;

    const TodoByIdPath = route({ id: number().coerce() })`/${t => t.id}`;

    const TodoControllerSchema = object({
        list: func().hasReturnType(promise(any())),
        getById: func()
            .addParameter(object({ id: number() }))
            .hasReturnType(promise(any())),
        create: func()
            .addParameter(object({ title: string() }))
            .hasReturnType(promise(any())),
        update: func()
            .addParameter(object({ id: number() }))
            .addParameter(
                object({
                    /** new to do item title */
                    title: string().optional(),
                    completed: any().optional()
                })
            )
            .hasReturnType(promise(any())),
        remove: func()
            .addParameter(object({ id: number() }))
            .hasReturnType(promise(any()))
    });

    let todos: Map<number, { id: number; title: string; completed: boolean }>;
    let nextId: number;

    const TodoController = defineController(TodoControllerSchema, {
        async list() {
            return [...todos.values()];
        },
        async getById({ id }) {
            const todo = todos.get(id);
            if (!todo) throw new NotFoundError(`Todo ${id} not found`);
            return todo;
        },
        async create({ title }) {
            const todo = { id: nextId++, title, completed: false };
            todos.set(todo.id, todo);
            return ActionResult.created(todo, `/api/todos/${todo.id}`);
        },
        async update({ id }, patch) {
            const todo = todos.get(id);
            if (!todo) throw new NotFoundError(`Todo ${id} not found`);
            if (patch.title !== undefined) todo.title = patch.title;
            if (patch.completed !== undefined) todo.completed = patch.completed;
            return todo;
        },
        async remove({ id }) {
            const todo = todos.get(id);
            if (!todo) throw new NotFoundError(`Todo ${id} not found`);
            todos.delete(id);
            return ActionResult.noContent();
        }
    });

    beforeEach(async () => {
        todos = new Map();
        nextId = 1;

        server = await createServer()
            .controller(TodoControllerSchema, TodoController, r =>
                r
                    .basePath('/api/todos')
                    .get(t => t.list, '/')
                    .get(
                        t => t.getById,
                        TodoByIdPath,
                        p => p.path()
                    )
                    .post(
                        t => t.create,
                        '/',
                        p => p.body()
                    )
                    .patch(
                        t => t.update,
                        TodoByIdPath,
                        p => p.path().body()
                    )
                    .delete(
                        t => t.remove,
                        TodoByIdPath,
                        p => p.path()
                    )
            )
            .listen(0);
    });

    afterEach(async () => {
        await server.close();
    });

    it('starts with an empty list', async () => {
        const res = await request(server, 'GET', '/api/todos/');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual([]);
    });

    it('creates a todo and returns 201 with location header', async () => {
        const res = await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });
        expect(res.status).toBe(201);
        expect(res.headers['location']).toBe('/api/todos/1');
        const todo = json(res);
        expect(todo).toEqual({ id: 1, title: 'Buy milk', completed: false });
    });

    it('lists created todos', async () => {
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Walk the dog' }
        });

        const res = await request(server, 'GET', '/api/todos/');
        expect(res.status).toBe(200);
        const list = json(res);
        expect(list).toHaveLength(2);
        expect(list[0].title).toBe('Buy milk');
        expect(list[1].title).toBe('Walk the dog');
    });

    it('gets a todo by id', async () => {
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });
        const res = await request(server, 'GET', '/api/todos/1');
        expect(res.status).toBe(200);
        expect(json(res).title).toBe('Buy milk');
    });

    it('updates a todo (partial patch)', async () => {
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });

        const res = await request(server, 'PATCH', '/api/todos/1', {
            body: { completed: true }
        });
        expect(res.status).toBe(200);
        const todo = json(res);
        expect(todo.completed).toBe(true);
        expect(todo.title).toBe('Buy milk');
    });

    it('renames a todo', async () => {
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });
        const res = await request(server, 'PATCH', '/api/todos/1', {
            body: { title: 'Buy oat milk' }
        });
        expect(res.status).toBe(200);
        expect(json(res).title).toBe('Buy oat milk');
    });

    it('deletes a todo with 204', async () => {
        await request(server, 'POST', '/api/todos/', {
            body: { title: 'Buy milk' }
        });
        const res = await request(server, 'DELETE', '/api/todos/1');
        expect(res.status).toBe(204);
        expect(res.body).toBe('');

        const list = await request(server, 'GET', '/api/todos/');
        expect(json(list)).toEqual([]);
    });

    it('returns 404 for non-existent todo', async () => {
        const res = await request(server, 'GET', '/api/todos/999');
        expect(res.status).toBe(404);
        const pd = json(res);
        expect(pd.title).toBe('Not Found');
        expect(pd.detail).toBe('Todo 999 not found');
    });

    it('returns 400 when required body field is missing', async () => {
        const res = await request(server, 'POST', '/api/todos/', {
            body: {}
        });
        expect(res.status).toBe(400);
        const pd = json(res);
        expect(pd.status).toBe(400);
        expect(pd.errors).toBeDefined();
    });

    it('returns 405 for unsupported method on a route', async () => {
        const res = await request(server, 'PUT', '/api/todos/1', {
            body: { title: 'x' }
        });
        expect(res.status).toBe(405);
        expect(res.headers['allow']).toBeDefined();
    });

    it('full lifecycle: create, read, update, delete, verify gone', async () => {
        const c = await request(server, 'POST', '/api/todos/', {
            body: { title: 'Test item' }
        });
        expect(c.status).toBe(201);
        const id = json(c).id;

        const r = await request(server, 'GET', `/api/todos/${id}`);
        expect(r.status).toBe(200);
        expect(json(r).title).toBe('Test item');

        const u = await request(server, 'PATCH', `/api/todos/${id}`, {
            body: { completed: true, title: 'Updated' }
        });
        expect(u.status).toBe(200);
        expect(json(u)).toMatchObject({
            id,
            title: 'Updated',
            completed: true
        });

        const d = await request(server, 'DELETE', `/api/todos/${id}`);
        expect(d.status).toBe(204);

        const g = await request(server, 'GET', `/api/todos/${id}`);
        expect(g.status).toBe(404);
    });
});

// ===========================================================================
// 2. Query parameter extraction
// ===========================================================================

describe('Integration: query parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('resolves named query parameters', async () => {
        const Schema = object({
            search: func()
                .addParameter(string())
                .addParameter(number().coerce())
                .hasReturnType(promise(any()))
        });
        class Controller {
            async search(q: string, limit: number) {
                return { q, limit };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    search: {
                        method: 'GET',
                        path: '/search',
                        params: [query('q'), query('limit')]
                    }
                }
            })
            .listen(0);

        const res = await request(
            server,
            'GET',
            '/api/search?q=hello&limit=10'
        );
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ q: 'hello', limit: 10 });
    });
});

// ===========================================================================
// 3. Header parameter extraction
// ===========================================================================

describe('Integration: header parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('resolves named header parameters', async () => {
        const Schema = object({
            check: func().addParameter(string()).hasReturnType(any())
        });
        class Controller {
            check(token: string) {
                return { token };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    check: {
                        method: 'GET',
                        path: '/check',
                        params: [header('x-api-key')]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/check', {
            headers: { 'x-api-key': 'secret-123' }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ token: 'secret-123' });
    });
});

// ===========================================================================
// 4. Context injection
// ===========================================================================

describe('Integration: context injection', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('injects RequestContext via context() param source', async () => {
        const Schema = object({
            info: func().addParameter(any()).hasReturnType(any())
        });
        class Controller {
            info(ctx: RequestContext) {
                return {
                    method: ctx.method,
                    path: ctx.url.pathname,
                    host: ctx.headers['host']
                };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    info: {
                        method: 'GET',
                        path: '/info',
                        params: [context()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/info');
        expect(res.status).toBe(200);
        const data = json(res);
        expect(data.method).toBe('GET');
        expect(data.path).toBe('/api/info');
    });
});

// ===========================================================================
// 5. Middleware (global and controller-level)
// ===========================================================================

describe('Integration: middleware', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('global middleware executes in registration order (onion model)', async () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        const order: string[] = [];

        class Controller {
            get() {
                order.push('handler');
                return 'ok';
            }
        }

        const mw1: Middleware = async (_ctx, next) => {
            order.push('global-1-before');
            await next();
            order.push('global-1-after');
        };
        const mw2: Middleware = async (_ctx, next) => {
            order.push('global-2-before');
            await next();
            order.push('global-2-after');
        };

        server = await createServer()
            .use(mw1)
            .use(mw2)
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/test' } }
            })
            .listen(0);

        await request(server, 'GET', '/api/test');
        expect(order).toEqual([
            'global-1-before',
            'global-2-before',
            'handler',
            'global-2-after',
            'global-1-after'
        ]);
    });

    it('controller-level middleware runs after global middleware', async () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        const order: string[] = [];

        class Controller {
            get() {
                order.push('handler');
                return 'ok';
            }
        }

        const globalMw: Middleware = async (_ctx, next) => {
            order.push('global');
            await next();
        };
        const controllerMw: Middleware = async (_ctx, next) => {
            order.push('controller');
            await next();
        };

        server = await createServer()
            .use(globalMw)
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/test' } },
                middlewares: [controllerMw]
            })
            .listen(0);

        await request(server, 'GET', '/api/test');
        expect(order).toEqual(['global', 'controller', 'handler']);
    });

    it('middleware can short-circuit by not calling next()', async () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        let handlerCalled = false;

        class Controller {
            get() {
                handlerCalled = true;
                return 'should not reach';
            }
        }

        const authMw: Middleware = async (ctx, _next) => {
            ctx.response.writeHead(401, {
                'content-type': 'application/json'
            });
            ctx.response.end(JSON.stringify({ error: 'Unauthorized' }));
            ctx.responded = true;
        };

        server = await createServer()
            .use(authMw)
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/secure' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/secure');
        expect(res.status).toBe(401);
        expect(json(res)).toEqual({ error: 'Unauthorized' });
        expect(handlerCalled).toBe(false);
    });

    it('middleware can store data in context items for the handler', async () => {
        const Schema = object({
            get: func().addParameter(any()).hasReturnType(any())
        });

        class Controller {
            get(ctx: RequestContext) {
                return { user: ctx.items.get('userId') };
            }
        }

        const authMw: Middleware = async (ctx, next) => {
            ctx.items.set('userId', 'user-42');
            await next();
        };

        server = await createServer()
            .use(authMw)
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    get: {
                        method: 'GET',
                        path: '/whoami',
                        params: [context()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/whoami');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ user: 'user-42' });
    });
});

// ===========================================================================
// 6. DI (dependency injection) integration
// ===========================================================================

describe('Integration: dependency injection', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('injects singleton dependency into controller', async () => {
        const IConfig = object({ dbUrl: string() });
        const Schema = object({
            getConfig: func().hasReturnType(any())
        }).addConstructor(func().addParameter(IConfig));

        const Controller = defineController(Schema, config => ({
            getConfig() {
                return { dbUrl: config.dbUrl };
            }
        }));

        server = await createServer()
            .services(svc => {
                svc.addSingleton(IConfig, {
                    dbUrl: 'postgres://localhost/test'
                });
            })
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    getConfig: { method: 'GET', path: '/config' }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/config');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ dbUrl: 'postgres://localhost/test' });
    });

    it('injects multiple dependencies', async () => {
        const ILogger = object({ name: string() });
        const IDb = object({ host: string() });
        const Schema = object({
            info: func().hasReturnType(any())
        }).addConstructor(func().addParameter(ILogger).addParameter(IDb));

        const Controller = defineController(Schema, (logger, db) => ({
            info() {
                return {
                    logger: logger.name,
                    db: db.host
                };
            }
        }));

        server = await createServer()
            .services(svc => {
                svc.addSingleton(ILogger, { name: 'app-logger' });
                svc.addSingleton(IDb, { host: 'db.local' });
            })
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { info: { method: 'GET', path: '/info' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/info');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({
            logger: 'app-logger',
            db: 'db.local'
        });
    });
});

// ===========================================================================
// 7. Multiple controllers
// ===========================================================================

describe('Integration: multiple controllers', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('routes requests to the correct controller', async () => {
        const UsersSchema = object({
            list: func().hasReturnType(any())
        });
        const PostsSchema = object({
            list: func().hasReturnType(any())
        });

        class UsersController {
            list() {
                return [{ name: 'Alice' }];
            }
        }
        class PostsController {
            list() {
                return [{ title: 'Hello World' }];
            }
        }

        server = await createServer()
            .controller(UsersSchema, UsersController, {
                basePath: '/api/users',
                routes: { list: { method: 'GET', path: '/' } }
            })
            .controller(PostsSchema, PostsController, {
                basePath: '/api/posts',
                routes: { list: { method: 'GET', path: '/' } }
            })
            .listen(0);

        const users = await request(server, 'GET', '/api/users/');
        const posts = await request(server, 'GET', '/api/posts/');
        expect(json(users)).toEqual([{ name: 'Alice' }]);
        expect(json(posts)).toEqual([{ title: 'Hello World' }]);
    });
});

// ===========================================================================
// 8. Error handling
// ===========================================================================

describe('Integration: error handling', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('returns RFC 9457 ProblemDetails for HttpError subclasses', async () => {
        const Schema = object({
            get: func().hasReturnType(promise(any()))
        });
        class Controller {
            async get() {
                throw new NotFoundError('Resource not found');
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/missing' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/missing');
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toContain(
            'application/problem+json'
        );
        const pd = json(res);
        expect(pd.status).toBe(404);
        expect(pd.title).toBe('Not Found');
        expect(pd.detail).toBe('Resource not found');
    });

    it('returns 500 ProblemDetails for unexpected errors without leaking details', async () => {
        const Schema = object({ get: func() });
        class Controller {
            get() {
                throw new Error('database connection lost');
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/crash' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/crash');
        expect(res.status).toBe(500);
        expect(res.headers['content-type']).toContain(
            'application/problem+json'
        );
        const pd = json(res);
        expect(pd.status).toBe(500);
        expect(pd.detail).toBeUndefined();
    });

    it('returns 404 for completely unknown path', async () => {
        const Schema = object({ get: func() });
        class Controller {
            get() {
                return 'ok';
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/known' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/nothing-here');
        expect(res.status).toBe(404);
    });

    it('returns 405 with Allow header listing valid methods', async () => {
        const Schema = object({
            list: func(),
            create: func()
        });
        class Controller {
            list() {
                return [];
            }
            create() {
                return {};
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    list: { method: 'GET', path: '/items' },
                    create: { method: 'POST', path: '/items' }
                }
            })
            .listen(0);

        const res = await request(server, 'DELETE', '/api/items');
        expect(res.status).toBe(405);
        const allow = res.headers['allow'];
        expect(allow).toBeDefined();
        expect(allow).toContain('GET');
        expect(allow).toContain('POST');
    });

    it('returns 400 with validation errors for invalid body', async () => {
        const Schema = object({
            create: func()
                .addParameter(object({ name: string(), age: number() }))
                .hasReturnType(promise(any()))
        });
        class Controller {
            async create(_data: any) {
                return { ok: true };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    create: {
                        method: 'POST',
                        path: '/users',
                        params: [body()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'POST', '/api/users', {
            body: { name: 123 }
        });
        expect(res.status).toBe(400);
        const pd = json(res);
        expect(pd.status).toBe(400);
        expect(pd.errors.length).toBeGreaterThan(0);
    });
});

// ===========================================================================
// 9. ActionResult factories
// ===========================================================================

describe('Integration: ActionResult', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('ActionResult.ok() returns 200', async () => {
        const Schema = object({ get: func() });
        class Controller {
            get() {
                return ActionResult.ok({ message: 'hello' });
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/ok' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/ok');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ message: 'hello' });
    });

    it('ActionResult.created() returns 201 with location', async () => {
        const Schema = object({ create: func() });
        class Controller {
            create() {
                return ActionResult.created({ id: 5 }, '/api/resources/5');
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { create: { method: 'POST', path: '/resources' } }
            })
            .listen(0);

        const res = await request(server, 'POST', '/api/resources');
        expect(res.status).toBe(201);
        expect(res.headers['location']).toBe('/api/resources/5');
        expect(json(res)).toEqual({ id: 5 });
    });

    it('ActionResult.noContent() returns 204 with empty body', async () => {
        const Schema = object({ del: func() });
        class Controller {
            del() {
                return ActionResult.noContent();
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { del: { method: 'DELETE', path: '/item' } }
            })
            .listen(0);

        const res = await request(server, 'DELETE', '/api/item');
        expect(res.status).toBe(204);
        expect(res.body).toBe('');
    });

    it('ActionResult.redirect() returns 302', async () => {
        const Schema = object({ go: func() });
        class Controller {
            go() {
                return ActionResult.redirect('/api/new-location');
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { go: { method: 'GET', path: '/old' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/old');
        expect(res.status).toBe(302);
        expect(res.headers['location']).toBe('/api/new-location');
    });

    it('null return produces 204', async () => {
        const Schema = object({ noop: func() });
        class Controller {
            noop() {
                return null;
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { noop: { method: 'POST', path: '/noop' } }
            })
            .listen(0);

        const res = await request(server, 'POST', '/api/noop');
        expect(res.status).toBe(204);
    });

    it('ActionResult.json() sets explicit status', async () => {
        const Schema = object({ get: func() });
        class Controller {
            get() {
                return ActionResult.json({ partial: true }, 206);
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { get: { method: 'GET', path: '/partial' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/partial');
        expect(res.status).toBe(206);
        expect(json(res)).toEqual({ partial: true });
    });

    it('ActionResult.redirect() permanent returns 301', async () => {
        const Schema = object({ go: func() });
        class Controller {
            go() {
                return ActionResult.redirect('/new', true);
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { go: { method: 'GET', path: '/old' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/old');
        expect(res.status).toBe(301);
        expect(res.headers['location']).toBe('/new');
    });

    it('ActionResult.status() returns bare status code', async () => {
        const Schema = object({ ping: func() });
        class Controller {
            ping() {
                return ActionResult.status(202, { 'x-queued': 'true' });
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { ping: { method: 'POST', path: '/ping' } }
            })
            .listen(0);

        const res = await request(server, 'POST', '/ping');
        expect(res.status).toBe(202);
        expect(res.headers['x-queued']).toBe('true');
        expect(res.body).toBe('');
    });

    it('ActionResult.file() sends binary with content-disposition', async () => {
        const Schema = object({ download: func() });
        class Controller {
            download() {
                const content = Buffer.from('hello,world\n1,2\n');
                return ActionResult.file(content, 'report.csv', 'text/csv');
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { download: { method: 'GET', path: '/report' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/report');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/csv');
        expect(res.headers['content-disposition']).toBe(
            'attachment; filename="report.csv"'
        );
        expect(res.body).toContain('hello,world');
    });

    it('ActionResult.content() serves HTML', async () => {
        const Schema = object({ page: func() });
        class Controller {
            page() {
                return ActionResult.content(
                    '<html><body>Hi</body></html>',
                    'text/html'
                );
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { page: { method: 'GET', path: '/page' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/page');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/html');
        expect(res.body).toContain('<html>');
    });

    it('ActionResult.stream() pipes a readable to the response', async () => {
        const Schema = object({ data: func() });
        class Controller {
            data() {
                const readable = Readable.from(['line1\n', 'line2\n']);
                return ActionResult.stream(
                    readable,
                    'text/plain',
                    'output.txt'
                );
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                routes: { data: { method: 'GET', path: '/data' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/data');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/plain');
        expect(res.headers['content-disposition']).toBe(
            'attachment; filename="output.txt"'
        );
        expect(res.body).toBe('line1\nline2\n');
    });
});

// ===========================================================================
// 10. parseString path parameters
// ===========================================================================

describe('Integration: parseString path parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('parses single numeric path segment with coercion', async () => {
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;
        const Schema = object({
            get: func()
                .addParameter(object({ id: number() }))
                .hasReturnType(any())
        });
        class Controller {
            get({ id }: { id: number }) {
                return { id, type: typeof id };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/items',
                routes: {
                    get: {
                        method: 'GET',
                        path: ByIdPath,
                        params: [path()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/items/42');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ id: 42, type: 'number' });
    });

    it('parses multi-segment path', async () => {
        const NestedPath = route({
            orgId: number().coerce(),
            teamId: number().coerce()
        })`/${t => t.orgId}/teams/${t => t.teamId}`;
        const Schema = object({
            get: func()
                .addParameter(object({ orgId: number(), teamId: number() }))
                .hasReturnType(any())
        });
        class Controller {
            get(params: { orgId: number; teamId: number }) {
                return params;
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    get: {
                        method: 'GET',
                        path: NestedPath,
                        params: [path()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/10/teams/3');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ orgId: 10, teamId: 3 });
    });

    it('returns 404 when path segment does not match pattern', async () => {
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;
        const Schema = object({
            get: func()
                .addParameter(object({ id: number() }))
                .hasReturnType(any())
        });
        class Controller {
            get({ id }: { id: number }) {
                return { id };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/items',
                routes: {
                    get: {
                        method: 'GET',
                        path: ByIdPath,
                        params: [path()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/items/abc/extra');
        expect(res.status).toBe(404);
    });
});

// ===========================================================================
// 10b. route() static path variants
// ===========================================================================

describe('Integration: route() static path variants', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('route`/static` — tagged template directly on route', async () => {
        const StaticPath = route`/hello`;
        const Schema = object({
            get: func().hasReturnType(any())
        });
        class Controller {
            get() {
                return { msg: 'world' };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    get: { method: 'GET', path: StaticPath }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/hello');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ msg: 'world' });
    });

    it('route()`/static` — called with no args then tagged template', async () => {
        const StaticPath = route()`/hello`;
        const Schema = object({
            get: func().hasReturnType(any())
        });
        class Controller {
            get() {
                return { msg: 'world' };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    get: { method: 'GET', path: StaticPath }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/hello');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ msg: 'world' });
    });

    it('plain string path — "/static"', async () => {
        const Schema = object({
            get: func().hasReturnType(any())
        });
        class Controller {
            get() {
                return { msg: 'world' };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: {
                    get: { method: 'GET', path: '/hello' }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/hello');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ msg: 'world' });
    });
});

// ===========================================================================
// 11. Server lifecycle
// ===========================================================================

describe('Integration: server lifecycle', () => {
    it('listen(0) assigns a random available port', async () => {
        const Schema = object({ ping: func() });
        class Controller {
            ping() {
                return 'pong';
            }
        }

        const server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { ping: { method: 'GET', path: '/ping' } }
            })
            .listen(0);

        try {
            const addr = server.address;
            expect(addr).not.toBeNull();
            expect(addr!.port).toBeGreaterThan(0);
        } finally {
            await server.close();
        }
    });

    it('close() stops accepting connections', async () => {
        const Schema = object({ ping: func() });
        class Controller {
            ping() {
                return 'pong';
            }
        }

        const server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { ping: { method: 'GET', path: '/ping' } }
            })
            .listen(0);

        const addr = server.address!;
        await server.close();

        await expect(
            new Promise((resolve, reject) => {
                const req = http.request(
                    {
                        hostname: '127.0.0.1',
                        port: addr.port,
                        path: '/api/ping'
                    },
                    resolve
                );
                req.on('error', reject);
                req.end();
            })
        ).rejects.toThrow();
    });

    it('close() is idempotent', async () => {
        const Schema = object({ ping: func() });
        class Controller {
            ping() {
                return 'pong';
            }
        }

        const server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { ping: { method: 'GET', path: '/ping' } }
            })
            .listen(0);

        await server.close();
        await expect(server.close()).resolves.toBeUndefined();
    });
});

// ===========================================================================
// 12. Content negotiation
// ===========================================================================

describe('Integration: content negotiation', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('returns application/json by default', async () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        class Controller {
            get() {
                return { ok: true };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/data' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/data');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/json');
        expect(json(res)).toEqual({ ok: true });
    });

    it('returns JSON for Accept: */*', async () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        class Controller {
            get() {
                return { ok: true };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/data' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/data', {
            headers: { accept: '*/*' }
        });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/json');
    });

    it('supports registering custom content type handlers', async () => {
        const Schema = object({
            get: func().hasReturnType(any())
        });
        class Controller {
            get() {
                return { name: 'Alice', age: 30 };
            }
        }

        server = await createServer()
            .contentType({
                mimeType: 'text/plain',
                serialize(value: unknown) {
                    return String(value);
                },
                deserialize(raw: string) {
                    return raw;
                }
            })
            .controller(Schema, Controller, {
                basePath: '/api',
                routes: { get: { method: 'GET', path: '/data' } }
            })
            .listen(0);

        const res = await request(server, 'GET', '/api/data', {
            headers: { accept: 'text/plain' }
        });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/plain');
    });
});

// ===========================================================================
// 13. Mixed parameter sources (path + body + query + header)
// ===========================================================================

describe('Integration: mixed parameter sources', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('combines path, body, query, and header params in one route', async () => {
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;

        const Schema = object({
            update: func()
                .addParameter(object({ id: number() }))
                .addParameter(object({ name: string() }))
                .addParameter(string())
                .addParameter(string())
                .hasReturnType(promise(any()))
        });

        class Controller {
            async update(
                pathParams: { id: number },
                bodyData: { name: string },
                format: string,
                auth: string
            ) {
                return {
                    id: pathParams.id,
                    name: bodyData.name,
                    format,
                    auth
                };
            }
        }

        server = await createServer()
            .controller(Schema, Controller, {
                basePath: '/api/items',
                routes: {
                    update: {
                        method: 'PUT',
                        path: ByIdPath,
                        params: [
                            path(),
                            body(),
                            query('format'),
                            header('authorization')
                        ]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'PUT', '/api/items/7?format=json', {
            body: { name: 'Widget' },
            headers: { authorization: 'Bearer xyz' }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({
            id: 7,
            name: 'Widget',
            format: 'json',
            auth: 'Bearer xyz'
        });
    });
});

// ===========================================================================
// 14. Parameter validation (validateAsync + RFC 9457 ProblemDetails)
// ===========================================================================

describe('Integration: Parameter validation', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('returns RFC 9457 problem details for invalid body', async () => {
        const Schema = object({
            create: func()
                .addParameter(object({ name: string(), age: number() }))
                .hasReturnType(promise(any()))
        });
        class Ctrl {
            async create(_data: any) {
                return { ok: true };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    create: {
                        method: 'POST',
                        path: '/users',
                        params: [body()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'POST', '/users', {
            body: { name: 123 }
        });
        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toBe('application/problem+json');

        const pd = json(res);
        expect(pd.type).toBe('https://httpstatuses.com/400');
        expect(pd.status).toBe(400);
        expect(pd.title).toBe('Bad Request');
        expect(pd.detail).toBe('One or more validation errors occurred.');
        expect(pd.errors).toBeInstanceOf(Array);
        expect(pd.errors.length).toBeGreaterThan(0);
        for (const err of pd.errors) {
            expect(err).toHaveProperty('pointer');
            expect(err).toHaveProperty('detail');
        }
    });

    it('returns validation errors for invalid query parameter', async () => {
        const Schema = object({
            search: func().addParameter(number()).hasReturnType(promise(any()))
        });
        class Ctrl {
            async search(_page: number) {
                return { page: _page };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    search: {
                        method: 'GET',
                        path: '/items',
                        params: [query('page')]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/items?page=abc');
        expect(res.status).toBe(400);

        const pd = json(res);
        expect(pd.status).toBe(400);
        expect(pd.errors).toBeInstanceOf(Array);
        expect(pd.errors.some((e: any) => e.pointer === '/query/page')).toBe(
            true
        );
    });

    it('returns validation errors for invalid header parameter', async () => {
        const Schema = object({
            get: func().addParameter(number()).hasReturnType(promise(any()))
        });
        class Ctrl {
            async get(_count: number) {
                return { count: _count };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    get: {
                        method: 'GET',
                        path: '/data',
                        params: [header('x-count')]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'GET', '/data', {
            headers: { 'x-count': 'not-a-number' }
        });
        expect(res.status).toBe(400);

        const pd = json(res);
        expect(
            pd.errors.some((e: any) => e.pointer === '/headers/x-count')
        ).toBe(true);
    });

    it('aggregates errors from body and query simultaneously', async () => {
        const Schema = object({
            create: func()
                .addParameter(object({ name: string(), email: string() }))
                .addParameter(number())
                .hasReturnType(promise(any()))
        });
        class Ctrl {
            async create(_data: any, _page: number) {
                return { ok: true };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    create: {
                        method: 'POST',
                        path: '/items',
                        params: [body(), query('page')]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'POST', '/items?page=bad', {
            body: { name: 42 } // invalid name, missing email
        });
        expect(res.status).toBe(400);

        const pd = json(res);
        const pointers = pd.errors.map((e: any) => e.pointer);
        expect(pointers).toContain('/body');
        expect(pointers).toContain('/query/page');
    });

    it('passes valid parameters through to controller', async () => {
        const Schema = object({
            create: func()
                .addParameter(object({ name: string(), age: number() }))
                .hasReturnType(promise(any()))
        });
        class Ctrl {
            async create(data: { name: string; age: number }) {
                return { received: data };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    create: {
                        method: 'POST',
                        path: '/users',
                        params: [body()]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'POST', '/users', {
            body: { name: 'Alice', age: 30 }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({
            received: { name: 'Alice', age: 30 }
        });
    });

    it('validates query and header while path comes from parseString', async () => {
        const ItemPath = route({ id: number().coerce() })`/${t => t.id}`;
        const Schema = object({
            get: func()
                .addParameter(object({ id: number() }))
                .addParameter(number())
                .addParameter(string())
                .hasReturnType(promise(any()))
        });
        class Ctrl {
            async get(pathObj: { id: number }, page: number, token: string) {
                return { id: pathObj.id, page, token };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    get: {
                        method: 'GET',
                        path: ItemPath,
                        params: [path(), query('page'), header('x-token')]
                    }
                }
            })
            .listen(0);

        // Invalid query, valid header
        const res = await request(server, 'GET', '/42?page=xyz', {
            headers: { 'x-token': 'my-token' }
        });
        expect(res.status).toBe(400);
        const pd = json(res);
        expect(pd.errors.some((e: any) => e.pointer === '/query/page')).toBe(
            true
        );
    });

    it('returns valid response when all param sources pass validation', async () => {
        const ItemPath = route({ id: number().coerce() })`/${t => t.id}`;
        const Schema = object({
            update: func()
                .addParameter(object({ id: number() }))
                .addParameter(object({ title: string() }))
                .addParameter(string())
                .hasReturnType(promise(any()))
        });
        class Ctrl {
            async update(
                pathObj: { id: number },
                bodyData: { title: string },
                auth: string
            ) {
                return { id: pathObj.id, title: bodyData.title, auth };
            }
        }

        server = await createServer()
            .controller(Schema, Ctrl, {
                routes: {
                    update: {
                        method: 'PUT',
                        path: ItemPath,
                        params: [path(), body(), header('authorization')]
                    }
                }
            })
            .listen(0);

        const res = await request(server, 'PUT', '/5', {
            body: { title: 'Updated' },
            headers: { authorization: 'Bearer abc' }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({
            id: 5,
            title: 'Updated',
            auth: 'Bearer abc'
        });
    });
});
