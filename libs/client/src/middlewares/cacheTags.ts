/**
 * Tag-based cache middleware for the `@cleverbrush/client`.
 *
 * Caches successful GET responses keyed by endpoint-defined cache tags.
 * Mutating requests (POST, PUT, DELETE, PATCH) invalidate all cache
 * entries whose tag name starts with each of the endpoint's tag names, only
 * after a successful response. Older in-flight reads cannot refill those tags.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client';
 * import { cacheTags } from '@cleverbrush/client/cache';
 *
 * const client = createClient(api, {
 *     middlewares: [cacheTags({ defaultTtl: 0, ttlByTag: { 'todo-list': 5000 } })],
 * });
 * ```
 *
 * @module
 */

import { computeCacheKey } from '@cleverbrush/server/contract';
import type { EndpointMeta, Middleware } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the {@link cacheTags} middleware.
 */
export interface CacheTagMiddlewareOptions {
    /**
     * Per-tag TTL map: `{ [tagName]: ttlMs }`.
     * Tags not listed here fall back to `defaultTtl`.
     */
    ttlByTag?: Record<string, number>;

    /**
     * Default TTL in milliseconds for tags without an explicit TTL.
     * Defaults to `0` (no caching — invalidation-only mode).
     */
    defaultTtl?: number;

    /**
     * Predicate that decides whether a request should be cached.
     * Defaults to caching only successful responses (`response.ok`).
     */
    condition?: (response: Response) => boolean;
}

/**
 * The root object passed to each `CacheTagPropertyAccessor.getValue()` call.
 */
export interface CacheTagRoot {
    params: Record<string, unknown>;
    body: unknown;
    query: Record<string, unknown>;
    headers: Record<string, string>;
}

/**
 * Shape of a serialized cache tag from endpoint metadata.
 */
export interface SerializedCacheTag {
    name: string;
    properties: Readonly<
        Record<
            string,
            {
                getValue(root: CacheTagRoot): {
                    value?: unknown;
                    success: boolean;
                };
            }
        >
    >;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface CacheEntry {
    response: Response;
    expiresAt: number;
    generations: ReadonlyArray<readonly [string, number]>;
}

/**
 * Return `true` for HTTP methods that mutate server state.
 */
export function isMutatingMethod(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

/**
 * Computes a deterministic cache key from a tag and request data.
 *
 * Uses the shared, versioned `ct2:` encoding, including property-free tags.
 * Selected values are type-tagged and retain date precision. Unsupported values
 * throw TypeError. External cache writers and invalidators must upgrade together.
 */
export function computeCacheTagKey(
    tag: SerializedCacheTag,
    root: CacheTagRoot
): string {
    return computeCacheKey(tag, root);
}

/**
 * Build the cache-tag accessor root from endpoint metadata.
 */
export function createCacheTagRoot(meta: EndpointMeta): CacheTagRoot {
    return {
        params: (meta.params as Record<string, unknown>) ?? {},
        body: meta.body,
        query: (meta.query as Record<string, unknown>) ?? {},
        headers: (meta.headers as Record<string, string>) ?? {}
    };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a tag-based cache middleware.
 *
 * On GET requests, the middleware inspects `__endpointMeta.cacheTags` to
 * compute cache keys. If a valid (non-expired) cache entry exists, the
 * cached response is returned immediately (cloned).
 *
 * Successful mutations (POST, PUT, DELETE, PATCH) invalidate entries whose
 * tag names start with any of the endpoint's tag names, including all aliases.
 * Generations also prevent older in-flight reads from repopulating them.
 *
 * @param options - Cache configuration.
 * @returns A {@link Middleware} that caches and invalidates by tag.
 */
export function cacheTags(options: CacheTagMiddlewareOptions = {}): Middleware {
    const {
        ttlByTag = {},
        defaultTtl = 0,
        condition = (response: Response) => response.ok
    } = options;

    const cache = new Map<string, CacheEntry>();
    const generations = new Map<string, number>();
    const isCurrent = (snapshot: CacheEntry['generations']) =>
        snapshot.every(
            ([name, generation]) => generations.get(name) === generation
        );

    return next => (url, init) => {
        const meta = (init as any).__endpointMeta as EndpointMeta | undefined;
        const tags: readonly SerializedCacheTag[] | undefined = meta?.cacheTags;
        const method = (init.method ?? 'GET').toUpperCase();

        // Invalidate only after success, including reads still in flight.
        if (isMutatingMethod(method) && meta && tags && tags.length > 0) {
            const names = tags.map(tag => tag.name);
            return next(url, init).then(response => {
                if (response.ok) {
                    for (const [name, generation] of generations) {
                        if (names.some(prefix => name.startsWith(prefix))) {
                            generations.set(name, generation + 1);
                        }
                    }
                    for (const [key, entry] of cache) {
                        if (!isCurrent(entry.generations)) cache.delete(key);
                    }
                }
                return response;
            });
        }

        // -- Cache lookup for GET requests --
        if (method === 'GET' && meta && tags && tags.length > 0) {
            const root = createCacheTagRoot(meta);
            // Resolve keys once: caller-owned request objects can change while
            // awaiting the response. A fill must belong to the original read.
            const keys = tags.map(tag => ({
                name: tag.name,
                key: computeCacheTagKey(tag, root)
            }));
            const snapshot = keys.map(({ name }) => {
                if (!generations.has(name)) generations.set(name, 0);
                return [name, generations.get(name)!] as const;
            });

            let foundEntry: CacheEntry | undefined;

            for (const { key: cacheKey } of keys) {
                const entry = cache.get(cacheKey);
                if (
                    entry &&
                    entry.expiresAt > Date.now() &&
                    isCurrent(entry.generations)
                ) {
                    foundEntry = entry;
                    break;
                }
                if (entry) {
                    cache.delete(cacheKey);
                }
            }

            if (foundEntry) {
                return Promise.resolve(foundEntry.response.clone());
            }

            return next(url, init).then(response => {
                if (isCurrent(snapshot) && condition(response)) {
                    for (const { name, key: cacheKey } of keys) {
                        const ttl =
                            ttlByTag[name] !== undefined
                                ? ttlByTag[name]
                                : defaultTtl;
                        if (ttl > 0) {
                            cache.set(cacheKey, {
                                response: response.clone(),
                                expiresAt: Date.now() + ttl,
                                generations: snapshot
                            });
                        }
                    }
                }
                return response;
            });
        }

        // -- Pass-through for non-cache-tagged or non-GET requests --
        return next(url, init);
    };
}
