// ---------------------------------------------------------------------------
// RFC 9457 Problem Details
// ---------------------------------------------------------------------------

/**
 * An RFC 9457 (formerly RFC 7807) Problem Details object.
 *
 * Provides machine-readable error information in HTTP API responses.
 * Serialized as `application/problem+json`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9457 RFC 9457}
 */
export interface ProblemDetails {
    readonly type: string;
    readonly status: number;
    readonly title: string;
    readonly detail?: string;
    readonly instance?: string;
    readonly [extension: string]: unknown;
}

const STATUS_TITLES: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Content',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
};

/**
 * Create a {@link ProblemDetails} object for the given HTTP status code.
 *
 * @param status - HTTP status code (e.g. 400, 404, 500).
 * @param title - Short, human-readable summary. Defaults to a standard phrase
 *   for common status codes.
 * @param detail - Longer explanation specific to this occurrence.
 * @param extensions - Extra fields merged into the object (RFC 9457 §3.1).
 */
export function createProblemDetails(
    status: number,
    title?: string,
    detail?: string,
    extensions?: Record<string, unknown>
): ProblemDetails {
    return {
        type: `https://httpstatuses.com/${status}`,
        status,
        title: title ?? STATUS_TITLES[status] ?? 'Error',
        ...(detail !== undefined ? { detail } : {}),
        ...extensions
    };
}

/**
 * A single field-level validation error, used in validation Problem Details
 * responses. `pointer` follows JSON Pointer syntax (RFC 6901).
 *
 * @example `{ pointer: '/body/email', detail: 'Must be a valid email address' }`
 */
export interface ValidationErrorItem {
    readonly pointer: string;
    readonly detail: string;
}

/**
 * Create a 400 Bad Request Problem Details object listing all validation
 * field errors.
 *
 * @param errors - Array of per-field errors with JSON Pointer paths.
 */
export function createValidationProblemDetails(
    errors: readonly ValidationErrorItem[]
): ProblemDetails {
    return createProblemDetails(
        400,
        'Bad Request',
        'One or more validation errors occurred.',
        { errors }
    );
}

/**
 * Serialize a {@link ProblemDetails} object to a JSON string.
 */
export function serializeProblemDetails(pd: ProblemDetails): string {
    return JSON.stringify(pd);
}

/** The MIME type for Problem Details JSON responses (`application/problem+json`). */
export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';
