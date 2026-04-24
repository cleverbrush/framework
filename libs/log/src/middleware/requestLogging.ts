import type { Logger } from '../Logger.js';
import { LogLevel, type LogLevelName, parseLogLevel } from '../LogLevel.js';

/**
 * Request logging middleware configuration.
 */
export interface RequestLoggingOptions {
    /** Customize log level based on status code and elapsed time. */
    getLevel?: (statusCode: number, elapsedMs: number) => LogLevelName;
    /** Paths to exclude from request logging. Accepts plain strings or objects with a `path` property (e.g. endpoint builders). */
    excludePaths?: (string | { readonly path: string })[];
    /** Extract custom properties from the request context. */
    enrichRequest?: (ctx: any) => Record<string, unknown>;
    /** Whether to log request bodies. @default false */
    logRequestBody?: boolean;
    /** Whether to log response bodies. @default false */
    logResponseBody?: boolean;
    /** Whether to log when request starts (in addition to completion). @default false */
    logRequestStart?: boolean;
}

/**
 * Creates request logging middleware for `@cleverbrush/server`.
 *
 * Logs HTTP request completion with method, path, status code, and
 * elapsed time. Uses the logger from the request context or falls
 * back to the provided logger.
 *
 * @param logger - the logger to use for request logging
 * @param options - request logging configuration
 * @returns a middleware function
 *
 * @example
 * ```ts
 * server.use(requestLoggingMiddleware(logger, {
 *     excludePaths: ['/health', myEndpoint],
 *     getLevel: (status) => status >= 500 ? 'error' : 'information',
 * }));
 * ```
 */
export function requestLoggingMiddleware(
    logger: Logger,
    options?: RequestLoggingOptions
) {
    const excludePaths = new Set(
        (options?.excludePaths ?? []).map(p =>
            typeof p === 'string' ? p : p.path
        )
    );
    const getLevel = options?.getLevel;
    const enrichRequest = options?.enrichRequest;
    const logRequestStart = options?.logRequestStart ?? false;

    return async (context: any, next: () => Promise<void>) => {
        const pathname = context.url?.pathname ?? context.path ?? '';

        if (excludePaths.has(pathname)) {
            await next();
            return;
        }

        const start = Date.now();
        const method = context.method ?? 'GET';

        if (logRequestStart) {
            logger.info('HTTP {Method} {Path} started', {
                Method: method,
                Path: pathname
            });
        }

        let statusCode = 200;
        try {
            await next();
            statusCode =
                context.statusCode ?? context.response?.statusCode ?? 200;
        } catch (err) {
            statusCode =
                context.statusCode ?? context.response?.statusCode ?? 500;
            throw err;
        } finally {
            const elapsed = Date.now() - start;
            const levelName = getLevel
                ? getLevel(statusCode, elapsed)
                : statusCode >= 500
                  ? 'error'
                  : statusCode >= 400
                    ? 'warning'
                    : 'information';

            const properties: Record<string, unknown> = {
                Method: method,
                Path: pathname,
                StatusCode: statusCode,
                Elapsed: elapsed
            };

            if (context.headers?.['user-agent']) {
                properties.UserAgent = context.headers['user-agent'];
            }

            if (enrichRequest) {
                try {
                    const extra = enrichRequest(context);
                    Object.assign(properties, extra);
                } catch {
                    // ignore enrichment errors
                }
            }

            const level = parseLogLevel(levelName);
            const requestLogger = logger.forContext(
                'SourceContext',
                'RequestLogging'
            );

            if (level >= LogLevel.Error) {
                requestLogger.error(
                    'HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms',
                    properties
                );
            } else if (level >= LogLevel.Warning) {
                requestLogger.warn(
                    'HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms',
                    properties
                );
            } else {
                requestLogger.info(
                    'HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms',
                    properties
                );
            }
        }
    };
}
