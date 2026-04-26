// @cleverbrush/knex-schema — mappers.ts unit tests

import { describe, expect, it } from 'vitest';
import { clearRow, MAPPERS, mapObject, mapValue } from './mappers.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAPPERS built-ins
// ═══════════════════════════════════════════════════════════════════════════

describe('MAPPERS.date_from_json', () => {
    const fn = MAPPERS.date_from_json;

    it('converts a date string to a Date', () => {
        const result = fn('2024-01-15T10:30:00.000Z');
        expect(result).toBeInstanceOf(Date);
        expect((result as Date).getFullYear()).toBe(2024);
    });

    it('passes through null unchanged', () => {
        expect(fn(null)).toBeNull();
    });

    it('passes through undefined unchanged', () => {
        expect(fn(undefined)).toBeUndefined();
    });

    it('passes through empty string unchanged', () => {
        expect(fn('')).toBe('');
    });

    it('passes through 0 unchanged', () => {
        expect(fn(0)).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// mapValue
// ═══════════════════════════════════════════════════════════════════════════

describe('mapValue', () => {
    it('applies a function mapper', () => {
        expect(mapValue((v: number) => v * 2, 5)).toBe(10);
    });

    it('looks up a string key in MAPPERS', () => {
        const result = mapValue('date_from_json', '2024-06-01');
        expect(result).toBeInstanceOf(Date);
    });

    it('throws when string key is unknown', () => {
        expect(() => mapValue('nonexistent_mapper', 'x')).toThrow(
            /unknown mapper "nonexistent_mapper"/
        );
    });

    it('throws when mapper is neither string nor function', () => {
        expect(() => mapValue(42 as any, 'x')).toThrow(/couldn't map value/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// mapObject
// ═══════════════════════════════════════════════════════════════════════════

describe('mapObject', () => {
    it('applies mappers to matching keys', () => {
        const obj = { a: '2024-01-01', b: 42 };
        const result = mapObject(obj, { a: 'date_from_json' });
        expect(result.a).toBeInstanceOf(Date);
        expect(result.b).toBe(42);
    });

    it('passes through keys not in mappers unchanged', () => {
        const obj = { x: 'hello', y: 99 };
        const result = mapObject(obj, { y: (v: number) => v + 1 });
        expect(result.x).toBe('hello');
        expect(result.y).toBe(100);
    });

    it('returns non-object input as-is (null)', () => {
        expect(mapObject(null as any, {})).toBeNull();
    });

    it('returns non-object input as-is (primitive string)', () => {
        expect(mapObject('text' as any, {})).toBe('text');
    });

    it('throws when mappers argument is missing', () => {
        expect(() => mapObject({} as any, undefined as any)).toThrow(
            /mappers should be an object/
        );
    });

    it('applies a function mapper via mapObject', () => {
        const obj = { value: 10 };
        const result = mapObject(obj, { value: (v: number) => v * 3 });
        expect(result.value).toBe(30);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// clearRow
// ═══════════════════════════════════════════════════════════════════════════

describe('clearRow', () => {
    it('applies mappers to one-to-one nested objects', () => {
        const row: any = {
            author: { createdAt: '2024-01-01', name: 'Alice' }
        };
        const oneSpecs: any[] = [
            {
                as: 'author',
                type: 'one',
                mappers: { createdAt: 'date_from_json' }
            }
        ];
        clearRow(row, oneSpecs, []);
        expect(row.author.createdAt).toBeInstanceOf(Date);
        expect(row.author.name).toBe('Alice');
    });

    it('skips one-to-one when field is null', () => {
        const row: any = { author: null };
        const oneSpecs: any[] = [
            {
                as: 'author',
                type: 'one',
                mappers: { createdAt: 'date_from_json' }
            }
        ];
        clearRow(row, oneSpecs, []);
        expect(row.author).toBeNull();
    });

    it('skips one-to-one when field is undefined', () => {
        const row: any = {};
        const oneSpecs: any[] = [
            {
                as: 'author',
                type: 'one',
                mappers: { createdAt: 'date_from_json' }
            }
        ];
        clearRow(row, oneSpecs, []);
        expect(row.author).toBeUndefined();
    });

    it('skips one-to-one when no mappers defined', () => {
        const row: any = { author: { createdAt: '2024-01-01' } };
        const oneSpecs: any[] = [
            { as: 'author', type: 'one' } // no mappers
        ];
        clearRow(row, oneSpecs, []);
        // unchanged
        expect(row.author.createdAt).toBe('2024-01-01');
    });

    it('applies mappers to one-to-many array items', () => {
        const row: any = {
            comments: [
                { createdAt: '2024-02-01', text: 'hi' },
                { createdAt: '2024-03-01', text: 'bye' }
            ]
        };
        const manySpecs: any[] = [
            {
                as: 'comments',
                type: 'many',
                mappers: { createdAt: 'date_from_json' }
            }
        ];
        clearRow(row, [], manySpecs);
        expect(row.comments[0].createdAt).toBeInstanceOf(Date);
        expect(row.comments[1].createdAt).toBeInstanceOf(Date);
        expect(row.comments[0].text).toBe('hi');
    });

    it('skips falsy items in many array', () => {
        const row: any = { comments: [null, undefined, { text: 'ok' }] };
        const manySpecs: any[] = [
            {
                as: 'comments',
                type: 'many',
                mappers: { text: (v: string) => v.toUpperCase() }
            }
        ];
        clearRow(row, [], manySpecs);
        // Only the non-falsy item is transformed
        expect(row.comments[2].text).toBe('OK');
    });

    it('skips many field when it is not an array', () => {
        const row: any = { comments: null };
        const manySpecs: any[] = [
            { as: 'comments', type: 'many', mappers: { text: (v: any) => v } }
        ];
        clearRow(row, [], manySpecs);
        expect(row.comments).toBeNull();
    });

    it('skips many items when no mappers defined', () => {
        const row: any = { tags: [{ name: 'js' }] };
        const manySpecs: any[] = [
            { as: 'tags', type: 'many' } // no mappers
        ];
        clearRow(row, [], manySpecs);
        expect(row.tags[0].name).toBe('js');
    });

    it('returns the mutated row', () => {
        const row: any = { val: 1 };
        const result = clearRow(row, [], []);
        expect(result).toBe(row);
    });
});
