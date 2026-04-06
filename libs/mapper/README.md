# @cleverbrush/mapper

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-96.8%25-brightgreen)
<!-- coverage-badge-end -->

A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations. Uses PropertyDescriptors as pointers to properties (similar to expressions in C# .NET) and enforces **compile-time completeness** — TypeScript will produce an error if any target property is not mapped, auto-mapped, or explicitly ignored.

## Why @cleverbrush/mapper?

**The problem:** Converting between different object shapes — API responses to domain models, domain models to DTOs, database rows to view models — is tedious and error-prone. You write manual mapping functions full of `destination.x = source.y` assignments. Add a new property to a schema and nothing tells you the mapper is incomplete. The bug shows up at runtime, not at compile time.

**The solution:** `@cleverbrush/mapper` uses **PropertyDescriptor-based selectors** (similar to C# expression trees) for type-safe property mapping. The TypeScript compiler enforces that **every target property is mapped** — unmapped properties cause a compile-time error. You literally cannot forget a field.

**What makes it different:**

- **Compile-time completeness** — unmapped properties are a TypeScript error, not a runtime surprise
- **Type-safe selectors** — `.for((t) => t.name).from((s) => s.name)` — fully checked at compile time, not string-based
- **Auto-mapping** — properties with the same name and compatible type are mapped automatically; you only configure what differs
- **Immutable registry** — `configure()` returns a new registry; safe to share and extend
- **No decorators or classes** — works with plain objects and schemas

| Feature | @cleverbrush/mapper | AutoMapper-ts | class-transformer | morphism |
| --- | --- | --- | --- | --- |
| Compile-time completeness | ✓ | ✗ | ✗ | ✗ |
| Type-safe selectors | ✓ | ✗ | ✗ | ✗ |
| No decorators required | ✓ | ✗ | ✗ | ✓ |
| Works without classes | ✓ | ✗ | ✗ | ✓ |
| Auto-mapping | ✓ | ✓ | ✗ | ✗ |
| Immutable registry | ✓ | ✗ | ✗ | ✗ |
| Nested schema support | ✓ | ~ | ~ | ✗ |

## Installation

```bash
npm install @cleverbrush/mapper
```

**Peer dependency:** `@cleverbrush/schema`

## Quick Start

```typescript
import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

// Define source and target schemas
const ApiUser = object({
    first_name: string(),
    last_name:  string(),
    birth_year: number()
});

const DomainUser = object({
    fullName: string(),
    age:      number()
});

// Configure the mapping — returns a new (immutable) registry
const registry = mapper().configure(
    ApiUser,
    DomainUser,
    (m) =>
        m
            .for((t) => t.fullName)
                .compute((src) => src.first_name + ' ' + src.last_name)
            .for((t) => t.age)
                .compute((src) => new Date().getFullYear() - src.birth_year)
);

// Get the mapper function and use it
const mapFn = registry.getMapper(ApiUser, DomainUser);

const dto = await mapFn({
    first_name: 'Jane',
    last_name:  'Doe',
    birth_year: 1995
});
// { fullName: 'Jane Doe', age: <current year - 1995> }
```

## How It Works — Step by Step

1. **Define schemas** — use `@cleverbrush/schema` to define source and target shapes
2. **Configure mappings** — use `.for()` to select a target property, then `.from()`, `.compute()`, or `.ignore()` to define how it's populated
3. **Auto-mapping fills the gaps** — properties with the same name and compatible type are mapped automatically
4. **Get a mapper function** — `registry.getMapper(from, to)` returns an async function that transforms objects
5. **TypeScript enforces completeness** — if any target property is unmapped, you get a compile-time error

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
    //   Types of property '[SYMBOL_UNMAPPED]' are incompatible.
    //     Type '"fullAddress"' is not assignable to type 'never'.
);
```

The error message shows the names of the unmapped properties directly in the type mismatch.

### Type-incompatible `from`

`from` only shows source properties whose `InferType` is assignable to the target property's type. If you select an incompatible property (e.g., mapping a `number` to a `string`), TypeScript produces a compile-time error:

```typescript
// Trying to map a string target from a number source
m.for((t) => t.cityName).from((f) => f.houseNr)
// TS Error: source property type is not assignable to target property type
// Use .compute() instead to transform the value
```

### Unregistered nested mappings

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
const Source = object({
    id:    string(),
    name:  string(),
    email: string(),
    age:   number()
});

const Target = object({
    id:       string(),    // same name + type → auto-mapped
    name:     string(),    // same name + type → auto-mapped
    email:    string(),    // same name + type → auto-mapped
    ageGroup: string()     // different name → must be configured
});

const registry = mapper().configure(Source, Target, (m) =>
    m
        .for((t) => t.ageGroup)
            .compute((src) => src.age < 18 ? 'minor' : 'adult')
    // id, name, email are auto-mapped — no configuration needed!
);
```

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
```

**Ordering matters:** nested mappings must be registered before the parent mapping. Explicit mappings via `compute` or `ignore` take priority over auto-mapping.

## Mapping Strategies

| Strategy | Usage | Purpose |
| --- | --- | --- |
| `.from(selector)` | `.for(t => t.x).from(s => s.y)` | Copy from a source property (supports nested paths) |
| `.compute(fn)` | `.for(t => t.x).compute(s => s.a + s.b)` | Compute from a sync or async function |
| `.ignore()` | `.for(t => t.x).ignore()` | Exclude a target property |
| _(auto-mapped)_ | _(no configuration needed)_ | Same-name, compatible-type primitives or registered nested schemas |

Every non-auto-mappable target property must be either mapped or explicitly ignored. Unmapped properties cause:

- A **compile-time TypeScript type error** — a type-assignability mismatch that includes the unmapped property names in the type parameters
- A **runtime `MapperConfigurationError`** if type checks are bypassed

## API

### `mapper()`

A convenience factory function that creates a new `MappingRegistry`:

```typescript
const registry = mapper()
    .configure(A, B, (m) => ...)
    .configure(C, D, (m) => ...);
```

### `registry.configure(fromSchema, toSchema, fn)`

Defines a mapping between two schemas and returns a new immutable registry containing the mapping. The callback `fn` receives a fresh `Mapper` and must return it after configuring all non-auto-mappable property mappings.

Throws if schemas are invalid, the mapping is a duplicate, or if unmapped properties remain that cannot be auto-mapped.

### `registry.getMapper(fromSchema, toSchema)`

Retrieves a previously registered mapper function. Throws if no mapper has been registered for the given schema pair.

```typescript
const mapFn = registry.getMapper(ApiUser, DomainUser);
const result = await mapFn(sourceObject);
```

### `Mapper`

A fluent builder for configuring how each target property is populated:

- **`.for(selector)`** — selects a target property to configure
- **`.from(selector)`** — maps from a source property (types must be compatible)
- **`.compute(fn)`** — computes the value from the entire source object (sync or async)
- **`.ignore()`** — explicitly excludes the property
- **`.getMapper()`** — returns the mapping function (only available when all properties are mapped)

```typescript
const mapper = new Mapper(SourceSchema, TargetSchema);
const mapFn = mapper
    .for((t) => t.fullName)
        .compute((src) => `${src.firstName} ${src.lastName}`)
    .for((t) => t.age)
        .from((src) => src.years)
    .getMapper();

const result = await mapFn(sourceObject);
```

## Real-World Example

A complete example mapping API responses through multiple layers:

```typescript
import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

// API response shape
const ApiOrderResponse = object({
    order_id:      string(),
    customer_name: string(),
    total_cents:   number(),
    status_code:   number()
});

// Domain model
const Order = object({
    id:         string(),
    customer:   string(),
    totalPrice: string(),
    status:     string()
});

const registry = mapper().configure(
    ApiOrderResponse,
    Order,
    (m) =>
        m
            .for((t) => t.id)
                .from((s) => s.order_id)
            .for((t) => t.customer)
                .from((s) => s.customer_name)
            .for((t) => t.totalPrice)
                .compute((s) => `$${(s.total_cents / 100).toFixed(2)}`)
            .for((t) => t.status)
                .compute((s) => {
                    const statuses: Record<number, string> = {
                        0: 'pending', 1: 'confirmed', 2: 'shipped', 3: 'delivered'
                    };
                    return statuses[s.status_code] ?? 'unknown';
                })
);

const mapOrder = registry.getMapper(ApiOrderResponse, Order);
const order = await mapOrder({
    order_id: 'ORD-123',
    customer_name: 'Alice Smith',
    total_cents: 4999,
    status_code: 2
});
// { id: 'ORD-123', customer: 'Alice Smith', totalPrice: '$49.99', status: 'shipped' }
```

## Code Quality

- **Linting:** [Biome](https://biomejs.dev/) — enforced on every PR via CI
- **Type checking:** TypeScript strict mode — all type selectors and mapping configurations are validated at compile time
- **Unit tests:** [Vitest](https://vitest.dev/) — runtime tests + type-level tests (`expectTypeOf`) covering auto-mapping, computed fields, nested schemas, and compile-time completeness errors
- **CI:** Every pull request must pass lint + build + test before merge — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## License

BSD-3-Clause
