import type { Logger } from './Logger.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import {
    type RequestLoggingOptions,
    requestLoggingMiddleware
} from './middleware/requestLogging.js';

/**
 * Convenience function that returns correlation ID middleware and
 * request logging middleware, ready to spread into `ServerBuilder.use()`.
 *
 * @param logger - the root logger instance
 * @param options - request logging configuration
 * @returns an array of middleware functions
 *
 * @example
 * ```ts
 * const server = new ServerBuilder()
 *     .use(...useLogging(logger, {
 *         excludePaths: ['/health'],
 *     }))
 *     .build();
 * ```
 */
export function useLogging(
    logger: Logger,
    options?: RequestLoggingOptions
): [
    ReturnType<typeof correlationIdMiddleware>,
    ReturnType<typeof requestLoggingMiddleware>
] {
    return [
        correlationIdMiddleware(),
        requestLoggingMiddleware(logger, options)
    ];
}
