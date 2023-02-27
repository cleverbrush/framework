import { expectType } from 'tsd';
import { InferType } from './SchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';

test('Clean', async () => {
    const builder = date();
    const schema = builder.introspect();

    expect(schema).toHaveProperty('isRequired', true);
    expect(schema.type).toEqual('date');

    const typeCheck: InferType<typeof builder> = new Date();
    expectType<Date>(typeCheck);

    {
        const now = new Date();
        const { valid, errors, object } = await builder.validate(now);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual(now);
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
    const builder = date();
    const builderOptional = builder.optional();

    expect((builder as any) !== builderOptional).toEqual(true);

    const schema = builderOptional.introspect();

    expect(schema).toHaveProperty('isRequired', false);

    const typeCheck1: InferType<typeof builder> = 0 as any;
    expectType<Date>(typeCheck1);

    let typeCheck2: InferType<typeof builderOptional>;
    expectType<Date | undefined>(typeCheck2);
});

test('Required', () => {
    const builder = date();
    const builderOptional = builder.optional();
    const builderRequired = builderOptional.required();

    expect((builderRequired as any) !== builderOptional).toEqual(true);

    const schema = builderRequired.introspect();
    expect(schema.type).toEqual('date');

    expect(schema).toHaveProperty('isRequired', true);

    const typeCheck1: InferType<typeof builder> = new Date();
    expectType<Date>(typeCheck1);

    const typeCheck2: InferType<typeof builderOptional> = new Date();
    expectType<Date | undefined>(typeCheck2);
});

test('Optional - 2', async () => {
    const schema = date().optional();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(true);
        expect(object).toEqual(null);
        expect(errors).toBeUndefined();
    }

    {
        const { valid, object, errors } = await schema.validate(
            undefined as any
        );
        expect(valid).toEqual(true);
        expect(object).toEqual(undefined);
        expect(errors).toBeUndefined();
    }
});

test('Optional - 3', async () => {
    const schema = date().optional().required();

    {
        const { valid, object, errors } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 1', async () => {
    const builder = date();

    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const dd = new Date(2022, 0, 1, 1, 2, 3, 4);

    const newBuilder = builder.equals(dd);
    const newSchema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    expect(newSchema.equalsTo).toEqual(dd);

    const typeCheck1: InferType<typeof newBuilder> = dd;
    expectType<Date>(typeCheck1);

    {
        const { valid, object, errors } = await newBuilder.validate(dd);
        expect(valid).toEqual(true);
        expect(object).toEqual(dd);
        expect(errors).toBeUndefined();
    }
    {
        const { valid, object, errors } = await newBuilder.validate(new Date());
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(errors).toBeDefined();
    }
});

test('equals - 2', async () => {
    const d = new Date(2022, 10, 1, 33, 33, 0, 0);
    const builder = date().equals(d).clearEquals();
    const schema = builder.introspect();

    expect(schema.equalsTo).toBeUndefined();

    const typeCheck1: InferType<typeof builder> = new Date();
    expectType<Date>(typeCheck1);
});

test('equals - 3', () => {
    expect(() => {
        date().equals('str' as any);
    }).toThrow();
});

test('isInFuture - 1', async () => {
    const builder = date();
    const schema = builder.introspect();

    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await builder.validate(d);
        expect(valid).toEqual(true);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await builder.validate(d);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsInFuture).toEqual(false);
});

test('isInFuture - 2', async () => {
    const builder = date();
    const newBuilder = builder.isInFuture();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(false);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsInFuture).toEqual(true);
});

test('isInFuture - 3', async () => {
    const builder = date().isInFuture();
    const newBuilder = builder.clearIsInFuture();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsInFuture).toEqual(false);
});

test('isInPast - 1', async () => {
    const builder = date();
    const schema = builder.introspect();

    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await builder.validate(d);
        expect(valid).toEqual(true);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await builder.validate(d);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsInPast).toEqual(false);
});

test('isInPast - 2', async () => {
    const builder = date();
    const newBuilder = builder.isInPast();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(false);
    }

    expect(schema.ensureIsInPast).toEqual(true);
});

test('isInFuture - 3', async () => {
    const builder = date().isInPast();
    const newBuilder = builder.clearIsInPast();
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);
    {
        const d = new Date(2020, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    {
        const d = new Date(new Date().getFullYear() + 1, 1, 10, 1, 1, 1, 0);
        const { valid } = await newBuilder.validate(d);
        expect(valid).toEqual(true);
    }

    expect(schema.ensureIsInPast).toEqual(false);
});

test('max - 1', async () => {
    const builder = date();
    const schema = builder.introspect();
    expect(schema.max).toBeUndefined();
});

test('max - 2', async () => {
    expect(() => {
        date().max('str' as any);
    }).toThrow();
});

test('max - 3', async () => {
    const mDate = new Date(2023, 0, 1, 0, 0, 0, 0);
    const builder = date();
    const newBuilder = builder.max(mDate);
    const schema = newBuilder.introspect();

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(new Date(2022, 0, 1));
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(new Date(2024, 0, 1));
        expect(valid).toEqual(false);
    }

    expect(schema.max).toEqual(mDate);
});

test('max - 4', async () => {
    const mDate = new Date(2023, 0, 1, 0, 0, 0, 0);
    const builder = date().max(mDate);
    const newBuilder = builder.clearMax();

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(new Date(2020, 0, 1));
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(new Date(2024, 0, 1));
        expect(valid).toEqual(true);
    }

    expect(schema.max).toBeUndefined();
});

test('min - 1', async () => {
    const builder = date();
    const schema = builder.introspect();
    expect(schema.min).toBeUndefined();
});

test('min - 2', async () => {
    expect(() => {
        date().min('str' as any);
    }).toThrow();
});

test('min - 3', async () => {
    const mDate = new Date(2023, 0, 1, 0, 0, 0, 0);
    const builder = date();
    const newBuilder = builder.min(mDate);

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(new Date(2020, 0, 1));
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await newBuilder.validate(new Date(2024, 0, 1));
        expect(valid).toEqual(true);
    }

    expect(schema.min).toEqual(mDate);
});

test('min - 4', async () => {
    const mDate = new Date(2023, 0, 1, 0, 0, 0, 0);
    const builder = date().min(mDate);
    const newBuilder = builder.clearMin();

    expect(builder !== newBuilder).toEqual(true);

    const schema = newBuilder.introspect();

    {
        const { valid } = await newBuilder.validate(new Date(2024, 0, 1));
        expect(valid).toEqual(true);
    }

    {
        const { valid } = await newBuilder.validate(new Date(2021, 0, 1));
        expect(valid).toEqual(true);
    }

    expect(schema.min).toBeUndefined();
});

test('validator - 1', async () => {
    const builder = date();
    const newBuilder = builder.addValidator((date) => {
        return date?.getDate() & 1
            ? { valid: true }
            : {
                  valid: false,
                  errors: [{ message: 'values date must be odd' }]
              };
    });

    expect(builder !== newBuilder).toEqual(true);

    {
        const { valid } = await newBuilder.validate(new Date(2022, 0, 2));
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await newBuilder.validate(new Date(2022, 0, 1));
        expect(valid).toEqual(true);
    }
});

test('preprocessor - 1', async () => {
    const builder = date();
    const newBuilder = builder
        .addPreprocessor((d) =>
            d < new Date(2022, 0, 1) ? new Date(2022, 0, 1) : d
        )
        .min(new Date(2021, 0, 1));

    expect(builder !== newBuilder).toEqual(true);
    {
        const { valid, object } = await newBuilder.validate(
            new Date(2021, 3, 1)
        );
        expect(valid).toEqual(true);
        expect(object).toEqual(new Date(2022, 0, 1));
    }
});

test('hasType - 1', () => {
    const builder = date().hasType<string>();
    const typeCheck1: InferType<typeof builder> = '123';
    expectType<string>(typeCheck1);
});

test('hasType - 2', () => {
    const builder = date().hasType(123);
    const typeCheck1: InferType<typeof builder> = 2233;
    expectType<number>(typeCheck1);
});

test('hasType - 3', () => {
    const builder = date().hasType(123).clearHasType();
    const typeCheck1: InferType<typeof builder> = new Date();
    expectType<Date>(typeCheck1);
});

test('Parse from JSON - 1', async () => {
    const builder1 = date();
    const builder2 = date().acceptJsonString();

    const schema1 = builder1.introspect();
    const schema2 = builder2.introspect();

    expect(schema1.parseFromJson).toEqual(false);
    expect(schema2.parseFromJson).toEqual(true);

    expect(builder1 === builder2).toEqual(false);

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder1.validate(date.toJSON() as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate(date.toJSON() as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(date);
        expect(errors).toBeUndefined();
    }
});

test('Parse from JSON - 2', async () => {
    const builder1 = date().acceptJsonString();
    const builder2 = date().doNotAcceptJsonString();

    const schema1 = builder1.introspect();
    const schema2 = builder2.introspect();

    expect(schema1.parseFromJson).toEqual(true);
    expect(schema2.parseFromJson).toEqual(false);

    expect(builder1 === builder2).toEqual(false);

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate(date.toJSON() as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder1.validate(date.toJSON() as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(date);
        expect(errors).toBeUndefined();
    }
});

test('Parse from JSON - 3', async () => {
    const builder = date().acceptJsonString();

    {
        const {
            valid,
            object: result,
            errors
        } = await builder.validate(null as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await builder.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Parse from UNIX Epoch - 1', async () => {
    const builder1 = date();
    const builder2 = date().acceptEpoch();

    const schema1 = builder1.introspect();
    const schema2 = builder2.introspect();

    expect(schema1.parseFromEpoch).toEqual(false);
    expect(schema2.parseFromEpoch).toEqual(true);

    expect(builder1 === builder2).toEqual(false);

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder1.validate(date.getTime() as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate(date.getTime() as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(date);
        expect(errors).toBeUndefined();
    }
});

test('Parse from UNIX epoch - 2', async () => {
    const builder1 = date().acceptEpoch();
    const builder2 = date().doNotAcceptEpoch();

    const schema1 = builder1.introspect();
    const schema2 = builder2.introspect();

    expect(schema1.parseFromEpoch).toEqual(true);
    expect(schema2.parseFromEpoch).toEqual(false);

    expect(builder1 === builder2).toEqual(false);

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate(date.getTime() as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const date = new Date(2022, 0, 1);
        const {
            valid,
            object: result,
            errors
        } = await builder1.validate(date.getTime() as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(date);
        expect(errors).toBeUndefined();
    }
});
