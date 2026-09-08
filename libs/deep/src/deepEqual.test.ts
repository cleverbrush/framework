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

test('deepEqual - equivalent circular references compare equal', () => {
    const a: Record<string, unknown> = {};
    a['self'] = a;
    const b: Record<string, unknown> = {};
    b['self'] = b;
    expect(deepEqual(a, b)).toEqual(true);
});

test('deepEqual - objects with different key order but same keys are equal', () => {
    expect(deepEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toEqual(true);
});

test('deepEqual - objects with different key names return false', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toEqual(false);
});

test.each([
    null,
    undefined,
    true,
    1,
    'a',
    Symbol('a'),
    () => 1
])('deepEqual - object versus %s is symmetric and does not throw', value => {
    expect(deepEqual({}, value)).toBe(false);
    expect(deepEqual(value, {})).toBe(false);
});

test('deepEqual - primitives follow Object.is', () => {
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(false);
    expect(deepEqual({ value: -0 }, { value: 0 })).toBe(false);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(1n, 1n)).toBe(true);
    expect(deepEqual(Symbol('key'), Symbol('key'))).toBe(false);
});

test('deepEqual - Dates compare timestamps, including invalid dates', () => {
    expect(deepEqual(new Date(1), new Date(1))).toBe(true);
    expect(deepEqual(new Date(1), new Date(2))).toBe(false);
    expect(deepEqual(new Date(Number.NaN), new Date(Number.NaN))).toBe(true);
    expect(deepEqual(new Date(1), new Date(Number.NaN))).toBe(false);
    expect(deepEqual(new Date(1), {})).toBe(false);
    expect(deepEqual({}, new Date(1))).toBe(false);
    expect(deepEqual(new Date(1), null)).toBe(false);
});

test('deepEqual - opaque objects compare by identity', () => {
    class RecordValue {
        value = 1;
    }
    for (const create of [
        () => new RecordValue(),
        () => new Map([['a', 1]]),
        () => new Set([1]),
        () => /pattern/g,
        () => new Uint8Array([1]),
        () => new File(['text'], 'file.txt')
    ]) {
        const value = create();
        expect(deepEqual(value, value)).toBe(true);
        expect(deepEqual(value, create())).toBe(false);
        expect(deepEqual(value, {})).toBe(false);
        expect(deepEqual({}, value)).toBe(false);
    }
});

test('deepEqual - only enumerable own properties participate', () => {
    const key = Symbol('key');
    const left = Object.assign(Object.create(null), { a: 1, [key]: 2 });
    expect(deepEqual(left, { a: 1, [key]: 2 })).toBe(true);
    expect(deepEqual(left, { a: 1, [key]: 3 })).toBe(false);
    expect(deepEqual(left, { a: 1, [Symbol('key')]: 2 })).toBe(false);
    Object.defineProperty(left, 'hidden', { value: 3 });
    expect(deepEqual(left, { a: 1, [key]: 2 })).toBe(true);
    expect(deepEqual({ value: undefined }, {})).toBe(false);
    expect(
        deepEqual({ a: 1 }, Object.defineProperty({}, 'a', { value: 1 }))
    ).toBe(false);
});

test.each([
    false,
    true
])('deepEqual - preserves array length, holes and extra properties (unordered=%s)', disregardArrayOrder => {
    const options = { disregardArrayOrder };
    expect(deepEqual(new Array(3), new Array(3), options)).toBe(true);
    expect(deepEqual(new Array(3), new Array(4), options)).toBe(false);
    expect(deepEqual(new Array(1), [undefined], options)).toBe(false);
    const key = Symbol('metadata');
    const left = Object.assign([1], { label: 'a', [key]: 2 });
    expect(deepEqual(left, [1], options)).toBe(false);
    expect(
        deepEqual(left, Object.assign([1], { label: 'a', [key]: 2 }), options)
    ).toBe(true);
    expect(
        deepEqual(left, Object.assign([1], { label: 'a', [key]: 3 }), options)
    ).toBe(false);
});

test('deepEqual - ordered holes retain their positions', () => {
    const left = new Array(2);
    left[0] = 1;
    const right = new Array(2);
    right[1] = 1;
    expect(deepEqual(left, right)).toBe(false);
    expect(deepEqual(left, right, { disregardArrayOrder: true })).toBe(true);
});

test.each([
    false,
    true
])('deepEqual - cycles terminate and still detect mismatches (unordered=%s)', disregardArrayOrder => {
    const options = { disregardArrayOrder };
    const left: any = { value: 1 };
    left.self = left;
    const right: any = { value: 1 };
    right.self = right;
    expect(deepEqual(left, right, options)).toBe(true);
    right.value = 2;
    expect(deepEqual(left, right, options)).toBe(false);
    const leftArray: any[] = [];
    leftArray.push(leftArray, { value: 1 });
    const rightArray: any[] = [];
    rightArray.push(rightArray, { value: 1 });
    expect(deepEqual(leftArray, rightArray, options)).toBe(true);
    rightArray[1].value = 2;
    expect(deepEqual(leftArray, rightArray, options)).toBe(false);
});

test('deepEqual - sharing topology is not part of structural equality', () => {
    const shared = { value: 1 };
    const left = { a: shared, b: shared };
    const right = { a: { value: 1 }, b: { value: 1 } };
    expect(deepEqual(left, right)).toBe(true);
    expect(deepEqual(right, left)).toBe(true);
    right.b.value = 2;
    expect(deepEqual(left, right)).toBe(false);
    const cycle: any = { value: 1 };
    cycle.next = cycle;
    const twoCycle: any = { value: 1, next: { value: 1 } };
    twoCycle.next.next = twoCycle;
    expect(deepEqual(cycle, twoCycle)).toBe(true);
    expect(deepEqual(twoCycle, cycle)).toBe(true);
    twoCycle.next.value = 2;
    expect(deepEqual(cycle, twoCycle)).toBe(false);
});

test('deepEqual - unordered comparisons count duplicates without mutating inputs', () => {
    const options = { disregardArrayOrder: true };
    const left = Object.freeze([{ value: 1 }, { value: 2 }, { value: 1 }]);
    const right = Object.freeze([{ value: 1 }, { value: 1 }, { value: 2 }]);
    expect(deepEqual(left, right, options)).toBe(true);
    expect(
        deepEqual(left, [{ value: 1 }, { value: 2 }, { value: 2 }], options)
    ).toBe(false);
    expect(deepEqual([0, -0, Number.NaN], [Number.NaN, -0, 0], options)).toBe(
        true
    );
    expect(deepEqual([0, 0], [0, -0], options)).toBe(false);
    expect(deepEqual([[1, 2], [3]], [[3], [2, 1]], options)).toBe(true);
    expect(left.map(value => value.value)).toEqual([1, 2, 1]);
    expect(right.map(value => value.value)).toEqual([1, 1, 2]);
});

test('deepEqual - failed cyclic candidates do not poison unordered comparisons', () => {
    function cycle(value: number) {
        const result: any = {};
        result.self = result;
        result.value = value;
        return result;
    }
    const options = { disregardArrayOrder: true };
    const shared = cycle(1);
    expect(
        deepEqual(
            [shared, cycle(2), shared],
            [cycle(2), cycle(1), cycle(1)],
            options
        )
    ).toBe(true);
    expect(
        deepEqual(
            [shared, cycle(2), shared],
            [cycle(2), cycle(1), cycle(3)],
            options
        )
    ).toBe(false);
});
