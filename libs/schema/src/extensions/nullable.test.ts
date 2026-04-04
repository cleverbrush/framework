import { describe, expect, expectTypeOf, test } from 'vitest';
import {
    any,
    array,
    boolean,
    date,
    func,
    type InferType,
    number,
    object,
    string,
    tuple,
    union
} from '../index.js';

describe('nullable extension', () => {
    // -----------------------------------------------------------------------
    // string().nullable()
    // -----------------------------------------------------------------------
    describe('string().nullable()', () => {
        test('accepts a valid string', () => {
            const schema = string().nullable();
            const result = schema.validate('hello');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('hello');
        });

        test('accepts null', () => {
            const schema = string().nullable();
            const result = schema.validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects undefined', () => {
            const schema = string().nullable();
            const result = schema.validate(undefined as any);
            expect(result.valid).toBe(false);
        });

        test('rejects a number', () => {
            const schema = string().nullable();
            const result = schema.validate(42 as any);
            expect(result.valid).toBe(false);
        });

        test('inferred type is string | null', () => {
            const schema = string().nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<string | null>();
            expectTypeOf<null>().toMatchTypeOf<T>();
        });

        test('chains with built-in string methods — call them before .nullable()', () => {
            const schema = string().email().nullable();
            expect(schema.validate('user@example.com').valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate('not-an-email').valid).toBe(false);
        });

        test('stores nullable extension metadata on the union', () => {
            const schema = string().nullable();
            const meta = schema.introspect();
            expect(meta.type).toBe('union');
            expect(meta.options).toHaveLength(2);
        });
    });

    // -----------------------------------------------------------------------
    // number().nullable()
    // -----------------------------------------------------------------------
    describe('number().nullable()', () => {
        test('accepts a valid number', () => {
            const schema = number().nullable();
            const result = schema.validate(42);
            expect(result.valid).toBe(true);
            expect(result.object).toBe(42);
        });

        test('accepts null', () => {
            const schema = number().nullable();
            const result = schema.validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects a string', () => {
            const schema = number().nullable();
            expect(schema.validate('42' as any).valid).toBe(false);
        });

        test('inferred type is number | null', () => {
            const schema = number().nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<number | null>();
        });

        test('chains with built-in number methods', () => {
            const schema = number().positive().nullable();
            expect(schema.validate(5).valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate(-1).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // boolean().nullable()
    // -----------------------------------------------------------------------
    describe('boolean().nullable()', () => {
        test('accepts true', () => {
            expect(boolean().nullable().validate(true).valid).toBe(true);
        });

        test('accepts false', () => {
            expect(boolean().nullable().validate(false).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = boolean()
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects a string', () => {
            expect(
                boolean()
                    .nullable()
                    .validate('true' as any).valid
            ).toBe(false);
        });

        test('inferred type is boolean | null', () => {
            const schema = boolean().nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<boolean | null>();
        });
    });

    // -----------------------------------------------------------------------
    // date().nullable()
    // -----------------------------------------------------------------------
    describe('date().nullable()', () => {
        test('accepts a Date instance', () => {
            const schema = date().nullable();
            const d = new Date();
            expect(schema.validate(d).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = date()
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects a string', () => {
            expect(
                date()
                    .nullable()
                    .validate('2024-01-01' as any).valid
            ).toBe(false);
        });

        test('inferred type is Date | null', () => {
            const schema = date().nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<Date | null>();
        });
    });

    // -----------------------------------------------------------------------
    // object().nullable()
    // -----------------------------------------------------------------------
    describe('object().nullable()', () => {
        test('accepts a matching object', () => {
            const schema = object({ name: string() }).nullable();
            expect(schema.validate({ name: 'Alice' }).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = object({ name: string() })
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects an invalid object', () => {
            const schema = object({ name: string() }).nullable();
            expect(schema.validate({ name: 42 } as any).valid).toBe(false);
        });

        test('inferred type includes null', () => {
            const schema = object({ count: number() }).nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<{ count: number } | null>();
        });
    });

    // -----------------------------------------------------------------------
    // array().nullable()
    // -----------------------------------------------------------------------
    describe('array().nullable()', () => {
        test('accepts a valid array', () => {
            const schema = array(string()).nullable();
            expect(schema.validate(['a', 'b']).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = array(string())
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects a non-array', () => {
            expect(
                array(string())
                    .nullable()
                    .validate('not-array' as any).valid
            ).toBe(false);
        });

        test('inferred type is string[] | null', () => {
            const schema = array(string()).nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<string[] | null>();
        });

        test('chains with nonempty before .nullable()', () => {
            const schema = array(string()).nonempty().nullable();
            expect(schema.validate(['hello']).valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate([]).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // union().nullable()
    // -----------------------------------------------------------------------
    describe('union().nullable()', () => {
        test('accepts first union option', () => {
            const schema = union(string()).or(number()).nullable();
            expect(schema.validate('hello').valid).toBe(true);
        });

        test('accepts second union option', () => {
            const schema = union(string()).or(number()).nullable();
            expect(schema.validate(42).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = union(string())
                .or(number())
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects unmatched type', () => {
            const schema = union(string()).or(number()).nullable();
            expect(schema.validate(true as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // func().nullable()
    // -----------------------------------------------------------------------
    describe('func().nullable()', () => {
        test('accepts a function', () => {
            const schema = func().nullable();
            expect(schema.validate(() => {}).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = func()
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects a non-function', () => {
            expect(
                func()
                    .nullable()
                    .validate('fn' as any).valid
            ).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // any().nullable()
    // -----------------------------------------------------------------------
    describe('any().nullable()', () => {
        test('accepts any non-null value', () => {
            const schema = any().nullable();
            expect(schema.validate('text').valid).toBe(true);
            expect(schema.validate(42).valid).toBe(true);
            expect(schema.validate({}).valid).toBe(true);
        });

        test('accepts null', () => {
            const result = any()
                .nullable()
                .validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // Optional + nullable combos
    // -----------------------------------------------------------------------
    describe('.optional() + .nullable()', () => {
        test('string().optional().nullable() accepts string, null, or undefined', () => {
            const schema = string().optional().nullable();
            expect(schema.validate('hello').valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true);
            expect(schema.validate(undefined as any).valid).toBe(true);
        });

        test('string().nullable() rejects undefined (required by default)', () => {
            const schema = string().nullable();
            expect(schema.validate(undefined as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // object({ prop: schema.nullable() })
    // -----------------------------------------------------------------------
    describe('nullable property inside object schema', () => {
        test('validates object with nullable string property', () => {
            const UserSchema = object({
                name: string().nonempty(),
                bio: string().nullable()
            });

            expect(
                UserSchema.validate({ name: 'Alice', bio: 'Developer' }).valid
            ).toBe(true);
            expect(
                UserSchema.validate({ name: 'Alice', bio: null as any }).valid
            ).toBe(true);
            expect(
                UserSchema.validate({ name: 'Alice', bio: 42 as any }).valid
            ).toBe(false);
        });

        test('validates object with nullable number property', () => {
            const Schema = object({
                value: number().nullable()
            });

            expect(Schema.validate({ value: 10 }).valid).toBe(true);
            expect(Schema.validate({ value: null as any }).valid).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // tuple().nullable()
    // -----------------------------------------------------------------------
    describe('tuple().nullable()', () => {
        test('accepts a valid tuple', () => {
            const schema = tuple([string(), number()]).nullable();
            const result = schema.validate(['hello', 42]);
            expect(result.valid).toBe(true);
            expect(result.object).toEqual(['hello', 42]);
        });

        test('accepts null', () => {
            const schema = tuple([string(), number()]).nullable();
            const result = schema.validate(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('rejects undefined', () => {
            const schema = tuple([string(), number()]).nullable();
            const result = schema.validate(undefined as any);
            expect(result.valid).toBe(false);
        });

        test('rejects wrong element type', () => {
            const schema = tuple([string(), number()]).nullable();
            const result = schema.validate(['hello', 'bad'] as any);
            expect(result.valid).toBe(false);
        });

        test('inferred type is [string, number] | null', () => {
            const schema = tuple([string(), number()]).nullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toMatchTypeOf<[string, number] | null>();
            expectTypeOf<null>().toMatchTypeOf<T>();
        });
    });

    // -----------------------------------------------------------------------
    // async validation
    // -----------------------------------------------------------------------
    describe('validateAsync', () => {
        test('accepts null asynchronously', async () => {
            const schema = string().nullable();
            const result = await schema.validateAsync(null as any);
            expect(result.valid).toBe(true);
            expect(result.object).toBeNull();
        });

        test('accepts valid string asynchronously', async () => {
            const schema = number().nullable();
            const result = await schema.validateAsync(7);
            expect(result.valid).toBe(true);
            expect(result.object).toBe(7);
        });
    });
});
