import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createClient } from './client.js';
import { ApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Mock endpoint builder — mimics EndpointBuilder.introspect()
// ---------------------------------------------------------------------------

function mockEndpoint(meta: {
    method: string;
    basePath: string;
    pathTemplate?:
        | string
        | { serialize: (p: Record<string, unknown>) => string };
}) {
    return {
        introspect: () => ({
            method: meta.method,
            basePath: meta.basePath,
            pathTemplate: meta.pathTemplate ?? ''
        })
    };
}

// ---------------------------------------------------------------------------
// Mock contract — mimics defineApi() output
// ---------------------------------------------------------------------------

function createMockContract() {
    return {
        todos: {
            list: mockEndpoint({ method: 'GET', basePath: '/api/todos' }),
            get: mockEndpoint({
                method: 'GET',
                basePath: '/api/todos',
                pathTemplate: {
                    serialize: (p: Record<string, unknown>) => `/${p.id}`
                }
            }),
            create: mockEndpoint({ method: 'POST', basePath: '/api/todos' }),
            update: mockEndpoint({
                method: 'PUT',
                basePath: '/api/todos',
                pathTemplate: {
                    serialize: (p: Record<string, unknown>) => `/${p.id}`
                }
            }),
            delete: mockEndpoint({
                method: 'DELETE',
                basePath: '/api/todos',
                pathTemplate: {
                    serialize: (p: Record<string, unknown>) => `/${p.id}`
                }
            })
        },
        auth: {
            login: mockEndpoint({ method: 'POST', basePath: '/api/auth/login' })
        }
    } as any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
    });
}

function noContentResponse() {
    return new Response(null, { status: 204, statusText: 'No Content' });
}

function errorResponse(status: number, body?: unknown, statusText = 'Error') {
    return new Response(body ? JSON.stringify(body) : null, {
        status,
        statusText,
        headers: body ? { 'content-type': 'application/json' } : {}
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createClient', () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    let contract: ReturnType<typeof createMockContract>;

    beforeEach(() => {
        mockFetch = vi.fn();
        contract = createMockContract();
    });

    // -- Proxy structure ---------------------------------------------------

    test('returns a proxy with group namespaces', () => {
        const client = createClient(contract, { fetch: mockFetch });
        expect(client.todos).toBeDefined();
        expect(client.auth).toBeDefined();
    });

    test('group proxies expose endpoint methods', () => {
        const client = createClient(contract, { fetch: mockFetch });
        expect(typeof client.todos.list).toBe('function');
        expect(typeof client.todos.create).toBe('function');
        expect(typeof client.auth.login).toBe('function');
    });

    test('undefined group returns undefined', () => {
        const client = createClient(contract, { fetch: mockFetch });
        expect((client as any).nonexistent).toBeUndefined();
    });

    test('undefined endpoint returns undefined', () => {
        const client = createClient(contract, { fetch: mockFetch });
        expect((client.todos as any).nonexistent).toBeUndefined();
    });

    // -- GET requests ------------------------------------------------------

    test('GET — no args, no body', async () => {
        mockFetch.mockResolvedValue(jsonResponse([{ id: 1, title: 'test' }]));
        const client = createClient(contract, { fetch: mockFetch });

        const result = await client.todos.list();

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos');
        expect(init.method).toBe('GET');
        expect(init.body).toBeUndefined();
        expect(result).toEqual([{ id: 1, title: 'test' }]);
    });

    test('GET with path params', async () => {
        mockFetch.mockResolvedValue(jsonResponse({ id: 42, title: 'hello' }));
        const client = createClient(contract, { fetch: mockFetch });

        await client.todos.get({ params: { id: 42 } } as any);

        const [url] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos/42');
    });

    test('GET with query params', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, { fetch: mockFetch });

        await client.todos.list({ query: { page: 2, limit: 10 } } as any);

        const [url] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos?page=2&limit=10');
    });

    // -- POST requests -----------------------------------------------------

    test('POST — sends JSON body', async () => {
        mockFetch.mockResolvedValue(jsonResponse({ id: 1, title: 'new' }, 201));
        const client = createClient(contract, { fetch: mockFetch });

        await client.todos.create({ body: { title: 'new' } } as any);

        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos');
        expect(init.method).toBe('POST');
        expect(init.body).toBe(JSON.stringify({ title: 'new' }));
        expect(init.headers['Content-Type']).toBe('application/json');
    });

    // -- PUT requests ------------------------------------------------------

    test('PUT — sends JSON body with path params', async () => {
        mockFetch.mockResolvedValue(jsonResponse({ id: 1, title: 'updated' }));
        const client = createClient(contract, { fetch: mockFetch });

        await client.todos.update({
            params: { id: 1 },
            body: { title: 'updated' }
        } as any);

        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos/1');
        expect(init.method).toBe('PUT');
        expect(init.body).toBe(JSON.stringify({ title: 'updated' }));
    });

    // -- DELETE requests ---------------------------------------------------

    test('DELETE with 204 No Content', async () => {
        mockFetch.mockResolvedValue(noContentResponse());
        const client = createClient(contract, { fetch: mockFetch });

        const result = await client.todos.delete({
            params: { id: 1 }
        } as any);

        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/todos/1');
        expect(init.method).toBe('DELETE');
        expect(result).toBeUndefined();
    });

    // -- baseUrl -----------------------------------------------------------

    test('prepends baseUrl', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, {
            fetch: mockFetch,
            baseUrl: 'https://api.example.com'
        });

        await client.todos.list();

        const [url] = mockFetch.mock.calls[0];
        expect(url).toBe('https://api.example.com/api/todos');
    });

    // -- Auth token --------------------------------------------------------

    test('sends Bearer token when getToken returns a value', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, {
            fetch: mockFetch,
            getToken: () => 'my-token'
        });

        await client.todos.list();

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['Authorization']).toBe('Bearer my-token');
    });

    test('omits Authorization header when getToken returns null', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, {
            fetch: mockFetch,
            getToken: () => null
        });

        await client.todos.list();

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['Authorization']).toBeUndefined();
    });

    // -- Extra headers -----------------------------------------------------

    test('includes extra headers', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, {
            fetch: mockFetch,
            headers: { 'X-Custom': 'value' }
        });

        await client.todos.list();

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['X-Custom']).toBe('value');
    });

    // -- Error handling ----------------------------------------------------

    test('throws ApiError on non-2xx response with JSON body', async () => {
        mockFetch.mockResolvedValue(
            errorResponse(404, { detail: 'Not found' }, 'Not Found')
        );
        const client = createClient(contract, { fetch: mockFetch });

        const err = await client.todos
            .get({ params: { id: 999 } } as any)
            .catch((e: unknown) => e);

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(404);
        expect((err as ApiError).body).toEqual({ detail: 'Not found' });
    });

    test('throws ApiError on non-2xx response without body', async () => {
        mockFetch.mockResolvedValue(
            errorResponse(500, undefined, 'Internal Server Error')
        );
        const client = createClient(contract, { fetch: mockFetch });

        const err = await client.todos.list().catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(500);
        expect((err as ApiError).body).toBeUndefined();
    });

    // -- onUnauthorized callback -------------------------------------------

    test('calls onUnauthorized on 401 response', async () => {
        mockFetch.mockResolvedValue(errorResponse(401, null, 'Unauthorized'));
        const onUnauthorized = vi.fn();
        const client = createClient(contract, {
            fetch: mockFetch,
            onUnauthorized
        });

        await client.todos.list().catch(() => {});

        expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    test('does not call onUnauthorized on 403', async () => {
        mockFetch.mockResolvedValue(errorResponse(403, null, 'Forbidden'));
        const onUnauthorized = vi.fn();
        const client = createClient(contract, {
            fetch: mockFetch,
            onUnauthorized
        });

        await client.todos.list().catch(() => {});

        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    // -- Metadata caching --------------------------------------------------

    test('caches introspect() results — only called once per endpoint', async () => {
        mockFetch.mockImplementation(() => Promise.resolve(jsonResponse([])));
        const client = createClient(contract, { fetch: mockFetch });

        const spy = vi.spyOn(contract.todos.list, 'introspect');
        await client.todos.list();
        await client.todos.list();
        await client.todos.list();

        expect(spy).toHaveBeenCalledOnce();
    });

    // -- Request headers from args -----------------------------------------

    test('per-request headers are merged', async () => {
        mockFetch.mockResolvedValue(jsonResponse([]));
        const client = createClient(contract, {
            fetch: mockFetch,
            headers: { 'X-Global': 'yes' }
        });

        await client.todos.list({
            headers: { 'X-Request': 'specific' }
        } as any);

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['X-Global']).toBe('yes');
        expect(init.headers['X-Request']).toBe('specific');
    });

    // -- .stream() ---------------------------------------------------------

    test('stream() yields newline-delimited lines', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('{"a":1}\n{"a":2}\n'));
                controller.enqueue(encoder.encode('{"a":3}\n'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, { fetch: mockFetch });

        const lines: string[] = [];
        for await (const line of client.todos.list.stream()) {
            lines.push(line);
        }

        expect(lines).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
    });

    test('stream() handles partial chunks across reads', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('{"x":'));
                controller.enqueue(encoder.encode('1}\n{"x":2}\n'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, { fetch: mockFetch });

        const lines: string[] = [];
        for await (const line of client.todos.list.stream()) {
            lines.push(line);
        }

        expect(lines).toEqual(['{"x":1}', '{"x":2}']);
    });

    test('stream() flushes remaining buffer on close', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('line1\nline2'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, { fetch: mockFetch });

        const lines: string[] = [];
        for await (const line of client.todos.list.stream()) {
            lines.push(line);
        }

        expect(lines).toEqual(['line1', 'line2']);
    });

    test('stream() skips blank lines', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('a\n\n\nb\n'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, { fetch: mockFetch });

        const lines: string[] = [];
        for await (const line of client.todos.list.stream()) {
            lines.push(line);
        }

        expect(lines).toEqual(['a', 'b']);
    });

    test('stream() throws ApiError on non-2xx', async () => {
        mockFetch.mockResolvedValue(errorResponse(403, undefined, 'Forbidden'));
        const client = createClient(contract, { fetch: mockFetch });

        const lines: string[] = [];
        const err = await (async () => {
            try {
                for await (const line of client.todos.list.stream()) {
                    lines.push(line);
                }
            } catch (e) {
                return e;
            }
        })();

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(403);
        expect(lines).toHaveLength(0);
    });

    test('stream() sends auth token', async () => {
        const stream = new ReadableStream({
            start(controller) {
                controller.close();
            }
        });
        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, {
            fetch: mockFetch,
            getToken: () => 'stream-token'
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of client.todos.list.stream()) {
            // drain
        }

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['Authorization']).toBe('Bearer stream-token');
    });

    test('stream() passes signal to fetch', async () => {
        const stream = new ReadableStream({
            start(controller) {
                controller.close();
            }
        });
        mockFetch.mockResolvedValue(
            new Response(stream, { status: 200, statusText: 'OK' })
        );
        const client = createClient(contract, { fetch: mockFetch });
        const controller = new AbortController();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of client.todos.list.stream({
            signal: controller.signal
        })) {
            // drain
        }

        const [, init] = mockFetch.mock.calls[0];
        expect(init.signal).toBe(controller.signal);
    });
});
