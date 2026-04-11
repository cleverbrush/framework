import { createProblemDetails, type ProblemDetails } from './ProblemDetails.js';

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

    toProblemDetails(): ProblemDetails {
        return createProblemDetails(
            this.status,
            this.title,
            this.detail,
            this.extensions
        );
    }
}

export class NotFoundError extends HttpError {
    constructor(detail?: string) {
        super(404, 'Not Found', detail);
        this.name = 'NotFoundError';
    }
}

export class BadRequestError extends HttpError {
    constructor(detail?: string) {
        super(400, 'Bad Request', detail);
        this.name = 'BadRequestError';
    }
}

export class UnauthorizedError extends HttpError {
    constructor(detail?: string) {
        super(401, 'Unauthorized', detail);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends HttpError {
    constructor(detail?: string) {
        super(403, 'Forbidden', detail);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends HttpError {
    constructor(detail?: string) {
        super(409, 'Conflict', detail);
        this.name = 'ConflictError';
    }
}
