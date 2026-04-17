/**
 * Throttling cache middleware for the `@cleverbrush/web` client.
 *
 * Caches successful GET responses for a configurable TTL, avoiding
 * redundant network requests. Mutating requests (POST, PUT, DELETE, PATCH)
 * can optionally invalidate cache entries.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/web';
 * import { throttlingCache } from '@cleverbrush/web/cache';
 *
 * const client = createClient(api, {
 *     middlewares: [throttlingCache({ throttle: 2000 })],
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
 * Options for the {@link throttlingCache} middleware.
 */
export interface CacheOptions {
    /**
     * Cache TTL in milliseconds.
     * Defaults to `1000` (1 second).
     */
    throttle?: number;

    /**
     * Predicate that decides whether a request should be skipped
     * (i.e. *not* cached).
     *
     * Defaults to skipping non-GET requests.
     */
    skip?: (url: string, init: RequestInit) => boolean;

    /**
     * Computes the cache key for a request.
     *
     * Defaults to `method + '@' + url`.
     */
    key?: (url: string, init: RequestInit) => string;

    /**
     * Predicate that determines whether a response should be cached.
     *
     * Defaults to caching only successful responses (`response.ok`).
     */
    condition?: (response: Response) => boolean;

    /**
     * Returns a cache key to invalidate when a mutating request is made.
     * Return `null` to skip invalidation.
     *
     * By default, mutating requests do not invalidate the cache.
     */
    invalidate?: (url: string, init: RequestInit) => string | null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface CacheEntry {
    response: Response;
    expiresAt: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SKIP = (_url: string, init: RequestInit) =>
    (init.method ?? 'GET').toUpperCase() !== 'GET';

const DEFAULT_KEY = (url: string, init: RequestInit) =>
    `${(init.method ?? 'GET').toUpperCase()}@${url}`;

const DEFAULT_CONDITION = (response: Response) => response.ok;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a throttling cache middleware.
 *
 * Successful GET responses are cached for a configurable TTL (`throttle`).
 * Subsequent requests with the same key within the TTL receive a **cloned**
 * cached response without hitting the network.
 *
 * @param options - Cache configuration.
 * @returns A {@link Middleware} that caches responses.
 *
 * @example
 * ```ts
 * // 2-second TTL with cache invalidation on mutations:
 * const client = createClient(api, {
 *     middlewares: [throttlingCache({
 *         throttle: 2000,
 *         invalidate: (url, init) => {
 *             if (init.method !== 'GET') return `GET@${url}`;
 *             return null;
 *         },
 *     })],
 * });
 * ```
 */
export function throttlingCache(options: CacheOptions = {}): Middleware {
    const {
        throttle = 1000,
        skip = DEFAULT_SKIP,
        key: keyFn = DEFAULT_KEY,
        condition = DEFAULT_CONDITION,
        invalidate
    } = options;

    const cache = new Map<string, CacheEntry>();

    return next => (url, init) => {
        // Handle cache invalidation for mutating requests.
        if (invalidate) {
            const invalidateKey = invalidate(url, init);
            if (invalidateKey !== null && invalidateKey !== undefined) {
                cache.delete(invalidateKey);
            }
        }

        // Skip non-cacheable requests.
        if (skip(url, init)) {
            return next(url, init);
        }

        const k = keyFn(url, init);

        // Check cache.
        const entry = cache.get(k);
        if (entry && entry.expiresAt > Date.now()) {
            return Promise.resolve(entry.response.clone());
        }

        // Remove stale entry.
        if (entry) {
            cache.delete(k);
        }

        return next(url, init).then(response => {
            if (condition(response)) {
                cache.set(k, {
                    response: response.clone(),
                    expiresAt: Date.now() + throttle
                });
            }
            return response;
        });
    };
}
