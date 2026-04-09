import { expect, expectTypeOf, test } from 'vitest';

import { func } from './FunctionSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

test('Func checks', async () => {
    const schema = func();

    const typeCheck: InferType<typeof schema> = () => null;
    expectTypeOf(typeCheck).toMatchTypeOf<(...args: any[]) => any>();

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = () => 10;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = { obj: { nested: 'val' } };
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Optional checks', async () => {
    const schema1 = func();
    const schema2 = schema1.optional();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = () => 1;
    expectTypeOf(typeCheck).toMatchTypeOf<
        (...args: any[]) => any | undefined
    >();

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = () => 342;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Required checks', async () => {
    const schema1 = func().optional().hasType<Date>();
    const schema2 = schema1.required();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectTypeOf(typeCheck).toMatchTypeOf<Date>();

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = () => true;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }
});

test('Has type checks', async () => {
    const schema1 = func();
    const schema2 = schema1.hasType<Date>();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectTypeOf(typeCheck).toMatchTypeOf<Date>();

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = () => 445;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Clear Has type - 1', () => {
    const schema1 = func().hasType<Date>();
    const schema2 = schema1.clearHasType();

    const typeCheck: InferType<typeof schema2> = () => null;

    expectTypeOf(typeCheck).toMatchTypeOf<(...args: any[]) => any>();
    expect(schema1 !== (schema2 as any)).toEqual(true);
});

// ---------------------------------------------------------------------------
// clearDefault (line 246)
// ---------------------------------------------------------------------------

test('clearDefault - removes default value from function schema', () => {
    const noop = () => null;
    const schema = func()
        .default(noop as any)
        .clearDefault();
    expect(schema.introspect().defaultValue).toBeUndefined();
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// addParameter
// ---------------------------------------------------------------------------

test('addParameter - starts with empty parameters list', () => {
    const schema = func();
    const typeCheck: InferType<typeof schema> = () => null;
    expectTypeOf(typeCheck).toMatchTypeOf<() => any>();
    expect(schema.introspect().parameters).toEqual([]);
});

test('addParameter - adds a single parameter schema', () => {
    const strSchema = string();
    const schema = func().addParameter(strSchema);
    const typeCheck: InferType<typeof schema> = (arg0: string) => null;
    expectTypeOf(typeCheck).toMatchTypeOf<(arg0: string) => any>();
    const { parameters } = schema.introspect();
    expect(parameters).toHaveLength(1);
    expect(parameters[0]).toBe(strSchema);
});

test('addParameter - accumulates multiple parameter schemas', () => {
    const strSchema = string();
    const numSchema = number();
    const schema = func().addParameter(strSchema).addParameter(numSchema);
    const typeCheck: InferType<typeof schema> = (arg0: string, arg1: number) =>
        null;
    expectTypeOf(typeCheck).toMatchTypeOf<(arg0: string, arg1: number) => any>();
    const { parameters } = schema.introspect();
    expect(parameters).toHaveLength(2);
    expect(parameters[0]).toBe(strSchema);
    expect(parameters[1]).toBe(numSchema);
});

test('addParameter - returns a new instance', () => {
    const schema1 = func();
    const schema2 = schema1.addParameter(string());
    expectTypeOf<InferType<typeof schema2>>().toMatchTypeOf<
        (arg0: string) => any
    >();
    expect(schema1 === (schema2 as any)).toEqual(false);
});

test('addParameter - preserves existing parameters across chained calls', () => {
    const s1 = string();
    const s2 = number();
    const s3 = string();
    const schema = func().addParameter(s1).addParameter(s2).addParameter(s3);
    const typeCheck: InferType<typeof schema> = (
        arg0: string,
        arg1: number,
        arg2: string
    ) => null;
    expectTypeOf(typeCheck).toMatchTypeOf<
        (arg0: string, arg1: number, arg2: string) => any
    >();
    const { parameters } = schema.introspect();
    expect(parameters).toHaveLength(3);
    expect(parameters[0]).toBe(s1);
    expect(parameters[1]).toBe(s2);
    expect(parameters[2]).toBe(s3);
});

// ---------------------------------------------------------------------------
// hasReturnType
// ---------------------------------------------------------------------------

test('hasReturnType - starts with undefined returnType', () => {
    const schema = func();
    const typeCheck: InferType<typeof schema> = () => null;
    expectTypeOf(typeCheck).toMatchTypeOf<() => any>();
    expect(schema.introspect().returnType).toBeUndefined();
});

test('hasReturnType - sets the return type schema', () => {
    const strSchema = string();
    const schema = func().hasReturnType(strSchema);
    const typeCheck: InferType<typeof schema> = () => 'hello';
    expectTypeOf(typeCheck).toMatchTypeOf<() => string>();
    expect(schema.introspect().returnType).toBe(strSchema);
});

test('hasReturnType - returns a new instance', () => {
    const schema1 = func();
    const schema2 = schema1.hasReturnType(string());
    expectTypeOf<InferType<typeof schema2>>().toMatchTypeOf<() => string>();
    expect(schema1 === (schema2 as any)).toEqual(false);
});

test('hasReturnType - overwrites a previously set return type', () => {
    const numSchema = number();
    const schema = func().hasReturnType(string()).hasReturnType(numSchema);
    const typeCheck: InferType<typeof schema> = () => 42;
    expectTypeOf(typeCheck).toMatchTypeOf<() => number>();
    expect(schema.introspect().returnType).toBe(numSchema);
});

test('addParameter and hasReturnType - combined usage', () => {
    const paramSchema = string();
    const returnSchema = number();
    const schema = func()
        .addParameter(paramSchema)
        .hasReturnType(returnSchema);
    const typeCheck: InferType<typeof schema> = (arg0: string) => 42;
    expectTypeOf(typeCheck).toMatchTypeOf<(arg0: string) => number>();
    const { parameters, returnType } = schema.introspect();
    expect(parameters).toHaveLength(1);
    expect(parameters[0]).toBe(paramSchema);
    expect(returnType).toBe(returnSchema);
});
