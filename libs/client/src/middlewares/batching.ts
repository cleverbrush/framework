/**
 * Request batching middleware for the `@cleverbrush/client` typed HTTP client.
 *
 * Queues concurrent HTTP requests and sends them together as a single
 * `POST /__batch` request, dramatically reducing network round-trips for
 * chatty UIs that fire many parallel calls.
 *
 * Requests are collected for up to `windowMs` milliseconds or until
 * `maxSize` requests are queued, whichever comes first. A single queued
 * request is passed through directly (no batching overhead).
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/client';
 * import { batching } from '@cleverbrush/client/batching';
 *
 * const client = createClient(api, {
 *     middlewares: [batching({ maxSize: 10, windowMs: 10 })],
 * });
 *
 * // These three concurrent calls are sent as ONE POST /__batch request.
 * const [todos, user, stats] = await Promise.all([
 *     client.todos.list(),
 *     client.users.me(),
 *     client.stats.summary(),
 * ]);
 * ```
 *
 * @module
 */

import type { FetchLike, Middleware } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link batching} middleware.
 */
export interface BatchingOptions {
    /**
     * Maximum number of requests to include in a single batch.
     *
     * When the queue reaches this size the batch is flushed immediately,
     * before the `windowMs` timer fires.
     *
     * @default 10
     */
    maxSize?: number;

    /**
     * Time window in milliseconds to collect requests before flushing.
     *
     * The first request in a new window starts the timer. All subsequent
     * requests received before the timer fires are included in the same batch.
     *
     * @default 10
     */
    windowMs?: number;

    /**
     * URL path of the server-side batch endpoint.
     *
     * Must match the path configured via `ServerBuilder.useBatching()` on the
     * server (default `'/__batch'`).
     *
     * @default '/__batch'
     */
    batchPath?: string;

    /**
     * Predicate to exclude specific requests from batching.
     *
     * Return `true` to send the request immediately, bypassing the batch
     * queue. Useful for streaming endpoints, file uploads, or requests that
     * must not be delayed.
     *
     * @param url  - The fully-resolved request URL.
     * @param init - The `RequestInit` object for the request.
     */
    skip?: (url: string, init: RequestInit) => boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface QueueItem {
    url: string;
    init: RequestInit;
    resolve: (res: Response) => void;
    reject: (err: unknown) => void;
}

interface BatchRequestItem {
    method: string;
    /** Path + query string, e.g. `/api/todos?page=1`. */
    url: string;
    headers: Record<string, string>;
    /** Raw JSON-serialized body string, or absent for GET/HEAD/DELETE. */
    body?: string;
}

interface BatchResponseItem {
    status: number;
    headers: Record<string, string>;
    /** Raw response body string (JSON or plain text). */
    body: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the path + query from a URL, stripping the scheme and host. */
function extractPath(url: string): string {
    try {
        const u = new URL(url);
        return u.pathname + u.search;
    } catch {
        // Already a relative path.
        return url;
    }
}

/** Resolves the batch endpoint URL from a sample request URL. */
function resolveBatchUrl(sampleUrl: string, batchPath: string): string {
    try {
        const u = new URL(sampleUrl);
        return `${u.protocol}//${u.host}${batchPath}`;
    } catch {
        // Relative — use the path directly.
        return batchPath;
    }
}

/** Normalises a `HeadersInit` value to a plain `Record<string, string>`. */
function flattenHeaders(
    headers: HeadersInit | undefined
): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    if (Array.isArray(headers)) {
        const result: Record<string, string> = {};
        for (const [key, value] of headers) result[key] = value;
        return result;
    }
    return { ...headers } as Record<string, string>;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a request batching middleware.
 *
 * Concurrent calls made through the same client are transparently coalesced
 * into a single `POST` to the batch endpoint. Each individual call site
 * receives its own typed response — the batching is completely invisible to
 * application code.
 *
 * **Placement**: place `batching()` as the **last** middleware in the array
 * (closest to the actual fetch). Wrapping it with `retry()` and `timeout()`
 * lets those middlewares operate on each logical call's promise independently.
 *
 * **Requests that are never batched**:
 * - The batch endpoint itself (prevents infinite recursion).
 * - `FormData` or `ReadableStream` bodies (binary / streaming).
 * - Any request matching the `skip` predicate.
 * - Single-item flushes (sent directly, no batch overhead).
 *
 * @param options - Batching configuration.
 * @returns A {@link Middleware} that batches concurrent requests.
 *
 * @example
 * ```ts
 * import { retry } from '@cleverbrush/client/retry';
 * import { timeout } from '@cleverbrush/client/timeout';
 * import { batching } from '@cleverbrush/client/batching';
 *
 * const client = createClient(api, {
 *     middlewares: [
 *         retry(),
 *         timeout(),
 *         batching({ maxSize: 10, windowMs: 10 }),
 *     ],
 * });
 * ```
 */
export function batching(options: BatchingOptions = {}): Middleware {
    const {
        maxSize = 10,
        windowMs = 10,
        batchPath = '/__batch',
        skip
    } = options;

    const queue: QueueItem[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flush(innerFetch: FetchLike): void {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }

        const batch = queue.splice(0);
        if (batch.length === 0) return;

        // Single-item passthrough — no batching overhead.
        if (batch.length === 1) {
            const item = batch[0];
            innerFetch(item.url, item.init).then(item.resolve, item.reject);
            return;
        }

        // Build the batch request payload.
        const requests: BatchRequestItem[] = batch.map(item => {
            const descriptor: BatchRequestItem = {
                method: (item.init.method ?? 'GET').toUpperCase(),
                url: extractPath(item.url),
                headers: flattenHeaders(item.init.headers)
            };
            if (item.init.body != null && typeof item.init.body === 'string') {
                descriptor.body = item.init.body;
            }
            return descriptor;
        });

        const batchUrl = resolveBatchUrl(batch[0].url, batchPath);

        innerFetch(batchUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ requests })
        }).then(
            async batchResponse => {
                if (!batchResponse.ok) {
                    const err = new Error(
                        `Batch request failed with status ${batchResponse.status}`
                    );
                    for (const item of batch) item.reject(err);
                    return;
                }

                let data: { responses: BatchResponseItem[] };
                try {
                    data = (await batchResponse.json()) as {
                        responses: BatchResponseItem[];
                    };
                } catch {
                    const err = new Error(
                        'Failed to parse batch response body'
                    );
                    for (const item of batch) item.reject(err);
                    return;
                }

                for (let i = 0; i < batch.length; i++) {
                    const resp = data.responses[i];
                    if (!resp) {
                        batch[i].reject(
                            new Error(`Missing batch response for request ${i}`)
                        );
                        continue;
                    }
                    batch[i].resolve(
                        new Response(resp.body || null, {
                            status: resp.status,
                            headers: resp.headers
                        })
                    );
                }
            },
            (err: unknown) => {
                for (const item of batch) item.reject(err);
            }
        );
    }

    return next => (url, init) => {
        // Never batch the batch endpoint itself (prevents infinite recursion).
        if (url.includes(batchPath)) {
            return next(url, init);
        }

        // Honour the user-provided skip predicate.
        if (skip?.(url, init)) {
            return next(url, init);
        }

        // Never batch streaming or binary bodies.
        if (
            init.body instanceof ReadableStream ||
            (typeof FormData !== 'undefined' && init.body instanceof FormData)
        ) {
            return next(url, init);
        }

        return new Promise<Response>((resolve, reject) => {
            queue.push({ url, init, resolve, reject });

            // Flush immediately on maxSize.
            if (queue.length >= maxSize) {
                flush(next);
                return;
            }

            // Schedule a flush after windowMs.
            if (timer === null) {
                timer = setTimeout(() => flush(next), windowMs);
            }
        });
    };
}
