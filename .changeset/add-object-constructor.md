---
'@cleverbrush/schema': major
---

Add `addConstructor()` and `clearConstructor()` to `ObjectSchemaBuilder`

`object()` schemas can now declare constructor overloads using the fluent API. Each `.addConstructor()` call appends a `FunctionSchemaBuilder` to the accumulated list of constructor signatures. The inferred type becomes an intersection of all construct signatures and the plain instance type.

```ts
import { object, func, string, number, InferType } from '@cleverbrush/schema';

const PersonSchema = object({ name: string(), age: number() })
    .addConstructor(func().addParameter(string()))               // new(name: string): ...
    .addConstructor(func().addParameter(string()).addParameter(number())); // new(name, age): ...

type Person = InferType<typeof PersonSchema>;
// { new(p0: string): { name: string; age: number } }
// & { new(p0: string, p1: number): { name: string; age: number } }
// & { name: string; age: number }

declare const Person: Person;
const instance = new Person('Alice');
```

- **`addConstructor(funcSchema)`** — appends a constructor overload; each call extends the accumulated tuple of constructor schemas. Chainable.
- **`clearConstructors()`** — resets constructor schemas to an empty list, removing all construct signatures from the inferred type.
- **`introspect().constructorSchemas`** — array of all accumulated constructor `FunctionSchemaBuilder` schemas.
- Constructor signatures are **type-only**: runtime `validate()` still validates plain objects as before.

All existing fluent methods (`.optional()`, `.nullable()`, `.default()`, `.required()`, `.readonly()`, `.brand()`, `.addProp()`, `.omit()`, `.pick()`, `.partial()`, `.intersect()`, etc.) preserve the accumulated `TConstructorSchemas` generics correctly.
