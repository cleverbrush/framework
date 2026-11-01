import type { Logger } from './Logger.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import {
    type RequestLoggingOptions,
    requestLoggingMiddleware
} from './middleware/requestLogging.js';

export interface UseLoggingOptions extends RequestLoggingOptions {
    /**
     * Header name to echo the correlation ID back on the response.
     * Set to `false` to suppress the response header entirely — useful
     * when an OTel `X-Trace-Id` header already serves the traceability
     * purpose and a second ID would confuse consumers.
     *
     * @default 'X-Correlation-Id'
     */
    correlationResponseHeader?: string | false;
}

/**
 * Convenience function that returns correlation ID middleware and
 * request logging middleware, ready to register with `useRequest()`.
 *
 * @param logger - the root logger instance
 * @param options - request logging configuration
 * @returns an array of middleware functions
 *
 * @example
 * ```ts
 * const server = new ServerBuilder();
 * for (const middleware of useLogging(logger, { excludePaths: ['/health'] })) {
 *     server.useRequest(middleware);
 * }
 * ```
 */
export function useLogging(
    logger: Logger,
    options?: UseLoggingOptions
): [
    ReturnType<typeof correlationIdMiddleware>,
    ReturnType<typeof requestLoggingMiddleware>
] {
    return [
        correlationIdMiddleware({
            responseHeader: options?.correlationResponseHeader
        }),
        requestLoggingMiddleware(logger, options)
    ];
}
