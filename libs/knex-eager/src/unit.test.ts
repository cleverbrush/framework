import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { clearRow, mapObject, mapValue } from './mappers.js';
import {
    resolveColumnRef,
    validateJoinMany,
    validateJoinOne,
    validateUniqueFieldNames
} from './validate.js';

// ---------------------------------------------------------------------------
// validate.ts tests
// ---------------------------------------------------------------------------
describe('validateJoinOne', () => {
    const baseForeignQuery = {} as any; // mock
    const mockSchema = {} as any; // mock local schema

    it('validates a valid spec', () => {
        const result = validateJoinOne(
            {
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any
            },
            mockSchema
        );
        expect(result.localColumn).toBe('department_id');
        expect(result.foreignColumn).toBe('id');
        expect(result.as).toBe('department');
        expect(result.required).toBe(true); // default
    });

    it('defaults required to true', () => {
        const result = validateJoinOne(
            {
                localColumn: 'x',
                foreignColumn: 'y',
                as: 'z',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any
            },
            mockSchema
        );
        expect(result.required).toBe(true);
    });

    it('respects required: false', () => {
        const result = validateJoinOne(
            {
                localColumn: 'x',
                foreignColumn: 'y',
                as: 'z',
                required: false,
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any
            },
            mockSchema
        );
        expect(result.required).toBe(false);
    });

    it('throws on empty localColumn', () => {
        expect(() =>
            validateJoinOne(
                {
                    localColumn: '' as any,
                    foreignColumn: 'id',
                    as: 'x',
                    foreignQuery: baseForeignQuery,
                    foreignSchema: {} as any
                },
                mockSchema
            )
        ).toThrow('localColumn');
    });

    it('throws on empty foreignColumn', () => {
        expect(() =>
            validateJoinOne(
                {
                    localColumn: 'id',
                    foreignColumn: '' as any,
                    as: 'x',
                    foreignQuery: baseForeignQuery,
                    foreignSchema: {} as any
                },
                mockSchema
            )
        ).toThrow('foreignColumn');
    });

    it('throws on empty as', () => {
        expect(() =>
            validateJoinOne(
                {
                    localColumn: 'id',
                    foreignColumn: 'id',
                    as: '' as any,
                    foreignQuery: baseForeignQuery,
                    foreignSchema: {} as any
                },
                mockSchema
            )
        ).toThrow('as');
    });

    it('throws on missing foreignQuery', () => {
        expect(() =>
            validateJoinOne(
                {
                    localColumn: 'id',
                    foreignColumn: 'id',
                    as: 'x',
                    foreignQuery: null as any,
                    foreignSchema: {} as any
                },
                mockSchema
            )
        ).toThrow('foreignQuery');
    });

    it('throws on invalid mapper', () => {
        expect(() =>
            validateJoinOne(
                {
                    localColumn: 'id',
                    foreignColumn: 'id',
                    as: 'x',
                    foreignQuery: baseForeignQuery,
                    foreignSchema: {} as any,
                    mappers: { name: 'not a function' as any }
                },
                mockSchema
            )
        ).toThrow('mapper for "name" must be a function');
    });
});

describe('validateJoinMany', () => {
    const baseForeignQuery = {} as any;
    const mockSchema = {} as any;

    it('validates a valid spec', () => {
        const result = validateJoinMany(
            {
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any
            },
            mockSchema
        );
        expect(result.localColumn).toBe('id');
        expect(result.limit).toBeNull();
        expect(result.offset).toBeNull();
        expect(result.orderBy).toBeNull();
    });

    it('parses limit/offset', () => {
        const result = validateJoinMany(
            {
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any,
                limit: 10,
                offset: 5
            },
            mockSchema
        );
        expect(result.limit).toBe(10);
        expect(result.offset).toBe(5);
    });

    it('ignores non-positive limit/offset', () => {
        const result = validateJoinMany(
            {
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any,
                limit: 0,
                offset: -1
            },
            mockSchema
        );
        expect(result.limit).toBeNull();
        expect(result.offset).toBeNull();
    });

    it('parses orderBy', () => {
        const result = validateJoinMany(
            {
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any,
                orderBy: { column: 'created_at', direction: 'desc' }
            },
            mockSchema
        );
        expect(result.orderBy).toEqual({
            column: 'created_at',
            direction: 'desc'
        });
    });

    it('defaults orderBy direction to asc', () => {
        const result = validateJoinMany(
            {
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: baseForeignQuery,
                foreignSchema: {} as any,
                orderBy: { column: 'created_at' }
            },
            mockSchema
        );
        expect(result.orderBy).toEqual({
            column: 'created_at',
            direction: 'asc'
        });
    });
});

describe('validateUniqueFieldNames', () => {
    it('passes for unique names', () => {
        expect(() =>
            validateUniqueFieldNames([{ as: 'a' }, { as: 'b' }, { as: 'c' }])
        ).not.toThrow();
    });

    it('throws on duplicate names', () => {
        expect(() =>
            validateUniqueFieldNames([{ as: 'posts' }, { as: 'posts' }])
        ).toThrow('duplicate field name: posts');
    });
});

// ---------------------------------------------------------------------------
// resolveColumnRef tests
// ---------------------------------------------------------------------------
describe('resolveColumnRef', () => {
    const testSchema = object({
        id: number(),
        name: string(),
        department_id: number()
    });

    it('passes through a string column name', () => {
        expect(resolveColumnRef('id', testSchema, 'col')).toBe('id');
    });

    it('throws on an empty string', () => {
        expect(() => resolveColumnRef('', testSchema, 'col')).toThrow('col');
    });

    it('resolves a property descriptor accessor', () => {
        expect(resolveColumnRef(t => t.department_id, testSchema, 'col')).toBe(
            'department_id'
        );
    });

    it('resolves different properties via accessor', () => {
        expect(resolveColumnRef(t => t.name, testSchema, 'col')).toBe('name');
        expect(resolveColumnRef(t => t.id, testSchema, 'col')).toBe('id');
    });

    it('throws on non-string non-function ref', () => {
        expect(() => resolveColumnRef(42 as any, testSchema, 'col')).toThrow(
            'col'
        );
    });
});

// ---------------------------------------------------------------------------
// mappers.ts tests
// ---------------------------------------------------------------------------
describe('mapValue', () => {
    it('applies a function mapper', () => {
        expect(mapValue((v: number) => v * 2, 5)).toBe(10);
    });

    it('applies a built-in string mapper', () => {
        const result = mapValue('date_from_json', '2024-01-15T00:00:00Z');
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2024);
    });

    it('returns null/undefined for date_from_json with falsy input', () => {
        expect(mapValue('date_from_json', null)).toBeNull();
        expect(mapValue('date_from_json', undefined)).toBeUndefined();
    });

    it('throws on unknown string mapper', () => {
        expect(() => mapValue('nonexistent', 'x')).toThrow('unknown mapper');
    });

    it('throws on non-function non-string mapper', () => {
        expect(() => mapValue(42 as any, 'x')).toThrow("couldn't map value");
    });
});

describe('mapObject', () => {
    it('applies mappers to matching keys', () => {
        const result = mapObject(
            { a: 1, b: 2, c: 3 },
            { a: (v: number) => v * 10, c: (v: number) => v + 100 }
        );
        expect(result).toEqual({ a: 10, b: 2, c: 103 });
    });

    it('returns non-object input as-is', () => {
        expect(mapObject(null as any, {})).toBeNull();
        expect(mapObject(undefined as any, {})).toBeUndefined();
    });

    it('throws when mappers is falsy', () => {
        expect(() => mapObject({ a: 1 }, null as any)).toThrow(
            'mappers should be an object'
        );
    });
});

describe('clearRow', () => {
    it('removes row_number from the row', () => {
        const row = { id: 1, name: 'test', row_number: 5 };
        const result = clearRow(row, [], []);
        expect(result).not.toHaveProperty('row_number');
        expect(result).toHaveProperty('id', 1);
    });

    it('applies mappers to single joined objects', () => {
        const row = {
            id: 1,
            department: { id: 10, created: '2024-01-01' }
        };
        const result = clearRow(
            row,
            [
                {
                    type: 'one' as const,
                    as: 'department',
                    localColumn: 'department_id',
                    foreignColumn: 'id',
                    required: true,
                    foreignQuery: {} as any,
                    mappers: { created: (v: string) => new Date(v) }
                }
            ],
            []
        );
        expect(result.department.created).toBeInstanceOf(Date);
    });

    it('applies mappers to collection items and removes row_number', () => {
        const row = {
            id: 1,
            posts: [
                { id: 1, title: 'Hello', row_number: 1, score: '5' },
                { id: 2, title: 'World', row_number: 2, score: '10' }
            ]
        };
        const result = clearRow(
            row,
            [],
            [
                {
                    type: 'many' as const,
                    as: 'posts',
                    localColumn: 'id',
                    foreignColumn: 'author_id',
                    foreignQuery: {} as any,
                    limit: null,
                    offset: null,
                    orderBy: null,
                    mappers: { score: (v: string) => parseInt(v, 10) }
                }
            ]
        );
        expect(result.posts[0]).not.toHaveProperty('row_number');
        expect(result.posts[0].score).toBe(5);
        expect(result.posts[1].score).toBe(10);
    });
});
