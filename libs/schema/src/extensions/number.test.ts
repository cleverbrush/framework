import { describe, expect, test } from 'vitest';
import { number } from '../index.js';

describe('number extensions', () => {
    // -----------------------------------------------------------------------
    // positive()
    // -----------------------------------------------------------------------
    describe('positive()', () => {
        test('accepts a positive number', async () => {
            const result = number().positive().validate(5);
            expect(result.valid).toBe(true);
        });

        test('rejects zero', async () => {
            const result = number().positive().validate(0);
            expect(result.valid).toBe(false);
        });

        test('rejects a negative number', async () => {
            const result = number().positive().validate(-1);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().positive().introspect();
            expect(meta.extensions?.positive).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = number()
                .positive('Must be greater than zero')
                .validate(-1);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe(
                'Must be greater than zero'
            );
        });

        test('uses function error message', async () => {
            const result = number()
                .positive((val) => `${val} is not positive`)
                .validate(-3);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('-3 is not positive');
        });
    });

    // -----------------------------------------------------------------------
    // negative()
    // -----------------------------------------------------------------------
    describe('negative()', () => {
        test('accepts a negative number', async () => {
            const result = number().negative().validate(-5);
            expect(result.valid).toBe(true);
        });

        test('rejects zero', async () => {
            const result = number().negative().validate(0);
            expect(result.valid).toBe(false);
        });

        test('rejects a positive number', async () => {
            const result = number().negative().validate(1);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().negative().introspect();
            expect(meta.extensions?.negative).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = number().negative('Must be below zero').validate(1);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Must be below zero');
        });
    });

    // -----------------------------------------------------------------------
    // finite()
    // -----------------------------------------------------------------------
    describe('finite()', () => {
        test('accepts a finite number', async () => {
            const result = number().canBeInfinite().finite().validate(42);
            expect(result.valid).toBe(true);
        });

        test('rejects Infinity', async () => {
            const result = number().canBeInfinite().finite().validate(Infinity);
            expect(result.valid).toBe(false);
        });

        test('rejects -Infinity', async () => {
            const result = number()
                .canBeInfinite()
                .finite()
                .validate(-Infinity);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().finite().introspect();
            expect(meta.extensions?.finite).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = number()
                .canBeInfinite()
                .finite('No infinities allowed')
                .validate(Infinity);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('No infinities allowed');
        });
    });

    // -----------------------------------------------------------------------
    // multipleOf()
    // -----------------------------------------------------------------------
    describe('multipleOf()', () => {
        test('accepts a multiple of n (integer)', async () => {
            const result = number().multipleOf(3).validate(9);
            expect(result.valid).toBe(true);
        });

        test('rejects a non-multiple (integer)', async () => {
            const result = number().multipleOf(3).validate(10);
            expect(result.valid).toBe(false);
        });

        test('accepts a float multiple', async () => {
            const schema = number().clearIsInteger().multipleOf(0.1);
            const result = schema.validate(0.3);
            expect(result.valid).toBe(true);
        });

        test('rejects a float non-multiple', async () => {
            const schema = number().clearIsInteger().multipleOf(0.3);
            const result = schema.validate(0.5);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().multipleOf(5).introspect();
            expect(meta.extensions?.multipleOf).toBe(5);
        });

        test('uses custom error message', async () => {
            const result = number()
                .multipleOf(3, 'Must be divisible by 3')
                .validate(10);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Must be divisible by 3');
        });

        test('throws for n === 0', () => {
            expect(() => number().multipleOf(0)).toThrow(
                'multipleOf: n must be a finite, non-zero number'
            );
        });

        test('throws for n === NaN', () => {
            expect(() => number().multipleOf(NaN)).toThrow(
                'multipleOf: n must be a finite, non-zero number'
            );
        });

        test('throws for n === Infinity', () => {
            expect(() => number().multipleOf(Infinity)).toThrow(
                'multipleOf: n must be a finite, non-zero number'
            );
        });

        test('throws for n === -Infinity', () => {
            expect(() => number().multipleOf(-Infinity)).toThrow(
                'multipleOf: n must be a finite, non-zero number'
            );
        });
    });

    // -----------------------------------------------------------------------
    // chaining
    // -----------------------------------------------------------------------
    describe('chaining', () => {
        test('positive + multipleOf', async () => {
            const schema = number().positive().multipleOf(5);
            expect(schema.validate(10).valid).toBe(true);
            expect(schema.validate(-5).valid).toBe(false);
            expect(schema.validate(7).valid).toBe(false);
        });

        test('chains with built-in min/max', async () => {
            const schema = number().positive().min(1).max(100);
            expect(schema.validate(50).valid).toBe(true);
            expect(schema.validate(0).valid).toBe(false);
            expect(schema.validate(101).valid).toBe(false);
        });

        test('metadata preserved through chaining', () => {
            const meta = number().positive().multipleOf(3).introspect();
            expect(meta.extensions?.positive).toBe(true);
            expect(meta.extensions?.multipleOf).toBe(3);
        });
    });

    // -----------------------------------------------------------------------
    // type safety — non-number inputs must not crash
    // -----------------------------------------------------------------------
    describe('type safety', () => {
        test('positive rejects non-number without throwing', async () => {
            const result = number()
                .positive()
                .validate('5' as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        test('positive uses custom error for non-number', async () => {
            const result = number()
                .positive('bad value')
                .validate('hi' as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('bad value');
        });

        test('negative rejects non-number without throwing', async () => {
            const result = number()
                .negative()
                .validate(null as any);
            expect(result.valid).toBe(false);
        });

        test('finite rejects non-number without throwing', async () => {
            const result = number()
                .finite()
                .validate({} as any);
            expect(result.valid).toBe(false);
        });

        test('multipleOf rejects non-number without throwing', async () => {
            const result = number()
                .multipleOf(5)
                .validate('10' as any);
            expect(result.valid).toBe(false);
        });

        test('multipleOf uses custom error for non-number', async () => {
            const result = number()
                .multipleOf(5, 'wrong type')
                .validate(true as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('wrong type');
        });
    });
});
