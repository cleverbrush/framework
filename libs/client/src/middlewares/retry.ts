/**
 * Retry middleware for the `@cleverbrush/web` client.
 *
 * Automatically retries failed requests based on HTTP status codes and
 * methods.  Supports exponential backoff, jitter, and `Retry-After`
 * header parsing.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/web';
 * import { retry } from '@cleverbrush/web/retry';
 *
 * const client = createClient(api, {
 *     middlewares: [retry({ limit: 3, jitter: true })],
 * });
 * ```
 *
 * @module
 */

import { ApiError } from '../errors.js';
import type { Middleware } from '../middleware.js';
import { getPerCallOptions } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link retry} middleware.
 */
export interface RetryOptions {
    /**
     * Maximum number of retry attempts. Defaults to `2`.
     */
    limit?: number;

    /**
     * HTTP methods that are eligible for retry.
     * Defaults to `['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS']`.
     */
    methods?: string[];

    /**
     * HTTP status codes that trigger a retry.
     * Defaults to `[408, 429, 500, 502, 503, 504]`.
     */
    statusCodes?: number[];

    /**
     * Maximum delay in milliseconds between retries.
     * Defaults to `Infinity`.
     */
    backoffLimit?: number;

    /**
     * Custom delay function. Receives the current attempt number (1-based)
     * and returns the delay in milliseconds.
     *
     * Defaults to exponential backoff: `0.3 * 2^(attempt-1) * 1000`.
     */
    delay?: (attemptCount: number) => number;

    /**
     * Adds randomized jitter to the delay to avoid thundering-herd problems.
     *
     * - `true` — applies full jitter (`delay * random(0, 1)`).
     * - A function — custom jitter: `(delay) => adjustedDelay`.
     *
     * Defaults to `false` (no jitter).
     */
    jitter?: boolean | ((delay: number) => number);

    /**
     * Custom predicate to decide whether to retry a given error.
     * When provided, it is checked *in addition to* the `statusCodes` check.
     */
    shouldRetry?: (error: Error, retryCount: number) => boolean;

    /**
     * Whether to retry on timeout errors.
     * Defaults to `false`.
     */
    retryOnTimeout?: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 2;

const DEFAULT_METHODS = ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS'];

const DEFAULT_STATUS_CODES = [408, 429, 500, 502, 503, 504];

function defaultDelay(attempt: number): number {
    return 0.3 * 2 ** (attempt - 1) * 1000;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRetryAfter(response: Response): number | null {
    const header = response.headers.get('retry-after');
    if (!header) return null;

    // Retry-After can be a number of seconds or an HTTP-date.
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) {
        return seconds * 1000;
    }

    const date = Date.parse(header);
    if (!Number.isNaN(date)) {
        return Math.max(0, date - Date.now());
    }

    return null;
}

function applyJitter(
    delay: number,
    jitter: boolean | ((d: number) => number)
): number {
    if (typeof jitter === 'function') return jitter(delay);
    if (jitter === true) return delay * Math.random();
    return delay;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a retry middleware for the `@cleverbrush/web` client.
 *
 * @param options - Retry configuration.
 * @returns A {@link Middleware} that wraps fetch calls with retry logic.
 *
 * @example
 * ```ts
 * // Basic usage — retry up to 3 times on server errors:
 * const client = createClient(api, {
 *     middlewares: [retry({ limit: 3 })],
 * });
 *
 * // Advanced — custom backoff with jitter:
 * const client = createClient(api, {
 *     middlewares: [retry({
 *         limit: 5,
 *         delay: (n) => Math.min(1000 * 2 ** n, 30000),
 *         jitter: true,
 *         statusCodes: [429, 502, 503],
 *     })],
 * });
 * ```
 */
export function retry(options: RetryOptions = {}): Middleware {
    const {
        limit = DEFAULT_LIMIT,
        methods = DEFAULT_METHODS,
        statusCodes = DEFAULT_STATUS_CODES,
        backoffLimit = Infinity,
        delay: delayFn = defaultDelay,
        jitter = false,
        shouldRetry,
        retryOnTimeout = false
    } = options;

    const methodSet = new Set(methods.map(m => m.toUpperCase()));
    const statusSet = new Set(statusCodes);

    return next => async (url, init) => {
        // Per-call overrides (e.g. { retry: { limit: 5 } })
        const perCall = getPerCallOptions<Partial<RetryOptions>>(init, 'retry');
        const effectiveLimit = perCall?.limit ?? limit;
        const effectiveRetryOnTimeout =
            perCall?.retryOnTimeout ?? retryOnTimeout;

        const method = (init.method ?? 'GET').toUpperCase();

        // Non-retryable methods go straight through.
        if (!methodSet.has(method)) {
            return next(url, init);
        }

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= effectiveLimit; attempt++) {
            try {
                const response = await next(url, init);

                if (
                    !statusSet.has(response.status) ||
                    attempt >= effectiveLimit
                ) {
                    return response;
                }

                // Retryable status code — calculate delay.
                const retryAfter = parseRetryAfter(response);
                let delay = retryAfter ?? delayFn(attempt + 1);
                delay = applyJitter(delay, jitter);
                delay = Math.min(delay, backoffLimit);

                await sleep(delay);
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));

                if (attempt >= effectiveLimit) throw lastError;

                // Check if this error is retryable.
                const isTimeout =
                    lastError.name === 'TimeoutError' ||
                    (lastError instanceof ApiError && lastError.status === 408);

                if (isTimeout && !effectiveRetryOnTimeout) throw lastError;

                if (shouldRetry && !shouldRetry(lastError, attempt + 1)) {
                    throw lastError;
                }

                let delay = delayFn(attempt + 1);
                delay = applyJitter(delay, jitter);
                delay = Math.min(delay, backoffLimit);

                await sleep(delay);
            }
        }

        // Should not be reached, but TypeScript needs this.
        throw lastError ?? new Error('Retry failed');
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
