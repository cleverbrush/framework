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

test('isInteger - 4', async () => {
    const builder = number();
    const schema = builder.introspect();

    const builderNew = builder.clearIsInteger();
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

test('custom error message min()', async () => {
    const schema = number().min(10, 'some custom error message');

    {
        const { valid, errors } = await schema.validate(5);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    {
        const { valid, errors } = await schema.validate(10);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema2 = schema.min(10, () => 'some custom error message new');

    {
        const { valid, errors } = await schema2.validate(5);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message new');
    }

    {
        const { valid, errors } = await schema2.validate(10);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema3 = schema2.clearMin();

    {
        const { valid, errors } = await schema3.validate(5);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.min(10);

    {
        const { valid, errors } = await schema4.validate(5);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('expected to be at least 10');
    }

    const schema5 = schema4.clearMin();

    {
        const { valid, errors } = await schema5.validate(5);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema6 = schema5.min(
        10,
        (seenValue, schema) =>
            `expected to be at least ${schema.introspect().min}, got ${seenValue}`
    );

    {
        const { valid, errors } = await schema6.validate(5);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be at least 10, got 5'
        );
    }

    const schema7 = schema6.min(
        20,
        (seenValue, schema) =>
            `expected to see at minimum ${schema.introspect().min}, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema7.validate(10);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to see at minimum 20, but got 10'
        );
    }

    const schema8 = schema7.min(50);

    {
        const { valid, errors } = await schema8.validate(30);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('expected to be at least 50');
    }
});

test('custom error message max()', async () => {
    const schema = number().max(10, 'some custom error message');

    {
        const { valid, errors } = await schema.validate(50);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    {
        const { valid, errors } = await schema.validate(5);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema2 = schema.max(10, () => 'some custom error message new');

    {
        const { valid, errors } = await schema2.validate(50);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message new');
    }

    {
        const { valid, errors } = await schema2.validate(5);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema3 = schema2.clearMax();

    {
        const { valid, errors } = await schema3.validate(50);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.max(10);

    {
        const { valid, errors } = await schema4.validate(50);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be no more than or equal to 10'
        );
    }

    const schema5 = schema4.clearMax();

    {
        const { valid, errors } = await schema5.validate(5);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema6 = schema5.max(
        10,
        (seenValue, schema) =>
            `expected to be no more than ${schema.introspect().max}, got ${seenValue}`
    );

    {
        const { valid, errors } = await schema6.validate(50);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be no more than 10, got 50'
        );
    }

    const schema7 = schema6.max(
        20,
        (seenValue, schema) =>
            `expected to see at maximum ${schema.introspect().max}, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema7.validate(30);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to see at maximum 20, but got 30'
        );
    }

    const schema8 = schema7.max(50);

    {
        const { valid, errors } = await schema8.validate(300);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be no more than or equal to 50'
        );
    }
});

test('custom error message equals()', async () => {
    const schema = number().equals(10, 'some custom error message');

    {
        const { valid, errors } = await schema.validate(50 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    {
        const { valid, errors } = await schema.validate(10);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema2 = schema.equals(10, () => 'some custom error message new');

    {
        const { valid, errors } = await schema2.validate(50 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message new');
    }

    {
        const { valid, errors } = await schema2.validate(10);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema3 = schema2.clearEquals();

    {
        const { valid, errors } = await schema3.validate(50);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.equals(10);

    {
        const { valid, errors } = await schema4.validate(50 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('expected to be equal to 10');
    }

    const schema5 = schema4.clearEquals();

    {
        const { valid, errors } = await schema5.validate(10);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema6 = schema5.equals(
        10,
        (seenValue, schema) =>
            `expected to be equal to value ${schema.introspect().equalsTo}, got ${seenValue}`
    );

    {
        const { valid, errors } = await schema6.validate(50 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be equal to value 10, got 50'
        );
    }

    const schema7 = schema6.equals(
        20,
        (seenValue, schema) =>
            `expected to be ${schema.introspect().equalsTo}, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema7.validate(30 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('expected to be 20, but got 30');
    }

    const schema8 = schema7.equals(50);

    {
        const { valid, errors } = await schema8.validate(300 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('expected to be equal to 50');
    }
});

test('custom error message notNaN()', async () => {
    const schema = number().notNaN();

    {
        const { valid, errors } = await schema.validate(0 / 0);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('is not expected to be NaN');
    }

    const schema2 = schema.notNaN('some custom error message');

    {
        const { valid, errors } = await schema2.validate(0 / 0);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    const schema3 = schema2.canBeNaN();

    {
        const { valid, errors } = await schema3.validate(0 / 0);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.notNaN(
        (seenValue) => `expected to be not NaN, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema4.validate(0 / 0);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be not NaN, but got NaN'
        );
    }

    const schema5 = schema4.notNaN(() =>
        Promise.resolve('some custom error message')
    );

    {
        const { valid, errors } = await schema5.validate(0 / 0);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }
});

test('custom error message isFinite()', async () => {
    const schema = number().isFinite();

    {
        const { valid, errors } = await schema.validate(Infinity);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'is expected to be a finite number'
        );
    }

    const schema2 = schema.isFinite('some custom error message');

    {
        const { valid, errors } = await schema2.validate(Infinity);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    const schema3 = schema2.canBeInfinite();

    {
        const { valid, errors } = await schema3.validate(Infinity);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.isFinite(
        (seenValue) => `expected to be not Infinity, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema4.validate(Infinity);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be not Infinity, but got Infinity'
        );
    }

    const schema5 = schema4.isFinite(() =>
        Promise.resolve('some custom error message')
    );

    {
        const { valid, errors } = await schema5.validate(Infinity);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }
});

test('custom error message isInteger()', async () => {
    const schema = number().isInteger();

    {
        const { valid, errors } = await schema.validate(Math.PI);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('is expected to be an integer');
    }

    const schema2 = schema.isInteger('some custom error message');

    {
        const { valid, errors } = await schema2.validate(Math.E);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }

    const schema3 = schema2.clearIsInteger();

    {
        const { valid, errors } = await schema3.validate(Math.PI);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
    }

    const schema4 = schema3.isInteger(
        (seenValue) => `expected to be an integer, but got ${seenValue}`
    );

    {
        const { valid, errors } = await schema4.validate(1.23);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual(
            'expected to be an integer, but got 1.23'
        );
    }

    const schema5 = schema4.isInteger(() =>
        Promise.resolve('some custom error message')
    );

    {
        const { valid, errors } = await schema5.validate(Math.E);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors?.length).toEqual(1);
        expect(errors?.[0].message).toEqual('some custom error message');
    }
});
