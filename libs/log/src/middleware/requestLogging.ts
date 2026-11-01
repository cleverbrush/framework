import type { ResponseCompletion } from '@cleverbrush/server';
import type { Logger } from '../Logger.js';
import { LogLevel, type LogLevelName, parseLogLevel } from '../LogLevel.js';

/**
 * Request logging middleware configuration.
 */
export interface RequestLoggingOptions {
    /** Customize level; status is 0 if no response headers were sent. */
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
 * Logs one final HTTP outcome, status and full elapsed time, including streams
 * and error serialization. Register with useRequest() to include auth/CORS
 * rejections. Contexts without completion hooks use middleware-scoped timing.
 *
 * @param logger - the logger to use for request logging
 * @param options - request logging configuration
 * @returns a middleware function
 *
 * @example
 * ```ts
 * server.useRequest(requestLoggingMiddleware(logger, {
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

        const start = performance.now();
        const method = context.method ?? 'GET';

        if (logRequestStart) {
            logger.info('HTTP {Method} {Path} started', {
                Method: method,
                Path: pathname
            });
        }

        const logCompletion = (completion: ResponseCompletion) => {
            const statusCode = completion.statusCode;
            const elapsed = completion.elapsedMs;
            const levelName = getLevel
                ? getLevel(statusCode ?? 0, elapsed)
                : completion.outcome === 'failure' ||
                    completion.outcome === 'timeout' ||
                    completion.outcome === 'interrupted'
                  ? 'error'
                  : completion.outcome === 'rejected'
                    ? 'warning'
                    : 'information';

            const properties: Record<string, unknown> = {
                Method: method,
                Path: pathname,
                ...(statusCode === undefined ? {} : { StatusCode: statusCode }),
                Outcome: completion.outcome,
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
        };
        if (typeof context.onResponseCompleted === 'function') {
            context.onResponseCompleted(logCompletion);
            await next();
            return;
        }

        let failed = false;
        try {
            await next();
        } catch (error) {
            failed = true;
            throw error;
        } finally {
            const statusCode =
                context.statusCode ??
                context.response?.statusCode ??
                (failed ? 500 : 200);
            logCompletion({
                statusCode,
                elapsedMs: performance.now() - start,
                outcome:
                    failed || statusCode >= 500
                        ? 'failure'
                        : statusCode >= 400
                          ? 'rejected'
                          : 'success'
            });
        }
    };
}
