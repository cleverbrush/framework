/**
 * Server-side cache response middleware.
 *
 * Caches successful handler responses keyed by endpoint-defined cache tags.
 * On cache hit, the response is served directly — the handler never runs.
 * Mutating requests invalidate matching cache entries after the handler
 * completes successfully.
 *
 * @module
 */

import type { OutgoingHttpHeaders, ServerResponse } from 'node:http';
import type { CacheTagDefinition } from '../CacheTag.js';
import { computeCacheKey } from '../cacheKey.js';
import type { RequestContext } from '../RequestContext.js';
import type { Middleware } from '../types.js';
import { captureResponse } from './ResponseSnapshot.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link cacheResponse}.
 */
export interface ServerCacheOptions {
    /**
     * Default TTL in milliseconds for tags without an explicit TTL.
     * Defaults to `60000` (60 seconds).
     */
    defaultTtl?: number;

    /**
     * Per-tag TTL overrides: `{ [tagName]: ttlMs }`.
     */
    ttlByTag?: Record<string, number>;
    /** Maximum retained cache keys. Default: 1000 (oldest keys are evicted). */
    maxEntries?: number;
    /** Maximum retained response body size. Default: 65,536 bytes. */
    maxResponseBytes?: number;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface CacheEntry {
    status: number;
    headers: OutgoingHttpHeaders;
    body: Buffer;
    expiresAt: number;
    generations: ReadonlyArray<readonly [string, number]>;
}

function isMutating(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Server-side cache response middleware.
 *
 * Uses cache-tag definitions from the matched endpoint (already available
 * on `ctx.items.__endpoint_meta.cacheTags`) to compute deterministic cache
 * keys from request data (params, query, body, headers).
 *
 * - **GET**: Computes cache key → serves cached response if valid →
 *   handler never executes. On cache miss, runs the handler and caches
 *   the response.
 * - **Mutation (POST/PUT/PATCH/DELETE)**: Lets the handler run, then
 *   invalidates all cache entries whose tag names start with any of the
 *   endpoint's cache tag names. Older in-flight reads cannot refill them.
 * - By default, retain at most 1000 keys and bodies up to 65,536 bytes. Private/no-store and
 *   Set-Cookie responses are not cached. Install after authorization and encode
 *   every identity/tenant/representation dimension in tag properties.
 *
 * @param options - Cache configuration.
 * @returns A server-side {@link Middleware}.
 *
 * @example
 * ```ts
 * server.handle(ListTodos, listHandler, {
 *     middlewares: [cacheResponse({ defaultTtl: 30_000 })]
 * });
 * ```
 */
export function cacheResponse(options: ServerCacheOptions = {}): Middleware {
    const {
        defaultTtl = 60_000,
        maxEntries = 1000,
        maxResponseBytes = 65_536
    } = options;
    const ttlByTag = { ...options.ttlByTag };
    for (const [name, value] of Object.entries({
        maxEntries,
        maxResponseBytes
    })) {
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new TypeError(name + ' must be a positive safe integer');
    }
    for (const value of [defaultTtl, ...Object.values(ttlByTag)]) {
        if (!Number.isFinite(value) || value < 0)
            throw new TypeError('Cache TTL must be finite and non-negative');
    }

    const cache = new Map<string, CacheEntry>();
    const generations = new Map<string, number>();
    const isCurrent = (snapshot: CacheEntry['generations']) =>
        snapshot.every(
            ([name, generation]) => generations.get(name) === generation
        );

    return async (ctx: RequestContext, next: () => Promise<void>) => {
        const meta = ctx.items.get('__endpoint_meta') as any;
        const tags: readonly CacheTagDefinition[] = meta?.cacheTags ?? [];

        if (tags.length === 0) {
            return next();
        }

        if (isMutating(ctx.method)) {
            const names = tags.map(tag => tag.name);
            // Run handler first (so cache is invalidated only on success)
            await next();

            if (
                (ctx.response as ServerResponse).statusCode >= 200 &&
                (ctx.response as ServerResponse).statusCode < 300
            ) {
                for (const [name, generation] of generations) {
                    if (names.some(prefix => name.startsWith(prefix))) {
                        generations.set(name, generation + 1);
                    }
                }
                for (const [key, entry] of cache) {
                    if (!isCurrent(entry.generations)) cache.delete(key);
                }
            }
            return;
        }

        if (ctx.method === 'GET') {
            for (const [key, entry] of cache)
                if (entry.expiresAt <= Date.now()) cache.delete(key);
            // Build root for key computation
            const root = {
                params: ctx.pathParams ?? {},
                body: undefined,
                query: ctx.queryParams ?? {},
                headers: ctx.headers ?? {}
            };

            const keys = tags.map(tag => computeCacheKey(tag, root));
            const snapshot = tags.map(({ name }) => {
                if (!generations.has(name)) generations.set(name, 0);
                return [name, generations.get(name)!] as const;
            });

            // Check all keys — first valid cache hit wins
            for (const key of keys) {
                const entry = cache.get(key);
                if (
                    entry &&
                    entry.expiresAt > Date.now() &&
                    isCurrent(entry.generations)
                ) {
                    // Serve from cache
                    const res = ctx.response as ServerResponse;
                    res.writeHead(entry.status, entry.headers);
                    res.end(entry.body);
                    ctx.responded = true;
                    return;
                }
                if (entry) {
                    cache.delete(key);
                }
            }

            const snapshotResponse = await captureResponse(
                ctx.response,
                next,
                maxResponseBytes
            );
            if (!snapshotResponse) return;
            const {
                status: capturedStatus,
                headers: capturedHeaders,
                body
            } = snapshotResponse;
            if (
                Object.keys(capturedHeaders).some(
                    name => name.toLowerCase() === 'set-cookie'
                )
            )
                return;
            if (
                /\b(?:private|no-store)\b/i.test(
                    String(capturedHeaders['cache-control'] ?? '')
                )
            )
                return;

            // Store in cache on success
            if (
                capturedStatus >= 200 &&
                capturedStatus < 300 &&
                isCurrent(snapshot)
            ) {
                const ttl = tags.reduce((max, tag) => {
                    const t =
                        ttlByTag[tag.name] !== undefined
                            ? ttlByTag[tag.name]
                            : defaultTtl;
                    return t > max ? t : max;
                }, 0);

                if (ttl > 0) {
                    for (const key of keys) {
                        if (!cache.has(key) && cache.size >= maxEntries)
                            cache.delete(cache.keys().next().value!);
                        cache.set(key, {
                            status: capturedStatus,
                            headers: capturedHeaders,
                            body,
                            expiresAt: Date.now() + ttl,
                            generations: snapshot
                        });
                    }
                }
            }
            return;
        }

        // Non-GET, non-mutation — pass through
        return next();
    };
}
