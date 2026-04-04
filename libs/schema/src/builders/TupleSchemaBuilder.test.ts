import { expectType } from 'tsd';

import { tuple } from './TupleSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

test('Types - 1', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = tuple([string(), number(), boolean()]);
    const schema3 = tuple([string(), number()]).optional();
    const schema4 = tuple([string(), number()]).readonly();
    const schema5 = schema4.notReadonly();

    const val1: InferType<typeof schema1> = ['hello', 42];
    const val2: InferType<typeof schema2> = ['hello', 42, true];
    const val3: InferType<typeof schema3> = ['hello', 42];
    const val4: InferType<typeof schema4> = ['hello', 42];
    const val5: InferType<typeof schema5> = ['hello', 42];

    expectType<[string, number]>(val1);
    expectType<[string, number, boolean]>(val2);
    expectType<[string, number] | undefined>(val3);
    expectType<Readonly<[string, number]>>(val4);
    expectType<[string, number]>(val5);

    {
        const { object: res } = await schema1.validate(['hello', 42]);
        if (res) {
            expectType<[string, number]>(res);
        }
    }
    {
        const { object: res } = await schema4.validate(['hello', 42]);
        if (res) {
            expectType<Readonly<[string, number]>>(res);
        }
    }
});

test('Basic - valid', async () => {
    const schema = tuple([string(), number()]);

    const { valid, errors, object: result } = await schema.validate([
        'hello',
        42
    ]);
    expect(valid).toEqual(true);
    expect(errors).toBeUndefined();
    expect(result).toEqual(['hello', 42]);
});

test('Basic - wrong element type', async () => {
    const schema = tuple([string(), number()]);

    const {
        valid,
        errors,
        object: result
    } = await schema.validate(['hello', 'world'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    expect(result).toBeUndefined();
});

test('Basic - wrong length (too short)', async () => {
    const schema = tuple([string(), number()]);

    const {
        valid,
        errors,
        object: result
    } = await schema.validate(['hello'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    if (errors) {
        expect(errors[0].message).toContain('expected tuple of length 2');
    }
    expect(result).toBeUndefined();
});

test('Basic - wrong length (too long)', async () => {
    const schema = tuple([string(), number()]);

    const {
        valid,
        errors,
        object: result
    } = await schema.validate(['hello', 42, 'extra'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    if (errors) {
        expect(errors[0].message).toContain('expected tuple of length 2');
    }
    expect(result).toBeUndefined();
});

test('Not an array', async () => {
    const schema = tuple([string(), number()]);

    {
        const { valid, errors } = await schema.validate('not an array' as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        if (errors) {
            expect(errors[0].message).toContain('tuple expected');
        }
    }

    {
        const { valid, errors } = await schema.validate(42 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const { valid, errors } = await schema.validate({} as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Required - null/undefined rejected', async () => {
    const schema = tuple([string(), number()]);

    {
        const { valid, errors } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const { valid, errors } = await schema.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Optional', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = schema1.optional();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const { valid, errors, object: result } = await schema2.validate([
            'hello',
            42
        ]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(['hello', 42]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate(null as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(null);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate(undefined as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(undefined);
    }
});

test('Optional - required back', async () => {
    const schema1 = tuple([string(), number()]).optional();
    const schema2 = schema1.required();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const { valid, errors } = await schema2.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Empty tuple', async () => {
    const schema = tuple([]);

    {
        const { valid, errors, object: result } = await schema.validate([]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual([]);
    }

    {
        const {
            valid,
            errors
        } = await schema.validate(['extra'] as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Nested schemas', async () => {
    const schema = tuple([
        string(),
        object({
            id: number(),
            name: string()
        }),
        boolean()
    ]);

    {
        const { valid, errors, object: result } = await schema.validate([
            'hello',
            { id: 1, name: 'world' },
            true
        ]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(['hello', { id: 1, name: 'world' }, true]);
    }

    {
        const {
            valid,
            errors
        } = await schema.validate([
            'hello',
            { id: 'not a number', name: 'world' },
            true
        ] as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Readonly - type level only', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = schema1.readonly();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const { valid, errors, object: result } = await schema2.validate([
            'hello',
            42
        ]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(['hello', 42]);
    }

    {
        const { valid, errors } = await schema2.validate(
            'not an array' as any
        );
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Readonly - notReadonly removes modifier', async () => {
    const schema1 = tuple([string(), number()]).readonly();
    const schema2 = schema1.notReadonly();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const val: InferType<typeof schema2> = ['hello', 42];
    expectType<[string, number]>(val);

    {
        const { valid, errors, object: result } = await schema2.validate([
            'hello',
            42
        ]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(['hello', 42]);
    }
});

test('Readonly - introspect', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = schema1.readonly();

    expect(schema1.introspect().isReadonly).toEqual(false);
    expect(schema2.introspect().isReadonly).toEqual(true);
});

test('Immutability', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = schema1.optional();
    const schema3 = schema1.readonly();

    expect(schema1 === (schema2 as any)).toEqual(false);
    expect(schema1 === (schema3 as any)).toEqual(false);
    expect(schema2 === (schema3 as any)).toEqual(false);

    // Original schema is unchanged
    expect(schema1.introspect().isRequired).toEqual(true);
    expect(schema1.introspect().isReadonly).toEqual(false);
});

test('Introspect', async () => {
    const schema = tuple([string(), number()]);
    const introspected = schema.introspect();

    expect(introspected.type).toEqual('tuple');
    expect(introspected.isRequired).toEqual(true);
    expect(introspected.isReadonly).toEqual(false);
    expect(Array.isArray(introspected.items)).toEqual(true);
    expect(introspected.items.length).toEqual(2);
});

test('hasType / clearHasType', async () => {
    const schema1 = tuple([string(), number()]);
    const schema2 = schema1.hasType<[string, number, boolean]>();
    const schema3 = schema2.clearHasType();

    const val2: InferType<typeof schema2> = ['hello', 42, true];
    expectType<[string, number, boolean]>(val2);

    const val3: InferType<typeof schema3> = ['hello', 42];
    expectType<[string, number]>(val3);
});

test('Error path', async () => {
    const schema = tuple([string(), number()]);

    const { valid, errors } = await schema.validate(
        ['hello', 'not a number'] as any,
        { path: '$.myField' }
    );
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    if (errors) {
        expect(errors[0].path).toContain('$.myField[1]');
    }
});

test('doNotStopOnFirstError', async () => {
    const schema = tuple([string(), number(), boolean()]);

    const { valid, errors } = await schema.validate(
        [42, 'hello', 'not a boolean'] as any,
        { doNotStopOnFirstError: true }
    );
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    // Should collect all errors
    expect(errors!.length).toBeGreaterThan(1);
});

test('Readonly + Optional combination', async () => {
    const schema = tuple([string(), number()]).readonly().optional();

    const val: InferType<typeof schema> = ['hello', 42];
    expectType<Readonly<[string, number]> | undefined>(val);

    {
        const { valid, errors, object: result } = await schema.validate([
            'hello',
            42
        ]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(['hello', 42]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema.validate(undefined as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(undefined);
    }
});
