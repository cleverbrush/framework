import { expect, expectTypeOf, test } from 'vitest';
import { deepClone } from './index.js';

test('deepClone - isolates nested data and preserves the input type', () => {
    const source = { profile: { name: 'Ada' }, tags: ['a'], date: new Date(1) };
    const result = deepClone(source);
    expectTypeOf(result).toEqualTypeOf(source);
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    expect(result.profile).not.toBe(source.profile);
    expect(result.tags).not.toBe(source.tags);
    expect(result.date).not.toBe(source.date);
    result.profile.name = 'Grace';
    result.tags.push('b');
    result.date.setTime(2);
    expect(source).toEqual({
        profile: { name: 'Ada' },
        tags: ['a'],
        date: new Date(1)
    });
});

test('deepClone - primitives and opaque objects retain their identity', () => {
    class RecordValue {
        value = 1;
    }
    for (const value of [
        null,
        undefined,
        Number.NaN,
        -0,
        1n,
        true,
        'text',
        Symbol('key'),
        () => 1,
        new Map(),
        new Set(),
        new RecordValue(),
        new File(['text'], 'file.txt'),
        /pattern/,
        new Uint8Array([1])
    ]) {
        expect(deepClone(value)).toBe(value);
        expect(deepClone({ value }).value).toBe(value);
    }
});

test('deepClone - preserves cycles and repeated objects, arrays and Dates', () => {
    const child = { value: 1 };
    const date = new Date(Number.NaN);
    const source: any = {
        child,
        again: child,
        date,
        againDate: date,
        array: []
    };
    source.self = source;
    source.array.push(source, source.array);
    source.againArray = source.array;
    date['owner'] = source;
    const result = deepClone(source);
    expect(result.self).toBe(result);
    expect(result.child).toBe(result.again);
    expect(result.child).not.toBe(child);
    expect(result.date).toBe(result.againDate);
    expect(result.date).not.toBe(date);
    expect(result.date.getTime()).toBeNaN();
    expect(result.date.owner).toBe(result);
    expect(result.array[0]).toBe(result);
    expect(result.array[1]).toBe(result.array);
    expect(result.againArray).toBe(result.array);
});

test('deepClone - preserves sparse array lengths and enumerable extra keys', () => {
    const symbol = Symbol('metadata');
    const source = Object.assign(new Array(4), { label: { text: 'a' } });
    source[1] = { value: 1 };
    source[symbol] = { value: 2 };
    const result = deepClone(source);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(Object.keys(result)).toEqual(['1', 'label']);
    expect(0 in result).toBe(false);
    expect(3 in result).toBe(false);
    expect(result[1]).toEqual({ value: 1 });
    expect(result[1]).not.toBe(source[1]);
    expect(result.label).not.toBe(source.label);
    expect(result[symbol]).toEqual({ value: 2 });
    expect(result[symbol]).not.toBe(source[symbol]);
});

test('deepClone - preserves null prototypes and safely copies special keys', () => {
    for (const prototype of [null, Object.prototype]) {
        const source = Object.assign(Object.create(prototype), {
            child: Object.assign(Object.create(null), { value: 1 })
        });
        for (const key of ['__proto__', 'constructor', 'prototype']) {
            Object.defineProperty(source, key, {
                enumerable: true,
                value: { cloned: true }
            });
        }
        const result = deepClone(source);
        expect(Object.getPrototypeOf(result)).toBe(prototype);
        expect(Object.getPrototypeOf(result.child)).toBeNull();
        expect(result.child).not.toBe(source.child);
        for (const key of ['__proto__', 'constructor', 'prototype']) {
            expect(Object.hasOwn(result, key)).toBe(true);
            expect(result[key]).toEqual({ cloned: true });
            expect(result[key]).not.toBe(source[key]);
        }
        expect(Object.hasOwn(Object.prototype, 'cloned')).toBe(false);
    }
});

test('deepClone - reads enumerable getters as data and omits non-enumerables', () => {
    const child = { value: 1 };
    const symbol = Symbol('key');
    const source = {
        get child() {
            return child;
        },
        [symbol]: child
    };
    Object.defineProperty(source, 'hidden', { value: 1 });
    const result = deepClone(source);
    expect(result.child).not.toBe(child);
    expect(result[symbol]).toBe(result.child);
    expect(Object.hasOwn(result, 'hidden')).toBe(false);
    expect(Object.getOwnPropertyDescriptor(result, 'child')).toEqual({
        value: result.child,
        enumerable: true,
        configurable: true,
        writable: true
    });
});
