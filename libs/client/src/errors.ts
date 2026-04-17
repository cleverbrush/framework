/**
 * Base error class for all errors thrown by the `@cleverbrush/web` client.
 *
 * Provides a common prototype chain so consumers can catch *any* client
 * error with a single `instanceof WebError` check.
 *
 * @example
 * ```ts
 * try {
 *     await client.todos.list();
 * } catch (err) {
 *     if (err instanceof WebError) {
 *         console.log('Client error:', err.message);
 *     }
 * }
 * ```
 */
export class WebError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'WebError';
    }
}

/**
 * Error thrown by the typed HTTP client when the server responds with a
 * non-2xx status code.
 *
 * @example
 * ```ts
 * try {
 *     await client.todos.get({ params: { id: 999 } });
 * } catch (err) {
 *     if (err instanceof ApiError && err.status === 404) {
 *         console.log('Not found:', err.message);
 *     }
 * }
 * ```
 */
export class ApiError extends WebError {
    /**
     * @param status - The HTTP status code (e.g. 404, 500).
     * @param message - A human-readable error description.
     * @param body - The parsed response body, if the server returned JSON.
     */
    constructor(
        public readonly status: number,
        message: string,
        public readonly body: unknown = undefined
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Error thrown when a request exceeds the configured timeout.
 *
 * @example
 * ```ts
 * try {
 *     await client.todos.list({ timeout: 5000 });
 * } catch (err) {
 *     if (err instanceof TimeoutError) {
 *         console.log('Request timed out after', err.timeout, 'ms');
 *     }
 * }
 * ```
 */
export class TimeoutError extends WebError {
    /**
     * @param timeout - The timeout duration in milliseconds that was exceeded.
     */
    constructor(public readonly timeout: number) {
        super(`Request timed out after ${timeout}ms`);
        this.name = 'TimeoutError';
    }
}

/**
 * Error thrown when a request fails due to a network-level issue
 * (e.g. DNS failure, connection refused, offline).
 *
 * The original error is available via the standard `cause` property.
 *
 * @example
 * ```ts
 * try {
 *     await client.todos.list();
 * } catch (err) {
 *     if (err instanceof NetworkError) {
 *         console.log('Network issue:', err.cause);
 *     }
 * }
 * ```
 */
export class NetworkError extends WebError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'NetworkError';
    }
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Type guard for {@link ApiError}.
 *
 * @example
 * ```ts
 * catch (err) {
 *     if (isApiError(err)) {
 *         console.log(err.status, err.body);
 *     }
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

/**
 * Type guard for {@link TimeoutError}.
 *
 * @example
 * ```ts
 * catch (err) {
 *     if (isTimeoutError(err)) {
 *         console.log('Timed out after', err.timeout, 'ms');
 *     }
 * }
 * ```
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
}

/**
 * Type guard for {@link NetworkError}.
 *
 * @example
 * ```ts
 * catch (err) {
 *     if (isNetworkError(err)) {
 *         console.log('Network failure:', err.cause);
 *     }
 * }
 * ```
 */
export function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

/**
 * Type guard for {@link WebError} (any client error).
 *
 * @example
 * ```ts
 * catch (err) {
 *     if (isWebError(err)) {
 *         // err is ApiError | TimeoutError | NetworkError | WebError
 *     }
 * }
 * ```
 */
export function isWebError(error: unknown): error is WebError {
    return error instanceof WebError;
}
