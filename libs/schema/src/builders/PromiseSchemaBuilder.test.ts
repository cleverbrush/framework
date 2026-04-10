import { expect, expectTypeOf, test } from 'vitest';

import { number } from './NumberSchemaBuilder.js';
import { promise } from './PromiseSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Basic validation
// ---------------------------------------------------------------------------

test('Promise checks — valid Promise', async () => {
    const schema = promise();

    const obj = Promise.resolve(42);
    const { valid, object: result, errors } = await schema.validate(obj);
    expect(valid).toEqual(true);
    expect(result).toBe(obj);
    expect(errors).not.toBeDefined();
});

test('Promise checks — null is rejected', async () => {
    const schema = promise();

    const { valid, object: result, errors } = await schema.validate(null as any);
    expect(valid).toEqual(false);
    expect(result).not.toBeDefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Promise checks — undefined is rejected', async () => {
    const schema = promise();

    const {
        valid,
        object: result,
        errors
    } = await schema.validate(undefined as any);
    expect(valid).toEqual(false);
    expect(result).not.toBeDefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Promise checks — number is rejected', async () => {
    const schema = promise();

    const { valid, object: result, errors } = await schema.validate(0 as any);
    expect(valid).toEqual(false);
    expect(result).not.toBeDefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Promise checks — string is rejected', async () => {
    const schema = promise();

    const {
        valid,
        object: result,
        errors
    } = await schema.validate('some string' as any);
    expect(valid).toEqual(false);
    expect(result).not.toBeDefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Promise checks — plain object is rejected', async () => {
    const schema = promise();

    const {
        valid,
        object: result,
        errors
    } = await schema.validate({ then: 'not a function' } as any);
    expect(valid).toEqual(false);
    expect(result).not.toBeDefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Promise checks — thenable (duck-typed Promise) is accepted', async () => {
    const schema = promise();

    const thenable = { then: (res: any) => res(42) } as unknown as Promise<number>;
    const { valid, object: result, errors } = await schema.validate(thenable);
    expect(valid).toEqual(true);
    expect(result).toBe(thenable);
    expect(errors).not.toBeDefined();
});

test('Promise checks — type is inferred as Promise<any> when no resolved type is given', () => {
    const schema = promise();

    const typeCheck: InferType<typeof schema> = Promise.resolve('hello');
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<any>>();
});

// ---------------------------------------------------------------------------
// Optional checks
// ---------------------------------------------------------------------------

test('Optional checks — undefined is accepted', async () => {
    const schema = promise().optional();

    const typeCheck: InferType<typeof schema> = undefined;
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<any> | undefined>();

    const {
        valid,
        object: result,
        errors
    } = await schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(result).toEqual(undefined);
    expect(errors).not.toBeDefined();
});

test('Optional checks — null is accepted', async () => {
    const schema = promise().optional();

    const { valid, object: result, errors } = await schema.validate(null as any);
    expect(valid).toEqual(true);
    expect(result).toEqual(null);
    expect(errors).not.toBeDefined();
});

test('Optional checks — valid Promise is still accepted', async () => {
    const schema = promise().optional();

    const obj = Promise.resolve(10);
    const { valid, object: result, errors } = await schema.validate(obj);
    expect(valid).toEqual(true);
    expect(result).toBe(obj);
    expect(errors).not.toBeDefined();
});

test('Optional checks — non-promise value is rejected', async () => {
    const schema = promise().optional();

    const {
        valid,
        object: result,
        errors
    } = await schema.validate(400 as any);
    expect(valid).toEqual(false);
    expect(result).toBeUndefined();
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

// ---------------------------------------------------------------------------
// Required checks
// ---------------------------------------------------------------------------

test('Required checks — required after optional rejects undefined', async () => {
    const schema1 = promise().optional();
    const schema2 = schema1.required();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const { valid, errors } = await schema2.validate(null as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const { valid, errors } = await schema2.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = Promise.resolve(true);
        const { valid, object: result, errors } = await schema2.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toBe(obj);
        expect(errors).not.toBeDefined();
    }
});

// ---------------------------------------------------------------------------
// hasType
// ---------------------------------------------------------------------------

test('Has type checks — hasType overrides inferred type', async () => {
    const schema1 = promise();
    const schema2 = schema1.hasType<Date>();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectTypeOf(typeCheck).toMatchTypeOf<Date>();

    {
        const { valid, errors } = await schema2.validate(null as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = Promise.resolve(new Date()) as unknown as Date;
        const { valid, object: result, errors } = await schema2.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toBe(obj);
        expect(errors).not.toBeDefined();
    }
});

// ---------------------------------------------------------------------------
// clearHasType
// ---------------------------------------------------------------------------

test('clearHasType — removes the explicit type', () => {
    const schema1 = promise().hasType<Date>();
    const schema2 = schema1.clearHasType();

    const typeCheck: InferType<typeof schema2> = Promise.resolve(null);
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<any>>();
    expect(schema1 !== (schema2 as any)).toEqual(true);
});

// ---------------------------------------------------------------------------
// clearDefault
// ---------------------------------------------------------------------------

test('clearDefault — removes default value from promise schema', () => {
    const defaultPromise = () => Promise.resolve(0);
    const schema = promise()
        .default(defaultPromise as any)
        .clearDefault();
    expect(schema.introspect().defaultValue).toBeUndefined();
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// hasResolvedType
// ---------------------------------------------------------------------------

test('hasResolvedType — starts with undefined resolvedType', () => {
    const schema = promise();
    const typeCheck: InferType<typeof schema> = Promise.resolve('');
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<any>>();
    expect(schema.introspect().resolvedType).toBeUndefined();
});

test('hasResolvedType — sets the resolved type schema', () => {
    const strSchema = string();
    const schema = promise().hasResolvedType(strSchema);
    const typeCheck: InferType<typeof schema> = Promise.resolve('hello');
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<string>>();
    expect(schema.introspect().resolvedType).toBe(strSchema);
});

test('hasResolvedType — returns a new instance', () => {
    const schema1 = promise();
    const schema2 = schema1.hasResolvedType(string());
    expectTypeOf<InferType<typeof schema2>>().toMatchTypeOf<Promise<string>>();
    expect(schema1 === (schema2 as any)).toEqual(false);
});

test('hasResolvedType — overwrites a previously set resolved type', () => {
    const numSchema = number();
    const schema = promise().hasResolvedType(string()).hasResolvedType(numSchema);
    const typeCheck: InferType<typeof schema> = Promise.resolve(42);
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<number>>();
    expect(schema.introspect().resolvedType).toBe(numSchema);
});

// ---------------------------------------------------------------------------
// promise(schema) factory shorthand
// ---------------------------------------------------------------------------

test('promise(schema) factory — sets resolved type via constructor arg', () => {
    const strSchema = string();
    const schema = promise(strSchema);
    const typeCheck: InferType<typeof schema> = Promise.resolve('hello');
    expectTypeOf(typeCheck).toMatchTypeOf<Promise<string>>();
    expect(schema.introspect().resolvedType).toBe(strSchema);
});

test('promise(schema) factory — produces different instance from promise()', () => {
    const schema1 = promise();
    const schema2 = promise(string());
    expect(schema1 === (schema2 as any)).toEqual(false);
});

// ---------------------------------------------------------------------------
// Introspect
// ---------------------------------------------------------------------------

test('introspect — type is "promise"', () => {
    const schema = promise();
    expect(schema.introspect().type).toEqual('promise');
});

test('introspect — resolvedType is the schema passed to hasResolvedType', () => {
    const numSchema = number();
    const schema = promise().hasResolvedType(numSchema);
    const { resolvedType } = schema.introspect();
    expect(resolvedType).toBe(numSchema);
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

test('Immutability — each fluent call returns a new instance', () => {
    const s1 = promise();
    const s2 = s1.optional();
    const s3 = s2.required();
    const s4 = s3.hasResolvedType(string());

    expect(s1 !== (s2 as any)).toEqual(true);
    expect(s2 !== (s3 as any)).toEqual(true);
    expect(s3 !== (s4 as any)).toEqual(true);
});
