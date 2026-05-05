/**
 * Idempotency middleware for the `@cleverbrush/client`.
 *
 * Automatically adds an `X-Idempotency-Key` header to mutating requests
 * so the server can deduplicate replays. The same key is preserved across
 * retries, ensuring retried requests are treated as the same operation.
 *
 * @module
 */

import type { Middleware } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link idempotency}.
 */
export interface IdempotencyOptions {
    /**
     * Header name to use for the idempotency key.
     * Defaults to `"X-Idempotency-Key"`.
     */
    headerName?: string;

    /**
     * Custom key generator. Receives `(url, init)` and returns a string.
     * Defaults to generating a UUID v4.
     *
     * The key must be stable across retries of the same logical request.
     * When not provided, a UUID is generated once and reused on retry.
     */
    keyGenerator?: (url: string, init: RequestInit) => string;

    /**
     * Predicate that decides whether a request should receive a key.
     * Defaults to `true` for POST, PUT, PATCH, DELETE.
     */
    condition?: (url: string, init: RequestInit) => boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a random UUID v4 without external dependencies.
 */
function uuid4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function isMutating(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates an idempotency middleware for the client.
 *
 * Mutating requests automatically receive an `X-Idempotency-Key` header
 * with a UUID v4 value. The key is generated once per request and reused
 * across retries — so the server sees the same key for the same logical
 * operation even when the client retries.
 *
 * @param options - Configuration.
 * @returns A {@link Middleware} that adds idempotency keys.
 *
 * @example
 * ```ts
 * const client = createClient(api, {
 *     middlewares: [idempotency(), retry({ limit: 3 })],
 * });
 * ```
 */
export function idempotency(options: IdempotencyOptions = {}): Middleware {
    const {
        headerName = 'X-Idempotency-Key',
        keyGenerator = uuid4,
        condition = (_url, init) =>
            isMutating((init.method ?? 'GET').toUpperCase())
    } = options;

    return next => (url, init) => {
        if (!condition(url, init)) {
            return next(url, init);
        }

        const headers = new Headers(init.headers);
        if (!headers.has(headerName.toLowerCase())) {
            headers.set(headerName, keyGenerator(url, init));
        }

        return next(url, { ...init, headers });
    };
}
