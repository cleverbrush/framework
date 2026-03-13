# @cleverbrush/schema

A schema definition and validation library for TypeScript. Define object schemas, infer their TypeScript types, and validate data at runtime — all with a single, immutable, fluent API.

## Installation

```bash
npm install @cleverbrush/schema
```

## Quick Start

```typescript
import { InferType, object, number, string, date } from '@cleverbrush/schema';

const UserSchema = object({
    id: number(),
    name: string(),
    dateOfBirth: date().optional()
});

// Infer the TypeScript type: { id: number; name: string; dateOfBirth?: Date }
type User = InferType<typeof UserSchema>;

const user: User = {
    id: 1,
    name: 'Alice',
    dateOfBirth: new Date('1990-01-01')
};

const { valid, object: result, errors } = await UserSchema.validate(user);
```

Type inference works in plain JavaScript too, using JSDoc:

```javascript
/**
 * @type {import('@cleverbrush/schema').InferType<typeof UserSchema>}
 */
const user = {
    // type is inferred as { id: number; name: string; dateOfBirth?: Date }
};
```

## Schema Types

The following builder functions are available:

| Function | Description |
| --- | --- |
| `any()` | Any value. Similar to TypeScript's `any` type. |
| `string()` | String value with constraints like `minLength`, `maxLength`, `matches`, `equals`. |
| `number()` | Numeric value with constraints like `min`, `max`, `equals`. |
| `boolean()` | Boolean value. |
| `date()` | JavaScript `Date` instance. |
| `func()` | Function value. |
| `object(props)` | Object with typed properties. Supports nested schemas. |
| `array()` | Array with optional element schema (via `.of()`). |
| `union(schema)` | Union of schemas — e.g. `string \| number`. Combine with `.or()`. |

## Immutability

All schema builders are immutable. Every method call returns a **new** schema builder instance, so existing schemas are never modified:

```typescript
const UserSchema = object({
    id: number(),
    email: string()
});

const OrderSchema = object({
    id: number(),
    createdByUser: UserSchema.optional() // UserSchema is not modified
});
```

## Composing Schemas

Schemas are built by chaining method calls:

```typescript
const UserSchema = object({
    id: number(),
    email: string()
})
    .optional()
    .addProps({
        name: string()
    });
```

Union types and array constraints can be combined freely:

```typescript
// Array of strings or numbers, with 2–5 elements, numbers in 0–100 range
const MixedArray = array()
    .minLength(2)
    .maxLength(5)
    .of(union(string()).or(number().min(0).max(100)));
```

## Validation

Every schema builder has an async `validate()` method:

```typescript
const { valid, object, errors } = await UserSchema.validate(someObject);

if (valid) {
    // `object` has the inferred type
} else {
    // `errors` is a list of error strings
}
```

### Custom Error Messages

Every constraint accepts an optional error message provider — either a plain string or a function:

```typescript
const Name = string()
    .minLength(2, {
        minLengthValidationErrorMessageProvider: 'Name is too short'
    })
    .maxLength(50, {
        maxLengthValidationErrorMessageProvider: (seen) =>
            `"${seen}" exceeds 50 characters`
    });
```

### Per-Property Errors with `getErrorsFor()`

`ObjectSchemaBuilder.validate()` returns an extended result with a `getErrorsFor()` method for inspecting errors on individual properties:

```typescript
const PersonSchema = object({
    name: string().minLength(1),
    address: object({
        city: string(),
        zip: number()
    })
});

const result = await PersonSchema.validate(person);

if (!result.valid) {
    const addressErrors = result.getErrorsFor((p) => p.address);
    console.log(addressErrors.errors);    // e.g. ['must be an object']
    console.log(addressErrors.seenValue); // the value seen during validation
    console.log(addressErrors.isValid);   // false

    const cityErrors = result.getErrorsFor((p) => p.address.city);
    console.log(cityErrors.errors);
}
```

## Property Descriptors

For advanced use cases, schema property descriptors provide type-safe programmatic access to read and write individual properties on schema-defined objects:

```typescript
import { object, string, number, SYMBOL_SCHEMA_PROPERTY } from '@cleverbrush/schema';

const PersonSchema = object({
    firstName: string(),
    lastName: string(),
    address: object({
        city: string(),
        zip: number()
    })
});

const tree = object.getPropertiesFor(PersonSchema);

const person = {
    firstName: 'Leo',
    lastName: 'Tolstoy',
    address: { city: 'Yasnaya Polyana', zip: 12345 }
};

// Read a value
const { success, value } =
    tree.address.city[SYMBOL_SCHEMA_PROPERTY].getValue(person);
// success === true, value === 'Yasnaya Polyana'

// Write a value
tree.address.city[SYMBOL_SCHEMA_PROPERTY].setValue(person, 'Moscow');
```

## Exports

**Builder functions:** `any`, `string`, `number`, `boolean`, `func`, `object`, `date`, `array`, `union`

**Builder classes** (for extending): `SchemaBuilder`, `AnySchemaBuilder`, `ArraySchemaBuilder`, `BooleanSchemaBuilder`, `DateSchemaBuilder`, `FunctionSchemaBuilder`, `NumberSchemaBuilder`, `ObjectSchemaBuilder`, `StringSchemaBuilder`, `UnionSchemaBuilder`

**Types:** `InferType`, `ValidationResult`, `ValidationError`, `MakeOptional`, `SchemaPropertySelector`

See [API documentation](https://docs.cleverbrush.com/) for the full reference.

## License

BSD-3-Clause
