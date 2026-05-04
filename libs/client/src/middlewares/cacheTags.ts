/**
 * Tag-based cache middleware for the `@cleverbrush/client`.
 *
 * Caches successful GET responses keyed by endpoint-defined cache tags.
 * Mutating requests (POST, PUT, DELETE, PATCH) invalidate all cache
 * entries whose key starts with each of the endpoint's tag names.
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
interface TagRoot {
    params: Record<string, unknown>;
    body: unknown;
    query: Record<string, unknown>;
    headers: Record<string, string>;
}

/** Shape of a serialised cache tag from endpoint metadata. */
interface SerializedCacheTag {
    name: string;
    properties: Readonly<
        Record<
            string,
            {
                getValue(root: TagRoot): {
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
}

function isMutating(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

/**
 * Computes a deterministic cache key from a tag and request data.
 *
 * - Tags with no properties produce just the tag name.
 * - Tags with properties produce `name:key1=val1,key2=val2` where
 *   keys are sorted alphabetically for determinism.
 */
function computeKey(tag: SerializedCacheTag, root: TagRoot): string {
    const entries = Object.entries(tag.properties);

    if (entries.length === 0) {
        return tag.name;
    }

    const parts: string[] = [];
    for (const [key, accessor] of entries.sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        const result = accessor.getValue(root);
        if (result.success && result.value !== undefined) {
            parts.push(`${key}=${String(result.value)}`);
        }
    }

    if (parts.length === 0) {
        return tag.name;
    }

    return `${tag.name}:${parts.join(',')}`;
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
 * On mutating requests (POST, PUT, DELETE, PATCH), all cache entries whose
 * key starts with any of the endpoint's tag names are invalidated.
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

    return next => (url, init) => {
        const meta = (init as any).__endpointMeta as EndpointMeta | undefined;
        const tags: readonly SerializedCacheTag[] | undefined = meta?.cacheTags;
        const method = (init.method ?? 'GET').toUpperCase();

        // -- Invalidation on mutating requests --
        if (isMutating(method) && tags && tags.length > 0) {
            console.log('[cacheTags] INVALIDATING for', method, url, 'tags:', tags.map(t => t.name), 'cache size:', cache.size);
            const root: TagRoot = {
                params: (meta?.params as Record<string, unknown>) ?? {},
                body: meta?.body,
                query: (meta?.query as Record<string, unknown>) ?? {},
                headers: (meta?.headers as Record<string, string>) ?? {}
            };

            for (const tag of tags) {
                const tagKey = computeKey(tag, root);
                // Invalidate the exact key and any prefixed variants
                // (tag name prefix match handles dynamic property variants
                // when the mutation didn't provide the same properties).
                for (const [cachedKey] of cache) {
                    if (
                        cachedKey === tagKey ||
                        cachedKey.startsWith(tag.name)
                    ) {
                        cache.delete(cachedKey);
                    }
                }
            }
        }

        // -- Cache lookup for GET requests --
        if (method === 'GET' && tags && tags.length > 0) {
            const root: TagRoot = {
                params: (meta?.params as Record<string, unknown>) ?? {},
                body: meta?.body,
                query: (meta?.query as Record<string, unknown>) ?? {},
                headers: (meta?.headers as Record<string, string>) ?? {}
            };

            let foundEntry: CacheEntry | undefined;

            for (const tag of tags) {
                const cacheKey = computeKey(tag, root);
                const entry = cache.get(cacheKey);
                if (entry && entry.expiresAt > Date.now()) {
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
                if (condition(response)) {
                    for (const tag of tags) {
                        const cacheKey = computeKey(tag, root);
                        const ttl =
                            ttlByTag[tag.name] !== undefined
                                ? ttlByTag[tag.name]
                                : defaultTtl;
                        if (ttl > 0) {
                            cache.set(cacheKey, {
                                response: response.clone(),
                                expiresAt: Date.now() + ttl
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
