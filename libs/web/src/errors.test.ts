import { describe, expect, test } from 'vitest';
import { ApiError } from './errors.js';

describe('ApiError', () => {
    test('creates with status, message, body', () => {
        const err = new ApiError(404, 'Not Found', { detail: 'missing' });
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not Found');
        expect(err.body).toEqual({ detail: 'missing' });
        expect(err.name).toBe('ApiError');
    });

    test('body defaults to undefined', () => {
        const err = new ApiError(500, 'Server Error');
        expect(err.body).toBeUndefined();
    });
});
