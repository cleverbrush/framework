# @cleverbrush/schema-json
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-93.2%25-brightgreen)
<!-- coverage-badge-end -->

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
| `const` | literal builder (`.equals(...)`) |
| `enum` | `union(…)` of const builders |
| `anyOf` | `union(…)` of sub-builders |
| `anyOf` + `discriminator` | auto-emitted for discriminated `union()` branches (see below) |
| `allOf` | not supported — falls back to `any()` |
| `minLength` / `maxLength` | `.minLength()` / `.maxLength()` |
| `pattern` | `.matches(regex)` (invalid patterns silently ignored) |
| `minimum` / `maximum` | `.min()` / `.max()` |
| `exclusiveMinimum` / `exclusiveMaximum` | custom validator (not round-trippable via `toJsonSchema`) |
| `multipleOf` | `.multipleOf()` |
| `minItems` / `maxItems` | `.minLength()` / `.maxLength()` on array |
| `format: 'email'` | `.email()` extension |
| `format: 'uuid'` | `.uuid()` extension |
| `format: 'uri'` or `'url'` | `.url()` extension |
| `format: 'ipv4'` | `.ip({ version: 'v4' })` |
| `format: 'ipv6'` | `.ip({ version: 'v6' })` |
| `format: 'date-time'` | `.matches(iso8601 regex)` |
| `readOnly: true` | `.readonly()` |
| `description` | `.describe(text)` |

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

Descriptions set via `.describe(text)` are emitted as the `description` field on the corresponding JSON Schema node (including nested object properties).

Examples set via `.example(value)` are emitted as the `examples` array on the corresponding JSON Schema node.

#### Discriminated unions

When a `union()` is a **discriminated union** — all branches are objects sharing a required property with unique literal values — `toJsonSchema()` automatically emits the `discriminator` keyword alongside `anyOf`:

```ts
const schema = union(
    object({ type: string('cat'), name: string() })
).or(
    object({ type: string('dog'), breed: string() })
);

toJsonSchema(schema, { $schema: false });
// {
//   anyOf: [ { ... type: { const: 'cat' } ... }, { ... type: { const: 'dog' } ... } ],
//   discriminator: { propertyName: 'type' }
// }
```

When a `nameResolver` is provided and union branches resolve to `$ref` pointers, a `mapping` is also emitted:

```ts
// discriminator: { propertyName: 'type', mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' } }
```

This enables code-generation tools (openapi-generator, orval, etc.) to produce proper tagged union types.

#### `ToJsonSchemaOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `draft` | `'2020-12' \| '07'` | `'2020-12'` | JSON Schema draft version for the `$schema` URI |
| `$schema` | `boolean` | `true` | Whether to include the `$schema` header in the output |
| `nameResolver` | `(schema: SchemaBuilder) => string \| null` | `undefined` | Called for every node before conversion. Return a non-null string to emit `{ $ref: '#/components/schemas/<name>' }` instead of an inline schema. Used by `@cleverbrush/server-openapi` to wire named schemas from `.schemaName()` into `$ref` pointers. |

```ts
// Embed in OpenAPI (suppress the $schema header)
toJsonSchema(schema, { $schema: false });

// Use Draft 07
toJsonSchema(schema, { draft: '07' });
```

### Lazy / Recursive Schemas

`toJsonSchema` resolves `lazy()` schemas transparently. When the resolved schema
has a name returned by `nameResolver`, the output is a `$ref` pointer — which
is the key mechanism for breaking recursive cycles:

```ts
import { object, number, array, lazy } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

type TreeNode = { value: number; children: TreeNode[] };

const treeNode: ReturnType<typeof object> = object({
    value: number(),
    children: array(lazy(() => treeNode))
}).schemaName('TreeNode');

let rootSeen = false;
toJsonSchema(treeNode, {
    $schema: false,
    nameResolver: s => {
        // Inline the root once (for the definition itself), then emit $ref
        if (s === treeNode && !rootSeen) { rootSeen = true; return null; }
        return (s.introspect() as any).schemaName ?? null;
    }
});
// {
//   type: 'object',
//   properties: {
//     value: { type: 'integer' },
//     children: { type: 'array', items: { $ref: '#/components/schemas/TreeNode' } }
//   },
//   ...
// }
```

When using `@cleverbrush/server-openapi`, this is handled automatically — call
`.schemaName()` on the root schema and `generateOpenApiSpec` will emit the
correct `$ref` pointers and component definition with no extra configuration.

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
| `nameResolver` + `$ref` / `$defs` round-trip | `nameResolver` emits `$ref` pointers based on external registry; `fromJsonSchema` does not resolve `$ref` references — they fall back to `any()` |
