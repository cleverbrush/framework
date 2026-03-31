import { describe, expect, test } from 'vitest';
import { number } from '../index.js';

describe('number extensions', () => {
    // -----------------------------------------------------------------------
    // positive()
    // -----------------------------------------------------------------------
    describe('positive()', () => {
        test('accepts a positive number', async () => {
            const result = await number().positive().validate(5);
            expect(result.valid).toBe(true);
        });

        test('rejects zero', async () => {
            const result = await number().positive().validate(0);
            expect(result.valid).toBe(false);
        });

        test('rejects a negative number', async () => {
            const result = await number().positive().validate(-1);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().positive().introspect();
            expect(meta.extensions?.positive).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = await number()
                .positive('Must be greater than zero')
                .validate(-1);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe(
                'Must be greater than zero'
            );
        });

        test('uses function error message', async () => {
            const result = await number()
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
            const result = await number().negative().validate(-5);
            expect(result.valid).toBe(true);
        });

        test('rejects zero', async () => {
            const result = await number().negative().validate(0);
            expect(result.valid).toBe(false);
        });

        test('rejects a positive number', async () => {
            const result = await number().negative().validate(1);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().negative().introspect();
            expect(meta.extensions?.negative).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = await number()
                .negative('Must be below zero')
                .validate(1);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Must be below zero');
        });
    });

    // -----------------------------------------------------------------------
    // finite()
    // -----------------------------------------------------------------------
    describe('finite()', () => {
        test('accepts a finite number', async () => {
            const result = await number().canBeInfinite().finite().validate(42);
            expect(result.valid).toBe(true);
        });

        test('rejects Infinity', async () => {
            const result = await number()
                .canBeInfinite()
                .finite()
                .validate(Infinity);
            expect(result.valid).toBe(false);
        });

        test('rejects -Infinity', async () => {
            const result = await number()
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
            const result = await number()
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
            const result = await number().multipleOf(3).validate(9);
            expect(result.valid).toBe(true);
        });

        test('rejects a non-multiple (integer)', async () => {
            const result = await number().multipleOf(3).validate(10);
            expect(result.valid).toBe(false);
        });

        test('accepts a float multiple', async () => {
            const schema = number().clearIsInteger().multipleOf(0.1);
            const result = await schema.validate(0.3);
            expect(result.valid).toBe(true);
        });

        test('rejects a float non-multiple', async () => {
            const schema = number().clearIsInteger().multipleOf(0.3);
            const result = await schema.validate(0.5);
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = number().multipleOf(5).introspect();
            expect(meta.extensions?.multipleOf).toBe(5);
        });

        test('uses custom error message', async () => {
            const result = await number()
                .multipleOf(3, 'Must be divisible by 3')
                .validate(10);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Must be divisible by 3');
        });
    });

    // -----------------------------------------------------------------------
    // chaining
    // -----------------------------------------------------------------------
    describe('chaining', () => {
        test('positive + multipleOf', async () => {
            const schema = number().positive().multipleOf(5);
            expect((await schema.validate(10)).valid).toBe(true);
            expect((await schema.validate(-5)).valid).toBe(false);
            expect((await schema.validate(7)).valid).toBe(false);
        });

        test('chains with built-in min/max', async () => {
            const schema = number().positive().min(1).max(100);
            expect((await schema.validate(50)).valid).toBe(true);
            expect((await schema.validate(0)).valid).toBe(false);
            expect((await schema.validate(101)).valid).toBe(false);
        });

        test('metadata preserved through chaining', () => {
            const meta = number().positive().multipleOf(3).introspect();
            expect(meta.extensions?.positive).toBe(true);
            expect(meta.extensions?.multipleOf).toBe(3);
        });
    });
});
