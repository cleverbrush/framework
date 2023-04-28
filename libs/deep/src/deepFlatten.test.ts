import { deepFlatten } from './deepFlatten.js';

test('deepFlatten - 1', () => {
    const res = deepFlatten({ a: 1 });
    expect(res).toEqual({ a: 1 });
});

test('deepFlatten - 2', () => {
    expect(deepFlatten({ a: 1, b: { c: 20 } })).toEqual({ a: 1, 'b.c': 20 });
});

test('deepFlatten - 2', () => {
    expect(deepFlatten({ a: 1, b: { c: 20, d: 'some string' } })).toEqual({
        a: 1,
        'b.c': 20,
        'b.d': 'some string'
    });
});

test('deepFlatten - 3', () => {
    expect(
        deepFlatten({ a: 1, b: { c: 20, d: 'some string', e: null } })
    ).toEqual({
        a: 1,
        'b.c': 20,
        'b.d': 'some string',
        'b.e': null
    });
});

test('deepFlatten - 4', () => {
    expect(
        deepFlatten({
            a: 1,
            b: { c: 20, d: 'some string', e: null, f: undefined }
        })
    ).toEqual({
        a: 1,
        'b.c': 20,
        'b.d': 'some string',
        'b.e': null,
        'b.f': undefined
    });
});

test('deepFlatten - 5', () => {
    const d = new Date();
    const res = deepFlatten({
        a: 1,
        b: {
            c: 20,
            d: 'some string',
            e: null,
            f: undefined,
            g: {
                h: d
            }
        }
    });
    expect(res).toEqual({
        a: 1,
        'b.c': 20,
        'b.d': 'some string',
        'b.e': null,
        'b.f': undefined,
        'b.g.h': d
    });
});

test('deepFlatten - 6', () => {
    const obj1: { a: number; e: any } = { a: 1, e: null };
    const obj2 = { b: 2, c: obj1 };
    const obj3 = { c: 3, d: obj2 };
    obj1.e = obj3;
    expect(() => deepFlatten(obj3)).toThrowError('circular reference detected');
});

test('deepFlatten - 7', () => {
    const customObj = new (class {})();
    expect(() => deepFlatten(customObj)).toThrowError(
        'cannot flatten this object'
    );
});

test('deepFlatten - 8', () => {
    expect(() => deepFlatten(10)).toThrowError('cannot flatten this object');
});

test('deepFlatten - 9', () => {
    expect(() => deepFlatten(10)).toThrowError('cannot flatten this object');
});

test('deepFlatten - 10', () => {
    const repeatedObj = { a: 1 };
    const obj = { b: repeatedObj, c: repeatedObj };
    expect(deepFlatten(obj)).toEqual({ 'b.a': 1, 'c.a': 1 });
});
