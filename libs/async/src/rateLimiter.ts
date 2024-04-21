import { Limit, rateLimit } from './rateLimit.js';

export type RateLimiter<
    T extends Record<string, (...args: any[]) => any> = {}
> = {
    add<N extends string, V extends (...args: any[]) => any>(
        name: N,
        fn: V,
        limit?: Limit
    ): RateLimiter<T & Record<N, V>>;
    remove<N extends keyof T>(name: N): RateLimiter<Omit<T, N>>;
    end: () => Readonly<T>;
};

/**
 * Rate limit an object's method calls.
 * Used to limit the number of times a method can be called in a given time frame.
 * There are two types of rate limiting:
 * 1. Limiting the number (or cost) of calls to some method.
 * 2. Limiting the number (or cost) of calls to all methods of an object.
 *
 * If the limit is violated a call can be retried (if `retryIfRateLimited` is set to `true`),
 * or a `RateLimitViolatedException` will be thrown.
 */
export const rateLimiter: (limit?: Limit) => RateLimiter = (limit?: Limit) => {
    const globalLimit = limit;
    const methods = new Map<string, (...args: any[]) => any>();
    const limits = new Map<string, Limit>();
    return {
        add(name, fn, limit?: Limit) {
            methods.set(name, fn);
            if (limit) {
                limits.set(name, limit);
            }
            return this as RateLimiter;
        },
        end() {
            return Object.freeze(
                [...methods].reduce(
                    (acc, [name, fn]) => ({
                        ...acc,
                        [name]: limits.has(name)
                            ? rateLimit(limits.get(name)!, fn)
                            : fn
                    }),
                    {} as Record<string, (...args: any[]) => any>
                )
            ) as Readonly<Record<string, (...args: any[]) => any>>;
        },
        remove(name) {
            methods.delete(name);
            limits.delete(name);
            return this as RateLimiter;
        }
    };
};

const k = rateLimiter()
    .add('test1', (s: string) => s)
    .end();
