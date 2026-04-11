import { describe, expect, it } from 'vitest';
import {
    createProblemDetails,
    createValidationProblemDetails,
    PROBLEM_JSON_CONTENT_TYPE,
    serializeProblemDetails
} from '../src/ProblemDetails.js';

describe('ProblemDetails', () => {
    it('creates problem details with standard status title', () => {
        const pd = createProblemDetails(404);
        expect(pd).toEqual({
            type: 'https://httpstatuses.com/404',
            status: 404,
            title: 'Not Found'
        });
    });

    it('creates problem details with custom title', () => {
        const pd = createProblemDetails(400, 'Validation Failed');
        expect(pd).toEqual({
            type: 'https://httpstatuses.com/400',
            status: 400,
            title: 'Validation Failed'
        });
    });

    it('creates problem details with detail', () => {
        const pd = createProblemDetails(500, undefined, 'Something went wrong');
        expect(pd).toEqual({
            type: 'https://httpstatuses.com/500',
            status: 500,
            title: 'Internal Server Error',
            detail: 'Something went wrong'
        });
    });

    it('creates problem details with extensions', () => {
        const pd = createProblemDetails(409, undefined, undefined, {
            retryAfter: 30
        });
        expect(pd).toEqual({
            type: 'https://httpstatuses.com/409',
            status: 409,
            title: 'Conflict',
            retryAfter: 30
        });
    });

    it('maps all standard status codes', () => {
        const codes = [400, 401, 403, 404, 405, 409, 415, 422, 500, 503];
        const expectedTitles = [
            'Bad Request',
            'Unauthorized',
            'Forbidden',
            'Not Found',
            'Method Not Allowed',
            'Conflict',
            'Unsupported Media Type',
            'Unprocessable Content',
            'Internal Server Error',
            'Service Unavailable'
        ];
        codes.forEach((code, i) => {
            const pd = createProblemDetails(code);
            expect(pd.title).toBe(expectedTitles[i]);
        });
    });

    it('uses generic title for unknown status codes', () => {
        const pd = createProblemDetails(418);
        expect(pd.title).toBe('Error');
    });

    it('creates validation problem details', () => {
        const errors = [
            { pointer: '/name', detail: 'is required' },
            { pointer: '/email', detail: 'must be a valid email' }
        ];
        const pd = createValidationProblemDetails(errors);
        expect(pd.status).toBe(400);
        expect(pd.title).toBe('Bad Request');
        expect(pd.detail).toBe('One or more validation errors occurred.');
        expect((pd as any).errors).toEqual(errors);
    });

    it('serializes to JSON', () => {
        const pd = createProblemDetails(404, undefined, 'Not here');
        const json = serializeProblemDetails(pd);
        const parsed = JSON.parse(json);
        expect(parsed.status).toBe(404);
        expect(parsed.detail).toBe('Not here');
    });

    it('exports correct content type', () => {
        expect(PROBLEM_JSON_CONTENT_TYPE).toBe('application/problem+json');
    });
});
