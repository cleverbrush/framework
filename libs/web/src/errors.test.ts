import { describe, expect, test } from 'vitest';
import {
    ApiError,
    isApiError,
    isNetworkError,
    isTimeoutError,
    isWebError,
    NetworkError,
    TimeoutError,
    WebError
} from './errors.js';

describe('WebError', () => {
    test('is an Error', () => {
        const err = new WebError('oops');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(WebError);
        expect(err.name).toBe('WebError');
        expect(err.message).toBe('oops');
    });

    test('supports cause option', () => {
        const cause = new Error('root');
        const err = new WebError('wrapped', { cause });
        expect(err.cause).toBe(cause);
    });
});

describe('ApiError', () => {
    test('creates with status, message, body', () => {
        const err = new ApiError(404, 'Not Found', { detail: 'missing' });
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(WebError);
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

describe('TimeoutError', () => {
    test('creates with timeout duration', () => {
        const err = new TimeoutError(5000);
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(WebError);
        expect(err).toBeInstanceOf(TimeoutError);
        expect(err.timeout).toBe(5000);
        expect(err.message).toBe('Request timed out after 5000ms');
        expect(err.name).toBe('TimeoutError');
    });
});

describe('NetworkError', () => {
    test('creates with message', () => {
        const err = new NetworkError('DNS lookup failed');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(WebError);
        expect(err).toBeInstanceOf(NetworkError);
        expect(err.message).toBe('DNS lookup failed');
        expect(err.name).toBe('NetworkError');
    });

    test('wraps original cause', () => {
        const cause = new TypeError('fetch failed');
        const err = new NetworkError('Network request failed', { cause });
        expect(err.cause).toBe(cause);
    });
});

describe('type guards', () => {
    test('isApiError', () => {
        expect(isApiError(new ApiError(404, 'nf'))).toBe(true);
        expect(isApiError(new TimeoutError(1000))).toBe(false);
        expect(isApiError(new Error('plain'))).toBe(false);
        expect(isApiError(null)).toBe(false);
    });

    test('isTimeoutError', () => {
        expect(isTimeoutError(new TimeoutError(1000))).toBe(true);
        expect(isTimeoutError(new ApiError(408, 'timeout'))).toBe(false);
        expect(isTimeoutError('string')).toBe(false);
    });

    test('isNetworkError', () => {
        expect(isNetworkError(new NetworkError('offline'))).toBe(true);
        expect(isNetworkError(new ApiError(500, 'err'))).toBe(false);
        expect(isNetworkError(undefined)).toBe(false);
    });

    test('isWebError matches all subtypes', () => {
        expect(isWebError(new WebError('base'))).toBe(true);
        expect(isWebError(new ApiError(400, 'bad'))).toBe(true);
        expect(isWebError(new TimeoutError(100))).toBe(true);
        expect(isWebError(new NetworkError('offline'))).toBe(true);
        expect(isWebError(new Error('plain'))).toBe(false);
    });
});
