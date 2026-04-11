# @cleverbrush/schema

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![Standard Schema v1](https://img.shields.io/badge/Standard%20Schema-v1-blue)](https://standardschema.dev/)
<!-- bundle-badge-start -->
[![Bundle size](https://img.shields.io/badge/bundle-19.6%20KB%20gzip-green)](https://github.com/cleverbrush/framework/blob/master/libs/schema)
<!-- bundle-badge-end -->
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-97.2%25-brightgreen)
<!-- coverage-badge-end -->

A schema definition and validation library for TypeScript — faster than Zod in 14/15 benchmarks (up to 204× faster on invalid input), 3× smaller than Zod v4, and compatible with 50+ ecosystem tools via [Standard Schema v1](https://standardschema.dev/).

Define a schema **once** and get TypeScript type inference, runtime validation, object mapping ([`@cleverbrush/mapper`](../mapper)), auto-generated React forms ([`@cleverbrush/react-form`](../react-form)), and bidirectional JSON Schema conversion ([`@cleverbrush/schema-json`](../schema-json)) — all from the same immutable, fluent API.

## Why @cleverbrush/schema?

**The problem:** In a typical TypeScript project, types and runtime validation are separate concerns. You define a `User` type in one file, then write Joi / Yup / Zod schemas (or manual `if` checks) in another. Over time these drift apart — the type says a field is required, but the validation allows it to be `undefined`. Tests pass, but production data breaks because the validation didn't match the type.

**The solution:** `@cleverbrush/schema` lets you define a schema **once** and derive both the TypeScript type (via `InferType`) and runtime validation from the same source. Because every method returns a **new builder instance** (immutability), you can safely compose and extend schemas without accidentally mutating shared definitions.

**What makes it different from Zod / Yup / Joi:**

- **PropertyDescriptors** — a runtime descriptor tree that every tool in the ecosystem can introspect. The [`@cleverbrush/mapper`](../mapper) uses it for type-safe property selectors. The [`@cleverbrush/react-form`](../react-form) uses it to auto-generate form fields with correct validation. This makes the schema library a **foundation** for an entire ecosystem — not just a standalone validation tool. No other popular schema library exposes this level of runtime metadata.
- **Standard Schema v1** — the `['~standard']` getter is implemented on every builder. That means your schema works as-is with tRPC, TanStack Form, React Hook Form, T3 Env, Hono, Elysia, next-safe-action, and every other [Standard Schema consumer](https://standardschema.dev/).
- **Extension system** — add custom methods to any builder type (`string`, `number`, `date`, …) via `defineExtension()` + `withExtensions()`. Extensions are fully typed, chainable, composable, and appear in `introspect()`. No other popular schema library offers a comparable type-safe plugin system.
- **Built-in extension pack** — common validators like `email()`, `url()`, `uuid()`, `ip()`, `trim()`, `positive()`, `negative()`, `nonempty()`, `unique()`, and more are included out of the box. The default import has them pre-applied; import from `@cleverbrush/schema/core` to get bare builders without extensions.
- **14 KB gzipped (full) — 3× smaller than Zod v4** — sub-path imports (`@cleverbrush/schema/string`, `/number`, `/object`, `/array`) drop individual builders to ~4 KB.
- **First-class nullable support** — `.nullable()` and `.notNullable()` are native methods on every builder. The inferred type automatically includes or excludes `null`, and `introspect()` exposes `isNullable` for runtime metadata.
- **JSDoc comment preservation** — JSDoc comments on schema properties carry through to the inferred TypeScript type, so IDE tooltips and autocomplete descriptions come from the schema definition itself.
- **Zero runtime dependencies.**

| Feature | @cleverbrush/schema | Zod | Yup | Joi |
| --- | --- | --- | --- | --- |
| TypeScript type inference | ✓ | ✓ | ~ | ✗ |
| [Standard Schema v1](https://standardschema.dev/) | ✓ | ✓ | ✗ | ✗ |
| **PropertyDescriptors** (runtime introspection) | ✓ | ✗ | ✗ | ✗ |
| **Type-safe extension system** | ✓ | ✗ | ✗ | ✗ |
| **Built-in object mapper** | ✓ | ✗ | ✗ | ✗ |
| **Built-in form generation** | ✓ | ✗ | ✗ | ✗ |
| Bidirectional JSON Schema | ✓ | ~ (output only) | ✗ | ✗ |
| **External schema interop** (`extern()`) | ✓ | ✗ | ✗ | ✗ |
| JSDoc preservation | ✓ | ✗ | ✗ | ✗ |
| Immutable schemas | ✓ | ✓ | ✗ | ✗ |
| Zero dependencies | ✓ | ✓ | ✗ | ✗ |
| Sync + async validation | ✓ | ✓ | ✓ | ✓ |
| Per-property error inspection | ✓ | ~ | ~ | ~ |
| Default values | ✓ | ✓ | ✓ | ✓ |
| Bundle size (full, gzipped) | **14 KB** | 41 KB (v4) | ~19 KB | ~26 KB |

## Installation

```bash
npm install @cleverbrush/schema
```

## Quick Start

[▶ Open in Playground](https://docs.cleverbrush.com/playground/quick-start)

```typescript
import {
    object,
    string,
    number,
    boolean,
    InferType
} from '@cleverbrush/schema';

// 1. Define a schema with fluent constraints
const UserSchema = object({
    name: string().nonempty('Name is required').minLength(2, 'Name must be at least 2 characters'),
    email: string().email('Please enter a valid email'),
    age: number().min(0, 'Age cannot be negative').max(150).positive(),
    isActive: boolean()
});

// 2. TypeScript type is inferred automatically — no duplication!
type User = InferType<typeof UserSchema>;
// Equivalent to: { name: string; email: string; age: number; isActive: boolean }

// 3. Validate data at runtime — synchronous by default
const result = UserSchema.validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    isActive: true
});

// Or use validateAsync() when you have async validators/preprocessors
// const result = await UserSchema.validateAsync({ ... });

if (result.valid) {
    console.log('Validated:', result.object); // typed as User
} else {
    // For object schemas, prefer getErrorsFor() for per-property error inspection:
    const nameErrors = result.getErrorsFor((p) => p.name);
    console.log(nameErrors.isValid); // false
    console.log(nameErrors.errors); // ['Name must be at least 2 characters']

    // result.errors on object schemas is deprecated — use getErrorsFor() instead
    console.log('Errors:', result.errors);
    // Array of { message: string }
}
```

Type inference works in plain JavaScript too, using JSDoc:

```javascript
/**
 * @type {import('@cleverbrush/schema').InferType<typeof UserSchema>}
 */
const user = {
    // type is inferred as { name: string; email: string; age: number; isActive: boolean }
};
```

## Schema Types

[▶ Open in Playground](https://docs.cleverbrush.com/playground/schema-types)

The following builder functions are available:

| Function        | Description                                       | Key Methods                                                     |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `any()`         | Any value. Similar to TypeScript's `any` type.    | `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`, `.addValidator(fn)`                              |
| `string()`      | String value with constraints.                    | `.minLength(n)`, `.maxLength(n)`, `.matches(re)`, `.email()`, `.url()`, `.uuid()`, `.ip()`, `.trim()`, `.toLowerCase()`, `.nonempty()`, `.oneOf(...values)`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `number()`      | Numeric value with constraints.                   | `.min(n)`, `.max(n)`, `.integer()`, `.positive()`, `.negative()`, `.finite()`, `.multipleOf(n)`, `.coerce()`, `.oneOf(...values)`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `boolean()`     | Boolean value.                                    | `.coerce()`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`                                                   |
| `date()`        | JavaScript `Date` instance.                       | `.coerce()`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`                                                   |
| `func()`        | Function value. Supports typed parameter and return-type schemas. | `.addParameter(schema)`, `.hasReturnType(schema)`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `promise(schema?)` | JavaScript `Promise`. Optionally typed resolved value via `promise(schema)` or `.hasResolvedType(schema)`. | `.hasResolvedType(schema)`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `nul()`         | Exactly `null`. Useful in nullable unions.        | `.optional()`, `.default(value)`                                                   |
| `object(props)` | Object with typed properties. Supports nesting.   | `.validate(data)`, `.addProps({...})`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`            |
| `array()`       | Array with optional element schema (via `.of()`). | `.minLength(n)`, `.maxLength(n)`, `.of(schema)`, `.nonempty()`, `.unique()`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `tuple([...schemas])` | Fixed-length array with per-position types. Each index validated against its own schema — mirrors TypeScript tuple types. | `.rest(schema)`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `record(keySchema, valSchema)` | Object with dynamic string keys. Every key must satisfy `keySchema` (a string schema) and every value must satisfy `valSchema` — mirrors TypeScript's `Record<K, V>`. | `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`, `.addValidator(fn)` |
| `union(schema)` | Union of schemas — e.g. `string \| number`.       | `.or(schema)`, `.validate(data)`, `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`                 |
| `enumOf(...values)` | String enum — sugar for `string().oneOf(...)`. | `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)` |
| `lazy(getter)`  | Recursive/self-referential schema. The getter is called once and its result is cached. Enables tree structures, linked lists, and other recursive types. | `.resolve()`, `.optional()`, `.addValidator(fn)`, `.default(value)` |
| `generic(fn)`   | Parameterized schema template. Call `.apply(...schemas)` with concrete schemas to obtain a fully typed concrete schema builder. TypeScript infers the result type from the template function's own generic signature. Optionally pass a `defaults` array as the first argument to enable direct validation without calling `.apply()`. | `.apply(...schemas)`, `.optional()`, `.nullable()`, `.default(value)` |
| `interpolatedString(objectSchema, templateFn)` | Validates a string against a template pattern and parses it into a strongly-typed object. Property schemas handle their own coercion (e.g. `number().coerce()`). | `.optional()`, `.nullable()`, `.default(value)`, `.readonly()`, `.brand()` |

## Immutability

[▶ Open in Playground](https://docs.cleverbrush.com/playground/immutability)

All schema builders are immutable. Every method call returns a **new** schema builder instance, so existing schemas are never modified:

```typescript
const base = string().minLength(1);
const strict = base.maxLength(50); // new instance — base is unchanged
const loose = base.optional(); // another new instance

// base still only has minLength(1)
// strict has minLength(1) + maxLength(50)
// loose has minLength(1) + optional
```

This is especially powerful when building a library of reusable schema fragments:

```typescript
const Email = string().minLength(5).maxLength(255);
const Name = string().minLength(1).maxLength(100);

const CreateUser = object({ name: Name, email: Email });
const UpdateUser = object({ name: Name.optional(), email: Email.optional() });
// Both schemas share the same base constraints but differ in optionality
```

## Composing Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/composing-schemas)

Schemas can be extended with additional properties, combined with unions, or nested inside arrays and objects:

```typescript
import { object, string, number, array, union } from '@cleverbrush/schema';

// Extend an existing schema with new properties
const BaseEntity = object({
    id: string(),
    createdAt: string()
});

const UserEntity = BaseEntity.addProps({
    name: string().minLength(2),
    email: string().minLength(5)
});

// Nest objects inside arrays
const TeamSchema = object({
    name: string().minLength(1),
    members: array().of(UserEntity).minLength(1).maxLength(50)
});

// Union types
const IdOrEmail = union(string().minLength(1)).or(
    string().matches(/^[^@]+@[^@]+$/)
);
```

## Generic Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/generic-basic)

Use `generic(fn)` to create a reusable, parameterized schema template. The template function accepts one or more schema builders as arguments and returns a concrete schema. Call `.apply(...schemas)` to instantiate the template — TypeScript infers the resulting type automatically from the function's own generic signature.

**Single type parameter** — a paginated list that works for any element type:

```typescript
import {
    generic, object, array, number, string,
    type SchemaBuilder, type InferType
} from '@cleverbrush/schema';

const PaginatedList = generic(
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({
            items: array(itemSchema),
            total: number(),
            page:  number(),
        })
);

const PaginatedUsers = PaginatedList.apply(
    object({ name: string(), age: number() })
);

type PaginatedUsersType = InferType<typeof PaginatedUsers>;
// → { items: { name: string; age: number }[]; total: number; page: number }

PaginatedUsers.validate({
    items: [{ name: 'Alice', age: 30 }],
    total: 1,
    page:  1,
}); // { valid: true }
```

**Multiple type parameters** — a Result / Either type:

```typescript
import {
    generic, object, boolean, string, number,
    type SchemaBuilder, type InferType
} from '@cleverbrush/schema';

const Result = generic(
    <
        T extends SchemaBuilder<any, any, any, any, any>,
        E extends SchemaBuilder<any, any, any, any, any>
    >(
        valueSchema: T,
        errorSchema: E
    ) =>
        object({
            ok:    boolean(),
            value: valueSchema.optional(),
            error: errorSchema.optional(),
        })
);

const StringResult = Result.apply(string(), number());
// InferType → { ok: boolean; value?: string; error?: number }

StringResult.validate({ ok: true,  value: 'hello' }); // valid
StringResult.validate({ ok: false, error: 404 });     // valid
```

**Default arguments** — pass a `defaults` array as the first argument so the template can be validated directly without calling `.apply()` first:

```typescript
import {
    generic, object, array, number, any,
    type SchemaBuilder
} from '@cleverbrush/schema';

const AnyList = generic(
    [any()],  // default for the single type parameter
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({ items: array(itemSchema), total: number() })
);

// Validate directly — uses the any() default
AnyList.validate({ items: [1, 'two', true], total: 3 }); // valid

// Or apply a stricter schema first
AnyList.apply(string()).validate({ items: ['a', 'b'], total: 2 }); // valid
```

> **Tip:** Each call to `.apply()` returns an independent schema builder. You can chain `.optional()`, `.addValidator()`, `.default(value)`, and every other fluent method on the result.

## Function Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/function-schema)

Use `func()` to validate that a value is a function. Two fluent methods let you annotate the expected signature — the inferred TypeScript type reflects both the parameter types and the return type:

- **`.addParameter(schema)`** — appends a parameter schema. Each call extends the inferred tuple of parameter types. The schemas are accessible at runtime via `introspect().parameters`.
- **`.hasReturnType(schema)`** — sets the return type schema. The inferred function type gains a concrete return type instead of `any`. Accessible via `introspect().returnType`.

```typescript
import { func, string, number, boolean, InferType } from '@cleverbrush/schema';

// Plain function validator — accepts any () => any
const anyFn = func();
anyFn.validate(() => 42);   // { valid: true }
anyFn.validate('not a fn'); // { valid: false }

// Typed parameter and return type
const greet = func()
    .addParameter(string())             // first param: string
    .addParameter(number().optional())  // second param: number | undefined
    .hasReturnType(string());           // return type: string

// InferType preserves the declared parameter types and return type.
// Function schemas also remain compatible with callbacks of any arity.
type Greet = InferType<typeof greet>;
// → (param0: string, param1: number | undefined, ...args: any[]) => string

// Introspect at runtime
const info = greet.introspect();
// info.parameters  → [StringSchemaBuilder, NumberSchemaBuilder]
// info.returnType  → StringSchemaBuilder

// Optional function schemas infer a union with undefined
const optionalHandler = func()
    .addParameter(string())
    .addParameter(boolean())
    .hasReturnType(boolean())
    .optional();

type OptionalHandler = InferType<typeof optionalHandler>;
// → ((param0: string, param1: boolean, ...args: any[]) => boolean) | undefined
```

## Constructor Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/constructor-schema)

Use `.addConstructor(funcSchema)` on an `object()` schema to declare one or more constructor overloads. Each call appends a `FunctionSchemaBuilder` to an accumulated list; the inferred TypeScript type becomes an intersection of all construct signatures and the plain instance type.

- **`.addConstructor(funcSchema)`** — appends a constructor overload. Each call extends the inferred tuple of constructor schemas. Chainable.
- **`.clearConstructors()`** — resets constructor schemas to an empty list, removing all construct signatures from the inferred type.
- **`introspect().constructorSchemas`** — array of all accumulated constructor `FunctionSchemaBuilder` schemas.

Constructor signatures are **type-only**: runtime `validate()` continues to validate plain objects as before.

```typescript
import { object, func, string, number, InferType } from '@cleverbrush/schema';

// Single constructor overload
const PersonSchema = object({ name: string(), age: number() })
    .addConstructor(func().addParameter(string()));

type Person = InferType<typeof PersonSchema>;
// → { new(p0: string): { name: string; age: number } } & { name: string; age: number }

// Multiple chained constructors → overloaded construct signatures
const FlexPersonSchema = object({ name: string(), age: number() })
    .addConstructor(func().addParameter(string()))
    .addConstructor(func().addParameter(string()).addParameter(number()));

type FlexPerson = InferType<typeof FlexPersonSchema>;
// → { new(p0: string): { name: string; age: number } }
// & { new(p0: string, p1: number): { name: string; age: number } }
// & { name: string; age: number }

// Runtime validation is unchanged — plain objects still validate
FlexPersonSchema.validate({ name: 'Alice', age: 30 }); // { valid: true }

// Introspect constructor schemas at runtime
const { constructorSchemas } = FlexPersonSchema.introspect();
// constructorSchemas.length → 2

// Remove all constructor signatures
const PlainSchema = FlexPersonSchema.clearConstructors();
type Plain = InferType<typeof PlainSchema>;
// → { name: string; age: number }
```

## Promise Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/promise-schema)

Use `promise()` to validate that a value is a JavaScript `Promise`. Pass an optional schema to type the resolved value — the inferred TypeScript type becomes `Promise<T>`. You can also call `.hasResolvedType(schema)` on the returned builder to set or replace the resolved-value schema.

- **`promise(schema?)`** — factory shorthand. When `schema` is provided the inferred type is `Promise<InferType<typeof schema>>`.
- **`.hasResolvedType(schema)`** — sets the resolved-value schema; replaces any previously set one. Accessible via `introspect().resolvedType`.

```typescript
import { promise, string, number, InferType } from '@cleverbrush/schema';

// Untyped — validates that the value is any Promise
const anyPromise = promise();
anyPromise.validate(Promise.resolve(42));     // { valid: true }
anyPromise.validate('not a promise' as any); // { valid: false }

// Typed resolved value via factory argument
const stringPromise = promise(string());
type StringPromise = InferType<typeof stringPromise>;
// → Promise<string>

// Typed resolved value via fluent method
const numPromise = promise().hasResolvedType(number());
type NumPromise = InferType<typeof numPromise>;
// → Promise<number>

// Introspect at runtime
const info = numPromise.introspect();
// info.resolvedType → NumberSchemaBuilder

// Optional promise — undefined is also accepted
const optPromise = promise(string()).optional();
type OptPromise = InferType<typeof optPromise>;
// → Promise<string> | undefined

optPromise.validate(undefined as any); // { valid: true }
```

## Record Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/record-basics)

Use `record(keySchema, valueSchema)` to validate objects with **dynamic string keys** — lookup tables, i18n bundles, caches, or any `Record<string, V>` shape. Unlike `object()`, which requires a fixed set of known property names, `record()` validates objects whose keys are not known at schema-definition time.

Both the key and the value schema are enforced at runtime, and the inferred TypeScript type mirrors `Record<K, V>`.

```typescript
import { record, string, number, object, InferType } from '@cleverbrush/schema';

// ── Basic: string keys → number values ──────────────────────────────────────
const scores = record(string(), number().min(0).max(100));
// InferType<typeof scores> → Record<string, number>

scores.validate({ alice: 95, bob: 87 }); // { valid: true }
scores.validate({ alice: 95, bob: -1 }); // { valid: false } — negative score

// ── Key constraint — only locale-style keys allowed ──────────────────────────
const i18n = record(
    string().matches(/^[a-z]{2}(-[A-Z]{2})?$/),
    string().nonempty()
);

i18n.validate({ en: 'Hello', 'fr-FR': 'Bonjour' }); // { valid: true }
i18n.validate({ '123': 'oops' });                     // { valid: false } — bad key

// ── Nested: values are objects ───────────────────────────────────────────────
const userMap = record(
    string(),
    object({ name: string(), age: number() })
);
// InferType<typeof userMap> → Record<string, { name: string; age: number }>

// ── Optional with factory default ────────────────────────────────────────────
const cache = record(string(), number()).optional().default(() => ({}));

// ── getErrorsFor(key) — rich per-key result with descriptor ────────────────────
const schema = record(string(), number().min(0));
const result = schema.validate(
    { a: 1, b: -2, c: -3 },
    { doNotStopOnFirstError: true }
);

if (!result.valid) {
    // Root-level errors (e.g. 'object expected')
    const root = result.getErrorsFor();
    console.log(root.isValid);  // false if the container itself is invalid

    // Per-key errors
    const bResult = result.getErrorsFor('b');
    console.log(bResult.isValid);    // false
    console.log(bResult.errors[0]);  // 'the value must be >= 0'
    console.log(bResult.seenValue);  // -2

    // Descriptor: read/write the entry on the original object
    const descriptor = bResult.descriptor;
    console.log(descriptor.key);        // 'b'
    descriptor.getSchema();             // → NumberSchemaBuilder
    descriptor.getValue(result.object); // → { success: true, value: -2 }
    descriptor.setValue(result.object, 0); // fixes the value in-place
}
```

## Interpolated String Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/interpolated-string-basic)

Use `interpolatedString(objectSchema, templateFn)` to validate a string against a template pattern and parse it into a strongly-typed object. The template expression uses a tagged-template syntax with type-safe property selectors — you get full IntelliSense in the selector lambdas.

```typescript
import { interpolatedString, object, string, number, type InferType } from '@cleverbrush/schema';

const RouteSchema = interpolatedString(
    object({ userId: string().uuid(), id: number().coerce() }),
    $t => $t`/orders/${t => t.id}/${t => t.userId}`
);

type Route = InferType<typeof RouteSchema>;
// { userId: string; id: number }

const result = RouteSchema.validate('/orders/42/550e8400-e29b-41d4-a716-446655440000');
// result.valid === true
// result.object === { id: 42, userId: '550e8400-...' }
```

**Nested objects** — navigate deep properties via `t => t.parent.child`:

```typescript
const schema = interpolatedString(
    object({
        order: object({ id: number().coerce() }),
        user:  object({ name: string() })
    }),
    $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
);
// InferType → { order: { id: number }; user: { name: string } }

schema.validate('/orders/42/by/Alice');
// { valid: true, object: { order: { id: 42 }, user: { name: 'Alice' } } }
```

**Coercion** is the property schema's responsibility — the builder passes the raw captured substring directly to each property schema's `validate()`. Use `.coerce()` on `number()`, `boolean()`, or `date()` to convert from strings:

```typescript
const LogEntry = interpolatedString(
    object({
        level:   string(),
        ts:      date().coerce(),
        message: string()
    }),
    $t => $t`[${t => t.level}] ${t => t.ts} ${t => t.message}`
);
```

Error messages include the property path for easy debugging:

```typescript
const result = RouteSchema.validate('/orders/abc/bad-uuid');
// result.errors[0].message → "id: expected an integer number"
```

## Coercion

The `number()`, `boolean()`, and `date()` builders each have a `.coerce()` method that adds a preprocessor to convert string values to the target type. This is especially useful with interpolated string schemas where captured segments are always strings, but also works standalone for URL parameters, form inputs, or any other string source.

```typescript
import { number, boolean, date } from '@cleverbrush/schema';

// number().coerce() — uses Number(value)
number().coerce().validate('42');    // { valid: true, object: 42 }
number().coerce().validate('hello'); // { valid: false } — NaN fails

// boolean().coerce() — "true" → true, "false" → false
boolean().coerce().validate('true');  // { valid: true, object: true }
boolean().coerce().validate('yes');   // { valid: false } — unrecognized

// date().coerce() — new Date(value) if valid
date().coerce().validate('2024-01-15'); // { valid: true, object: Date }
date().coerce().validate('nope');       // { valid: false } — invalid date
```

Non-string values pass through unchanged, so `.coerce()` is safe to chain even when the input might already be the correct type. All three methods return a new immutable schema instance.

## Recursive Schemas

[▶ Open in Playground](https://docs.cleverbrush.com/playground/recursive-schemas)

Use `lazy(() => schema)` to define recursive or self-referential schemas — tree structures, comment threads, nested menus, org charts, and any other type that refers to itself.

The getter function is called **once** on first validation, and the resolved schema is cached. Every subsequent call reuses the cache.

> **TypeScript limitation:** TypeScript cannot infer recursive types automatically. You must provide an explicit type annotation on the variable holding the schema.

```typescript
import {
    object,
    string,
    number,
    array,
    lazy,
    type SchemaBuilder
} from '@cleverbrush/schema';

// ── Tree structure ───────────────────────────────────────────────
type TreeNode = { value: number; children: TreeNode[] };

// Explicit annotation required — TypeScript can't infer recursive types
const treeNode: SchemaBuilder<TreeNode, true> = object({
    value: number(),
    children: array(lazy(() => treeNode))
});

treeNode.validate({
    value: 1,
    children: [
        { value: 2, children: [] },
        { value: 3, children: [{ value: 4, children: [] }] }
    ]
});
// { valid: true, object: { value: 1, children: [...] } }

// ── Comment thread ───────────────────────────────────────────────
type Comment = { text: string; replies: Comment[] };

const commentSchema: SchemaBuilder<Comment, true> = object({
    text: string(),
    replies: array(lazy(() => commentSchema))
});

// ── Navigation menu with optional sub-levels ─────────────────────
type MenuItem = { label: string; submenu?: MenuItem[] };

const menuItem: SchemaBuilder<MenuItem, true> = object({
    label: string(),
    submenu: array(lazy(() => menuItem)).optional()
});
```

`lazy()` is fully compatible with `.optional()`, `.addPreprocessor()`, `.addValidator()`, and all other fluent methods. The wrapper's own preprocessors and validators run before delegating to the resolved schema.

```typescript
// Preprocessors and validators work on the lazy wrapper itself
const schema = lazy(() => string())
    .addPreprocessor((v) => (typeof v === 'number' ? String(v) : v))
    .addValidator((v) => ({ valid: v !== 'forbidden' }));
```

## Discriminated Unions

[▶ Open in Playground](https://docs.cleverbrush.com/playground/discriminated-unions)

Some libraries ship a dedicated `.discriminator()` API for tagged unions. With `@cleverbrush/schema` you don't need one — `union()` combined with **string-literal schemas** gives you the same pattern naturally, with full type inference.

Use `string('literal')` for the discriminator field. Each branch of the union gets its own object schema whose discriminator can only match one exact value. TypeScript narrows the inferred type automatically:

```typescript
import { object, string, number, union, type InferType } from '@cleverbrush/schema';

// Each variant has a literal "type" field acting as the discriminator
const Circle = object({
    type:   string('circle'),
    radius: number().min(0)
});

const Rectangle = object({
    type:   string('rectangle'),
    width:  number().min(0),
    height: number().min(0)
});

const Triangle = object({
    type:   string('triangle'),
    base:   number().min(0),
    height: number().min(0)
});

// Combine with union() — no special .discriminator() call needed
const ShapeSchema = union(Circle).or(Rectangle).or(Triangle);

type Shape = InferType<typeof ShapeSchema>;
// Shape is automatically:
//   | { type: 'circle';    radius: number }
//   | { type: 'rectangle'; width: number; height: number }
//   | { type: 'triangle';  base: number;  height: number }

// Validation picks the matching branch by the literal field
const result = ShapeSchema.validate({ type: 'circle', radius: 5 });
```

### Real-World Example: Job Scheduler

The `@cleverbrush/scheduler` library uses this exact pattern to validate job schedules. The `every` field acts as the discriminator, and each variant adds its own set of allowed properties:

```typescript
import { object, string, number, array, date, union, type InferType } from '@cleverbrush/schema';

// Shared base with common schedule fields
const ScheduleBase = object({
    interval: number().min(1).max(356),
    hour:     number().min(0).max(23).optional(),
    minute:   number().min(0).max(59).optional(),
    startsOn: date().acceptJsonString().optional(),
    endsOn:   date().acceptJsonString().optional()
});

// Minute schedule — omit hour/minute (they don't apply)
const EveryMinute = ScheduleBase
    .omit('hour').omit('minute')
    .addProps({ every: string('minute') });

// Day schedule
const EveryDay = ScheduleBase
    .addProps({ every: string('day') });

// Week schedule — adds dayOfWeek array
const EveryWeek = ScheduleBase.addProps({
    every:     string('week'),
    dayOfWeek: array().of(number().min(1).max(7)).minLength(1).maxLength(7)
});

// Month schedule — adds day (number or 'last')
const EveryMonth = ScheduleBase.addProps({
    every: string('month'),
    day:   union(string('last')).or(number().min(1).max(28))
});

// Combine all variants in a single union
const ScheduleSchema = union(EveryMinute)
    .or(EveryDay)
    .or(EveryWeek)
    .or(EveryMonth);

type Schedule = InferType<typeof ScheduleSchema>;
// TypeScript infers a proper discriminated union on "every"
```

Because each branch uses a string literal (`string('minute')`, `string('day')`, etc.) for the `every` field, TypeScript can narrow the full union based on that single property — exactly like zod's `z.discriminatedUnion()`, but without any extra API surface.

## JSDoc Comment Preservation

When you define an object schema, JSDoc comments on properties are preserved in the inferred TypeScript type. This means your IDE tooltips, hover documentation, and autocomplete descriptions all carry through from the schema definition — no need to maintain separate documentation:

```typescript
const UserSchema = object({
    /** Full display name of the user */
    name: string().minLength(1).maxLength(200),
    /** Contact email — must be unique across all users */
    email: string().minLength(5),
    /** Age in years. Must be a positive integer. */
    age: number().min(0).max(150)
});

type User = InferType<typeof UserSchema>;
// Hovering over User.name in your IDE shows:
//   "Full display name of the user"
// Hovering over User.email shows:
//   "Contact email — must be unique across all users"
```

## Deep Partial

[▶ Open in Playground](https://docs.cleverbrush.com/playground/deep-partial)

`.deepPartial()` recursively marks **all properties at every nesting level** as optional. It is the deep-object equivalent of a common `DeepPartial<T>` helper type in TypeScript, and is the recommended way to build PATCH API bodies or partial form state.

| Schema type | Effect |
|-------------|--------|
| `object(…).deepPartial()` | All top-level and nested object properties become optional |
| Nested `object(…)` inside an object | Recursed — its properties are made optional too |
| `array(…)`, `union(…)`, primitives | The property itself is made optional; internals are **not** modified |

```typescript
import { object, string, number, array, type InferType } from '@cleverbrush/schema';

const CreateUser = object({
    name:    string(),
    address: object({
        street: string(),
        city:   string()
    })
});

const PatchUser = CreateUser.deepPartial();

type PatchUserPayload = InferType<typeof PatchUser>;
// {
//   name?:    string;
//   address?: { street?: string; city?: string };
// }

// All three are valid:
PatchUser.validate({});                          // { valid: true }
PatchUser.validate({ address: {} });             // { valid: true }
PatchUser.validate({ address: { city: 'Paris' } }); // { valid: true }
```

Contrast with `.partial()`, which only affects the top level:

```typescript
const ShallowPartial = CreateUser.partial();
// { name?: string; address?: { street: string; city: string } }
//                                        ↑ still required inside

ShallowPartial.validate({ address: {} });
// { valid: false } — street and city are still required
```

Chains naturally with other modifiers:

```typescript
const Schema = CreateUser.deepPartial().readonly();
type T = InferType<typeof Schema>;
// Readonly<{ name?: string; address?: { street?: string; city?: string } }>
```

> **Note:** `.deepPartial()` recurses only into nested `object()` schemas. Array element schemas and union option schemas are not modified — `array(object({…}))` becomes an optional array but its element shape is unchanged. If you need deep-partialed array elements, apply `.deepPartial()` to the element schema before passing it to `array()`:
> ```typescript
> array(InnerSchema.deepPartial()).optional()
> ```

## Validation

[▶ Open in Playground](https://docs.cleverbrush.com/playground/validation-errors)

Every schema builder has two validation methods:

- **`validate(data)`** — synchronous. Returns a `ValidationResult` directly. Throws if any preprocessor, validator, or error message provider returns a Promise.
- **`validateAsync(data)`** — asynchronous. Returns a `Promise<ValidationResult>`. Supports async preprocessors, validators, and error message providers.

Use `validate()` by default for the best performance. Switch to `validateAsync()` only when your schema includes async operations (e.g. database lookups, API calls in validators).

```typescript
// Synchronous validation (default — use when all validators are sync)
const result = UserSchema.validate(someObject);

if (result.valid) {
    console.log(result.object); // typed as InferType<typeof UserSchema>
} else {
    // For object schemas, prefer getErrorsFor() for per-property error inspection (see below)
    console.log(result.errors); // deprecated for object schemas — Array of { message: string }
}

// Async validation (use when validators/preprocessors are async)
const asyncResult = await UserSchema.validateAsync(someObject);
```

### Collecting All Errors

By default, validation stops at the first error. Pass `{ doNotStopOnFirstError: true }` to collect all errors at once:

```typescript
const result = UserSchema.validate(
    { name: 'A', email: '', age: -5, isActive: true },
    { doNotStopOnFirstError: true }
);

console.log(result.errors);
// [
//   { message: 'Name must be at least 2 characters' },
//   { message: 'Please enter a valid email' },
//   { message: 'Age cannot be negative' }
// ]
```

### Custom Error Messages

[▶ Open in Playground](https://docs.cleverbrush.com/playground/custom-error-messages)

Every constraint accepts an optional error message — either a plain string or a function:

```typescript
const Name = string()
    .minLength(2, 'Name is too short')
    .maxLength(50, (seen) => `"${seen}" exceeds 50 characters`);

const Age = number()
    .min(0, 'Age cannot be negative')
    .max(150, 'Age seems unrealistic');
```

### Custom Validators

[▶ Open in Playground](https://docs.cleverbrush.com/playground/custom-validators)

Add custom synchronous or asynchronous validators to any schema:

```typescript
const EmailSchema = string()
    .minLength(5, 'Email is too short')
    .addValidator(async (value) => {
        if (value === 'taken@example.com') {
            return {
                valid: false,
                errors: [{ message: 'This email is already registered' }]
            };
        }
        return { valid: true };
    });
```

Object-level validators can validate cross-field constraints:

```typescript
const SignupSchema = object({
    password: string().minLength(8),
    confirmPassword: string().minLength(8)
}).addValidator(async (value) => {
    if (value.password !== value.confirmPassword) {
        return {
            valid: false,
            errors: [{ message: 'Passwords do not match' }]
        };
    }
    return { valid: true };
});
```

### Per-Property Errors with `getErrorsFor()` (Recommended)

`ObjectSchemaBuilder.validate()` returns an extended result with a `getErrorsFor()` method for inspecting errors on individual properties — perfect for showing inline form errors. **This is the recommended way to inspect validation errors on object schemas** and replaces the deprecated `errors` array on `ObjectSchemaValidationResult`:

```typescript
const PersonSchema = object({
    name: string().minLength(1),
    address: object({
        city: string(),
        zip: number()
    })
});

const result = PersonSchema.validate(person, {
    doNotStopOnFirstError: true
});

if (!result.valid) {
    // Get errors for a single property
    const nameErrors = result.getErrorsFor((p) => p.name);
    console.log(nameErrors.isValid); // false
    console.log(nameErrors.errors); // ['must be at least 1 character']
    console.log(nameErrors.seenValue); // the value that was validated

    // Works with nested properties too
    const cityErrors = result.getErrorsFor((p) => p.address.city);
    console.log(cityErrors.errors);
}
```

## PropertyDescriptors

PropertyDescriptors are a runtime metadata tree attached to each property in an object schema. They provide type-safe access to property values, schema builders, and parent descriptors. This is what makes the entire Cleverbrush ecosystem work:

- [`@cleverbrush/mapper`](../mapper) uses them as **selectors** (like C# expression trees) to point at source and target properties type-safely.
- [`@cleverbrush/react-form`](../react-form) uses them to bind form fields to schema properties and read their validation constraints automatically.

```typescript
import {
    object,
    string,
    number,
    ObjectSchemaBuilder
} from '@cleverbrush/schema';

const UserSchema = object({
    name: string().minLength(2),
    address: object({
        city: string(),
        zip: number()
    })
});

// Get the PropertyDescriptor tree
const tree = ObjectSchemaBuilder.getPropertiesFor(UserSchema);

// Use descriptors as selectors in mapper and react-form:
// mapper:     .for((t) => t.name).from((s) => s.name)
// react-form: <Field selector={(t) => t.address.city} form={form} />
```

## Default Values

Every schema builder supports `.default(value)`. When the input is `undefined`, the default value is used instead — and the result is still validated against the schema's constraints.

```typescript
import { string, number, array, object, InferType } from '@cleverbrush/schema';

// Static default
const Name = string().default('Anonymous');
Name.validate(undefined); // { valid: true, object: 'Anonymous' }
Name.validate('Alice');   // { valid: true, object: 'Alice' }

// Factory function — useful for mutable defaults
const Tags = array(string()).default(() => []);

// Works with .optional() — removes undefined from the type
const Port = number().optional().default(3000);
type Port = InferType<typeof Port>; // number (not number | undefined)
```

Use a factory function for mutable values (arrays, objects) to avoid shared references:

```typescript
const Config = object({
    host: string().default('localhost'),
    port: number().default(8080),
    tags: array(string()).default(() => [])
});

type Config = InferType<typeof Config>;
// { host: string; port: number; tags: string[] }
// All fields are non-optional — defaults fill in missing values
```

Default values are exposed via `.introspect()`:

```typescript
const schema = string().default('hello');
const info = schema.introspect();
console.log(info.hasDefault);    // true
console.log(info.defaultValue);  // 'hello'
```

## Catch / Fallback

Every schema builder supports `.catch(value)`. When validation **fails for any reason** — wrong type, constraint violation, missing required value — the fallback is returned as a successful result instead of errors.

Unlike `.default()`, which only fires when the input is `undefined`, `.catch()` fires on **any** validation failure.

```typescript
import { string, number, array, object } from '@cleverbrush/schema';

// Static fallback
const Name = string().catch('unknown');
Name.validate(42);          // { valid: true, object: 'unknown' }
Name.validate(null);        // { valid: true, object: 'unknown' }
Name.validate('Alice');     // { valid: true, object: 'Alice' }

// Constraint violation also triggers catch
const Age = number().min(0).catch(-1);
Age.validate(-5);           // { valid: true, object: -1 }

// .parse() and .parseAsync() never throw when .catch() is set
Name.parse(42);             // 'unknown'  (no SchemaValidationError thrown)
```

Use a factory function for mutable fallback values to avoid shared references:

```typescript
const Tags = array(string()).catch(() => []);

const r1 = Tags.validate(null);  // { valid: true, object: [] }
const r2 = Tags.validate(null);  // { valid: true, object: [] }
// r1.object !== r2.object — separate array instances each time
```

The fallback state is exposed via `.introspect()`:

```typescript
const schema = string().catch('unknown');
const info = schema.introspect();
console.log(info.hasCatch);    // true
console.log(info.catchValue);  // 'unknown'
```

## Readonly Modifier

Every schema builder supports `.readonly()`. This is a **type-level-only** modifier — it marks the inferred TypeScript type as immutable, but does not alter validation behaviour or freeze the validated value at runtime.

| Builder | Effect on `InferType<T>` |
|---------|--------------------------|
| `object(…).readonly()` | `Readonly<{ … }>` — all top-level properties become `readonly` |
| `array(…).readonly()` | `ReadonlyArray<T>` — no `push`, `pop`, etc. at the type level |
| `string().readonly()` | `string` (identity — primitives are already immutable) |
| `number().readonly()` | `number` (identity) |
| `boolean().readonly()` | `boolean` (identity) |
| `date().readonly()` | `Readonly<Date>` |

```typescript
import { object, array, string, number, InferType } from '@cleverbrush/schema';

// Readonly object
const UserSchema = object({ name: string(), age: number() }).readonly();
type User = InferType<typeof UserSchema>;
// Readonly<{ name: string; age: number }>

// Readonly array
const TagsSchema = array(string()).readonly();
type Tags = InferType<typeof TagsSchema>;
// ReadonlyArray<string>

// Validation behaviour is unchanged
const result = UserSchema.validate({ name: 'Alice', age: 30 });
// { valid: true, object: { name: 'Alice', age: 30 } }
```

Chains naturally with `.optional()` and `.default()`:

```typescript
const Schema = object({ id: number() }).readonly().optional();
type T = InferType<typeof Schema>;
// Readonly<{ id: number }> | undefined
```

The `isReadonly` flag is exposed via `.introspect()` for tooling:

```typescript
const schema = object({ name: string() }).readonly();
console.log(schema.introspect().isReadonly); // true
```

> **Note:** `.readonly()` is **shallow** — only top-level object properties or the array itself are marked readonly. For deeply nested immutability consider applying `.readonly()` at each level, or use a `DeepReadonly` utility type post-validation.

## Describe

Every schema builder supports `.describe(text)`. This is a **metadata-only** modifier — it stores a human-readable description on the schema at runtime with no effect on validation.

```typescript
const UserSchema = object({
    name: string().describe("The user's full name"),
    age:  number().optional().describe('Age in years'),
}).describe('A user object');

// Read the description back at runtime
UserSchema.introspect().description; // 'A user object'
```

The description is accessible via `.introspect().description` and chains naturally with all other modifiers:

```typescript
string().describe('A name').optional().readonly()
//  ^ InferType is string | undefined, isReadonly: true, description: 'A name'
```

When using `@cleverbrush/schema-json`, descriptions round-trip through JSON Schema's standard `description` field:

```typescript
import { toJsonSchema, fromJsonSchema } from '@cleverbrush/schema-json';

const spec = toJsonSchema(string().describe('A name'), { $schema: false });
// { type: 'string', description: 'A name' }

const schema = fromJsonSchema({ type: 'string', description: 'A name' } as const);
schema.introspect().description; // 'A name'
```

## Extensions

[▶ Open in Playground](https://docs.cleverbrush.com/playground/custom-extensions)

The extension system lets you add **custom methods** to any schema builder type without modifying the core library. Define an extension once, apply it with `withExtensions()`, and every builder produced by the returned factories includes your new methods — fully typed and chainable.

### Defining an Extension

Use `defineExtension()` to declare which builder types your extension targets and what methods it adds. Extension methods receive `this` bound to the builder instance and must return a builder to support fluent chaining:

```typescript
import {
    defineExtension,
    withExtensions,
    StringSchemaBuilder,
    NumberSchemaBuilder,
    DateSchemaBuilder
} from '@cleverbrush/schema';

// Email extension — adds .email() to string builders
const emailExt = defineExtension({
    string: {
        email(this: StringSchemaBuilder) {
            return this.addValidator((val) => {
                const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string);
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'Invalid email address' }]
                };
            });
        }
    }
});

// Port extension — adds .port() to number builders
const portExt = defineExtension({
    number: {
        port(this: NumberSchemaBuilder) {
            return this.isInteger().min(1).max(65535);
        }
    }
});

// Slug extension — adds .slug() to string builders
const slugExt = defineExtension({
    string: {
        slug(this: StringSchemaBuilder) {
            return this.addValidator((val) => {
                const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val as string);
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'Must be a valid URL slug' }]
                };
            });
        }
    }
});
```

### Using Extensions

Pass one or more extension descriptors to `withExtensions()` to get augmented factory functions. All original builder methods remain available and fully chainable alongside the new ones:

```typescript
const s = withExtensions(emailExt, portExt, slugExt);

// .email() and .slug() are now available on string builders
const EmailSchema = s.string().email().minLength(5);
const SlugSchema = s.string().slug().minLength(1).maxLength(200);

// .port() is now available on number builders
const PortSchema = s.number().port();

// Use in object schemas — just like normal builders
const ServerConfig = s.object({
    adminEmail: s.string().email(),
    port: s.number().port(),
    slug: s.string().slug(),
    name: s.string().minLength(1)
});

// Validate as usual
const result = ServerConfig.validate({
    adminEmail: 'admin@example.com',
    port: 8080,
    slug: 'my-server',
    name: 'Production'
});
```

### Multi-Builder Extensions

A single extension can target multiple builder types:

```typescript
const timestampsExt = defineExtension({
    string: {
        /** Marks this string property as an ISO timestamp */
        isoTimestamp(this: StringSchemaBuilder) {
            return this.addValidator((val) => {
                const valid = !isNaN(Date.parse(val as string));
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'Must be a valid ISO timestamp' }]
                };
            });
        }
    },
    date: {
        /** Adds a validator that rejects dates in the future */
        pastOnly(this: DateSchemaBuilder) {
            return this.addValidator((val) => {
                const valid = (val as Date) <= new Date();
                return {
                    valid,
                    errors: valid ? [] : [{ message: 'Date must be in the past' }]
                };
            });
        }
    }
});
```

### Extension Metadata & Introspection

Extension methods automatically record metadata that can be inspected at runtime via `.introspect().extensions`. The system auto-infers the metadata value based on the arguments passed to the extension method:

- **Zero-arg methods** → metadata value is `true`
- **Single-arg methods** → metadata value is the argument itself
- **Multi-arg methods** → metadata value is the arguments array

```typescript
const s = withExtensions(emailExt, portExt);

// Zero-arg method — metadata is `true`
const emailSchema = s.string().email();
console.log(emailSchema.introspect().extensions.email); // true

// Single-arg method — metadata is the argument
const rangeExt = defineExtension({
    number: {
        percentage(this: NumberSchemaBuilder) {
            return this.min(0).max(100);
        }
    }
});
const s2 = withExtensions(rangeExt);
const pctSchema = s2.number().percentage();
console.log(pctSchema.introspect().extensions.percentage); // true

// Multi-arg method — metadata is the arguments array
const rangeExt2 = defineExtension({
    number: {
        range(this: NumberSchemaBuilder, min: number, max: number) {
            return this.min(min).max(max);
        }
    }
});
const s3 = withExtensions(rangeExt2);
const rangeSchema = s3.number().range(0, 100);
console.log(rangeSchema.introspect().extensions.range); // [0, 100]
```

### Custom Metadata

If you need structured metadata (e.g. an object with named fields rather than the raw arguments), call `this.withExtension(key, value)` explicitly inside the method. The auto-infer logic detects the existing key and skips automatic attachment:

```typescript
const currencyExt = defineExtension({
    number: {
        currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
            const maxDec = opts?.maxDecimals ?? 2;
            // Explicit withExtension() call — auto-infer is skipped
            return this
                .withExtension('currency', { maxDecimals: maxDec })
                .min(0)
                .addValidator((val) => {
                    const decimals = (String(val).split('.')[1] ?? '').length;
                    const valid = decimals <= maxDec;
                    return {
                        valid,
                        errors: valid
                            ? []
                            : [{ message: `Max ${maxDec} decimal places` }]
                    };
                });
        }
    }
});

const s = withExtensions(currencyExt);
const priceSchema = s.number().currency({ maxDecimals: 4 });
console.log(priceSchema.introspect().extensions.currency);
// { maxDecimals: 4 }  — structured metadata, not the raw args
```

### Stacking Extensions

Multiple extensions can be stacked — their methods are merged per builder type. A runtime error is thrown if two extensions define the same method name on the same builder type:

```typescript
// All three extensions target StringSchemaBuilder
const s = withExtensions(emailExt, slugExt, trimmedExt);

// All methods are available and chainable
const schema = s.string().email().slug().trimmed().minLength(5);
```

### Validation

`defineExtension()` validates the configuration eagerly:

- **Unknown builder type names** throw immediately (e.g. `{ str: { ... } }` instead of `{ string: { ... } }`)
- **Reserved method names** cannot be overridden — `validate`, `introspect`, `optional`, `required`, `addValidator`, `addPreprocessor`, `withExtension`, `getExtension`, etc.
- **Non-function values** in the method record are rejected

```typescript
// ❌ Throws: Unknown builder type "str"
defineExtension({ str: { foo() { return this; } } });

// ❌ Throws: Cannot override reserved method "validate"
defineExtension({ string: { validate() { return this; } } });
```

### Extension API Reference

| Function / Type                | Description                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `defineExtension(config)`      | Defines an extension. `config` is an `ExtensionConfig` keyed by builder type name. Returns an `ExtensionDescriptor`. |
| `withExtensions(...exts)`      | Accepts one or more `ExtensionDescriptor`s. Returns an object with augmented factory functions (`string`, `number`, `boolean`, `date`, `object`, `array`, `union`, `func`, `any`). |
| `ExtensionConfig`              | Type for the configuration object passed to `defineExtension`. Maps builder type names to method records. |
| `ExtensionDescriptor`          | Branded type returned by `defineExtension`. Pass to `withExtensions()` to apply.                         |

## Built-in Extensions

[▶ Open in Playground](https://docs.cleverbrush.com/playground/builtin-extensions)

The default import from `@cleverbrush/schema` includes a pre-applied extension pack with common validators. You get these methods automatically — no extra setup required:

### String Extensions

| Method | Description | Metadata |
| --- | --- | --- |
| `.email(errorMessage?)` | Validates email format | `true` |
| `.url(opts?, errorMessage?)` | Validates URL format. `opts.protocols` narrows allowed schemes (default: `http`, `https`) | `true` or `{ protocols }` |
| `.uuid(errorMessage?)` | Validates RFC 4122 UUID format (versions 1–5) | `true` |
| `.ip(opts?, errorMessage?)` | Validates IPv4 or IPv6 address. `opts.version` narrows to `'v4'` or `'v6'` | `true` or `{ version }` |
| `.trim()` | Preprocessor — trims whitespace before validation | `true` |
| `.toLowerCase()` | Preprocessor — lowercases value before validation | `true` |
| `.nonempty(errorMessage?)` | Rejects empty strings | `true` |

### Number Extensions

| Method | Description | Metadata |
| --- | --- | --- |
| `.positive(errorMessage?)` | Value must be > 0 | `true` |
| `.negative(errorMessage?)` | Value must be < 0 | `true` |
| `.finite(errorMessage?)` | Value must be finite (not `Infinity` / `-Infinity`) | `true` |
| `.multipleOf(n, errorMessage?)` | Value must be an exact multiple of `n` (float-safe) | `n` |

### Array Extensions

| Method | Description | Metadata |
| --- | --- | --- |
| `.nonempty(errorMessage?)` | Array must have at least one element | `true` |
| `.unique(keyFn?, errorMessage?)` | All elements must be unique. Optional `keyFn` extracts comparison key for objects | `true` or `keyFn` |

### Nullable / Not Nullable

`.nullable()` and `.notNullable()` are **native methods** available on every builder — no extension required.

| Method | Available on | Description |
| --- | --- | --- |
| `.nullable()` | all builders | Marks the schema as nullable — `null` is accepted as a valid value. The inferred type changes from `T` to `T \| null`. |
| `.notNullable()` | all builders | Removes the nullable mark — `null` is no longer accepted. The inferred type changes from `T \| null` back to `T`. |

```typescript
import { string, number, object, InferType } from '@cleverbrush/schema';

const name = string().nullable();
type Name = InferType<typeof name>; // string | null

// Works with any builder
const score = number().positive().nullable(); // number | null

// Chaining: validators before .nullable()
const email = string().email().nullable(); // string | null

// Optional + nullable: accepts string | null | undefined
const bio = string().optional().nullable();

// Nested inside objects
const User = object({
    name: string().nonempty(),
    bio:  string().nullable(),   // string | null
    age:  number().nullable(),   // number | null
});

User.validate({ name: 'Alice', bio: null, age: null }); // valid

// Toggle back with .notNullable()
const strictName = string().nullable().notNullable();
type StrictName = InferType<typeof strictName>; // string (not string | null)

strictName.validate(null);    // invalid
strictName.validate('Alice'); // valid

// Introspect at runtime
string().nullable().introspect().isNullable;       // true
string().nullable().notNullable().introspect().isNullable; // false
```

### Enum / oneOf Extension

| Method | Available on | Description |
| --- | --- | --- |
| `.oneOf(...values)` | `string`, `number` | Constrains the value to one of the given literals and **narrows the inferred type** to the literal union. |
| `.oneOf(valuesArray, errorMessage?)` | `string`, `number` | Array-form with an optional custom error message (string or factory). |
| `enumOf(...values)` | top-level factory | Sugar for `string().oneOf(...)`. Mirrors Zod's `z.enum()`. |
| `enumOf(valuesArray, errorMessage?)` | top-level factory | Array-form with an optional custom error message. |

```typescript
import { string, number, enumOf, InferType } from '@cleverbrush/schema';

// String enum — infers 'admin' | 'user' | 'guest'
const Role = enumOf('admin', 'user', 'guest');
type Role = InferType<typeof Role>;

Role.validate('admin'); // valid
Role.validate('other'); // invalid — "must be one of: admin, user, guest"

// Equivalent long-form
const Role2 = string().oneOf('admin', 'user', 'guest');

// Number enum — infers 1 | 2 | 3
const Priority = number().oneOf(1, 2, 3);
type Priority = InferType<typeof Priority>;

// Chains with nullable / optional
const OptionalRole = enumOf('admin', 'user').nullable(); // 'admin' | 'user' | null

// Runtime access to allowed values via introspect
Role.introspect().extensions?.oneOf; // ['admin', 'user', 'guest']
```

#### Custom error messages for `.oneOf()`

`.oneOf()` accepts a custom error message via the **array form**, where the allowed values are passed as an array and the error message is the second argument:

```typescript
import { string, number, enumOf } from '@cleverbrush/schema';

// String — array form with custom string error message
const role = string().oneOf(['admin', 'user', 'guest'], 'Invalid role');
role.validate('other'); // invalid — "Invalid role"

// String — array form with factory function
const role2 = string().oneOf(
    ['admin', 'user'],
    (val) => `"${val}" is not a valid role`
);

// enumOf — array form with custom error message
const Role = enumOf(['admin', 'user', 'guest'], 'Invalid role');

// Number — trailing error message (unambiguous since values are numbers)
const priority = number().oneOf(1, 2, 3, 'Priority must be 1, 2, or 3');
priority.validate(99); // invalid — "Priority must be 1, 2, or 3"

// Number — array form
const priority2 = number().oneOf([1, 2, 3], 'Invalid priority');

// Number — factory function
const priority3 = number().oneOf(
    1, 2, 3,
    (val) => `${val} is not a valid priority`
);
```

> **Note on string `.oneOf()` error messages:** Because `.oneOf()` accepts a variadic list of string values, a trailing string argument is treated as another allowed value (not an error message). To provide a string error message for a string enum, use the **array form** — `string().oneOf(['a', 'b'], 'error message')`. A trailing *function* is always unambiguously treated as an error message factory in the rest-params form.

All validator extensions accept an optional error message as the last parameter — either a string or a function (matching the same `ValidationErrorMessageProvider` pattern used by built-in constraints like `.minLength()`):

```typescript
import { string, number, array } from '@cleverbrush/schema';

// String error messages
const email = string().email('Please enter a valid email');
const age = number().positive('Age must be positive');
const tags = array().of(string()).nonempty('At least one tag required');

// Function error messages — receive the invalid value
const name = string().nonempty((val) => `"${val}" is not allowed`);
const score = number().multipleOf(5, (val) => `${val} is not a multiple of 5`);
```

### The `/core` Sub-path

If you need bare builders **without** the built-in extensions (e.g. to apply only your own custom extensions), import from the `/core` sub-path:

```typescript
// Bare builders — no built-in extensions
import { string, number, array, withExtensions } from '@cleverbrush/schema/core';

// Apply only your own extensions
const s = withExtensions(myCustomExtension);
```

The default import (`@cleverbrush/schema`) re-exports everything from `/core` and overrides the nine factory functions (`string`, `number`, `boolean`, `date`, `object`, `array`, `union`, `func`, `any`) with pre-extended versions. The extension descriptors themselves are also exported (`stringExtensions`, `numberExtensions`, `arrayExtensions`, `nullableExtension`) so you can compose them with your own.

## Part of the Cleverbrush Ecosystem

`@cleverbrush/schema` is the foundation of a three-library ecosystem:

```
@cleverbrush/schema  →  Define once
       ↓                    ↓                    ↓
   Validate data    Map between schemas    Render React forms
       ↓                    ↓                    ↓
  .validate()       @cleverbrush/mapper    @cleverbrush/react-form
```

Define a schema once and use it for runtime validation, object mapping between different shapes, and type-safe React forms — all from a single source of truth.

## Exports

**Builder functions:** `any`, `lazy`, `string`, `number`, `boolean`, `func`, `promise`, `object`, `date`, `array`, `union`, `interpolatedString`

**Builder classes** (for extending): `SchemaBuilder`, `AnySchemaBuilder`, `ArraySchemaBuilder`, `BooleanSchemaBuilder`, `DateSchemaBuilder`, `FunctionSchemaBuilder`, `InterpolatedStringSchemaBuilder`, `LazySchemaBuilder`, `NumberSchemaBuilder`, `ObjectSchemaBuilder`, `PromiseSchemaBuilder`, `StringSchemaBuilder`, `UnionSchemaBuilder`

**Extension system:** `defineExtension`, `withExtensions`, `stringExtensions`, `numberExtensions`, `arrayExtensions`, `nullableExtension`

**Sub-path exports:** `@cleverbrush/schema/core` — bare builders without built-in extensions

**Types:** `InferType`, `ValidationResult`, `ValidationError`, `MakeOptional`, `SchemaPropertySelector`, `PropertyDescriptor`, `PropertyDescriptorTree`, `ExtensionConfig`, `ExtensionDescriptor`

See [API documentation](https://docs.cleverbrush.com/) for the full reference.

## Performance

Benchmarked against Zod v4 with [Vitest bench](https://vitest.dev/guide/features.html#benchmarking). Run the benchmarks yourself from the repo root: `npm run bench`.

| Benchmark | @cleverbrush/schema | Zod | Ratio |
| --- | --- | --- | --- |
| Array 100 objects — valid | 35,228 ops/s | 13,277 ops/s | **2.65× faster** |
| Array 100 objects — invalid | 899,329 ops/s | 4,396 ops/s | **204× faster** |
| Complex order — valid | 198,988 ops/s | 136,090 ops/s | **1.46× faster** |
| Complex order — invalid | 884,706 ops/s | 26,106 ops/s | **33.9× faster** |
| Flat object — valid | 1,001,194 ops/s | 840,725 ops/s | **1.19× faster** |
| Flat object — invalid | 2,653,630 ops/s | 176,222 ops/s | **15.1× faster** |
| Nested object — valid | 690,556 ops/s | 368,893 ops/s | **1.87× faster** |
| Nested object — invalid | 2,739,319 ops/s | 87,245 ops/s | **31.4× faster** |
| String — valid | 5,348,564 ops/s | 3,533,945 ops/s | **1.51× faster** |
| String — invalid | 5,749,087 ops/s | 482,961 ops/s | **11.9× faster** |
| Number — valid | 7,911,266 ops/s | 4,806,511 ops/s | **1.65× faster** |
| Number — invalid | 5,387,475 ops/s | 637,513 ops/s | **8.45× faster** |
| Union first branch | 1,925,508 ops/s | 1,529,547 ops/s | **1.26× faster** |
| Union last branch | 676,107 ops/s | 732,682 ops/s | 0.92× |
| Union no match — invalid | 5,873,118 ops/s | 385,453 ops/s | **15.2× faster** |

The large gains on invalid data come from the early-exit optimization: validation stops at the first failing constraint in each field and skips the rest of the object. For APIs and form handlers where invalid submissions are common, this translates directly to measurable throughput improvements.

## External Schema Interop (`extern()`)

Already using Zod, Valibot, or ArkType? The `extern()` factory wraps any [Standard Schema v1](https://standardschema.dev/) compatible schema into a `@cleverbrush/schema` builder — so you can mix external schemas with native ones inside an `object()` without rewriting anything.

```ts
import { z } from 'zod';
import { object, number, extern, InferType } from '@cleverbrush/schema';

// Existing Zod schema — keep as-is
const ZodAddress = z.object({
  street: z.string().min(1),
  city:   z.string(),
  zip:    z.string().length(5),
});

// Compose with @cleverbrush/schema
const OrderSchema = object({
  address:    extern(ZodAddress),
  totalCents: number().min(1),
});

// Type is inferred from *both* libraries:
type Order = InferType<typeof OrderSchema>;
// { address: { street: string; city: string; zip: string }; totalCents: number }

const result = OrderSchema.validate({
  address: { street: '5th Ave', city: 'NYC', zip: '10001' },
  totalCents: 4999,
});

if (!result.valid) {
  // Navigate into the extern property — no type annotation needed
  const zipErrors = result.getErrorsFor(t => t.address.zip);
  console.log(zipErrors.errors);
}
```

Key points:
- **One parameter:** `extern(standardSchema)` — types and property descriptors are derived automatically.
- **getErrorsFor()** works through extern boundaries: `t => t.address.city` navigates into the Zod schema.
- **Validation** is delegated to the external schema’s `['~standard'].validate()` — @cleverbrush/schema never re-implements the external library’s validation logic.
- Works with any library that implements Standard Schema v1 (Zod ≥ 3.24, Valibot ≥ 1.0, ArkType, etc.).

## Standard Schema Interoperability

`@cleverbrush/schema` implements [Standard Schema v1](https://standardschema.dev/). Every builder exposes a `['~standard']` getter, which means schemas work as-is with any Standard Schema consumer — no adapters, no wrappers, no configuration:

```ts
import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
  name: string().nonempty(),
  age:  number().min(18),
});

// Works with tRPC, TanStack Form, React Hook Form, T3 Env, Hono, Elysia, …
const standardSchema = UserSchema['~standard'];
```

Confirmed integrations: **tRPC**, **TanStack Form**, **React Hook Form**, **T3 Env**, **Hono**, **Elysia**, **next-safe-action**, and 50+ others listed on [standardschema.dev](https://standardschema.dev/).

## Code Quality

- **Linting:** [Biome](https://biomejs.dev/) — strict rules enforced on every PR via CI
- **Type checking:** TypeScript strict mode (`strictNullChecks`, `noImplicitAny`, full coverage)
- **Unit tests:** [Vitest](https://vitest.dev/) — runtime tests + type-level tests (`expectTypeOf`) covering all builders, extensions, edge cases, and error paths
- **Type-level tests:** `expectTypeOf` assertions validate that inferred types are exactly correct, not just assignable
- **CI:** Every pull request must pass lint + build + test before merge — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## License

BSD-3-Clause
