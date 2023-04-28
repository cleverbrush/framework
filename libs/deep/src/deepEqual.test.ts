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
