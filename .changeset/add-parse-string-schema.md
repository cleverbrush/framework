---
'@cleverbrush/schema': major
---

Add `parseString()` schema builder

A new `ParseStringSchemaBuilder` and `parseString()` factory that validates a string against a template pattern and parses it into a strongly-typed object. Uses a tagged-template syntax with type-safe property selectors.

### Basic Usage

```ts
import { parseString, object, string, number, type InferType } from '@cleverbrush/schema';

const RouteSchema = parseString(
  object({ userId: string().uuid(), id: number().coerce() }),
  $t => $t`/orders/${t => t.id}/${t => t.userId}`
);

type Route = InferType<typeof RouteSchema>;
// { userId: string; id: number }

const result = RouteSchema.validate('/orders/42/550e8400-e29b-41d4-a716-446655440000');
// result.valid === true
// result.object === { id: 42, userId: '550e8400-...' }
```

### Key Features

- **Tagged-template API** — `$t => $t\`/path/${t => t.prop}\`` with full IntelliSense on the property selectors.
- **Type-safe selectors** — only properties whose inferred type extends `string | number | boolean | Date` are selectable.
- **Nested objects** — navigate deep properties via `t => t.order.id`.
- **Coercion via property schemas** — property schemas handle their own coercion (e.g. `number().coerce()`, `date().coerce()`). The builder passes raw captured strings directly to each property schema's `validate()`.
- **Sync & async** — both `validate()` and `validateAsync()` are supported; async is auto-detected.
- **Full fluent chain** — `.optional()`, `.nullable()`, `.default()`, `.brand()`, `.readonly()`, `.required()`, `.hasType()`, `.clearHasType()` all work and preserve type inference.
- **Error messages** — segment-level errors include the property path (e.g. `"id: expected an integer number"`).
- **`doNotStopOnFirstError`** — collects all segment errors when the context flag is set.
