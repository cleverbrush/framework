import { expect, expectTypeOf, test } from 'vitest';

import { array } from './ArraySchemaBuilder.js';
import { LazySchemaBuilder, lazy } from './LazySchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType, SchemaBuilder } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Basic delegation
// ---------------------------------------------------------------------------

test('lazy - 1: delegates to inner string schema (valid)', () => {
    const schema = lazy(() => string());
    expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<string>();
    const { valid, object: result, errors } = schema.validate('hello' as any);
    expect(valid).toEqual(true);
    expect(result).toEqual('hello');
    expect(errors).not.toBeDefined();
    expectTypeOf(result).toEqualTypeOf<string | undefined>();
});

test('lazy - 2: delegates to inner string schema (invalid)', () => {
    const schema = lazy(() => string());
    const { valid, errors } = schema.validate(42 as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('lazy - 3: delegates to inner number schema', () => {
    const schema = lazy(() => number());
    expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<number>();
    const { valid, object: result } = schema.validate(99 as any);
    expect(valid).toEqual(true);
    expect(result).toEqual(99);
    expectTypeOf(result).toEqualTypeOf<number | undefined>();
});

// ---------------------------------------------------------------------------
// Required / optional
// ---------------------------------------------------------------------------

test('lazy - 4: required (default) rejects undefined', () => {
    const schema = lazy(() => string());
    const { valid, errors } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
});

test('lazy - 5: required (default) rejects null', () => {
    const schema = lazy(() => string());
    const { valid } = schema.validate(null as any);
    expect(valid).toEqual(false);
});

test('lazy - 6: optional accepts undefined', () => {
    const schema = lazy(() => string()).optional();
    expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<
        string | undefined
    >();
    const { valid, object: result } = schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(result).toBeUndefined();
    expectTypeOf(result).toEqualTypeOf<string | undefined>();
});

test('lazy - 7: optional accepts null', () => {
    const schema = lazy(() => string()).optional();
    const { valid, object: result } = schema.validate(null as any);
    expect(valid).toEqual(true);
    expect(result).toBeNull();
    expectTypeOf(result).toEqualTypeOf<string | undefined>();
});

test('lazy - 8: optional still rejects invalid non-null values', () => {
    const schema = lazy(() => string()).optional();
    const { valid } = schema.validate(42 as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Getter is called once (caching)
// ---------------------------------------------------------------------------

test('lazy - 9: getter is called only once', () => {
    let callCount = 0;
    const schema = lazy(() => {
        callCount++;
        return string();
    });
    schema.validate('a' as any);
    schema.validate('b' as any);
    schema.validate('c' as any);
    expect(callCount).toEqual(1);
});

// ---------------------------------------------------------------------------
// Tree structure (self-referential)
// ---------------------------------------------------------------------------

test('lazy - 10: tree structure validates valid data', () => {
    type TreeNode = { value: number; children: TreeNode[] };

    const treeNode: SchemaBuilder<TreeNode, true> = object({
        value: number(),
        children: array(lazy(() => treeNode))
    });

    const data: TreeNode = {
        value: 1,
        children: [
            { value: 2, children: [] },
            { value: 3, children: [{ value: 4, children: [] }] }
        ]
    };

    const { valid, object: result } = treeNode.validate(data);
    expect(valid).toEqual(true);
    expect(result).toEqual(data);
    // treeNode is held as the SchemaBuilder base type; abstract validate() returns
    // ValidationResult<any>, so result is `any` here (type precision lost at upcast boundary)
    expectTypeOf(result).toBeAny();
});

test('lazy - 11: tree structure rejects invalid nested data', () => {
    type TreeNode = { value: number; children: TreeNode[] };

    const treeNode: SchemaBuilder<TreeNode, true> = object({
        value: number(),
        children: array(lazy(() => treeNode))
    });

    const data = {
        value: 1,
        children: [
            { value: 'not-a-number', children: [] } // invalid: value must be number
        ]
    };

    const { valid } = treeNode.validate(data as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Comments thread (replies array)
// ---------------------------------------------------------------------------

test('lazy - 12: comment thread validates valid data', () => {
    type Comment = { text: string; replies: Comment[] };

    const commentSchema: SchemaBuilder<Comment, true> = object({
        text: string(),
        replies: array(lazy(() => commentSchema))
    });

    const data: Comment = {
        text: 'root',
        replies: [
            {
                text: 'reply 1',
                replies: [{ text: 'reply 1.1', replies: [] }]
            },
            { text: 'reply 2', replies: [] }
        ]
    };

    const { valid, object: result } = commentSchema.validate(data);
    expect(valid).toEqual(true);
    expect(result).toEqual(data);
    expectTypeOf(result).toBeAny();
});

// ---------------------------------------------------------------------------
// Menu structure with optional recursion
// ---------------------------------------------------------------------------

test('lazy - 13: menu with optional submenu validates', () => {
    type MenuItem = { label: string; submenu?: MenuItem[] };

    const menuItemSchema: SchemaBuilder<MenuItem, true> = object({
        label: string(),
        submenu: array(lazy(() => menuItemSchema)).optional()
    });

    const data: MenuItem = {
        label: 'File',
        submenu: [
            {
                label: 'New',
                submenu: [{ label: 'Document' }, { label: 'Spreadsheet' }]
            },
            { label: 'Open' }
        ]
    };

    const { valid, object: result } = menuItemSchema.validate(data);
    expect(valid).toEqual(true);
    expect(result).toEqual(data);
    expectTypeOf(result).toBeAny();
});

test('lazy - 14: menu item without submenu validates', () => {
    type MenuItem = { label: string; submenu?: MenuItem[] };

    const menuItemSchema: SchemaBuilder<MenuItem, true> = object({
        label: string(),
        submenu: array(lazy(() => menuItemSchema)).optional()
    });

    const { valid } = menuItemSchema.validate({ label: 'Exit' });
    expect(valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// Deep nesting
// ---------------------------------------------------------------------------

test('lazy - 15: validates 10 levels of nesting', () => {
    type Node = { v: number; c: Node[] };

    const nodeSchema: SchemaBuilder<Node, true> = object({
        v: number(),
        c: array(lazy(() => nodeSchema))
    });

    // Build a 10-level-deep chain
    let deepNode: Node = { v: 10, c: [] };
    for (let i = 9; i >= 1; i--) {
        deepNode = { v: i, c: [deepNode] };
    }

    const { valid } = nodeSchema.validate(deepNode);
    expect(valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// Lazy in union
// ---------------------------------------------------------------------------

test('lazy - 16: lazy in union — valid first option', () => {
    type Expr = string | Expr[];

    const exprSchema: SchemaBuilder<Expr, true> = union(string()).or(
        array(lazy(() => exprSchema))
    );

    const { valid: v1 } = exprSchema.validate('leaf' as any);
    expect(v1).toEqual(true);

    const { valid: v2 } = exprSchema.validate(['a', 'b'] as any);
    expect(v2).toEqual(true);
});

// ---------------------------------------------------------------------------
// Async validation
// ---------------------------------------------------------------------------

test('lazy - 17: validateAsync delegates correctly', async () => {
    type TreeNode = { value: number; children: TreeNode[] };

    const treeNode: SchemaBuilder<TreeNode, true> = object({
        value: number(),
        children: array(lazy(() => treeNode))
    });

    const data: TreeNode = {
        value: 1,
        children: [{ value: 2, children: [] }]
    };

    const { valid, object: result } = await treeNode.validateAsync(data);
    expect(valid).toEqual(true);
    expect(result).toEqual(data);
    expectTypeOf(result).toBeAny();
});

test('lazy - 18: validateAsync rejects invalid nested data', async () => {
    type TreeNode = { value: number; children: TreeNode[] };

    const treeNode: SchemaBuilder<TreeNode, true> = object({
        value: number(),
        children: array(lazy(() => treeNode))
    });

    const { valid, object: obj } = await treeNode.validateAsync({
        value: 1,
        children: [{ value: 'bad', children: [] }]
    } as any);
    // abstract validateAsync() on the base SchemaBuilder returns Promise<ValidationResult<any>>
    expectTypeOf(obj).toBeAny();
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// parse / safeParse
// ---------------------------------------------------------------------------

test('lazy - 19: parse works via lazy schema', () => {
    const schema = lazy(() => number());
    const parsed = schema.parse(42 as any);
    expect(parsed).toEqual(42);
    expectTypeOf(parsed).toEqualTypeOf<number>();
});

test('lazy - 20: safeParse returns ValidationResult', () => {
    const schema = lazy(() => string());
    const result = schema.safeParse('hello' as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual('hello');
    expectTypeOf(result.object).toEqualTypeOf<string | undefined>();
});

// ---------------------------------------------------------------------------
// introspect
// ---------------------------------------------------------------------------

test('lazy - 21: introspect returns type "lazy" with getter', () => {
    const getter = () => string();
    const schema = lazy(getter);
    const info = schema.introspect();
    expect(info.type).toEqual('lazy');
    expect(info.getter).toBe(getter);
});

// ---------------------------------------------------------------------------
// resolve()
// ---------------------------------------------------------------------------

test('lazy - 22: resolve() returns the inner schema', () => {
    const inner = string();
    const schema = lazy(() => inner);
    expect(schema.resolve()).toBe(inner);
});

test('lazy - 23: resolve() returns same instance on repeated calls', () => {
    const schema = lazy(() => string());
    const r1 = schema.resolve();
    const r2 = schema.resolve();
    expect(r1).toBe(r2);
});

// ---------------------------------------------------------------------------
// Preprocessors and validators on the lazy wrapper itself
// ---------------------------------------------------------------------------

test('lazy - 24: preprocessor on lazy wrapper runs before delegation', () => {
    const schema = lazy(() => string()).addPreprocessor((v: any) =>
        typeof v === 'number' ? String(v) : v
    );
    const { valid, object: result } = schema.validate(42 as any);
    expect(valid).toEqual(true);
    expect(result).toEqual('42');
    expectTypeOf(result).toEqualTypeOf<string | undefined>();
});

test('lazy - 25: validator on lazy wrapper runs', () => {
    const schema = lazy(() => string()).addValidator((v: any) => ({
        valid: v !== 'forbidden',
        errors: v === 'forbidden' ? [{ message: 'value is forbidden' }] : []
    }));
    expect(schema.validate('ok' as any).valid).toEqual(true);
    expect(schema.validate('forbidden' as any).valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// .createFromProps (immutability check via optional())
// ---------------------------------------------------------------------------

test('lazy - 26: optional() returns a new LazySchemaBuilder instance', () => {
    const schema = lazy(() => string());
    const optSchema = schema.optional();
    expect(optSchema).not.toBe(schema);
    expect(optSchema).toBeInstanceOf(LazySchemaBuilder);
    // Original schema still required
    expect(schema.validate(undefined as any).valid).toEqual(false);
    // New schema allows undefined
    expect(optSchema.validate(undefined as any).valid).toEqual(true);
});

// ---------------------------------------------------------------------------
// InferType
// ---------------------------------------------------------------------------

test('lazy - 27: InferType resolves correctly for required and optional schemas', () => {
    const requiredSchema = lazy(() => string());
    expectTypeOf<InferType<typeof requiredSchema>>().toEqualTypeOf<string>();

    const optionalSchema = lazy(() => string()).optional();
    expectTypeOf<InferType<typeof optionalSchema>>().toEqualTypeOf<
        string | undefined
    >();

    const numSchema = lazy(() => number());
    expectTypeOf<InferType<typeof numSchema>>().toEqualTypeOf<number>();
});

// ---------------------------------------------------------------------------
// Constructor guard
// ---------------------------------------------------------------------------

test('lazy - 28: throws when getter is not a function', () => {
    expect(() =>
        LazySchemaBuilder.create({
            type: 'lazy',
            isRequired: true,
            getter: 'not-a-function'
        } as any)
    ).toThrow('getter must be a function');
});

// ---------------------------------------------------------------------------
// Async pre-validation short-circuit paths
// ---------------------------------------------------------------------------

test('lazy - 29: validateAsync returns invalid when pre-validation fails', async () => {
    // A required schema receiving undefined will fail pre-validation
    const schema = lazy(() => string());
    const result = await schema.validateAsync(undefined as any);
    expect(result.valid).toEqual(false);
});

test('lazy - 30: validateAsync with optional + null returns valid without delegating', async () => {
    const schema = lazy(() => string()).optional();
    const result = await schema.validateAsync(null as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeNull();
});

// ---------------------------------------------------------------------------
// Method overrides (hasType, clearHasType, nullable, notNullable, etc.)
// ---------------------------------------------------------------------------

test('lazy - 31: hasType returns a LazySchemaBuilder', () => {
    const schema = lazy(() => string()).hasType<string>();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
    expect(schema.validate('hi' as any).valid).toEqual(true);
});

test('lazy - 32: clearHasType returns a LazySchemaBuilder', () => {
    const schema = lazy(() => string())
        .hasType<string>()
        .clearHasType();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
});

test('lazy - 33: nullable allows null', () => {
    const schema = lazy(() => string()).nullable();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
    expect(schema.validate(null as any).valid).toEqual(true);
});

test('lazy - 34: notNullable returns LazySchemaBuilder', () => {
    const schema = lazy(() => string())
        .nullable()
        .notNullable();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
});

test('lazy - 35: required() on lazy returns LazySchemaBuilder', () => {
    const schema = lazy(() => string())
        .optional()
        .required();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
    expect(schema.validate(undefined as any).valid).toEqual(false);
});

test('lazy - 36: default() provides a fallback value', () => {
    const schema = lazy(() => string())
        .optional()
        .default('fallback');
    const { valid, object } = schema.validate(undefined as any);
    expect(valid).toEqual(true);
    expect(object).toBe('fallback');
});

test('lazy - 37: clearDefault removes the default', () => {
    const schema = lazy(() => string())
        .optional()
        .default('x')
        .clearDefault();
    expect(schema.introspect().hasDefault).toEqual(false);
});

test('lazy - 38: brand() returns a LazySchemaBuilder', () => {
    const schema = lazy(() => number()).brand('LazyBrand');
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
    expect(schema.validate(1 as any).valid).toEqual(true);
});

test('lazy - 39: readonly() returns a LazySchemaBuilder', () => {
    const schema = lazy(() => string()).readonly();
    expect(schema).toBeInstanceOf(LazySchemaBuilder);
    expect(schema.introspect().isReadonly).toEqual(true);
});
