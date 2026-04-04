import { describe, expect, expectTypeOf, test } from 'vitest';
import { defineExtension, withExtensions } from '../extension.js';
import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { nul } from './NullSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ==========================================================================
// Type-level tests
// ==========================================================================

describe('readonly - type inference', () => {
    test('object().readonly() produces Readonly<{...}>', () => {
        const schema = object({ name: string(), age: number() }).readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<
            Readonly<{ name: string; age: number }>
        >();
    });

    test('array(string()).readonly() produces ReadonlyArray<string>', () => {
        const schema = array(string()).readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<ReadonlyArray<string>>();
    });

    test('array(number()).readonly() produces ReadonlyArray<number>', () => {
        const schema = array(number()).readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<ReadonlyArray<number>>();
    });

    test('string().readonly() produces string (identity for primitives)', () => {
        const schema = string().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<string>();
    });

    test('number().readonly() produces number (identity for primitives)', () => {
        const schema = number().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<number>();
    });

    test('boolean().readonly() produces boolean (identity)', () => {
        const schema = boolean().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<boolean>();
    });

    test('date().readonly() produces Readonly<Date>', () => {
        const schema = date().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<Readonly<Date>>();
    });

    test('any().readonly() produces Readonly<any>', () => {
        const schema = any().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<Readonly<any>>();
    });

    test('union().readonly() produces Readonly<union>', () => {
        const schema = union(string()).or(number()).readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<Readonly<string | number>>();
    });

    test('readonly() + optional() produces Readonly<T> | undefined', () => {
        const schema = object({ name: string() }).readonly().optional();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<
            Readonly<{ name: string }> | undefined
        >();
    });

    test('optional() + readonly() produces Readonly<T> | undefined', () => {
        const schema = object({ name: string() }).optional().readonly();
        type Result = InferType<typeof schema>;
        expectTypeOf<Result>().toEqualTypeOf<
            Readonly<{ name: string }> | undefined
        >();
    });

    test('readonly object is assignable to Readonly<{...}>', () => {
        const schema = object({ id: number(), name: string() }).readonly();
        type Result = InferType<typeof schema>;
        const value: Result = { id: 1, name: 'Alice' };
        expectTypeOf(value).toEqualTypeOf<
            Readonly<{ id: number; name: string }>
        >();
    });

    test('readonly array: type is ReadonlyArray (no push/pop at type level)', () => {
        const schema = array(string()).readonly();
        type Result = InferType<typeof schema>;
        // ReadonlyArray does not have push/pop
        expectTypeOf<Result>().not.toHaveProperty('push');
        expectTypeOf<Result>().not.toHaveProperty('pop');
    });

    test('readonly object: properties are readonly at type level', () => {
        const schema = object({ name: string() }).readonly();
        type Result = InferType<typeof schema>;
        // Readonly<{name: string}> means name is readonly
        type NameProp = Result['name'];
        expectTypeOf<NameProp>().toEqualTypeOf<string>();
    });
});

// ==========================================================================
// Runtime tests
// ==========================================================================

describe('readonly - runtime behavior', () => {
    test('isReadonly is true after .readonly()', () => {
        const schema = object({ name: string() }).readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('isReadonly is false by default (object)', () => {
        const schema = object({ name: string() });
        expect(schema.introspect().isReadonly).toBe(false);
    });

    test('isReadonly is false by default (string)', () => {
        const schema = string();
        expect(schema.introspect().isReadonly).toBe(false);
    });

    test('isReadonly is false by default (array)', () => {
        const schema = array(string());
        expect(schema.introspect().isReadonly).toBe(false);
    });

    test('readonly() does not change validation behavior (valid object)', async () => {
        const schema = object({ name: string(), age: number() }).readonly();
        const { valid, object: obj } = await schema.validate({
            name: 'Alice',
            age: 30
        } as any);
        expect(valid).toBe(true);
        expect(obj).toEqual({ name: 'Alice', age: 30 });
    });

    test('readonly() does not change validation behavior (invalid object)', async () => {
        const schema = object({ name: string(), age: number() }).readonly();
        const { valid, errors } = await schema.validate({
            name: 'Alice',
            age: 'not-a-number'
        } as any);
        expect(valid).toBe(false);
        expect(errors).toBeDefined();
    });

    test('readonly() does not change validation behavior (valid array)', async () => {
        const schema = array(string()).readonly();
        const { valid, object: arr } = await schema.validate(['a', 'b'] as any);
        expect(valid).toBe(true);
        expect(arr).toEqual(['a', 'b']);
    });

    test('readonly() does not change validation behavior (invalid array)', async () => {
        const schema = array(string()).readonly();
        const { valid, errors } = await schema.validate([1, 2, 3] as any);
        expect(valid).toBe(false);
        expect(errors).toBeDefined();
    });

    test('readonly() does not change validation behavior (string)', () => {
        const plain = string().minLength(3);
        const ro = string().minLength(3).readonly();

        const validPlain = plain.validate('hello');
        const validRo = ro.validate('hello' as any);
        expect(validPlain.valid).toBe(true);
        expect(validRo.valid).toBe(true);

        const invalidPlain = plain.validate('ab');
        const invalidRo = ro.validate('ab' as any);
        expect(invalidPlain.valid).toBe(false);
        expect(invalidRo.valid).toBe(false);
    });

    test('readonly() returns a new builder instance (immutability)', () => {
        const original = object({ name: string() });
        const ro = original.readonly();
        expect(original).not.toBe(ro);
        expect(original.introspect().isReadonly).toBe(false);
        expect(ro.introspect().isReadonly).toBe(true);
    });

    test('chaining: readonly().optional()', () => {
        const schema = object({ name: string() }).readonly().optional();
        expect(schema.introspect().isReadonly).toBe(true);
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('chaining: optional().readonly()', () => {
        const schema = object({ name: string() }).optional().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('all builder types support readonly() - string', () => {
        const schema = string().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - number', () => {
        const schema = number().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - boolean', () => {
        const schema = boolean().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - date', () => {
        const schema = date().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - any', () => {
        const schema = any().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - nul', () => {
        const schema = nul().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - func', () => {
        const schema = func().readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - union', () => {
        const schema = union(string()).or(number()).readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - array', () => {
        const schema = array(string()).readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('all builder types support readonly() - object', () => {
        const schema = object({ name: string() }).readonly();
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('readonly() works with validateAsync()', async () => {
        const schema = object({ name: string() }).readonly();
        const result = await schema.validateAsync({ name: 'Alice' } as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'Alice' });
    });

    test('readonly() works with parse()', () => {
        const schema = string().readonly();
        const result = schema.parse('hello' as any);
        expect(result).toBe('hello');
    });

    test('readonly() works with parseAsync()', async () => {
        const schema = string().readonly();
        const result = await schema.parseAsync('hello' as any);
        expect(result).toBe('hello');
    });

    test('isReadonly is preserved through chaining with other methods', () => {
        const schema = string().minLength(1).readonly().maxLength(100);
        expect(schema.introspect().isReadonly).toBe(true);
    });
});

// ==========================================================================
// Extension integration
// ==========================================================================

describe('readonly - extension integration', () => {
    const trimExt = defineExtension({
        string: {
            trim(this: StringSchemaBuilder) {
                return this.addPreprocessor((val: string) => val.trim());
            }
        }
    });

    test('readonly() works after extension methods', () => {
        const { string: s } = withExtensions(trimExt);
        const schema = s().trim().readonly();
        expect(schema.introspect().isReadonly).toBe(true);

        const result = schema.validate('  hello  ' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('extension methods work after readonly()', () => {
        const { string: s } = withExtensions(trimExt);
        const schema = s().readonly().trim();

        expect(schema.introspect().isReadonly).toBe(true);
        const result = schema.validate('  hello  ' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });
});
