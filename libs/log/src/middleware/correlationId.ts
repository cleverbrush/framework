import { extractCorrelationId, generateCorrelationId } from '../correlation.js';
import { LogContext } from '../LogContext.js';

/**
 * Correlation ID middleware configuration.
 */
export interface CorrelationIdMiddlewareOptions {
    /** Headers to read from incoming request (checked in order). @default ['X-Correlation-Id', 'X-Request-Id'] */
    requestHeaders?: string[];
    /** Header to set on the response. Set to `false` to skip setting a response header entirely. @default 'X-Correlation-Id' */
    responseHeader?: string | false;
    /** Custom ID generator. @default generateCorrelationId */
    generate?: () => string;
}

/**
 * Creates correlation ID middleware for `@cleverbrush/server`.
 *
 * Extracts a correlation ID from incoming request headers (or generates one),
 * sets it on the response, and stores it in the `LogContext` for enrichers.
 *
 * @param options - correlation ID configuration
 * @returns a middleware function
 *
 * @example
 * ```ts
 * server.use(correlationIdMiddleware({
 *     requestHeaders: ['X-Correlation-Id', 'X-Request-Id'],
 * }));
 * ```
 */
export function correlationIdMiddleware(
    options?: CorrelationIdMiddlewareOptions
) {
    const responseHeader =
        options?.responseHeader === false
            ? false
            : (options?.responseHeader ?? 'X-Correlation-Id');
    const generate = options?.generate ?? generateCorrelationId;

    return async (context: any, next: () => Promise<void>) => {
        const headers = context.headers ?? {};
        const correlationId = extractCorrelationId(headers) || generate();

        // Set on response if possible (skip if responseHeader is false)
        if (responseHeader !== false) {
            if (context.setHeader) {
                context.setHeader(responseHeader, correlationId);
            } else if (context.response?.setHeader) {
                context.response.setHeader(responseHeader, correlationId);
            }
        }

        // Store in context items for other middleware
        if (context.items instanceof Map) {
            context.items.set('correlationId', correlationId);
        }

        // Run the rest of the pipeline with the correlation ID in AsyncLocalStorage
        const store = LogContext.getStore();
        if (store) {
            await LogContext.runWithCorrelationId(correlationId, () => next());
        } else {
            await next();
        }
    };
}
