import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expect, expectTypeOf, test } from 'vitest';

import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType, MakeOptional } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { tuple } from './TupleSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test('string schema exposes ~standard property', () => {
    const schema = string();
    const std = schema['~standard'];
    expect(std.version).toBe(1);
    expect(std.vendor).toBe('@cleverbrush/schema');
    expect(typeof std.validate).toBe('function');
});

test('number schema exposes ~standard property', () => {
    const std = number()['~standard'];
    expect(std.version).toBe(1);
    expect(std.vendor).toBe('@cleverbrush/schema');
});

test('boolean schema exposes ~standard property', () => {
    const std = boolean()['~standard'];
    expect(std.version).toBe(1);
    expect(std.vendor).toBe('@cleverbrush/schema');
});

test('date schema exposes ~standard property', () => {
    const std = date()['~standard'];
    expect(std.version).toBe(1);
});

test('object schema exposes ~standard property', () => {
    const std = object({ name: string() })['~standard'];
    expect(std.version).toBe(1);
    expect(std.vendor).toBe('@cleverbrush/schema');
});

test('array schema exposes ~standard property', () => {
    const std = array(string())['~standard'];
    expect(std.version).toBe(1);
});

test('tuple schema exposes ~standard property', () => {
    const std = tuple([string(), number()])['~standard'];
    expect(std.version).toBe(1);
});

test('union schema exposes ~standard property', () => {
    const std = union(string()).or(number())['~standard'];
    expect(std.version).toBe(1);
});

test('any schema exposes ~standard property', () => {
    const std = any()['~standard'];
    expect(std.version).toBe(1);
});

// ---------------------------------------------------------------------------
// Caching — repeated access returns same reference
// ---------------------------------------------------------------------------

test('~standard is cached (same reference)', () => {
    const schema = string();
    expect(schema['~standard']).toBe(schema['~standard']);
});

// ---------------------------------------------------------------------------
// Successful validation
// ---------------------------------------------------------------------------

test('validate returns success result for valid string', () => {
    const result = string()['~standard'].validate('hello');
    expect(result).toEqual({ value: 'hello' });
    expect(result).not.toHaveProperty('issues');
});

test('validate returns success result for valid number', () => {
    const result = number()['~standard'].validate(42);
    expect(result).toEqual({ value: 42 });
});

test('validate returns success result for valid object', () => {
    const schema = object({ name: string(), age: number() });
    const result = schema['~standard'].validate({ name: 'Alice', age: 30 });
    expect(result).toEqual({ value: { name: 'Alice', age: 30 } });
});

test('validate returns success for optional schema with undefined', () => {
    const schema = string().optional();
    const result = schema['~standard'].validate(undefined);
    expect(result).toEqual({ value: undefined });
});

// ---------------------------------------------------------------------------
// Failed validation
// ---------------------------------------------------------------------------

test('validate returns failure result for invalid string', () => {
    const result = string()['~standard'].validate(123);
    expect(result).toHaveProperty('issues');
    const issues = (result as StandardSchemaV1.FailureResult).issues;
    expect(issues.length).toBeGreaterThan(0);
    expect(typeof issues[0].message).toBe('string');
});

test('validate returns failure result for required schema with null', () => {
    const result = string()['~standard'].validate(null);
    expect(result).toHaveProperty('issues');
    const issues = (result as StandardSchemaV1.FailureResult).issues;
    expect(issues.length).toBeGreaterThan(0);
});

test('validate returns failure result for required schema with undefined', () => {
    const result = string()['~standard'].validate(undefined);
    expect(result).toHaveProperty('issues');
    const issues = (result as StandardSchemaV1.FailureResult).issues;
    expect(issues.length).toBeGreaterThan(0);
});

test('validate returns failure with multiple issues for invalid object', () => {
    const schema = object({ name: string(), age: number() });
    const result = schema['~standard'].validate({
        name: 123,
        age: 'not a number'
    });
    expect(result).toHaveProperty('issues');
    const issues = (result as StandardSchemaV1.FailureResult).issues;
    expect(issues.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Preprocessors work through ~standard.validate
// ---------------------------------------------------------------------------

test('preprocessors are applied through ~standard.validate', () => {
    const schema = string().addPreprocessor((v: any) => {
        if (typeof v === 'number') return String(v);
        return v;
    });
    const result = schema['~standard'].validate(42);
    expect(result).toEqual({ value: '42' });
});

// ---------------------------------------------------------------------------
// Validators with constraints
// ---------------------------------------------------------------------------

test('string minLength constraint is enforced via ~standard.validate', () => {
    const schema = string().minLength(3);
    const fail = schema['~standard'].validate('ab');
    expect(fail).toHaveProperty('issues');

    const pass = schema['~standard'].validate('abc');
    expect(pass).toEqual({ value: 'abc' });
});

// ---------------------------------------------------------------------------
// Type conformance — assignable to StandardSchemaV1
// ---------------------------------------------------------------------------

test('string() is assignable to StandardSchemaV1', () => {
    const schema = string();
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<string, string>>();
});

test('number() is assignable to StandardSchemaV1', () => {
    const schema = number();
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<number, number>>();
});

test('boolean() is assignable to StandardSchemaV1', () => {
    const schema = boolean();
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<boolean, boolean>>();
});

test('object schema is assignable to StandardSchemaV1', () => {
    const schema = object({ name: string() });
    type Out = InferType<typeof schema>;
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<Out, Out>>();
});

test('optional string is assignable to StandardSchemaV1 with optional output', () => {
    const schema = string().optional();
    type Out = MakeOptional<string | null>;
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<Out, Out>>();
});

test('StandardSchemaV1.InferOutput resolves the output type', () => {
    const schema = string();
    type Output = StandardSchemaV1.InferOutput<typeof schema>;
    expectTypeOf<Output>().toEqualTypeOf<string>();
});

test('StandardSchemaV1.InferInput resolves the input type', () => {
    const schema = number();
    type Input = StandardSchemaV1.InferInput<typeof schema>;
    expectTypeOf<Input>().toEqualTypeOf<number>();
});

test('StandardSchemaV1.InferOutput works with optional schema', () => {
    const schema = string().optional();
    type Output = StandardSchemaV1.InferOutput<typeof schema>;
    expectTypeOf<Output>().toEqualTypeOf<MakeOptional<string>>();
});

// ---------------------------------------------------------------------------
// Error shape — issue messages and mutual exclusivity of value / issues
// ---------------------------------------------------------------------------

test('failure result has no value property', () => {
    const result = string()['~standard'].validate(123);
    expect(result).not.toHaveProperty('value');
    expect(result).toHaveProperty('issues');
});

test('success result has no issues property', () => {
    const result = string()['~standard'].validate('hello');
    expect(result).toHaveProperty('value');
    expect(result).not.toHaveProperty('issues');
});

test('wrong type produces a descriptive message', () => {
    const result = string()['~standard'].validate(
        123
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toMatch(/string/i);
});

test('required field missing produces a descriptive message', () => {
    const result = string()['~standard'].validate(
        undefined
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toMatch(/required/i);
});

test('null value produces a descriptive message', () => {
    const result = string()['~standard'].validate(
        null
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toBeTruthy();
});

test('minLength violation produces a descriptive message', () => {
    const result = string()
        .minLength(5)
        ['~standard'].validate('ab') as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toMatch(/5/);
});

test('number min violation produces a descriptive message', () => {
    const result = number()
        .min(10)
        ['~standard'].validate(3) as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toMatch(/10/);
});

test('custom error message string is propagated through issues', () => {
    const result = string()
        .minLength(3, 'name too short')
        ['~standard'].validate('a') as StandardSchemaV1.FailureResult;
    expect(result.issues[0].message).toBe('name too short');
});

test('each issue has a non-empty string message', () => {
    const result = string()['~standard'].validate(
        false
    ) as StandardSchemaV1.FailureResult;
    for (const issue of result.issues) {
        expect(typeof issue.message).toBe('string');
        expect(issue.message.length).toBeGreaterThan(0);
    }
});
