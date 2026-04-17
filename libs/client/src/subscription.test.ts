import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createClient } from './client.js';

// ---------------------------------------------------------------------------
// WebSocket mock
// ---------------------------------------------------------------------------

type WSHandler = ((event: any) => void) | null;

class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    static instances: MockWebSocket[] = [];

    url: string;
    readyState = MockWebSocket.CONNECTING;

    onopen: WSHandler = null;
    onclose: WSHandler = null;
    onerror: WSHandler = null;
    onmessage: WSHandler = null;

    sent: string[] = [];
    closed = false;
    closeCode?: number;
    closeReason?: string;

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    send(data: string) {
        this.sent.push(data);
    }

    close(code?: number, reason?: string) {
        this.closed = true;
        this.closeCode = code;
        this.closeReason = reason;
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({});
    }

    // Test helpers
    simulateOpen() {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.({});
    }

    simulateMessage(data: any) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }

    simulateError() {
        this.onerror?.({});
    }

    simulateClose() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({});
    }
}

// ---------------------------------------------------------------------------
// Mock contract
// ---------------------------------------------------------------------------

function mockSubscriptionEndpoint(meta: {
    basePath: string;
    pathTemplate?:
        | string
        | { serialize: (p: Record<string, unknown>) => string };
}) {
    return {
        introspect: () => ({
            protocol: 'subscription',
            basePath: meta.basePath,
            pathTemplate: meta.pathTemplate ?? ''
        })
    };
}

function createMockContract() {
    return {
        live: {
            events: mockSubscriptionEndpoint({
                basePath: '/ws/events'
            }),
            chat: mockSubscriptionEndpoint({
                basePath: '/ws/chat'
            }),
            room: mockSubscriptionEndpoint({
                basePath: '/ws/rooms',
                pathTemplate: {
                    serialize: (p: Record<string, unknown>) => `/${p.id}`
                }
            })
        },
        todos: {
            list: {
                introspect: () => ({
                    method: 'GET',
                    basePath: '/api/todos',
                    pathTemplate: ''
                })
            }
        }
    } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createClient — subscriptions', () => {
    let originalWebSocket: typeof globalThis.WebSocket;

    beforeEach(() => {
        MockWebSocket.instances = [];
        originalWebSocket = globalThis.WebSocket;
        (globalThis as any).WebSocket = MockWebSocket;
    });

    afterEach(() => {
        (globalThis as any).WebSocket = originalWebSocket;
    });

    // -- Proxy detection ---------------------------------------------------

    test('subscription endpoint returns a function, not a callable with hooks', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const subscribeFn = (client as any).live.events;
        expect(typeof subscribeFn).toBe('function');
        // Should NOT have .stream or .useQuery
        expect(subscribeFn.stream).toBeUndefined();
    });

    test('regular endpoint still works alongside subscriptions', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000',
            fetch: vi.fn()
        });

        const listFn = (client as any).todos.list;
        expect(typeof listFn).toBe('function');
        expect(typeof listFn.stream).toBe('function');
    });

    // -- URL construction --------------------------------------------------

    test('converts http:// to ws://', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        (client as any).live.events();

        expect(MockWebSocket.instances).toHaveLength(1);
        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events'
        );
    });

    test('converts https:// to wss://', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'https://api.example.com'
        });

        (client as any).live.events();

        expect(MockWebSocket.instances[0].url).toBe(
            'wss://api.example.com/ws/events'
        );
    });

    test('preserves ws:// base URL', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'ws://localhost:3000'
        });

        (client as any).live.events();

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events'
        );
    });

    test('includes path params from route template', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        (client as any).live.room({ params: { id: 42 } });

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/rooms/42'
        );
    });

    test('includes query params in URL', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        (client as any).live.events({ query: { filter: 'all' } });

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events?filter=all'
        );
    });

    test('appends auth token as query param', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000',
            getToken: () => 'my-secret-token'
        });

        (client as any).live.events();

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events?token=my-secret-token'
        );
    });

    test('appends auth token with & when query params exist', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000',
            getToken: () => 'tok'
        });

        (client as any).live.events({ query: { x: '1' } });

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events?x=1&token=tok'
        );
    });

    test('omits token when getToken returns null', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000',
            getToken: () => null
        });

        (client as any).live.events();

        expect(MockWebSocket.instances[0].url).toBe(
            'ws://localhost:3000/ws/events'
        );
    });

    // -- Connection state --------------------------------------------------

    test('initial state is connecting', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        expect(sub.state).toBe('connecting');
    });

    test('state changes to connected on open', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        MockWebSocket.instances[0].simulateOpen();
        expect(sub.state).toBe('connected');
    });

    test('state changes to closed on close', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
        expect(sub.state).toBe('closed');
    });

    test('state changes to closed on error', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        MockWebSocket.instances[0].simulateError();
        expect(sub.state).toBe('closed');
    });

    // -- Sending messages --------------------------------------------------

    test('send() wraps message in a message frame', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.chat();
        MockWebSocket.instances[0].simulateOpen();
        sub.send({ text: 'hello' });

        expect(MockWebSocket.instances[0].sent).toEqual([
            JSON.stringify({ type: 'message', data: { text: 'hello' } })
        ]);
    });

    test('send() is a no-op when socket is not open', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.chat();
        // Socket is still CONNECTING
        sub.send({ text: 'hello' });

        expect(MockWebSocket.instances[0].sent).toEqual([]);
    });

    // -- close() -----------------------------------------------------------

    test('close() closes the WebSocket', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        MockWebSocket.instances[0].simulateOpen();
        sub.close();

        expect(MockWebSocket.instances[0].closed).toBe(true);
    });

    // -- Async iteration ---------------------------------------------------

    test('iterates message frames', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        // Queue messages before iteration
        ws.simulateMessage({ type: 'message', data: { id: 1 } });
        ws.simulateMessage({ type: 'message', data: { id: 2 } });

        const collected: any[] = [];
        const iter = sub[Symbol.asyncIterator]();

        const r1 = await iter.next();
        collected.push(r1.value);
        const r2 = await iter.next();
        collected.push(r2.value);

        expect(collected).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test('iterates tracked frames', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        ws.simulateMessage({
            type: 'tracked',
            id: 'abc',
            data: { event: 'update' }
        });

        const iter = sub[Symbol.asyncIterator]();
        const r = await iter.next();
        expect(r.value).toEqual({ event: 'update' });
    });

    test('ignores pong frames', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        ws.simulateMessage({ type: 'pong' });
        ws.simulateMessage({ type: 'message', data: 'real' });

        const iter = sub[Symbol.asyncIterator]();
        const r = await iter.next();
        expect(r.value).toBe('real');
    });

    test('ignores error frames', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        ws.simulateMessage({ type: 'error', code: 500, message: 'fail' });
        ws.simulateMessage({ type: 'message', data: 'ok' });

        const iter = sub[Symbol.asyncIterator]();
        const r = await iter.next();
        expect(r.value).toBe('ok');
    });

    test('ignores malformed JSON', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        // Send raw non-JSON — bypass simulateMessage which auto-stringifies
        ws.onmessage?.({ data: 'not-json' });
        ws.simulateMessage({ type: 'message', data: 'valid' });

        const iter = sub[Symbol.asyncIterator]();
        const r = await iter.next();
        expect(r.value).toBe('valid');
    });

    test('iterator resolves pending next() when message arrives', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        const iter = sub[Symbol.asyncIterator]();

        // Start waiting before any message is sent
        const promise = iter.next();

        // Now send a message
        ws.simulateMessage({ type: 'message', data: 'delayed' });

        const r = await promise;
        expect(r.value).toBe('delayed');
    });

    test('iterator completes when socket closes', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        const iter = sub[Symbol.asyncIterator]();
        const promise = iter.next();

        ws.simulateClose();

        const r = await promise;
        expect(r.done).toBe(true);
    });

    test('iterator.return() closes the WebSocket', async () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const sub = (client as any).live.events();
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        const iter = sub[Symbol.asyncIterator]();
        await iter.return!();

        expect(ws.closed).toBe(true);
    });

    // -- AbortSignal -------------------------------------------------------

    test('closes WebSocket when signal is aborted', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const ac = new AbortController();
        (client as any).live.events({ signal: ac.signal });
        const ws = MockWebSocket.instances[0];
        ws.simulateOpen();

        ac.abort();
        expect(ws.closed).toBe(true);
    });

    test('closes immediately when signal is already aborted', () => {
        const contract = createMockContract();
        const client = createClient(contract, {
            baseUrl: 'http://localhost:3000'
        });

        const ac = new AbortController();
        ac.abort();
        (client as any).live.events({ signal: ac.signal });

        expect(MockWebSocket.instances[0].closed).toBe(true);
    });
});
