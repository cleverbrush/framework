import { expect, expectTypeOf, test } from 'vitest';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { parseString } from './ParseStringSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Basic creation & introspection
// ---------------------------------------------------------------------------

test('introspect returns correct metadata', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const info = schema.introspect();
    expect(info.type).toEqual('parseString');
    expect(info.isRequired).toEqual(true);
    expect(info.templateDefinition).toBeDefined();
    expect(info.templateDefinition.literals).toEqual(['/orders/', '']);
    expect(info.templateDefinition.segments).toHaveLength(1);
    expect(info.templateDefinition.segments[0].path).toEqual('id');
    expect(info.objectSchema).toBeDefined();
});

// ---------------------------------------------------------------------------
// Basic validation — single param
// ---------------------------------------------------------------------------

test('basic: single number param', () => {
    const schema = parseString(
        object({ id: number().coerce() }),
        $t => $t`/orders/${t => t.id}`
    );

    const typeCheck: InferType<typeof schema> = { id: 0 };
    expectTypeOf(typeCheck).toEqualTypeOf<{ id: number }>();

    const result = schema.validate('/orders/123');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ id: 123 });
});

test('basic: single string param', () => {
    const schema = parseString(
        object({ name: string() }),
        $t => $t`/hello/${t => t.name}`
    );

    const typeCheck: InferType<typeof schema> = { name: '' };
    expectTypeOf(typeCheck).toEqualTypeOf<{ name: string }>();

    const result = schema.validate('/hello/world');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ name: 'world' });
});

// ---------------------------------------------------------------------------
// Multiple params
// ---------------------------------------------------------------------------

test('multiple params', () => {
    const schema = parseString(
        object({ userId: string(), id: number().coerce() }),
        $t => $t`/orders/${t => t.id}/${t => t.userId}`
    );

    const typeCheck: InferType<typeof schema> = { userId: '', id: 0 };
    expectTypeOf(typeCheck).toEqualTypeOf<{ userId: string; id: number }>();

    const result = schema.validate(
        '/orders/1234/550e8400-e29b-41d4-a716-446655440000'
    );
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({
        id: 1234,
        userId: '550e8400-e29b-41d4-a716-446655440000'
    });
});

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

test('InferType produces correct object type', () => {
    const schema = parseString(
        object({ userId: string(), id: number() }),
        $t => $t`/orders/${t => t.id}/${t => t.userId}`
    );

    type Result = InferType<typeof schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
        userId: string;
        id: number;
    }>();
});

test('validate returns correctly typed object', () => {
    const schema = parseString(
        object({ count: number().coerce(), label: string() }),
        $t => $t`${t => t.count}x-${t => t.label}`
    );

    const result = schema.validate('5x-boxes');
    if (result.valid) {
        expectTypeOf(result.object!).toEqualTypeOf<{
            count: number;
            label: string;
        }>();
    }
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

test('nested object properties', () => {
    const schema = parseString(
        object({
            order: object({ id: number().coerce() }),
            user: object({ name: string() })
        }),
        $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
    );

    const typeCheck: InferType<typeof schema> = {
        order: { id: 0 },
        user: { name: '' }
    };
    expectTypeOf(typeCheck).toEqualTypeOf<{
        order: { id: number };
        user: { name: string };
    }>();

    const result = schema.validate('/orders/42/by/alice');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({
        order: { id: 42 },
        user: { name: 'alice' }
    });
});

test('InferType with nested objects', () => {
    const schema = parseString(
        object({
            order: object({ id: number() }),
            user: object({ name: string() })
        }),
        $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
    );

    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{
        order: { id: number };
        user: { name: string };
    }>();
});

// ---------------------------------------------------------------------------
// Validation failures
// ---------------------------------------------------------------------------

test('pattern mismatch returns error', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = schema.validate('/users/123');
    expect(result.valid).toEqual(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('parse-string pattern');
});

test('segment validation failure for non-numeric string', () => {
    const schema = parseString(
        object({ id: number().coerce() }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = schema.validate('/orders/abc');
    expect(result.valid).toEqual(false);
    expect(result.errors![0].message).toContain('id');
});

test('segment schema validation failure', () => {
    const schema = parseString(
        object({ id: number().coerce().min(10) }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = schema.validate('/orders/5');
    expect(result.valid).toEqual(false);
    expect(result.errors![0].message).toContain('id');
});

test('non-string input returns error', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = schema.validate(123 as any);
    expect(result.valid).toEqual(false);
    expect(result.errors![0].message).toContain('string');
});

// ---------------------------------------------------------------------------
// Preprocessor-based coercion
// ---------------------------------------------------------------------------

test('preprocessor coercion: number', () => {
    const schema = parseString(
        object({ val: number().coerce() }),
        $t => $t`v=${t => t.val}`
    );

    const typeCheck: InferType<typeof schema> = { val: 0 };
    expectTypeOf(typeCheck).toEqualTypeOf<{ val: number }>();

    const result = schema.validate('v=42');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ val: 42 });
});

test('preprocessor coercion: boolean true', () => {
    const schema = parseString(
        object({ flag: boolean().coerce() }),
        $t => $t`flag=${t => t.flag}`
    );

    const typeCheck: InferType<typeof schema> = { flag: true };
    expectTypeOf(typeCheck).toEqualTypeOf<{ flag: boolean }>();

    const result = schema.validate('flag=true');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ flag: true });
});

test('preprocessor coercion: boolean false', () => {
    const schema = parseString(
        object({ flag: boolean().coerce() }),
        $t => $t`flag=${t => t.flag}`
    );

    const result = schema.validate('flag=false');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ flag: false });
});

test('preprocessor coercion: boolean invalid', () => {
    const schema = parseString(
        object({ flag: boolean().coerce() }),
        $t => $t`flag=${t => t.flag}`
    );

    const result = schema.validate('flag=yes');
    expect(result.valid).toEqual(false);
    expect(result.errors![0].message).toContain('flag');
});

test('preprocessor coercion: date', () => {
    const schema = parseString(
        object({ when: date().coerce() }),
        $t => $t`at=${t => t.when}`
    );

    const typeCheck: InferType<typeof schema> = { when: new Date() };
    expectTypeOf(typeCheck).toEqualTypeOf<{ when: Date }>();

    const result = schema.validate('at=2024-01-15');
    expect(result.valid).toEqual(true);
    expect(result.object!.when).toBeInstanceOf(Date);
    expect(result.object!.when.toISOString()).toContain('2024-01-15');
});

test('preprocessor coercion: invalid date', () => {
    const schema = parseString(
        object({ when: date().coerce() }),
        $t => $t`at=${t => t.when}`
    );

    const result = schema.validate('at=not-a-date');
    expect(result.valid).toEqual(false);
    expect(result.errors![0].message).toContain('when');
});

test('string passes through without preprocessor', () => {
    const schema = parseString(
        object({ tag: string() }),
        $t => $t`#${t => t.tag}`
    );

    const result = schema.validate('#hello-world');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ tag: 'hello-world' });
});

// ---------------------------------------------------------------------------
// Schema extensions on properties
// ---------------------------------------------------------------------------

test('property schema constraints are applied', () => {
    const schema = parseString(
        object({ name: string().minLength(3) }),
        $t => $t`/user/${t => t.name}`
    );

    {
        const result = schema.validate('/user/alice');
        expect(result.valid).toEqual(true);
    }

    {
        const result = schema.validate('/user/ab');
        expect(result.valid).toEqual(false);
        expect(result.errors![0].message).toContain('name');
    }
});

// ---------------------------------------------------------------------------
// optional / nullable / default
// ---------------------------------------------------------------------------

test('optional accepts undefined', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    ).optional();

    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: number } | undefined>();

    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeUndefined();
});

test('nullable accepts null', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    ).nullable();

    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: number } | null>();

    const result = schema.validate(null as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeNull();
});

test('default returns default value for undefined input', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    ).default({ id: 0 });

    const typeCheck: InferType<typeof schema> = { id: 0 };
    expectTypeOf(typeCheck).toEqualTypeOf<{ id: number }>();

    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ id: 0 });
});

test('required rejects undefined', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Edge cases: regex special chars in literals
// ---------------------------------------------------------------------------

test('literals with regex special characters are escaped', () => {
    const schema = parseString(
        object({ q: string() }),
        $t => $t`search?q=${t => t.q}&page=1`
    );

    const result = schema.validate('search?q=hello+world&page=1');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ q: 'hello+world' });
});

test('literals with dots and brackets', () => {
    const schema = parseString(
        object({ version: string() }),
        $t => $t`file[${t => t.version}].tar.gz`
    );

    const result = schema.validate('file[2.0.1].tar.gz');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ version: '2.0.1' });
});

// ---------------------------------------------------------------------------
// Edge cases: degenerate templates
// ---------------------------------------------------------------------------

test('no params — acts as string equality check', () => {
    const schema = parseString(object({}), $t => $t`/health`);

    expect(schema.validate('/health').valid).toEqual(true);
    expect(schema.validate('/other').valid).toEqual(false);
});

test('single param with no surrounding literals', () => {
    const schema = parseString(
        object({ val: string() }),
        $t => $t`${t => t.val}`
    );

    const result = schema.validate('anything goes');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ val: 'anything goes' });
});

test('param at start with trailing literal', () => {
    const schema = parseString(
        object({ name: string() }),
        $t => $t`${t => t.name}.json`
    );

    const result = schema.validate('config.json');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ name: 'config' });
});

// ---------------------------------------------------------------------------
// Duplicate selector error
// ---------------------------------------------------------------------------

test('duplicate property selector throws at creation', () => {
    expect(() =>
        parseString(
            object({ id: number() }),
            $t => $t`${t => t.id}/${t => t.id}`
        )
    ).toThrow(/[Dd]uplicate/);
});

// ---------------------------------------------------------------------------
// Async validation
// ---------------------------------------------------------------------------

test('validateAsync works', async () => {
    const schema = parseString(
        object({ id: number().coerce(), name: string() }),
        $t => $t`/users/${t => t.id}/${t => t.name}`
    );

    const typeCheck: InferType<typeof schema> = { id: 0, name: '' };
    expectTypeOf(typeCheck).toEqualTypeOf<{ id: number; name: string }>();

    const result = await schema.validateAsync('/users/42/alice');
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ id: 42, name: 'alice' });
});

test('validateAsync with failure', async () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const result = await schema.validateAsync('/bad-path');
    expect(result.valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// doNotStopOnFirstError collects all errors
// ---------------------------------------------------------------------------

test('doNotStopOnFirstError collects all segment errors', () => {
    const schema = parseString(
        object({ a: number(), b: number() }),
        $t => $t`${t => t.a}/${t => t.b}`
    );

    const result = schema.validate('abc/def', {
        doNotStopOnFirstError: true
    });
    expect(result.valid).toEqual(false);
    expect(result.errors!.length).toEqual(2);
    expect(result.errors![0].message).toContain('a');
    expect(result.errors![1].message).toContain('b');
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

test('immutability: optional returns new instance', () => {
    const original = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    );

    const optional = original.optional();
    expect(original.introspect().isRequired).toEqual(true);
    expect(optional.introspect().isRequired).toEqual(false);
});

// ---------------------------------------------------------------------------
// InferType with optional/nullable
// ---------------------------------------------------------------------------

test('nullable + optional combined', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    )
        .optional()
        .nullable();

    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: number } | null | undefined>();
});

test('InferType with optional', () => {
    const schema = parseString(
        object({ id: number() }),
        $t => $t`/orders/${t => t.id}`
    ).optional();

    type Result = InferType<typeof schema>;
    expectTypeOf<Result>().toEqualTypeOf<{ id: number } | undefined>();
});

// ---------------------------------------------------------------------------
// serialize — reverse of validate
// ---------------------------------------------------------------------------

test('serialize: single number param', () => {
    const schema = parseString(
        object({ id: number().coerce() }),
        $t => $t`/orders/${t => t.id}`
    );

    expect(schema.serialize({ id: 42 })).toBe('/orders/42');
});

test('serialize: multiple params', () => {
    const schema = parseString(
        object({ org: string(), repo: string() }),
        $t => $t`/${t => t.org}/${t => t.repo}`
    );

    expect(schema.serialize({ org: 'cleverbrush', repo: 'framework' })).toBe(
        '/cleverbrush/framework'
    );
});

test('serialize: boolean param', () => {
    const schema = parseString(
        object({ active: boolean() }),
        $t => $t`/items?active=${t => t.active}`
    );

    expect(schema.serialize({ active: true })).toBe('/items?active=true');
    expect(schema.serialize({ active: false })).toBe('/items?active=false');
});

test('serialize: Date param', () => {
    const d = new Date('2024-01-15T10:30:00.000Z');
    const schema = parseString(
        object({ since: date() }),
        $t => $t`/events/${t => t.since}`
    );

    expect(schema.serialize({ since: d })).toBe(
        '/events/Mon Jan 15 2024 10:30:00 GMT+0000 (Coordinated Universal Time)'
    );
});

test('serialize: throws on missing required param', () => {
    const schema = parseString(
        object({ id: number().coerce() }),
        $t => $t`/orders/${t => t.id}`
    );

    expect(() => schema.serialize({} as any)).toThrow(
        /Missing required parameter "id"/
    );
});

test('serialize: roundtrip with validate', () => {
    const schema = parseString(
        object({ id: number().coerce(), slug: string() }),
        $t => $t`/posts/${t => t.id}/${t => t.slug}`
    );

    const original = { id: 7, slug: 'hello-world' };
    const serialized = schema.serialize(original);
    expect(serialized).toBe('/posts/7/hello-world');

    const parsed = schema.validate(serialized);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
        expect(parsed.object).toEqual(original);
    }
});
