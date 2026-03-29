import { expect, expectTypeOf, test } from 'vitest';
import { date } from './DateSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
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
    const obj: InferType<typeof schema> = null as any;
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
    expect(() => schema1.or({} as any)).toThrow();
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
    expect(() => schema1.removeOption(-1)).toThrow();
    expect(() => schema1.removeOption('123' as any)).toThrow();
    expect(() => schema1.removeOption(123 as any)).toThrow();
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
    expect(() => schema1.reset({} as any)).toThrow();
});

test('getNestedErrors - root errors on failed union', async () => {
    const schema = union(string()).or(number());

    const { valid, getNestedErrors } = await schema.validate(true as any);

    expect(valid).toEqual(false);

    const rootErrors = getNestedErrors();
    expect(rootErrors).toBeDefined();
    expect(rootErrors.errors.length).toEqual(1);
    expect(rootErrors.errors[0]).toEqual(
        "value doesn't match any option in union schema"
    );
});

test('getNestedErrors - root errors on successful union', async () => {
    const schema = union(string()).or(number());

    const { valid, getNestedErrors } = await schema.validate('hello');

    expect(valid).toEqual(true);

    const rootErrors = getNestedErrors();
    expect(rootErrors).toBeDefined();
    expect(rootErrors.errors.length).toEqual(0);
});

test('getNestedErrors - descriptor returns schema', async () => {
    const schema = union(string()).or(number());

    const { getNestedErrors } = await schema.validate(true as any);

    const rootErrors = getNestedErrors();
    expect(rootErrors.descriptor).toBeDefined();
    expect(rootErrors.descriptor.getSchema()).toBe(schema);
    expect(rootErrors.descriptor.parent).toBeUndefined();
});

test('getNestedErrors - primitive branch errors', async () => {
    const schema = union(string()).or(number());

    const { valid, getNestedErrors } = await schema.validate(true as any);

    expect(valid).toEqual(false);

    const branchResults = getNestedErrors();

    const option0 = branchResults[0];
    expect(option0).toBeDefined();
    expect(option0.valid).toEqual(false);
    expect(Array.isArray(option0.errors)).toEqual(true);
    expect((option0.errors?.length ?? 0) > 0).toEqual(true);

    const option1 = branchResults[1];
    expect(option1).toBeDefined();
    expect(option1.valid).toEqual(false);
    expect(Array.isArray(option1.errors)).toEqual(true);
    expect((option1.errors?.length ?? 0) > 0).toEqual(true);
});

test('getNestedErrors - object branch with property navigation', async () => {
    const schema = union(string()).or(
        object({
            from: date(),
            to: date()
        })
    );

    const { valid, getNestedErrors } = await schema.validate({
        from: 'not-a-date',
        to: 'not-a-date'
    } as any);

    expect(valid).toEqual(false);

    const branchResults = getNestedErrors();

    // Option 0 is the string() branch
    expect(branchResults[0].valid).toEqual(false);

    // Option 1 is the object branch — should have getErrorsFor
    const option1 = branchResults[1];
    expect(option1.valid).toEqual(false);
    expect(typeof (option1 as any).getErrorsFor).toEqual('function');

    // Drill into the object branch errors
    const fromErrors = option1.getErrorsFor((t) => t.from);
    expect(fromErrors).toBeDefined();
    expect(fromErrors.errors.length > 0).toEqual(true);

    const toErrors = option1.getErrorsFor((t) => t.to);
    expect(toErrors).toBeDefined();
    expect(toErrors.errors.length > 0).toEqual(true);
});

test('getNestedErrors - successful branch', async () => {
    const schema = union(string()).or(number());

    const { valid, getNestedErrors } = await schema.validate('hello');

    expect(valid).toEqual(true);

    // Option 0 (string) matched
    const option0 = getNestedErrors()[0];
    expect(option0.valid).toEqual(true);
});

test('getNestedErrors - nested object branch', async () => {
    const schema = union(number()).or(
        object({
            address: object({
                city: string(),
                zip: number()
            })
        })
    );

    const { valid, getNestedErrors } = await schema.validate({
        address: {
            city: 123,
            zip: 'not-a-number'
        }
    } as any);

    expect(valid).toEqual(false);

    const option1 = getNestedErrors()[1];
    expect(option1.valid).toEqual(false);
    expect(typeof (option1 as any).getErrorsFor).toEqual('function');
});

test('getNestedErrors - optional union with null', async () => {
    const schema = union(string()).or(number()).optional();

    const { valid, getNestedErrors } = await schema.validate(null as any);

    expect(valid).toEqual(true);

    const rootErrors = getNestedErrors();
    expect(rootErrors.errors.length).toEqual(0);
});

test('getNestedErrors - union with prevalidation error', async () => {
    const schema = union(string())
        .or(number())
        .addValidator(() => ({
            valid: false,
            errors: [{ message: 'custom validator failed' }]
        }));

    const { valid, getNestedErrors } = await schema.validate('hello');

    expect(valid).toEqual(false);

    const rootErrors = getNestedErrors();
    expect(rootErrors).toBeDefined();
    expect(rootErrors.errors.length > 0).toEqual(true);
});

test('nested union with getNestedErrors', async () => {
    const branch11 = object({
        p111: string(),
        p112: number()
    });
    const branch12 = object({
        p121: string(),
        p122: number()
    });
    const branch1 = union(branch11).or(branch12);

    const branch21 = object({
        p211: string(),
        p212: number()
    });
    const branch22 = object({
        p221: string(),
        p222: number()
    });
    const branch2 = union(branch21).or(branch22);

    const schema = union(branch1).or(branch2);

    const { valid, getNestedErrors } = await schema.validate({
        p121: 'hello',
        p112: 'not-a-number'
    } as any);

    expect(valid).toEqual(false);

    const branchResults = getNestedErrors();
    const option0 = branchResults[0];
    expect(option0).toBeDefined();
    expect(option0.valid).toEqual(false);
    expect(typeof (option0 as any).getNestedErrors).toEqual('function');

    const branch1Errors = option0.getNestedErrors();
    const option1_1 = branch1Errors[0];
    expect(option1_1).toBeDefined();
    expect(option1_1.valid).toEqual(false);
    expect(typeof (option1_1 as any).getErrorsFor).toEqual('function');
});
