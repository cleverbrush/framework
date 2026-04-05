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
    record,
    string,
    tuple,
    union
} from '../index.js';

describe('notNullable()', () => {
    // -----------------------------------------------------------------------
    // string().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('string().nullable().notNullable()', () => {
        test('accepts a valid string', () => {
            const schema = string().nullable().notNullable();
            expect(schema.validate('hello').valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = string().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('rejects undefined', () => {
            const schema = string().nullable().notNullable();
            expect(schema.validate(undefined as any).valid).toBe(false);
        });

        test('inferred type is string (not string | null)', () => {
            const schema = string().nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<string>();
        });

        test('introspect reports isNullable = false', () => {
            const schema = string().nullable().notNullable();
            expect(schema.introspect().isNullable).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // number().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('number().nullable().notNullable()', () => {
        test('accepts a valid number', () => {
            const schema = number().nullable().notNullable();
            expect(schema.validate(42).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = number().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is number', () => {
            const schema = number().nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<number>();
        });
    });

    // -----------------------------------------------------------------------
    // boolean().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('boolean().nullable().notNullable()', () => {
        test('accepts a boolean', () => {
            const schema = boolean().nullable().notNullable();
            expect(schema.validate(true).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = boolean().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is boolean', () => {
            const schema = boolean().nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<boolean>();
        });
    });

    // -----------------------------------------------------------------------
    // date().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('date().nullable().notNullable()', () => {
        test('accepts a Date', () => {
            const schema = date().nullable().notNullable();
            expect(schema.validate(new Date()).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = date().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is Date', () => {
            const schema = date().nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<Date>();
        });
    });

    // -----------------------------------------------------------------------
    // object().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('object().nullable().notNullable()', () => {
        test('accepts a matching object', () => {
            const schema = object({ name: string() }).nullable().notNullable();
            expect(schema.validate({ name: 'Alice' }).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = object({ name: string() }).nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type excludes null', () => {
            const schema = object({ count: number() }).nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<{ count: number }>();
        });
    });

    // -----------------------------------------------------------------------
    // array().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('array().nullable().notNullable()', () => {
        test('accepts a valid array', () => {
            const schema = array(string()).nullable().notNullable();
            expect(schema.validate(['a']).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = array(string()).nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is string[]', () => {
            const schema = array(string()).nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<string[]>();
        });
    });

    // -----------------------------------------------------------------------
    // union().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('union().nullable().notNullable()', () => {
        test('accepts union options', () => {
            const schema = union(string())
                .or(number())
                .nullable()
                .notNullable();
            expect(schema.validate('hi').valid).toBe(true);
            expect(schema.validate(42).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = union(string())
                .or(number())
                .nullable()
                .notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // func().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('func().nullable().notNullable()', () => {
        test('accepts a function', () => {
            const schema = func().nullable().notNullable();
            expect(schema.validate(() => {}).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = func().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // any().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('any().nullable().notNullable()', () => {
        test('accepts any value', () => {
            const schema = any().nullable().notNullable();
            expect(schema.validate('text').valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = any().nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // tuple().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('tuple().nullable().notNullable()', () => {
        test('accepts a valid tuple', () => {
            const schema = tuple([string(), number()]).nullable().notNullable();
            expect(schema.validate(['a', 1]).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = tuple([string(), number()]).nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is [string, number]', () => {
            const schema = tuple([string(), number()]).nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<[string, number]>();
        });
    });

    // -----------------------------------------------------------------------
    // record().nullable().notNullable()
    // -----------------------------------------------------------------------
    describe('record().nullable().notNullable()', () => {
        test('accepts a valid record', () => {
            const schema = record(string(), number()).nullable().notNullable();
            expect(schema.validate({ a: 1 }).valid).toBe(true);
        });

        test('rejects null', () => {
            const schema = record(string(), number()).nullable().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('inferred type is Record<string, number>', () => {
            const schema = record(string(), number()).nullable().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<Record<string, number>>();
        });
    });

    // -----------------------------------------------------------------------
    // notNullable() on a non-nullable schema is a no-op
    // -----------------------------------------------------------------------
    describe('notNullable() on non-nullable schema', () => {
        test('string().notNullable() still rejects null', () => {
            const schema = string().notNullable();
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('string().notNullable() inferred type is string', () => {
            const schema = string().notNullable();
            type T = InferType<typeof schema>;
            expectTypeOf<T>().toEqualTypeOf<string>();
        });

        test('introspect reports isNullable = false', () => {
            const schema = string().notNullable();
            expect(schema.introspect().isNullable).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Chaining with other modifiers
    // -----------------------------------------------------------------------
    describe('chaining with other modifiers', () => {
        test('string().nullable().optional().notNullable() — still optional', () => {
            const schema = string().nullable().optional().notNullable();
            expect(schema.validate(undefined as any).valid).toBe(true);
            expect(schema.validate(null as any).valid).toBe(true); // optional allows null
            expect(schema.validate('hi').valid).toBe(true);
        });

        test('number().positive().nullable().notNullable() preserves constraints', () => {
            const schema = number().positive().nullable().notNullable();
            expect(schema.validate(5).valid).toBe(true);
            expect(schema.validate(-1).valid).toBe(false);
            expect(schema.validate(null as any).valid).toBe(false);
        });

        test('string().email().nullable().notNullable() preserves constraints', () => {
            const schema = string().email().nullable().notNullable();
            expect(schema.validate('user@example.com').valid).toBe(true);
            expect(schema.validate('bad').valid).toBe(false);
            expect(schema.validate(null as any).valid).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Async validation
    // -----------------------------------------------------------------------
    describe('async validation', () => {
        test('notNullable() rejects null asynchronously', async () => {
            const schema = string().nullable().notNullable();
            const result = await schema.validateAsync(null as any);
            expect(result.valid).toBe(false);
        });

        test('notNullable() accepts valid value asynchronously', async () => {
            const schema = number().nullable().notNullable();
            const result = await schema.validateAsync(42);
            expect(result.valid).toBe(true);
            expect(result.object).toBe(42);
        });
    });
});
