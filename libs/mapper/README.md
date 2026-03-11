# @cleverbrush/mapper

A type-safe, schema-to-schema mapping library built on top of [`@cleverbrush/schema`](../schema/README.md). It provides a declarative way to define how objects of one schema should be transformed into objects of another schema, with full TypeScript type inference.

## Installation

```bash
npm install @cleverbrush/mapper
```

## Overview

When working with layered architectures it is common to convert objects between different representations — for example, mapping a domain model to a Data Transfer Object (DTO). `@cleverbrush/mapper` formalises these transformations by binding them to schema definitions so that every mapping is:

- **Type-safe** — TypeScript generics ensure source and target property types are checked at compile time.
- **Declarative** — mappings are described through a fluent builder API rather than imperative code.
- **Centrally managed** — a `MappingRegistry` acts as a single place to register and retrieve mappers.
- **Async by default** — every mapper returns a `Promise`, making it straightforward to include asynchronous transformations (e.g. fetching related data, I/O operations).

## Quick Start

```typescript
import { object, string, number, InferType } from '@cleverbrush/schema';
import { MappingRegistry } from '@cleverbrush/mapper';

// 1. Define source and target schemas
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

// 2. Create a registry and register a mapping
const registry = new MappingRegistry();

const mapUserToDto = registry
    .map(UserSchema, UserDtoSchema)
    // Map properties with the same name directly
    .forProp((t) => t.name)
    .mapFromProp((f) => f.name)
    // Map from a nested source property
    .forProp((t) => t.cityName)
    .mapFromProp((f) => f.address.city)
    // Custom transformation (number → string)
    .forProp((t) => t.houseNr)
    .mapFrom((user) => user.address.houseNr.toString())
    // Computed property from multiple source fields
    .forProp((t) => t.fullAddress)
    .mapFrom((user) => user.address.city + ' ' + user.address.houseNr)
    // Constant value
    .forProp((t) => t.alwaysTen)
    .mapFrom(() => 10)
    .getMapper();

// 3. Use the mapper
const user: InferType<typeof UserSchema> = {
    name: 'John Doe',
    age: 25,
    address: { city: 'New York', houseNr: 123 }
};

const dto = await mapUserToDto(user);
// dto is typed as InferType<typeof UserDtoSchema>
```

## Design

### Architecture

The library is composed of two main classes and a set of supporting types:

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

- **`MappingRegistry`** — a central repository that stores mapper functions keyed by `(fromSchema, toSchema)` pairs. It uses a nested `Map` structure for O(1) lookup.
- **`Mapper`** — a builder that lets you configure how each target property is populated. Once configuration is complete, `getMapper()` returns an executable async mapping function.

### Design Principles

| Principle | Description |
|---|---|
| **Schema-first** | Mappings are defined between `ObjectSchemaBuilder` instances, not raw object types. This ties transformations to validated schemas. |
| **Type safety** | TypeScript generics flow from schemas through property selectors, so mapping mismatches are caught at compile time. |
| **Explicit over implicit** | Every target property must be explicitly mapped, mapped from a same-named source property, or ignored. Unmapped properties cause a `MapperConfigurationError` when `getMapper()` is called. |
| **Fluent builder** | The `forProp()` → strategy → `forProp()` chain reads like a specification, making mappings self-documenting. |
| **Async by default** | `getMapper()` always returns `(source) => Promise<target>`. Synchronous transforms are wrapped automatically, while async transforms (e.g. database lookups) work without special handling. |

### Core Types

```typescript
/**
 * The function signature returned by getMapper().
 * Takes a source object and returns a Promise resolving to the target type.
 */
type SchemaToSchemaMapperResult<TFromSchema, TToSchema> = (
    from: InferType<TFromSchema>
) => Promise<InferType<TToSchema>>;

/**
 * Strategy returned by forProp() — pick one of three ways
 * to populate the selected target property.
 */
type PropertyMappingStrategy<TFromSchema, TPropertyType, TReturnType> = {
    /** Do not map this property (exclude from output). */
    ignore: () => TReturnType;
    /** Copy from a source property selected by a type-safe selector. */
    mapFromProp: (
        selector: SchemaPropertySelector<TFromSchema, TPropertyType>
    ) => TReturnType;
    /**
     * Compute the value with a custom function.
     * The function receives the source object and may be synchronous
     * or return a Promise.
     */
    mapFrom: (
        fn:
            | ((obj?: InferType<TFromSchema>) => TPropertyType)
            | ((obj?: InferType<TFromSchema>) => Promise<TPropertyType>)
    ) => TReturnType;
};
```

## API Reference

### `MappingRegistry`

The registry holds mapper functions and provides methods to create and retrieve them.

#### `map(fromSchema, toSchema)`

Registers a new mapper for a schema pair and returns a `Mapper` instance for configuration. If a mapper already exists for the same pair it is silently overwritten.

```typescript
const mapper = registry.map(SourceSchema, TargetSchema);
```

- **Parameters**
  - `fromSchema` — an `ObjectSchemaBuilder` representing the source.
  - `toSchema` — an `ObjectSchemaBuilder` representing the target.
- **Returns** — a `Mapper` instance.
- **Throws** — if either argument is not an `ObjectSchemaBuilder` instance.

#### `getMapper(fromSchema, toSchema)`

Retrieves a previously registered mapper function.

```typescript
const mapFn = registry.getMapper(SourceSchema, TargetSchema);
const result = await mapFn(sourceObject);
```

- **Parameters**
  - `fromSchema` — the source schema used when registering.
  - `toSchema` — the target schema used when registering.
- **Returns** — an async mapper function `(source) => Promise<target>`.
- **Throws** — if no mapper has been registered for the given pair.

### `Mapper<TFromSchema, TToSchema>`

A builder for configuring property-level mappings between two schemas.

#### `forProp(selector)`

Selects a target property to configure. Returns a `PropertyMappingStrategy` object with three options:

- **`ignore()`** — skip this property entirely.
- **`mapFromProp(selector)`** — copy the value from a source property chosen by a type-safe selector. Useful for direct or renamed property mappings, including nested paths.
- **`mapFrom(fn)`** — compute the value with a custom function that receives the source object. The function can be synchronous or return a `Promise`.

All three strategy methods return `this`, enabling fluent chaining.

```typescript
mapper
    .forProp((t) => t.targetProp)
    .mapFromProp((s) => s.sourceProp)
    .forProp((t) => t.otherProp)
    .mapFrom((source) => source.a + source.b)
    .forProp((t) => t.unusedProp)
    .ignore();
```

#### `getMapper()`

Finalises the configuration and returns the executable mapper function. If any target properties are neither mapped nor ignored, a `MapperConfigurationError` is thrown.

```typescript
const mapFn: SchemaToSchemaMapperResult<TFrom, TTo> = mapper.getMapper();
```

## Property Mapping Strategies

### Direct property mapping

When source and target properties share the same name and compatible type:

```typescript
.forProp((t) => t.name)
.mapFromProp((s) => s.name)
```

### Nested property mapping

Access deeply nested source properties through the selector:

```typescript
.forProp((t) => t.cityName)
.mapFromProp((s) => s.address.city)
```

### Custom transformation

Transform or combine source values using an arbitrary function:

```typescript
.forProp((t) => t.fullAddress)
.mapFrom((source) => `${source.address.city} ${source.address.houseNr}`)
```

### Async transformation

Perform asynchronous operations during mapping:

```typescript
.forProp((t) => t.country)
.mapFrom(async (source) => {
    return await geoLookup(source.address.city);
})
```

### Constant values

Return a fixed value unrelated to the source:

```typescript
.forProp((t) => t.version)
.mapFrom(() => 1)
```

### Ignoring properties

Explicitly exclude a target property from the mapping to avoid configuration errors:

```typescript
.forProp((t) => t.internalField)
.ignore()
```

## Further Reading

See [Documentation](https://docs.cleverbrush.com/) or the `docs` folder for the generated API reference.
