import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

test('Simple Union - 1', async () => {
    const schema = union(number().equals(10));

    {
        const { valid, object: result } = await schema.validate(10);
        const obj: InferType<typeof schema> = 10;
        expectTypeOf(obj).toEqualTypeOf<10>();
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }

    {
        const { valid, errors } = await schema.validate(1 as any);
        expect(valid).toEqual(false);
        expect((errors?.length || 0) > 0).toEqual(true);
    }
});

test('Simple Union - 2', async () => {
    const schema1 = union(number().equals(10));
    const schema = schema1.or(number().equals(20));
    let obj: InferType<typeof schema> = null as any;
    expectTypeOf(obj).toEqualTypeOf<10 | 20>();

    expect((schema as any) !== schema1).toEqual(true);

    {
        const { valid, object: result } = await schema.validate(10);
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10 | 20>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }

    {
        const { valid, object: result } = await schema.validate(20);
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10 | 20>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(20);
    }

    {
        const { valid, errors } = await schema.validate(1 as any);
        expect(valid).toEqual(false);
        expect((errors?.length || 0) > 0).toEqual(true);
    }
});

test('Simple Union - 3', async () => {
    const schema = union(number().equals(10))
        .or(number().equals(20))
        .or(
            object({
                first: number().equals(1),
                second: union(number().equals(3)).or(number().equals(2))
            })
        );

    const obj: InferType<typeof schema> = null as any;
    expectTypeOf(obj).toEqualTypeOf<10 | 20 | { first: 1; second: 3 | 2 }>();
    {
        const { valid, object: result } = await schema.validate({
            first: 1,
            second: 2
        });
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<
                10 | 20 | { first: 1; second: 3 | 2 }
            >();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual({
            first: 1,
            second: 2
        });
    }

    {
        const { valid, object: result } = await schema.validate({
            first: 1,
            second: 2
        });
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<
                10 | 20 | { first: 1; second: 3 | 2 }
            >();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual({
            first: 1,
            second: 2
        });
    }

    {
        const { valid, errors } = await schema.validate({
            first: 1,
            second: 4 as any
        });
        expect(valid).toEqual(false);
        expect((errors?.length || 0) > 0).toEqual(true);
        if (Array.isArray(errors)) {
            expect(errors[0].path).toEqual('$[option 0]');
        }
    }
});

test('Simple Union - 4', async () => {
    const schema = object({
        first: number().equals(1),
        second: union(
            object({
                nested: number().equals(10)
            })
        ).or(
            object({
                nested: number().equals(30),
                thirty: number()
            })
        )
    });

    {
        const { valid, errors } = await schema.validate(
            {
                first: 1,
                second: {
                    nested: 30,
                    thirty: 'sdf'
                } as any
            },
            { doNotStopOnFirstError: true }
        );
        expect(valid).toEqual(false);
        expect((errors?.length || 0) > 0).toEqual(true);
        if (Array.isArray(errors)) {
            expect(errors[0].path).toEqual('$.second[option 1].thirty');
        }
    }
});

test('validator not interfering - 1', async () => {
    const schema = union(
        object({
            first: number().min(100)
        }).addPreprocessor((obj) => {
            if (typeof obj?.first === 'number') {
                obj.first += 10;
                (obj as any).newProp = 100;
            }
            return obj;
        })
    ).or(
        object({
            first: number().min(20)
        }).addPreprocessor((obj) => {
            if (typeof obj?.first === 'number') {
                obj.first += 5;
            }
            return obj;
        })
    );

    const obj: InferType<typeof schema> = { first: 44 };
    expectTypeOf(obj).toEqualTypeOf<{ first: number }>();

    {
        const { valid, object: result } = await schema.validate({
            first: 19
        });
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<{ first: number }>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual({
            first: 24
        });
        expect((result as any).newProp).toBeUndefined();
    }
});

test('Required - 1', async () => {
    const schema1 = union(number().equals(10));
    const schema2 = schema1.required();

    expect(schema1 !== (schema2 as any)).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(10);
        const obj: InferType<typeof schema2> = null as any;
        expectTypeOf(obj).toEqualTypeOf<10>();
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }

    {
        const { valid, errors } = await schema2.validate(null as any);
        expect(valid).toEqual(false);
        expect((errors?.length || 0) > 0).toEqual(true);
    }
});

test('Optional - 1', async () => {
    const schema1 = union(number().equals(10));
    const schema2 = schema1.optional();

    expect(schema1 !== (schema2 as any)).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(10);
        const obj: InferType<typeof schema2> = 10;
        expectTypeOf(obj).toEqualTypeOf<10>();
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }

    {
        const { valid, object: result } = await schema2.validate(null as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(null);
    }
});

test('Has Type - 1', async () => {
    const schema1 = union(number().equals(10));
    const schema2 = schema1.hasType(new Date());

    expect(schema1 !== (schema2 as any)).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(10 as any);
        const obj: InferType<typeof schema2> = new Date();
        expectTypeOf(obj).toEqualTypeOf<Date>();
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<Date>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }
});

test('Clear Has Type - 1', async () => {
    const schema1 = union(number().equals(10)).hasType<Date>();
    const schema2 = schema1.clearHasType();

    expect(schema1 !== (schema2 as any)).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(10 as any);
        const obj: InferType<typeof schema2> = 10;
        expectTypeOf(obj).toEqualTypeOf<10>();
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }
});

test('or error - 1', async () => {
    const schema1 = union(number().equals(10)).hasType<Date>();
    expect(() => schema1.or({} as any)).toThrowError();
});

test('Remove Option - 1', async () => {
    const schema1 = union(number().equals(10)).or(number().equals(20));
    const schema2 = schema1.removeOption(1);
    const obj: InferType<typeof schema2> = 10;
    expectTypeOf(obj).toEqualTypeOf<10>();

    expect((schema2 as any) !== schema1).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(10);
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(10);
    }

    {
        const { valid, object: result } = await schema2.validate(20 as any);
        expect(result).not.toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<10>();
        }
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
    }
});

test('Remove First Option - 1', async () => {
    const schema1 = union(number().equals(10)).or(number().equals(20));
    const schema2 = schema1.removeFirstOption();
    const obj: InferType<typeof schema2> = 20;
    expectTypeOf(obj).toEqualTypeOf<20>();

    expect((schema2 as any) !== schema1).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(20);
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<20>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(20);
    }

    {
        const { valid, object: result } = await schema2.validate(10 as any);
        expect(result).not.toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<20>();
        }
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
    }
});

test('Remove Option Error - 1', async () => {
    const schema1 = union(number().equals(10)).or(number().equals(20));
    expect(() => schema1.removeOption(-1)).toThrowError();
    expect(() => schema1.removeOption('123' as any)).toThrowError();
    expect(() => schema1.removeOption(123 as any)).toThrowError();
});

test('Reset - 1', async () => {
    const schema1 = union(number().equals(10)).or(number().equals(20));
    const schema2 = schema1.reset(number().equals(40));
    const obj: InferType<typeof schema2> = 40;
    expectTypeOf(obj).toEqualTypeOf<40>();

    expect((schema2 as any) !== schema1).toEqual(true);

    {
        const { valid, object: result } = await schema2.validate(40);
        expect(result).toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<40>();
        }
        expect(valid).toEqual(true);
        expect(result).toEqual(40);
    }

    {
        const { valid, object: result } = await schema2.validate(10 as any);
        expect(result).not.toBeDefined();
        if (result) {
            expectTypeOf(result).toEqualTypeOf<40>();
        }
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
    }
});

test('Reset Error - 1', async () => {
    const schema1 = union(number().equals(10)).or(number().equals(20));
    expect(() => schema1.reset({} as any)).toThrowError();
});
