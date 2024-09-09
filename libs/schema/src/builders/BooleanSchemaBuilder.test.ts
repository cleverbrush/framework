import { InferType } from './SchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';

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
    expect(() => boolean().equals('213' as any)).toThrowError();
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
