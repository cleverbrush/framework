import { describe, expect, it } from 'vitest';
import { HashObject } from './hashObject.js';

describe('object hashing', () => {
    it('keeps numeric inputs and hashes strings deterministically', () => {
        expect(HashObject(42)).toBe(42);
        expect(HashObject('hello')).toBe(-1502471327);
        expect(HashObject('42')).not.toBe(HashObject(42));
        expect(HashObject('')).toBe(-891985903);
        expect(HashObject(undefined)).toBeTypeOf('number');
        expect(HashObject(NaN)).toBeTypeOf('number');
    });

    it('sorts keys and includes nested values without modifying them', () => {
        const first = { a: 1, b: { label: 'one' } };
        const second = { b: { label: 'one' }, a: 1 };
        expect(HashObject(first)).toBe(HashObject(second));
        // Golden value from the pre-cycle-fix implementation.
        expect(HashObject(first)).toBe(1868467459);
        expect(HashObject({ one: 'value', two: 'value' })).toBe(538503302);
        expect(HashObject(first)).not.toBe(HashObject({ ...first, a: 2 }));
        expect(first).toEqual({ a: 1, b: { label: 'one' } });
        expect(HashObject({})).toBe(0);
    });

    it('terminates self and mutual references with stable hashes', () => {
        const self: any = { label: 'one' };
        self.self = self;
        const other: any = { label: 'one' };
        other.self = other;
        expect(HashObject(self)).toBeTypeOf('number');
        expect(HashObject(self)).toBe(HashObject(other));
        const left: any = { label: 'left' };
        const right: any = { label: 'right', left };
        left.right = right;
        expect(HashObject(left)).toBe(HashObject(left));
        expect(left.right.left).toBe(left);
    });

    it('respects explicit exclusions and shared references', () => {
        const shared = { value: 'same' };
        expect(HashObject({ a: shared, b: shared })).toBe(
            HashObject({ b: shared, a: shared })
        );
        expect(HashObject(shared, [shared])).toBeUndefined();
    });
});
