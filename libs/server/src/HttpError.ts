import { createProblemDetails, type ProblemDetails } from './ProblemDetails.js';

/**
 * Base class for HTTP errors thrown from endpoint handlers.
 *
 * Instances are automatically caught by the server and serialized as
 * RFC 9457 Problem Details (`application/problem+json`) responses.
 *
 * @example
 * ```ts
 * throw new HttpError(429, 'Too Many Requests', 'Rate limit exceeded.');
 * ```
 */
export class HttpError extends Error {
    readonly status: number;
    readonly title: string;
    readonly detail?: string;
    readonly extensions?: Record<string, unknown>;

    constructor(
        status: number,
        title?: string,
        detail?: string,
        extensions?: Record<string, unknown>
    ) {
        super(detail ?? title ?? `HTTP ${status}`);
        this.name = 'HttpError';
        this.status = status;
        this.title = title ?? `HTTP ${status}`;
        this.detail = detail;
        this.extensions = extensions;
    }

    /** Converts this error into an RFC 9457 {@link ProblemDetails} object. */
    toProblemDetails(): ProblemDetails {
        return createProblemDetails(
            this.status,
            this.title,
            this.detail,
            this.extensions
        );
    }
}

/** Thrown when a requested resource cannot be found. Produces a 404 response. */
export class NotFoundError extends HttpError {
    constructor(detail?: string) {
        super(404, 'Not Found', detail);
        this.name = 'NotFoundError';
    }
}

/** Thrown when the request is malformed or fails validation. Produces a 400 response. */
export class BadRequestError extends HttpError {
    constructor(detail?: string) {
        super(400, 'Bad Request', detail);
        this.name = 'BadRequestError';
    }
}

/** Thrown when the request lacks valid authentication credentials. Produces a 401 response. */
export class UnauthorizedError extends HttpError {
    constructor(detail?: string) {
        super(401, 'Unauthorized', detail);
        this.name = 'UnauthorizedError';
    }
}

/** Thrown when the authenticated principal lacks permission. Produces a 403 response. */
export class ForbiddenError extends HttpError {
    constructor(detail?: string) {
        super(403, 'Forbidden', detail);
        this.name = 'ForbiddenError';
    }
}

/** Thrown when the request conflicts with the current state of the resource. Produces a 409 response. */
export class ConflictError extends HttpError {
    constructor(detail?: string) {
        super(409, 'Conflict', detail);
        this.name = 'ConflictError';
    }
}
