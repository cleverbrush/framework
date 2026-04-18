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
