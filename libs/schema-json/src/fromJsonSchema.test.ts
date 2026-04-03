import type { InferType } from '@cleverbrush/schema';
import { expect, expectTypeOf, test } from 'vitest';
import { fromJsonSchema } from './fromJsonSchema.js';

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
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 'hello')).toBe(true);
});

test('fromJsonSchema - 2: { type: string } rejects numbers', () => {
    const schema = fromJsonSchema({ type: 'string' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 42)).toBe(false);
});

test('fromJsonSchema - 3: { type: string } rejects null', () => {
    const schema = fromJsonSchema({ type: 'string' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, null)).toBe(false);
});

// ---------------------------------------------------------------------------
// string — formats
// ---------------------------------------------------------------------------

test('fromJsonSchema - 4: format: email accepts valid email', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'email' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 'user@example.com')).toBe(true);
    expect(valid(schema, 'not-an-email')).toBe(false);
});

test('fromJsonSchema - 5: format: uuid accepts valid UUID', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'uuid' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(valid(schema, 'not-a-uuid')).toBe(false);
});

test('fromJsonSchema - 6: format: uri accepts valid URL', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'uri' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 'https://example.com')).toBe(true);
    expect(valid(schema, 'not a url')).toBe(false);
});

test('fromJsonSchema - 7: format: ipv4 accepts IPv4 addresses', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'ipv4' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, '192.168.1.1')).toBe(true);
    expect(valid(schema, '999.999.999.999')).toBe(false);
    expect(valid(schema, '::1')).toBe(false);
});

test('fromJsonSchema - 8: format: ipv6 accepts IPv6 addresses', () => {
    const schema = fromJsonSchema({ type: 'string', format: 'ipv6' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(valid(schema, '192.168.1.1')).toBe(false);
});

test('fromJsonSchema - 9: format: date-time accepts ISO strings', () => {
    const schema = fromJsonSchema({
        type: 'string',
        format: 'date-time'
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, '2024-01-15T10:30:00Z')).toBe(true);
    expect(valid(schema, 'not-a-date')).toBe(false);
});

// ---------------------------------------------------------------------------
// string — constraints
// ---------------------------------------------------------------------------

test('fromJsonSchema - 10: minLength rejects short strings', () => {
    const schema = fromJsonSchema({ type: 'string', minLength: 3 } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 'ab')).toBe(false);
    expect(valid(schema, 'abc')).toBe(true);
});

test('fromJsonSchema - 11: maxLength rejects long strings', () => {
    const schema = fromJsonSchema({ type: 'string', maxLength: 5 } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, 'abcdef')).toBe(false);
    expect(valid(schema, 'abc')).toBe(true);
});

test('fromJsonSchema - 12: pattern validates regex', () => {
    const schema = fromJsonSchema({
        type: 'string',
        pattern: '^\\d+$'
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string>();
    expect(valid(schema, '12345')).toBe(true);
    expect(valid(schema, 'abc123')).toBe(false);
});

// ---------------------------------------------------------------------------
// number
// ---------------------------------------------------------------------------

test('fromJsonSchema - 13: { type: number } accepts numbers', () => {
    const schema = fromJsonSchema({ type: 'number' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 3.14)).toBe(true);
    expect(valid(schema, 'hello')).toBe(false);
});

test('fromJsonSchema - 14: { type: integer } rejects floats', () => {
    const schema = fromJsonSchema({ type: 'integer' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 5)).toBe(true);
    expect(valid(schema, 5.5)).toBe(false);
});

test('fromJsonSchema - 15: minimum / maximum validates range', () => {
    const schema = fromJsonSchema({
        type: 'number',
        minimum: 0,
        maximum: 10
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 0)).toBe(true);
    expect(valid(schema, 10)).toBe(true);
    expect(valid(schema, -1)).toBe(false);
    expect(valid(schema, 11)).toBe(false);
});

test('fromJsonSchema - 16: multipleOf validates multiples', () => {
    const schema = fromJsonSchema({ type: 'number', multipleOf: 3 } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 9)).toBe(true);
    expect(valid(schema, 7)).toBe(false);
});

test('fromJsonSchema - 17: exclusiveMinimum rejects value equal to bound', () => {
    const schema = fromJsonSchema({
        type: 'number',
        exclusiveMinimum: 0
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 0)).toBe(false);
    expect(valid(schema, 0.001)).toBe(true);
});

test('fromJsonSchema - 18: exclusiveMaximum rejects value equal to bound', () => {
    const schema = fromJsonSchema({
        type: 'number',
        exclusiveMaximum: 100
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<number>();
    expect(valid(schema, 100)).toBe(false);
    expect(valid(schema, 99.9)).toBe(true);
});

// ---------------------------------------------------------------------------
// boolean
// ---------------------------------------------------------------------------

test('fromJsonSchema - 19: { type: boolean } accepts booleans', () => {
    const schema = fromJsonSchema({ type: 'boolean' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<boolean>();
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
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string[]>();
    expect(valid(schema, ['a', 'b'])).toBe(true);
    expect(valid(schema, ['a', 1])).toBe(false);
});

test('fromJsonSchema - 21: minItems / maxItems validates length', () => {
    const schema = fromJsonSchema({
        type: 'array',
        minItems: 2,
        maxItems: 4
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<unknown[]>();
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
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{ name: string }>();
    expect(valid(schema, { name: 'Alice' })).toBe(true);
    expect(valid(schema, {})).toBe(false);
});

test('fromJsonSchema - 23: optional prop may be absent', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name']
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        name: string;
        age?: number;
    }>();
    expect(valid(schema, { name: 'Alice' })).toBe(true);
    expect(valid(schema, { name: 'Alice', age: 30 })).toBe(true);
});

test('fromJsonSchema - 24: optional prop with wrong type is rejected', () => {
    const schema = fromJsonSchema({
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name']
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        name: string;
        age?: number;
    }>();
    expect(valid(schema, { name: 'Alice', age: 'old' })).toBe(false);
});

// ---------------------------------------------------------------------------
// const / enum
// ---------------------------------------------------------------------------

test("fromJsonSchema - 25: { const: 'foo' } accepts only 'foo'", () => {
    const schema = fromJsonSchema({ const: 'foo' } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<'foo'>();
    expect(valid(schema, 'foo')).toBe(true);
    expect(valid(schema, 'bar')).toBe(false);
});

test('fromJsonSchema - 26: enum accepts any listed value', () => {
    const schema = fromJsonSchema({
        enum: ['active', 'inactive', 'pending']
    } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<
        'active' | 'inactive' | 'pending'
    >();
    expect(valid(schema, 'active')).toBe(true);
    expect(valid(schema, 'inactive')).toBe(true);
    expect(valid(schema, 'deleted')).toBe(false);
});

test('fromJsonSchema - 27: numeric enum', () => {
    const schema = fromJsonSchema({ enum: [1, 2, 3] } as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<1 | 2 | 3>();
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
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<string | number>();
    expect(valid(schema, 'hello')).toBe(true);
    expect(valid(schema, 42)).toBe(true);
    expect(valid(schema, true)).toBe(false);
});

// ---------------------------------------------------------------------------
// empty schema
// ---------------------------------------------------------------------------

test('fromJsonSchema - 29: empty schema {} currently maps to any() and accepts any non-null value', () => {
    const schema = fromJsonSchema({} as const);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<unknown>();
    expect(valid(schema, 'anything')).toBe(true);
    expect(valid(schema, 42)).toBe(true);
    expect(valid(schema, { key: 'value' })).toBe(true);
    // Note: this reflects the current schema-library any() behavior, which
    // rejects null; unlike this implementation, JSON Schema {} matches all
    // instances, including null.
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
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        user: { name: string; age?: number };
    }>();
    expect(valid(schema, { user: { name: 'Alice' } })).toBe(true);
    expect(valid(schema, { user: { name: 'Alice', age: 30 } })).toBe(true);
    expect(valid(schema, {})).toBe(false);
    expect(valid(schema, { user: {} })).toBe(false);
});

// ---------------------------------------------------------------------------
// Real-world scenario: user profile with nested address
// ---------------------------------------------------------------------------

const USER_PROFILE_SCHEMA = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        username: { type: 'string', minLength: 3, maxLength: 32 },
        age: { type: 'integer', minimum: 0, maximum: 150 },
        role: { enum: ['admin', 'editor', 'viewer'] },
        /** test of comments */
        address: {
            type: 'object',
            properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zip: { type: 'string', pattern: '^\\d{5}$' },
                country: { type: 'string' }
            },
            required: ['street', 'city', 'country']
        }
    },
    required: ['id', 'email', 'username', 'role']
} as const;

test('fromJsonSchema - 31: user profile — valid complete record is accepted', () => {
    const schema = fromJsonSchema(USER_PROFILE_SCHEMA);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        id: string;
        email: string;
        username: string;
        role: 'admin' | 'editor' | 'viewer';
        age?: number;
        address?: {
            street: string;
            city: string;
            country: string;
            zip?: string;
        };
    }>();
    expect(
        valid(schema, {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'alice@example.com',
            username: 'alice',
            role: 'admin',
            age: 30,
            address: {
                street: '123 Main St',
                city: 'Springfield',
                zip: '12345',
                country: 'US'
            }
        })
    ).toBe(true);
});

test('fromJsonSchema - 32: user profile — missing required fields are rejected', () => {
    const schema = fromJsonSchema(USER_PROFILE_SCHEMA);
    // missing email
    expect(
        valid(schema, {
            id: '550e8400-e29b-41d4-a716-446655440000',
            username: 'alice',
            role: 'admin'
        })
    ).toBe(false);
});

test('fromJsonSchema - 33: user profile — invalid role enum is rejected', () => {
    const schema = fromJsonSchema(USER_PROFILE_SCHEMA);
    expect(
        valid(schema, {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'alice@example.com',
            username: 'alice',
            role: 'superuser'
        })
    ).toBe(false);
});

test('fromJsonSchema - 34: user profile — invalid zip pattern is rejected', () => {
    const schema = fromJsonSchema(USER_PROFILE_SCHEMA);
    expect(
        valid(schema, {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'alice@example.com',
            username: 'alice',
            role: 'editor',
            address: {
                street: '1 Rd',
                city: 'Springfield',
                zip: 'ABCDE',
                country: 'US'
            }
        })
    ).toBe(false);
});

test('fromJsonSchema - 35: user profile — optional address may be absent', () => {
    const schema = fromJsonSchema(USER_PROFILE_SCHEMA);
    expect(
        valid(schema, {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'alice@example.com',
            username: 'alice',
            role: 'viewer'
        })
    ).toBe(true);
});

// ---------------------------------------------------------------------------
// Real-world scenario: paginated list response
// ---------------------------------------------------------------------------

const PAGINATED_USERS_SCHEMA = {
    type: 'object',
    properties: {
        data: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' }
                },
                required: ['id', 'email', 'username']
            }
        },
        meta: {
            type: 'object',
            properties: {
                total: { type: 'integer', minimum: 0 },
                page: { type: 'integer', minimum: 1 },
                perPage: { type: 'integer', minimum: 1, maximum: 100 }
            },
            required: ['total', 'page', 'perPage']
        }
    },
    required: ['data', 'meta']
} as const;

test('fromJsonSchema - 36: paginated response — valid payload is accepted', () => {
    const schema = fromJsonSchema(PAGINATED_USERS_SCHEMA);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        data: { id: string; email: string; username: string }[];
        meta: { total: number; page: number; perPage: number };
    }>();
    expect(
        valid(schema, {
            data: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    email: 'a@b.com',
                    username: 'alice'
                }
            ],
            meta: { total: 1, page: 1, perPage: 20 }
        })
    ).toBe(true);
});

test('fromJsonSchema - 37: paginated response — item with missing field is rejected', () => {
    const schema = fromJsonSchema(PAGINATED_USERS_SCHEMA);
    expect(
        valid(schema, {
            data: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    // missing email
                    username: 'alice'
                }
            ],
            meta: { total: 1, page: 1, perPage: 20 }
        })
    ).toBe(false);
});

test('fromJsonSchema - 38: paginated response — perPage exceeding maximum is rejected', () => {
    const schema = fromJsonSchema(PAGINATED_USERS_SCHEMA);
    expect(
        valid(schema, {
            data: [],
            meta: { total: 0, page: 1, perPage: 101 }
        })
    ).toBe(false);
});

test('fromJsonSchema - 39: paginated response — empty data array is accepted', () => {
    const schema = fromJsonSchema(PAGINATED_USERS_SCHEMA);
    expect(
        valid(schema, {
            data: [],
            meta: { total: 0, page: 1, perPage: 20 }
        })
    ).toBe(true);
});

// ---------------------------------------------------------------------------
// Real-world scenario: webhook event (anyOf discriminated by type)
// ---------------------------------------------------------------------------

const WEBHOOK_EVENT_SCHEMA = {
    anyOf: [
        {
            type: 'object',
            properties: {
                type: { const: 'user.created' },
                userId: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' }
            },
            required: ['type', 'userId', 'email']
        },
        {
            type: 'object',
            properties: {
                type: { const: 'order.placed' },
                orderId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', minimum: 0 }
            },
            required: ['type', 'orderId', 'amount']
        },
        {
            type: 'object',
            properties: {
                type: { const: 'order.cancelled' },
                orderId: { type: 'string', format: 'uuid' },
                reason: { type: 'string' }
            },
            required: ['type', 'orderId']
        }
    ]
} as const;

test('fromJsonSchema - 40: webhook event — user.created event is accepted', () => {
    const schema = fromJsonSchema(WEBHOOK_EVENT_SCHEMA);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<
        | { type: 'user.created'; userId: string; email: string }
        | { type: 'order.placed'; orderId: string; amount: number }
        | { type: 'order.cancelled'; orderId: string; reason?: string }
    >();
    expect(
        valid(schema, {
            type: 'user.created',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            email: 'alice@example.com'
        })
    ).toBe(true);
});

test('fromJsonSchema - 41: webhook event — order.placed event is accepted', () => {
    const schema = fromJsonSchema(WEBHOOK_EVENT_SCHEMA);
    expect(
        valid(schema, {
            type: 'order.placed',
            orderId: '550e8400-e29b-41d4-a716-446655440001',
            amount: 99.99
        })
    ).toBe(true);
});

test('fromJsonSchema - 42: webhook event — order.cancelled without optional reason is accepted', () => {
    const schema = fromJsonSchema(WEBHOOK_EVENT_SCHEMA);
    expect(
        valid(schema, {
            type: 'order.cancelled',
            orderId: '550e8400-e29b-41d4-a716-446655440002'
        })
    ).toBe(true);
});

test('fromJsonSchema - 43: webhook event — unknown event type is rejected', () => {
    const schema = fromJsonSchema(WEBHOOK_EVENT_SCHEMA);
    expect(
        valid(schema, {
            type: 'payment.refunded',
            refundId: '550e8400-e29b-41d4-a716-446655440003'
        })
    ).toBe(false);
});

// ---------------------------------------------------------------------------
// Real-world scenario: API error response
// ---------------------------------------------------------------------------

const API_ERROR_SCHEMA = {
    type: 'object',
    properties: {
        code: { type: 'integer', minimum: 100, maximum: 599 },
        message: { type: 'string', minLength: 1 },
        details: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    field: { type: 'string' },
                    issue: { type: 'string' }
                },
                required: ['field', 'issue']
            }
        },
        traceId: { type: 'string', format: 'uuid' }
    },
    required: ['code', 'message']
} as const;

test('fromJsonSchema - 44: API error — minimal error without optional fields is accepted', () => {
    const schema = fromJsonSchema(API_ERROR_SCHEMA);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        code: number;
        message: string;
        details?: { field: string; issue: string }[];
        traceId?: string;
    }>();
    expect(valid(schema, { code: 400, message: 'Bad Request' })).toBe(true);
});

test('fromJsonSchema - 45: API error — full error with details array is accepted', () => {
    const schema = fromJsonSchema(API_ERROR_SCHEMA);
    expect(
        valid(schema, {
            code: 422,
            message: 'Validation failed',
            details: [
                { field: 'email', issue: 'must be a valid email' },
                { field: 'username', issue: 'too short' }
            ],
            traceId: '550e8400-e29b-41d4-a716-446655440000'
        })
    ).toBe(true);
});

test('fromJsonSchema - 46: API error — code outside HTTP range is rejected', () => {
    const schema = fromJsonSchema(API_ERROR_SCHEMA);
    expect(valid(schema, { code: 99, message: 'Bad' })).toBe(false);
    expect(valid(schema, { code: 600, message: 'Bad' })).toBe(false);
});

test('fromJsonSchema - 47: API error — empty message is rejected', () => {
    const schema = fromJsonSchema(API_ERROR_SCHEMA);
    expect(valid(schema, { code: 400, message: '' })).toBe(false);
});

test('fromJsonSchema - 48: API error — detail item with missing issue is rejected', () => {
    const schema = fromJsonSchema(API_ERROR_SCHEMA);
    expect(
        valid(schema, {
            code: 422,
            message: 'Validation failed',
            details: [{ field: 'email' }]
        })
    ).toBe(false);
});

// ---------------------------------------------------------------------------
// Real-world scenario: create product request (string constraints + numeric range)
// ---------------------------------------------------------------------------

const CREATE_PRODUCT_SCHEMA = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 200 },
        slug: {
            type: 'string',
            pattern: '^[a-z0-9-]+$',
            minLength: 1,
            maxLength: 100
        },
        price: { type: 'number', minimum: 0, exclusiveMinimum: 0 },
        stock: { type: 'integer', minimum: 0 },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        status: { enum: ['draft', 'published', 'archived'] }
    },
    required: ['name', 'slug', 'price', 'status']
} as const;

test('fromJsonSchema - 49: create product — valid payload is accepted', () => {
    const schema = fromJsonSchema(CREATE_PRODUCT_SCHEMA);
    expectTypeOf<InferType<typeof schema>>().toMatchTypeOf<{
        name: string;
        slug: string;
        price: number;
        status: 'draft' | 'published' | 'archived';
        stock?: number;
        tags?: string[];
    }>();
    expect(
        valid(schema, {
            name: 'Wireless Headphones',
            slug: 'wireless-headphones',
            price: 49.99,
            status: 'published',
            stock: 100,
            tags: ['electronics', 'audio']
        })
    ).toBe(true);
});

test('fromJsonSchema - 50: create product — zero price is rejected (exclusiveMinimum)', () => {
    const schema = fromJsonSchema(CREATE_PRODUCT_SCHEMA);
    expect(
        valid(schema, {
            name: 'Free Item',
            slug: 'free-item',
            price: 0,
            status: 'draft'
        })
    ).toBe(false);
});

test('fromJsonSchema - 51: create product — invalid slug pattern is rejected', () => {
    const schema = fromJsonSchema(CREATE_PRODUCT_SCHEMA);
    expect(
        valid(schema, {
            name: 'My Product',
            slug: 'My Product!',
            price: 9.99,
            status: 'draft'
        })
    ).toBe(false);
});

test('fromJsonSchema - 52: create product — too many tags is rejected', () => {
    const schema = fromJsonSchema(CREATE_PRODUCT_SCHEMA);
    expect(
        valid(schema, {
            name: 'Tagged Item',
            slug: 'tagged-item',
            price: 1.0,
            status: 'draft',
            tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
        })
    ).toBe(false);
});

test('fromJsonSchema - 53: create product — optional stock may be absent', () => {
    const schema = fromJsonSchema(CREATE_PRODUCT_SCHEMA);
    expect(
        valid(schema, {
            name: 'Digital Download',
            slug: 'digital-download',
            price: 4.99,
            status: 'published'
        })
    ).toBe(true);
});
