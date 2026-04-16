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
export class ApiError extends Error {
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
