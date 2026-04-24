/**
 * Proxy-based typed HTTP client factory.
 *
 * `createClient()` accepts an API contract (from `defineApi()`) and returns
 * a two-level Proxy object whose methods are fully typed: the first level
 * represents **groups**, the second level represents **endpoints** within
 * each group.
 *
 * No code generation is involved — types are inferred from the contract at
 * compile time, and the runtime behaviour (HTTP method, URL path, body
 * serialisation) is derived from each endpoint's `.introspect()` metadata.
 *
 * @module
 */

import type { ApiContract } from '@cleverbrush/server/contract';
import { ApiError, NetworkError, WebError } from './errors.js';
import { composeMiddleware, PER_CALL_OPTIONS } from './middleware.js';
import { buildPath } from './path.js';
import { serializeQuery } from './query.js';
import type {
    ClientHooks,
    ClientOptions,
    Subscription,
    SubscriptionReconnectOptions,
    TypedClient
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_CONTENT_TYPE = 'application/json';

function hasBody(method: string): boolean {
    return method === 'POST' || method === 'PUT' || method === 'PATCH';
}

// ---------------------------------------------------------------------------
// Hook runners
// ---------------------------------------------------------------------------

async function runBeforeRequest(
    hooks: ClientHooks,
    url: string,
    init: RequestInit
): Promise<void> {
    if (!hooks.beforeRequest) return;
    for (const hook of hooks.beforeRequest) {
        await hook({ url, init });
    }
}

async function runAfterResponse(
    hooks: ClientHooks,
    url: string,
    init: RequestInit,
    response: Response
): Promise<Response> {
    if (!hooks.afterResponse) return response;
    let res = response;
    for (const hook of hooks.afterResponse) {
        const result = await hook({ url, init }, res);
        if (result instanceof Response) {
            res = result;
        }
    }
    return res;
}

async function runBeforeError(
    hooks: ClientHooks,
    error: WebError
): Promise<WebError> {
    if (!hooks.beforeError) return error;
    let err = error;
    for (const hook of hooks.beforeError) {
        err = await hook(err);
    }
    return err;
}

async function wrapAndRunBeforeError(
    hooks: ClientHooks,
    err: unknown
): Promise<Error> {
    if (err instanceof WebError) {
        return runBeforeError(hooks, err);
    }
    if (err instanceof TypeError) {
        const networkError = new NetworkError('Network request failed', {
            cause: err
        });
        return runBeforeError(hooks, networkError);
    }
    return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

/**
 * Creates a fully typed HTTP client from an API contract.
 *
 * The returned object mirrors the shape of the contract: each group becomes
 * a namespace and each endpoint within that group becomes an async callable
 * function.
 *
 * At runtime, endpoint metadata (HTTP method, path template, schemas) is
 * read from each `EndpointBuilder` via `.introspect()`.  Path parameters
 * are serialized through the `ParseStringSchemaBuilder.serialize()` method
 * when a `route()` template is used; query parameters are serialized to a
 * query string; and the request body is JSON-encoded for methods that
 * accept a body.
 *
 * @typeParam T - The exact API contract type, preserving all endpoint
 *   builder generics so that `params`, `body`, `query`, and response types
 *   are fully inferred.
 *
 * @param contract - The API contract created with `defineApi()`.
 * @param options  - Client configuration (base URL, auth token, custom fetch, etc.).
 * @returns A {@link TypedClient} whose shape mirrors the contract.
 *
 * @example
 * ```ts
 * import { api } from 'todo-shared';
 * import { createClient } from '@cleverbrush/web';
 *
 * const client = createClient(api, {
 *     baseUrl: 'https://api.example.com',
 *     getToken: () => localStorage.getItem('token'),
 *     onUnauthorized: () => { window.location.href = '/login'; },
 * });
 *
 * // Fully typed — params, body, and response types are inferred.
 * const todos = await client.todos.list();
 * const todo  = await client.todos.get({ params: { id: 1 } });
 * const created = await client.todos.create({ body: { title: 'Buy milk' } });
 * ```
 */
export function createClient<T extends ApiContract>(
    contract: T,
    options: ClientOptions = {}
): TypedClient<T> {
    const {
        baseUrl = '',
        getToken,
        fetch: customFetch = globalThis.fetch,
        onUnauthorized,
        headers: extraHeaders,
        middlewares = [],
        hooks = {},
        subscriptionReconnect
    } = options;

    // Compose middleware chain around the custom (or global) fetch.
    const composedFetch = composeMiddleware(middlewares, (url, init) =>
        customFetch(url, init)
    );

    // Cache introspected metadata per endpoint so we only call .introspect() once.
    const metaCache = new WeakMap<object, any>();

    function getMeta(ep: any) {
        const cached = metaCache.get(ep);
        if (cached !== undefined) return cached;
        const meta = ep.introspect();
        metaCache.set(ep, meta);
        return meta;
    }

    // Builds the URL, headers, and body for a request.  Shared by both
    // the regular `execute` path and the streaming `stream` path.
    function buildRequest(
        ep: any,
        args: any
    ): {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string | undefined;
    } {
        const meta = getMeta(ep);
        const method = meta.method.toUpperCase();

        // -- URL --
        const path = buildPath(meta.basePath, meta.pathTemplate, args?.params);
        const qs = serializeQuery(args?.query);
        const url = baseUrl + path + (qs ? '?' + qs : '');

        // -- Headers --
        const reqHeaders: Record<string, string> = {
            Accept: JSON_CONTENT_TYPE,
            ...extraHeaders,
            ...args?.headers
        };

        const token = getToken?.();
        if (token) {
            reqHeaders['Authorization'] = `Bearer ${token}`;
        }

        // -- Body --
        let body: string | undefined;
        if (args?.body !== undefined && hasBody(method)) {
            reqHeaders['Content-Type'] = JSON_CONTENT_TYPE;
            body = JSON.stringify(args.body);
        }

        return { url, method, headers: reqHeaders, body };
    }

    // The actual fetch logic, shared by every endpoint proxy method.
    async function execute(ep: any, args: any): Promise<any> {
        const {
            url,
            method,
            headers: reqHeaders,
            body
        } = buildRequest(ep, args);

        const init: RequestInit = {
            method,
            headers: reqHeaders,
            body
        };

        // Attach per-call middleware overrides if provided.
        const perCallOptions: Record<string, unknown> = {};
        if (args?.retry !== undefined) perCallOptions.retry = args.retry;
        if (args?.timeout !== undefined) perCallOptions.timeout = args.timeout;
        if (Object.keys(perCallOptions).length > 0) {
            (init as any)[PER_CALL_OPTIONS] = perCallOptions;
        }

        // -- beforeRequest hooks --
        await runBeforeRequest(hooks, url, init);

        // -- Fetch (through middleware chain) --
        let response: Response;
        try {
            response = await composedFetch(url, init);
        } catch (err) {
            throw await wrapAndRunBeforeError(hooks, err);
        }

        // -- afterResponse hooks --
        response = await runAfterResponse(hooks, url, init, response);

        // -- Handle errors --
        if (!response.ok) {
            if (response.status === 401) {
                onUnauthorized?.();
            }

            let errorBody: unknown;
            const ct = response.headers.get('content-type') ?? '';
            if (ct.includes('json')) {
                try {
                    errorBody = await response.json();
                } catch {
                    // Ignore parse errors — body stays undefined.
                }
            }

            const apiError = new ApiError(
                response.status,
                response.statusText || `HTTP ${response.status}`,
                errorBody,
                response.headers.get('x-trace-id') ?? undefined
            );
            throw await runBeforeError(hooks, apiError);
        }

        // -- Parse response --
        if (response.status === 204) {
            return undefined;
        }

        const ct = response.headers.get('content-type') ?? '';
        if (ct.includes('json')) {
            return response.json();
        }

        // Non-JSON success — return raw text.
        return response.text();
    }

    // Streaming fetch — yields newline-delimited chunks (e.g. NDJSON).
    async function* streamLines(ep: any, args: any): AsyncIterable<string> {
        const {
            url,
            method,
            headers: reqHeaders,
            body
        } = buildRequest(ep, args);

        const init: RequestInit = {
            method,
            headers: reqHeaders,
            body,
            signal: args?.signal
        };

        // -- beforeRequest hooks --
        await runBeforeRequest(hooks, url, init);

        // -- Fetch (through middleware chain) --
        let response: Response;
        try {
            response = await composedFetch(url, init);
        } catch (err) {
            throw await wrapAndRunBeforeError(hooks, err);
        }

        // -- afterResponse hooks --
        response = await runAfterResponse(hooks, url, init, response);

        if (!response.ok) {
            if (response.status === 401) {
                onUnauthorized?.();
            }
            const apiError = new ApiError(
                response.status,
                response.statusText || `HTTP ${response.status}`
            );
            throw await runBeforeError(hooks, apiError);
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed) yield trimmed;
                }
            }
            // Flush remaining buffer
            const remaining = buffer.trim();
            if (remaining) yield remaining;
        } finally {
            reader.releaseLock();
        }
    }

    // -- Two-level Proxy ---------------------------------------------------

    // Level 1: group proxy (e.g. `client.todos`)
    return new Proxy(Object.create(null) as TypedClient<T>, {
        get(_target, groupName: string) {
            const group = (contract as any)[groupName];
            if (!group) return undefined;

            // Level 2: endpoint proxy (e.g. `client.todos.list`)
            return new Proxy(Object.create(null), {
                get(_groupTarget, endpointName: string) {
                    if (!Object.hasOwn(group, endpointName)) return undefined;
                    const ep = group[endpointName];

                    const meta = getMeta(ep);

                    // Subscription endpoints return a Subscription handle
                    if (meta.protocol === 'subscription') {
                        return (args?: any) =>
                            createSubscriptionHandle(
                                meta,
                                args,
                                baseUrl,
                                getToken,
                                subscriptionReconnect
                            );
                    }

                    // Regular HTTP endpoints return a callable with .stream()
                    const call = (args?: any) => execute(ep, args);
                    call.stream = (args?: any) => streamLines(ep, args);
                    return call;
                }
            });
        }
    });
}

// ---------------------------------------------------------------------------
// WebSocket Subscription
// ---------------------------------------------------------------------------

/**
 * Default exponential backoff delay for subscription reconnection.
 * Returns `300 * 2^(attempt - 1)` ms, matching the HTTP retry middleware's
 * backoff formula for consistency.
 *
 * @param attempt - 1-indexed reconnection attempt number.
 * @returns Delay in milliseconds before the attempt.
 */
export function defaultSubscriptionDelay(attempt: number): number {
    return 300 * 2 ** (attempt - 1);
}

/**
 * Creates a {@link Subscription} handle backed by the browser WebSocket API.
 *
 * The handle is an `AsyncIterable` — use `for await` to consume incoming
 * events — and exposes `send()` / `close()` for bidirectional communication.
 *
 * URL scheme conversion is automatic:
 * - `http://` → `ws://`
 * - `https://` → `wss://`
 *
 * Auth tokens are appended as a `?token=` query parameter because the
 * browser WebSocket constructor does not support custom headers.
 *
 * When `reconnect` options are provided (either via per-call `args.reconnect`
 * or global `globalReconnect`), the handle will automatically reconnect
 * after an unexpected connection close with exponential backoff. Manual
 * calls to `.close()` and AbortSignal aborts will NOT trigger reconnection.
 *
 * @param meta - Introspected subscription endpoint metadata.
 * @param args - Call-site arguments: `params`, `query`, `signal`, `reconnect`.
 * @param baseUrl - The client's configured base URL.
 * @param getToken - Optional token provider for authentication.
 * @param globalReconnect - Global reconnect defaults from `ClientOptions`.
 * @returns A live {@link Subscription} handle.
 */
function createSubscriptionHandle(
    meta: any,
    args: any,
    baseUrl: string,
    getToken?: () => string | null | undefined,
    globalReconnect?: SubscriptionReconnectOptions
): Subscription<any, any> {
    // Resolve reconnect options: per-call wins over global, false disables
    const perCallReconnect = args?.reconnect;
    let reconnectOptions: SubscriptionReconnectOptions | null;
    if (perCallReconnect === false) {
        reconnectOptions = null;
    } else if (perCallReconnect === true) {
        reconnectOptions = globalReconnect ?? {};
    } else if (
        perCallReconnect != null &&
        typeof perCallReconnect === 'object'
    ) {
        reconnectOptions = perCallReconnect;
    } else {
        reconnectOptions = globalReconnect ?? null;
    }

    const maxRetries = reconnectOptions?.maxRetries ?? Infinity;
    const delayFn = reconnectOptions?.delay ?? defaultSubscriptionDelay;
    const useJitter = reconnectOptions?.jitter ?? true;
    const backoffLimit = reconnectOptions?.backoffLimit ?? 30_000;
    const shouldReconnect = reconnectOptions?.shouldReconnect;

    // Build WebSocket URL
    const path = buildPath(meta.basePath, meta.pathTemplate, args?.params);
    const qs = serializeQuery(args?.query);

    // Convert http(s):// to ws(s)://
    let wsBase = baseUrl;
    if (wsBase.startsWith('https://')) {
        wsBase = 'wss://' + wsBase.slice(8);
    } else if (wsBase.startsWith('http://')) {
        wsBase = 'ws://' + wsBase.slice(7);
    } else if (!wsBase.startsWith('ws://') && !wsBase.startsWith('wss://')) {
        // Relative URL — use current page's WebSocket scheme
        if (typeof window !== 'undefined') {
            const proto =
                window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsBase = `${proto}//${window.location.host}`;
        }
    }

    const wsUrlBase = wsBase + path + (qs ? '?' + qs : '');

    function buildWsUrl(): string {
        let url = wsUrlBase;
        const token = getToken?.();
        if (token) {
            const sep = url.includes('?') ? '&' : '?';
            url += `${sep}token=${encodeURIComponent(token)}`;
        }
        return url;
    }

    const signal = args?.signal as AbortSignal | undefined;

    let currentState: Subscription<any, any>['state'] = 'connecting';

    // Message queue for async iteration
    const messageQueue: any[] = [];
    let messageResolve: ((result: IteratorResult<any>) => void) | null = null;
    let done = false;

    // Tracks whether the user explicitly closed the subscription (no reconnect)
    let manuallyClosed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function pushMessage(value: any): void {
        if (messageResolve) {
            messageResolve({ value, done: false });
            messageResolve = null;
        } else {
            messageQueue.push(value);
        }
    }

    function terminateDone(): void {
        done = true;
        currentState = 'closed';
        if (reconnectTimer !== null) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (messageResolve) {
            messageResolve({ value: undefined, done: true });
            messageResolve = null;
        }
    }

    let ws: WebSocket;

    function createWs(): WebSocket {
        const socket = new WebSocket(buildWsUrl());

        socket.onopen = () => {
            reconnectAttempt = 0;
            currentState = 'connected';
        };

        socket.onclose = (event: any) => {
            if (manuallyClosed || done) {
                terminateDone();
                return;
            }

            // Attempt reconnection if configured
            if (reconnectOptions !== null && reconnectAttempt < maxRetries) {
                const closeCode: number =
                    typeof event?.code === 'number' ? event.code : 1006;
                const closeReason: string =
                    typeof event?.reason === 'string' ? event.reason : '';

                if (
                    shouldReconnect &&
                    !shouldReconnect({ code: closeCode, reason: closeReason })
                ) {
                    terminateDone();
                    return;
                }

                reconnectAttempt++;
                currentState = 'reconnecting';

                let delay = Math.min(delayFn(reconnectAttempt), backoffLimit);
                if (useJitter) {
                    delay = delay * (1 + Math.random() * 0.25);
                }

                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    if (!manuallyClosed && !done) {
                        ws = createWs();
                    }
                }, delay);
            } else {
                terminateDone();
            }
        };

        socket.onerror = () => {
            // onerror is always followed by onclose in the WebSocket lifecycle;
            // let onclose handle reconnection/termination.
        };

        socket.onmessage = (event: any) => {
            let frame: any;
            try {
                frame = JSON.parse(
                    typeof event.data === 'string'
                        ? event.data
                        : event.data.toString()
                );
            } catch {
                return; // Ignore malformed frames
            }

            if (frame.type === 'pong') return;
            if (frame.type === 'error') return; // TODO: surface errors

            // Both 'message' and 'tracked' frames carry data
            if (frame.type === 'message' || frame.type === 'tracked') {
                pushMessage(frame.data);
            }
        };

        return socket;
    }

    ws = createWs();

    // Handle external abort signal
    if (signal) {
        if (signal.aborted) {
            manuallyClosed = true;
            ws.close();
        } else {
            signal.addEventListener(
                'abort',
                () => {
                    manuallyClosed = true;
                    ws.close();
                },
                { once: true }
            );
        }
    }

    const subscription: Subscription<any, any> = {
        send(message: any): void {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'message', data: message }));
            }
        },

        close(): void {
            manuallyClosed = true;
            ws.close();
        },

        get state() {
            return currentState;
        },

        [Symbol.asyncIterator]() {
            return {
                next(): Promise<IteratorResult<any>> {
                    if (messageQueue.length > 0) {
                        return Promise.resolve({
                            value: messageQueue.shift()!,
                            done: false
                        });
                    }
                    if (done) {
                        return Promise.resolve({
                            value: undefined,
                            done: true
                        });
                    }
                    return new Promise(resolve => {
                        messageResolve = resolve;
                    });
                },
                return(): Promise<IteratorResult<any>> {
                    manuallyClosed = true;
                    ws.close();
                    done = true;
                    return Promise.resolve({
                        value: undefined,
                        done: true
                    });
                }
            };
        }
    };

    return subscription;
}
