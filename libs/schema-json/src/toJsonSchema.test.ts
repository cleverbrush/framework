import {
    any,
    array,
    boolean,
    date,
    nul,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';
import { expect, test } from 'vitest';
import { toJsonSchema } from './toJsonSchema.js';

// ---------------------------------------------------------------------------
// string
// ---------------------------------------------------------------------------

test('toJsonSchema - 1: string() → { type: string }', () => {
    const result = toJsonSchema(string(), { $schema: false });
    expect(result).toEqual({ type: 'string' });
});

test('toJsonSchema - 2: string().email() → format: email', () => {
    const result = toJsonSchema(string().email(), { $schema: false });
    expect(result).toEqual({ type: 'string', format: 'email' });
});

test('toJsonSchema - 3: string().uuid() → format: uuid', () => {
    const result = toJsonSchema(string().uuid(), { $schema: false });
    expect(result).toEqual({ type: 'string', format: 'uuid' });
});

test('toJsonSchema - 4: string().url() → format: uri', () => {
    const result = toJsonSchema(string().url(), { $schema: false });
    expect(result).toEqual({ type: 'string', format: 'uri' });
});

test('toJsonSchema - 5: string().ip({ version: v4 }) → format: ipv4', () => {
    const result = toJsonSchema(string().ip({ version: 'v4' }), {
        $schema: false
    });
    expect(result).toEqual({ type: 'string', format: 'ipv4' });
});

test('toJsonSchema - 6: string().ip({ version: v6 }) → format: ipv6', () => {
    const result = toJsonSchema(string().ip({ version: 'v6' }), {
        $schema: false
    });
    expect(result).toEqual({ type: 'string', format: 'ipv6' });
});

test('toJsonSchema - 7: string().ip() (no version) → type: string, no format', () => {
    const result = toJsonSchema(string().ip(), { $schema: false });
    expect(result).toEqual({ type: 'string' });
});

test('toJsonSchema - 8: string().minLength(3).maxLength(10)', () => {
    const result = toJsonSchema(string().minLength(3).maxLength(10), {
        $schema: false
    });
    expect(result).toEqual({ type: 'string', minLength: 3, maxLength: 10 });
});

test('toJsonSchema - 9: string().matches(regex) → pattern', () => {
    const result = toJsonSchema(string().matches(/^[a-z]+$/), {
        $schema: false
    });
    expect(result).toEqual({ type: 'string', pattern: '^[a-z]+$' });
});

test("toJsonSchema - 10: string('literal') → const", () => {
    const result = toJsonSchema(string('literal'), { $schema: false });
    expect(result).toEqual({ const: 'literal' });
});

test('toJsonSchema - 11: string().nonempty() → minLength: 1', () => {
    const result = toJsonSchema(string().nonempty(), { $schema: false });
    expect(result).toEqual({ type: 'string', minLength: 1 });
});

test('toJsonSchema - 12: string().startsWith → pattern ^...', () => {
    const result = toJsonSchema(string().startsWith('foo'), { $schema: false });
    expect(result).toEqual({ type: 'string', pattern: '^foo' });
});

// ---------------------------------------------------------------------------
// number
// ---------------------------------------------------------------------------

// number() defaults to isInteger: true in the builder, so it maps to 'integer'.
// Use number().isFloat() to get type: 'number'.
test('toJsonSchema - 13: number() → { type: integer } (isInteger default)', () => {
    const result = toJsonSchema(number(), { $schema: false });
    expect(result).toEqual({ type: 'integer' });
});

test('toJsonSchema - 14: number().isFloat() → { type: number }', () => {
    const result = toJsonSchema(number().isFloat(), { $schema: false });
    expect(result).toEqual({ type: 'number' });
});

test('toJsonSchema - 15: number().isFloat().min(0).max(100)', () => {
    const result = toJsonSchema(number().isFloat().min(0).max(100), {
        $schema: false
    });
    expect(result).toEqual({ type: 'number', minimum: 0, maximum: 100 });
});

test('toJsonSchema - 16: number().isFloat().multipleOf(5)', () => {
    const result = toJsonSchema(number().isFloat().multipleOf(5), {
        $schema: false
    });
    expect(result).toEqual({ type: 'number', multipleOf: 5 });
});

test('toJsonSchema - 17: number().isFloat().positive() → exclusiveMinimum: 0', () => {
    const result = toJsonSchema(number().isFloat().positive(), {
        $schema: false
    });
    expect(result).toEqual({ type: 'number', exclusiveMinimum: 0 });
});

test('toJsonSchema - 18: number().isFloat().negative() → exclusiveMaximum: 0', () => {
    const result = toJsonSchema(number().isFloat().negative(), {
        $schema: false
    });
    expect(result).toEqual({ type: 'number', exclusiveMaximum: 0 });
});

test('toJsonSchema - 19: number(42) → const: 42', () => {
    const result = toJsonSchema(number(42), { $schema: false });
    expect(result).toEqual({ const: 42 });
});

// ---------------------------------------------------------------------------
// boolean / date
// ---------------------------------------------------------------------------

test('toJsonSchema - 20: boolean() → { type: boolean }', () => {
    const result = toJsonSchema(boolean(), { $schema: false });
    expect(result).toEqual({ type: 'boolean' });
});

test('toJsonSchema - 21: date() → { type: string, format: date-time }', () => {
    const result = toJsonSchema(date(), { $schema: false });
    expect(result).toEqual({ type: 'string', format: 'date-time' });
});

// ---------------------------------------------------------------------------
// array
// ---------------------------------------------------------------------------

test('toJsonSchema - 22: array(string()) → items', () => {
    const result = toJsonSchema(array(string()), { $schema: false });
    expect(result).toEqual({ type: 'array', items: { type: 'string' } });
});

test('toJsonSchema - 23: array().minLength(1).maxLength(5)', () => {
    const result = toJsonSchema(array().minLength(1).maxLength(5), {
        $schema: false
    });
    expect(result).toEqual({ type: 'array', minItems: 1, maxItems: 5 });
});

test('toJsonSchema - 24: array(string()).nonempty() → minItems: 1', () => {
    const result = toJsonSchema(array(string()).nonempty(), { $schema: false });
    expect(result).toEqual({
        type: 'array',
        items: { type: 'string' },
        minItems: 1
    });
});

// ---------------------------------------------------------------------------
// object
// ---------------------------------------------------------------------------

test('toJsonSchema - 25: object with required and optional props', () => {
    // number() defaults to isInteger; use isFloat() for a float property
    const schema = object({
        name: string(),
        age: number().isFloat().optional()
    });
    const result = toJsonSchema(schema, { $schema: false });
    expect(result).toEqual({
        type: 'object',
        properties: {
            name: { type: 'string' },
            age: { type: 'number' }
        },
        required: ['name'],
        additionalProperties: false
    });
});

test('toJsonSchema - 26: object with acceptUnknownProps false → additionalProperties: false', () => {
    const schema = object({ name: string() }).notAcceptUnknownProps();
    const result = toJsonSchema(schema, { $schema: false });
    expect(result).toMatchObject({ additionalProperties: false });
});

// ---------------------------------------------------------------------------
// union
// ---------------------------------------------------------------------------

test('toJsonSchema - 27: all-literal union → enum', () => {
    const schema = union(string('a')).or(string('b')).or(string('c'));
    const result = toJsonSchema(schema, { $schema: false });
    expect(result).toEqual({ enum: ['a', 'b', 'c'] });
});

test('toJsonSchema - 28: mixed union → anyOf', () => {
    // number() defaults to isInteger, so its JSON Schema type is 'integer'
    const schema = union(string()).or(number().isFloat());
    const result = toJsonSchema(schema, { $schema: false });
    expect(result).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }]
    });
});

// ---------------------------------------------------------------------------
// any
// ---------------------------------------------------------------------------

test('toJsonSchema - 29: any() → {}', () => {
    const result = toJsonSchema(any(), { $schema: false });
    expect(result).toEqual({});
});

// ---------------------------------------------------------------------------
// $schema header options
// ---------------------------------------------------------------------------

test('toJsonSchema - 30: default adds $schema header (2020-12)', () => {
    const result = toJsonSchema(string());
    expect(result['$schema']).toBe(
        'https://json-schema.org/draft/2020-12/schema'
    );
});

test('toJsonSchema - 31: draft 07 uses correct URI', () => {
    const result = toJsonSchema(string(), { draft: '07' });
    expect(result['$schema']).toBe('http://json-schema.org/draft-07/schema#');
});

test('toJsonSchema - 32: $schema: false omits header', () => {
    const result = toJsonSchema(string(), { $schema: false });
    expect(result).not.toHaveProperty('$schema');
});

// ---------------------------------------------------------------------------
// nested / complex
// ---------------------------------------------------------------------------

test('toJsonSchema - 33: nested object', () => {
    const schema = object({
        user: object({
            name: string().minLength(1),
            role: union(string('admin')).or(string('user'))
        })
    });
    const result = toJsonSchema(schema, { $schema: false });
    expect(result).toEqual({
        type: 'object',
        properties: {
            user: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1 },
                    role: { enum: ['admin', 'user'] }
                },
                required: ['name', 'role'],
                additionalProperties: false
            }
        },
        required: ['user'],
        additionalProperties: false
    });
});

test('toJsonSchema - 34: number().isInteger() stays integer', () => {
    const result = toJsonSchema(number().isInteger(), { $schema: false });
    expect(result).toEqual({ type: 'integer' });
});

test('toJsonSchema - 35: nul() round-trips to { type: null }', () => {
    const result = toJsonSchema(nul(), { $schema: false });
    expect(result).toEqual({ type: 'null' });
});

// ---------------------------------------------------------------------------
// readOnly
// ---------------------------------------------------------------------------

test('toJsonSchema - 36: object().readonly() → readOnly: true', () => {
    const result = toJsonSchema(object({ name: string() }).readonly(), { $schema: false });
    expect(result).toEqual({
        type: 'object',
        readOnly: true,
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false
    });
});

test('toJsonSchema - 37: array(string()).readonly() → readOnly: true', () => {
    const result = toJsonSchema(array(string()).readonly(), { $schema: false });
    expect(result).toEqual({ type: 'array', readOnly: true, items: { type: 'string' } });
});

test('toJsonSchema - 38: string().readonly() → readOnly: true', () => {
    const result = toJsonSchema(string().readonly(), { $schema: false });
    expect(result).toEqual({ type: 'string', readOnly: true });
});

test('toJsonSchema - 39: number() without readonly → no readOnly key', () => {
    const result = toJsonSchema(number(), { $schema: false });
    expect(result).not.toHaveProperty('readOnly');
});
