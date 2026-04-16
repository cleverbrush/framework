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
import { ApiError } from './errors.js';
import { buildPath } from './path.js';
import { serializeQuery } from './query.js';
import type { ClientOptions, TypedClient } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_CONTENT_TYPE = 'application/json';

function hasBody(method: string): boolean {
    return method === 'POST' || method === 'PUT' || method === 'PATCH';
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
        headers: extraHeaders
    } = options;

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

        // -- Fetch --
        const response = await customFetch(url, {
            method,
            headers: reqHeaders,
            body
        });

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

            throw new ApiError(
                response.status,
                response.statusText || `HTTP ${response.status}`,
                errorBody
            );
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

        const response = await customFetch(url, {
            method,
            headers: reqHeaders,
            body,
            signal: args?.signal
        });

        if (!response.ok) {
            if (response.status === 401) {
                onUnauthorized?.();
            }
            throw new ApiError(
                response.status,
                response.statusText || `HTTP ${response.status}`
            );
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
                    const ep = group[endpointName];
                    if (!ep) return undefined;

                    // Return a callable that invokes the fetch logic,
                    // with a `.stream()` method for NDJSON streaming.
                    const call = (args?: any) => execute(ep, args);
                    call.stream = (args?: any) => streamLines(ep, args);
                    return call;
                }
            });
        }
    });
}
