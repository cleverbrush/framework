import { retry } from './retry.js';

export type IntervalType = 'second' | 'minute' | 'hour' | 'day';

export type Interval = {
    /**
     * Type of interval to limit the function calls.
     */
    type: IntervalType;
    /**
     * Count of the interval type. E.g. if interval is 'hour' and length is 2, the interval is 2 hours.
     * If not provided, the interval is 1.
     */
    count?: number;
};

export type RateLimitOptions = {
    /**
     * Type of interval to limit the function calls.
     */
    interval: Interval;

    /**
     * Maximum cost allowed in the interval. If not provided, there is no cost limit.
     */
    maxCostPerInterval?: number;

    /**
     * Cost of each call. If not provided, each call is assumed to have a cost of 1.
     */
    costPerCall?: number;
};

export type RescheduleOptions = {
    /**
     * If `true` function calls will be rescheduled in case if the rate limit was reached.
     */
    enabled?: boolean;
    /**
     * If `true` function calls rescheduling will preserve the initial call order.
     */
    preserveCallOrder?: boolean;
    /**
     * Number of maximum reschedule attempts for a function.
     */
    maxRescheduleCount?: number;
};

export class RateLimitReachedException extends Error {
    readonly limit: RateLimitOptions;

    constructor(limit: RateLimitOptions) {
        super('Rate limit reached');
        this.limit = limit;
        this.name = 'RateLimitReachedException';
    }
}

const getIntervalLength = (interval: Interval) => {
    const count = interval.count || 1;
    switch (interval.type) {
        case 'second':
            return 1000 * count;
        case 'minute':
            return 1000 * count;
        case 'hour':
            return 1000 * count;
        case 'day':
            return 1000 * count;
    }
};

export const rateLimit = <T extends (...args: any[]) => any>(
    limit: RateLimitOptions,
    fn: T
): T => {
    let remainingCostInCurrentInterval = limit?.maxCostPerInterval || -1;
    const callCost = limit?.costPerCall || 1;
    const history: number[] = [];

    const intervalLength = getIntervalLength(limit.interval);

    return ((...args: any[]) => {
        const now = new Date().getTime();

        // first check if we need to adjust the current limit
        // by removing the calls that are outside the current interval
        while (history.length > 0 && history[0] < now - intervalLength) {
            history.shift();
            if (remainingCostInCurrentInterval !== -1) {
                remainingCostInCurrentInterval += callCost;
            }
        }

        // check if the call can be made
        if (
            remainingCostInCurrentInterval != -1 &&
            remainingCostInCurrentInterval < callCost
        ) {
            throw new RateLimitReachedException(limit);
        }

        // add the current call to the history
        history.push(now);

        if (remainingCostInCurrentInterval !== -1) {
            // adjust the remaining cost
            remainingCostInCurrentInterval -= callCost;
        }

        // call the function and return the result
        return fn(...args);
    }) as T;
};

export type RateLimitObject = <T extends Record<any, any>>(
    obj: T,
    options?: {
        /**
         * Type of interval to limit the function calls.
         */
        interval: Interval;
        /**
         * Maximum cost allowed in the interval. If not provided, there is no cost limit.
         */
        maxCostPerInterval?: number;
        /**
         * Whether to reschedule the function call when the limit is reached. If not provided, the function call is
         * rejected with `RateLimitReachedException` when the limit is reached.
         */
        reschedule?: RescheduleOptions;

        limits?: {
            [K in keyof T]?: Partial<RateLimitOptions> & {
                reschedule?: RescheduleOptions;
            };
        };
    }
) => {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
        ? (...args: A) => Promise<R>
        : T[K];
};

/**
 * Rate limit calls to functions in the `obj`. Every function can have different `costPerCall`
 * @param obj
 * @param options
 * @returns
 */
export const rateLimitObject: RateLimitObject = (obj, options) => {
    const result = {};

    if (typeof obj !== 'object' || obj === null) {
        throw new Error('obj must be a non null object');
    }

    options = options || {
        interval: {
            type: 'second',
            count: 1
        }
    };

    const maxGlobalCostPerInterval = options?.maxCostPerInterval || -1;
    let remainingCostInCurrentInterval = maxGlobalCostPerInterval;
    const keys = Object.keys(obj);

    keys.forEach((k) => {
        if (typeof obj[k] === 'function') {
            if (options?.reschedule) {
                // not implemeted
                return;
            }

            result[k] = (...args) => {
                const limitOverride =
                    options?.limits && options.limits[k]
                        ? options.limits[k]
                        : null;
                const callCost =
                    limitOverride?.costPerCall === 0
                        ? 0
                        : limitOverride?.costPerCall || 1;

                if (callCost <= 0 || maxGlobalCostPerInterval <= 0) {
                    return Promise.resolve(obj[k](...args));
                }
            };
            return;
        }
        result[k] = obj[k];
    });

    return result as any;
};
