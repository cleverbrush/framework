/**
 * Request deduplication middleware for the `@cleverbrush/web` client.
 *
 * Prevents duplicate in-flight requests by sharing the response from
 * an already-pending request with the same key. Non-GET requests are
 * skipped by default.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/web';
 * import { dedupe } from '@cleverbrush/web/dedupe';
 *
 * const client = createClient(api, {
 *     middlewares: [dedupe()],
 * });
 * ```
 *
 * @module
 */

import type { Middleware } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link dedupe} middleware.
 */
export interface DedupeOptions {
    /**
     * Predicate that decides whether a request should be skipped
     * (i.e. *not* deduplicated).
     *
     * Defaults to skipping non-GET requests.
     */
    skip?: (url: string, init: RequestInit) => boolean;

    /**
     * Computes the deduplication key for a request.
     *
     * Requests with the same key that are in-flight simultaneously will
     * share a single underlying fetch.
     *
     * Defaults to `method + '@' + url`.
     */
    key?: (url: string, init: RequestInit) => string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SKIP = (_url: string, init: RequestInit) =>
    (init.method ?? 'GET').toUpperCase() !== 'GET';

const DEFAULT_KEY = (url: string, init: RequestInit) =>
    `${(init.method ?? 'GET').toUpperCase()}@${url}`;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a request deduplication middleware.
 *
 * When multiple identical requests are made concurrently, only one
 * actual fetch is performed. All callers receive a **cloned** copy
 * of the response so each consumer can read the body independently.
 *
 * @param options - Deduplication configuration.
 * @returns A {@link Middleware} that deduplicates concurrent requests.
 *
 * @example
 * ```ts
 * // Default settings (dedupe GET only, key = method + url):
 * const client = createClient(api, {
 *     middlewares: [dedupe()],
 * });
 *
 * // Custom key including query string:
 * const client = createClient(api, {
 *     middlewares: [dedupe({
 *         key: (url) => url,
 *     })],
 * });
 * ```
 */
export function dedupe(options: DedupeOptions = {}): Middleware {
    const { skip = DEFAULT_SKIP, key: keyFn = DEFAULT_KEY } = options;

    const inflight = new Map<string, Promise<Response>>();

    return next => (url, init) => {
        if (skip(url, init)) {
            return next(url, init);
        }

        const k = keyFn(url, init);
        const existing = inflight.get(k);
        if (existing) {
            // Return a clone so each caller can read the body independently.
            return existing.then(res => res.clone());
        }

        const promise = next(url, init);
        inflight.set(k, promise);
        promise.then(
            () => inflight.delete(k),
            () => inflight.delete(k)
        );

        return promise;
    };
}
