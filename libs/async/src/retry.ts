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
    const { maxRetries = 3, minDelay = 100, delayFactor = 2 } = options ?? {};
    return new Promise((resolve, reject) => {
        let retries = 0;
        const tryPromise = () => {
            fn()
                .then(resolve)
                .catch((error) => {
                    if (retries < maxRetries) {
                        retries++;
                        const delay = minDelay * Math.pow(delayFactor, retries);
                        setTimeout(tryPromise, delay);
                    } else {
                        reject(error);
                    }
                });
        };
        tryPromise();
    });
};
