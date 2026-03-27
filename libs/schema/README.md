# @cleverbrush/schema

A schema definition and validation library for TypeScript. Define object schemas, infer their TypeScript types, and validate data at runtime — all with a single, immutable, fluent API.

## Why @cleverbrush/schema?

**The problem:** In a typical TypeScript project, types and runtime validation are separate concerns. You define a `User` type in one file, then write Joi / Yup / Zod schemas (or manual `if` checks) in another. Over time these drift apart — the type says a field is required, but the validation allows it to be `undefined`. Tests pass, but production data breaks because the validation didn't match the type.

**The solution:** `@cleverbrush/schema` lets you define a schema **once** and derive both the TypeScript type (via `InferType`) and runtime validation from the same source. Because every method returns a **new builder instance** (immutability), you can safely compose and extend schemas without accidentally mutating shared definitions.

**What makes it different from Zod / Yup / Joi:**

- **PropertyDescriptors** — a runtime descriptor tree that other tools can introspect. The [`@cleverbrush/mapper`](../mapper) uses it for type-safe property selectors. The [`@cleverbrush/react-form`](../react-form) uses it to auto-generate form fields with correct validation. This makes the schema library a **foundation** for an entire ecosystem — not just a standalone validation tool.
- **JSDoc comment preservation** — JSDoc comments on schema properties carry through to the inferred TypeScript type, so IDE tooltips and autocomplete descriptions come from the schema definition itself.
- **Zero dependencies** — no runtime dependencies at all.

| Feature | @cleverbrush/schema | Zod | Yup | Joi |
| --- | --- | --- | --- | --- |
| TypeScript type inference | ✓ | ✓ | ~ | ✗ |
| Immutable schemas | ✓ | ✓ | ✗ | ✗ |
| PropertyDescriptors | ✓ | ✗ | ✗ | ~ |
| JSDoc preservation | ✓ | ✗ | ✗ | ✗ |
| Zero dependencies | ✓ | ✓ | ✗ | ✗ |
| Async validation | ✓ | ✓ | ✓ | ✓ |
| Per-property error inspection | ✓ | ~ | ~ | ~ |

## Installation

```bash
npm install @cleverbrush/schema
```

## Quick Start

```typescript
import { object, string, number, boolean, InferType } from '@cleverbrush/schema';

// 1. Define a schema with fluent constraints
const UserSchema = object({
    name:     string().minLength(2, 'Name must be at least 2 characters'),
    email:    string().minLength(5, 'Please enter a valid email'),
    age:      number().min(0, 'Age cannot be negative').max(150),
    isActive: boolean()
});

// 2. TypeScript type is inferred automatically — no duplication!
type User = InferType<typeof UserSchema>;
// Equivalent to: { name: string; email: string; age: number; isActive: boolean }

// 3. Validate data at runtime using the same schema
const result = await UserSchema.validate({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    isActive: true
});

if (result.valid) {
    console.log('Validated:', result.object); // typed as User
} else {
    console.log('Errors:', result.errors);
    // Array of { path: string; message: string }
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

The following builder functions are available:

| Function | Description | Key Methods |
| --- | --- | --- |
| `any()` | Any value. Similar to TypeScript's `any` type. | `.optional()`, `.addValidator(fn)` |
| `string()` | String value with constraints. | `.minLength(n)`, `.maxLength(n)`, `.matches(re)`, `.optional()` |
| `number()` | Numeric value with constraints. | `.min(n)`, `.max(n)`, `.integer()`, `.optional()` |
| `boolean()` | Boolean value. | `.optional()` |
| `date()` | JavaScript `Date` instance. | `.optional()` |
| `func()` | Function value. | `.optional()` |
| `object(props)` | Object with typed properties. Supports nesting. | `.validate(data)`, `.addProps({...})`, `.optional()` |
| `array()` | Array with optional element schema (via `.of()`). | `.minLength(n)`, `.maxLength(n)`, `.of(schema)`, `.optional()` |
| `union(schema)` | Union of schemas — e.g. `string \| number`. | `.or(schema)`, `.validate(data)`, `.optional()` |

## Immutability

All schema builders are immutable. Every method call returns a **new** schema builder instance, so existing schemas are never modified:

```typescript
const base = string().minLength(1);
const strict = base.maxLength(50);  // new instance — base is unchanged
const loose  = base.optional();     // another new instance

// base still only has minLength(1)
// strict has minLength(1) + maxLength(50)
// loose has minLength(1) + optional
```

This is especially powerful when building a library of reusable schema fragments:

```typescript
const Email = string().minLength(5).maxLength(255);
const Name  = string().minLength(1).maxLength(100);

const CreateUser = object({ name: Name, email: Email });
const UpdateUser = object({ name: Name.optional(), email: Email.optional() });
// Both schemas share the same base constraints but differ in optionality
```

## Composing Schemas

Schemas can be extended with additional properties, combined with unions, or nested inside arrays and objects:

```typescript
import { object, string, number, array, union } from '@cleverbrush/schema';

// Extend an existing schema with new properties
const BaseEntity = object({
    id:        string(),
    createdAt: string()
});

const UserEntity = BaseEntity.addProps({
    name:  string().minLength(2),
    email: string().minLength(5)
});

// Nest objects inside arrays
const TeamSchema = object({
    name:    string().minLength(1),
    members: array().of(UserEntity).minLength(1).maxLength(50)
});

// Union types
const IdOrEmail = union(string().minLength(1)).or(
    string().matches(/^[^@]+@[^@]+$/)
);
```

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

## Validation

Every schema builder has an async `validate()` method:

```typescript
const result = await UserSchema.validate(someObject);

if (result.valid) {
    console.log(result.object); // typed as InferType<typeof UserSchema>
} else {
    console.log(result.errors); // Array of { path: string; message: string }
}
```

### Collecting All Errors

By default, validation stops at the first error. Pass `{ doNotStopOnFirstError: true }` to collect all errors at once:

```typescript
const result = await UserSchema.validate(
    { name: 'A', email: '', age: -5, isActive: true },
    { doNotStopOnFirstError: true }
);

console.log(result.errors);
// [
//   { path: '$.name', message: 'Name must be at least 2 characters' },
//   { path: '$.email', message: 'Please enter a valid email' },
//   { path: '$.age', message: 'Age cannot be negative' }
// ]
```

### Custom Error Messages

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
        return { valid: false, errors: [{ message: 'Passwords do not match' }] };
    }
    return { valid: true };
});
```

### Per-Property Errors with `getErrorsFor()`

`ObjectSchemaBuilder.validate()` returns an extended result with a `getErrorsFor()` method for inspecting errors on individual properties — perfect for showing inline form errors:

```typescript
const PersonSchema = object({
    name: string().minLength(1),
    address: object({
        city: string(),
        zip: number()
    })
});

const result = await PersonSchema.validate(person, { doNotStopOnFirstError: true });

if (!result.valid) {
    // Get errors for a single property
    const nameErrors = result.getErrorsFor((p) => p.name);
    console.log(nameErrors.isValid);    // false
    console.log(nameErrors.errors);     // ['must be at least 1 character']
    console.log(nameErrors.seenValue);  // the value that was validated

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
import { object, string, number, ObjectSchemaBuilder } from '@cleverbrush/schema';

const UserSchema = object({
    name:    string().minLength(2),
    address: object({
        city: string(),
        zip:  number()
    })
});

// Get the PropertyDescriptor tree
const tree = ObjectSchemaBuilder.getPropertiesFor(UserSchema);

// Use descriptors as selectors in mapper and react-form:
// mapper:     .for((t) => t.name).from((s) => s.name)
// react-form: <Field selector={(t) => t.address.city} form={form} />
```

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

**Builder functions:** `any`, `string`, `number`, `boolean`, `func`, `object`, `date`, `array`, `union`

**Builder classes** (for extending): `SchemaBuilder`, `AnySchemaBuilder`, `ArraySchemaBuilder`, `BooleanSchemaBuilder`, `DateSchemaBuilder`, `FunctionSchemaBuilder`, `NumberSchemaBuilder`, `ObjectSchemaBuilder`, `StringSchemaBuilder`, `UnionSchemaBuilder`

**Types:** `InferType`, `ValidationResult`, `ValidationError`, `MakeOptional`, `SchemaPropertySelector`, `PropertyDescriptor`, `PropertyDescriptorTree`

See [API documentation](https://docs.cleverbrush.com/) for the full reference.

## License

BSD-3-Clause
