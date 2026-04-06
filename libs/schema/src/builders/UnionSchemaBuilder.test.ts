import { expect, expectTypeOf, test } from 'vitest';
import { boolean } from './BooleanSchemaBuilder.js';
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
    }
});

test('validator not interfering - 1', async () => {
    const schema = union(
        object({
            first: number().min(100)
        }).addPreprocessor(obj => {
            if (typeof obj?.first === 'number') {
                obj.first += 10;
                (obj as any).newProp = 100;
            }
            return obj;
        })
    ).or(
        object({
            first: number().min(20)
        }).addPreprocessor(obj => {
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

    const { valid, getNestedErrors } = await schema.validate(
        {
            from: 'not-a-date',
            to: 'not-a-date'
        } as any,
        { doNotStopOnFirstError: true }
    );

    expect(valid).toEqual(false);

    const branchResults = getNestedErrors();

    // Option 0 is the string() branch
    expect(branchResults[0].valid).toEqual(false);

    // Option 1 is the object branch — should have getErrorsFor
    const option1 = branchResults[1];
    expect(option1.valid).toEqual(false);
    expect(typeof (option1 as any).getErrorsFor).toEqual('function');

    // Drill into the object branch errors
    const fromErrors = option1.getErrorsFor(t => t.from);
    expect(fromErrors).toBeDefined();
    expect(fromErrors.errors.length > 0).toEqual(true);

    const toErrors = option1.getErrorsFor(t => t.to);
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

// ---------------------------------------------------------------------------
// hasType / clearHasType
// ---------------------------------------------------------------------------

test('hasType - returns a UnionSchemaBuilder with correct validation', () => {
    const schema = union(string()).or(number()).hasType<string | number>();
    const { valid } = schema.validate('hello' as any);
    expect(valid).toEqual(true);
});

test('clearHasType - returns a UnionSchemaBuilder', () => {
    const schema = union(string())
        .or(number())
        .hasType<string | number>()
        .clearHasType();
    expect(schema.validate(42 as any).valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// Async fast path
// ---------------------------------------------------------------------------

test('validateAsync - valid value (non-discriminated)', async () => {
    const schema = union(string()).or(number());
    const { valid, object: res } = await schema.validateAsync('hi' as any);
    expect(valid).toEqual(true);
    expect(res).toBe('hi');
});

test('validateAsync - invalid value (non-discriminated)', async () => {
    const schema = union(string()).or(number());
    const { valid } = await schema.validateAsync(true as any);
    expect(valid).toEqual(false);
});

test('validateAsync - optional union returns valid for undefined', async () => {
    const schema = union(string()).or(number()).optional();
    const { valid, object: res } = await schema.validateAsync(undefined as any);
    expect(valid).toEqual(true);
    expect(res).toBeUndefined();
});

test('validateAsync - optional union returns valid for null', async () => {
    const schema = union(string()).or(number()).optional();
    const { valid, object: res } = await schema.validateAsync(null as any);
    expect(valid).toEqual(true);
    expect(res).toBeNull();
});

test('validateAsync - required union rejects undefined', async () => {
    const schema = union(string()).or(number());
    const { valid } = await schema.validateAsync(undefined as any);
    expect(valid).toEqual(false);
});

test('validateAsync - discriminated union valid', async () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    const { valid, object: res } = await schema.validateAsync({
        type: 'cat',
        name: 'Mochi'
    } as any);
    expect(valid).toEqual(true);
    expect((res as any).name).toBe('Mochi');
});

test('validateAsync - discriminated union no match', async () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    const { valid } = await schema.validateAsync({ type: 'fish' } as any);
    expect(valid).toEqual(false);
});

test('validateAsync - prevalidation error (validator on union fails)', async () => {
    const schema = union(string())
        .or(number())
        .addValidator(() => ({
            valid: false,
            errors: [{ message: 'union rejected' }]
        }));
    const { valid } = await schema.validateAsync('anything' as any);
    expect(valid).toEqual(false);
});

test('validate full path - prevalidation error via doNotStopOnFirstError', async () => {
    const schema = union(string())
        .or(number())
        .addValidator(() => ({
            valid: false,
            errors: [{ message: 'always fails' }]
        }));
    const { valid, getNestedErrors } = schema.validate('val' as any, {
        doNotStopOnFirstError: true
    });
    expect(valid).toEqual(false);
    const nested = getNestedErrors();
    expect(nested).toBeDefined();
});

// ---------------------------------------------------------------------------
// clearDefault (line 928)
// ---------------------------------------------------------------------------

test('clearDefault - removes the default value', () => {
    const schema = union(string())
        .or(number())
        .default('hello' as any)
        .clearDefault();
    expect(schema.introspect().defaultValue).toBeUndefined();
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Discriminator detection failure cases (lines 242-272)
// ---------------------------------------------------------------------------

test('discriminator: missing key in one branch → falls back to linear scan (line 242)', () => {
    // First branch has "type", second branch does NOT → isDiscriminator=false
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ name: string() }) // missing "type"
    );
    // Still works via linear scan
    const { valid, object: res } = schema.validate({
        type: 'cat',
        name: 'Mochi'
    } as any);
    expect(valid).toEqual(true);
    expect((res as any).name).toBe('Mochi');
});

test('discriminator: optional prop (not required) → falls back to linear scan (line 251)', () => {
    const schema = union(
        object({ type: string('cat').optional(), name: string() })
    ).or(object({ type: string('dog').optional(), breed: string() }));
    const { valid } = schema.validate({ type: 'cat', name: 'Mochi' } as any);
    expect(valid).toEqual(true);
});

test('discriminator: no equalsTo on discriminator prop → falls back (line 257)', () => {
    // type property without equalsTo => equalsTo is undefined
    const schema = union(object({ type: string(), name: string() })).or(
        object({ type: string(), breed: string() })
    );
    const { valid } = schema.validate({ type: 'cat', name: 'Mochi' } as any);
    expect(valid).toEqual(true);
});

test('discriminator: equalsTo is boolean (not string/number) → falls back (line 265)', () => {
    // Using a boolean schema with equalsTo: the discriminator value is bool, not string/number
    const schema = union(
        object({ flag: boolean().equals(true), name: string() })
    ).or(object({ flag: boolean().equals(false), value: number() }));
    const { valid } = schema.validate({ flag: true, name: 'x' } as any);
    expect(valid).toEqual(true);
});

test('discriminator: duplicate discriminator values → falls back (line 271)', () => {
    // Both branches have type: string().equals('cat') → duplicate value
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('cat'), breed: string() })
    );
    const { valid } = schema.validate({ type: 'cat', name: 'Mochi' } as any);
    expect(valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// isNullRequiredViolation override (line 304) — full path with null
// ---------------------------------------------------------------------------

test('required union full-path: null passes isNullRequiredViolation=false (line 304)', () => {
    // Adding a validator forces the full path through preValidateSync
    const schema = union(string())
        .or(number())
        .addValidator(() => ({ valid: true }));
    // null is passed to a required union — preValidateSync reads isNullRequiredViolation
    // The override returns false so null is NOT treated as a "required" error here
    const { valid } = schema.validate(null as any);
    // null doesn't match string or number → invalid via option checking
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Sync fast-path: optional undefined (line 524-525)
// ---------------------------------------------------------------------------

test('sync fast-path: optional union with undefined returns valid (line 524-525)', () => {
    const schema = union(string()).or(number()).optional();
    const { valid, object: res } = schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(res).toBeUndefined();
});

test('sync fast-path: required union with undefined returns invalid (line 533)', () => {
    const schema = union(string()).or(number());
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Sync fast-path: discriminated union with valid discriminator (lines 565-586)
// ---------------------------------------------------------------------------

test('sync fast-path: discriminated union valid match (line 565-575)', () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    const { valid, object: res } = schema.validate({
        type: 'cat',
        name: 'Mochi'
    } as any);
    expect(valid).toEqual(true);
    expect((res as any).name).toBe('Mochi');
});

test('sync fast-path: discriminated union — discriminator value not in map (line 588)', () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    const { valid } = schema.validate({ type: 'fish', name: 'Nemo' } as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Full validation path: hybrid error array seenValue / errors accessors
// ---------------------------------------------------------------------------

test('full-path: getNestedErrors seenValue and errors properties (lines 372-373)', () => {
    const schema = union(string())
        .or(number())
        .addValidator(() => ({ valid: true }));
    const { getNestedErrors } = schema.validate('hello' as any);
    const nested = getNestedErrors();
    // Accessing seenValue calls () => object (line 372)
    const sv = (nested as any).seenValue;
    expect(sv).toBe('hello');
    // Accessing errors calls () => rootErrors (line 373)
    const errs = (nested as any).errors;
    expect(Array.isArray(errs)).toBe(true);
});

test('full-path: selfDescriptor setValue/getValue called via descriptor accessor (lines 357-358)', () => {
    const schema = union(string())
        .or(number())
        .addValidator(() => ({ valid: true }));
    const { getNestedErrors } = schema.validate('test' as any);
    const nested = getNestedErrors();
    const desc = (nested as any).descriptor;
    if (desc) {
        const setResult = desc.setValue({}, 'something', {});
        expect(setResult).toBe(false); // setValue: () => false
        const getResult = desc.getValue('something');
        expect(getResult).toEqual({ success: true, value: 'something' }); // getValue returns {success: true, value: obj}
    }
});

// ---------------------------------------------------------------------------
// Full-path discriminated union (lines 700-717)
// ---------------------------------------------------------------------------

test('full-path: discriminated union valid match (line 712)', () => {
    const schema = union(object({ type: string('cat'), name: string() }))
        .or(object({ type: string('dog'), breed: string() }))
        .addValidator(() => ({ valid: true }));
    const { valid, object: res } = schema.validate({
        type: 'cat',
        name: 'Mochi'
    } as any);
    expect(valid).toEqual(true);
    expect((res as any).name).toBe('Mochi');
});

// ---------------------------------------------------------------------------
// _validate full-path: discriminated union branch coverage (lines 701-705)
// ---------------------------------------------------------------------------

test('full-path sync: discriminated union with null input — false branch of obj !== null (line 701)', () => {
    const schema = union(object({ type: string('cat'), name: string() }))
        .or(object({ type: string('dog'), breed: string() }))
        .addValidator(() => ({ valid: true })); // force full path via _validate
    const { valid } = schema.validate(null as any);
    expect(valid).toEqual(false);
});

test('full-path sync: discriminated union value not in map — falls through to linear scan (line 705)', () => {
    const schema = union(object({ type: string('cat'), name: string() }))
        .or(object({ type: string('dog'), breed: string() }))
        .addValidator(() => ({ valid: true })); // force full path via _validate
    const { valid } = schema.validate({ type: 'fish', name: 'Nemo' } as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// _validateAsync: discriminated union branch coverage (lines 794, 807)
// ---------------------------------------------------------------------------

test('async: discriminated union with null input — false branch of obj !== null (line 794)', async () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    const { valid } = await schema.validateAsync(null as any);
    expect(valid).toEqual(false);
});

test('async: discriminated union matched schema returns invalid — false branch of optionResult.valid (line 807)', async () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    // type: 'cat' matches the first branch, but name is missing → invalid
    const { valid } = await schema.validateAsync({ type: 'cat' } as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Fast-path _validateFast: discriminated union branches (lines 565, 577-604)
// ---------------------------------------------------------------------------

test('fast-path: discriminated union with null input → falls through to full validation (line 565 false)', () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    // null is not an object OR null !== null → false branch of line 565
    // Required union + null → falls through to #validateFull → invalid
    const { valid } = schema.validate(null as any);
    expect(valid).toEqual(false);
});

test('fast-path: discriminated union matched schema returns invalid (lines 577-582 false branches)', () => {
    const schema = union(object({ type: string('cat'), name: string() })).or(
        object({ type: string('dog'), breed: string() })
    );
    // type: 'cat' matches first schema, but name is missing → optionResult.valid = false
    // This covers the false branches of lines 577 and 580
    const { valid } = schema.validate({ type: 'cat' } as any);
    expect(valid).toEqual(false);
});
