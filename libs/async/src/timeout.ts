/**
 * Generic promise timeout wrapper.
 *
 * Executes an async function and rejects with a `TimeoutError` if it does
 * not resolve within the specified duration.
 *
 * @module
 */

/**
 * Error thrown by {@link withTimeout} when the operation exceeds the
 * specified duration.
 */
export class TimeoutError extends Error {
    constructor(
        /** The timeout duration in milliseconds that was exceeded. */
        public readonly timeout: number
    ) {
        super(`Operation timed out after ${timeout}ms`);
        this.name = 'TimeoutError';
    }
}

/**
 * Executes an async function with a timeout.
 *
 * If the function does not resolve within `ms` milliseconds, the returned
 * promise rejects with a {@link TimeoutError}.  If an `AbortSignal` is
 * provided it is aborted on timeout, allowing the wrapped operation to
 * clean up.
 *
 * @typeParam T - The resolved value type of the wrapped function.
 * @param fn - The async function to execute.  Receives an `AbortSignal`
 *   that fires when the timeout elapses.
 * @param ms - Maximum allowed duration in milliseconds.
 * @returns The value returned by `fn`, if it resolves in time.
 * @throws {@link TimeoutError} if `ms` elapses before `fn` resolves.
 *
 * @example
 * ```ts
 * import { withTimeout } from '@cleverbrush/async';
 *
 * const data = await withTimeout(
 *     (signal) => fetch('/api/data', { signal }).then(r => r.json()),
 *     5000
 * );
 * ```
 */
export function withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    ms: number
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const controller = new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
            reject(new TimeoutError(ms));
        }, ms);

        fn(controller.signal).then(
            value => {
                clearTimeout(timer);
                resolve(value);
            },
            error => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}
