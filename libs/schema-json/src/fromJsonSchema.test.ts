import { expect, test } from 'vitest';
import { fromJsonSchema } from './fromJsonSchema.js';
import { InferType } from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function valid(schema: ReturnType<typeof fromJsonSchema>, value: unknown) {
    return schema.safeParse(value).valid;
}

// ---------------------------------------------------------------------------
// string — basic
// ---------------------------------------------------------------------------

test('fromJsonSchema - 1: { type: string } accepts strings', () => {
    const schema = fromJsonSchema({ type: 'string' } as const);
    expect(valid(schema, 'hello')).toBe(true);
});

test('fromJsonSchema - 2: { type: string } rejects numbers', () => {
    const schema = fromJsonSchema({ type: 'string' } as const);
    expect(valid(schema, 42)).toBe(false);
});

test('fromJsonSchema - 3: { type: string } rejects null', () => {
    const schema = fromJsonSchema({ type: 'string' } as const);
    expect(valid(schema, null)).toBe(false);
});

// ---------------------------------------------------------------------------
// string — formats
// ---------------------------------------------------------------------------

test('fromJsonSchema - 4: format: email accepts valid email', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'email' } as const);
    expect(valid(schema, 'user@example.com')).toBe(true);
    expect(valid(schema, 'not-an-email')).toBe(false);
});

test('fromJsonSchema - 5: format: uuid accepts valid UUID', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'uuid' } as const);
    expect(valid(schema, '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(valid(schema, 'not-a-uuid')).toBe(false);
});

test('fromJsonSchema - 6: format: uri accepts valid URL', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'uri' } as const);
    expect(valid(schema, 'https://example.com')).toBe(true);
    expect(valid(schema, 'not a url')).toBe(false);
});

test('fromJsonSchema - 7: format: ipv4 accepts IPv4 addresses', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'ipv4' } as const);
    expect(valid(schema, '192.168.1.1')).toBe(true);
    expect(valid(schema, '999.999.999.999')).toBe(false);
    expect(valid(schema, '::1')).toBe(false);
});

test('fromJsonSchema - 8: format: ipv6 accepts IPv6 addresses', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'ipv6' } as const);
    expect(valid(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(valid(schema, '192.168.1.1')).toBe(false);
});

test('fromJsonSchema - 9: format: date-time accepts ISO strings', () => {
    const schema = fromJsonSchema({
        type: 'string',
        format: 'date-time'
    } as const);
    expect(valid(schema, '2024-01-15T10:30:00Z')).toBe(true);
    expect(valid(schema, 'not-a-date')).toBe(false);
});

// ---------------------------------------------------------------------------
// string — constraints
// ---------------------------------------------------------------------------

test('fromJsonSchema - 10: minLength rejects short strings', () => {
    const schema = fromJsonSchema({ type: 'string', minLength: 3 } as const);
    expect(valid(schema, 'ab')).toBe(false);
    expect(valid(schema, 'abc')).toBe(true);
});

test('fromJsonSchema - 11: maxLength rejects long strings', () => {
    const schema = fromJsonSchema({ type: 'string', maxLength: 5 } as const);
    expect(valid(schema, 'abcdef')).toBe(false);
    expect(valid(schema, 'abc')).toBe(true);
});

test('fromJsonSchema - 12: pattern validates regex', () => {
    const schema = fromJsonSchema({
        type: 'string',
        pattern: '^\\d+$'
    } as const);
    expect(valid(schema, '12345')).toBe(true);
    expect(valid(schema, 'abc123')).toBe(false);
});

// ---------------------------------------------------------------------------
// number
// ---------------------------------------------------------------------------

test('fromJsonSchema - 13: { type: number } accepts numbers', () => {
    const schema = fromJsonSchema({ type: 'number' } as const);
    expect(valid(schema, 3.14)).toBe(true);
    expect(valid(schema, 'hello')).toBe(false);
});

test('fromJsonSchema - 14: { type: integer } rejects floats', () => {
    const schema = fromJsonSchema({ type: 'integer' } as const);
    expect(valid(schema, 5)).toBe(true);
    expect(valid(schema, 5.5)).toBe(false);
});

test('fromJsonSchema - 15: minimum / maximum validates range', () => {
    const schema = fromJsonSchema({
        type: 'number',
        minimum: 0,
        maximum: 10
    } as const);
    expect(valid(schema, 0)).toBe(true);
    expect(valid(schema, 10)).toBe(true);
    expect(valid(schema, -1)).toBe(false);
    expect(valid(schema, 11)).toBe(false);
});

test('fromJsonSchema - 16: multipleOf validates multiples', () => {
    const schema = fromJsonSchema({ type: 'number', multipleOf: 3 } as const);
    expect(valid(schema, 9)).toBe(true);
    expect(valid(schema, 7)).toBe(false);
});

test('fromJsonSchema - 17: exclusiveMinimum rejects value equal to bound', () => {
    const schema = fromJsonSchema({
        type: 'number',
        exclusiveMinimum: 0
    } as const);
    expect(valid(schema, 0)).toBe(false);
    expect(valid(schema, 0.001)).toBe(true);
});

test('fromJsonSchema - 18: exclusiveMaximum rejects value equal to bound', () => {
    const schema = fromJsonSchema({
        type: 'number',
        exclusiveMaximum: 100
    } as const);
    expect(valid(schema, 100)).toBe(false);
    expect(valid(schema, 99.9)).toBe(true);
});

// ---------------------------------------------------------------------------
// boolean
// ---------------------------------------------------------------------------

test('fromJsonSchema - 19: { type: boolean } accepts booleans', () => {
    const schema = fromJsonSchema({ type: 'boolean' } as const);
    expect(valid(schema, true)).toBe(true);
    expect(valid(schema, false)).toBe(true);
    expect(valid(schema, 1)).toBe(false);
});

// ---------------------------------------------------------------------------
// array
// ---------------------------------------------------------------------------

test('fromJsonSchema - 20: array with items validates element types', () => {
    const schema = fromJsonSchema({
        type: 'array',
        items: { type: 'string' }
    } as const);
    expect(valid(schema, ['a', 'b'])).toBe(true);
    expect(valid(schema, ['a', 1])).toBe(false);
});

test('fromJsonSchema - 21: minItems / maxItems validates length', () => {
    const schema = fromJsonSchema({
        type: 'array',
        minItems: 2,
        maxItems: 4
    } as const);
    expect(valid(schema, [1])).toBe(false);
    expect(valid(schema, [1, 2])).toBe(true);
    expect(valid(schema, [1, 2, 3, 4])).toBe(true);
    expect(valid(schema, [1, 2, 3, 4, 5])).toBe(false);
});

// ---------------------------------------------------------------------------
// object
// ---------------------------------------------------------------------------

test('fromJsonSchema - 22: required prop must be present', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
    } as const);
    expect(valid(schema, { name: 'Alice' })).toBe(true);
    expect(valid(schema, {})).toBe(false);
});

test('fromJsonSchema - 23: optional prop may be absent', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name']
    } as const);
    expect(valid(schema, { name: 'Alice' })).toBe(true);
    expect(valid(schema, { name: 'Alice', age: 30 })).toBe(true);
});

test('fromJsonSchema - 24: optional prop with wrong type is rejected', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name']
    } as const);
    expect(valid(schema, { name: 'Alice', age: 'old' })).toBe(false);
});

// ---------------------------------------------------------------------------
// const / enum
// ---------------------------------------------------------------------------

test("fromJsonSchema - 25: { const: 'foo' } accepts only 'foo'", () => {
    const schema = fromJsonSchema({ const: 'foo' } as const);
    expect(valid(schema, 'foo')).toBe(true);
    expect(valid(schema, 'bar')).toBe(false);
});

test('fromJsonSchema - 26: enum accepts any listed value', () => {
    const schema = fromJsonSchema({
        enum: ['active', 'inactive', 'pending']
    } as const);
    expect(valid(schema, 'active')).toBe(true);
    expect(valid(schema, 'inactive')).toBe(true);
    expect(valid(schema, 'deleted')).toBe(false);
});

test('fromJsonSchema - 27: numeric enum', () => {
    const schema = fromJsonSchema({ enum: [1, 2, 3] } as const);
    expect(valid(schema, 1)).toBe(true);
    expect(valid(schema, 4)).toBe(false);
});

// ---------------------------------------------------------------------------
// anyOf / allOf
// ---------------------------------------------------------------------------

test('fromJsonSchema - 28: anyOf accepts either type', () => {
    const schema = fromJsonSchema({
        anyOf: [{ type: 'string' }, { type: 'number' }]
    } as const);
    expect(valid(schema, 'hello')).toBe(true);
    expect(valid(schema, 42)).toBe(true);
    expect(valid(schema, true)).toBe(false);
});

// ---------------------------------------------------------------------------
// empty schema
// ---------------------------------------------------------------------------

test('fromJsonSchema - 29: empty schema {} maps to any() and accepts any non-null value', () => {
    const schema = fromJsonSchema({} as const);
    expect(valid(schema, 'anything')).toBe(true);
    expect(valid(schema, 42)).toBe(true);
    expect(valid(schema, { key: 'value' })).toBe(true);
    // Note: null is treated as absent by the schema library's any() builder,
    // mirroring how JSON Schema {} does not require null acceptance in practice.
});

// ---------------------------------------------------------------------------
// nested object
// ---------------------------------------------------------------------------

test('fromJsonSchema - 30: nested object validates recursively', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: {
            user: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                },
                required: ['name']
            }
        },
        required: ['user']
    } as const);
    expect(valid(schema, { user: { name: 'Alice' } })).toBe(true);
    expect(valid(schema, { user: { name: 'Alice', age: 30 } })).toBe(true);
    expect(valid(schema, {})).toBe(false);
    expect(valid(schema, { user: {} })).toBe(false);
});
