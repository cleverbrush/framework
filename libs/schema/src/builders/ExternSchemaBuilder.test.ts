import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expect, expectTypeOf, test } from 'vitest';

import { array } from './ArraySchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { ExternSchemaBuilder, extern } from './ExternSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import {
    type InferType,
    type MakeOptional,
    SYMBOL_HAS_PROPERTIES,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Mock Standard Schema helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal Standard Schema v1 compliant schema with synchronous
 * validation. Used in tests instead of depending on a real library (Zod etc).
 */
function createMockSchema<TOutput>(
    validateFn: (value: unknown) => StandardSchemaV1.Result<TOutput>
): StandardSchemaV1<TOutput, TOutput> {
    return {
        '~standard': {
            version: 1,
            vendor: 'mock',
            validate: validateFn
        }
    };
}

/**
 * Creates a mock Standard Schema whose validate() returns a Promise.
 */
function createAsyncMockSchema<TOutput>(
    validateFn: (value: unknown) => Promise<StandardSchemaV1.Result<TOutput>>
): StandardSchemaV1<TOutput, TOutput> {
    return {
        '~standard': {
            version: 1,
            vendor: 'mock-async',
            validate: validateFn
        }
    };
}

// -- Mock schemas used across tests --

/** Accepts `{ first: string; last: string }` */
const mockUserSchema = createMockSchema<{ first: string; last: string }>(
    value => {
        if (
            typeof value !== 'object' ||
            value === null ||
            typeof (value as any).first !== 'string' ||
            typeof (value as any).last !== 'string'
        ) {
            const issues: StandardSchemaV1.Issue[] = [];
            if (typeof value !== 'object' || value === null) {
                issues.push({ message: 'expected an object' });
            } else {
                if (typeof (value as any).first !== 'string') {
                    issues.push({
                        message: 'expected string',
                        path: ['first']
                    });
                }
                if (typeof (value as any).last !== 'string') {
                    issues.push({
                        message: 'expected string',
                        path: ['last']
                    });
                }
            }
            return { issues };
        }
        return { value: value as { first: string; last: string } };
    }
);

/** Accepts any string */
const mockStringSchema = createMockSchema<string>(value => {
    if (typeof value !== 'string') {
        return { issues: [{ message: 'expected a string' }] };
    }
    return { value };
});

/** Accepts a number, async */
const mockAsyncNumberSchema = createAsyncMockSchema<number>(async value => {
    // Simulate async work
    await Promise.resolve();
    if (typeof value !== 'number') {
        return { issues: [{ message: 'expected a number' }] };
    }
    return { value };
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test('extern() returns an ExternSchemaBuilder', () => {
    const schema = extern(mockStringSchema);
    expect(schema).toBeInstanceOf(ExternSchemaBuilder);
});

test('extern schema exposes ~standard property', () => {
    const schema = extern(mockStringSchema);
    const std = schema['~standard'];
    expect(std.version).toBe(1);
    expect(std.vendor).toBe('@cleverbrush/schema');
    expect(typeof std.validate).toBe('function');
});

test('introspect() includes standardSchema and type', () => {
    const schema = extern(mockStringSchema);
    const info = schema.introspect();
    expect(info.type).toBe('extern');
    expect(info.standardSchema).toBe(mockStringSchema);
});

test('standardSchema getter returns the wrapped schema', () => {
    const schema = extern(mockStringSchema);
    expect(schema.standardSchema).toBe(mockStringSchema);
});

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

test('InferType resolves to the output type of the external schema', () => {
    const schema = extern(mockUserSchema);
    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{ first: string; last: string }>();
});

test('InferType resolves for simple string schema', () => {
    const schema = extern(mockStringSchema);
    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<string>();
});

test('extern is assignable to StandardSchemaV1', () => {
    const schema = extern(mockStringSchema);
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<string, string>>();
});

test('StandardSchemaV1.InferOutput resolves output type', () => {
    const schema = extern(mockUserSchema);
    type Output = StandardSchemaV1.InferOutput<typeof schema>;
    expectTypeOf<Output>().toEqualTypeOf<{ first: string; last: string }>();
});

test('InferType resolves correctly with optional()', () => {
    const schema = extern(mockStringSchema).optional();
    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<MakeOptional<string>>();
});

test('InferType resolves inside object()', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });
    type Order = InferType<typeof order>;
    expectTypeOf<Order>().toEqualTypeOf<{
        user: { first: string; last: string };
        date: Date;
    }>();
});

// ---------------------------------------------------------------------------
// Sync validation — success
// ---------------------------------------------------------------------------

test('validates a valid string', () => {
    const schema = extern(mockStringSchema);
    const result = schema.validate('hello');
    expect(result.valid).toBe(true);
    expect(result.object).toBe('hello');
});

test('validates a valid object', () => {
    const schema = extern(mockUserSchema);
    const result = schema.validate({ first: 'Alice', last: 'Smith' });
    expect(result.valid).toBe(true);
    expect(result.object).toEqual({ first: 'Alice', last: 'Smith' });
});

test('optional extern with undefined is valid', () => {
    const schema = extern(mockStringSchema).optional();
    const result = schema.validate(undefined as any);
    expect(result.valid).toBe(true);
});

// ---------------------------------------------------------------------------
// Sync validation — failure
// ---------------------------------------------------------------------------

test('rejects invalid input', () => {
    const schema = extern(mockStringSchema);
    const result = schema.validate(123 as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0].message).toBe('expected a string');
});

test('required extern rejects undefined', () => {
    const schema = extern(mockStringSchema);
    const result = schema.validate(undefined as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/required/i);
});

test('required extern rejects null', () => {
    const schema = extern(mockStringSchema);
    const result = schema.validate(null as any);
    expect(result.valid).toBe(false);
});

// ---------------------------------------------------------------------------
// Error path mapping
// ---------------------------------------------------------------------------

test('issue paths are formatted as dotted prefixes', () => {
    const schema = extern(mockUserSchema);
    const result = schema.validate({ first: 123, last: 456 } as any);
    expect(result.valid).toBe(false);
    const messages = result.errors!.map(e => e.message);
    expect(messages).toContain('first: expected string');
    expect(messages).toContain('last: expected string');
});

test('issue with nested path uses dot notation', () => {
    const nestedSchema = createMockSchema<{ a: { b: number } }>(_value => ({
        issues: [
            {
                message: 'must be positive',
                path: ['a', { key: 'b' }]
            }
        ]
    }));
    const schema = extern(nestedSchema);
    const result = schema.validate({} as any);
    expect(result.errors![0].message).toBe('a.b: must be positive');
});

test('issue without path has no prefix', () => {
    const rawSchema = createMockSchema<string>(_value => ({
        issues: [{ message: 'bad value' }]
    }));
    const schema = extern(rawSchema);
    const result = schema.validate('x' as any);
    expect(result.errors![0].message).toBe('bad value');
});

// ---------------------------------------------------------------------------
// Async validation
// ---------------------------------------------------------------------------

test('validateAsync works with sync external schema', async () => {
    const schema = extern(mockStringSchema);
    const result = await schema.validateAsync('hello');
    expect(result.valid).toBe(true);
    expect(result.object).toBe('hello');
});

test('validateAsync works with async external schema', async () => {
    const schema = extern(mockAsyncNumberSchema);
    const result = await schema.validateAsync(42);
    expect(result.valid).toBe(true);
    expect(result.object).toBe(42);
});

test('validateAsync returns failure for invalid async schema', async () => {
    const schema = extern(mockAsyncNumberSchema);
    const result = await schema.validateAsync('not a number' as any);
    expect(result.valid).toBe(false);
    expect(result.errors![0].message).toBe('expected a number');
});

// ---------------------------------------------------------------------------
// Sync throws on async
// ---------------------------------------------------------------------------

test('validate() throws when external schema returns a Promise', () => {
    const schema = extern(mockAsyncNumberSchema);
    expect(() => schema.validate(42 as any)).toThrow(/Promise.*validateAsync/i);
});

// ---------------------------------------------------------------------------
// Fluent chaining — immutability
// ---------------------------------------------------------------------------

test('optional() returns a new instance', () => {
    const s1 = extern(mockStringSchema);
    const s2 = s1.optional();
    expect(s1).not.toBe(s2);
    expect(s1.introspect().isRequired).toBe(true);
    expect(s2.introspect().isRequired).toBe(false);
});

test('required() returns a new instance', () => {
    const s1 = extern(mockStringSchema).optional();
    const s2 = s1.required();
    expect(s1).not.toBe(s2);
    expect(s2.introspect().isRequired).toBe(true);
});

test('default() returns a new instance with default value', () => {
    const s1 = extern(mockStringSchema);
    const s2 = s1.default('fallback');
    expect(s1).not.toBe(s2);
    const result = s2.validate(undefined as any);
    expect(result.valid).toBe(true);
    expect(result.object).toBe('fallback');
});

test('nullable() works', () => {
    const schema = extern(mockStringSchema).nullable();
    const result = schema.validate(null as any);
    expect(result.valid).toBe(true);
    expect(result.object).toBe(null);
});

test('hasType() overrides inferred type', () => {
    const schema = extern(mockStringSchema).hasType<number>();
    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<number>();
});

test('clearHasType() restores original type', () => {
    const schema = extern(mockStringSchema).hasType<number>().clearHasType();
    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<string>();
});

test('brand() works at type level', () => {
    const schema = extern(mockStringSchema).brand<'Email'>();
    type Result = InferType<typeof schema>;
    // Result should be a branded string
    expectTypeOf<Result>().toMatchTypeOf<string>();
});

// ---------------------------------------------------------------------------
// Composition — extern inside object
// ---------------------------------------------------------------------------

test('extern inside object validates correctly', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    const validResult = order.validate({
        user: { first: 'Alice', last: 'Smith' },
        date: new Date()
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = order.validate({
        user: { first: 123, last: 456 },
        date: new Date()
    } as any);
    expect(invalidResult.valid).toBe(false);
});

test('getErrorsFor returns errors from extern property', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });
    const props = object.getPropertiesFor(order);

    const result = order.validate(
        { user: { first: 123, last: 456 }, date: new Date() } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);
    const userErrors = result.getErrorsFor((p: typeof props) => p.user);
    expect(userErrors.isValid).toBe(false);
    expect(userErrors.errors.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Nesting — extern inside array
// ---------------------------------------------------------------------------

test('array(extern(...)) validates each element', () => {
    const users = array(extern(mockUserSchema));
    const result = users.validate([
        { first: 'A', last: 'B' },
        { first: 'C', last: 'D' }
    ]);
    expect(result.valid).toBe(true);
});

test('array(extern(...)) rejects invalid elements', () => {
    const users = array(extern(mockUserSchema));
    const result = users.validate([
        { first: 'A', last: 'B' },
        { first: 123, last: 456 }
    ] as any);
    expect(result.valid).toBe(false);
});

// ---------------------------------------------------------------------------
// Preprocessors and validators on extern builder
// ---------------------------------------------------------------------------

test('addPreprocessor runs before external validation', () => {
    const schema = extern(mockStringSchema).addPreprocessor((v: any) =>
        typeof v === 'number' ? String(v) : v
    );
    const result = schema.validate(42 as any);
    expect(result.valid).toBe(true);
    expect(result.object).toBe('42');
});

test('addValidator runs after external validation', () => {
    const schema = extern(mockStringSchema).addValidator((v: string) => {
        if (v.length < 3) {
            return { valid: false, errors: [{ message: 'too short' }] };
        }
        return { valid: true };
    });

    // The external schema passes 'hi' (it's a string), but our validator rejects it
    // Note: addValidator runs in preValidation, before the external schema
    const shortResult = schema.validate('hi');
    expect(shortResult.valid).toBe(false);

    const longResult = schema.validate('hello');
    expect(longResult.valid).toBe(true);
});

// ---------------------------------------------------------------------------
// parse() / safeParse()
// ---------------------------------------------------------------------------

test('parse() returns validated value', () => {
    const schema = extern(mockStringSchema);
    const result = schema.parse('hello');
    expect(result).toBe('hello');
});

test('parse() throws on invalid value', () => {
    const schema = extern(mockStringSchema);
    expect(() => schema.parse(123 as any)).toThrow();
});

test('safeParse() works like validate()', () => {
    const schema = extern(mockStringSchema);
    const result = schema.safeParse('hello');
    expect(result.valid).toBe(true);
    expect(result.object).toBe('hello');
});

// ---------------------------------------------------------------------------
// ~standard on extern builder itself
// ---------------------------------------------------------------------------

test('extern builder ~standard.validate works', () => {
    const schema = extern(mockStringSchema);
    const result = schema['~standard'].validate('hello');
    expect(result).toEqual({ value: 'hello' });
});

test('extern builder ~standard.validate returns issues on failure', () => {
    const schema = extern(mockStringSchema);
    const result = schema['~standard'].validate(123);
    expect(result).toHaveProperty('issues');
    const issues = (result as StandardSchemaV1.FailureResult).issues;
    expect(issues.length).toBeGreaterThan(0);
});

// ===========================================================================
// Phase 2 — Proxy-based property descriptors & getErrorsFor (single-param)
// ===========================================================================

// ---------------------------------------------------------------------------
// Property descriptor tree (Proxy-based)
// ---------------------------------------------------------------------------

test('extern – getPropertiesFor creates Proxy sub-descriptors on access', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    const props = object.getPropertiesFor(order);

    expect(props).toHaveProperty('user');
    expect(props).toHaveProperty('date');
    // Accessing .first and .last on the extern Proxy creates child descriptors
    expect(props.user.first[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]).toBeDefined();
    expect(props.user.last[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]).toBeDefined();
});

test('extern – sub-descriptor parent points to the extern descriptor', () => {
    const order = object({
        user: extern(mockUserSchema)
    });
    const props = object.getPropertiesFor(order);
    const parentDescriptor =
        props.user.first[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].parent;
    expect(parentDescriptor).toBeDefined();
    // The parent's schema should be the extern builder
    expect(parentDescriptor.getSchema()).toBeInstanceOf(ExternSchemaBuilder);
});

test('extern – accessing the same sub-descriptor twice returns the same object', () => {
    const order = object({
        user: extern(mockUserSchema)
    });
    const props = object.getPropertiesFor(order);
    const first1 = props.user.first;
    const first2 = props.user.first;
    expect(first1).toBe(first2);
});

test('extern – SYMBOL_HAS_PROPERTIES is always true', () => {
    // Object-outputting extern
    const s1 = extern(mockUserSchema);
    expect((s1 as any)[SYMBOL_HAS_PROPERTIES]).toBe(true);

    // Primitive-outputting extern
    const s2 = extern(mockStringSchema);
    expect((s2 as any)[SYMBOL_HAS_PROPERTIES]).toBe(true);
});

// ---------------------------------------------------------------------------
// getErrorsFor distributes errors to Proxy children
// ---------------------------------------------------------------------------

test('extern – getErrorsFor distributes errors to child descriptors', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    const result = order.validate(
        { user: { first: 123, last: 456 }, date: new Date() } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    // Errors should be distributed to sub-descriptors via Proxy
    const firstErrors = result.getErrorsFor(t => t.user.first);
    expect(firstErrors).toBeDefined();
    expect(firstErrors.isValid).toBe(false);
    expect(firstErrors.errors.length).toBe(1);
    expect(firstErrors.errors[0]).toBe('expected string');

    const lastErrors = result.getErrorsFor(t => t.user.last);
    expect(lastErrors).toBeDefined();
    expect(lastErrors.isValid).toBe(false);
    expect(lastErrors.errors.length).toBe(1);
    expect(lastErrors.errors[0]).toBe('expected string');
});

test('extern – getErrorsFor returns no errors for valid child', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    // first is valid, last is invalid
    const result = order.validate(
        { user: { first: 'Alice', last: 456 }, date: new Date() } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    const firstErrors = result.getErrorsFor(t => t.user.first);
    expect(firstErrors.isValid).toBe(true);
    expect(firstErrors.errors.length).toBe(0);

    const lastErrors = result.getErrorsFor(t => t.user.last);
    expect(lastErrors.isValid).toBe(false);
    expect(lastErrors.errors.length).toBe(1);
});

test('extern – getErrorsFor on valid result returns no errors', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    const result = order.validate({
        user: { first: 'Alice', last: 'Smith' },
        date: new Date()
    });

    expect(result.valid).toBe(true);

    const firstErrors = result.getErrorsFor(t => t.user.first);
    expect(firstErrors.isValid).toBe(true);
    expect(firstErrors.errors.length).toBe(0);
});

test('extern – getErrorsFor on the extern itself shows errors', () => {
    const order = object({
        user: extern(mockUserSchema),
        date: date()
    });

    const result = order.validate(
        { user: { first: 123, last: 456 }, date: new Date() } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    const userErrors = result.getErrorsFor(t => t.user);
    expect(userErrors).toBeDefined();
    expect(userErrors.isValid).toBe(false);
    // The extern descriptor itself carries the mapped error messages
    expect(userErrors.errors.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// async getErrorsFor
// ---------------------------------------------------------------------------

test('extern – async getErrorsFor distributes errors to child descriptors', async () => {
    const mockAsyncUserSchema = createAsyncMockSchema<{
        first: string;
        last: string;
    }>(async value => {
        await Promise.resolve();
        if (
            typeof value !== 'object' ||
            value === null ||
            typeof (value as any).first !== 'string' ||
            typeof (value as any).last !== 'string'
        ) {
            const issues: StandardSchemaV1.Issue[] = [];
            if (typeof value !== 'object' || value === null) {
                issues.push({ message: 'expected an object' });
            } else {
                if (typeof (value as any).first !== 'string')
                    issues.push({
                        message: 'expected string',
                        path: ['first']
                    });
                if (typeof (value as any).last !== 'string')
                    issues.push({
                        message: 'expected string',
                        path: ['last']
                    });
            }
            return { issues };
        }
        return { value: value as { first: string; last: string } };
    });

    const order = object({
        user: extern(mockAsyncUserSchema),
        date: date()
    });

    const result = await order.validateAsync(
        { user: { first: 123, last: 456 }, date: new Date() } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    const firstErrors = result.getErrorsFor(t => t.user.first);
    expect(firstErrors.isValid).toBe(false);
    expect(firstErrors.errors.length).toBe(1);
    expect(firstErrors.errors[0]).toBe('expected string');
});

// ---------------------------------------------------------------------------
// Standard Schema issue path with PathSegment objects
// ---------------------------------------------------------------------------

test('extern – PathSegment objects in issue paths work with Proxy descriptors', () => {
    const mockSchemaWithPathSegments = createMockSchema<{
        name: string;
        age: number;
    }>(value => {
        if (typeof value !== 'object' || value === null) {
            return { issues: [{ message: 'expected object' }] };
        }
        const issues: StandardSchemaV1.Issue[] = [];
        if (typeof (value as any).name !== 'string') {
            issues.push({
                message: 'expected string',
                path: [{ key: 'name' }]
            });
        }
        if (typeof (value as any).age !== 'number') {
            issues.push({
                message: 'expected number',
                path: [{ key: 'age' }]
            });
        }
        if (issues.length > 0) return { issues };
        return { value: value as { name: string; age: number } };
    });

    const order = object({
        person: extern(mockSchemaWithPathSegments)
    });

    const result = order.validate({ person: { name: 42, age: 'old' } } as any, {
        doNotStopOnFirstError: true
    });

    expect(result.valid).toBe(false);

    const nameErrors = result.getErrorsFor(t => t.person.name);
    expect(nameErrors.isValid).toBe(false);
    expect(nameErrors.errors[0]).toBe('expected string');

    const ageErrors = result.getErrorsFor(t => t.person.age);
    expect(ageErrors.isValid).toBe(false);
    expect(ageErrors.errors[0]).toBe('expected number');
});

// ---------------------------------------------------------------------------
// E2E: extern inside a larger object schema (Zod-like scenario)
// ---------------------------------------------------------------------------

/**
 * Mock that behaves like a Zod z.object({ id: z.number(), name: z.string().min(3).max(50) })
 */
const mockZodOrderSchema = createMockSchema<{ id: number; name: string }>(
    value => {
        if (typeof value !== 'object' || value === null) {
            return { issues: [{ message: 'expected an object' }] };
        }
        const issues: StandardSchemaV1.Issue[] = [];
        if (typeof (value as any).id !== 'number') {
            issues.push({ message: 'expected number', path: ['id'] });
        }
        if (typeof (value as any).name !== 'string') {
            issues.push({ message: 'expected string', path: ['name'] });
        } else {
            const name = (value as any).name as string;
            if (name.length < 3) {
                issues.push({
                    message: 'must be at least 3 characters',
                    path: ['name']
                });
            }
            if (name.length > 50) {
                issues.push({
                    message: 'must be at most 50 characters',
                    path: ['name']
                });
            }
        }
        if (issues.length > 0) return { issues };
        return { value: value as { id: number; name: string } };
    }
);

test('e2e: getErrorsFor navigates sub-properties without explicit type annotation', () => {
    const UserSchema = object({
        id: number(),
        order: extern(mockZodOrderSchema),
        name: string(),
        email: string()
    });

    const result = UserSchema.validate({
        id: 1,
        order: { id: -1, name: 'Order 1' },
        name: 'hello',
        email: 'andrew@mmm.com'
    });

    expect(result.valid).toBe(true);

    // Should be able to navigate into the extern's sub-properties
    // WITHOUT explicit type annotation on t
    const orderIdErrors = result.getErrorsFor(t => t.order.id);
    expect(orderIdErrors).toBeDefined();
    expect(orderIdErrors.isValid).toBe(true);
    expect(orderIdErrors.errors).toHaveLength(0);

    const orderNameErrors = result.getErrorsFor(t => t.order.name);
    expect(orderNameErrors).toBeDefined();
    expect(orderNameErrors.isValid).toBe(true);
    expect(orderNameErrors.errors).toHaveLength(0);
});

test('e2e: getErrorsFor distributes validation failures without explicit type annotation', () => {
    const UserSchema = object({
        id: number(),
        order: extern(mockZodOrderSchema),
        name: string(),
        email: string()
    });

    const result = UserSchema.validate(
        {
            id: 1,
            order: { id: 'not-a-number', name: 'ab' },
            name: 'hello',
            email: 'andrew@mmm.com'
        } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    const orderIdErrors = result.getErrorsFor(t => t.order.id);
    expect(orderIdErrors.isValid).toBe(false);
    expect(orderIdErrors.errors.length).toBeGreaterThan(0);
    expect(orderIdErrors.errors[0]).toBe('expected number');

    const orderNameErrors = result.getErrorsFor(t => t.order.name);
    expect(orderNameErrors.isValid).toBe(false);
    expect(orderNameErrors.errors[0]).toBe('must be at least 3 characters');
});

test('e2e: getErrorsFor(t => t.order) returns errors for the extern itself', () => {
    const UserSchema = object({
        id: number(),
        order: extern(mockZodOrderSchema),
        name: string()
    });

    const result = UserSchema.validate(
        {
            id: 1,
            order: { id: 'not-a-number', name: 'ab' },
            name: 'hello'
        } as any,
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toBe(false);

    const orderErrors = result.getErrorsFor(t => t.order);
    expect(orderErrors).toBeDefined();
    expect(orderErrors.isValid).toBe(false);
    expect(orderErrors.errors.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Regression: getErrorsFor on extern sub-property without doNotStopOnFirstError
// (mirrors real-world Zod usage where only the extern property fails)
// ---------------------------------------------------------------------------

test('e2e: getErrorsFor(t => t.order.id) works WITHOUT doNotStopOnFirstError', () => {
    /**
     * Mock that mimics Zod z.object({ id: z.number().min(1), name: z.string().min(3).max(50) })
     * The schema validates id >= 1 and name 3-50 chars.
     */
    const mockZodLikeSchema = createMockSchema<{ id: number; name: string }>(
        value => {
            if (typeof value !== 'object' || value === null) {
                return { issues: [{ message: 'expected an object' }] };
            }
            const issues: StandardSchemaV1.Issue[] = [];
            const v = value as { id?: unknown; name?: unknown };

            if (typeof v.id !== 'number') {
                issues.push({ message: 'expected number', path: ['id'] });
            } else if (v.id < 1) {
                issues.push({
                    message: 'Too small: expected number to be >=1',
                    path: ['id']
                });
            }

            if (typeof v.name !== 'string') {
                issues.push({ message: 'expected string', path: ['name'] });
            } else if (v.name.length < 3) {
                issues.push({
                    message: 'must be at least 3 characters',
                    path: ['name']
                });
            }

            if (issues.length > 0) return { issues };
            return { value: value as { id: number; name: string } };
        }
    );

    const UserSchema = object({
        id: number(),
        order: extern(mockZodLikeSchema),
        name: string(),
        email: string()
    });

    // Only the extern's sub-property "id" fails (id < 1).
    // Everything else is valid.
    const result = UserSchema.validate({
        id: 1,
        order: { id: -1, name: 'Order 1' },
        name: 'hello',
        email: 'andrew@mmm.com'
    });

    expect(result.valid).toBe(false);

    // getErrorsFor on the extern sub-property should work
    // without explicit doNotStopOnFirstError
    const orderIdErrors = result.getErrorsFor(t => t.order.id);
    expect(orderIdErrors).toBeDefined();
    expect(orderIdErrors.isValid).toBe(false);
    expect(orderIdErrors.errors.length).toBe(1);
    expect(orderIdErrors.errors[0]).toBe(
        'Too small: expected number to be >=1'
    );

    // The "name" sub-property should be valid
    const orderNameErrors = result.getErrorsFor(t => t.order.name);
    expect(orderNameErrors).toBeDefined();
    expect(orderNameErrors.isValid).toBe(true);
    expect(orderNameErrors.errors.length).toBe(0);

    // The extern descriptor itself should have errors
    const orderErrors = result.getErrorsFor(t => t.order);
    expect(orderErrors).toBeDefined();
    expect(orderErrors.isValid).toBe(false);
});

test('e2e: getErrorsFor result is JSON-serializable via toJSON()', () => {
    const mockZodLikeSchema = createMockSchema<{ id: number; name: string }>(
        value => {
            if (typeof value !== 'object' || value === null) {
                return { issues: [{ message: 'expected an object' }] };
            }
            const issues: StandardSchemaV1.Issue[] = [];
            const v = value as { id?: unknown; name?: unknown };

            if (typeof v.id !== 'number') {
                issues.push({ message: 'expected number', path: ['id'] });
            } else if (v.id < 1) {
                issues.push({
                    message: 'Too small: expected number to be >=1',
                    path: ['id']
                });
            }

            if (typeof v.name !== 'string') {
                issues.push({ message: 'expected string', path: ['name'] });
            }

            if (issues.length > 0) return { issues };
            return { value: value as { id: number; name: string } };
        }
    );

    const UserSchema = object({
        id: number(),
        order: extern(mockZodLikeSchema),
        name: string()
    });

    const result = UserSchema.validate({
        id: 1,
        order: { id: -1, name: 'Order 1' },
        name: 'hello'
    });

    expect(result.valid).toBe(false);

    // JSON.stringify should produce a useful representation (not "{}")
    const orderIdErrors = result.getErrorsFor(t => t.order.id);
    const json = JSON.parse(JSON.stringify(orderIdErrors));
    expect(json).toHaveProperty('isValid', false);
    expect(json).toHaveProperty('errors');
    expect(json.errors.length).toBe(1);
    expect(json.errors[0]).toBe('Too small: expected number to be >=1');

    // Valid property also serializes correctly
    const nameErrors = result.getErrorsFor(t => t.order.name);
    const validJson = JSON.parse(JSON.stringify(nameErrors));
    expect(validJson).toHaveProperty('isValid', true);
    expect(validJson.errors).toHaveLength(0);
});
