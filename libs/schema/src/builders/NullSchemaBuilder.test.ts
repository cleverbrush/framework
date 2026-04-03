import { expect, expectTypeOf, test } from 'vitest';

import { NullSchemaBuilder, nul } from './NullSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';

test('Clean — null is valid', async () => {
    const schema = nul();

    const typeCheck: InferType<typeof schema> = null;
    expectTypeOf(typeCheck).toBeNull();

    const introspected = schema.introspect();
    expect(introspected.type).toEqual('null');
    expect(introspected.isRequired).toEqual(true);

    const { valid, object, errors } = schema.validate(null);
    expect(valid).toEqual(true);
    expect(object).toBeNull();
    expect(errors).toBeUndefined();
});

test('Clean async — null is valid', async () => {
    const schema = nul();
    const { valid, object, errors } = await schema.validateAsync(null);
    expect(valid).toEqual(true);
    expect(object).toBeNull();
    expect(errors).toBeUndefined();
});

test('Required (default) — undefined is invalid', () => {
    const schema = nul();
    const { valid, object, errors } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
    expect(object).toBeUndefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Required (default) — non-null values are invalid', () => {
    const schema = nul();

    for (const value of [0, '', false, {}, [], 'null', NaN]) {
        const { valid } = schema.validate(value as any);
        expect(
            valid,
            `expected ${JSON.stringify(value)} to be invalid`
        ).toEqual(false);
    }
});

test('Optional — null and undefined are valid', () => {
    const schema = nul();
    const optSchema = schema.optional();

    expect((schema as any) !== optSchema).toEqual(true);

    const nullResult = optSchema.validate(null);
    expect(nullResult.valid).toEqual(true);
    expect(nullResult.object).toBeNull();

    const undefinedResult = optSchema.validate(undefined as any);
    expect(undefinedResult.valid).toEqual(true);
    expect(undefinedResult.object).toBeUndefined();
});

test('Optional — non-null/non-undefined values are still invalid', () => {
    const schema = nul().optional();

    for (const value of [0, '', false, {}, [], 'null']) {
        const { valid } = schema.validate(value as any);
        expect(
            valid,
            `expected ${JSON.stringify(value)} to be invalid`
        ).toEqual(false);
    }
});

test('Optional async — null and undefined are valid', async () => {
    const schema = nul().optional();

    const nullResult = await schema.validateAsync(null);
    expect(nullResult.valid).toEqual(true);
    expect(nullResult.object).toBeNull();

    const undefinedResult = await schema.validateAsync(undefined as any);
    expect(undefinedResult.valid).toEqual(true);
    expect(undefinedResult.object).toBeUndefined();
});

test('Immutability — optional() returns a new instance', () => {
    const required = nul();
    const optional = required.optional();
    expect((required as any) !== optional).toEqual(true);
    expect(required.introspect().isRequired).toEqual(true);
    expect(optional.introspect().isRequired).toEqual(false);
});

test('required() round-trip', () => {
    const schema = nul().optional().required();
    expect(schema.introspect().isRequired).toEqual(true);
    expect(schema.validate(null).valid).toEqual(true);
    expect(schema.validate(undefined as any).valid).toEqual(false);
});

test('Type inference — InferType is null for required', () => {
    const schema = nul();
    type T = InferType<typeof schema>;
    const v: T = null;
    expectTypeOf(v).toBeNull();
});

test('NullSchemaBuilder is exported (for extension)', () => {
    expect(typeof NullSchemaBuilder).toEqual('function');
});

test('introspect type is null', () => {
    const schema = nul();
    expect(schema.introspect().type).toEqual('null');
});

test('error message for invalid value', () => {
    const schema = nul();
    const { valid, errors } = schema.validate('oops' as any);
    expect(valid).toEqual(false);
    expect(errors?.[0].message).toEqual('must be null');
});
