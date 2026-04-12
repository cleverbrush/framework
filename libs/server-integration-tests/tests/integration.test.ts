import http from 'node:http';
import { any, number, object, string } from '@cleverbrush/schema';
import {
    ActionResult,
    createServer,
    endpoint,
    type Handler,
    type Middleware,
    NotFoundError,
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
// ENDPOINT-BASED API TESTS
// ===========================================================================

// ===========================================================================
// E1. Todo CRUD lifecycle using endpoint-based API
// ===========================================================================

describe('Endpoint: Todo CRUD lifecycle', () => {
    let server: Server;

    const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;
    const todosApi = endpoint.resource('/api/todos');

    const listTodos = todosApi.get();
    const getTodoById = todosApi.get(ByIdPath);
    const createTodoEp = todosApi.post().body(object({ title: string() }));
    const updateTodoEp = todosApi.patch(ByIdPath).body(
        object({
            title: string().optional(),
            completed: any().optional()
        })
    );
    const deleteTodoEp = todosApi.delete(ByIdPath);

    let todos: Map<number, { id: number; title: string; completed: boolean }>;
    let nextId: number;

    const listHandler: Handler<typeof listTodos> = async () => {
        return [...todos.values()];
    };

    const getByIdHandler: Handler<typeof getTodoById> = async ({ params }) => {
        const todo = todos.get(params.id);
        if (!todo) throw new NotFoundError(`Todo ${params.id} not found`);
        return todo;
    };

    const createHandler: Handler<typeof createTodoEp> = async ({
        body: { title }
    }) => {
        const todo = { id: nextId++, title, completed: false };
        todos.set(todo.id, todo);
        return ActionResult.created(todo, `/api/todos/${todo.id}`);
    };

    const updateHandler: Handler<typeof updateTodoEp> = async ({
        params: { id },
        body: patch
    }) => {
        const todo = todos.get(id);
        if (!todo) throw new NotFoundError(`Todo ${id} not found`);
        if (patch.title !== undefined) todo.title = patch.title;
        if (patch.completed !== undefined) todo.completed = patch.completed;
        return todo;
    };

    const removeHandler: Handler<typeof deleteTodoEp> = async ({
        params: { id }
    }) => {
        const todo = todos.get(id);
        if (!todo) throw new NotFoundError(`Todo ${id} not found`);
        todos.delete(id);
        return ActionResult.noContent();
    };

    beforeEach(async () => {
        todos = new Map();
        nextId = 1;

        server = await createServer()
            .handle(listTodos, listHandler)
            .handle(getTodoById, getByIdHandler)
            .handle(createTodoEp, createHandler)
            .handle(updateTodoEp, updateHandler)
            .handle(deleteTodoEp, removeHandler)
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
// E2. Endpoint query parameter extraction
// ===========================================================================

describe('Endpoint: query parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('resolves named query parameters', async () => {
        const searchEp = endpoint.get('/api/search').query(
            object({
                q: string(),
                limit: number().coerce()
            })
        );

        const handler: Handler<typeof searchEp> = async ({
            query: { q, limit }
        }) => {
            return { q, limit };
        };

        server = await createServer().handle(searchEp, handler).listen(0);

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
// E3. Endpoint header parameter extraction
// ===========================================================================

describe('Endpoint: header parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('resolves named header parameters', async () => {
        const checkEp = endpoint
            .get('/api/check')
            .headers(object({ 'x-api-key': string() }));

        const handler: Handler<typeof checkEp> = ({ headers }) => {
            return { token: headers['x-api-key'] };
        };

        server = await createServer().handle(checkEp, handler).listen(0);

        const res = await request(server, 'GET', '/api/check', {
            headers: { 'x-api-key': 'secret-123' }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ token: 'secret-123' });
    });
});

// ===========================================================================
// E4. Endpoint context injection
// ===========================================================================

describe('Endpoint: context injection', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('injects RequestContext via context key', async () => {
        const infoEp = endpoint.get('/api/info');

        const handler: Handler<typeof infoEp> = ({ context: ctx }) => {
            return {
                method: ctx.method,
                path: ctx.url.pathname,
                host: ctx.headers['host']
            };
        };

        server = await createServer().handle(infoEp, handler).listen(0);

        const res = await request(server, 'GET', '/api/info');
        expect(res.status).toBe(200);
        const data = json(res);
        expect(data.method).toBe('GET');
        expect(data.path).toBe('/api/info');
    });
});

// ===========================================================================
// E5. Endpoint middleware (global and per-route)
// ===========================================================================

describe('Endpoint: middleware', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('global middleware executes in registration order (onion model)', async () => {
        const ep = endpoint.get('/api/test');
        const order: string[] = [];

        const handler: Handler<typeof ep> = () => {
            order.push('handler');
            return 'ok';
        };

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
            .handle(ep, handler)
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

    it('per-route middleware runs after global middleware', async () => {
        const ep = endpoint.get('/api/test');
        const order: string[] = [];

        const handler: Handler<typeof ep> = () => {
            order.push('handler');
            return 'ok';
        };

        const globalMw: Middleware = async (_ctx, next) => {
            order.push('global');
            await next();
        };
        const routeMw: Middleware = async (_ctx, next) => {
            order.push('route');
            await next();
        };

        server = await createServer()
            .use(globalMw)
            .handle(ep, handler, { middlewares: [routeMw] })
            .listen(0);

        await request(server, 'GET', '/api/test');
        expect(order).toEqual(['global', 'route', 'handler']);
    });

    it('middleware can short-circuit by not calling next()', async () => {
        const ep = endpoint.get('/api/secure');
        let handlerCalled = false;

        const handler: Handler<typeof ep> = () => {
            handlerCalled = true;
            return 'should not reach';
        };

        const authMw: Middleware = async (ctx, _next) => {
            ctx.response.writeHead(401, {
                'content-type': 'application/json'
            });
            ctx.response.end(JSON.stringify({ error: 'Unauthorized' }));
            ctx.responded = true;
        };

        server = await createServer().use(authMw).handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/api/secure');
        expect(res.status).toBe(401);
        expect(json(res)).toEqual({ error: 'Unauthorized' });
        expect(handlerCalled).toBe(false);
    });

    it('middleware can store data in context items for the handler', async () => {
        const ep = endpoint.get('/api/whoami');

        const handler: Handler<typeof ep> = ({ context: ctx }) => {
            return { user: ctx.items.get('userId') };
        };

        const authMw: Middleware = async (ctx, next) => {
            ctx.items.set('userId', 'user-42');
            await next();
        };

        server = await createServer().use(authMw).handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/api/whoami');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ user: 'user-42' });
    });
});

// ===========================================================================
// E6. Endpoint error handling
// ===========================================================================

describe('Endpoint: error handling', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('returns RFC 9457 ProblemDetails for HttpError subclasses', async () => {
        const ep = endpoint.get('/api/missing');
        const handler: Handler<typeof ep> = async () => {
            throw new NotFoundError('Resource not found');
        };

        server = await createServer().handle(ep, handler).listen(0);

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
        const ep = endpoint.get('/api/crash');
        const handler: Handler<typeof ep> = () => {
            throw new Error('database connection lost');
        };

        server = await createServer().handle(ep, handler).listen(0);

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
        const ep = endpoint.get('/api/known');
        const handler: Handler<typeof ep> = () => 'ok';

        server = await createServer().handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/nothing-here');
        expect(res.status).toBe(404);
    });

    it('returns 405 with Allow header listing valid methods', async () => {
        const listEp = endpoint.get('/api/items');
        const createEp = endpoint.post('/api/items');

        server = await createServer()
            .handle(listEp, () => [])
            .handle(createEp, () => ({}))
            .listen(0);

        const res = await request(server, 'DELETE', '/api/items');
        expect(res.status).toBe(405);
        const allow = res.headers['allow'];
        expect(allow).toBeDefined();
        expect(allow).toContain('GET');
        expect(allow).toContain('POST');
    });

    it('returns 400 with validation errors for invalid body', async () => {
        const ep = endpoint
            .post('/api/users')
            .body(object({ name: string(), age: number() }));
        const handler: Handler<typeof ep> = async () => {
            return { ok: true };
        };

        server = await createServer().handle(ep, handler).listen(0);

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
// E7. Endpoint ActionResult factories
// ===========================================================================

describe('Endpoint: ActionResult', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('ActionResult.ok() returns 200', async () => {
        const ep = endpoint.get('/api/ok');
        server = await createServer()
            .handle(ep, () => ActionResult.ok({ message: 'hello' }))
            .listen(0);

        const res = await request(server, 'GET', '/api/ok');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ message: 'hello' });
    });

    it('ActionResult.created() returns 201 with location', async () => {
        const ep = endpoint.post('/api/resources');
        server = await createServer()
            .handle(ep, () =>
                ActionResult.created({ id: 5 }, '/api/resources/5')
            )
            .listen(0);

        const res = await request(server, 'POST', '/api/resources');
        expect(res.status).toBe(201);
        expect(res.headers['location']).toBe('/api/resources/5');
        expect(json(res)).toEqual({ id: 5 });
    });

    it('ActionResult.noContent() returns 204 with empty body', async () => {
        const ep = endpoint.delete('/api/item');
        server = await createServer()
            .handle(ep, () => ActionResult.noContent())
            .listen(0);

        const res = await request(server, 'DELETE', '/api/item');
        expect(res.status).toBe(204);
        expect(res.body).toBe('');
    });

    it('ActionResult.redirect() returns 302', async () => {
        const ep = endpoint.get('/api/old');
        server = await createServer()
            .handle(ep, () => ActionResult.redirect('/api/new-location'))
            .listen(0);

        const res = await request(server, 'GET', '/api/old');
        expect(res.status).toBe(302);
        expect(res.headers['location']).toBe('/api/new-location');
    });

    it('null return produces 204', async () => {
        const ep = endpoint.post('/api/noop');
        server = await createServer()
            .handle(ep, () => null)
            .listen(0);

        const res = await request(server, 'POST', '/api/noop');
        expect(res.status).toBe(204);
    });
});

// ===========================================================================
// E8. Endpoint + controller coexistence
// ===========================================================================

describe('Endpoint: parseString path parameters', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('parses single numeric path segment with coercion', async () => {
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;
        const ep = endpoint.get('/items', ByIdPath);

        const handler: Handler<typeof ep> = ({ params: { id } }) => {
            return { id, type: typeof id };
        };

        server = await createServer().handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/items/42');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ id: 42, type: 'number' });
    });

    it('parses multi-segment path', async () => {
        const NestedPath = route({
            orgId: number().coerce(),
            teamId: number().coerce()
        })`/${t => t.orgId}/teams/${t => t.teamId}`;

        const ep = endpoint.get('/api', NestedPath);

        const handler: Handler<typeof ep> = ({ params }) => {
            return params;
        };

        server = await createServer().handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/api/10/teams/3');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ orgId: 10, teamId: 3 });
    });
});

// ===========================================================================
// E9. Endpoint dependency injection via .inject()
// ===========================================================================

describe('Endpoint: dependency injection via .inject()', () => {
    let server: Server;

    afterEach(async () => {
        await server.close();
    });

    it('injects a singleton service into the handler as second param', async () => {
        const IGreeter = any();

        const ep = endpoint.get('/api/greet').inject({ greeter: IGreeter });

        const handler: Handler<typeof ep> = (_ctx, { greeter }) => {
            return { message: greeter.greet('World') };
        };

        server = await createServer()
            .services(svc => {
                svc.addSingleton(IGreeter, {
                    greet: (name: string) => `Hello, ${name}!`
                });
            })
            .handle(ep, handler)
            .listen(0);

        const res = await request(server, 'GET', '/api/greet');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ message: 'Hello, World!' });
    });

    it('injects multiple services', async () => {
        const IConfig = any();
        const IFormatter = any();

        const ep = endpoint
            .get('/api/info')
            .inject({ config: IConfig, formatter: IFormatter });

        const handler: Handler<typeof ep> = (_ctx, { config, formatter }) => {
            return { result: formatter.format(config.appName) };
        };

        server = await createServer()
            .services(svc => {
                svc.addSingleton(IConfig, { appName: 'TestApp' });
                svc.addSingleton(IFormatter, {
                    format: (s: string) => s.toUpperCase()
                });
            })
            .handle(ep, handler)
            .listen(0);

        const res = await request(server, 'GET', '/api/info');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ result: 'TESTAPP' });
    });

    it('scoped services are isolated per request', async () => {
        const ICounter = any();
        let instanceCount = 0;

        const ep = endpoint.get('/api/count').inject({ counter: ICounter });

        const handler: Handler<typeof ep> = (_ctx, { counter }) => {
            counter.value++;
            return { value: counter.value };
        };

        server = await createServer()
            .services(svc => {
                svc.addScoped(ICounter, () => {
                    instanceCount++;
                    return { value: 0 };
                });
            })
            .handle(ep, handler)
            .listen(0);

        const r1 = await request(server, 'GET', '/api/count');
        const r2 = await request(server, 'GET', '/api/count');
        expect(json(r1)).toEqual({ value: 1 });
        expect(json(r2)).toEqual({ value: 1 }); // Fresh instance per request
        expect(instanceCount).toBe(2);
    });

    it('works alongside params, body, query, and headers', async () => {
        const IStore = any();
        const ByIdPath = route({ id: number().coerce() })`/${t => t.id}`;

        const ep = endpoint
            .patch('/api/items', ByIdPath)
            .body(object({ value: string() }))
            .query(object({ verbose: string().optional() }))
            .headers(object({ 'x-trace': string() }))
            .inject({ store: IStore });

        const handler: Handler<typeof ep> = (
            { params, body, query, headers },
            { store }
        ) => {
            store.set(params.id, body.value);
            return {
                id: params.id,
                value: body.value,
                verbose: query.verbose,
                trace: headers['x-trace'],
                storeSize: store.size
            };
        };

        const store = new Map<number, string>();

        server = await createServer()
            .services(svc => {
                svc.addSingleton(IStore, store);
            })
            .handle(ep, handler)
            .listen(0);

        const res = await request(server, 'PATCH', '/api/items/7?verbose=yes', {
            body: { value: 'hello' },
            headers: { 'x-trace': 'abc-123' }
        });
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({
            id: 7,
            value: 'hello',
            verbose: 'yes',
            trace: 'abc-123',
            storeSize: 1
        });
        expect(store.get(7)).toBe('hello');
    });

    it('handler without .inject() still works (backwards compatible)', async () => {
        const ep = endpoint.get('/api/simple');

        const handler: Handler<typeof ep> = () => {
            return { ok: true };
        };

        server = await createServer().handle(ep, handler).listen(0);

        const res = await request(server, 'GET', '/api/simple');
        expect(res.status).toBe(200);
        expect(json(res)).toEqual({ ok: true });
    });
});
