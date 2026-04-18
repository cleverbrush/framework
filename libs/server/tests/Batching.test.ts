import { number, object, string } from '@cleverbrush/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { endpoint, mapHandlers } from '../src/Endpoint.js';
import type { Server } from '../src/Server.js';
import { createServer } from '../src/Server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const api = {
    todos: {
        list: endpoint.get('/api/todos').returns(object({ items: object({}) })),
        get: endpoint
            .get('/api/todos/:id')
            .returns(object({ id: number(), title: string() })),
        create: endpoint
            .post('/api/todos')
            .body(object({ title: string() }))
            .returns(object({ id: number(), title: string() }))
    },
    users: {
        me: endpoint.get('/api/users/me').returns(object({ name: string() }))
    }
};

const handlers = mapHandlers(api, {
    todos: {
        list: () => ({ items: {} }),
        get: ({ params }: { params: { id: string } }) => ({
            id: Number(params.id),
            title: 'Test todo'
        }),
        create: ({ body }: { body: { title: string } }) => ({
            id: 42,
            title: body.title
        })
    },
    users: {
        me: () => ({ name: 'Alice' })
    }
});

async function makeServer(): Promise<{ server: Server; port: number }> {
    const server = await createServer()
        .useBatching()
        .handleAll(handlers)
        .listen(0); // OS-assigned port
    const port = server.address!.port;
    return { server, port };
}

async function post(
    port: number,
    path: string,
    body: unknown
): Promise<{ status: number; json: unknown }> {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { status: res.status, json: await res.json() };
}

// ---------------------------------------------------------------------------
// ServerBuilder.useBatching()
// ---------------------------------------------------------------------------

describe('ServerBuilder.useBatching()', () => {
    it('is chainable and returns the same builder', () => {
        const builder = createServer();
        const result = builder.useBatching();
        expect(result).toBe(builder);
    });

    it('accepts empty options', () => {
        expect(() => createServer().useBatching()).not.toThrow();
    });

    it('accepts partial options', () => {
        expect(() =>
            createServer().useBatching({ maxSize: 50, parallel: false })
        ).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Batch endpoint integration tests
// ---------------------------------------------------------------------------

describe('POST /__batch integration', () => {
    let server: Server;
    let port: number;

    afterEach(async () => {
        await server?.close();
    });

    it('processes multiple sub-requests and returns aggregated responses', async () => {
        ({ server, port } = await makeServer());

        const { status, json } = await post(port, '/__batch', {
            requests: [
                { method: 'GET', url: '/api/todos', headers: {} },
                { method: 'GET', url: '/api/users/me', headers: {} }
            ]
        });

        expect(status).toBe(200);
        const responses = (json as any).responses;
        expect(responses).toHaveLength(2);
        expect(responses[0].status).toBe(200);
        expect(responses[1].status).toBe(200);
        expect(JSON.parse(responses[0].body)).toMatchObject({ items: {} });
        expect(JSON.parse(responses[1].body)).toMatchObject({ name: 'Alice' });
    });

    it('returns 404 sub-response for unknown sub-request route', async () => {
        ({ server, port } = await makeServer());

        const { status, json } = await post(port, '/__batch', {
            requests: [
                { method: 'GET', url: '/api/todos', headers: {} },
                { method: 'GET', url: '/api/nonexistent', headers: {} }
            ]
        });

        expect(status).toBe(200);
        const responses = (json as any).responses;
        expect(responses[0].status).toBe(200);
        expect(responses[1].status).toBe(404);
    });

    it('sends POST sub-request body to handler', async () => {
        ({ server, port } = await makeServer());

        const { status, json } = await post(port, '/__batch', {
            requests: [
                {
                    method: 'POST',
                    url: '/api/todos',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ title: 'Buy milk' })
                }
            ]
        });

        expect(status).toBe(200);
        const responses = (json as any).responses;
        expect(responses[0].status).toBe(200);
        expect(JSON.parse(responses[0].body)).toMatchObject({
            id: 42,
            title: 'Buy milk'
        });
    });

    it('returns 400 for invalid batch body (not JSON)', async () => {
        ({ server, port } = await makeServer());

        const res = await fetch(`http://127.0.0.1:${port}/__batch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: 'not-json'
        });

        expect(res.status).toBe(400);
    });

    it('returns 400 when requests field is missing', async () => {
        ({ server, port } = await makeServer());

        const { status } = await post(port, '/__batch', { foo: 'bar' });
        expect(status).toBe(400);
    });

    it('returns 400 when batch size exceeds maxSize', async () => {
        server = await createServer()
            .useBatching({ maxSize: 2 })
            .handleAll(handlers)
            .listen(0);
        port = server.address!.port;

        const { status } = await post(port, '/__batch', {
            requests: [
                { method: 'GET', url: '/api/todos' },
                { method: 'GET', url: '/api/todos' },
                { method: 'GET', url: '/api/todos' }
            ]
        });

        expect(status).toBe(400);
    });

    it('returns 404 when batching is not enabled', async () => {
        // No .useBatching() call
        server = await createServer().handleAll(handlers).listen(0);
        port = server.address!.port;

        const res = await fetch(`http://127.0.0.1:${port}/__batch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ requests: [] })
        });

        // Treated as unknown route → 404
        expect(res.status).toBe(404);
    });

    it('respects custom batch path', async () => {
        server = await createServer()
            .useBatching({ path: '/_batch' })
            .handleAll(handlers)
            .listen(0);
        port = server.address!.port;

        const { status } = await post(port, '/_batch', {
            requests: [{ method: 'GET', url: '/api/todos', headers: {} }]
        });

        expect(status).toBe(200);

        // The default path should now 404
        const res2 = await fetch(`http://127.0.0.1:${port}/__batch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ requests: [] })
        });
        expect(res2.status).toBe(404);
    });

    it('processes sub-requests sequentially when parallel: false', async () => {
        const order: number[] = [];
        const seqApi = {
            items: {
                a: endpoint.get('/api/a'),
                b: endpoint.get('/api/b')
            }
        };
        const seqHandlers = mapHandlers(seqApi, {
            items: {
                a: async () => {
                    order.push(1);
                    await new Promise(r => setTimeout(r, 20));
                    order.push(2);
                    return 'a';
                },
                b: async () => {
                    order.push(3);
                    return 'b';
                }
            }
        });

        server = await createServer()
            .useBatching({ parallel: false })
            .handleAll(seqHandlers)
            .listen(0);
        port = server.address!.port;

        await post(port, '/__batch', {
            requests: [
                { method: 'GET', url: '/api/a', headers: {} },
                { method: 'GET', url: '/api/b', headers: {} }
            ]
        });

        // With sequential execution, a must complete fully before b starts
        expect(order).toEqual([1, 2, 3]);
    });

    it('one sub-request failure does not affect other sub-responses', async () => {
        const failApi = {
            items: {
                ok: endpoint.get('/api/ok'),
                fail: endpoint.get('/api/fail')
            }
        };
        const failHandlers = mapHandlers(failApi, {
            items: {
                ok: () => ({ ok: true }),
                fail: () => {
                    throw new Error('handler error');
                }
            }
        });

        server = await createServer()
            .useBatching()
            .handleAll(failHandlers)
            .listen(0);
        port = server.address!.port;

        const { status, json } = await post(port, '/__batch', {
            requests: [
                { method: 'GET', url: '/api/ok', headers: {} },
                { method: 'GET', url: '/api/fail', headers: {} }
            ]
        });

        expect(status).toBe(200);
        const responses = (json as any).responses;
        expect(responses[0].status).toBe(200);
        // The failing sub-request returns a 500 in its own slot
        expect(responses[1].status).toBe(500);
    });
});
