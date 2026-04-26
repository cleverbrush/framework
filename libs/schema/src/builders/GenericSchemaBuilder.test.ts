import { expect, expectTypeOf, test } from 'vitest';

import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { GenericSchemaBuilder, generic } from './GenericSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { SchemaBuilder } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Basic instantiation
// ---------------------------------------------------------------------------

test('generic — creates a GenericSchemaBuilder instance', () => {
    const schema = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    expect(schema).toBeInstanceOf(GenericSchemaBuilder);
    expectTypeOf(schema).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, any, any, any>
    >();
});

test('generic — introspect exposes templateFn and type', () => {
    const fn = <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
        object({ data: s });
    const schema = generic(fn);
    const info = schema.introspect();
    expect(info.type).toBe('generic');
    expect(info.templateFn).toBe(fn);
    expect(info.defaults).toBeUndefined();
    expectTypeOf(info.type).toMatchTypeOf<string>();
    expectTypeOf(info.templateFn).toMatchTypeOf<
        ((...args: any[]) => SchemaBuilder<any, any, any, any, any>) | undefined
    >();
    expectTypeOf(info.defaults).toMatchTypeOf<readonly any[] | undefined>();
});

test('generic — introspect exposes defaults when provided', () => {
    const defaults = [string()];
    const schema = generic(
        defaults,
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const info = schema.introspect();
    expect(info.defaults).toStrictEqual(defaults);
    expectTypeOf(info.defaults).toMatchTypeOf<readonly any[] | undefined>();
});

// ---------------------------------------------------------------------------
// .apply() — returns concrete schema
// ---------------------------------------------------------------------------

test('generic.apply — returns a concrete schema builder', () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(schema: T) =>
            object({ data: schema })
    );
    const concrete = Wrapper.apply(string());
    expect(concrete).toBeInstanceOf(SchemaBuilder);
    expectTypeOf<InferType<typeof concrete>>().toMatchTypeOf<{
        data: string;
    }>();
});

test('generic.apply — concrete schema validates correctly', () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(schema: T) =>
            object({ data: schema })
    );
    const applied = Wrapper.apply(string());
    expectTypeOf<InferType<typeof applied>>().toMatchTypeOf<{ data: string }>();
    const { valid } = applied.validate({ data: 'hello' });
    expect(valid).toBe(true);
});

test('generic.apply — concrete schema rejects invalid values', () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(schema: T) =>
            object({ data: schema })
    );
    const applied = Wrapper.apply(number());
    expectTypeOf<InferType<typeof applied>>().toMatchTypeOf<{ data: number }>();
    const { valid } = applied.validate({
        data: 'not a number'
    } as any);
    expect(valid).toBe(false);
});

test('generic.apply — multiple type parameters', () => {
    const Result = generic(
        <
            T extends SchemaBuilder<any, any, any, any, any>,
            E extends SchemaBuilder<any, any, any, any, any>
        >(
            valueSchema: T,
            errorSchema: E
        ) => object({ ok: boolean(), value: valueSchema, error: errorSchema })
    );

    const concrete = Result.apply(string(), number());
    expectTypeOf<InferType<typeof concrete>>().toMatchTypeOf<{
        ok: boolean;
        value: string;
        error: number;
    }>();
    expect(
        concrete.validate({ ok: true, value: 'hello', error: 42 }).valid
    ).toBe(true);
    expect(
        concrete.validate({ ok: false, value: 42, error: 'msg' } as any).valid
    ).toBe(false);
});

test('generic.apply — each call produces an independent schema', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ item: s })
    );
    const strWrap = Wrap.apply(string());
    const numWrap = Wrap.apply(number());

    expectTypeOf<InferType<typeof strWrap>>().toMatchTypeOf<{ item: string }>();
    expectTypeOf<InferType<typeof numWrap>>().toMatchTypeOf<{ item: number }>();

    expect(strWrap.validate({ item: 'x' }).valid).toBe(true);
    expect(strWrap.validate({ item: 99 } as any).valid).toBe(false);

    expect(numWrap.validate({ item: 99 }).valid).toBe(true);
    expect(numWrap.validate({ item: 'x' } as any).valid).toBe(false);
});

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

test('generic — InferType flows through apply result', () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(schema: T) =>
            object({ data: schema, count: number() })
    );
    const StringWrapper = Wrapper.apply(string());
    type Result = InferType<typeof StringWrapper>;
    expectTypeOf<Result>().toMatchTypeOf<{ data: string; count: number }>();
});

test('generic — apply returns correctly typed builder for object param', () => {
    const Paginated = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
            object({ items: array(itemSchema), total: number() })
    );
    const UserList = Paginated.apply(object({ name: string() }));
    type UserListType = InferType<typeof UserList>;
    expectTypeOf<UserListType>().toMatchTypeOf<{
        items: { name: string }[];
        total: number;
    }>();
});

// ---------------------------------------------------------------------------
// Direct validation with defaults
// ---------------------------------------------------------------------------

test('generic with defaults — validates directly using defaults', () => {
    const AnyList = generic(
        [any()],
        <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
            object({ items: array(itemSchema), total: number() })
    );
    expectTypeOf<InferType<typeof AnyList>>().toMatchTypeOf<{
        items: any[];
        total: number;
    }>();
    const { valid } = AnyList.validate({ items: [1, 'two', true], total: 3 });
    expect(valid).toBe(true);
});

test('generic with defaults — rejects invalid values even with defaults', () => {
    const AnyList = generic(
        [any()],
        <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
            object({ items: array(itemSchema), total: number() })
    );
    expectTypeOf<InferType<typeof AnyList>>().toMatchTypeOf<{
        items: any[];
        total: number;
    }>();
    // total is a number — string should fail
    const { valid } = AnyList.validate({
        items: [],
        total: 'not a number'
    } as any);
    expect(valid).toBe(false);
});

test('generic with defaults — defaults schema is cached across calls', () => {
    let callCount = 0;
    const AnyWrapper = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) => {
            callCount++;
            return object({ data: s });
        }
    );

    expectTypeOf<InferType<typeof AnyWrapper>>().toMatchTypeOf<{
        data: string;
    }>();
    AnyWrapper.validate({ data: 'a' });
    AnyWrapper.validate({ data: 'b' });
    expect(callCount).toBe(1); // template fn called only once
});

// ---------------------------------------------------------------------------
// Direct validation without defaults — should fail with informative error
// ---------------------------------------------------------------------------

test('generic without defaults — validate fails with clear error', () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    expectTypeOf(Wrapper).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, any, any, any>
    >();
    const { valid, errors } = Wrapper.validate({ data: 'x' } as any);
    expect(valid).toBe(false);
    expect(errors?.[0]?.message).toContain('.apply()');
});

// ---------------------------------------------------------------------------
// Fluent chaining — optional / required / nullable
// ---------------------------------------------------------------------------

test('generic.optional — allows undefined', () => {
    const Wrapper = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const opt = Wrapper.optional();
    expectTypeOf(opt).toMatchTypeOf<
        GenericSchemaBuilder<any, false, any, any, any, any>
    >();
    expect(opt.validate(undefined as any).valid).toBe(true);
});

test('generic.required — rejects undefined', () => {
    const Wrapper = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const req = Wrapper.optional().required();
    expectTypeOf(req).toMatchTypeOf<
        GenericSchemaBuilder<any, true, any, any, any, any>
    >();
    expect(req.validate(undefined as any).valid).toBe(false);
});

test('generic.nullable — allows null', () => {
    const Wrapper = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const nul = Wrapper.nullable();
    expectTypeOf(nul).toMatchTypeOf<
        GenericSchemaBuilder<any, any, true, any, any, any>
    >();
    expect(nul.validate(null as any).valid).toBe(true);
});

test('generic — chaining preserves templateFn and defaults', () => {
    const defaults = [number()];
    const fn = <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
        object({ data: s });
    const schema = generic(defaults, fn).optional().required();
    expectTypeOf(schema).toMatchTypeOf<
        GenericSchemaBuilder<any, true, any, any, any, any>
    >();
    const info = schema.introspect();
    expect(info.templateFn).toBe(fn);
    expect(info.defaults).toStrictEqual(defaults);
});

// ---------------------------------------------------------------------------
// async validation
// ---------------------------------------------------------------------------

test('generic — validateAsync with defaults', async () => {
    const AnyList = generic(
        [any()],
        <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
            object({ items: array(itemSchema), total: number() })
    );
    expectTypeOf<InferType<typeof AnyList>>().toMatchTypeOf<{
        items: any[];
        total: number;
    }>();
    const { valid } = await AnyList.validateAsync({
        items: ['a', 'b'],
        total: 2
    });
    expect(valid).toBe(true);
});

test('generic — apply result supports validateAsync', async () => {
    const Wrapper = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const applied = Wrapper.apply(string());
    expectTypeOf<InferType<typeof applied>>().toMatchTypeOf<{ data: string }>();
    const { valid } = await applied.validateAsync({
        data: 'hello'
    });
    expect(valid).toBe(true);
});

// ---------------------------------------------------------------------------
// Introspection after chaining
// ---------------------------------------------------------------------------

test('generic — introspect type is always "generic"', () => {
    const schema = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    ).optional();
    expect(schema.introspect().type).toBe('generic');
    expectTypeOf(schema).toMatchTypeOf<
        GenericSchemaBuilder<any, false, any, any, any, any>
    >();
});

test('generic — isRequired reflects optional/required chain', () => {
    const schema = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    expect(schema.introspect().isRequired).toBe(true);
    expect(schema.optional().introspect().isRequired).toBe(false);
    expect(schema.optional().required().introspect().isRequired).toBe(true);
    expectTypeOf(schema).toMatchTypeOf<
        GenericSchemaBuilder<any, true, any, any, any, any>
    >();
    expectTypeOf(schema.optional()).toMatchTypeOf<
        GenericSchemaBuilder<any, false, any, any, any, any>
    >();
    expectTypeOf(schema.optional().required()).toMatchTypeOf<
        GenericSchemaBuilder<any, true, any, any, any, any>
    >();
});

// ---------------------------------------------------------------------------
// Type-level assertions (InferType)
// ---------------------------------------------------------------------------

test('type — apply(string()) infers { data: string }', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.apply(string());
    const typeCheck: InferType<typeof schema> = { data: 'hello' };
    expectTypeOf(typeCheck).toMatchTypeOf<{ data: string }>();
});

test('type — apply(number()) infers { data: number }', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.apply(number());
    const typeCheck: InferType<typeof schema> = { data: 42 };
    expectTypeOf(typeCheck).toMatchTypeOf<{ data: number }>();
});

test('type — multi-param apply infers combined object type', () => {
    const Result = generic(
        <
            T extends SchemaBuilder<any, any, any, any, any>,
            E extends SchemaBuilder<any, any, any, any, any>
        >(
            v: T,
            e: E
        ) => object({ ok: boolean(), value: v, error: e })
    );
    const schema = Result.apply(string(), number());
    const typeCheck: InferType<typeof schema> = {
        ok: true,
        value: 'x',
        error: 0
    };
    expectTypeOf(typeCheck).toMatchTypeOf<{
        ok: boolean;
        value: string;
        error: number;
    }>();
});

test('type — apply result .optional() infers T | undefined', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.apply(string()).optional();
    const typeCheck: InferType<typeof schema> = undefined;
    expectTypeOf(typeCheck).toMatchTypeOf<{ data: string } | undefined>();
});

test('type — apply result .nullable() infers T | null', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.apply(string()).nullable();
    const typeCheck: InferType<typeof schema> = null;
    expectTypeOf(typeCheck).toMatchTypeOf<{ data: string } | null>();
});

test('type — .optional() on the generic template itself infers TResult | undefined', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.optional();
    const typeCheck: InferType<typeof schema> = undefined;
    expectTypeOf(typeCheck).toMatchTypeOf<{ data: string } | undefined>();
});

test('type — .hasType<T>() overrides inferred type', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const schema = Wrap.apply(string()).hasType<{ custom: true }>();
    const typeCheck: InferType<typeof schema> = { custom: true };
    expectTypeOf(typeCheck).toMatchTypeOf<{ custom: true }>();
});

test('type — PaginatedList apply infers nested array element type', () => {
    const PaginatedList = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
            object({ items: array(itemSchema), total: number() })
    );
    const schema = PaginatedList.apply(object({ name: string() }));
    type ResultType = InferType<typeof schema>;
    const typeCheck: ResultType = { items: [{ name: 'Alice' }], total: 1 };
    expectTypeOf(typeCheck).toMatchTypeOf<{
        items: { name: string }[];
        total: number;
    }>();
});

test('type — GenericSchemaBuilder is assignable to SchemaBuilder', () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const ref: SchemaBuilder<any, any, any, any, any> = Wrap;
    expectTypeOf(ref).toMatchTypeOf<SchemaBuilder<any, any, any, any, any>>();
});

// ---------------------------------------------------------------------------
// Fluent chaining — notNullable / default / clearDefault / brand / readonly
// ---------------------------------------------------------------------------

test('generic.notNullable — removes nullable flag', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const nul = Wrap.nullable();
    const notNul = nul.notNullable();
    expectTypeOf(notNul).toMatchTypeOf<
        GenericSchemaBuilder<any, any, false, any, any, any>
    >();
    expect(notNul.validate(null as any).valid).toBe(false);
});

test('generic.default — provides a fallback value for optional', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const withDefault = Wrap.optional().default({ data: 'fallback' });
    expectTypeOf(withDefault).toMatchTypeOf<
        GenericSchemaBuilder<any, true, any, any, true, any>
    >();
    const info = withDefault.introspect();
    expect(info.hasDefault).toBe(true);
});

test('generic.clearDefault — removes default value', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const withDefault = Wrap.optional().default({ data: 'fallback' });
    const cleared = withDefault.clearDefault();
    expectTypeOf(cleared).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, any, false, any>
    >();
    expect(cleared.introspect().hasDefault).toBe(false);
});

test('generic.brand — brands the type', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const branded = Wrap.brand<'MyBrand'>();
    expectTypeOf(branded).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, any, any, any>
    >();
    // brand() returns a new instance
    expect(branded !== (Wrap as any)).toBe(true);
});

test('generic.readonly — marks schema as readonly', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const ro = Wrap.readonly();
    expectTypeOf(ro).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, any, any, any>
    >();
    expect(ro.introspect().isReadonly).toBe(true);
});

test('generic.clearHasType — removes explicit type override', () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const typed = Wrap.hasType<{ custom: boolean }>();
    const cleared = typed.clearHasType();
    expectTypeOf(cleared).toMatchTypeOf<
        GenericSchemaBuilder<any, any, any, undefined, any, any>
    >();
    expect(cleared.introspect().type).toBe('generic');
});

// ---------------------------------------------------------------------------
// async validation — edge cases (null/undefined early returns, no-defaults error)
// ---------------------------------------------------------------------------

test('generic — validateAsync(undefined) on optional schema returns valid', async () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    ).optional();
    const { valid } = await Wrap.validateAsync(undefined as any);
    expect(valid).toBe(true);
});

test('generic — validateAsync(null) on nullable schema returns valid', async () => {
    const Wrap = generic(
        [string()],
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    ).nullable();
    const { valid } = await Wrap.validateAsync(null as any);
    expect(valid).toBe(true);
});

test('generic — validateAsync without defaults fails with clear error', async () => {
    const Wrap = generic(
        <T extends SchemaBuilder<any, any, any, any, any>>(s: T) =>
            object({ data: s })
    );
    const { valid, errors } = await Wrap.validateAsync({ data: 'x' } as any);
    expect(valid).toBe(false);
    expect(errors?.[0]?.message).toContain('.apply()');
});
