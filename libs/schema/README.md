This package resides in `@cleverbrush/schema` and contains utilities to define object schemas. Once created a Schema can be used to infer type and validate objects for satisfaction of the Schema.

The library is covered with unit-tests to make sure it works correctly.

## Installation

```bash
    npm install @cleverbrush/schema
```

### An example:

```typescript
import { InferType, object, number, string, date } from '@cleverbrush/schema';

const UserSchema = object({
    id: number(),
    name: string(),
    dateOfBirth: date().optional()
});

// user has { id: number; name: string; dateOfBirth?: Date } type
const user: InferType<typeof UserSchema> = {
    //...
};

const { valid, object: result, errors } = await UserSchema.validate(user);
```

Type inference can be used even on clean JavaScript (without TypeScript):

```javascript
const { valid, object, errors } = await UserSchema.validate(someObject);

if (valid) {
    // someObject satisfies UserSchema.
    // And `object` has { id: number; name: string; dateOfBirth: Date; } type.
} else {
    // someObject does not satisfy UserSchema which means that
    // `errors` contains a list of errors.
}
```

Another way to have types using just Javascript is to make use of JSDoc:

```javascript
/**
 * @type {import('@cleverbrush/schema').InferType<typeof UserSchema>}
 */
const user = {
    // inferred type is { id: number; name: string; dateOfBirth?: Date }
};
```

See [Documentation](https://docs.cleverbrush.com/modules/_cleverbrush_schema.html) or `docs` folder for more information.

## Schema Types

There are several schema types available out of the box:

-   `any` - any object. Similar to the `any` type in TypeScript.
-   `string` - string value.
-   `number` - number value.
-   `boolean` - boolean value.
-   `func` - function value.
-   `object` - object schema (you can define list of properties, along with schemas for every property).
-   `date` - defines object of JavaScript `Date` class.
-   `array` - defines array, you can define a schema for Array emelement.
-   `tuple` - defines a fixed-length array where each position has its own type constraint.
-   `union` - allows to define unions. e.g. `string | number` types (or any combination off schema types from this list).
-   custom schema types. You just need to inherit `SchemaBuilder` abstract class to implement your own schema type.

## What is exported from the library?

Library exports several functions used to define schemas:

-   `any`
-   `string`
-   `number`
-   `boolean`
-   `func`
-   `object`
-   `date`
-   `array`
-   `tuple`
-   `union`

All these functions returns so called schema builders.
Schema builder classes are also exported (in case if you want to develop your own schema builder based on it):

-   `AnySchemaBuilder`
-   `ArraySchemaBuilder`
-   `BooleanSchemaBuilder`
-   `DateSchemaBuilder`
-   `FunctionSchemaBuilder`
-   `ObjectSchemaBuilder`
-   `NumberSchemaBuilder`
-   `SchemaBuilder` - abstract class.
-   `StringSchemaBuilder`
-   `TupleSchemaBuilder`
-   `UnionSchemaBuilder`

## Schema Builders Are Immutable

All schema builders listed above are immutable, which means that every call of it's methods should return a new Schema builder.
For example in the example below call to the `.optional()` method will not affect `UserSchema` or any other schemas using it. Instead it will return a new schema builder:

```ts
const UserSchema = object({
    id: number(),
    email: string()
});

const OrderSchema = object({
    id: number(),
    createdByUser: UserSchema.optional()
});
```

By combining immutable schema builders with TypeScript type inference you can create very powerful schemas
which can be used to validate objects and infer their types.

Every schema is built using a chain/superposition of calls to the schema builder methods. For example:

```ts
const UserSchema = object({
    id: number(),
    email: string()
})
    .optional()
    .addProps({
        name: string()
    });
```

In the example above `UserSchema` is an object schema with two properties: `id` and `email`. It is also optional and has an additional property `name`.

There is also a way to define union schemas. For example example below defines an array of strings or numbers
having at least two elements, but not more than 5:

```ts
const StringOrNumberArraySchema = array()
    .minLength(2)
    .maxLength(5)
    .of(union(string()).or(number()));
```

You can go further and restrict number to be in the range of 0 to 100 by adding more constraints:

```ts
const StringOrNumberArraySchema = array()
    .minLength(2)
    .maxLength(5)
    .of(union(string()).or(number().min(0).max(100)));
```

## Tuple Schemas

Use `tuple` to define a fixed-length array where each position has its own type constraint.
This is the TypeScript tuple equivalent — `tuple([string(), number()])` infers as `[string, number]`.

```ts
import { tuple, string, number, InferType } from '@cleverbrush/schema';

const CoordSchema = tuple([number(), number()]);
// InferType<typeof CoordSchema> === [number, number]

const result = await CoordSchema.validate([10, 20]);
// result.valid === true
// result.object === [10, 20]
```

Validation enforces **exact length** and **per-position types**:

```ts
await CoordSchema.validate([10]);           // invalid — wrong length
await CoordSchema.validate([10, 'hello']);  // invalid — wrong type at index 1
await CoordSchema.validate([10, 20, 30]);   // invalid — wrong length
```

Tuple schemas compose with other builders:

```ts
const EventSchema = tuple([
    string(),                                      // event name
    number(),                                      // timestamp
    object({ userId: string(), action: string() }) // payload
]);
```

### Readonly Tuples

Call `.readonly()` on a tuple schema to mark its inferred type as `readonly`:

```ts
const PointSchema = tuple([number(), number()]).readonly();
// InferType<typeof PointSchema> === readonly [number, number]

const result = await PointSchema.validate([1, 2]);
// result.valid === true
// result.object is typed as readonly [number, number]
```

This is a **type-level only** change. Runtime validation behaviour is identical.
Use `.notReadonly()` to remove the readonly modifier:

```ts
const MutableSchema = PointSchema.notReadonly();
// InferType<typeof MutableSchema> === [number, number]
```

The `isReadonly` flag is also exposed via `.introspect()` for downstream tooling:

```ts
PointSchema.introspect().isReadonly // true
tuple([string(), number()]).introspect().isReadonly // false
```
