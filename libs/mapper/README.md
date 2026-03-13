# Mapper Branch — Design Document

This document describes the intent and design of changes introduced in the `mapper` branch. The work spans two packages — `@cleverbrush/schema` and `@cleverbrush/mapper` — and can be grouped into three areas:

1. **Property Descriptors** — a type-safe mechanism in `@cleverbrush/schema` for addressing, reading and writing individual properties inside a schema-defined object.
2. **Improved Validation Errors** — custom error messages for every schema constraint and a new `PropertyValidationResult` class that reports errors against the property descriptor tree, giving callers structured, per-property error information.
3. **Schema-to-Schema Mapper** — the new `@cleverbrush/mapper` library that uses property descriptors to declare and execute object-to-object mappings.

---

## 1. Property Descriptors (`@cleverbrush/schema`)

### Problem

Schema builders already know the full structure of an object at definition time, but there was no way to **programmatically address a single property** inside that structure. Users who wanted to read or write a deeply nested field had to hard-code the path themselves and lost type safety.

### Design

A **property descriptor tree** mirrors the shape of an `ObjectSchemaBuilder`. Each node in the tree carries a `PropertyDescriptorInner` hidden behind the `SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR` symbol key. The inner descriptor exposes:

```typescript
type PropertyDescriptorInner<
    TSchema,
    TPropertySchema,
    TParentPropertyDescriptor
> = {
    /** Read the property value from a root object. */
    getValue: (obj: InferType<TSchema>) => {
        value?: InferType<TPropertySchema>;
        success: boolean;
    };
    /** Write a new value. Returns false if the path does not exist in the object. */
    setValue: (
        obj: InferType<TSchema>,
        value: InferType<TPropertySchema>,
        options?: PropertySetterOptions
    ) => boolean;
    /** The schema that describes this property. */
    getSchema: () => TPropertySchema;
    /** Link to the parent descriptor (undefined at root level). */
    parent: PropertyDescriptorInnerFromPropertyDescriptor<TParentPropertyDescriptor>;
};
```

The tree is obtained through a static helper on the `object` function:

```typescript
import { object, string, number, InferType } from '@cleverbrush/schema';

const PersonSchema = object({
    firstName: string(),
    lastName: string(),
    address: object({
        city: string(),
        zip: number()
    })
});

const tree = object.getPropertiesFor(PersonSchema);
```

`tree` now has the same nested shape as `PersonSchema` — `tree.firstName`, `tree.address.city`, etc. — and every node is a property descriptor.

### Reading and writing values

```typescript
const person: InferType<typeof PersonSchema> = {
    firstName: 'Leo',
    lastName: 'Tolstoy',
    address: { city: 'Yasnaya Polyana', zip: 12345 }
};

// Read
const { success, value } =
    tree.address.city[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].getValue(person);
// success === true, value === 'Yasnaya Polyana'

// Write
tree.address.city[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].setValue(person, 'Moscow');
// person.address.city === 'Moscow'
```

When the intermediate path does not exist, `setValue` returns `false` by default. Pass `{ createMissingStructure: true }` to auto-create the missing objects:

```typescript
const empty = {} as any;
tree.address.city[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].setValue(empty, 'Moscow', {
    createMissingStructure: true
});
// empty === { address: { city: 'Moscow' } }
```

### Caching and identity

`object.getPropertiesFor(schema)` caches its result per schema instance, so repeated calls return the **same tree object**. When a schema is derived (e.g. via `.makeAllPropsOptional()`), the new schema gets a fresh descriptor tree.

When the same sub-schema appears inside different parent schemas the descriptors are **distinct** because each node stores a `parent` reference that is specific to its position in the tree.

### Parent traversal

Every descriptor stores a `parent` link, which lets you walk up to the root:

```typescript
const Schema = object({
    level2: object({
        level3: object({
            value: number()
        })
    })
});

const desc =
    object.getPropertiesFor(Schema).level2.level3.value[
        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
    ];

desc.parent; // level3 descriptor
desc.parent.parent; // level2 descriptor
desc.parent.parent.parent; // root descriptor (Schema)
```

### Type-safe property selectors

A `SchemaPropertySelector` callback is the public-facing way to pick a descriptor from a tree:

```typescript
type SchemaPropertySelector<
    TSchema,
    TPropertySchema,
    TAssignableTo,
    TParentPropertyDescriptor
> = (
    tree: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>
) => PropertyDescriptor<TSchema, TPropertySchema, TParentPropertyDescriptor>;
```

This is what the mapper library (see section 3) uses to let users point at source and target properties in a type-safe manner.

---

## 2. Improved Validation Errors

### 2a. Custom error messages (`ValidationErrorMessageProvider`)

Every constraint on the built-in schema builders (`StringSchemaBuilder`, `NumberSchemaBuilder`, `DateSchemaBuilder`, `BooleanSchemaBuilder`, `ArraySchemaBuilder`) now accepts an optional **error message provider**. A provider is either a plain string or a function that receives the seen value and the schema and returns a string (or `Promise<string>`):

```typescript
type ValidationErrorMessageProvider<TSchema> =
    | string
    | ((
          seenValue: InferType<TSchema>,
          schema: TSchema
      ) => string | Promise<string>);
```

Example — every `StringSchemaBuilder` constraint has a corresponding provider:

```typescript
const Name = string()
    .minLength(2, {
        minLengthValidationErrorMessageProvider: 'Name is too short'
    })
    .maxLength(50, {
        maxLengthValidationErrorMessageProvider: (seen) =>
            `"${seen}" exceeds 50 chars`
    });
```

When no custom provider is given the builder falls back to a built-in default (e.g. `"is expected to have a length of at least 2 characters"`). The base `SchemaBuilder` class provides two protected helpers shared by all builders:

- `getValidationErrorMessage(provider, seenValue)` — resolves the provider to a string.
- `assureValidationErrorMessageProvider(provider, defaultProvider)` — normalises and binds the provider during construction.

### 2b. `PropertyValidationResult` and `getErrorsFor()`

`ObjectSchemaBuilder.validate()` now returns an `ObjectSchemaValidationResult` that extends the original `ValidationResult` with a `getErrorsFor()` method:

```typescript
type ObjectSchemaValidationResult<T, TRootSchema, TSchema> =
    ValidationResult<T> & {
        getErrorsFor<TPropertySchema, TParentPropertyDescriptor>(
            selector?: (
                properties: PropertyDescriptorTree<TSchema, TRootSchema>
            ) => PropertyDescriptor<
                TRootSchema,
                TPropertySchema,
                TParentPropertyDescriptor
            >
        ): NestedValidationResult<
            TPropertySchema,
            TRootSchema,
            TParentPropertyDescriptor
        >;
    };
```

`getErrorsFor()` accepts the same kind of property selector callback used elsewhere. It returns a `PropertyValidationResult` instance that holds:

- **`errors`** — a list of error strings specific to the selected property.
- **`seenValue`** — the value the property had at validation time (retrieved through the descriptor).
- **`isValid`** — `true` when there are no errors and no child errors.
- **`getChildErrors()`** — nested `PropertyValidationResult` instances for sub-properties.
- **`descriptor`** — the `PropertyDescriptorInner` for this property.

```typescript
const result = await PersonSchema.validate(person);

if (!result.valid) {
    // errors for the whole address sub-object
    const addressErrors = result.getErrorsFor((p) => p.address);
    console.log(addressErrors.errors); // e.g. ['must be an object']
    console.log(addressErrors.seenValue); // the value seen during validation
    console.log(addressErrors.isValid); // false

    // errors for a leaf property
    const cityErrors = result.getErrorsFor((p) => p.address.city);
    console.log(cityErrors.errors);
}
```

During validation the `ObjectSchemaBuilder` tracks a `currentPropertyDescriptor` that descends into nested objects. When a nested `ObjectSchemaBuilder` validates a child property, it passes the corresponding child descriptor through the `ValidationContext`, so errors are automatically associated with the right node in the descriptor tree.

---

## 3. Schema-to-Schema Mapper (`@cleverbrush/mapper`)

### Installation

```bash
npm install @cleverbrush/mapper
```

### Intent

When working with layered architectures it is common to convert objects between different representations — for example, mapping a domain model to a DTO. `@cleverbrush/mapper` formalises these conversions by binding them to schema definitions so that every mapping is:

- **Type-safe** — TypeScript generics and property selectors ensure source and target property types are checked at compile time.
- **Declarative** — mappings are described through a fluent builder API.
- **Centrally managed** — a `MappingRegistry` stores and retrieves mappers.
- **Async by default** — every mapper returns a `Promise`, so async transforms work without special handling.

### Architecture

```
MappingRegistry            Mapper<TFrom, TTo>
┌────────────────────┐     ┌────────────────────────────────┐
│ map(from, to)      │────▶│ forProp(selector)               │
│ getMapper(from,to) │     │   ├─ ignore()                   │
└────────────────────┘     │   ├─ mapFromProp(selector)      │
                           │   └─ mapFrom(fn)                │
                           │ getMapper() → async function    │
                           └────────────────────────────────┘
```

- **`MappingRegistry`** — stores mapper functions keyed by `(fromSchema, toSchema)` pairs in a nested `Map` for O(1) lookup.
- **`Mapper`** — a fluent builder that configures how each target property is populated. `getMapper()` returns the executable async mapping function.

The `forProp()` method accepts a `SchemaPropertySelector` — the same callback type used by `getErrorsFor()` and `object.getPropertiesFor()` — so property references are shared across the whole framework.

### Example

```typescript
import { object, string, number, InferType } from '@cleverbrush/schema';
import { MappingRegistry } from '@cleverbrush/mapper';

const UserSchema = object({
    name: string(),
    age: number(),
    address: object({
        city: string(),
        houseNr: number()
    })
});

const UserDtoSchema = object({
    name: string(),
    cityName: string(),
    houseNr: string(),
    fullAddress: string(),
    alwaysTen: number().equals(10)
});

const registry = new MappingRegistry();

const mapUserToDto = registry
    .map(UserSchema, UserDtoSchema)
    .forProp((t) => t.name)
    .mapFromProp((f) => f.name)
    .forProp((t) => t.cityName)
    .mapFromProp((f) => f.address.city)
    .forProp((t) => t.houseNr)
    .mapFrom((user) => user.address.houseNr.toString())
    .forProp((t) => t.fullAddress)
    .mapFrom((user) => user.address.city + ' ' + user.address.houseNr)
    .forProp((t) => t.alwaysTen)
    .mapFrom(() => 10)
    .getMapper();

const user: InferType<typeof UserSchema> = {
    name: 'John Doe',
    age: 25,
    address: { city: 'New York', houseNr: 123 }
};

const dto = await mapUserToDto(user);
```

### Mapping strategies

| Strategy                | Usage                                        | Purpose                                                            |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `mapFromProp(selector)` | `.forProp(t => t.x).mapFromProp(s => s.y)`   | Copy from a source property (supports nested paths).               |
| `mapFrom(fn)`           | `.forProp(t => t.x).mapFrom(s => s.a + s.b)` | Compute from a sync or async function receiving the source object. |
| `ignore()`              | `.forProp(t => t.x).ignore()`                | Exclude a target property — prevents `MapperConfigurationError`.   |

Every target property must be either mapped or explicitly ignored. Unmapped properties cause a `MapperConfigurationError` when `getMapper()` is called.

---

## How the pieces fit together

```
                     ┌──────────────────────────┐
                     │   ObjectSchemaBuilder     │
                     │                           │
                     │  ┌─────────────────────┐  │
                     │  │ Property Descriptors │  │
                     │  │ (getValue/setValue)  │  │
                     │  └────────┬────────────┘  │
                     │           │               │
            ┌────────┼───────────┼───────────────┼─────────┐
            │        │           │               │         │
            ▼        │           ▼               │         ▼
   SchemaPropertySelector   Validation          │    MappingRegistry
   (type-safe callbacks)    │                   │    & Mapper
            │        │      ▼                   │         │
            │        │  PropertyValidation      │         │
            │        │  Error (per-property     │         │
            │        │  error reporting)        │         │
            │        │                          │         │
            │        │  Custom Error Messages   │         │
            │        │  (ValidationError        │         │
            │        │   MessageProvider)        │         │
            │        └──────────────────────────┘         │
            │                                             │
            └─────────── shared selector type ────────────┘
```

Property descriptors are the unifying primitive. They give the validation system a way to associate errors with specific properties, and they give the mapper a way to reference source and target fields in a type-safe, schema-aware manner.

## Further Reading

See [Documentation](https://docs.cleverbrush.com/) or the `docs` folder for the generated API reference.
