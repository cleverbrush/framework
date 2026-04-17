# @cleverbrush/schema — Competitive Analysis

## Executive Summary

This document compares **@cleverbrush/schema** with the most popular TypeScript schema validation libraries. The comparison is honest: we highlight both our strengths and gaps. This analysis covers features, architecture, bundle size, performance, and ecosystem maturity.

**Libraries analyzed:**
| Library | GitHub Stars | Approach | Bundle (gzipped) | Standard Schema | Last Active |
|---|---|---|---|---|---|
| [Zod](https://zod.dev) | ~42k | Method-chaining OOP | ~2kb core (Mini) / ~5kb (full) | ✅ v4 | Active |
| [Valibot](https://valibot.dev) | ~7k | Modular functional | ~700 bytes min | ✅ | Active |
| [ArkType](https://arktype.io) | ~7.7k | String-syntax type expressions | ~30kb | ✅ | Active |
| [TypeBox](https://github.com/sinclairzx81/typebox) | ~5k | JSON Schema builder | ~8kb | ❌ | Active |
| [Yup](https://github.com/jquense/yup) | ~22k | Method-chaining OOP | ~15kb | ❌ | Maintenance |
| [Superstruct](https://github.com/ianstormtaylor/superstruct) | ~7k | Functional composable | ~3kb | ❌ | Low activity |
| **@cleverbrush/schema** | — | Fluent builder + extension system | ~17kb (full) / ~4kb (sub-path) | ✅ | Active |

---

## 1. Feature-by-Feature Comparison

### 1.1 Core Type System

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox | Yup |
|---|---|---|---|---|---|---|
| String | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Number | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Boolean | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Date | ✅ Native `Date` schema | ✅ | ✅ | ✅ | ❌ (string format) | ✅ |
| Object | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Array | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tuple | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Record | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Union | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (mixed()) |
| Discriminated union | ✅ Auto-detected | ✅ Explicit | ✅ `variant()` | ✅ Auto-optimized | ✅ | ❌ |
| Enum | ✅ `enumOf()` | ✅ `z.enum()` | ✅ `picklist()` | ✅ `"'a' \| 'b'"` | ✅ | ❌ |
| Literal | ❌ (use `.equals()`) | ✅ `z.literal()` | ✅ `literal()` | ✅ | ✅ | ❌ |
| Null | ✅ `nul()` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Function | ✅ Full signature | ✅ `.implement()` | ✅ | ❌ | ✅ | ❌ |
| Promise | ✅ `.resolves()` | ⚠️ Deprecated in v4 | ✅ | ❌ | ❌ | ❌ |
| Map / Set | ✅ Via `.hasType<T>()` | ✅ | ✅ | ❌ | ❌ | ❌ |
| File / Blob | ✅ Via `.hasType<T>()` | ✅ `z.file()` | ✅ `file()`, `blob()` | ❌ | ❌ | ❌ |
| BigInt | ✅ Via `.hasType<T>()` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Symbol | ✅ Via `.hasType<T>()` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Template literals | ✅ Via `.hasType<T>()` / `ParseStringSchemaBuilder` | ✅ `z.templateLiteral()` | ❌ | ✅ Native | ✅ `TemplateLiteral()` | ❌ |

**Assessment**: Our type system covers all common types well. For JavaScript built-in types like Map, Set, File, and BigInt, we support them via `.hasType<T>()` — a type override mechanism that lets you declare any TypeScript type for a schema. This is more flexible than dedicated builder methods (e.g., `z.map()`) but provides less built-in parsing/coercion for those types. Zod and Valibot offer dedicated builders with specialized validation (e.g., min/max entries for Map), while our approach is a universal escape hatch.

### 1.2 Validation Constraints & String Formats

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| min / max (number, string, array) | ✅ | ✅ | ✅ | ✅ | ✅ |
| regex / pattern | ✅ `.matches()` | ✅ `.regex()` | ✅ `regex()` | ✅ Native | ✅ `Pattern()` |
| Email | ✅ Extension | ✅ `z.email()` | ✅ `email()` | ✅ `"string.email"` | ✅ `Format('email')` |
| URL | ✅ Extension | ✅ `z.url()` | ✅ `url()` | ✅ `"string.url"` | ✅ `Format('uri')` |
| UUID | ✅ Extension | ✅ `z.uuid()` | ✅ `uuid()` | ✅ `"string.uuid"` | ✅ `Format('uuid')` |
| IP address | ✅ Extension (v4/v6) | ✅ `z.ipv4()`, `z.ipv6()` | ✅ `ipv4()`, `ipv6()` | ✅ `"string.ip"` | ✅ |
| ISO datetime | ✅ Via `.coerce()` | ✅ `z.iso.datetime()` | ✅ `isoDateTime()` | ✅ `"string.date.iso"` | ✅ `Format('date-time')` |
| CIDR blocks | ❌ | ✅ `z.cidrv4()` | ❌ | ❌ | ❌ |
| MAC address | ❌ | ✅ `z.mac()` | ✅ `mac()` | ❌ | ❌ |
| JWT | ❌ | ✅ `z.jwt()` | ✅ `jwsCompact()` | ❌ | ❌ |
| Hash (MD5, SHA) | ❌ | ✅ `z.hash()` | ✅ `hash()` | ❌ | ❌ |
| Credit card | ❌ | ❌ | ✅ `creditCard()` | ❌ | ❌ |
| IMEI / ISBN / ISRC | ❌ | ❌ | ✅ | ❌ | ❌ |
| Custom string formats | ✅ Via extensions | ✅ `z.stringFormat()` | ✅ `custom()` | ❌ | ✅ `FormatRegistry` |
| `.positive()` / `.negative()` | ✅ Extension | ✅ | ✅ `minValue(0)` | ✅ `"number > 0"` | ✅ |
| `.multipleOf()` | ✅ Extension | ✅ | ✅ | ✅ | ✅ |
| `.integer()` | ✅ Default | ✅ `z.int()` | ✅ `integer()` | ✅ `"integer"` | ✅ `Integer()` |
| `.finite()` | ✅ Extension | ✅ Default | ✅ `finite()` | ✅ Default | ❌ |
| `.nonempty()` (array) | ✅ Extension | ✅ | ✅ `nonEmpty()` | ✅ | ❌ |
| `.unique()` (array) | ✅ Extension (with key fn) | ❌ (refine) | ❌ (check) | ❌ | ✅ `UniqueItems()` |

**Assessment**: Zod v4 and Valibot offer the broadest built-in string format libraries. Our extension-based approach covers the most common formats (email, URL, UUID, IP) and is easily extensible, but out-of-the-box we have fewer specialized formats than Zod or Valibot. The unique advantage of our approach is that these are **pluggable** — any missing format can be added via `defineExtension()` without forking the library.

### 1.3 Schema Composition & Object Operations

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| `.pick()` | ✅ | ✅ | ✅ `pick()` | ✅ `.pick()` | ✅ `Pick()` |
| `.omit()` | ✅ | ✅ | ✅ `omit()` | ✅ `.omit()` | ✅ `Omit()` |
| `.partial()` | ✅ | ✅ (selective) | ✅ `partial()` (selective) | ✅ `.partial()` | ✅ `Partial()` |
| `.deepPartial()` | ✅ | ❌ | ❌ | ❌ | ✅ `DeepPartial()` |
| `.required()` | ❌ (per-prop) | ✅ (selective) | ✅ `required()` | ✅ `.required()` | ✅ `Required()` |
| `.extend()` / `.addProp()` | ✅ `.addProp()`, `.addProps()` | ✅ `.extend()` | ❌ (spread) | ✅ `.merge()` | ✅ `Intersect()` |
| `.intersect()` / merge | ✅ `.intersect()` | ✅ `z.intersection()` | ✅ `intersect()` | ✅ `.and()` | ✅ `Intersect()` |
| Accept unknown props | ✅ `.acceptUnknownProps()` | ✅ `z.looseObject()` | ✅ `looseObject()` | ✅ `+` operator | ✅ |
| Strict mode | ✅ `.notAcceptUnknownProps()` | ✅ `z.strictObject()` | ✅ `strictObject()` | ✅ Default | ❌ |
| `.keyof()` | ❌ | ✅ | ✅ `keyof()` | ❌ | ✅ `KeyOf()` |
| Object constructors | ✅ `.addConstructor()` | ❌ | ❌ | ❌ | ❌ |

**Assessment**: Our object operations are solid with unique features like `.deepPartial()` and `.addConstructor()`. Zod and Valibot have slight edges in selective `.partial()` / `.required()` (specifying which keys to affect).

### 1.4 Transforms, Coercion & Preprocessing

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| Preprocessors | ✅ `.addPreprocessor()` | ✅ `.preprocess()` | ✅ `pipe()` chain | ✅ `morph()` | ❌ |
| Transforms | ✅ Via preprocessors | ✅ `.transform()`, `.pipe()` | ✅ `transform()` in `pipe()` | ✅ `morph()` | ❌ |
| Coercion | ✅ Via preprocessors | ✅ `z.coerce.*()` | ✅ `toNumber()`, `toDate()`, etc. | ✅ Morphs | ❌ |
| Bidirectional transforms | ❌ | ✅ Codecs (v4.1) | ❌ | ❌ | ❌ |
| Pipe / chain transforms | ✅ Preprocessor + validators chain | ✅ `.pipe()` | ✅ `pipe()` | ✅ `morph().to()` | ❌ |
| `.trim()` / `.toLowerCase()` | ✅ Extension (preprocessor) | ✅ `.trim()`, `.toLowerCase()` | ✅ `trim()`, `toLowerCase()` | ❌ | ❌ |

**Assessment**: All modern libraries support transforms. Zod v4's Codecs (bidirectional transforms) are unique. Our preprocessor system is functionally equivalent but less ergonomic than Zod's dedicated `.transform()` / `.pipe()` syntax. We use the same mechanism for both preprocessing and coercion, which is simpler but less discoverable.

### 1.5 Error Handling & Messages

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| Typed error results | ✅ `ValidationResult<T>` | ✅ `ZodError` | ✅ `ValiError` | ✅ `type.errors` | ✅ `ValueError` |
| Per-constraint messages | ✅ All constraints accept messages | ✅ `error` param | ✅ Message param | ✅ `.configure()` | ❌ |
| Property-targeted errors | ✅ `.getErrorsFor(t => t.field)` | ✅ `path: ["field"]` | ✅ `forward()` | ✅ Path in errors | ❌ |
| Async error messages | ✅ Message provider returns `Promise` | ❌ | ❌ | ❌ | ❌ |
| Error pretty-printing | ❌ | ✅ `z.prettifyError()` | ✅ `flatten()` | ✅ `.summary` | ❌ |
| Nested error inspection | ✅ Per-element / per-option | ✅ Path-based | ✅ `flatten()` | ✅ | ❌ |
| I18n / locale support | ❌ | ✅ `z.config(z.locales.*)` | ✅ Global messages | ❌ | ❌ |
| All-errors mode | ✅ `doNotStopOnFirstError` | ✅ Default (collects all) | ✅ Default | ✅ | ✅ |

**Assessment**: Our type-safe property-targeted errors (`getErrorsFor(t => t.fieldName)`) are the most IDE-friendly approach — refactoring property names automatically updates error accessors. Async error message providers are unique to us. However, Zod leads in error formatting/pretty-printing and i18n support.

### 1.6 Advanced Type Features

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| Branded / opaque types | ✅ `Brand<T, Tag>` via `.brand()` | ✅ `.brand<Tag>()` | ✅ `brand()` | ❌ | ❌ |
| Readonly types | ✅ `.readonly()` | ✅ `.readonly()` (+ `Object.freeze`) | ✅ `readonly()` | ❌ | ✅ `Readonly()` |
| Recursive / lazy schemas | ✅ `lazy(() => schema)` | ✅ Getter syntax (v4) | ✅ `lazy()` | ✅ Scoped definitions | ✅ `Recursive()` |
| Default values | ✅ `.default()` (value or factory) | ✅ `.default()` | ✅ `optional(schema, default)` | ✅ `"= value"` syntax | ✅ `Default()` |
| Catch / fallback on error | ✅ `.catch()` | ✅ `.catch()` | ✅ `fallback()` | ❌ | ❌ |
| Optional | ✅ `.optional()` | ✅ `.optional()` | ✅ `optional()` | ✅ `"key?"` syntax | ✅ `Optional()` |
| Nullable | ✅ `.nullable()` | ✅ `.nullable()` | ✅ `nullable()` | ✅ `"\| null"` | ✅ `Union([..., Null()])` |
| Type inference | ✅ `InferType<T>` | ✅ `z.infer<T>` | ✅ `InferOutput<T>` | ✅ `type.infer` | ✅ `Static<T>` |
| Input vs Output types | ✅ `.validate()` input ≠ output | ✅ `z.input<T>` / `z.output<T>` | ✅ `InferInput<T>` / `InferOutput<T>` | ✅ `inferIn` / `infer` | ❌ |
| Description / metadata | ✅ `.describe()`, `.schemaName()` | ✅ `.meta()`, registries | ✅ `title()`, `description()`, `metadata()` | ❌ | ✅ `Description()` |
| Custom refinements | ✅ `.addValidator()` | ✅ `.refine()`, `.superRefine()` | ✅ `check()`, `rawCheck()` | ✅ `.narrow()` | ❌ |
| Parse / throw | ✅ `.parse()` throws `SchemaValidationError` | ✅ `.parse()` throws `ZodError` | ✅ `parse()` throws `ValiError` | ✅ Throws `type.errors` | ❌ |
| Safe parse | ✅ `.validate()` returns result | ✅ `.safeParse()` | ✅ `safeParse()` | ✅ Returns `ArkErrors \| data` | ✅ `Check()` returns errors |
| Type guard | ❌ | ❌ | ✅ `is()` | ❌ | ❌ |
| Type override | ✅ `.hasType<T>()` | ❌ | ❌ | ❌ | ❌ |

**Assessment**: We're competitive on most advanced features and have unique ones like `.hasType<T>()` for type assertions. Our `.validate()` function already distinguishes input and output types — the parameter type differs from the result's `.object` type, providing the same input/output type distinction that Zod and Valibot offer.

---

## 2. Unique @cleverbrush/schema Features

These features have **no direct equivalent** in any competitor:

### 2.1 Extension System (`defineExtension()` + `withExtensions()`)

```typescript
const slug = defineExtension({
  string: {
    slug(this: StringSchemaBuilder, msg?: string) {
      return this.matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, msg ?? 'Invalid slug');
    }
  }
});

const { string } = withExtensions(slug);
string().slug(); // type-safe, chainable
```

No other library offers a type-safe plugin system for adding custom methods to schema builders. Zod v4's `zod/v4/core` provides a foundation layer, but doesn't expose user-facing extension APIs. Valibot's functional design allows external functions but without method chaining integration. **This is our single strongest differentiator at the schema level.**

### 2.2 Generic / Parameterized Schemas

```typescript
const Paginated = generic((T) =>
  object({ items: array(T), total: number() })
);

const UserPage = Paginated.apply(UserSchema);
// Infers: { items: User[]; total: number }
```

No competitor supports parameterized schemas with generic type parameters. In Zod/Valibot, you'd write a function that returns a schema — but you lose the schema metadata and introspection. Our `generic()` preserves full schema introspection and supports default arguments.

### 2.3 Cross-Concern Schema Reuse

The same `@cleverbrush/schema` instance is used as:
- **Validation** — runtime data checking
- **DI container key** — `@cleverbrush/di` uses schemas as service identifiers
- **Server endpoint definition** — request/response typing in `@cleverbrush/server`
- **API contract** — shared between server and client in `@cleverbrush/client`
- **OpenAPI generation** — `@cleverbrush/server-openapi` reads schema introspection
- **Form validation** — schema-driven form fields

No competitor is designed for this level of cross-concern integration. Zod is used in many contexts via its ecosystem, but each integration is independent — there's no unified schema that drives the entire application.

### 2.4 Property Descriptors & Typed Navigation

```typescript
const props = ObjectSchemaBuilder.getPropertiesFor(UserSchema);
props.address.city.getValue(user);     // type-safe deep access
props.address.city.toJsonPointer();    // "/address/city"
props.address.city.setValue(user, 'NYC', { createMissingStructure: true });
```

Full runtime property descriptor tree with typed navigation, JSON Pointer generation, and value get/set. No competitor provides this level of schema-driven runtime object navigation.

### 2.5 Bidirectional JSON Schema (`@cleverbrush/schema-json`)

```typescript
// Schema → JSON Schema
const jsonSchema = toJsonSchema(mySchema);

// JSON Schema → Schema (with full type inference)
const schema = fromJsonSchema({
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name']
} as const);
```

Round-trip JSON Schema conversion with type-level inference from `as const` JSON Schema objects. Zod v4 added `z.toJSONSchema()` (one direction), ArkType can introspect to JSON Schema, but none offer `fromJsonSchema()` with full TypeScript type inference at the type level.

### 2.6 `extern()` for Standard Schema Wrapping

```typescript
import { z } from 'zod';
import { extern, object } from '@cleverbrush/schema';

const ZodEmail = z.string().email();
const User = object({
  email: extern(ZodEmail),  // wraps Zod schema, preserves type inference
  name: string()
});
```

While Standard Schema enables *consumers* to accept any schema library, `extern()` enables *composition* — you can mix schemas from different libraries within a single `@cleverbrush/schema` object. No other library offers this.

### 2.7 Introspection System

```typescript
const meta = mySchema.introspect();
// Returns: { type, isRequired, preprocessors, validators, constraints, extensions, ... }
```

Full runtime introspection of schema structure, constraints, extensions, and metadata. This powers our JSON Schema generation, OpenAPI integration, and form generation. While Zod v4 added registries and ArkType has deep introspection, our introspection includes extension metadata and is designed for reconstruction via `createFromProps()`.

### 2.8 Object Constructors

```typescript
const User = object({ name: string(), email: string() })
  .addConstructor(({ rawInput }) => ({
    name: rawInput.name.trim(),
    email: rawInput.email.toLowerCase()
  }));
```

Schema-level constructor functions that transform raw input during object creation. No competitor has this concept.

---

## 3. Architecture Comparison

### 3.1 API Design Philosophy

| Approach | Libraries | Pros | Cons |
|---|---|---|---|
| **Method-chaining (OOP builder)** | @cleverbrush, Zod, Yup | Discoverable via IDE autocomplete; natural reading order | Harder to tree-shake; bundle includes unused methods |
| **Functional / modular** | Valibot, Superstruct | Excellent tree-shaking; minimal bundles; composable | Less discoverable; verbose for complex schemas |
| **String-syntax expressions** | ArkType | Closest to TypeScript syntax; very concise | Learning curve for syntax; IDE plugin recommended |
| **JSON Schema-aligned builder** | TypeBox | 1:1 JSON Schema mapping; great for OpenAPI | Less ergonomic; limited runtime features |

**@cleverbrush** uses a method-chaining builder pattern with immutable instances (every method returns a new schema). Our extension system allows expanding the method surface without modifying core code, partially addressing the tree-shaking disadvantage — unused extensions can be excluded via sub-path imports.

### 3.2 Immutability

| Library | Immutable? |
|---|---|
| @cleverbrush | ✅ All methods return new instances |
| Zod | ✅ |
| Valibot | ✅ (functional — returns new schemas) |
| ArkType | ✅ |
| TypeBox | ✅ |
| Yup | ❌ Methods mutate (mostly) |

### 3.3 Async Support

| Library | Async validation | Async transforms | Async error messages |
|---|---|---|---|
| @cleverbrush | ✅ `validateAsync()` | ✅ Async preprocessors | ✅ |
| Zod | ✅ `parseAsync()` | ✅ Async transforms | ❌ |
| Valibot | ✅ `parseAsync()` + `*Async()` variants | ✅ `transformAsync()` | ❌ |
| ArkType | ❌ | ❌ | ❌ |
| TypeBox | ❌ | ❌ | ❌ |

**Assessment**: We and Zod/Valibot all support async validation. ArkType and TypeBox are sync-only. Our async error message providers are unique — useful for loading localized messages from a database or translation service.

---

## 4. Bundle Size

| Library | Full bundle (gzipped) | Minimal usage (gzipped) | Tree-shakable |
|---|---|---|---|
| @cleverbrush/schema | 17.3 KB | ~4.1 KB (sub-path import) | ⚠️ Partial (sub-path imports) |
| Zod v4 (full) | ~5.4 KB core ¹ | ~5.4 KB ¹ | ⚠️ Limited |
| Zod Mini | ~1.9 KB core ¹ | ~1.9 KB ¹ | ✅ Functional API |
| Valibot | ~14 KB (all APIs) | ~700 B | ✅ Fully modular |
| ArkType | ~30 KB | ~30 KB | ❌ Monolithic |
| TypeBox | ~8 KB | ~8 KB | ⚠️ Limited |
| Yup | ~15 KB | ~15 KB | ❌ |

¹ Zod's published bundle sizes (1.9 KB / 5.4 KB) are marketing-optimized numbers measured for a minimal import. Real-world usage with objects, arrays, unions, refinements, and error handling results in a significantly larger bundle. Independent verification is recommended.

**Actual @cleverbrush/schema bundle sizes** (measured, gzipped):
| Import | Size (gzip) | Size (brotli) |
|---|---|---|
| `@cleverbrush/schema` (full) | 17.3 KB | 15.1 KB |
| `@cleverbrush/schema/core` (no built-in extensions) | 16.6 KB | 13.9 KB |
| `@cleverbrush/schema/object` | 6.6 KB | 6.0 KB |
| `@cleverbrush/schema/string` | 4.1 KB | 3.7 KB |
| `@cleverbrush/schema/number` | 4.1 KB | 3.7 KB |
| `@cleverbrush/schema/array` | 4.3 KB | 3.9 KB |

**Assessment**: Valibot dominates bundle size for minimal usage. Zod's headline numbers are attractive but should be verified with realistic schemas — the gap narrows in real-world usage. Our full bundle (17.3 KB) is larger but includes all built-in extensions. Sub-path imports bring individual builders down to ~4 KB. For applications that already use our server/client stack, the schema is shared — bundle overhead is amortized across the full framework.

---

## 5. Performance

Benchmarks run against Zod v4, Joi, and Yup using vitest bench. All numbers are ops/s (higher is better). **Bold** marks the fastest in each row.

### 5.1 Primitive Validation

| Benchmark | @cleverbrush | Zod v4 | Joi | Yup |
|---|---|---|---|---|
| String (valid) | **5.79M** | 4.61M | 2.15M | 805K |
| String (invalid) | **6.29M** | 957K | 473K | 42K |
| Number (valid) | **7.44M** | 5.60M | 2.53M | 859K |
| Number (invalid) | **5.55M** | 1.03M | 469K | 42K |

### 5.2 Object Validation

| Benchmark | @cleverbrush | Zod v4 | Joi | Yup |
|---|---|---|---|---|
| Flat object (valid) | **1.23M** | 900K | 248K | 123K |
| Flat object (invalid) | **3.15M** | 277K | 458K | 34K |
| Nested object (valid) | **802K** | 518K | 156K | 65K |
| Nested object (invalid) | **3.26M** | 156K | 465K | 27K |

### 5.3 Complex Scenarios

| Benchmark | @cleverbrush | Zod v4 | Joi | Yup |
|---|---|---|---|---|
| Array of 100 objects (valid) | **41.1K** | 24.3K | 7.9K | 2.0K |
| Array of 100 objects (invalid) | **1.88M** | 9.8K | 295K | 5.4K |
| Complex "Create Order" (valid) | **245K** | 186K | 56K | 17K |
| Complex "Create Order" (invalid) | **1.26M** | 51.7K | 297K | 19.5K |

### 5.4 Union / Discriminated Union

| Benchmark | @cleverbrush | Zod v4 | Joi | Yup |
|---|---|---|---|---|
| Union — match first branch | **2.48M** | 1.82M | 718K | 210K |
| Union — match last branch | 800K | **896K** | 263K | 14.9K |
| Union — no match (invalid) | **7.02M** | 715K | 94K | 9.4K |

### 5.5 Key Takeaways

- **@cleverbrush is #1 in 14 out of 15 benchmarks**, consistently faster than Zod v4 across all categories.
- On valid input, we're typically **1.3–1.7×** faster than Zod v4.
- On invalid input, we're dramatically faster — **6.6× on strings**, **11× on flat objects**, **21× on nested objects**, **191× on arrays** — because we short-circuit early on first error by default.
- Zod v4 beats us only on **union last-branch matching** (896K vs 800K ops/s), where its internal optimization for discriminated unions gives an edge.
- We have not benchmarked against ArkType or TypeBox (which claim to be even faster via compilation). These results compare against Zod v4, Joi, and Yup only.

**Assessment**: Our performance story is strong. We're faster than Zod v4 in nearly every scenario, with especially dramatic advantages on invalid input due to early exit optimization. For API request validation (our primary use case), these numbers are more than sufficient. ArkType may still be faster due to its set-theory compilation approach, but we haven't verified this head-to-head.

---

## 6. Standard Schema & Ecosystem Integration

| Feature | @cleverbrush | Zod v4 | Valibot | ArkType | TypeBox |
|---|---|---|---|---|---|
| Standard Schema v1 | ✅ `['~standard']` getter | ✅ | ✅ | ✅ | ❌ |
| tRPC integration | ✅ Via Standard Schema | ✅ Native | ✅ Via Standard Schema | ✅ Via Standard Schema | ❌ |
| React Hook Form | ✅ Via Standard Schema | ✅ Resolver | ✅ Via Standard Schema | ✅ Via Standard Schema | ❌ |
| TanStack Form | ✅ Via Standard Schema | ✅ | ✅ | ✅ | ❌ |
| JSON Schema output | ✅ `toJsonSchema()` | ✅ `z.toJSONSchema()` | ❌ (community) | ✅ | ✅ Native |
| JSON Schema input | ✅ `fromJsonSchema()` | ❌ | ❌ | ❌ | ❌ |
| OpenAPI integration | ✅ `@cleverbrush/server-openapi` | ✅ Community | ❌ | ❌ | ✅ Native |
| Own framework integration | ✅ Server, client, DI, auth | ❌ | ❌ | ❌ | ❌ |
| Community ecosystem size | 🟡 Small | 🟢 Massive | 🟡 Growing | 🟡 Growing | 🟡 Moderate |

**Assessment**: Standard Schema support puts us on equal footing with Zod, Valibot, and ArkType for ecosystem compatibility. Our bidirectional JSON Schema conversion is a unique advantage. The main gap is ecosystem size — Zod has hundreds of community integrations. However, our framework integration (server, client, DI, auth) means less need for third-party integrations.

---

## 7. Honest Weaknesses

### What competitors do better than us:

| Gap | Who does it best | Impact | Priority |
|---|---|---|---|
| **Bundle size (minimal)** | Valibot (~700 B), Zod Mini (~1.9 KB) | Medium — matters for edge/mobile | 🟡 Medium |
| **Built-in string formats** | Zod v4, Valibot (JWT, hash, MAC, credit card, etc.) | Low — extensible via `defineExtension()` | 🟢 Low |
| **Dedicated Map / Set / File builders** | Zod, Valibot | Low — supported via `.hasType<T>()` but without specialized validation | 🟢 Low |
| **Dedicated template literal builder** | Zod v4, ArkType | Low — supported via `.hasType<T>()` / `ParseStringSchemaBuilder`, no dedicated method | 🟢 Low |
| **Bidirectional transforms (Codecs)** | Zod v4 | Low — nice ergonomic | 🟢 Low |
| **Error pretty-printing** | Zod v4 | Low — easy to add | 🟢 Low |
| **I18n / Locale support** | Zod v4, Valibot | Low–Medium — matters for form validation | 🟢 Low |
| **Community size** | Zod (42k ★) | High — docs, tutorials, hiring | 🟡 Medium |

### What we do better than everyone:

1. **Extension system** — `defineExtension()` + `withExtensions()` enables type-safe plugins. No competitor has this. Third parties can add schema methods without forking.
2. **Generic / parameterized schemas** — `generic()` with full type inference. No competitor supports this natively.
3. **Cross-concern integration** — One schema drives DI, server, client, OpenAPI, and forms. No competitor is designed for this.
4. **Property descriptors** — Typed runtime navigation of schema structure with JSON Pointer, get/set, and path tracking.
5. **Bidirectional JSON Schema** — Round-trip `toJsonSchema()` / `fromJsonSchema()` with type-level inference.
6. **`extern()` composition** — Mix schemas from Zod, Valibot, or ArkType within a single @cleverbrush object schema.
7. **Async error messages** — Error message providers can return Promises. Unique to us.
8. **`.deepPartial()`** — Recursive partial for nested object structures. Only TypeBox offers something similar.
9. **Type-safe error access** — `result.getErrorsFor(t => t.address.city)` auto-updates when properties are renamed.
10. **Runtime performance** — Faster than Zod v4 in 14 out of 15 benchmarks, with up to 191× advantage on invalid input.

---

## 8. Target Audience Comparison

| If you need... | Best choice | Why |
|---|---|---|
| Smallest possible bundle | **Valibot** | ~700 B minimum; fully tree-shakable |
| Largest ecosystem | **Zod** | 42k stars; hundreds of integrations |
| Fastest runtime | **ArkType** | 20x faster than Zod; set-theory optimized |
| JSON Schema / OpenAPI native | **TypeBox** | 1:1 JSON Schema mapping |
| Full-stack type safety | **@cleverbrush** | Schema drives server, client, DI, OpenAPI, forms |
| Schema extensibility | **@cleverbrush** | Only library with a plugin/extension system |
| Generic/parameterized schemas | **@cleverbrush** | Only library with native `generic()` |
| Form validation only | **Zod** or **Valibot** | Mature integrations with React Hook Form, TanStack Form |
| TypeScript-native syntax | **ArkType** | Write schemas that look like TypeScript types |

---

## 9. Conclusion

**@cleverbrush/schema occupies a unique architectural position**: it's the only schema library designed as connective tissue across an entire application stack — from dependency injection and server endpoints through API contracts to typed clients and form validation.

**Our core advantages are depth features** that competitors cannot easily replicate: the extension system, generic schemas, cross-concern reuse, property descriptors, and bidirectional JSON Schema. These features compound in value as application complexity grows.

**Our main competitive gaps are breadth features**: fewer built-in string formats, no dedicated Map/Set/File builder methods (supported via `.hasType<T>()`), and a smaller community. Most of these are addressable without architectural changes.

**The strategic positioning is clear**: for teams building full-stack TypeScript applications with our framework, @cleverbrush/schema is the natural choice — the cross-concern integration alone justifies adoption. For teams using only the schema layer in isolation, Zod remains the safer bet due to ecosystem size, while Valibot is best for bundle-critical applications, and ArkType for performance-critical ones.

The Standard Schema interop layer means teams don't need to choose exclusively. Our `extern()` wrapper and Standard Schema compliance let @cleverbrush/schema coexist with any other library, making adoption incremental rather than all-or-nothing.
