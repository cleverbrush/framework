# @cleverbrush/mapper

A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations. Uses PropertyDescriptors as pointers to properties (similar to expressions in C# .NET) and enforces **compile-time completeness** — TypeScript will produce an error if any target property is not mapped, auto-mapped, or explicitly ignored.

## Installation

```bash
npm install @cleverbrush/mapper
```

**Peer dependency:** `@cleverbrush/schema`

## Quick Start

```typescript
import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

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
    fullAddress: string()
});

const registry = mapper().configure(
    UserSchema,
    UserDtoSchema,
    (m) =>
        m
            .for((t) => t.name)
            .from((f) => f.name)
            .for((t) => t.cityName)
            .from((f) => f.address.city)
            .for((t) => t.fullAddress)
            .compute((user) => `${user.address.city} ${user.address.houseNr}`)
);

const mapUserToDto = registry.getMapper(UserSchema, UserDtoSchema);

const dto = await mapUserToDto({
    name: 'John Doe',
    age: 25,
    address: { city: 'New York', houseNr: 123 }
});
// dto: { name: 'John Doe', cityName: 'New York', fullAddress: 'New York 123' }
```

## Compile-Time Safety

The mapper enforces multiple layers of compile-time safety:

### Unmapped properties

Every target property must be either mapped, auto-mapped, or explicitly ignored. If you forget to map a property, TypeScript will produce a compile-time error on the `configure` callback return:

```typescript
mapper().configure(
    UserSchema,
    UserDtoSchema,
    (m) =>
        m
            .for((t) => t.name)
            .from((f) => f.name)
            .for((t) => t.cityName)
            .from((f) => f.address.city)
    // TS Error: Type 'Mapper<..., "fullAddress", ...>' is not assignable to
    // type 'Mapper<..., never, ...>'.
    //   Types of property '__unmapped' are incompatible.
    //     Type '"fullAddress"' is not assignable to type 'never'.
);
```

The error message shows the names of the unmapped properties directly in the type mismatch.

### Type-incompatible `from`

`from` only shows source properties whose `InferType` is assignable to the target property's type. If you select an incompatible property (e.g., mapping a `number` to a `string`), TypeScript produces a compile-time error:

```typescript
const AddressSchema = object({ city: string(), houseNr: number() });
const AddressDtoSchema = object({ city: string() });

mapper().configure(
    AddressSchema,
    AddressDtoSchema,
    (m) => m.for((t) => t.city).from((f) => f.houseNr) // TS Error: source property type is
    // not assignable to target property type
);
```

### Unregistered ObjectSchemaBuilder mappings

When `from` maps between two `ObjectSchemaBuilder` properties, a mapping for that schema pair must be registered in the registry first. Otherwise, TypeScript produces a compile-time error:

```typescript
const PersonSchema = object({ name: string(), address: AddressSchema });
const PersonDtoSchema = object({ name: string(), address: AddressDtoSchema });

// Error — AddressSchema→AddressDtoSchema is not registered
mapper().configure(
    PersonSchema,
    PersonDtoSchema,
    (m) =>
        m
            .for((t) => t.name)
            .from((f) => f.name)
            .for((t) => t.address)
            .from((f) => f.address) // TS Error: Register a mapping for the
    // source→target schema pair first
);
```

## Auto-Mapping

Properties that can be automatically determined don't need explicit mapping configuration. Auto-mapping activates in two scenarios:

### Same-name, same-type primitives

When the source and target schemas have a property with the **same name** and **compatible `InferType`**, it is auto-mapped automatically:

```typescript
const SourceSchema = object({ city: string(), houseNr: number() });
const TargetSchema = object({ city: string(), houseNr: string() });

// Only houseNr needs explicit mapping — city is auto-mapped (string → string)
const registry = mapper().configure(
    SourceSchema,
    TargetSchema,
    (m) => m.for((t) => t.houseNr).compute((f) => f.houseNr.toString())
);
```

Properties with incompatible types (e.g., `number` source → `string` target) or properties that exist only in the target schema are **not** auto-mapped and must be explicitly configured.

### Nested ObjectSchemaBuilder properties

When both the source and target have a same-name property that is an `ObjectSchemaBuilder`, and a mapping for that schema pair has been previously registered, the nested property is auto-mapped using the registered mapper:

```typescript
const AddressSchema = object({ city: string(), houseNr: number() });
const AddressDtoSchema = object({ city: string() });

const PersonSchema = object({ name: string(), address: AddressSchema });
const PersonDtoSchema = object({ name: string(), address: AddressDtoSchema });

const registry = mapper()
    // Register Address mapping first
    .configure(AddressSchema, AddressDtoSchema, (m) =>
        m.for((t) => t.city).from((f) => f.city)
    )
    // address is auto-mapped using the registered AddressSchema→AddressDtoSchema mapper
    .configure(PersonSchema, PersonDtoSchema, (m) =>
        m.for((t) => t.name).from((f) => f.name)
    );

const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
const result = await mapFn({
    name: 'Alice',
    address: { city: 'Berlin', houseNr: 10 }
});
// result: { name: 'Alice', address: { city: 'Berlin' } }
// houseNr is dropped because it's not in AddressDtoSchema
```

**Ordering matters:** nested mappings must be registered before the parent mapping. Explicit mappings via `compute` or `ignore` take priority over auto-mapping.

## API

### `MappingRegistry`

Central registry for storing and retrieving mappers. Each `configure` call returns a **new immutable registry** — the original is not modified.

```typescript
const registry = mapper();
```

### `mapper()`

A convenience factory function that creates a new `MappingRegistry`. Equivalent to `new MappingRegistry()` but reads better in a fluent chain:

```typescript
const registry = mapper()
    .configure(A, B, (m) => ...)
    .configure(C, D, (m) => ...);
```

#### `registry.configure(fromSchema, toSchema, fn)`

Defines a mapping between two schemas and returns a new immutable registry containing the mapping. The callback `fn` receives a fresh `Mapper` and must return it after configuring all non-auto-mappable property mappings. The mapper is automatically finalized and registered.

The `configure` callback only needs to explicitly map or ignore properties that **cannot** be auto-mapped. The `for` selector can target any property in the target schema; you typically only use it for non-auto-mappable properties or when you want to override the default auto-mapping behavior for a particular property.

Throws if schemas are invalid, the mapping is a duplicate, or if, after applying auto-mapping and any explicit `compute`/`ignore` rules, unmapped properties remain that cannot be auto-mapped.

#### `registry.getMapper(fromSchema, toSchema)`

Retrieves a previously registered mapper function. Throws if no mapper has been registered for the given schema pair.

### `Mapper`

A fluent builder for configuring how each target property is populated. Can also be used standalone without a registry:

```typescript
const mapper = new Mapper(SourceSchema, TargetSchema);
```

#### `.for(selector)`

Selects a target property to configure. The selector uses PropertyDescriptors as pointers — similar to C# expression trees:

```typescript
mapper.for((target) => target.cityName);
```

After calling `.for()`, use one of the following strategies:

#### `.from(selector)`

Maps the target property from a source property. Supports nested paths via PropertyDescriptor navigation. Only source properties with compatible types are shown. When mapping between `ObjectSchemaBuilder` properties, a mapping for the source→target schema pair must be registered first:

```typescript
.for((t) => t.cityName)
.from((source) => source.address.city)
```

#### `.compute(fn)`

Computes the target property value from the entire source object. Supports both sync and async functions:

```typescript
.for((t) => t.fullAddress)
.compute((source) => `${source.address.city} ${source.address.houseNr}`)

// Async example
.for((t) => t.cityName)
.compute(async (source) => {
    return await lookupCityName(source.address.city);
})
```

#### `.ignore()`

Explicitly excludes a target property from mapping. The property will not appear in the output:

```typescript
.for((t) => t.internalField)
.ignore()
```

#### `.getMapper()`

Returns the configured async mapping function. Only callable when all target properties have been mapped or explicitly ignored (enforced at compile time). Additionally throws `MapperConfigurationError` at runtime if checks are bypassed.

```typescript
const mapFn = mapper.getMapper();
const result = await mapFn(sourceObject);
```

## Mapping Strategies

| Strategy                | Usage                                        | Purpose                                                            |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `from(selector)` | `.for(t => t.x).from(s => s.y)`   | Copy from a source property (supports nested paths)                |
| `compute(fn)`           | `.for(t => t.x).compute(s => s.a + s.b)` | Compute from a sync or async function                              |
| `ignore()`              | `.for(t => t.x).ignore()`                | Exclude a target property                                          |
| _(auto-mapped)_         | _(no configuration needed)_                  | Same-name, compatible-type primitives or registered nested schemas |

Every non-auto-mappable target property must be either mapped or explicitly ignored. Unmapped properties cause:

- A **compile-time TypeScript error** showing the unmapped property names
- A **runtime `MapperConfigurationError`** if type checks are bypassed

## License

BSD-3-Clause
