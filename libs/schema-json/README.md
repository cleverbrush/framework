# @cleverbrush/schema-json

Bidirectional JSON Schema (Draft 7 / 2020-12) interop for
[`@cleverbrush/schema`](../schema).

Import a JSON Schema and get a fully-typed `@cleverbrush/schema` builder that
preserves every constraint. Or convert a builder back to a JSON Schema object
for use in OpenAPI specs, form generators, or any other JSON Schema consumer.

## When to use this library

- **Consuming external APIs** — you have a JSON Schema from an OpenAPI spec or
  a third-party service and want to validate incoming data with full TypeScript
  type inference.
- **OpenAPI / JSON Schema round-trip** — generate JSON Schemas from your
  `@cleverbrush/schema` validators to embed in API specs.
- **Migrating from raw JSON Schema** — convert an existing schema catalogue to
  `@cleverbrush/schema` builders incrementally.
- **Code generation** — introspect a JSON Schema at the type level via
  `JsonSchemaNodeToBuilder<S>` without running any code.

## Installation

```bash
npm install @cleverbrush/schema-json
```

> **Peer dependency:** `@cleverbrush/schema@^2.0.0` must already be installed.

## Quick Start

```ts
import { fromJsonSchema, toJsonSchema } from '@cleverbrush/schema-json';
import { object, string, number } from '@cleverbrush/schema';

// ── JSON Schema → builder ──────────────────────────────────────────────────
const PersonSchema = fromJsonSchema({
    type: 'object',
    properties: {
        name:  { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        age:   { type: 'integer', minimum: 0 },
    },
    required: ['name', 'email'],
} as const); // ← `as const` is required for precise type inference

const result = PersonSchema.parse({ name: 'Alice', email: 'alice@example.com', age: 30 });
// result.object is typed as { name: string; email: string; age?: number }

// ── Builder → JSON Schema ──────────────────────────────────────────────────
const ApiSchema = object({
    id:    string().uuid(),
    title: string().minLength(1).maxLength(255),
    score: number().min(0).max(100).optional(),
});

const spec = toJsonSchema(ApiSchema);
// {
//   "$schema": "https://json-schema.org/draft/2020-12/schema",
//   "type": "object",
//   "properties": {
//     "id":    { "type": "string", "format": "uuid" },
//     "title": { "type": "string", "minLength": 1, "maxLength": 255 },
//     "score": { "type": "number" }
//   },
//   "required": ["id", "title"]
// }
```

## API Reference

### `fromJsonSchema(schema)`

Converts a JSON Schema literal to a `@cleverbrush/schema` builder.

```ts
function fromJsonSchema<const S>(schema: S): JsonSchemaNodeToBuilder<S>
```

| Parameter | Type | Description |
| --- | --- | --- |
| `schema` | JSON Schema literal | Pass with `as const` for precise TypeScript inference |

**Returns** a `@cleverbrush/schema` builder (e.g. `StringSchemaBuilder`,
`ObjectSchemaBuilder`, `UnionSchemaBuilder`, etc.) whose static type mirrors the
JSON Schema structure.

#### `as const` is required

Without `as const`, TypeScript widens string literals to `string` and object
shapes to `Record<string, unknown>`, so inference collapses to
`SchemaBuilder<unknown>`. Always annotate:

```ts
const S = { type: 'object', properties: { x: { type: 'number' } } } as const;
const schema = fromJsonSchema(S); // ObjectSchemaBuilder<{ x: NumberSchemaBuilder<...> }>
```

#### Supported JSON Schema keywords

| Keyword | Builder equivalent |
| ------------------------------------------ | ----------------------------------- |
| `type: 'string'` | `string()` |
| `type: 'number'` | `number()` |
| `type: 'integer'` | `number()` with integer flag |
| `type: 'boolean'` | `boolean()` |
| `type: 'null'` | `SchemaBuilder<null>` |
| `type: 'array'` + `items` | `array(itemBuilder)` |
| `type: 'object'` + `properties` | `object({ … })` |
| `required: […]` | required / optional per property |
| `additionalProperties: true` | `.acceptUnknownProps()` |
| `const` | literal builder (`.equalsTo()`) |
| `enum` | `union(…)` of const builders |
| `anyOf` | `union(…)` of sub-builders |
| `allOf` | `union(…)` (best-effort, no deep merge) |
| `minLength` / `maxLength` | `.minLength()` / `.maxLength()` |
| `pattern` | `.matches(regex)` |
| `minimum` / `maximum` | `.min()` / `.max()` |
| `exclusiveMinimum` / `exclusiveMaximum` | `.min()` / `.max()` exclusive |
| `multipleOf` | `.divisibleBy()` |
| `minItems` / `maxItems` | `.minLength()` / `.maxLength()` on array |
| `format: 'email'` | `.email()` extension |
| `format: 'uuid'` | `.uuid()` extension |
| `format: 'uri'` or `'url'` | `.url()` extension |
| `format: 'ipv4'` | `.ip({ version: 'v4' })` |
| `format: 'ipv6'` | `.ip({ version: 'v6' })` |
| `format: 'date-time'` | `.matches(iso8601 regex)` |

---

### `toJsonSchema(schema, opts?)`

Converts a `@cleverbrush/schema` builder to a JSON Schema object.

```ts
function toJsonSchema(
    schema: SchemaBuilder<any, any, any>,
    opts?: ToJsonSchemaOptions,
): Record<string, unknown>
```

| Parameter | Type | Description |
| --- | --- | --- |
| `schema` | `SchemaBuilder` | any builder from `@cleverbrush/schema` |
| `opts` | `ToJsonSchemaOptions` | optional output configuration |

**Returns** a plain JavaScript object that is safe to `JSON.stringify`.

#### `ToJsonSchemaOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `draft` | `'2020-12' \| '07'` | `'2020-12'` | JSON Schema draft version for the `$schema` URI |
| `$schema` | `boolean` | `true` | Whether to include the `$schema` header in the output |

```ts
// Embed in OpenAPI (suppress the $schema header)
toJsonSchema(schema, { $schema: false });

// Use Draft 07
toJsonSchema(schema, { draft: '07' });
```

---

## Type Utilities

### `InferFromJsonSchema<S>`

Recursively derives the TypeScript value type from a statically-known JSON
Schema. Useful when you want the type without calling `fromJsonSchema` at
runtime.

```ts
import type { InferFromJsonSchema } from '@cleverbrush/schema-json';

const S = {
    type: 'object',
    properties: {
        id:    { type: 'integer' },
        label: { type: 'string' },
    },
    required: ['id'],
} as const;

type Item = InferFromJsonSchema<typeof S>;
// { id: number; label?: string }
```

### `JsonSchemaNodeToBuilder<S, TRequired?>`

Maps a statically-known JSON Schema literal to the `@cleverbrush/schema`
builder type — purely at the type level, no runtime code executed.

```ts
import type { JsonSchemaNodeToBuilder } from '@cleverbrush/schema-json';

const S = { type: 'string', format: 'email' } as const;
type B = JsonSchemaNodeToBuilder<typeof S>;
// StringSchemaBuilder<string, true>
```

---

## Limitations

| Limitation | Notes |
| ----------------------------------------- | ------------------------------------------------------ |
| Custom validators (`addValidator`) | Not representable in JSON Schema — omitted in `toJsonSchema` output, not recoverable by `fromJsonSchema` |
| Preprocessors (`addPreprocessor`) | Same as above |
| `$ref` / `$defs` | Not supported in `fromJsonSchema` |
| `if` / `then` / `else` | Not supported |
| `not` | Not supported |
| `allOf` in `fromJsonSchema` | Falls back to `SchemaBuilder<unknown>` (no deep merge) |
| Dual IP format (`ip()` with both v4 + v6) | `format` is omitted in `toJsonSchema` output (no standard keyword covers both) |
| JSDoc comments on properties | Not preserved in `toJsonSchema` output |
