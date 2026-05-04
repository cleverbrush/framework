/**
 * Middleware composition system for the `@cleverbrush/web` typed HTTP client.
 *
 * A middleware wraps a {@link FetchLike} function, allowing it to inspect,
 * modify, or short-circuit requests and responses.  Middlewares are composed
 * right-to-left: the first middleware in the array is the outermost wrapper.
 *
 * @example
 * ```ts
 * import { composeMiddleware, type Middleware } from '@cleverbrush/web';
 *
 * const logger: Middleware = (next) => async (url, init) => {
 *     console.log('→', init.method, url);
 *     const res = await next(url, init);
 *     console.log('←', res.status);
 *     return res;
 * };
 *
 * const client = createClient(api, {
 *     middlewares: [logger],
 * });
 * ```
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * A function with the same signature as `fetch`.
 *
 * Middlewares wrap and delegate to a `FetchLike` function, forming a chain
 * that terminates at the real `fetch` call.
 */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * A middleware is a function that accepts the *next* handler in the chain
 * and returns a new handler that wraps it.
 *
 * @example
 * ```ts
 * const timing: Middleware = (next) => async (url, init) => {
 *     const start = performance.now();
 *     const res = await next(url, init);
 *     console.log(`${url} took ${performance.now() - start}ms`);
 *     return res;
 * };
 * ```
 */
export type Middleware = (next: FetchLike) => FetchLike;

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Composes an array of middlewares into a single wrapper around a
 * {@link FetchLike} function.
 *
 * Middlewares are applied in array order — the first middleware is the
 * outermost wrapper (executes first on the way in, last on the way out).
 *
 * @param middlewares - An array of middleware functions to compose.
 * @param fetch - The inner fetch implementation to wrap.
 * @returns A {@link FetchLike} function that runs through the full middleware chain.
 *
 * @example
 * ```ts
 * const enhanced = composeMiddleware([retry(), timeout()], globalThis.fetch);
 * const response = await enhanced('/api/data', { method: 'GET' });
 * ```
 */
export function composeMiddleware(
    middlewares: Middleware[],
    fetch: FetchLike
): FetchLike {
    let result = fetch;
    for (let i = middlewares.length - 1; i >= 0; i--) {
        result = middlewares[i](result);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Per-call options
// ---------------------------------------------------------------------------

/**
 * Symbol used to attach per-call middleware overrides to a `RequestInit`
 * object. Middlewares can read their own options from this property.
 *
 * @example
 * ```ts
 * // Inside a middleware:
 * const opts = getPerCallOptions<MyOptions>(init, 'myMiddleware');
 * ```
 */
export const PER_CALL_OPTIONS: unique symbol = Symbol.for(
    '@cleverbrush/web:per-call-options'
);

/**
 * Reads per-call middleware overrides from a `RequestInit` object.
 *
 * @param init - The request init object (may have per-call overrides attached).
 * @param key  - The middleware key (e.g. `'retry'`, `'timeout'`).
 * @returns The per-call options for the given key, or `undefined` if not set.
 */
export function getPerCallOptions<T>(
    init: RequestInit,
    key: string
): T | undefined {
    return (init as any)[PER_CALL_OPTIONS]?.[key] as T | undefined;
}

// ---------------------------------------------------------------------------
// Endpoint metadata
// ---------------------------------------------------------------------------

/**
 * Endpoint metadata carried through {@link PER_CALL_OPTIONS} on every request.
 *
 * Computed by the Proxy-based client at call time, this gives middleware
 * access to the endpoint's structural info plus the actual call arguments
 * without any URL parsing or regex.
 *
 * Used by {@link throttlingCache} for cache-invalidation callbacks.
 */
export interface EndpointMeta {
    /** Contract group name, e.g. `"todos"`. */
    group: string;
    /** Endpoint name within the group, e.g. `"update"`. */
    endpoint: string;
    /** HTTP method in uppercase, e.g. `"PATCH"`. */
    method: string;
    /** Path template with colon placeholders, e.g. `/api/todos/:id`. */
    path: string;
    /** Resource base path, e.g. `/api/todos`. */
    basePath: string;
    /** Resource collection path (basePath without param placeholders). */
    collectionPath: string;
    /** Client base URL (e.g. `"http://localhost:3000"` or `""`). */
    baseUrl: string;
    /**
     * Full collection URL matching the HTTP cache key format.
     * Computed as `baseUrl (stripped of trailing slash) + collectionPath`.
     */
    fullCollectionUrl: string;
    /** Names of path parameters, e.g. `["id"]`. */
    pathParamNames: string[];
    /** Actual route parameter values from the call, e.g. `{ id: 42 }`. */
    params: Readonly<Record<string, unknown>>;
    /** Request body. */
    body: unknown;
    /** Query parameters, e.g. `{ page: 1 }`. */
    query: Readonly<Record<string, unknown>>;
    /** OpenAPI operationId, or `null`. */
    operationId: string | null;
    /** OpenAPI tags, or `[]`. */
    tags: readonly string[];
    /**
     * Cache tag definitions from the endpoint's `.cacheTag()` calls.
     * Each tag has a `name` and a map of `properties` (key → accessor).
     * Used by the `cacheTags` middleware.
     */
    cacheTags: ReadonlyArray<{
        name: string;
        properties: Readonly<
            Record<
                string,
                {
                    getValue(root: {
                        params: Record<string, unknown>;
                        body: unknown;
                        query: Record<string, unknown>;
                        headers: Record<string, string>;
                    }): { value?: unknown; success: boolean };
                }
            >
        >;
    }>;
    /** Request headers from the call, e.g. `{ 'x-request-id': 'abc' }`. */
    headers: Readonly<Record<string, string>>;
}
