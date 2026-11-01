import { type Span, SpanStatusCode } from '@opentelemetry/api';

/** The only exception fields Framework automatically exports. */
export interface SanitizedException {
    name?: string;
    message?: string;
    stack?: string;
}

/**
 * Automatic exception capture defaults to omission. A callback can allowlist
 * safe fields; `raw` deliberately opts into original exception details.
 */
export type ExceptionPolicy =
    | 'omit'
    | 'raw'
    | ((error: unknown) => SanitizedException | undefined);

/** @internal Never let exception inspection replace an application failure. */
export function sanitizeException(
    error: unknown,
    policy: ExceptionPolicy = 'omit'
): SanitizedException | undefined {
    if (policy === 'omit') return undefined;
    try {
        const value =
            policy === 'raw'
                ? error instanceof Error
                    ? error
                    : { message: String(error) }
                : policy(error);
        if (!value) return undefined;
        const result: SanitizedException = {};
        for (const key of ['name', 'message', 'stack'] as const) {
            const field = value[key];
            if (typeof field === 'string') result[key] = field;
        }
        return Object.keys(result).length ? result : undefined;
    } catch {
        return undefined;
    }
}

/** @internal Span status never copies an arbitrary exception message. */
export function recordSpanException(
    span: Span,
    error: unknown,
    policy?: ExceptionPolicy
): void {
    span.setStatus({ code: SpanStatusCode.ERROR });
    const exception = sanitizeException(error, policy);
    if (exception)
        span.recordException({ ...exception, name: exception.name ?? 'Error' });
}
