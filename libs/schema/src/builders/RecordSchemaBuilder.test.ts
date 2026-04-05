import { expect, expectTypeOf, test } from 'vitest';

import { number } from './NumberSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { RecordSchemaBuilder, record } from './RecordSchemaBuilder.js';
// Extended factories (include nullable and other built-in extensions)
import {
    record as extRecord,
    string as extString,
    number as extNumber
} from '../extensions/index.js';

// ---------------------------------------------------------------------------
// Type-level tests
// ---------------------------------------------------------------------------

test('Types - basic record infers Record<string, number>', () => {
    const schema = record(string(), number());
    type T = InferType<typeof schema>;

    expectTypeOf<T>().toEqualTypeOf<Record<string, number>>();
});

test('Types - record with string values infers Record<string, string>', () => {
    const schema = record(string(), string());
    type T = InferType<typeof schema>;

    expectTypeOf<T>().toEqualTypeOf<Record<string, string>>();
});

test('Types - optional record includes undefined', () => {
    const schema = record(string(), number()).optional();
    type T = InferType<typeof schema>;

    expectTypeOf<T>().toMatchTypeOf<Record<string, number> | undefined>();
});

test('Types - hasType() overrides inferred type', () => {
    const schema = record(string(), number()).hasType<{ a: number }>();
    type T = InferType<typeof schema>;

    expectTypeOf<T>().toEqualTypeOf<{ a: number }>();
});

test('Types - default() makes schema non-optional', () => {
    const schema = record(string(), number())
        .optional()
        .default(() => ({}));

    expectTypeOf(schema.validate)
        .parameter(0)
        .toMatchTypeOf<Record<string, number>>();
});

test('Types - validate().object matches inferred type', () => {
    const schema = record(string(), number());
    const result = schema.validate({ a: 1 });
    if (result.valid && result.object) {
        expectTypeOf(result.object).toEqualTypeOf<Record<string, number>>();
    }
});

// ---------------------------------------------------------------------------
// Instantiation guards
// ---------------------------------------------------------------------------

test('RecordSchemaBuilder is a SchemaBuilder instance', () => {
    const schema = record(string(), number());
    expect(schema).toBeInstanceOf(RecordSchemaBuilder);
});

// ---------------------------------------------------------------------------
// Valid input tests
// ---------------------------------------------------------------------------

test('Valid - string keys and number values pass', () => {
    const schema = record(string(), number());
    const { valid, errors, object: obj } = schema.validate({ a: 1, b: 2 });
    expect(valid).toBe(true);
    expect(errors).toBeUndefined();
    expect(obj).toEqual({ a: 1, b: 2 });
});

test('Valid - empty record passes', () => {
    const schema = record(string(), number());
    const { valid, object: obj } = schema.validate({} as any);
    expect(valid).toBe(true);
    expect(obj).toEqual({});
});

test('Valid - async mirrors sync for valid input', async () => {
    const schema = record(string(), number());
    const { valid, object: obj } = await schema.validateAsync({ x: 100 });
    expect(valid).toBe(true);
    expect(obj).toEqual({ x: 100 });
});

test('Valid - values pass through preprocessors', () => {
    const schema = record(
        string(),
        string().addPreprocessor(v => v.trim())
    );
    const { valid, object: obj } = schema.validate({ key: '  hello  ' });
    expect(valid).toBe(true);
    expect(obj).toEqual({ key: 'hello' });
});

test('Valid - nested object values', () => {
    const { object: obj } = record(
        string(),
        record(string(), number())
    ).validate({
        group: { a: 1 }
    });
    expect(obj).toEqual({ group: { a: 1 } });
});

// ---------------------------------------------------------------------------
// Invalid input — wrong container type
// ---------------------------------------------------------------------------

test('Invalid - array is not a valid record', () => {
    const schema = record(string(), number());
    const { valid, errors } = schema.validate([1, 2, 3] as any);
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

test('Invalid - primitive is not a valid record', () => {
    const schema = record(string(), number());
    const { valid, errors } = schema.validate('not-an-object' as any);
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

test('Invalid - null on required schema', () => {
    const schema = record(string(), number());
    const { valid } = schema.validate(null as any);
    expect(valid).toBe(false);
});

test('Invalid - undefined on required schema', () => {
    const schema = record(string(), number());
    const { valid } = schema.validate(undefined as any);
    expect(valid).toBe(false);
});

// ---------------------------------------------------------------------------
// Invalid input — bad values
// ---------------------------------------------------------------------------

test('Invalid - wrong value type fails', () => {
    const schema = record(string(), number());
    const { valid, errors } = schema.validate({ a: 'oops' } as any);
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

test('Invalid - value constraint violation fails', () => {
    const schema = record(string(), number().min(0));
    const { valid, errors } = schema.validate({ a: -5 });
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

test('Invalid - key constraint violation fails', () => {
    const schema = record(string().matches(/^[a-z]+$/), number());
    const { valid, errors } = schema.validate({ UPPER: 1 } as any);
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

test('Invalid - async mirrors sync for invalid input', async () => {
    const schema = record(string(), number());
    const { valid, errors } = await schema.validateAsync({ a: 'bad' } as any);
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// doNotStopOnFirstError — collects all errors
// ---------------------------------------------------------------------------

test('doNotStopOnFirstError - collects multiple value errors', () => {
    const schema = record(string(), number().min(0));
    const { valid, errors } = schema.validate(
        { a: -1, b: -2, c: 3 },
        { doNotStopOnFirstError: true }
    );
    expect(valid).toBe(false);
    // There should be at least 2 errors (one per bad key)
    expect(errors!.length).toBeGreaterThanOrEqual(2);
});

test('doNotStopOnFirstError - async collects multiple errors', async () => {
    const schema = record(string(), number().min(0));
    const { valid, errors } = await schema.validateAsync(
        { a: -1, b: -2 },
        { doNotStopOnFirstError: true }
    );
    expect(valid).toBe(false);
    expect(errors!.length).toBeGreaterThanOrEqual(2);
});

// ---------------------------------------------------------------------------
// getNestedErrors
// ---------------------------------------------------------------------------

test('getNestedErrors - returns per-key results on invalid', () => {
    const schema = record(string(), number().min(0));
    const result = schema.validate(
        { a: 1, b: -2, c: -3 },
        { doNotStopOnFirstError: true }
    );
    expect(result.valid).toBe(false);
    const nested = result.getNestedErrors();
    expect(nested['b']?.valid).toBe(false);
    expect(nested['c']?.valid).toBe(false);
});

test('getNestedErrors - empty on valid result', () => {
    const schema = record(string(), number());
    const result = schema.validate({ a: 1 });
    expect(result.valid).toBe(true);
    const nested = result.getNestedErrors();
    expect(Object.keys(nested).length).toBe(0);
});

// ---------------------------------------------------------------------------
// Optional / required behaviour
// ---------------------------------------------------------------------------

test('Optional - null passes', () => {
    const schema = record(string(), number()).optional();
    const { valid, object: obj } = schema.validate(null as any);
    expect(valid).toBe(true);
    expect(obj).toBeNull();
});

test('Optional - undefined passes', () => {
    const schema = record(string(), number()).optional();
    const { valid } = schema.validate(undefined as any);
    expect(valid).toBe(true);
});

test('Required - null fails', () => {
    const schema = record(string(), number());
    const { valid } = schema.validate(null as any);
    expect(valid).toBe(false);
});

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

test('Default - factory default used when value is undefined', () => {
    const schema = record(string(), number())
        .optional()
        .default(() => ({ x: 0 }));
    const { valid, object: obj } = schema.validate(undefined as any);
    expect(valid).toBe(true);
    expect(obj).toEqual({ x: 0 });
});

test('Default - static default used when value is undefined', () => {
    const schema = record(string(), number()).optional().default({});
    const { valid, object: obj } = schema.validate(undefined as any);
    expect(valid).toBe(true);
    expect(obj).toEqual({});
});

// ---------------------------------------------------------------------------
// Introspection
// ---------------------------------------------------------------------------

test('Introspect - type is "record"', () => {
    const schema = record(string(), number());
    expect(schema.introspect().type).toBe('record');
});

test('Introspect - keySchema is the provided string schema', () => {
    const keySchema = string();
    const schema = record(keySchema, number());
    expect(schema.introspect().keySchema).toBe(keySchema);
});

test('Introspect - valueSchema is the provided value schema', () => {
    const valueSchema = number().min(0);
    const schema = record(string(), valueSchema);
    expect(schema.introspect().valueSchema).toBe(valueSchema);
});

test('Introspect - isRequired defaults to true', () => {
    const schema = record(string(), number());
    expect(schema.introspect().isRequired).toBe(true);
});

test('Introspect - isRequired is false after .optional()', () => {
    const schema = record(string(), number()).optional();
    expect(schema.introspect().isRequired).toBe(false);
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

test('Immutability - optional() returns new instance', () => {
    const base = record(string(), number());
    const opt = base.optional();
    expect(base).not.toBe(opt);
    expect(base.introspect().isRequired).toBe(true);
    expect(opt.introspect().isRequired).toBe(false);
});

test('Immutability - default() returns new instance', () => {
    const base = record(string(), number()).optional();
    const withDefault = base.default({});
    expect(base).not.toBe(withDefault);
});

// ---------------------------------------------------------------------------
// Custom validators
// ---------------------------------------------------------------------------

test('Custom validator - addValidator runs on the whole record', () => {
    const schema = record(string(), number()).addValidator(obj => ({
        valid: Object.keys(obj ?? {}).length > 0,
        errors: [{ message: 'record must not be empty' }]
    }));
    expect(schema.validate({} as any).valid).toBe(false);
    expect(schema.validate({ a: 1 }).valid).toBe(true);
});

// ---------------------------------------------------------------------------
// Nullable extension
// ---------------------------------------------------------------------------

test('Nullable - .nullable() accepts null', () => {
    const schema = extRecord(extString(), extNumber()).nullable();
    expect(schema.validate(null as any).valid).toBe(true);
});

test('Nullable - .nullable() accepts a valid record', () => {
    const schema = extRecord(extString(), extNumber()).nullable();
    expect(schema.validate({ a: 1 }).valid).toBe(true);
});

test('Nullable - .nullable() rejects invalid record', () => {
    const schema = extRecord(extString(), extNumber()).nullable();
    expect(schema.validate({ a: 'bad' } as any).valid).toBe(false);
});
