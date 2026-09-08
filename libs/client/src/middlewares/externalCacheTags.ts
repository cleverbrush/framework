import type { EndpointMeta, Middleware } from '../middleware.js';
import {
    computeCacheTagKey,
    createCacheTagRoot,
    isMutatingMethod,
    type SerializedCacheTag
} from './cacheTags.js';

/**
 * Configuration for {@link externalCacheTags}.
 */
export interface ExternalCacheTagsOptions {
    /**
     * Callback invoked for each tag that should be invalidated in an external
     * cache system.
     *
     * Pass any framework or platform cache invalidation function here. For
     * example, Next.js users can pass `revalidateTag` from `next/cache`.
     */
    invalidateTag: (tag: string) => void | Promise<void>;

    /**
     * Predicate that decides whether a response should trigger invalidation.
     *
     * @defaultValue `(response) => response.ok`
     */
    condition?: (response: Response) => boolean;

    /**
     * Also invalidate the base tag name when a dynamic tag key is computed.
     *
     * @defaultValue `true`
     */
    invalidateBaseTags?: boolean;
}

/**
 * Create a middleware that bridges endpoint cache tags to an external cache.
 *
 * The middleware reads endpoint `.cacheTag()` / `.clearsCacheTag()` metadata
 * from client requests and calls `invalidateTag()` after successful mutating
 * requests (`POST`, `PUT`, `PATCH`, or `DELETE`). Dynamic tags invalidate both
 * the base tag name and the computed key by default.
 *
 * @param options - External cache-tag invalidation options.
 * @returns A client middleware for `createClient()`.
 *
 * @example
 * ```ts
 * import { revalidateTag } from 'next/cache';
 * import { externalCacheTags } from '@cleverbrush/client/cache';
 *
 * const client = createClient(api, {
 *     middlewares: [
 *         externalCacheTags({ invalidateTag: revalidateTag }),
 *     ],
 * });
 * ```
 */
export function externalCacheTags(
    options: ExternalCacheTagsOptions
): Middleware {
    const {
        invalidateTag,
        condition = (response: Response) => response.ok,
        invalidateBaseTags = true
    } = options;

    return next => async (url, init) => {
        const meta = (init as any).__endpointMeta as EndpointMeta | undefined;
        const method = (init.method ?? meta?.method ?? 'GET').toUpperCase();
        const tags: readonly SerializedCacheTag[] | undefined = meta?.cacheTags;

        if (!meta || !tags || tags.length === 0 || !isMutatingMethod(method)) {
            return next(url, init);
        }

        const root = createCacheTagRoot(meta);
        const tagKeys = new Set<string>();

        for (const tag of tags) {
            const dynamicKey = computeCacheTagKey(tag, root);
            if (invalidateBaseTags) tagKeys.add(tag.name);
            tagKeys.add(dynamicKey);
        }

        // Freeze keys before dispatch and reject invalid selectors before a
        // write is sent, not after the server has already committed it.
        const response = await next(url, init);
        if (condition(response)) {
            await Promise.all([...tagKeys].map(tag => invalidateTag(tag)));
        }
        return response;
    };
}
