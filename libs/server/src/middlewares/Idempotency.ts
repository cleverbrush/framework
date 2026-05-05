/**
 * Server-side idempotency middleware.
 *
 * Ensures mutating requests with the same idempotency key produce the
 * same result exactly once — subsequent replays return the stored
 * response without re-executing the handler.
 *
 * @module
 */

import type { ServerResponse } from 'node:http';
import type { RequestContext } from '../RequestContext.js';
import type { Middleware } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link idempotency}.
 */
export interface ServerIdempotencyOptions {
    /**
     * TTL in milliseconds for stored responses.
     * Defaults to `86_400_000` (24 hours).
     */
    ttl?: number;

    /**
     * Header name to read the idempotency key from.
     * Defaults to `"x-idempotency-key"`.
     */
    headerName?: string;

    /**
     * Predicate that decides whether a request should be skipped.
     * Defaults to skipping non-mutating requests (GET, HEAD, OPTIONS).
     */
    skip?: (ctx: RequestContext) => boolean;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface StoredResponse {
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
    expiresAt: number;
}

function isMutating(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
}

const CLEANUP_INTERVAL = 60_000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Server-side idempotency middleware.
 *
 * Reads the `x-idempotency-key` header from mutating requests. If a
 * response has already been stored for that key, it is returned
 * immediately — the handler is never called. Otherwise the handler
 * executes and its response is stored for future replays.
 *
 * GET, HEAD, and OPTIONS requests pass through without checking.
 *
 * @param options - Configuration.
 * @returns A server-side {@link Middleware}.
 *
 * @example
 * ```ts
 * server.handle(CreateTodo, createHandler, {
 *     middlewares: [idempotency({ ttl: 86_400_000 })]
 * });
 * ```
 */
export function idempotency(
    options: ServerIdempotencyOptions = {}
): Middleware {
    const {
        ttl = 86_400_000,
        headerName = 'x-idempotency-key',
        skip = (ctx: RequestContext) => !isMutating(ctx.method)
    } = options;

    const store = new Map<string, StoredResponse>();

    // Periodic cleanup of expired entries
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (entry.expiresAt <= now) {
                store.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);

    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }

    return async (ctx: RequestContext, next: () => Promise<void>) => {
        if (skip(ctx)) {
            return next();
        }

        const key =
            ctx.headers[headerName] ?? ctx.headers[headerName.toLowerCase()];
        if (!key || typeof key !== 'string' || key.length === 0) {
            return next();
        }

        // Check if we already have a stored response for this key
        const stored = store.get(key);
        if (stored) {
            if (stored.expiresAt <= Date.now()) {
                store.delete(key);
                // Expired — fall through to handler
            } else {
                // Replay stored response
                const res = ctx.response as ServerResponse;
                res.writeHead(stored.status, stored.headers);
                res.end(stored.body);
                ctx.responded = true;
                return;
            }
        }

        // Capture the handler's response for future replays
        const originalWriteHead = (
            ctx.response as ServerResponse
        ).writeHead.bind(ctx.response);
        const originalEnd = (ctx.response as ServerResponse).end.bind(
            ctx.response
        );

        let capturedStatus = 200;
        let capturedHeaders: Record<string, string | string[] | undefined> = {};
        const chunks: Buffer[] = [];

        (ctx.response as ServerResponse).writeHead = function (
            this: ServerResponse,
            statusCode: number,
            ...args: any[]
        ) {
            capturedStatus = statusCode;
            if (args.length > 0) {
                capturedHeaders = args[0];
            }
            return originalWriteHead(statusCode, ...args) as ServerResponse;
        } as any;

        (ctx.response as ServerResponse).end = function (
            this: ServerResponse,
            chunk?: any,
            ...args: any[]
        ) {
            if (chunk) {
                chunks.push(
                    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                );
            }
            return originalEnd(chunk, ...args) as ServerResponse;
        } as any;

        await next();

        // Store the response for future replays
        if (capturedStatus >= 200 && capturedStatus < 500) {
            const body = Buffer.concat(chunks);
            store.set(key, {
                status: capturedStatus,
                headers: capturedHeaders,
                body,
                expiresAt: Date.now() + ttl
            });
        }
    };
}
