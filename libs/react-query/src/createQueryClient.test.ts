import { describe, expect, test, vi } from 'vitest';
import { createClient, createQueryClient } from './createQueryClient.js';
import { QUERY_KEY_PREFIX } from './queryKeys.js';

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
            create: mockEndpoint({ method: 'POST', basePath: '/api/todos' })
        },
        auth: {
            login: mockEndpoint({
                method: 'POST',
                basePath: '/api/auth/login'
            })
        }
    } as any;
}

// ---------------------------------------------------------------------------
// Tests — createClient (unified)
// ---------------------------------------------------------------------------

describe('createClient (unified)', () => {
    test('returns a proxy with correct group keys', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        expect(client.todos).toBeDefined();
        expect(client.auth).toBeDefined();
        expect((client as any).nonExistent).toBeUndefined();
    });

    test('endpoint is callable (direct fetch)', async () => {
        const mockFetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([{ id: 1 }]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const result = await client.todos.list();
        expect(result).toEqual([{ id: 1 }]);
        expect(mockFetch).toHaveBeenCalled();
    });

    test('endpoint has .stream method', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        expect(typeof client.todos.list.stream).toBe('function');
    });

    test('endpoint has all TanStack Query hooks', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const endpoint = client.todos.list;
        expect(typeof endpoint).toBe('function'); // callable
        expect(typeof endpoint.stream).toBe('function');
        expect(typeof endpoint.useQuery).toBe('function');
        expect(typeof endpoint.useSuspenseQuery).toBe('function');
        expect(typeof endpoint.useInfiniteQuery).toBe('function');
        expect(typeof endpoint.useMutation).toBe('function');
        expect(typeof endpoint.queryKey).toBe('function');
        expect(typeof endpoint.prefetch).toBe('function');
    });

    test('non-existent endpoint returns undefined', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        expect((client.todos as any).nonExistent).toBeUndefined();
    });

    test('endpoint objects are cached (same reference)', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const first = client.todos.list;
        const second = client.todos.list;
        expect(first).toBe(second);
    });

    test('group-level queryKey() returns correct prefix key', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const key = client.todos.queryKey();
        expect(key).toEqual([QUERY_KEY_PREFIX, 'todos']);
    });

    test('endpoint queryKey() returns key without args', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const key = client.todos.list.queryKey();
        expect(key).toEqual([QUERY_KEY_PREFIX, 'todos', 'list']);
    });

    test('endpoint queryKey(args) includes args in key', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        const args = { params: { id: 42 } };
        const key = client.todos.get.queryKey(args);
        expect(key).toEqual([
            QUERY_KEY_PREFIX,
            'todos',
            'get',
            { params: { id: 42 } }
        ]);
    });

    test('different endpoints have different objects', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        expect(client.todos.list).not.toBe(client.todos.create);
    });

    test('different groups have different proxies', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const client = createClient(contract, { fetch: mockFetch });

        expect(client.todos).not.toBe(client.auth);
    });

    test('callable with args passes them to web client', async () => {
        const mockFetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ id: 5, title: 'test' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'https://api.example.com',
            fetch: mockFetch
        });

        const result = await client.todos.get({ params: { id: 5 } });
        expect(result).toEqual({ id: 5, title: 'test' });
        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('/api/todos/5');
    });
});

// ---------------------------------------------------------------------------
// Tests — createQueryClient (deprecated alias)
// ---------------------------------------------------------------------------

describe('createQueryClient (deprecated alias)', () => {
    test('returns same proxy shape as createClient', () => {
        const mockFetch = vi.fn();
        const contract = createMockContract();
        const queryApi = createQueryClient(contract, { fetch: mockFetch });

        expect(queryApi.todos).toBeDefined();
        expect(queryApi.auth).toBeDefined();
        expect(typeof queryApi.todos.list.useQuery).toBe('function');
        expect(typeof queryApi.todos.list.queryKey).toBe('function');
    });
});
