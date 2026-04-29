import { expect, test } from 'vitest';

import { deepEqual } from './deepEqual.js';

test('deepEqual - 1', () => {
    expect(deepEqual('a', 'a')).toEqual(true);
});

test('deepEqual - 2', () => {
    expect(deepEqual('a', 'b')).toEqual(false);
});

test('deepEqual - 3', () => {
    expect(deepEqual({}, 'a')).toEqual(false);
});

test('deepEqual - 4', () => {
    expect(deepEqual({ a: 10 }, { a: 10 })).toEqual(true);
});

test('deepEqual - 5', () => {
    expect(deepEqual([], [])).toEqual(true);
});

test('deepEqual - 6', () => {
    expect(deepEqual([10], [])).toEqual(false);
});

test('deepEqual - 7', () => {
    expect(deepEqual([10], [10])).toEqual(true);
});

test('deepEqual - 8', () => {
    expect(deepEqual([10], [10, { b: 20 }])).toEqual(false);
});

test('deepEqual - 9', () => {
    expect(deepEqual([{ b: 20 }, 10], [10, { b: 20 }])).toEqual(false);
});

test('deepEqual - 10', () => {
    expect(
        deepEqual([{ b: 20 }, 10], [10, { b: 20 }], {
            disregardArrayOrder: true
        })
    ).toEqual(true);
});

test('deepEqual - 11', () => {
    expect(
        deepEqual(
            [{ b: 20, c: { d: 'a', e: new Date(2022, 10, 1) } }, 10],
            [10, { b: 20 }],
            {
                disregardArrayOrder: true
            }
        )
    ).toEqual(false);
});

test('deepEqual - 12', () => {
    expect(
        deepEqual(
            [{ b: 20, c: { d: 'a', e: new Date(2022, 10, 1) } }, 10],
            [10, { b: 20, c: { e: new Date(2022, 10, 1), d: 'a' } }],
            {
                disregardArrayOrder: true
            }
        )
    ).toEqual(true);
});

test('deepEqual - null args', () => {
    expect(deepEqual(null, null)).toEqual(true);
});

test('deepEqual - null props', () => {
    expect(deepEqual({ prop1: null }, { prop1: null })).toEqual(true);
});

test('deepEqual - null props 2', () => {
    expect(
        deepEqual(
            { prop1: null },
            {
                prop1: {
                    someVal: 10
                }
            }
        )
    ).toEqual(false);
});

test('deepEqual - undefined props', () => {
    expect(
        deepEqual(
            { prop1: undefined },
            {
                prop1: {
                    someVal: 10
                }
            }
        )
    ).toEqual(false);
});

test('deepEqual - array vs non-array returns false', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toEqual(false);
    expect(deepEqual({ 0: 1 }, [1])).toEqual(false);
});

test('deepEqual - circular reference returns false', () => {
    const a: Record<string, unknown> = {};
    a['self'] = a;
    const b: Record<string, unknown> = {};
    b['self'] = b;
    // cyclic comparison should not infinitely recurse and return false
    expect(deepEqual(a, b)).toEqual(false);
});

test('deepEqual - objects with different key order but same keys are equal', () => {
    expect(deepEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toEqual(true);
});

test('deepEqual - objects with different key names return false', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toEqual(false);
});
