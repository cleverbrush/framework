import { deepExtend } from './deepExtend.js';

test('deepExtend - 1', () => {
    const res = deepExtend({ a: 1 });
    expect(res).toEqual({ a: 1 });
});

test('deepExtend - 2', () => {
    expect(deepExtend({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
});

test('deepExtend - 3', () => {
    expect(deepExtend({ a: 1 }, { b: { c: 20 } })).toEqual({
        a: 1,
        b: { c: 20 }
    });
});

test('deepExtend - 4', () => {
    expect(deepExtend({ a: 1 }, { b: { c: 20, d: 'some string' } })).toEqual({
        a: 1,
        b: { c: 20, d: 'some string' }
    });
});

test('deepExtend - 5', () => {
    const res = deepExtend(
        { a: 1 },
        { b: { c: 20, d: 'some string', e: null } }
    );
    expect(res).toEqual({ a: 1, b: { c: 20, d: 'some string', e: null } });
});

test('deepExtend - 6', () => {
    expect(deepExtend({ a: 1 }, { a: null })).toEqual({ a: null });
});

test('deepExtend - 7', () => {
    expect(() => deepExtend()).toThrow('no arguments');
});

test('deepExtend - 8', () => {
    expect(() => deepExtend(null)).toThrow('not a non-null object');
});

test('deepExtend - 9', () => {
    expect(() => deepExtend(undefined)).toThrow('not a non-null object');
});

test('deepExtend - 10', () => {
    expect(() => deepExtend({ a: 1 }, null)).toThrow('not a non-null object');
});

test('deepExtend - 11', () => {
    expect(deepExtend({ a: null }, { a: { b: 20 } })).toEqual({
        a: { b: 20 }
    });
});

test('deepExtend - 12', () => {
    expect(deepExtend({ a: { b: 20 } }, { a: { b: 30, c: 40 } })).toEqual({
        a: { b: 30, c: 40 }
    });
});

test('deepExtend - 13', () => {
    expect(deepExtend({ a: { b: 20 } }, { a: null })).toEqual({
        a: null
    });
});
