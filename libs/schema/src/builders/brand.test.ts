import { describe, expect, expectTypeOf, test } from 'vitest';
import { defineExtension, withExtensions } from '../extension.js';
import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { BRAND, Brand, InferType } from './SchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ==========================================================================
// Type-level tests
// ==========================================================================

describe('brand - type inference', () => {
    test('string().brand<T>() produces branded string', () => {
        const schema = string().brand<'Email'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<string>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Email';
        }>();
    });

    test('number().brand<T>() produces branded number', () => {
        const schema = number().brand<'UserId'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<number>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'UserId';
        }>();
    });

    test('boolean().brand<T>() produces branded boolean', () => {
        const schema = boolean().brand<'Flag'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<boolean>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Flag';
        }>();
    });

    test('date().brand<T>() produces branded date', () => {
        const schema = date().brand<'Timestamp'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<Date>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Timestamp';
        }>();
    });

    test('func().brand<T>() produces branded function', () => {
        const schema = func().brand<'Handler'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<(...args: any[]) => any>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Handler';
        }>();
    });

    test('any().brand<T>() produces branded any', () => {
        const schema = any().brand<'Payload'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Payload';
        }>();
    });

    test('object().brand<T>() produces branded object', () => {
        const schema = object({
            name: string(),
            age: number()
        }).brand<'User'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<{ name: string; age: number }>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'User';
        }>();
    });

    test('array().brand<T>() produces branded array', () => {
        const schema = array(string()).brand<'Tags'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<string[]>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Tags';
        }>();
    });

    test('union().brand<T>() produces branded union', () => {
        const schema = union(string()).or(number()).brand<'Id'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<{ readonly [K in BRAND]: 'Id' }>();
    });

    test('two differently branded strings are not assignable to each other', () => {
        const emailSchema = string().brand<'Email'>();
        const usernameSchema = string().brand<'Username'>();
        type Email = InferType<typeof emailSchema>;
        type Username = InferType<typeof usernameSchema>;

        // Each is assignable to string
        expectTypeOf<Email>().toExtend<string>();
        expectTypeOf<Username>().toExtend<string>();

        // But not to each other
        expectTypeOf<Email>().not.toEqualTypeOf<Username>();
        expectTypeOf<Username>().not.toEqualTypeOf<Email>();
    });

    test('brand() + optional() produces branded | undefined', () => {
        const schema = string().brand<'Email'>().optional();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<
            (string & { readonly [K in BRAND]: 'Email' }) | undefined
        >();
    });

    test('optional() + brand() produces branded | undefined', () => {
        const schema = string().optional().brand<'Email'>();
        type Result = InferType<typeof schema>;
        // brand() on an already-optional schema should still produce a branded optional type
        expectTypeOf<Result>().toEqualTypeOf<
            (string & { readonly [K in BRAND]: 'Email' }) | undefined
        >();
    });

    test('brand preserved through builder chaining', () => {
        const schema = string().minLength(5).brand<'Email'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<string>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Email';
        }>();
    });

    test('hasType() after brand() replaces the type', () => {
        const schema = string().brand<'Email'>().hasType<Date>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<Date>();
    });

    test('Brand utility type works standalone', () => {
        type Email = Brand<string, 'Email'>;
        type UserId = Brand<number, 'UserId'>;

        expectTypeOf<Email>().toExtend<string>();
        expectTypeOf<UserId>().toExtend<number>();
        expectTypeOf<Email>().not.toEqualTypeOf<string>();
        expectTypeOf<UserId>().not.toEqualTypeOf<number>();
    });
});

// ==========================================================================
// Runtime tests
// ==========================================================================

describe('brand - runtime behavior', () => {
    test('brand() does not change validation results (string)', () => {
        const plain = string().minLength(3);
        const branded = string().minLength(3).brand<'Email'>();

        const validPlain = plain.validate('hello');
        const validBranded = branded.validate('hello' as any);
        expect(validPlain.valid).toBe(true);
        expect(validBranded.valid).toBe(true);
        expect(validPlain.object).toEqual(validBranded.object);

        const invalidPlain = plain.validate('ab');
        const invalidBranded = branded.validate('ab' as any);
        expect(invalidPlain.valid).toBe(false);
        expect(invalidBranded.valid).toBe(false);
    });

    test('brand() does not change validation results (number)', () => {
        const branded = number().brand<'UserId'>();

        const valid = branded.validate(42 as any);
        expect(valid.valid).toBe(true);
        expect(valid.object).toBe(42);

        const invalid = branded.validate('not a number' as any);
        expect(invalid.valid).toBe(false);
    });

    test('brand() does not change validation results (object)', () => {
        const branded = object({ name: string() }).brand<'User'>();

        const valid = branded.validate({ name: 'Alice' } as any);
        expect(valid.valid).toBe(true);
        expect(valid.object).toEqual({ name: 'Alice' });

        const invalid = branded.validate({ name: 123 } as any);
        expect(invalid.valid).toBe(false);
    });

    test('brand() does not change validation results (array)', () => {
        const branded = array(number()).brand<'Scores'>();

        const valid = branded.validate([1, 2, 3] as any);
        expect(valid.valid).toBe(true);

        const invalid = branded.validate(['a', 'b'] as any);
        expect(invalid.valid).toBe(false);
    });

    test('brand() returns a new instance (immutability)', () => {
        const original = string();
        const branded = original.brand<'Email'>();
        expect(original).not.toBe(branded);
    });

    test('brand() with runtime argument (JS compat)', () => {
        const schema = string().brand('Email');
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<string>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Email';
        }>();

        // Runtime still works
        const valid = schema.validate('test@example.com' as any);
        expect(valid.valid).toBe(true);
    });
});

// ==========================================================================
// Extension integration
// ==========================================================================

describe('brand - extension integration', () => {
    const trimExt = defineExtension({
        string: {
            trim(this: StringSchemaBuilder<any, any, any, any, any>) {
                return this.addPreprocessor((val: string) => val.trim());
            }
        }
    });

    test('brand() works after extension methods', () => {
        const { string: s } = withExtensions(trimExt);
        const schema = s().trim().brand<'Trimmed'>();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toExtend<string>();
        expectTypeOf<Result>().toExtend<{
            readonly [K in BRAND]: 'Trimmed';
        }>();

        const result = schema.validate('  hello  ' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('extension methods work after brand()', () => {
        const { string: s } = withExtensions(trimExt);
        const schema = s().brand<'Trimmed'>().trim();

        const result = schema.validate('  hello  ' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });
});
