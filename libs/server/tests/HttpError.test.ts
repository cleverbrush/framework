import { describe, expect, it } from 'vitest';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    HttpError,
    NotFoundError,
    UnauthorizedError
} from '../src/HttpError.js';

describe('HttpError', () => {
    it('creates error with status and title', () => {
        const err = new HttpError(500, 'Server Error');
        expect(err.status).toBe(500);
        expect(err.title).toBe('Server Error');
        expect(err.message).toBe('Server Error');
        expect(err).toBeInstanceOf(Error);
    });

    it('creates error with detail', () => {
        const err = new HttpError(400, 'Bad Request', 'Invalid input');
        expect(err.detail).toBe('Invalid input');
        expect(err.message).toBe('Invalid input');
    });

    it('creates error with extensions', () => {
        const err = new HttpError(429, 'Too Many Requests', undefined, {
            retryAfter: 60
        });
        expect(err.extensions).toEqual({ retryAfter: 60 });
    });

    it('converts to ProblemDetails', () => {
        const err = new HttpError(404, 'Not Found', 'User not found');
        const pd = err.toProblemDetails();
        expect(pd.status).toBe(404);
        expect(pd.title).toBe('Not Found');
        expect(pd.detail).toBe('User not found');
        expect(pd.type).toBe('https://httpstatuses.com/404');
    });

    it('defaults title to HTTP status string', () => {
        const err = new HttpError(500);
        expect(err.title).toBe('HTTP 500');
    });
});

describe('Error subclasses', () => {
    it('NotFoundError', () => {
        const err = new NotFoundError('User not found');
        expect(err.status).toBe(404);
        expect(err.title).toBe('Not Found');
        expect(err.detail).toBe('User not found');
        expect(err.name).toBe('NotFoundError');
        expect(err).toBeInstanceOf(HttpError);
        expect(err).toBeInstanceOf(Error);
    });

    it('BadRequestError', () => {
        const err = new BadRequestError('Invalid input');
        expect(err.status).toBe(400);
        expect(err.name).toBe('BadRequestError');
    });

    it('UnauthorizedError', () => {
        const err = new UnauthorizedError();
        expect(err.status).toBe(401);
        expect(err.name).toBe('UnauthorizedError');
    });

    it('ForbiddenError', () => {
        const err = new ForbiddenError();
        expect(err.status).toBe(403);
        expect(err.name).toBe('ForbiddenError');
    });

    it('ConflictError', () => {
        const err = new ConflictError('Already exists');
        expect(err.status).toBe(409);
        expect(err.detail).toBe('Already exists');
        expect(err.name).toBe('ConflictError');
    });
});
