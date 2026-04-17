import { describe, expect, test } from 'vitest';
import {
    buildGroupQueryKey,
    buildQueryKey,
    QUERY_KEY_PREFIX
} from './queryKeys.js';

describe('QUERY_KEY_PREFIX', () => {
    test('is @cleverbrush', () => {
        expect(QUERY_KEY_PREFIX).toBe('@cleverbrush');
    });
});

describe('buildQueryKey', () => {
    test('returns [prefix, group, endpoint] without args', () => {
        expect(buildQueryKey('todos', 'list')).toEqual([
            '@cleverbrush',
            'todos',
            'list'
        ]);
    });

    test('returns [prefix, group, endpoint, args] with args', () => {
        const args = { query: { page: 2 } };
        expect(buildQueryKey('todos', 'list', args)).toEqual([
            '@cleverbrush',
            'todos',
            'list',
            { query: { page: 2 } }
        ]);
    });

    test('includes args when they are an empty object', () => {
        expect(buildQueryKey('todos', 'list', {})).toEqual([
            '@cleverbrush',
            'todos',
            'list',
            {}
        ]);
    });

    test('excludes args when explicitly undefined', () => {
        expect(buildQueryKey('todos', 'list', undefined)).toEqual([
            '@cleverbrush',
            'todos',
            'list'
        ]);
    });

    test('handles nested args objects', () => {
        const args = { params: { id: 42 }, query: { include: ['author'] } };
        const key = buildQueryKey('todos', 'get', args);
        expect(key).toEqual([
            '@cleverbrush',
            'todos',
            'get',
            { params: { id: 42 }, query: { include: ['author'] } }
        ]);
    });

    test('same args produce equal keys (stable serialization)', () => {
        const args1 = { query: { page: 1, limit: 10 } };
        const args2 = { query: { page: 1, limit: 10 } };
        expect(buildQueryKey('todos', 'list', args1)).toEqual(
            buildQueryKey('todos', 'list', args2)
        );
    });

    test('different args produce different keys', () => {
        const key1 = buildQueryKey('todos', 'list', { query: { page: 1 } });
        const key2 = buildQueryKey('todos', 'list', { query: { page: 2 } });
        expect(key1).not.toEqual(key2);
    });

    test('different endpoints produce different keys', () => {
        const key1 = buildQueryKey('todos', 'list');
        const key2 = buildQueryKey('todos', 'get');
        expect(key1).not.toEqual(key2);
    });

    test('different groups produce different keys', () => {
        const key1 = buildQueryKey('todos', 'list');
        const key2 = buildQueryKey('users', 'list');
        expect(key1).not.toEqual(key2);
    });
});

describe('buildGroupQueryKey', () => {
    test('returns [prefix, group]', () => {
        expect(buildGroupQueryKey('todos')).toEqual(['@cleverbrush', 'todos']);
    });

    test('different groups produce different keys', () => {
        expect(buildGroupQueryKey('todos')).not.toEqual(
            buildGroupQueryKey('users')
        );
    });

    test('group key is a prefix of endpoint key', () => {
        const groupKey = buildGroupQueryKey('todos');
        const endpointKey = buildQueryKey('todos', 'list', {
            query: { page: 1 }
        });
        // Every element in groupKey should match the corresponding element in endpointKey
        groupKey.forEach((segment, i) => {
            expect(endpointKey[i]).toEqual(segment);
        });
    });
});
