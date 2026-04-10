---
'@cleverbrush/schema': minor
---

Add `addParameter()` and `hasReturnType()` to `FunctionSchemaBuilder`

`func()` schemas can now describe their parameter types and return type using the fluent API:

```ts
import { func, string, number, InferType } from '@cleverbrush/schema';

const greet = func()
  .addParameter(string())        // (param0: string, ...) => any
  .addParameter(number().optional())  // (param0: string, param1: number | undefined) => any
  .hasReturnType(string());      // (...) => string

// TypeScript infers the full signature
type Greet = InferType<typeof greet>;
// (param0: string, param1: number | undefined) => string
```

- **`addParameter(schema)`** — appends a parameter schema; each call extends the inferred tuple of parameter types. Chainable.
- **`hasReturnType(schema)`** — sets the return type schema; replaces any previously set return type in the inferred signature.
- **`introspect().parameters`** — array of all accumulated parameter schemas.
- **`introspect().returnType`** — the return type schema, or `undefined` if not set.

All existing fluent methods (`.optional()`, `.nullable()`, `.default()`, `.required()`, `.readonly()`, `.brand()`, etc.) preserve the accumulated `TParameters` and `TReturnTypeSchema` generics correctly.
