import { describe, expect, it } from 'vitest';
import { deepSort } from './deepSort.js';

describe('deepSort', () => {
    it('sorts in place and preserves ties and object identity', () => {
        const a = { path: [3, 2], id: 'a' };
        const b = { path: [1, 1], id: 'b' };
        const c = { path: [0, 2], id: 'c' };
        const input = [a, b, c];
        expect(deepSort(input, 1, 'path')).toBe(input);
        expect(input).toEqual([b, a, c]);
        expect(input[1]).toBe(a);
    });
    it('validates depth against each path rather than record count', () => {
        const input = [{ path: [8, 4, 1] }];
        expect(deepSort(input, 2, 'path')).toEqual(input);
        expect(deepSort([], 5, 'path')).toEqual([]);
    });
    it.each([-1, 0.5, NaN, Infinity])('rejects invalid index %s', index => {
        expect(() => deepSort([{ path: [1] }], index, 'path')).toThrow(
            RangeError
        );
    });
    it('rejects an out-of-bounds path before mutating', () => {
        const input = [{ path: [2, 0] }, { path: [1] }];
        const before = [...input];
        expect(() => deepSort(input, 1, 'path')).toThrow(RangeError);
        expect(input).toEqual(before);
    });
    it.each([undefined, null, 1, {}, 'value', [NaN], [Infinity], ['1']])(
        'rejects invalid sort field %s',
        path => {
            expect(() => deepSort([{ path }], 0, 'path')).toThrow(TypeError);
        }
    );
    it('rejects non-array input', () => {
        expect(() => deepSort(null as never, 0, 'path')).toThrow(TypeError);
    });
});
