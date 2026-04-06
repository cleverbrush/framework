import { describe, expect, expectTypeOf, test } from 'vitest';
import { enumOf, type InferType, number, string } from '../index.js';
import { enumExtension } from './enum.js';
import { withExtensions } from '../extension.js';

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

        test('accepts custom string error message via array form', () => {
            const schema = string().oneOf(
                ['admin', 'user', 'guest'],
                'Invalid role'
            );
            const result = schema.validate('other' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe('Invalid role');
            }
        });

        test('accepts custom error factory via array form', () => {
            const schema = string().oneOf(
                ['admin', 'user'],
                (val: unknown) => `"${val}" is not a valid role`
            );
            const result = schema.validate('superadmin' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe(
                    '"superadmin" is not a valid role'
                );
            }
        });

        test('accepts custom error factory via rest-params form (function as last arg)', () => {
            const schema = string().oneOf(
                'admin',
                'user',
                (val: unknown) => `"${val}" is not allowed`
            );
            const result = schema.validate('other' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe(
                    '"other" is not allowed'
                );
            }
        });

        test('array form still validates correctly', () => {
            const schema = string().oneOf(['admin', 'user'], 'Invalid role');
            expect(schema.validate('admin').valid).toBe(true);
            expect(schema.validate('user').valid).toBe(true);
            expect(schema.validate('other' as any).valid).toBe(false);
        });

        test('array form stores oneOf metadata via introspect', () => {
            const schema = string().oneOf(['a', 'b', 'c'], 'error');
            const meta = schema.introspect();
            expect(meta.extensions?.oneOf).toEqual(['a', 'b', 'c']);
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

        test('accepts custom string error message as last rest-param', () => {
            const schema = number().oneOf(
                1,
                2,
                3,
                'Priority must be 1, 2, or 3'
            );
            const result = schema.validate(99 as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe(
                    'Priority must be 1, 2, or 3'
                );
            }
        });

        test('accepts custom error factory as last rest-param', () => {
            const schema = number().oneOf(
                1,
                2,
                3,
                (val: unknown) => `${val} is not a valid priority`
            );
            const result = schema.validate(99 as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe(
                    '99 is not a valid priority'
                );
            }
        });

        test('accepts custom string error message via array form', () => {
            const schema = number().oneOf([1, 2, 3], 'Invalid priority');
            const result = schema.validate(99 as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe('Invalid priority');
            }
        });

        test('accepts custom error factory via array form', () => {
            const schema = number().oneOf(
                [1, 2, 3],
                (val: unknown) => `${val} is not valid`
            );
            const result = schema.validate(99 as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe('99 is not valid');
            }
        });

        test('rest-params with string error message still validates correctly', () => {
            const schema = number().oneOf(1, 2, 3, 'error');
            expect(schema.validate(1).valid).toBe(true);
            expect(schema.validate(2).valid).toBe(true);
            expect(schema.validate(4 as any).valid).toBe(false);
        });

        test('rest-params with error message stores correct metadata', () => {
            const schema = number().oneOf(10, 20, 'error');
            const meta = schema.introspect();
            expect(meta.extensions?.oneOf).toEqual([10, 20]);
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

        test('accepts custom string error message via array form', () => {
            const schema = enumOf(['admin', 'user', 'guest'], 'Invalid role');
            const result = schema.validate('other' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe('Invalid role');
            }
        });

        test('accepts custom error factory via array form', () => {
            const schema = enumOf(
                ['admin', 'user'],
                (val: unknown) => `"${val}" is not a valid role`
            );
            const result = schema.validate('other' as any);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.errors![0].message).toBe(
                    '"other" is not a valid role'
                );
            }
        });

        test('array form still validates correctly', () => {
            const schema = enumOf(['admin', 'user'], 'Invalid role');
            expect(schema.validate('admin').valid).toBe(true);
            expect(schema.validate('user').valid).toBe(true);
            expect(schema.validate('other' as any).valid).toBe(false);
        });

        test('infers literal union type', () => {
            const schema = enumOf('admin', 'user', 'guest');
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<'admin' | 'user' | 'guest'>();
        });

        test('infers literal union type via array form', () => {
            const schema = enumOf(
                ['admin', 'user', 'guest'] as const,
                'Invalid role'
            );
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

// ---------------------------------------------------------------------------
// enumExtension — standalone extension descriptor
// ---------------------------------------------------------------------------

describe('enumExtension (standalone withExtensions usage)', () => {
    const s = withExtensions(enumExtension);

    describe('string().oneOf() via enumExtension', () => {
        test('valid value is accepted', () => {
            const schema = (s.string() as any).oneOf('a', 'b', 'c');
            expect(schema.validate('a').valid).toBe(true);
        });

        test('invalid value is rejected with default message', () => {
            const schema = (s.string() as any).oneOf('a', 'b');
            const result = schema.validate('z');
            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toContain('a');
        });

        test('array form with custom string error message', () => {
            const schema = (s.string() as any).oneOf(['x', 'y'], 'bad value');
            expect(schema.validate('z').valid).toBe(false);
            expect(schema.validate('z').errors[0].message).toBe('bad value');
        });

        test('array form with custom error factory', () => {
            const schema = (s.string() as any).oneOf(
                ['x', 'y'],
                (v: unknown) => `got ${v}`
            );
            expect(schema.validate('z').errors[0].message).toBe('got z');
        });

        test('rest-params form with function as last arg', () => {
            const schema = (s.string() as any).oneOf(
                'a',
                'b',
                (v: unknown) => `not allowed: ${v}`
            );
            expect(schema.validate('c').errors[0].message).toBe(
                'not allowed: c'
            );
        });

        test('throws when called with no values', () => {
            expect(() => (s.string() as any).oneOf()).toThrow(
                'oneOf requires at least one value'
            );
        });

        test('throws when array form has empty array', () => {
            expect(() => (s.string() as any).oneOf([])).toThrow(
                'oneOf requires at least one value'
            );
        });
    });

    describe('number().oneOf() via enumExtension', () => {
        test('valid value is accepted', () => {
            const schema = (s.number() as any).oneOf(1, 2, 3);
            expect(schema.validate(1).valid).toBe(true);
        });

        test('invalid value is rejected with default message', () => {
            const schema = (s.number() as any).oneOf(1, 2);
            const result = schema.validate(99);
            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toContain('1');
        });

        test('array form with custom string error message', () => {
            const schema = (s.number() as any).oneOf([1, 2], 'invalid num');
            expect(schema.validate(3).errors[0].message).toBe('invalid num');
        });

        test('array form with custom error factory', () => {
            const schema = (s.number() as any).oneOf(
                [10, 20],
                (v: unknown) => `${v} is not valid`
            );
            expect(schema.validate(99).errors[0].message).toBe(
                '99 is not valid'
            );
        });

        test('rest-params form with string error message as last arg', () => {
            const schema = (s.number() as any).oneOf(1, 2, 3, 'must be 1-3');
            expect(schema.validate(5).errors[0].message).toBe('must be 1-3');
        });

        test('rest-params form with function as last arg', () => {
            const schema = (s.number() as any).oneOf(
                1,
                2,
                (v: unknown) => `${v} rejected`
            );
            expect(schema.validate(5).errors[0].message).toBe('5 rejected');
        });

        test('throws when called with no values', () => {
            expect(() => (s.number() as any).oneOf()).toThrow(
                'oneOf requires at least one value'
            );
        });

        test('throws when array form has empty array', () => {
            expect(() => (s.number() as any).oneOf([])).toThrow(
                'oneOf requires at least one value'
            );
        });
    });
});
