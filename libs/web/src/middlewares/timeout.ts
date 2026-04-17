/**
 * Timeout middleware for the `@cleverbrush/web` client.
 *
 * Aborts requests that exceed a configurable duration, throwing a
 * {@link TimeoutError}.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/web';
 * import { timeout } from '@cleverbrush/web/timeout';
 *
 * const client = createClient(api, {
 *     middlewares: [timeout({ timeout: 10000 })],
 * });
 * ```
 *
 * @module
 */

import { TimeoutError } from '../errors.js';
import type { Middleware } from '../middleware.js';
import { getPerCallOptions } from '../middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link timeout} middleware.
 */
export interface TimeoutOptions {
    /**
     * Per-request timeout in milliseconds.
     * Defaults to `10000` (10 seconds).
     */
    timeout?: number;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Creates a timeout middleware for the `@cleverbrush/web` client.
 *
 * If the request does not complete within the configured duration,
 * the request is aborted and a {@link TimeoutError} is thrown.
 *
 * @param options - Timeout configuration.
 * @returns A {@link Middleware} that enforces request timeouts.
 *
 * @example
 * ```ts
 * // 5 second timeout:
 * const client = createClient(api, {
 *     middlewares: [timeout({ timeout: 5000 })],
 * });
 * ```
 */
export function timeout(options: TimeoutOptions = {}): Middleware {
    const { timeout: ms = 10000 } = options;

    return next => (url, init) => {
        // Per-call override (e.g. { timeout: 30000 })
        const perCall = getPerCallOptions<number>(init, 'timeout');
        const effectiveMs = perCall ?? ms;

        const controller = new AbortController();

        // If the caller already set a signal, listen to it too.
        if (init.signal) {
            if (init.signal.aborted) {
                controller.abort(init.signal.reason);
            } else {
                init.signal.addEventListener(
                    'abort',
                    () => controller.abort(init.signal!.reason),
                    { once: true }
                );
            }
        }

        const timer = setTimeout(() => {
            controller.abort();
        }, effectiveMs);

        return next(url, { ...init, signal: controller.signal }).then(
            response => {
                clearTimeout(timer);
                return response;
            },
            error => {
                clearTimeout(timer);
                // Only wrap in TimeoutError if *we* caused the abort.
                if (controller.signal.aborted && !init.signal?.aborted) {
                    throw new TimeoutError(effectiveMs);
                }
                throw error;
            }
        );
    };
}
