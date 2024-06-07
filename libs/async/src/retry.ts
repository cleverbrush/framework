export type RetryOptions = {
    /**
     * Maximum number of retries. Defaults to 3.
     */
    maxRetries: number;
    /**
     * Minimum delay in milliseconds between retries. Defaults to 100 (ms).
     */
    minDelay?: number;
    /**
     * Factor by which to multiply the delay after each retry. Defaults to 2.
     */
    delayFactor?: number;
    /**
     * Randomization factor to apply to the delay. Must be a number between 0 and 1.
     * Defaults to 0, which means no randomization.
     * It can be useful to avoid retrying concurrent requests at the same time.
     * For example, to add 50% randomization, set this to 0.5.
     * It will randomize the delay between 50% and 100% of the original value.
     * i.e. if the delay is 100ms, it will randomize between 50ms and 100ms.
     * If you have `delayFactor` set to 2 then on next retry it will be between 100ms and 200ms.
     */
    delayRandomizationPercent?: number;
    /**
     * Function that determines whether to retry based on the error. Defaults to always retry.
     * It can be useful in certain cases to avoid retrying on certain errors.
     * i.e. when the error is a 404, it's not going to be retried.
     * @param error or other value
     * @returns boolean
     */
    shouldRetry?: (error: any) => boolean;
};

/**
 * Retry a async function up to `maxRetries` times with exponential backoff.
 */
export const retry = <T>(
    /**
     * The async function to retry.
     */
    fn: () => Promise<T>,
    /**
     * Options.
     */
    options?: RetryOptions
): Promise<T> => {
    // retry `promise` up to `maxRetries` times with exponential backoff
    const {
        maxRetries = 3,
        minDelay = 100,
        delayFactor = 2,
        delayRandomizationPercent: suppliedDelayRandomizationPercent = 0
    } = options ?? {};
    const delayRandomizationPercent = Math.min(
        1,
        Math.max(0, suppliedDelayRandomizationPercent)
    );
    return new Promise((resolve, reject) => {
        let retries = 0;
        const tryPromise = () => {
            fn()
                .then(resolve)
                .catch((error) => {
                    if (
                        retries < maxRetries &&
                        (!options?.shouldRetry || options.shouldRetry(error))
                    ) {
                        retries++;
                        let delay = minDelay * Math.pow(delayFactor, retries);
                        if (delayRandomizationPercent) {
                            delay -=
                                delay *
                                delayRandomizationPercent *
                                Math.random();
                        }
                        setTimeout(tryPromise, delay);
                    } else {
                        reject(error);
                    }
                });
        };
        tryPromise();
    });
};
