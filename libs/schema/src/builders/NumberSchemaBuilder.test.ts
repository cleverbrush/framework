import { InferType } from './SchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';

test('Clean', async () => {
    const builder = number();
    const schema = builder.introspect();

    expect(schema).toHaveProperty('isRequired', true);
    expect(schema.type).toEqual('number');

    const typeCheck: InferType<typeof builder> = 0;
    expectTypeOf(typeCheck).toBeNumber();

    {
        const { valid, errors, object } = await builder.validate(12345);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual(12345);
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
    const builder = number();
    const builderOptional = builder.optional();

    expect((builder as any) !== builderOptional).toEqual(true);

    const schema = builderOptional.introspect();

    expect(schema).toHaveProperty('isRequired', false);

    const typeCheck1: InferType<typeof builder> = 0 as any;
    expectTypeOf(typeCheck1).toBeNumber();

    let typeCheck2: InferType<typeof builderOptional>;
    expectTypeOf(typeCheck2).toMatchTypeOf<number | undefined>();
});

test('Required', () => {
    const builder = number();
    const builderOptional = builder.optional();
    const builderRequired = builderOptional.required();

    expect((builderRequired as any) !== builderOptional).toEqual(true);

    const schema = builderRequired.introspect();
    expect(schema.type).toEqual('number');

    expect(schema).toHaveProperty('isRequired', true);

    const typeCheck1: InferType<typeof builder> = 0;
    expectTypeOf(typeCheck1).toBeNumber();

    const typeCheck2: InferType<typeof builderOptional> = 0;
    expectTypeOf(typeCheck2).toMatchTypeOf<number | undefined>();
});

test('Optional - 2', async () => {
    const schema = number().optional();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(true);
        expect(object).toEqual(null);
        expect(errors).toBeUndefined();
    }
});

test('Optional - 3', async () => {
    const schema = number().optional().required();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 1', async () => {
    const builder = number();

    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const newBuilder = builder.equals(10);
    const newSchema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    expect(newSchema.equalsTo).toEqual(10);

    const typeCheck1: InferType<typeof newBuilder> = 10;
    expectTypeOf(typeCheck1).toMatchTypeOf<10>();

    {
        const { valid, object, errors } = await newBuilder.validate(10);
        expect(valid).toEqual(true);
        expect(object).toEqual(10);
        expect(errors).toBeUndefined();
    }
    {
        const { valid, object, errors } = await newBuilder.validate(100 as any);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 2', async () => {
    const builder = number().equals(100).clearEquals();
    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const typeCheck1: InferType<typeof builder> = 10;
    expectTypeOf(typeCheck1).toBeNumber();
});

test('equals - 3', () => {
    expect(() => {
        number().equals('str' as any);
    }).toThrow();
});

test('notNaN - 1', async () => {
    const builder = number();
    const schema = builder.introspect();

    {
        const { valid } = await builder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await builder.validate(0 / 0);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureNotNaN).toEqual(true);
});

test('notNaN - 2', async () => {
    const builder = number();
    const newBuilder = builder.notNaN();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(0 / 0);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureNotNaN).toEqual(true);
});

test('notNaN - 3', async () => {
    const builder = number().canBeNaN();
    const newBuilder = builder.notNaN();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(0 / 0);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureNotNaN).toEqual(true);
});

test('notNaN - 4', async () => {
    const builder = number();
    const newBuilder = builder.canBeNaN();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(0 / 0);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureNotNaN).toEqual(false);
});

test('isFinite - 1', async () => {
    const builder = number();
    const schema = builder.introspect();

    {
        const { valid } = await builder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await builder.validate(20 / 0);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureIsFinite).toEqual(true);
});

test('isFinite - 2', async () => {
    const builder = number().canBeInfinite();
    const newBuilder = builder.canBeInfinite();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(20 / 0);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsFinite).toEqual(false);
});

test('isFinite - 3', async () => {
    const builder = number().canBeInfinite();
    const newBuilder = builder.isFinite();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(20 / 0);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureIsFinite).toEqual(true);
});

test('isFinite - 4', async () => {
    const builder = number();
    const newBuilder = builder.canBeInfinite();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(20);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(20 / 0);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsFinite).toEqual(false);
});

test('max - 1', async () => {
    const builder = number();
    const schema = builder.introspect();
    expect(schema.max).toBeUndefined();
});

test('max - 2', async () => {
    expect(() => {
        number().max('str' as any);
    }).toThrow();
});

test('max - 3', async () => {
    const builder = number();
    const newBuilder = builder.max(100);
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(30);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(300);
        expect(valid).toEqual(false);
    }

    expect(schema.max).toEqual(100);
});

test('max - 4', async () => {
    const builder = number().max(100);
    const newBuilder = builder.clearMax();

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(30);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(300);
        expect(valid).toEqual(true);
    }

    expect(schema.max).toBeUndefined();
});

test('min - 1', async () => {
    const builder = number();
    const schema = builder.introspect();
    expect(schema.min).toBeUndefined();
});

test('min - 2', async () => {
    expect(() => {
        number().min('str' as any);
    }).toThrow();
});

test('min - 3', async () => {
    const builder = number();
    const newBuilder = builder.min(100);

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(30);
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await newBuilder.validate(300);
        expect(valid).toEqual(true);
    }

    expect(schema.min).toEqual(100);
});

test('min - 4', async () => {
    const builder = number().min(100);
    const newBuilder = builder.clearMin();

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(30);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(300);
        expect(valid).toEqual(true);
    }

    expect(schema.min).toBeUndefined();
});

test('validator - 1', async () => {
    const builder = number();
    const newBuilder = builder.addValidator((num) => {
        return num & 1
            ? { valid: true }
            : { valid: false, errors: [{ message: 'value must be odd' }] };
    });

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(300);
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await newBuilder.validate(301);
        expect(valid).toEqual(true);
    }
});

test('validators - 1', async () => {
    const builder = number();
    const newBuilder = builder
        .addValidator((num) => {
            return num & 1
                ? { valid: true }
                : { valid: false, errors: [{ message: 'value must be odd' }] };
        })
        .addValidator((num) => {
            return num % 3 === 0
                ? { valid: true }
                : { valid: false, errors: [{ message: 'error message' }] };
        });

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(23);
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await newBuilder.validate(21);
        expect(valid).toEqual(true);
    }
});

test('preprocessor - 1', async () => {
    const builder = number();
    const newBuilder = builder
        .addPreprocessor((num) => (num < 0 ? -num : num))
        .min(5);

    expect(builder !== newBuilder).toEqual(true);
    {
        const { valid, object } = await newBuilder.validate(-10);
        expect(valid).toEqual(true);
        expect(object).toEqual(10);
    }

    {
        const { valid } = await newBuilder.validate(-1);
        expect(valid).toEqual(false);
    }
});

test('preprocessors - 1', async () => {
    const builder = number()
        .addPreprocessor((num) => (num < 0 ? -num : num))
        .addPreprocessor((num) => num * num)
        .min(5);
    {
        const { valid, object } = await builder.validate(-10);
        expect(valid).toEqual(true);
        expect(object).toEqual(100);
    }

    {
        const { valid } = await builder.validate(-1);
        expect(valid).toEqual(false);
    }
});

test('hasType - 1', () => {
    const builder = number().hasType<string>();
    const typeCheck1: InferType<typeof builder> = '123';
    expectTypeOf(typeCheck1).toBeString();
});

test('hasType - 2', () => {
    const builder = number().hasType(new Date());
    const typeCheck1: InferType<typeof builder> = new Date();
    expectTypeOf(typeCheck1).toMatchTypeOf<Date>();
});

test('Clear Has type - 1', () => {
    const schema1 = number().hasType<Date>();
    const schema2 = schema1.clearHasType();

    const typeCheck: InferType<typeof schema2> = 123;

    expectTypeOf(typeCheck).toBeNumber();
    expect(schema1 !== (schema2 as any)).toEqual(true);
});

test('isInteger - 1', async () => {
    const builder = number();
    const schema = builder.introspect();

    expect(schema.isInteger).toEqual(true);

    {
        const { valid } = await builder.validate(10);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await builder.validate(Math.PI);
        expect(valid).toEqual(false);
    }
});

test('isInteger - 2', async () => {
    const builder = number();
    const schema = builder.introspect();

    const builderNew = builder.isInteger();
    const schemaNew = builderNew.introspect();

    expect(builder !== builderNew).toEqual(true);
    expect(schemaNew.isInteger).toEqual(true);
    expect(schema.isInteger).toEqual(true);

    {
        const { valid } = await builder.validate(10);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await builderNew.validate(Math.PI);
        expect(valid).toEqual(false);
    }
});

test('isInteger - 3', async () => {
    const builder = number();
    const schema = builder.introspect();

    const builderNew = builder.isFloat();
    const schemaNew = builderNew.introspect();

    expect(builder !== builderNew).toEqual(true);
    expect(schemaNew.isInteger).toEqual(false);
    expect(schema.isInteger).toEqual(true);

    {
        const { valid } = await builder.validate(10);
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await builderNew.validate(Math.PI);
        expect(valid).toEqual(true);
    }
});
