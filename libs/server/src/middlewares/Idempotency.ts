import { createHash } from 'node:crypto';
import { HttpError } from '../HttpError.js';
import type { RequestContext } from '../RequestContext.js';
import type { Middleware } from '../types.js';
import { captureResponse, type ResponseSnapshot } from './ResponseSnapshot.js';

/** Configuration for bounded, process-local mutation response replay. */
export interface ServerIdempotencyOptions {
    /**
     * Explicit authorization/tenant scope. Run after authentication and
     * authorization. Return undefined to skip; use a fixed string only for
     * deliberately public operations. Never use an unverified identity header.
     */
    scope: (ctx: RequestContext) => string | undefined;
    /** Stored response lifetime in milliseconds. Default: 86,400,000. */
    ttl?: number;
    /** Case-insensitive request header. Default: x-idempotency-key. */
    headerName?: string;
    /** Default: skip GET, HEAD, OPTIONS and other non-mutating methods. */
    skip?: (ctx: RequestContext) => boolean;
    /** Maximum retained keys, including pending requests. Default: 1000. */
    maxEntries?: number;
    /** Maximum response body retained per key. Default: 65,536 bytes. */
    maxResponseBytes?: number;
}

interface Entry {
    result: Promise<ResponseSnapshot | undefined>;
    expiresAt: number;
}

/**
 * Replay completed mutations and coalesce concurrent requests within one
 * middleware instance. Keys include explicit scope, method and full request URL.
 * Reusing a key means retrying the same input; bodies are not fingerprinted.
 * This is not durable exactly-once execution: restarts, expiry and thrown
 * failures may permit another execution. Use database deduplication for that.
 * Oversized/incomplete responses retain a non-replayable reservation (409).
 * Capacity exhaustion returns 503 without executing the operation.
 */
export function idempotency(options: ServerIdempotencyOptions): Middleware {
    if (typeof options?.scope !== 'function')
        throw new TypeError('idempotency requires an explicit scope');
    const {
        scope,
        ttl = 86_400_000,
        headerName = 'x-idempotency-key',
        skip = ctx => !['POST', 'PUT', 'DELETE', 'PATCH'].includes(ctx.method),
        maxEntries = 1000,
        maxResponseBytes = 65_536
    } = options;
    for (const [name, value] of Object.entries({
        ttl,
        maxEntries,
        maxResponseBytes
    })) {
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new TypeError(name + ' must be a positive safe integer');
    }
    const store = new Map<string, Entry>();
    return async (ctx, next) => {
        const supplied =
            ctx.headers[headerName.toLowerCase()] ?? ctx.headers[headerName];
        if (skip(ctx) || !supplied) return next();
        if (supplied.length > 256)
            throw new HttpError(400, 'Idempotency key is too long');
        const identity = scope(ctx);
        if (identity === undefined) return next();
        if (typeof identity !== 'string')
            throw new TypeError('Idempotency scope must be a string');
        const key = createHash('sha256')
            .update(
                JSON.stringify([
                    identity,
                    ctx.method,
                    ctx.url?.href ?? '/',
                    supplied
                ])
            )
            .digest('hex');
        const now = Date.now();
        for (const [k, entry] of store)
            if (entry.expiresAt <= now) store.delete(k);
        const existing = store.get(key);
        if (existing) {
            const snapshot = await existing.result;
            if (!snapshot)
                throw new HttpError(
                    409,
                    'The previous response cannot be replayed; verify the operation outcome'
                );
            ctx.response.writeHead(snapshot.status, snapshot.headers);
            ctx.response.end(snapshot.body);
            ctx.responded = true;
            return;
        }
        if (store.size >= maxEntries)
            throw new HttpError(503, 'Idempotency capacity reached');
        let resolve!: (value: ResponseSnapshot | undefined) => void;
        let reject!: (error: unknown) => void;
        const result = new Promise<ResponseSnapshot | undefined>((yes, no) => {
            resolve = yes;
            reject = no;
        });
        // The first caller observes errors directly even when no waiter exists.
        void result.catch(() => undefined);
        const entry: Entry = { result, expiresAt: Infinity };
        store.set(key, entry);
        try {
            const snapshot = await captureResponse(
                ctx.response,
                next,
                maxResponseBytes
            );
            entry.expiresAt = Date.now() + ttl;
            resolve(snapshot);
        } catch (error) {
            store.delete(key);
            reject(error);
            throw error;
        }
    };
}
