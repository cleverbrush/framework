// ---------------------------------------------------------------------------
// RFC 9457 Problem Details
// ---------------------------------------------------------------------------

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

export interface ValidationErrorItem {
    readonly pointer: string;
    readonly detail: string;
}

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

export function serializeProblemDetails(pd: ProblemDetails): string {
    return JSON.stringify(pd);
}

export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';
