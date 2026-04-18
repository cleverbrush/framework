import { describe, expect, test } from 'vitest';
import { serializeQuery } from './query.js';

describe('serializeQuery', () => {
    test('undefined input — returns empty string', () => {
        expect(serializeQuery(undefined)).toBe('');
    });

    test('empty object — returns empty string', () => {
        expect(serializeQuery({})).toBe('');
    });

    test('simple key-value pairs', () => {
        expect(serializeQuery({ page: 1, limit: 10 })).toBe('page=1&limit=10');
    });

    test('skips null and undefined values', () => {
        expect(serializeQuery({ a: 1, b: null, c: undefined, d: 2 })).toBe(
            'a=1&d=2'
        );
    });

    test('encodes special characters', () => {
        expect(serializeQuery({ q: 'hello world' })).toBe('q=hello%20world');
    });

    test('serializes Date as ISO string', () => {
        const d = new Date('2024-01-15T10:30:00.000Z');
        expect(serializeQuery({ since: d })).toBe(
            'since=2024-01-15T10%3A30%3A00.000Z'
        );
    });

    test('serializes arrays as repeated keys', () => {
        expect(serializeQuery({ tags: ['a', 'b', 'c'] })).toBe(
            'tags=a&tags=b&tags=c'
        );
    });

    test('skips null items in arrays', () => {
        expect(serializeQuery({ tags: ['a', null, 'c'] })).toBe(
            'tags=a&tags=c'
        );
    });

    test('boolean values', () => {
        expect(serializeQuery({ active: true, deleted: false })).toBe(
            'active=true&deleted=false'
        );
    });
});
