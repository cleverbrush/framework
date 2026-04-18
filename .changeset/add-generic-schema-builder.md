---
'@cleverbrush/schema': major
---

Add `generic()` schema builder

A new `GenericSchemaBuilder` and `generic()` factory enable reusable, type-safe parameterized schemas whose TypeScript type is inferred from the template function's generic signature.

## Basic usage — single type parameter

```ts
import {
    generic,
    object,
    array,
    number,
    string,
    type InferType,
} from '@cleverbrush/schema';

// Define a reusable paginated-list template
const PaginatedList = generic(
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({
            items: array(itemSchema),
            total: number(),
            page:  number(),
        })
);

const userSchema   = object({ name: string(), age: number() });
const PaginatedUsers = PaginatedList.apply(userSchema);

type PaginatedUsersType = InferType<typeof PaginatedUsers>;
// → { items: { name: string; age: number }[]; total: number; page: number }

PaginatedUsers.validate({ items: [{ name: 'Alice', age: 30 }], total: 1, page: 1 });
// { valid: true }
```

## Multiple type parameters

```ts
const Result = generic(
    <
        T extends SchemaBuilder<any, any, any, any, any>,
        E extends SchemaBuilder<any, any, any, any, any>
    >(
        valueSchema: T,
        errorSchema: E,
    ) =>
        object({
            ok:    boolean(),
            value: valueSchema.optional(),
            error: errorSchema.optional(),
        })
);

const StringResult = Result.apply(string(), number());
// InferType → { ok: boolean; value?: string; error?: number }
```

## With default arguments (direct validation without `.apply()`)

Pass a positional defaults array as the first argument to enable direct `.validate()` on the template itself:

```ts
const AnyList = generic(
    [any()],  // default args — one per template parameter
    <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
        object({ items: array(itemSchema), total: number() })
);

// Validate directly using the any() default:
AnyList.validate({ items: [1, 'two', true], total: 3 }); // valid

// Or apply a concrete schema first:
AnyList.apply(string()).validate({ items: ['a', 'b'], total: 2 }); // valid
```

## API

- `generic(templateFn)` — wraps a generic function; call `.apply()` before validating
- `generic(defaults, templateFn)` — wraps a generic function with default arguments; can validate directly
- `.apply(...args)` — calls the template with concrete schemas; returns the concrete builder
- All standard builder methods work: `.optional()`, `.required()`, `.nullable()`, `.default()`, `.catch()`, `.readonly()`, `.brand()`, `.hasType()`, etc.
- `introspect()` exposes `type: 'generic'`, `templateFn`, and `defaults`
- Compatible with the extension system — extensions can target the `"generic"` builder type
