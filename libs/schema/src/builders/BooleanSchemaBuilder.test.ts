import { expect, expectTypeOf, test } from 'vitest';
import { boolean } from './BooleanSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';

test('Clean', async () => {
    const builder = boolean();
    const schema = builder.introspect();

    expect(schema).toHaveProperty('isRequired', true);
    expect(schema.type).toEqual('boolean');

    const typeCheck: InferType<typeof builder> = 123 as any;
    expectTypeOf(typeCheck).toBeBoolean();

    {
        const { valid, errors, object } = await builder.validate(true);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual(true);
    }

    {
        const { valid, errors, object } = await builder.validate(false as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual(false);
    }

    {
        const { valid, errors, object } = await builder.validate(
            'some string' as any
        );
        expect(valid).toEqual(false);
        expect(errors).toBeDefined();
        expect(object).toBeUndefined();
    }
});

test('Optional', () => {
    const builder = boolean();
    const builderOptional = builder.optional();

    expect((builder as any) !== builderOptional).toEqual(true);

    const schema = builderOptional.introspect();

    expect(schema).toHaveProperty('isRequired', false);

    const typeCheck1: InferType<typeof builder> = true;
    expectTypeOf(typeCheck1).toBeBoolean();

    let typeCheck2: InferType<typeof builderOptional>;
    expectTypeOf(typeCheck2).toMatchTypeOf<boolean | undefined>();
});

test('Required', () => {
    const builder = boolean();
    const builderOptional = builder.optional();
    const builderRequired = builderOptional.required();

    expect((builderRequired as any) !== builderOptional).toEqual(true);

    const schema = builderRequired.introspect();
    expect(schema.type).toEqual('boolean');

    expect(schema).toHaveProperty('isRequired', true);

    const typeCheck1: InferType<typeof builder> = true;
    expectTypeOf(typeCheck1).toBeBoolean();

    const typeCheck2: InferType<typeof builderOptional> = undefined;
    expectTypeOf(typeCheck2).toMatchTypeOf<boolean | undefined>();
});

test('Optional - 2', async () => {
    const schema = boolean().optional();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(true);
        expect(object).toEqual(null);
        expect(errors).toBeUndefined();
    }
});

test('Optional - 3', async () => {
    const schema = boolean().optional().required();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 1', async () => {
    const builder = boolean();

    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const newBuilder = builder.equals(true);
    const newSchema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    expect(newSchema.equalsTo).toEqual(true);

    const typeCheck1: InferType<typeof newBuilder> = true;
    expectTypeOf(typeCheck1).toMatchTypeOf<true>();

    {
        const { valid, object, errors } = await newBuilder.validate(true);
        expect(valid).toEqual(true);
        expect(object).toEqual(true);
        expect(errors).toBeUndefined();
    }
    {
        const { valid, object, errors } = await newBuilder.validate(
            false as any
        );
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
    {
        const { valid, object, errors } = await newBuilder.validate(
            false as any
        );
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 2', async () => {
    expect(() => boolean().equals('213' as any)).toThrow();
});

test('equals - 2', async () => {
    const builder = boolean().equals(false).clearEquals();
    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const typeCheck1: InferType<typeof builder> = 123 as any;
    expectTypeOf(typeCheck1).toBeBoolean();
});

test('equals - 3', () => {
    expect(() => {
        boolean().equals('str' as any);
    }).toThrow();
});

test('hasType - 1', () => {
    const builder = boolean().hasType<string>();
    const typeCheck1: InferType<typeof builder> = '123';
    expectTypeOf(typeCheck1).toBeString();
});

test('hasType - 2', () => {
    const builder = boolean().hasType(new Date());
    const typeCheck1: InferType<typeof builder> = new Date();
    expectTypeOf(typeCheck1).toMatchTypeOf<Date>();
});

test('Clear Has type - 1', () => {
    const schema1 = boolean().hasType<Date>();
    const schema2 = schema1.clearHasType();

    const typeCheck: InferType<typeof schema2> = true;

    expectTypeOf(typeCheck).toBeBoolean();
    expect(schema1 !== (schema2 as any)).toEqual(true);
});

test('euqalsTo with custom error message - 1', async () => {
    const schema = boolean().equals(true, 'Custom error message');
    {
        const { valid, errors } = await schema.validate(true);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }
    {
        const { valid, errors } = await schema.validate(false as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.[0].message).toEqual('Custom error message');
    }

    const schema2 = schema.clearEquals().equals(true);

    {
        const { valid, errors } = await schema2.validate(true);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    {
        const { valid, errors } = await schema2.validate(false as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.[0].message).toEqual('is expected to be equal true');
    }

    const schema3 = schema2
        .clearEquals()
        .equals(true, () => 'Custom error message');

    {
        const { valid, errors } = await schema3.validate(false as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.[0].message).toEqual('Custom error message');
    }

    const schema4 = schema3
        .clearEquals()
        .equals(true, () => Promise.resolve('Custom error message'));

    {
        const { valid, errors } = await schema4.validateAsync(false as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.[0].message).toEqual('Custom error message');
    }
});

// ---------------------------------------------------------------------------
// clearDefault (line 409)
// ---------------------------------------------------------------------------

test('clearDefault - removes the default value', () => {
    const schema = boolean().default(true).clearDefault();
    const introspected = schema.introspect();
    expect(introspected.defaultValue).toBeUndefined();

    // Without a default, required schema should reject undefined
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Full validation path (#buildResult) — lines 180, 191, 301-303
// ---------------------------------------------------------------------------

test('full-path: preValidateSync fails → buildResult done=true with errors (line 180)', () => {
    // Adding a validator forces canSkipPreValidation = false → full path
    const schema = boolean()
        .equals(true)
        .addValidator(() => ({
            valid: false,
            errors: [{ message: 'blocked by validator' }]
        }));
    const result = schema.validate(true as any);
    expect(result.valid).toEqual(false);
    expect(result.errors?.[0].message).toEqual('blocked by validator');
});

test('full-path: nullable + validator → null is valid (line 191)', () => {
    const schema = boolean()
        .nullable()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate(null as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeNull();
});

test('full-path: optional + validator → undefined is valid (line 191)', () => {
    const schema = boolean()
        .optional()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeUndefined();
});

test('full-path: equalsTo fails with custom provider (lines 301-303)', () => {
    // validator forces full path; equalsTo violation returns { provider }
    const schema = boolean()
        .equals(true)
        .addValidator(() => ({ valid: true }));
    const result = schema.validate(false as any);
    expect(result.valid).toEqual(false);
    expect(result.errors?.[0].message).toContain('true');
});

// ---------------------------------------------------------------------------
// coerce()
// ---------------------------------------------------------------------------

test('coerce - converts "true" string to true', () => {
    const schema = boolean().coerce();
    const result = schema.validate('true' as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual(true);

    const typeCheck: InferType<typeof schema> = true;
    expectTypeOf(typeCheck).toBeBoolean();
});

test('coerce - converts "false" string to false', () => {
    const schema = boolean().coerce();
    const result = schema.validate('false' as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual(false);
});

test('coerce - unrecognized string is left unchanged and fails', () => {
    const schema = boolean().coerce();
    const result = schema.validate('yes' as any);
    expect(result.valid).toEqual(false);
});

test('coerce - passes through non-string values unchanged', () => {
    const schema = boolean().coerce();
    const result = schema.validate(true);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual(true);
});

test('coerce - immutability: does not mutate original schema', () => {
    const original = boolean();
    const coerced = original.coerce();
    expect((original as any) !== (coerced as any)).toEqual(true);
    // original should reject strings
    const r1 = original.validate('true' as any);
    expect(r1.valid).toEqual(false);
    // coerced should accept strings
    const r2 = coerced.validate('true' as any);
    expect(r2.valid).toEqual(true);
});
