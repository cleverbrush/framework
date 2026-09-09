import { describe, expect, test } from 'vitest';
import type { CacheTagDefinition } from './CacheTag.js';
import { computeCacheKey } from './cacheKey.js';

const root = { params: {}, body: undefined, query: {}, headers: {} };
function key(values: Record<string, unknown>, name = 'records') {
    const tag: CacheTagDefinition = {
        name,
        properties: Object.fromEntries(
            Object.entries(values).map(([property, value]) => [
                property,
                { getValue: () => ({ success: true, value }) }
            ])
        )
    };
    return computeCacheKey(tag, root);
}

describe('versioned cache keys', () => {
    test('uses the same versioned envelope for simple and selected tags', () => {
        expect(key({})).toBe('ct2:["records",[]]');
        expect(key({ id: 42 })).toBe(
            'ct2:["records",[["id",["number","42"]]]]'
        );
    });
    test('sorts property and nested object keys deterministically', () => {
        expect(key({ z: { b: 2, a: 1 }, a: true })).toBe(
            key({ a: true, z: { a: 1, b: 2 } })
        );
    });
    test('separates strings containing delimiters from other properties', () => {
        expect(key({ search: 'coffee,tagIds=1' })).not.toBe(
            key({ search: 'coffee', tagIds: '1' })
        );
        expect(key({ 'x=y': 'z' })).not.toBe(key({ x: 'y=z' }));
        expect(key({}, key({ id: 1 }))).not.toBe(key({ id: 1 }));
    });
    test('distinguishes scalar types, nested undefined and dates', () => {
        const values = [
            1,
            '1',
            true,
            'true',
            null,
            'null',
            1n,
            ['a,b'],
            ['a', 'b'],
            { a: undefined },
            {},
            new Date('2026-01-01T00:00:00.001Z'),
            new Date('2026-01-01T00:00:00.002Z'),
            '2026-01-01T00:00:00.001Z',
            -0,
            0,
            NaN,
            Infinity
        ];
        expect(new Set(values.map(value => key({ value }))).size).toBe(
            values.length
        );
    });
    test('omits absent and undefined selected properties', () => {
        expect(key({ missing: undefined })).toBe(key({}));
        expect(
            computeCacheKey(
                {
                    name: 'records',
                    properties: {
                        absent: {
                            getValue: () => ({ success: false, value: 1 })
                        }
                    }
                },
                root
            )
        ).toBe(key({}));
    });
    test('allows repeated references that are not cycles', () => {
        const child = { id: 1 };
        expect(key({ value: [child, child] })).toBe(
            key({ value: [{ id: 1 }, { id: 1 }] })
        );
    });
    test.each([
        new Map(),
        new Set(),
        new Date(NaN),
        Symbol(),
        () => 1
    ])('rejects unsupported values explicitly: %s', value => {
        expect(() => key({ value })).toThrow(TypeError);
    });
    test('rejects cycles and getters', () => {
        const cyclic: any = {};
        cyclic.self = cyclic;
        expect(() => key({ cyclic })).toThrow(/cycles/);
        expect(() =>
            key({
                value: {
                    get secret() {
                        throw new Error();
                    }
                }
            })
        ).toThrow(/getters/);
    });
    test('rejects array getters without invoking them and named array properties', () => {
        let invoked = false;
        const value = Object.defineProperty([], 0, {
            get() {
                invoked = true;
                return 1;
            }
        });
        expect(() => key({ value })).toThrow(/getters/);
        expect(invoked).toBe(false);
        expect(() => key({ value: Object.assign([], { extra: 1 }) })).toThrow(
            /named properties/
        );
        expect(key({ value: new Array(2) })).toBe(
            key({ value: [undefined, undefined] })
        );
    });
});
