# @cleverbrush/mapper

A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations. Useful in layered architectures where domain models need to be mapped to DTOs or view models.

## Installation

```bash
npm install @cleverbrush/mapper
```

**Peer dependency:** `@cleverbrush/schema`

## Quick Start

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
    fullAddress: string()
});

const registry = new MappingRegistry();

const mapUserToDto = registry
    .map(UserSchema, UserDtoSchema)
    .forProp((t) => t.name)
    .mapFromProp((f) => f.name)
    .forProp((t) => t.cityName)
    .mapFromProp((f) => f.address.city)
    .forProp((t) => t.fullAddress)
    .mapFrom((user) => `${user.address.city} ${user.address.houseNr}`)
    .getMapper();

const dto = await mapUserToDto({
    name: 'John Doe',
    age: 25,
    address: { city: 'New York', houseNr: 123 }
});
// dto: { name: 'John Doe', cityName: 'New York', fullAddress: 'New York 123' }
```

## API

### `MappingRegistry`

Central registry for storing and retrieving mappers.

```typescript
const registry = new MappingRegistry();
```

#### `registry.map(fromSchema, toSchema)`

Creates a new `Mapper` builder for the given schema pair. Returns the `Mapper` instance for fluent configuration.

#### `registry.getMapper(fromSchema, toSchema)`

Retrieves a previously registered mapper function. Throws if no mapper has been registered for the given schema pair.

### `Mapper`

A fluent builder for configuring how each target property is populated.

#### `.forProp(selector)`

Selects a target property to configure. The selector is a type-safe callback that receives the property descriptor tree:

```typescript
mapper.forProp((target) => target.cityName);
```

After calling `.forProp()`, use one of the following strategies:

#### `.mapFromProp(selector)`

Maps the target property from a source property. Supports nested paths:

```typescript
.forProp((t) => t.cityName)
.mapFromProp((source) => source.address.city)
```

#### `.mapFrom(fn)`

Computes the target property value from the entire source object. Supports both sync and async functions:

```typescript
.forProp((t) => t.fullAddress)
.mapFrom((source) => `${source.address.city} ${source.address.houseNr}`)
```

#### `.ignore()`

Explicitly excludes a target property from mapping:

```typescript
.forProp((t) => t.internalField)
.ignore()
```

#### `.getMapper()`

Returns the configured async mapping function. Throws `MapperConfigurationError` if any target property has not been mapped or explicitly ignored.

```typescript
const mapFn = mapper.getMapper();
const result = await mapFn(sourceObject);
```

## Mapping Strategies

| Strategy | Usage | Purpose |
| --- | --- | --- |
| `mapFromProp(selector)` | `.forProp(t => t.x).mapFromProp(s => s.y)` | Copy from a source property (supports nested paths) |
| `mapFrom(fn)` | `.forProp(t => t.x).mapFrom(s => s.a + s.b)` | Compute from a sync or async function |
| `ignore()` | `.forProp(t => t.x).ignore()` | Exclude a target property |

Every target property must be either mapped or explicitly ignored. Unmapped properties cause a `MapperConfigurationError` when `getMapper()` is called.

## License

BSD-3-Clause
