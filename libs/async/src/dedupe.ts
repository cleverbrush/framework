/**
 * Deduplication wrapper for async functions.
 *
 * Prevents duplicate concurrent calls to the same async operation by
 * sharing the in-flight promise across all callers with the same key.
 *
 * @module
 */

/**
 * Wraps an async function so that concurrent calls with the same key
 * share a single in-flight promise instead of starting duplicate operations.
 *
 * Once the shared promise resolves (or rejects), subsequent calls will
 * start a new operation.
 *
 * @typeParam TArgs - The argument types of the wrapped function.
 * @typeParam T - The return type of the wrapped function.
 * @param keyFn - A function that computes a cache key from the arguments.
 *   Calls with the same key will be deduplicated.
 * @param fn - The async function to wrap.
 * @returns A deduplicated version of `fn`.
 *
 * @example
 * ```ts
 * import { dedupe } from '@cleverbrush/async';
 *
 * const fetchUser = dedupe(
 *     (id: number) => `user-${id}`,
 *     (id: number) => fetch(`/api/users/${id}`).then(r => r.json())
 * );
 *
 * // These two calls share a single fetch:
 * const [a, b] = await Promise.all([fetchUser(1), fetchUser(1)]);
 * ```
 */
export function dedupe<TArgs extends any[], T>(
    keyFn: (...args: TArgs) => string,
    fn: (...args: TArgs) => Promise<T>
): (...args: TArgs) => Promise<T> {
    const inflight = new Map<string, Promise<T>>();

    return (...args: TArgs): Promise<T> => {
        const key = keyFn(...args);
        const existing = inflight.get(key);
        if (existing) return existing;

        const promise = fn(...args).finally(() => {
            inflight.delete(key);
        });

        inflight.set(key, promise);
        return promise;
    };
}
