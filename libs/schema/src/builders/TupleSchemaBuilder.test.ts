import { expect, expectTypeOf, test } from 'vitest';

import { boolean } from './BooleanSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { TupleSchemaBuilder, tuple } from './TupleSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Type-level tests
// ---------------------------------------------------------------------------

test('Types - basic tuple infers correct tuple type', () => {
    const schema = tuple([string(), number(), boolean()]);
    const val: InferType<typeof schema> = ['hello', 42, true];

    expectTypeOf(val).toEqualTypeOf<[string, number, boolean]>();
});

test('Types - validate() parameter matches tuple type', () => {
    const schema = tuple([string(), number(), boolean()]);

    expectTypeOf(schema.validate)
        .parameter(0)
        .toEqualTypeOf<[string, number, boolean]>();
});

test('Types - validate().object matches tuple type', () => {
    const schema = tuple([string(), number(), boolean()]);
    const { object: res } = schema.validate(['hello', 42, true]);
    if (res) {
        expectTypeOf(res).toEqualTypeOf<[string, number, boolean]>();
    }
});

test('Types - optional tuple infers union with undefined', () => {
    const schema = tuple([string(), number()]).optional();
    const val: InferType<typeof schema> = undefined;

    expectTypeOf(val).toMatchTypeOf<[string, number] | undefined>();
});

test('Types - tuple with rest infers variadic tail', () => {
    const schema = tuple([string(), number()]).rest(boolean());
    const val: InferType<typeof schema> = ['hello', 42, true, false];

    expectTypeOf(val).toEqualTypeOf<[string, number, ...boolean[]]>();
});

test('Types - validate() parameter with rest schema', () => {
    const schema = tuple([string()]).rest(number());

    expectTypeOf(schema.validate)
        .parameter(0)
        .toEqualTypeOf<[string, ...number[]]>();
});

test('Types - hasType() overrides inferred type', () => {
    const schema = tuple([string()]).hasType<[string, string]>();
    const val: InferType<typeof schema> = ['a', 'b'];

    expectTypeOf(val).toEqualTypeOf<[string, string]>();
});

test('Types - default() makes schema non-optional', () => {
    const schema = tuple([string(), number()])
        .optional()
        .default(() => ['', 0] as [string, number]);

    // After .default, result is the base type (not | undefined)
    expectTypeOf(schema.validate)
        .parameter(0)
        .toEqualTypeOf<[string, number]>();
});

test('Types - empty tuple has type []', () => {
    const schema = tuple([]);
    const val: InferType<typeof schema> = [];

    expectTypeOf(val).toEqualTypeOf<[]>();
});

// ---------------------------------------------------------------------------
// Instantiation guards
// ---------------------------------------------------------------------------

test('TupleSchemaBuilder is a SchemaBuilder', () => {
    const schema = tuple([string(), number()]);
    expect(schema).toBeInstanceOf(TupleSchemaBuilder);
});

// ---------------------------------------------------------------------------
// Valid input tests
// ---------------------------------------------------------------------------

test('Valid - matching types pass', async () => {
    const schema = tuple([string(), number(), boolean()]);
    const { valid, errors, object: res } = schema.validate(['hello', 42, true]);
    expect(valid).toEqual(true);
    expect(errors).toBeUndefined();
    expect(res).toEqual(['hello', 42, true]);
});

test('Valid - async matches sync for valid input', async () => {
    const schema = tuple([string(), number(), boolean()]);
    const { valid, object: res } = await schema.validateAsync([
        'hello',
        42,
        true
    ]);
    expect(valid).toEqual(true);
    expect(res).toEqual(['hello', 42, true]);
});

test('Valid - single-element tuple', () => {
    const schema = tuple([string()]);
    const { valid, object: res } = schema.validate(['hello']);
    expect(valid).toEqual(true);
    expect(res).toEqual(['hello']);
});

test('Valid - empty tuple', () => {
    const schema = tuple([]);
    const { valid } = schema.validate([] as any);
    expect(valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// Invalid input tests
// ---------------------------------------------------------------------------

test('Invalid - too few elements', () => {
    const schema = tuple([string(), number(), boolean()]);
    const { valid, errors } = schema.validate(['hello', 42] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    expect(errors![0].message).toMatch(/3/);
});

test('Invalid - too many elements without rest', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate(['hello', 42, 'extra'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - wrong type at position 0', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate([123, 42] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - wrong type at position 1', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate(['hello', 'oops'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - not an array', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate('not-an-array' as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - null on required schema', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate(null as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - undefined on required schema', () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Invalid - async mirrors sync for invalid', async () => {
    const schema = tuple([string(), number()]);
    const { valid, errors } = await schema.validateAsync([
        'hello',
        'oops'
    ] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

// ---------------------------------------------------------------------------
// Optional / required behaviour
// ---------------------------------------------------------------------------

test('Optional - null is valid', () => {
    const schema = tuple([string(), number()]).optional();
    const { valid, object: res } = schema.validate(null as any);
    expect(valid).toEqual(true);
    expect(res).toEqual(null);
});

test('Optional - undefined is valid', () => {
    const schema = tuple([string(), number()]).optional();
    const { valid, object: res } = schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(res).toEqual(undefined);
});

test('Optional - valid tuple still validates element types', () => {
    const schema = tuple([string(), number()]).optional();
    const { valid, errors } = schema.validate([123, 'bad'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('Optional → required - immutability', () => {
    const optional = tuple([string()]).optional();
    const required = optional.required();
    expect(optional === (required as any)).toEqual(false);

    const { valid: optValid } = optional.validate(undefined as any);
    expect(optValid).toEqual(true);

    const { valid: reqValid } = required.validate(undefined as any);
    expect(reqValid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Default value
// ---------------------------------------------------------------------------

test('Default - replaces undefined', () => {
    const schema = tuple([string(), number()]).default(() => ['x', 0]);
    const { valid, object: res } = schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(res).toEqual(['x', 0]);
});

test('Default - does not affect explicit value', () => {
    const schema = tuple([string(), number()]).default(() => ['x', 0]);
    const { valid, object: res } = schema.validate(['hello', 42]);
    expect(valid).toEqual(true);
    expect(res).toEqual(['hello', 42]);
});

test('clearDefault - removes default', () => {
    const withDefault = tuple([string()]).default(() => ['x']);
    const cleared = withDefault.clearDefault();
    expect(withDefault === (cleared as any)).toEqual(false);

    const { valid } = cleared.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// rest() behaviour
// ---------------------------------------------------------------------------

test('rest() - extra elements accepted', () => {
    const schema = tuple([string(), number()]).rest(boolean());
    const { valid, object: res } = schema.validate(['hello', 42, true, false]);
    expect(valid).toEqual(true);
    expect(res).toEqual(['hello', 42, true, false]);
});

test('rest() - minimum required elements still enforced', () => {
    const schema = tuple([string(), number()]).rest(boolean());
    const { valid } = schema.validate(['hello'] as any);
    expect(valid).toEqual(false);
});

test('rest() - wrong type in rest section fails', () => {
    const schema = tuple([string(), number()]).rest(boolean());
    const { valid, errors } = schema.validate(['hello', 42, 'notBool'] as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('rest() - zero extra elements valid', () => {
    const schema = tuple([string(), number()]).rest(boolean());
    const { valid } = schema.validate(['hello', 42]);
    expect(valid).toEqual(true);
});

test('clearRest() - removes rest schema, exact length required again', () => {
    const withRest = tuple([string(), number()]).rest(boolean());
    const cleared = withRest.clearRest();
    expect(withRest === (cleared as any)).toEqual(false);

    const { valid: withRestValid } = withRest.validate(['hello', 42, true]);
    expect(withRestValid).toEqual(true);

    const { valid: clearedValid } = cleared.validate([
        'hello',
        42,
        true
    ] as any);
    expect(clearedValid).toEqual(false);
});

// ---------------------------------------------------------------------------
// getNestedErrors()
// ---------------------------------------------------------------------------

test('getNestedErrors - root errors on invalid input (not array)', () => {
    const schema = tuple([string(), number()]);
    const { valid, getNestedErrors } = schema.validate('not-array' as any);

    expect(valid).toEqual(false);

    const root = getNestedErrors();
    expect(root.errors.length).toBeGreaterThan(0);
    expect(root.seenValue).toEqual('not-array');
});

test('getNestedErrors - root errors on valid input empty', () => {
    const schema = tuple([string(), number()]);
    const { valid, getNestedErrors } = schema.validate(['hello', 42]);

    expect(valid).toEqual(true);

    const root = getNestedErrors();
    expect(root.errors.length).toEqual(0);
});

test('getNestedErrors - descriptor references the schema', () => {
    const schema = tuple([string(), number()]);
    const { getNestedErrors } = schema.validate(['hello', 42]);

    const root = getNestedErrors();
    expect(root.descriptor.getSchema()).toBe(schema);
});

test('getNestedErrors - per-position errors with doNotStopOnFirstError', () => {
    const schema = tuple([string(), number(), boolean()]);
    const { valid, getNestedErrors } = schema.validate(
        [123, 'bad', true] as any,
        { doNotStopOnFirstError: true }
    );

    expect(valid).toEqual(false);

    const positions = getNestedErrors();
    expect(positions.length).toEqual(3);
    // position 0: number given for string — invalid
    expect(positions[0]!.valid).toEqual(false);
    // position 1: string given for number — invalid
    expect(positions[1]!.valid).toEqual(false);
    // position 2: boolean — valid
    expect(positions[2]!.valid).toEqual(true);
});

test('getNestedErrors - per-position valid on full match', () => {
    const schema = tuple([string(), number(), boolean()]);
    const { valid, getNestedErrors } = schema.validate(['hello', 42, true], {
        doNotStopOnFirstError: true
    });

    expect(valid).toEqual(true);

    const positions = getNestedErrors();
    expect(positions.length).toEqual(3);
    expect(positions[0]!.valid).toEqual(true);
    expect(positions[1]!.valid).toEqual(true);
    expect(positions[2]!.valid).toEqual(true);
});

test('getNestedErrors - object element exposes getErrorsFor', () => {
    const schema = tuple([
        object({ name: string().required(), age: number().required() })
    ]);

    const { valid, getNestedErrors } = schema.validate(
        [{ name: 'Alice', age: 'bad' as any }] as any,
        { doNotStopOnFirstError: true }
    );

    expect(valid).toEqual(false);

    const positions = getNestedErrors();
    const first = positions[0]!;
    expect(first.valid).toEqual(false);
    expect(typeof first.getErrorsFor).toEqual('function');

    const ageErrors = (first as any).getErrorsFor((t: any) => t.age);
    expect(ageErrors.errors.length).toBeGreaterThan(0);
});

test('getNestedErrors - union element exposes getNestedErrors', () => {
    const schema = tuple([union(string()).or(number())]);

    const { valid, getNestedErrors } = schema.validate([true as any] as any, {
        doNotStopOnFirstError: true
    });

    expect(valid).toEqual(false);

    const positions = getNestedErrors();
    expect(positions[0]!.valid).toEqual(false);
    expect(typeof (positions[0] as any).getNestedErrors).toEqual('function');
});

test('getNestedErrors - rest elements included in positions', () => {
    const schema = tuple([string()]).rest(number());

    const { valid, getNestedErrors } = schema.validate(
        ['hello', 42, 99] as any,
        { doNotStopOnFirstError: true }
    );

    expect(valid).toEqual(true);

    const positions = getNestedErrors();
    expect(positions.length).toEqual(3);
    expect(positions[0]!.valid).toEqual(true);
    expect(positions[1]!.valid).toEqual(true);
    expect(positions[2]!.valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

test('Immutability - rest() returns new instance', () => {
    const schema1 = tuple([string()]);
    const schema2 = schema1.rest(number());
    expect(schema1 === (schema2 as any)).toEqual(false);
});

test('Immutability - optional() returns new instance', () => {
    const schema1 = tuple([string()]);
    const schema2 = schema1.optional();
    expect(schema1 === (schema2 as any)).toEqual(false);
});

// ---------------------------------------------------------------------------
// introspect()
// ---------------------------------------------------------------------------

test('introspect() - exposes elements and restSchema', () => {
    const str = string();
    const num = number();
    const boo = boolean();

    const schema = tuple([str, num]).rest(boo);
    const info = schema.introspect();

    expect(info.elements).toEqual([str, num]);
    expect(info.restSchema).toBe(boo);
    expect(info.type).toEqual('tuple');
});

test('introspect() - restSchema is undefined without rest()', () => {
    const schema = tuple([string()]);
    const info = schema.introspect();
    expect(info.restSchema).toBeUndefined();
});
