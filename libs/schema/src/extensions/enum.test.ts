import { describe, expect, expectTypeOf, test } from 'vitest';
import { enumOf, type InferType, number, string } from '../index.js';

describe('enum extension (oneOf)', () => {
    // -----------------------------------------------------------------------
    // string().oneOf()
    // -----------------------------------------------------------------------
    describe('string().oneOf()', () => {
        test('accepts a valid value', () => {
            const schema = string().oneOf('admin', 'user', 'guest');
            expect(schema.validate('admin').valid).toBe(true);
            expect(schema.validate('admin').object).toBe('admin');
        });

        test('accepts every allowed value', () => {
            const schema = string().oneOf('admin', 'user', 'guest');
            expect(schema.validate('admin').valid).toBe(true);
            expect(schema.validate('user').valid).toBe(true);
            expect(schema.validate('guest').valid).toBe(true);
        });

        test('rejects a string not in the allowed set', () => {
            const schema = string().oneOf('admin', 'user', 'guest');
            const result = schema.validate('superadmin' as any);
            expect(result.valid).toBe(false);
        });

        test('rejects a number', () => {
            const schema = string().oneOf('a', 'b');
            const result = schema.validate(42 as any);
            expect(result.valid).toBe(false);
        });

        test('rejects null', () => {
            const schema = string().oneOf('a', 'b');
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('rejects undefined', () => {
            const schema = string().oneOf('a', 'b');
            expect(schema.validate(undefined as any).valid).toBe(false);
        });

        test('rejects a boolean', () => {
            const schema = string().oneOf('true', 'false');
            expect(schema.validate(true as any).valid).toBe(false);
        });

        test('error message includes allowed values', () => {
            const schema = string().oneOf('admin', 'user', 'guest');
            const result = schema.validate('other' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(Array.isArray(result.errors)).toBe(true);
                expect(result.errors!.length).toBeGreaterThan(0);
                expect(result.errors![0].message).toContain('admin');
                expect(result.errors![0].message).toContain('user');
                expect(result.errors![0].message).toContain('guest');
            }
        });

        test('stores oneOf metadata via introspect', () => {
            const schema = string().oneOf('a', 'b', 'c');
            const meta = schema.introspect();
            expect(meta.extensions?.oneOf).toEqual(['a', 'b', 'c']);
        });

        test('chains with .nullable()', () => {
            const schema = string().oneOf('a', 'b').nullable();
            expect(schema.validate('a').valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate('c' as any).valid).toBe(false);
        });

        test('chains with .optional()', () => {
            const schema = string().oneOf('a', 'b').optional();
            expect(schema.validate('a').valid).toBe(true);
            expect(schema.validate(undefined as any).valid).toBe(true);
            expect(schema.validate('c' as any).valid).toBe(false);
        });

        test('works with single value', () => {
            const schema = string().oneOf('only');
            expect(schema.validate('only').valid).toBe(true);
            expect(schema.validate('other' as any).valid).toBe(false);
        });

        // -------------------------------------------------------------------
        // Type-level tests
        // -------------------------------------------------------------------
        test('infers literal union type', () => {
            const schema = string().oneOf('admin', 'user', 'guest');
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<'admin' | 'user' | 'guest'>();
        });

        test('infers single literal type', () => {
            const schema = string().oneOf('only');
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<'only'>();
        });

        test('.oneOf().optional() infers union with undefined', () => {
            const schema = string().oneOf('a', 'b').optional();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<'a' | 'b' | undefined>();
        });

        test('.oneOf().nullable() infers union with null', () => {
            const schema = string().oneOf('a', 'b').nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<'a' | 'b' | null>();
        });
    });

    // -----------------------------------------------------------------------
    // number().oneOf()
    // -----------------------------------------------------------------------
    describe('number().oneOf()', () => {
        test('accepts a valid value', () => {
            const schema = number().oneOf(1, 2, 3);
            expect(schema.validate(1).valid).toBe(true);
            expect(schema.validate(1).object).toBe(1);
        });

        test('accepts every allowed value', () => {
            const schema = number().oneOf(10, 20, 30);
            expect(schema.validate(10).valid).toBe(true);
            expect(schema.validate(20).valid).toBe(true);
            expect(schema.validate(30).valid).toBe(true);
        });

        test('rejects a number not in the allowed set', () => {
            const schema = number().oneOf(1, 2, 3);
            const result = schema.validate(4 as any);
            expect(result.valid).toBe(false);
        });

        test('rejects a string', () => {
            const schema = number().oneOf(1, 2);
            expect(schema.validate('1' as any).valid).toBe(false);
        });

        test('rejects null', () => {
            const schema = number().oneOf(1, 2);
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('error message includes allowed values', () => {
            const schema = number().oneOf(1, 2, 3);
            const result = schema.validate(99 as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toContain('1');
                expect(result.errors![0].message).toContain('2');
                expect(result.errors![0].message).toContain('3');
            }
        });

        test('stores oneOf metadata via introspect', () => {
            const schema = number().oneOf(10, 20);
            const meta = schema.introspect();
            expect(meta.extensions?.oneOf).toEqual([10, 20]);
        });

        test('chains with .nullable()', () => {
            const schema = number().oneOf(1, 2).nullable();
            expect(schema.validate(1).valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate(3 as any).valid).toBe(false);
        });

        test('chains with .optional()', () => {
            const schema = number().oneOf(1, 2).optional();
            expect(schema.validate(1).valid).toBe(true);
            expect(schema.validate(undefined as any).valid).toBe(true);
            expect(schema.validate(3 as any).valid).toBe(false);
        });

        // -------------------------------------------------------------------
        // Type-level tests
        // -------------------------------------------------------------------
        test('infers literal union type', () => {
            const schema = number().oneOf(1, 2, 3);
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<1 | 2 | 3>();
        });

        test('.oneOf().optional() infers union with undefined', () => {
            const schema = number().oneOf(10, 20).optional();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<10 | 20 | undefined>();
        });

        test('.oneOf().nullable() infers union with null', () => {
            const schema = number().oneOf(1, 2).nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<1 | 2 | null>();
        });
    });

    // -----------------------------------------------------------------------
    // enumOf() factory
    // -----------------------------------------------------------------------
    describe('enumOf()', () => {
        test('accepts a valid value', () => {
            const schema = enumOf('admin', 'user', 'guest');
            expect(schema.validate('admin').valid).toBe(true);
        });

        test('rejects an invalid value', () => {
            const schema = enumOf('admin', 'user', 'guest');
            expect(schema.validate('other' as any).valid).toBe(false);
        });

        test('rejects non-string types', () => {
            const schema = enumOf('a', 'b');
            expect(schema.validate(42 as any).valid).toBe(false);
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('infers literal union type', () => {
            const schema = enumOf('admin', 'user', 'guest');
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<'admin' | 'user' | 'guest'>();
        });

        test('chains with .nullable()', () => {
            const schema = enumOf('x', 'y').nullable();
            expect(schema.validate('x').valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate('z' as any).valid).toBe(false);
        });

        test('.nullable() infers union with null', () => {
            const schema = enumOf('x', 'y').nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<'x' | 'y' | null>();
        });
    });
});
