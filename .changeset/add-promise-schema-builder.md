---
'@cleverbrush/schema': major
---

Add `promise()` schema builder

A new `PromiseSchemaBuilder` and `promise()` factory let you validate that a value is a JavaScript `Promise` and optionally annotate the resolved value type:

```ts
import { promise, string, number, InferType } from '@cleverbrush/schema';

// Untyped — accepts any Promise
const anyPromise = promise();
anyPromise.validate(Promise.resolve(42)); // { valid: true }
anyPromise.validate('not a promise');     // { valid: false }

// Typed resolved value via factory argument
const stringPromise = promise(string());
type StringPromise = InferType<typeof stringPromise>;
// → Promise<string>

// Typed resolved value via fluent method
const numPromise = promise().hasResolvedType(number());
type NumPromise = InferType<typeof numPromise>;
// → Promise<number>

// Optional promise
const opt = promise(string()).optional();
type Opt = InferType<typeof opt>;
// → Promise<string> | undefined
```

- **`promise(schema?)`** — factory function. When `schema` is provided the inferred type is `Promise<InferType<typeof schema>>`.
- **`.hasResolvedType(schema)`** — fluent method to set or replace the resolved-value schema. Updates the inferred type to `Promise<T>` and stores the schema in `introspect().resolvedType`.
- All standard builder methods are supported: `.optional()`, `.nullable()`, `.notNullable()`, `.default(value)`, `.required()`, `.readonly()`, `.brand()`, `.hasType<T>()`, `.addValidator(fn)`, `.addPreprocessor(fn)`, `.describe(text)`.
- Sub-path export added: `@cleverbrush/schema/promise`.
