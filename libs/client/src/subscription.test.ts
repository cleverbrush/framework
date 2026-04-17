import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { SubscriptionBuilder } from '@cleverbrush/server';
import { createClient } from './client.js';
import type { SubscriptionReconnectOptions } from './types.js';

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
        // In real browsers, onerror is always followed by onclose
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code: 1006, reason: 'Connection error' });
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

// ---------------------------------------------------------------------------
// Reconnection tests
// ---------------------------------------------------------------------------

describe('createClient — subscriptions — reconnection', () => {
    let originalWebSocket: typeof globalThis.WebSocket;

    beforeEach(() => {
        vi.useFakeTimers();
        MockWebSocket.instances = [];
        originalWebSocket = globalThis.WebSocket;
        (globalThis as any).WebSocket = MockWebSocket;
    });

    afterEach(() => {
        vi.useRealTimers();
        (globalThis as any).WebSocket = originalWebSocket;
    });

    function makeClient(global?: SubscriptionReconnectOptions) {
        const contract = {
            live: {
                events: {
                    introspect: () => ({
                        protocol: 'subscription' as const,
                        basePath: '/ws/events',
                        pathTemplate: ''
                    })
                }
            }
        };
        return createClient(
            contract as unknown as { live: { events: SubscriptionBuilder } },
            {
                baseUrl: 'http://localhost:3000',
                subscriptionReconnect: global
            }
        );
    }

    test('reconnects after unexpected close', () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false }
        });
        const ws1 = MockWebSocket.instances[0];
        ws1.simulateOpen();
        ws1.simulateClose();

        expect(sub.state).toBe('reconnecting');
        expect(MockWebSocket.instances).toHaveLength(1);

        vi.advanceTimersByTime(300); // attempt 1 default delay

        expect(MockWebSocket.instances).toHaveLength(2);
    });

    test('transitions back to connected after successful reconnect', () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false }
        });
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(300);

        MockWebSocket.instances[1].simulateOpen();
        expect(sub.state).toBe('connected');
    });

    test('resets reconnect attempt counter after successful connect', () => {
        const client = makeClient();
        const _sub = client.live.events({
            reconnect: { jitter: false }
        });

        // Reconnect once
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
        vi.advanceTimersByTime(300);
        MockWebSocket.instances[1].simulateOpen();

        // Reconnect again — delay should be 300ms again (attempt reset to 1)
        MockWebSocket.instances[1].simulateClose();
        vi.advanceTimersByTime(299);
        expect(MockWebSocket.instances).toHaveLength(2);
        vi.advanceTimersByTime(1);
        expect(MockWebSocket.instances).toHaveLength(3);
    });

    test('exponential backoff between reconnect attempts', () => {
        const client = makeClient();
        (client as any).live.events({ reconnect: { jitter: false } });

        MockWebSocket.instances[0].simulateOpen();
        // Attempt 1: 300ms
        MockWebSocket.instances[0].simulateClose();
        vi.advanceTimersByTime(299);
        expect(MockWebSocket.instances).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(MockWebSocket.instances).toHaveLength(2);

        // Attempt 2: 600ms
        MockWebSocket.instances[1].simulateClose(); // no open → new attempt
        vi.advanceTimersByTime(599);
        expect(MockWebSocket.instances).toHaveLength(2);
        vi.advanceTimersByTime(1);
        expect(MockWebSocket.instances).toHaveLength(3);
    });

    test('respects backoffLimit ceiling', () => {
        const client = makeClient();
        (client as any).live.events({
            reconnect: { jitter: false, backoffLimit: 500 }
        });

        MockWebSocket.instances[0].simulateOpen();
        // attempt 1 delay = min(300, 500) = 300 ms
        MockWebSocket.instances[0].simulateClose();
        vi.advanceTimersByTime(300);
        expect(MockWebSocket.instances).toHaveLength(2);

        // attempt 2 delay = min(600, 500) = 500 ms
        MockWebSocket.instances[1].simulateClose();
        vi.advanceTimersByTime(499);
        expect(MockWebSocket.instances).toHaveLength(2);
        vi.advanceTimersByTime(1);
        expect(MockWebSocket.instances).toHaveLength(3);
    });

    test('stops reconnecting after maxRetries', () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false, maxRetries: 2 }
        });

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose(); // attempt 1
        vi.advanceTimersByTime(300);
        expect(MockWebSocket.instances).toHaveLength(2);

        MockWebSocket.instances[1].simulateClose(); // attempt 2
        vi.advanceTimersByTime(600);
        expect(MockWebSocket.instances).toHaveLength(3);

        MockWebSocket.instances[2].simulateClose(); // exceeds maxRetries
        vi.advanceTimersByTime(10_000); // no reconnect
        expect(MockWebSocket.instances).toHaveLength(3);
        expect(sub.state).toBe('closed');
    });

    test('shouldReconnect predicate returning false stops reconnection', () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: {
                jitter: false,
                shouldReconnect: (e: any) => e.code !== 4003
            }
        });

        MockWebSocket.instances[0].simulateOpen();
        // Trigger close with code 4003
        MockWebSocket.instances[0].onclose?.({ code: 4003, reason: 'policy' });

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('shouldReconnect predicate returning true allows reconnection', () => {
        const client = makeClient();
        (client as any).live.events({
            reconnect: {
                jitter: false,
                shouldReconnect: (e: any) => e.code !== 4003
            }
        });

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].onclose?.({ code: 1006, reason: '' });
        vi.advanceTimersByTime(300);
        expect(MockWebSocket.instances).toHaveLength(2);
    });

    test('manual close() does not trigger reconnection', () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false }
        });

        MockWebSocket.instances[0].simulateOpen();
        sub.close();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('abort signal does not trigger reconnection', () => {
        const client = makeClient();
        const ac = new AbortController();
        const sub = (client as any).live.events({
            reconnect: { jitter: false },
            signal: ac.signal
        });

        MockWebSocket.instances[0].simulateOpen();
        ac.abort();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('iterator.return() does not trigger reconnection', async () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false }
        });

        MockWebSocket.instances[0].simulateOpen();
        const iter = sub[Symbol.asyncIterator]();
        await iter.return!();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('messages continue to iterate across reconnections', async () => {
        const client = makeClient();
        const sub = (client as any).live.events({
            reconnect: { jitter: false }
        });

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
            type: 'message',
            data: 'before'
        });

        // Reconnect
        MockWebSocket.instances[0].simulateClose();
        vi.advanceTimersByTime(300);
        MockWebSocket.instances[1].simulateOpen();
        MockWebSocket.instances[1].simulateMessage({
            type: 'message',
            data: 'after'
        });

        const iter = sub[Symbol.asyncIterator]();
        const r1 = await iter.next();
        const r2 = await iter.next();

        expect(r1.value).toBe('before');
        expect(r2.value).toBe('after');
    });

    test('per-call reconnect overrides global subscriptionReconnect', () => {
        const client = createClient(
            {
                live: {
                    events: {
                        introspect: () => ({
                            protocol: 'subscription',
                            basePath: '/ws/events',
                            pathTemplate: ''
                        })
                    }
                }
            } as any,
            {
                baseUrl: 'http://localhost:3000',
                subscriptionReconnect: { maxRetries: 100, jitter: false }
            }
        );

        // Per-call disables reconnection
        const sub = (client as any).live.events({ reconnect: false });
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('reconnect: false explicitly disables reconnection', () => {
        const client = makeClient();
        const sub = (client as any).live.events({ reconnect: false });

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });

    test('global subscriptionReconnect applies to all subscriptions', () => {
        const client = createClient(
            {
                live: {
                    events: {
                        introspect: () => ({
                            protocol: 'subscription',
                            basePath: '/ws/events',
                            pathTemplate: ''
                        })
                    }
                }
            } as any,
            {
                baseUrl: 'http://localhost:3000',
                subscriptionReconnect: { jitter: false }
            }
        );

        (client as any).live.events();
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(300);
        expect(MockWebSocket.instances).toHaveLength(2);
    });

    test('reconnect: true uses global defaults', () => {
        const client = createClient(
            {
                live: {
                    events: {
                        introspect: () => ({
                            protocol: 'subscription',
                            basePath: '/ws/events',
                            pathTemplate: ''
                        })
                    }
                }
            } as any,
            {
                baseUrl: 'http://localhost:3000',
                subscriptionReconnect: { jitter: false }
            }
        );

        (client as any).live.events({ reconnect: true });
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(300);
        expect(MockWebSocket.instances).toHaveLength(2);
    });

    test('custom delay function is used', () => {
        const client = makeClient();
        (client as any).live.events({
            reconnect: {
                jitter: false,
                delay: (_attempt: number) => 1000
            }
        });

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(999);
        expect(MockWebSocket.instances).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(MockWebSocket.instances).toHaveLength(2);
    });

    test('no reconnection when reconnect not configured', () => {
        const client = makeClient();
        const sub = (client as any).live.events();

        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();

        vi.advanceTimersByTime(10_000);
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(sub.state).toBe('closed');
    });
});
