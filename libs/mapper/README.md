# @cleverbrush/mapper

A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations. Uses PropertyDescriptors as pointers to properties (similar to expressions in C# .NET) and enforces **compile-time completeness** — TypeScript will produce an error if any target property is not mapped or explicitly ignored.

## Installation

```bash
npm install @cleverbrush/mapper
```

**Peer dependency:** `@cleverbrush/schema`

## Quick Start

```typescript
import { object, string, number } from '@cleverbrush/schema';
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
    fullAddress: string()
});

const registry = new MappingRegistry()
    .configure(UserSchema, UserDtoSchema, (m) =>
        m
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.cityName)
            .mapFromProp((f) => f.address.city)
            .forProp((t) => t.fullAddress)
            .mapFrom((user) => `${user.address.city} ${user.address.houseNr}`)
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

Every target property must be either mapped or explicitly ignored. If you forget to map a property, TypeScript will produce a compile-time error:

```typescript
new MappingRegistry().configure(UserSchema, UserDtoSchema, (m) =>
    m
        .forProp((t) => t.name)
        .mapFromProp((f) => f.name)
        .forProp((t) => t.cityName)
        .mapFromProp((f) => f.address.city)
);
//  Compile-time error: 'fullAddress' is unmapped
```

The error message shows the names of the unmapped properties. Once all properties are mapped or ignored, `getMapper()` becomes callable with zero arguments.

Additionally, `forProp` only shows properties that have not yet been mapped — already-mapped properties disappear from the selector tree, preventing duplicate mappings.

## API

### `MappingRegistry`

Central registry for storing and retrieving mappers.

```typescript
const registry = new MappingRegistry();
```

#### `registry.configure(fromSchema, toSchema, fn)`

Defines a mapping between two schemas and returns a new immutable registry containing the mapping. The callback `fn` receives a fresh `Mapper` and must return it after configuring property mappings. The mapper is automatically finalized and registered. Properties not explicitly mapped or ignored may be auto-mapped if a matching nested mapping is already registered in the registry. Throws if schemas are invalid, the mapping is a duplicate, or unmapped properties remain that cannot be auto-mapped.

#### `registry.getMapper(fromSchema, toSchema)`

Retrieves a previously registered mapper function. Throws if no mapper has been registered for the given schema pair.

### `Mapper`

A fluent builder for configuring how each target property is populated. Can also be used standalone without a registry:

```typescript
const mapper = new Mapper(SourceSchema, TargetSchema);
```

#### `.forProp(selector)`

Selects a target property to configure. The selector uses PropertyDescriptors as pointers — similar to C# expression trees:

```typescript
mapper.forProp((target) => target.cityName);
```

Only unmapped properties appear in the selector. After calling `.forProp()`, use one of the following strategies:

#### `.mapFromProp(selector)`

Maps the target property from a source property. Supports nested paths via PropertyDescriptor navigation. Only source properties with compatible types are shown:

```typescript
.forProp((t) => t.cityName)
.mapFromProp((source) => source.address.city)
```

#### `.mapFrom(fn)`

Computes the target property value from the entire source object. Supports both sync and async functions:

```typescript
.forProp((t) => t.fullAddress)
.mapFrom((source) => `${source.address.city} ${source.address.houseNr}`)

// Async example
.forProp((t) => t.cityName)
.mapFrom(async (source) => {
    return await lookupCityName(source.address.city);
})
```

#### `.ignore()`

Explicitly excludes a target property from mapping. The property will not appear in the output:

```typescript
.forProp((t) => t.internalField)
.ignore()
```

#### `.getMapper()`

Returns the configured async mapping function. Only callable when all target properties have been mapped or explicitly ignored (enforced at compile time). Additionally throws `MapperConfigurationError` at runtime if checks are bypassed.

```typescript
const mapFn = mapper.getMapper();
const result = await mapFn(sourceObject);
```

## Mapping Strategies

| Strategy                | Usage                                        | Purpose                                             |
| ----------------------- | -------------------------------------------- | --------------------------------------------------- |
| `mapFromProp(selector)` | `.forProp(t => t.x).mapFromProp(s => s.y)`   | Copy from a source property (supports nested paths) |
| `mapFrom(fn)`           | `.forProp(t => t.x).mapFrom(s => s.a + s.b)` | Compute from a sync or async function               |
| `ignore()`              | `.forProp(t => t.x).ignore()`                | Exclude a target property                           |

Every target property must be either mapped or explicitly ignored. Unmapped properties cause:

- A **compile-time TypeScript error** showing the unmapped property names
- A **runtime `MapperConfigurationError`** if type checks are bypassed

## License

BSD-3-Clause
