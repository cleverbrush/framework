import { expect, expectTypeOf, test } from 'vitest';
// Extended factories (include nullable and other built-in extensions)
import {
    number as extNumber,
    record as extRecord,
    string as extString
} from '../extensions/index.js';
import { number } from './NumberSchemaBuilder.js';
import { RecordSchemaBuilder, record } from './RecordSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

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

test('getNestedErrors - returns per-key results on valid record', () => {
    const schema = record(string(), number());
    const result = schema.validate({ a: 1 });
    expect(result.valid).toBe(true);
    const nested = result.getNestedErrors();
    expect(Object.keys(nested).length).toBe(1);
    expect(nested['a']?.valid).toBe(true);
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

// ---------------------------------------------------------------------------
// getErrorsFor — root errors
// ---------------------------------------------------------------------------

test('getErrorsFor() - root: returns empty errors on valid record', () => {
    const schema = record(string(), number());
    const result = schema.validate({ a: 1, b: 2 });
    const root = result.getErrorsFor();
    expect(root.isValid).toBe(true);
    expect(root.errors).toHaveLength(0);
    expect(root.seenValue).toEqual({ a: 1, b: 2 });
});

test('getErrorsFor() - root: returns "object expected" when non-object passed', () => {
    const schema = record(string(), number());
    const result = schema.validate(42 as any);
    expect(result.valid).toBe(false);
    const root = result.getErrorsFor();
    expect(root.isValid).toBe(false);
    expect(root.errors[0]).toBe('object expected');
    expect(root.seenValue).toBe(42);
});

test('getErrorsFor() - root: captures custom validator errors', () => {
    const schema = record(string(), number()).addValidator(obj => ({
        valid: Object.keys(obj ?? {}).length > 0,
        errors: [{ message: 'record must not be empty' }]
    }));
    const result = schema.validate({} as any);
    expect(result.valid).toBe(false);
    const root = result.getErrorsFor();
    expect(root.isValid).toBe(false);
    expect(root.errors[0]).toBe('record must not be empty');
});

test('getErrorsFor() - root: returns empty errors for optional null', () => {
    const schema = record(string(), number()).optional();
    const result = schema.validate(null as any);
    const root = result.getErrorsFor();
    expect(root.isValid).toBe(true);
    expect(root.errors).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// getErrorsFor — per-key value errors
// ---------------------------------------------------------------------------

test('getErrorsFor(key) - reports errors for invalid value', () => {
    const schema = record(string(), number().min(0));
    const result = schema.validate(
        { a: 5, b: -2 },
        { doNotStopOnFirstError: true }
    );
    expect(result.valid).toBe(false);
    const bResult = result.getErrorsFor('b');
    expect(bResult.isValid).toBe(false);
    expect(bResult.errors.length).toBeGreaterThan(0);
    expect(bResult.seenValue).toBe(-2);
});

test('getErrorsFor(key) - returns empty for valid key', () => {
    const schema = record(string(), number().min(0));
    const result = schema.validate(
        { a: 5, b: -2 },
        { doNotStopOnFirstError: true }
    );
    const aResult = result.getErrorsFor('a');
    expect(aResult.isValid).toBe(true);
    expect(aResult.errors).toHaveLength(0);
    expect(aResult.seenValue).toBe(5);
});

test('getErrorsFor(key) - returns empty result for key not reached (stop-on-first-error)', () => {
    const schema = record(string(), number().min(0));
    // With stop-on-first-error, only one key error is collected
    const result = schema.validate({ b: -2, c: -3 });
    expect(result.valid).toBe(false);
    // 'c' may not have been reached; still returns a result object
    const cResult = result.getErrorsFor('c');
    expect(cResult).toBeDefined();
    expect(typeof cResult.isValid).toBe('boolean');
});

test('getErrorsFor(key) - multiple errors collected with doNotStopOnFirstError', () => {
    const schema = record(string(), number().min(0));
    const result = schema.validate(
        { a: -1, b: -2, c: 3 },
        { doNotStopOnFirstError: true }
    );
    expect(result.valid).toBe(false);
    expect(result.getErrorsFor('a').isValid).toBe(false);
    expect(result.getErrorsFor('b').isValid).toBe(false);
    expect(result.getErrorsFor('c').isValid).toBe(true);
});

// ---------------------------------------------------------------------------
// getErrorsFor — per-key descriptor
// ---------------------------------------------------------------------------

test('getErrorsFor(key) - descriptor.key is the key string', () => {
    const schema = record(string(), number().min(0));
    const result = schema.validate({ b: -2 });
    const bResult = result.getErrorsFor('b');
    expect(bResult.descriptor.key).toBe('b');
});

test('getErrorsFor(key) - descriptor.getSchema() returns the value schema', () => {
    const valueSchema = number().min(0);
    const schema = record(string(), valueSchema);
    const result = schema.validate({ b: -2 });
    const bResult = result.getErrorsFor('b');
    // getSchema() should return the same schema instance
    expect(bResult.descriptor.getSchema()).toBe(valueSchema);
});

test('getErrorsFor(key) - descriptor.getValue() retrieves the value', () => {
    const schema = record(string(), number());
    const obj = { x: 42 };
    const result = schema.validate(obj);
    const xResult = result.getErrorsFor('x');
    const got = xResult.descriptor.getValue(obj as any);
    expect(got.success).toBe(true);
    expect(got.value).toBe(42);
});

test('getErrorsFor(key) - descriptor.getValue() returns success:false for missing key', () => {
    const schema = record(string(), number());
    const obj = { x: 42 };
    const result = schema.validate(obj);
    const zResult = result.getErrorsFor('z');
    const got = zResult.descriptor.getValue(obj as any);
    expect(got.success).toBe(false);
});

test('getErrorsFor(key) - descriptor.setValue() sets the value on the record', () => {
    const schema = record(string(), number());
    const obj: Record<string, number> = { x: 42 };
    const result = schema.validate(obj);
    const xResult = result.getErrorsFor('x');
    const ok = xResult.descriptor.setValue(obj as any, 99);
    expect(ok).toBe(true);
    expect(obj.x).toBe(99);
});

test('getErrorsFor(key) - descriptor.setValue() returns false for non-object', () => {
    const schema = record(string(), number());
    const result = schema.validate({ x: 1 });
    const xResult = result.getErrorsFor('x');
    const ok = xResult.descriptor.setValue(null as any, 99);
    expect(ok).toBe(false);
});

// ---------------------------------------------------------------------------
// getErrorsFor — key constraint errors
// ---------------------------------------------------------------------------

test('getErrorsFor(key) - reports errors for invalid key', () => {
    const schema = record(string().matches(/^[a-z]+$/), number());
    // '1bad' fails the key schema
    const result = schema.validate({ '1bad': 5 });
    expect(result.valid).toBe(false);
    const keyResult = result.getErrorsFor('1bad');
    expect(keyResult.isValid).toBe(false);
    expect(keyResult.errors.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// getErrorsFor — async
// ---------------------------------------------------------------------------

test('getErrorsFor(key) - works with validateAsync', async () => {
    const schema = record(string(), number().min(0));
    const result = await schema.validateAsync(
        { a: 5, b: -3 },
        { doNotStopOnFirstError: true }
    );
    expect(result.valid).toBe(false);
    const bResult = result.getErrorsFor('b');
    expect(bResult.isValid).toBe(false);
    expect(bResult.errors.length).toBeGreaterThan(0);
    expect(bResult.seenValue).toBe(-3);
    expect(bResult.descriptor.key).toBe('b');
});

test('getErrorsFor() - root errors returned by validateAsync', async () => {
    const schema = record(string(), number());
    const result = await schema.validateAsync('not-an-object' as any);
    expect(result.valid).toBe(false);
    const root = result.getErrorsFor();
    expect(root.isValid).toBe(false);
    expect(root.errors[0]).toBe('object expected');
});

// ---------------------------------------------------------------------------
// hasType / clearHasType
// ---------------------------------------------------------------------------

test('hasType - returns RecordSchemaBuilder, validation still works', () => {
    const schema = record(string(), number()).hasType<Record<string, number>>();
    expect(schema).toBeInstanceOf(RecordSchemaBuilder);
    expect(schema.validate({ a: 1 }).valid).toBe(true);
});

test('clearHasType - returns RecordSchemaBuilder', () => {
    const schema = record(string(), number())
        .hasType<Record<string, number>>()
        .clearHasType();
    expect(schema).toBeInstanceOf(RecordSchemaBuilder);
    expect(schema.validate({ a: 1 }).valid).toBe(true);
});

// ---------------------------------------------------------------------------
// Async validation — full coverage of _validateAsync
// ---------------------------------------------------------------------------

test('validateAsync - valid record', async () => {
    const schema = record(string(), number());
    const { valid, object: res } = await schema.validateAsync({ a: 1, b: 2 });
    expect(valid).toBe(true);
    expect(res).toEqual({ a: 1, b: 2 });
});

test('validateAsync - invalid value (not an object)', async () => {
    const schema = record(string(), number());
    const { valid } = await schema.validateAsync(42 as any);
    expect(valid).toBe(false);
});

test('validateAsync - invalid key fails validation', async () => {
    const schema = record(string().matches(/^[a-z]+$/), number());
    const { valid } = await schema.validateAsync({ '1BAD': 5 });
    expect(valid).toBe(false);
});

test('validateAsync - invalid value fails validation', async () => {
    const schema = record(string(), number().min(0));
    const { valid } = await schema.validateAsync({ a: -1 });
    expect(valid).toBe(false);
});

test('validateAsync - optional record with undefined', async () => {
    const schema = record(string(), number()).optional();
    const { valid, object: res } = await schema.validateAsync(undefined as any);
    expect(valid).toBe(true);
    expect(res).toBeUndefined();
});

test('validateAsync - doNotStopOnFirstError collects all key errors', async () => {
    const schema = record(string(), number().min(0));
    const { valid, getNestedErrors } = await schema.validateAsync(
        { a: -1, b: -2, c: 3 },
        { doNotStopOnFirstError: true }
    );
    expect(valid).toBe(false);
    const nested = getNestedErrors();
    expect(nested.a.valid).toBe(false);
    expect(nested.b.valid).toBe(false);
    expect(nested.c.valid).toBe(true);
});

test('validateAsync - invalid key with doNotStopOnFirstError', async () => {
    const schema = record(string().matches(/^[a-z]+$/), number());
    const { valid } = await schema.validateAsync(
        { '1bad': 1, '2bad': 2 },
        { doNotStopOnFirstError: true }
    );
    expect(valid).toBe(false);
});

test('validateAsync - async validator triggers full path', async () => {
    const schema = record(string(), number()).addValidator(async () => ({
        valid: false,
        errors: [{ message: 'async validator failed' }]
    }));
    const { valid } = await schema.validateAsync({ a: 1 });
    expect(valid).toBe(false);
});
