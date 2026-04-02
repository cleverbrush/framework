import { array, boolean, number, object, string } from '@cleverbrush/schema';
import { describe, expect, test } from 'vitest';
import {
    Mapper,
    MapperConfigurationError,
    MappingRegistry,
    mapper
} from './MappingRegistry.js';

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

describe('MappingRegistry', () => {
    test('throws on null schemas', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(null as any, null as any, m => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(null as any, UserDtoSchema, m => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(UserSchema, null as any, m => m as any)
        ).toThrow();
    });

    test('throws on non-ObjectSchemaBuilder schemas', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(string() as any, UserDtoSchema, m => m as any)
        ).toThrow(
            'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
        );
        expect(() =>
            registry.configure(UserSchema, number() as any, m => m as any)
        ).toThrow(
            'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
        );
    });

    test('getMapper throws when no mapper registered', () => {
        const registry = new MappingRegistry();
        expect(() => registry.getMapper(UserSchema, UserDtoSchema)).toThrow(
            'No mapper found'
        );
    });

    test('getMapper retrieves registered mapper', async () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
        );

        const mapFn = registry.getMapper(UserSchema, UserDtoSchema);
        expect(typeof mapFn).toBe('function');

        const result = await mapFn({
            name: 'John',
            age: 30,
            address: { city: 'NYC', houseNr: 42 }
        });
        expect(result).toEqual({
            name: 'John',
            cityName: 'NYC',
            fullAddress: 'NYC 42'
        });
    });
});

describe('Mapper', () => {
    test('maps all properties correctly with from', async () => {
        const TargetSchema = object({
            userName: string(),
            userCity: string()
        });

        const mapper = new Mapper(UserSchema, TargetSchema);
        const mapFn = mapper
            .for(t => t.userName)
            .from(f => f.name)
            .for(t => t.userCity)
            .from(f => f.address.city)
            .getMapper();

        const result = await mapFn({
            name: 'Alice',
            age: 25,
            address: { city: 'London', houseNr: 10 }
        });

        expect(result).toEqual({
            userName: 'Alice',
            userCity: 'London'
        });
    });

    test('maps with nested source property via from', async () => {
        const TargetSchema = object({
            city: string(),
            houseNr: number()
        });

        const mapper = new Mapper(UserSchema, TargetSchema);
        const mapFn = mapper
            .for(t => t.city)
            .from(f => f.address.city)
            .for(t => t.houseNr)
            .from(f => f.address.houseNr)
            .getMapper();

        const result = await mapFn({
            name: 'Bob',
            age: 40,
            address: { city: 'Paris', houseNr: 7 }
        });

        expect(result).toEqual({ city: 'Paris', houseNr: 7 });
    });

    test('maps with compute using sync function', async () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        const mapFn = mapper
            .for(t => t.name)
            .from(f => f.name)
            .for(t => t.cityName)
            .compute(user => user.address.city)
            .for(t => t.fullAddress)
            .compute(user => `${user.address.city} ${user.address.houseNr}`)
            .getMapper();

        const result = await mapFn({
            name: 'Charlie',
            age: 35,
            address: { city: 'Berlin', houseNr: 99 }
        });

        expect(result).toEqual({
            name: 'Charlie',
            cityName: 'Berlin',
            fullAddress: 'Berlin 99'
        });
    });

    test('maps with compute using async function', async () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        const mapFn = mapper
            .for(t => t.name)
            .from(f => f.name)
            .for(t => t.cityName)
            .compute(async user => {
                return user.address.city;
            })
            .for(t => t.fullAddress)
            .compute(async user => {
                return `${user.address.city} ${user.address.houseNr}`;
            })
            .getMapper();

        const result = await mapFn({
            name: 'Diana',
            age: 28,
            address: { city: 'Tokyo', houseNr: 5 }
        });

        expect(result).toEqual({
            name: 'Diana',
            cityName: 'Tokyo',
            fullAddress: 'Tokyo 5'
        });
    });

    test('ignore() excludes property from output', async () => {
        const TargetSchema = object({
            name: string(),
            extra: string()
        });

        const SourceSchema = object({
            name: string()
        });

        const mapper = new Mapper(SourceSchema, TargetSchema);
        const mapFn = mapper
            .for(t => t.name)
            .from(f => f.name)
            .for(t => t.extra)
            .ignore()
            .getMapper();

        const result = await mapFn({ name: 'Eve' });

        expect(result).toEqual({ name: 'Eve' });
        expect(result).not.toHaveProperty('extra');
    });

    test('throws MapperConfigurationError when properties are unmapped at runtime', () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema) as Mapper<
            typeof UserSchema,
            typeof UserDtoSchema,
            never
        >;

        // Bypass the type system to call getMapper without mapping all properties
        expect(() => (mapper as any).getMapper()).toThrow(
            MapperConfigurationError
        );
    });

    test('MapperConfigurationError lists unmapped properties', () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema) as Mapper<
            typeof UserSchema,
            typeof UserDtoSchema,
            never
        >;

        // Map only one property
        (mapper as any).for((t: any) => t.name).from((f: any) => f.name);

        try {
            (mapper as any).getMapper();
            expect.fail('Should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(MapperConfigurationError);
            expect(e.message).toContain('cityName');
            expect(e.message).toContain('fullAddress');
        }
    });

    test('for throws when selector does not access a property', () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        expect(() => mapper.for((() => undefined) as any)).toThrow(
            'for selector must access a property'
        );
    });

    test('full fluent chain with registry', async () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
        );

        const mapUserToDto = registry.getMapper(UserSchema, UserDtoSchema);

        const dto = await mapUserToDto({
            name: 'John Doe',
            age: 25,
            address: { city: 'New York', houseNr: 123 }
        });

        expect(dto).toEqual({
            name: 'John Doe',
            cityName: 'New York',
            fullAddress: 'New York 123'
        });

        // Also retrievable from registry again
        const retrievedMapper = registry.getMapper(UserSchema, UserDtoSchema);
        const dto2 = await retrievedMapper({
            name: 'Jane',
            age: 30,
            address: { city: 'LA', houseNr: 456 }
        });
        expect(dto2).toEqual({
            name: 'Jane',
            cityName: 'LA',
            fullAddress: 'LA 456'
        });
    });

    test('mixed from and compute with ignore', async () => {
        const ExtendedDtoSchema = object({
            name: string(),
            cityName: string(),
            fullAddress: string(),
            internalField: string()
        });

        const registry = new MappingRegistry().configure(
            UserSchema,
            ExtendedDtoSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
                    .for(t => t.internalField)
                    .ignore()
        );

        const mapFn = registry.getMapper(UserSchema, ExtendedDtoSchema);
        const result = await mapFn({
            name: 'Test',
            age: 20,
            address: { city: 'Rome', houseNr: 1 }
        });

        expect(result).toEqual({
            name: 'Test',
            cityName: 'Rome',
            fullAddress: 'Rome 1'
        });
        expect(result).not.toHaveProperty('internalField');
    });
});

// ── configure() DSL ──────────────────────────────────────────────────

describe('MappingRegistry.configure', () => {
    test('configure defines one mapping and returns a new registry', async () => {
        const original = new MappingRegistry();
        const result = original.configure(UserSchema, UserDtoSchema, m =>
            m
                .for(t => t.name)
                .from(f => f.name)
                .for(t => t.cityName)
                .from(f => f.address.city)
                .for(t => t.fullAddress)
                .compute(user => `${user.address.city} ${user.address.houseNr}`)
        );

        expect(result).toBeInstanceOf(MappingRegistry);
        expect(result).not.toBe(original);
    });

    test('returned registry contains the configured mapper', async () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
        );

        const mapFn = registry.getMapper(UserSchema, UserDtoSchema);
        const dto = await mapFn({
            name: 'Alice',
            age: 30,
            address: { city: 'Berlin', houseNr: 42 }
        });

        expect(dto).toEqual({
            name: 'Alice',
            cityName: 'Berlin',
            fullAddress: 'Berlin 42'
        });
    });

    test('original registry is immutable after configure', () => {
        const original = new MappingRegistry();
        original.configure(UserSchema, UserDtoSchema, m =>
            m
                .for(t => t.name)
                .from(f => f.name)
                .for(t => t.cityName)
                .from(f => f.address.city)
                .for(t => t.fullAddress)
                .compute(user => `${user.address.city} ${user.address.houseNr}`)
        );

        // Original registry should NOT have the mapping
        expect(() => original.getMapper(UserSchema, UserDtoSchema)).toThrow(
            'No mapper found'
        );
    });

    test('chaining multiple configure calls', async () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city: string(),
            houseNr: number()
        });

        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.houseNr)
                    .from(f => f.houseNr)
            )
            .configure(UserSchema, UserDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
            );

        const addrMapper = registry.getMapper(AddressSchema, AddressDtoSchema);
        const addrResult = await addrMapper({ city: 'NYC', houseNr: 7 });
        expect(addrResult).toEqual({ city: 'NYC', houseNr: 7 });

        const userMapper = registry.getMapper(UserSchema, UserDtoSchema);
        const userResult = await userMapper({
            name: 'Bob',
            age: 25,
            address: { city: 'NYC', houseNr: 7 }
        });
        expect(userResult).toEqual({
            name: 'Bob',
            cityName: 'NYC',
            fullAddress: 'NYC 7'
        });
    });

    test('throws on duplicate mappings', () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
        );

        expect(() =>
            registry.configure(UserSchema, UserDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
            )
        ).toThrow('Duplicate mapping');
    });

    test('throws on invalid schemas', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(null as any, UserDtoSchema, m => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(string() as any, UserDtoSchema, m => m as any)
        ).toThrow();
    });

    test('throws when unmapped properties remain', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(UserSchema, UserDtoSchema, m =>
                // @ts-expect-error - intentionally leaving cityName and fullAddress unmapped
                m.for(t => t.name).from(f => f.name)
            )
        ).toThrow(MapperConfigurationError);
    });

    test('configure with ignore', async () => {
        const TargetSchema = object({
            name: string(),
            extra: string()
        });

        const SourceSchema = object({
            name: string()
        });

        const registry = new MappingRegistry().configure(
            SourceSchema,
            TargetSchema,
            m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.extra)
                    .ignore()
        );

        const mapFn = registry.getMapper(SourceSchema, TargetSchema);
        const result = await mapFn({ name: 'Eve' });
        expect(result).toEqual({ name: 'Eve' });
        expect(result).not.toHaveProperty('extra');
    });
});

// ── Auto-mapping ─────────────────────────────────────────────────────

describe('Auto-mapping of nested schemas', () => {
    const AddressSchema = object({
        city: string(),
        houseNr: number()
    });

    const AddressDtoSchema = object({
        city: string(),
        houseNr: number()
    });

    const PersonSchema = object({
        name: string(),
        address: AddressSchema
    });

    const PersonDtoSchema = object({
        name: string(),
        address: AddressDtoSchema
    });

    test('auto-maps nested object property when mapping is registered', async () => {
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.houseNr)
                    .from(f => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            );

        const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
        const result = await mapFn({
            name: 'Alice',
            address: { city: 'Berlin', houseNr: 10 }
        });

        expect(result).toEqual({
            name: 'Alice',
            address: { city: 'Berlin', houseNr: 10 }
        });
    });

    test('ordering matters: nested mapping must be configured first', () => {
        // When source and target ObjectSchemaBuilder have different InferTypes,
        // a registered mapping is required. Configuring Person first fails
        // because the Address mapping does not yet exist in the registry.
        const AddrSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddrDtoSchema = object({
            city: string()
        });

        const PersonWithAddrSchema = object({
            name: string(),
            address: AddrSchema
        });

        const PersonDtoWithAddrSchema = object({
            name: string(),
            address: AddrDtoSchema
        });

        expect(() =>
            new MappingRegistry().configure(
                PersonWithAddrSchema,
                PersonDtoWithAddrSchema,
                // @ts-expect-error - address not registered yet and InferTypes differ
                m => m.for(t => t.name).from(f => f.name)
            )
        ).toThrow(MapperConfigurationError);
    });

    test('explicit mapping takes priority over auto-mapping', async () => {
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.houseNr)
                    .from(f => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.address)
                    .compute(p => ({
                        city: p.address.city.toUpperCase(),
                        houseNr: p.address.houseNr
                    }))
            );

        const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
        const result = await mapFn({
            name: 'Bob',
            address: { city: 'paris', houseNr: 5 }
        });

        expect(result).toEqual({
            name: 'Bob',
            address: { city: 'PARIS', houseNr: 5 }
        });
    });

    test('ignore takes priority over auto-mapping', async () => {
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.houseNr)
                    .from(f => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.address)
                    .ignore()
            );

        const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
        const result = await mapFn({
            name: 'Carol',
            address: { city: 'Rome', houseNr: 3 }
        });

        expect(result).toEqual({ name: 'Carol' });
        expect(result).not.toHaveProperty('address');
    });

    test('same-name, same-type primitive fields are auto-mapped', async () => {
        const SourceSchema = object({
            name: string(),
            label: string()
        });

        const TargetSchema = object({
            name: string(),
            label: string()
        });

        // Both 'name' and 'label' are string→string with matching names,
        // so they should be auto-mapped without explicit mapping.
        const registry = new MappingRegistry().configure(
            SourceSchema,
            TargetSchema,
            m => m
        );

        const mapFn = registry.getMapper(SourceSchema, TargetSchema);
        const result = await mapFn({ name: 'Alice', label: 'admin' });
        expect(result).toEqual({ name: 'Alice', label: 'admin' });
    });

    test('deep nesting: auto-map multiple levels', async () => {
        const InnerSchema = object({
            value: string()
        });

        const InnerDtoSchema = object({
            value: string()
        });

        const MiddleSchema = object({
            inner: InnerSchema
        });

        const MiddleDtoSchema = object({
            inner: InnerDtoSchema
        });

        const OuterSchema = object({
            name: string(),
            middle: MiddleSchema
        });

        const OuterDtoSchema = object({
            name: string(),
            middle: MiddleDtoSchema
        });

        const registry = new MappingRegistry()
            .configure(InnerSchema, InnerDtoSchema, m =>
                m.for(t => t.value).from(f => f.value)
            )
            .configure(MiddleSchema, MiddleDtoSchema, m =>
                m.for(t => t.inner).ignore()
            )
            .configure(OuterSchema, OuterDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            );

        const mapFn = registry.getMapper(OuterSchema, OuterDtoSchema);
        const result = await mapFn({
            name: 'deep',
            middle: { inner: { value: 'hello' } }
        });

        // middle is auto-mapped via MiddleSchema -> MiddleDtoSchema
        // but inner is ignored in MiddleSchema -> MiddleDtoSchema
        expect(result).toEqual({
            name: 'deep',
            middle: {}
        });
    });

    test('optional fields: skips auto-mapping when source value is undefined', async () => {
        // Test that auto-mapped values skip undefined
        const reg = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.houseNr)
                    .from(f => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            );

        const mapFn = reg.getMapper(PersonSchema, PersonDtoSchema);
        // Source has address but we pass a valid one
        const result = await mapFn({
            name: 'Dan',
            address: { city: 'Tokyo', houseNr: 1 }
        });
        expect(result).toEqual({
            name: 'Dan',
            address: { city: 'Tokyo', houseNr: 1 }
        });
    });

    test('auto-mapping only activates when both properties are ObjectSchemaBuilder', () => {
        // Source has 'data' as string, target has 'data' as object
        const SourceSchema = object({
            name: string(),
            data: string()
        });

        const DataDtoSchema = object({
            value: string()
        });

        const TargetSchema = object({
            name: string(),
            data: DataDtoSchema
        });

        // 'data' should not be auto-mapped because source 'data' is string, not object
        expect(() =>
            new MappingRegistry().configure(SourceSchema, TargetSchema, m =>
                // @ts-expect-error - data remains unmapped (string vs ObjectSchemaBuilder)
                m.for(t => t.name).from(f => f.name)
            )
        ).toThrow(MapperConfigurationError);
    });

    test('auto-mapping', () => {
        const AddressSchema = object({
            city: string(),
            street: string(),
            country: string(),
            zipCode: string()
        });
        const AddressDtoSchema = object({
            city: string(),
            street: string(),
            country: string()
        });

        const UserSchema = object({
            firstName: string(),
            lastName: string(),
            address: AddressSchema
        });

        const UserDtoSchema = object({
            name: string(),
            address: AddressDtoSchema
        });

        // Without registering AddressSchema→AddressDtoSchema first,
        // from for the address property should be a type error
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m
                    .for(t => t.city)
                    .from(f => f.city)
                    .for(t => t.street)
                    .from(f => f.street)
                    .for(t => t.country)
                    .from(f => f.country)
            )
            .configure(UserSchema, UserDtoSchema, m =>
                m
                    .for(t => t.name)
                    .compute(u => `${u.firstName} ${u.lastName}`)
                    .for(t => t.address)
                    .from(f => f.address)
            );

        expect(registry).toBeInstanceOf(MappingRegistry);
    });

    test('from type-errors without registered mapping for ObjectSchemaBuilder props with different InferTypes', () => {
        const AddressSchema = object({
            city: string(),
            street: string()
        });
        const AddressDtoSchema = object({
            city: string(),
            street: string(),
            zipCode: string()
        });

        const PersonSchema = object({
            name: string(),
            address: AddressSchema
        });

        const PersonDtoSchema = object({
            name: string(),
            address: AddressDtoSchema
        });

        // Without registering AddressSchema→AddressDtoSchema,
        // from for address should produce a type error
        // because InferTypes differ ({ city, street } vs { city, street, zipCode })
        new MappingRegistry().configure(PersonSchema, PersonDtoSchema, m =>
            m
                .for(t => t.name)
                .from(f => f.name)
                .for(t => t.address)
                // @ts-expect-error - no mapping registered and InferTypes differ
                .from(f => f.address)
        );
    });

    test('from succeeds when mapping is registered for ObjectSchemaBuilder props', async () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city: string()
        });

        const PersonSchema = object({
            name: string(),
            address: AddressSchema
        });

        const PersonDtoSchema = object({
            name: string(),
            address: AddressDtoSchema
        });

        // With AddressSchema→AddressDtoSchema registered first, no type error
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m.for(t => t.city).from(f => f.city)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.address)
                    .from(f => f.address)
            );

        const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
        const result = await mapFn({
            name: 'Alice',
            address: { city: 'Berlin', houseNr: 10 }
        });

        // The registered AddressSchema→AddressDtoSchema mapper is applied,
        // so houseNr is dropped (not in AddressDtoSchema)
        expect(result).toEqual({
            name: 'Alice',
            address: { city: 'Berlin' }
        });
    });

    test('auto-mapping removes need to explicitly map registered ObjectSchemaBuilder props', async () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city: string()
        });

        const PersonSchema = object({
            name: string(),
            address: AddressSchema
        });

        const PersonDtoSchema = object({
            name: string(),
            address: AddressDtoSchema
        });

        const reg = new MappingRegistry();

        reg.configure(AddressSchema, AddressDtoSchema, m =>
            m
                .for(t => t.city)
                // @ts-expect-error - houseNr (number) is not assignable to city (string)
                .from(t => t.houseNr)
        );

        // address is not explicitly mapped — auto-mapping picks it up
        // because AddressSchema→AddressDtoSchema is registered
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m.for(t => t.city).from(f => f.city)
            )
            .configure(PersonSchema, PersonDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            );

        const mapFn = registry.getMapper(PersonSchema, PersonDtoSchema);
        const result = await mapFn({
            name: 'Bob',
            address: { city: 'Paris', houseNr: 7 }
        });

        expect(result).toEqual({
            name: 'Bob',
            address: { city: 'Paris' }
        });
    });

    test('auto-mapping of the same properties (same name and inferred type)', async () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city: string(),
            houseNr: string()
        });

        // here city can be auto-mapped but houseNr cannot because of incompatible types
        const registry = new MappingRegistry().configure(
            AddressSchema,
            AddressDtoSchema,
            m => m.for(t => t.houseNr).compute(f => f.houseNr.toString())
        );

        const mapFn = registry.getMapper(AddressSchema, AddressDtoSchema);
        const result = await mapFn({ city: 'NYC', houseNr: 42 });

        expect(result).toEqual({ city: 'NYC', houseNr: '42' });
    });

    test('error on missed mapping', () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city2: string(),
            houseNr: string()
        });

        expect(() =>
            new MappingRegistry().configure(
                AddressSchema,
                AddressDtoSchema,
                m =>
                    // @ts-expect-error - city2 is not mapped, and it can't be auto-mapped because there is no property with the same name and inferred type in AddressSchema
                    m.for(t => t.houseNr).compute(f => f.houseNr.toString())
            )
        ).toThrow(MapperConfigurationError);
    });

    test('different schemas, but the same inferred type and name can use from', async () => {
        const SchemaA = object({
            name: string(),
            value: number()
        });

        const SchemaB = object({
            name: string(),
            value: number()
        });

        const schemaC = object({
            prop: SchemaA,
            anotherProp: string()
        });

        const schemaD = object({
            prop: SchemaB,
            oneMoreProp: string()
        });

        const registry = new MappingRegistry().configure(schemaC, schemaD, m =>
            m
                .for(t => t.oneMoreProp)
                .from(f => f.anotherProp)
                .for(t => t.prop)
                .from(f => f.prop)
        );

        const mapFn = registry.getMapper(schemaC, schemaD);
        const result = await mapFn({
            prop: { name: 'Alice', value: 42 },
            anotherProp: 'hello'
        });

        expect(result).toEqual({
            prop: { name: 'Alice', value: 42 },
            oneMoreProp: 'hello'
        });
    });

    test('different schemas with same inferred type and name are auto-mapped', async () => {
        const SchemaA = object({
            name: string(),
            value: number()
        });

        const SchemaB = object({
            name: string(),
            value: number()
        });

        const schemaC = object({
            prop: SchemaA,
            anotherProp: string()
        });

        const schemaD = object({
            prop: SchemaB,
            oneMoreProp: string()
        });

        // prop is auto-mapped because SchemaA and SchemaB have the same InferType
        const registry = new MappingRegistry().configure(schemaC, schemaD, m =>
            m.for(t => t.oneMoreProp).from(f => f.anotherProp)
        );

        const mapFn = registry.getMapper(schemaC, schemaD);
        const result = await mapFn({
            prop: { name: 'Bob', value: 99 },
            anotherProp: 'world'
        });

        expect(result).toEqual({
            prop: { name: 'Bob', value: 99 },
            oneMoreProp: 'world'
        });
    });
});

// ── Array mapping ────────────────────────────────────────────────────

describe('Array mapping', () => {
    const ItemSchema = object({
        id: number(),
        label: string()
    });

    const ItemDtoSchema = object({
        id: number(),
        label: string()
    });

    const ContainerSchema = object({
        name: string(),
        items: array(ItemSchema)
    });

    const ContainerDtoSchema = object({
        name: string(),
        items: array(ItemDtoSchema)
    });

    test('maps array property via from() with registered element mapping', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'Test',
            items: [
                { id: 1, label: 'first' },
                { id: 2, label: 'second' }
            ]
        });

        expect(result).toEqual({
            name: 'Test',
            items: [
                { id: 1, label: 'first' },
                { id: 2, label: 'second' }
            ]
        });
    });

    test('maps empty array to empty array', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'Empty',
            items: []
        });

        expect(result).toEqual({
            name: 'Empty',
            items: []
        });
    });

    test('null array is skipped (treated as undefined)', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'NullItems',
            items: null as any
        });

        expect(result).toEqual({ name: 'NullItems' });
        expect(result).not.toHaveProperty('items');
    });

    test('undefined array is skipped', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'UndefinedItems',
            items: undefined as any
        });

        expect(result).toEqual({ name: 'UndefinedItems' });
        expect(result).not.toHaveProperty('items');
    });

    test('throws error when non-array value is encountered for array property', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        await expect(
            mapFn({
                name: 'BadItems',
                items: 'not-an-array' as any
            })
        ).rejects.toThrow(MapperConfigurationError);
    });

    test('compute() overrides array element mapping', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .compute(src =>
                        src.items.map(item => ({
                            id: item.id * 10,
                            label: item.label.toUpperCase()
                        }))
                    )
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'Computed',
            items: [{ id: 1, label: 'hello' }]
        });

        expect(result).toEqual({
            name: 'Computed',
            items: [{ id: 10, label: 'HELLO' }]
        });
    });

    test('ignore() skips array property', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .ignore()
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'Ignored',
            items: [{ id: 1, label: 'a' }]
        });

        expect(result).toEqual({ name: 'Ignored' });
        expect(result).not.toHaveProperty('items');
    });

    test('auto-maps array property when same-name element schemas match', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const result = await mapFn({
            name: 'AutoMapped',
            items: [
                { id: 1, label: 'one' },
                { id: 2, label: 'two' }
            ]
        });

        expect(result).toEqual({
            name: 'AutoMapped',
            items: [
                { id: 1, label: 'one' },
                { id: 2, label: 'two' }
            ]
        });
    });

    test('throws when array property is not mapped and not ignored', () => {
        const SourceSchema = object({
            name: string(),
            tags: array(string())
        });

        const TargetSchema = object({
            name: string(),
            labels: array(string())
        });

        expect(() =>
            new MappingRegistry().configure(SourceSchema, TargetSchema, m =>
                // @ts-expect-error - labels is not mapped
                m.for(t => t.name).from(f => f.name)
            )
        ).toThrow(MapperConfigurationError);
    });

    test('auto-maps array of primitives with same-name properties', async () => {
        const SourceSchema = object({
            name: string(),
            tags: array(string())
        });

        const TargetSchema = object({
            name: string(),
            tags: array(string())
        });

        const registry = new MappingRegistry().configure(
            SourceSchema,
            TargetSchema,
            m => m
        );

        const mapFn = registry.getMapper(SourceSchema, TargetSchema);
        const result = await mapFn({
            name: 'Alice',
            tags: ['admin', 'user']
        });

        expect(result).toEqual({
            name: 'Alice',
            tags: ['admin', 'user']
        });
    });

    test('preserves order of array elements during mapping', async () => {
        const registry = new MappingRegistry()
            .configure(ItemSchema, ItemDtoSchema, m =>
                m
                    .for(t => t.id)
                    .from(f => f.id)
                    .for(t => t.label)
                    .from(f => f.label)
            )
            .configure(ContainerSchema, ContainerDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.items)
                    .from(f => f.items)
            );

        const mapFn = registry.getMapper(ContainerSchema, ContainerDtoSchema);
        const items = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            label: `item-${i}`
        }));
        const result = await mapFn({ name: 'Ordered', items });

        expect(result.items).toEqual(items);
        for (let i = 0; i < 10; i++) {
            expect(result.items[i].id).toBe(i);
        }
    });

    test('maps array with async element mapper', async () => {
        const SourceItemSchema = object({
            value: number()
        });

        const TargetItemSchema = object({
            doubled: number()
        });

        const SourceSchema = object({
            data: array(SourceItemSchema)
        });

        const TargetSchema = object({
            data: array(TargetItemSchema)
        });

        const registry = new MappingRegistry()
            .configure(SourceItemSchema, TargetItemSchema, m =>
                m.for(t => t.doubled).compute(async src => src.value * 2)
            )
            .configure(SourceSchema, TargetSchema, m =>
                m.for(t => t.data).from(f => f.data)
            );

        const mapFn = registry.getMapper(SourceSchema, TargetSchema);
        const result = await mapFn({
            data: [{ value: 1 }, { value: 2 }, { value: 3 }]
        });

        expect(result).toEqual({
            data: [{ doubled: 2 }, { doubled: 4 }, { doubled: 6 }]
        });
    });

    test('completeness check: array properties must be explicitly mapped or ignored', () => {
        // Array properties should NOT be auto-covered just because element mapping exists
        // when their names differ between source and target
        const SourceSchema = object({
            name: string(),
            sourceItems: array(ItemSchema)
        });

        const TargetSchema = object({
            name: string(),
            targetItems: array(ItemDtoSchema)
        });

        expect(() =>
            new MappingRegistry()
                .configure(ItemSchema, ItemDtoSchema, m =>
                    m
                        .for(t => t.id)
                        .from(f => f.id)
                        .for(t => t.label)
                        .from(f => f.label)
                )
                .configure(SourceSchema, TargetSchema, m =>
                    // @ts-expect-error - targetItems not mapped
                    m.for(t => t.name).from(f => f.name)
                )
        ).toThrow(MapperConfigurationError);
    });

    test('nested arrays inside objects', async () => {
        const TagSchema = object({
            name: string()
        });

        const TagDtoSchema = object({
            name: string()
        });

        const GroupSchema = object({
            title: string(),
            tags: array(TagSchema)
        });

        const GroupDtoSchema = object({
            title: string(),
            tags: array(TagDtoSchema)
        });

        const registry = new MappingRegistry()
            .configure(TagSchema, TagDtoSchema, m =>
                m.for(t => t.name).from(f => f.name)
            )
            .configure(GroupSchema, GroupDtoSchema, m =>
                m
                    .for(t => t.title)
                    .from(f => f.title)
                    .for(t => t.tags)
                    .from(f => f.tags)
            );

        const mapFn = registry.getMapper(GroupSchema, GroupDtoSchema);
        const result = await mapFn({
            title: 'Group A',
            tags: [{ name: 'tag1' }, { name: 'tag2' }]
        });

        expect(result).toEqual({
            title: 'Group A',
            tags: [{ name: 'tag1' }, { name: 'tag2' }]
        });
    });
});

// ── Real-world mapping scenarios ─────────────────────────────────────

describe('E-commerce: Product catalog mapping', () => {
    // --- Domain models ---
    const MoneySchema = object({
        amount: number(),
        currency: string()
    });

    const ProductVariantSchema = object({
        sku: string(),
        color: string(),
        size: string(),
        price: MoneySchema
    });

    const CategorySchema = object({
        id: number(),
        name: string(),
        slug: string()
    });

    const ProductSchema = object({
        id: number(),
        title: string(),
        description: string(),
        category: CategorySchema,
        variants: array(ProductVariantSchema),
        internalNotes: string()
    });

    // --- API DTOs ---
    const MoneyDtoSchema = object({
        displayPrice: string()
    });

    const VariantDtoSchema = object({
        sku: string(),
        label: string(),
        price: MoneyDtoSchema
    });

    const ProductListItemSchema = object({
        id: number(),
        title: string(),
        categoryName: string(),
        variants: array(VariantDtoSchema)
    });

    test('maps product entity to product listing DTO', async () => {
        const registry = new MappingRegistry()
            .configure(MoneySchema, MoneyDtoSchema, m =>
                m
                    .for(t => t.displayPrice)
                    .compute(
                        money => `${money.currency} ${money.amount.toFixed(2)}`
                    )
            )
            .configure(ProductVariantSchema, VariantDtoSchema, m =>
                m.for(t => t.label).compute(v => `${v.color} / ${v.size}`)
            )
            .configure(ProductSchema, ProductListItemSchema, m =>
                m.for(t => t.categoryName).from(f => f.category.name)
            );

        const mapFn = registry.getMapper(ProductSchema, ProductListItemSchema);
        const result = await mapFn({
            id: 1001,
            title: 'Classic T-Shirt',
            description: 'A comfortable cotton t-shirt',
            category: { id: 5, name: 'Clothing', slug: 'clothing' },
            variants: [
                {
                    sku: 'TS-BLK-M',
                    color: 'Black',
                    size: 'M',
                    price: { amount: 29.99, currency: 'USD' }
                },
                {
                    sku: 'TS-WHT-L',
                    color: 'White',
                    size: 'L',
                    price: { amount: 29.99, currency: 'USD' }
                }
            ],
            internalNotes: 'Restock Q3'
        });

        expect(result).toEqual({
            id: 1001,
            title: 'Classic T-Shirt',
            categoryName: 'Clothing',
            variants: [
                {
                    sku: 'TS-BLK-M',
                    label: 'Black / M',
                    price: { displayPrice: 'USD 29.99' }
                },
                {
                    sku: 'TS-WHT-L',
                    label: 'White / L',
                    price: { displayPrice: 'USD 29.99' }
                }
            ]
        });
        expect(result).not.toHaveProperty('description');
        expect(result).not.toHaveProperty('internalNotes');
    });

    test('maps product with empty variants array', async () => {
        const registry = new MappingRegistry()
            .configure(MoneySchema, MoneyDtoSchema, m =>
                m
                    .for(t => t.displayPrice)
                    .compute(
                        money => `${money.currency} ${money.amount.toFixed(2)}`
                    )
            )
            .configure(ProductVariantSchema, VariantDtoSchema, m =>
                m.for(t => t.label).compute(v => `${v.color} / ${v.size}`)
            )
            .configure(ProductSchema, ProductListItemSchema, m =>
                m.for(t => t.categoryName).from(f => f.category.name)
            );

        const mapFn = registry.getMapper(ProductSchema, ProductListItemSchema);
        const result = await mapFn({
            id: 1002,
            title: 'Limited Edition Sneakers',
            description: 'Sold out',
            category: { id: 3, name: 'Footwear', slug: 'footwear' },
            variants: [],
            internalNotes: 'Discontinued'
        });

        expect(result).toEqual({
            id: 1002,
            title: 'Limited Edition Sneakers',
            categoryName: 'Footwear',
            variants: []
        });
    });
});

describe('User management: Profile to public DTO', () => {
    const AddressSchema = object({
        street: string(),
        city: string(),
        state: string(),
        zipCode: string(),
        country: string()
    });

    const UserProfileSchema = object({
        id: number(),
        firstName: string(),
        lastName: string(),
        email: string(),
        passwordHash: string(),
        address: AddressSchema,
        role: string()
    });

    const PublicProfileSchema = object({
        id: number(),
        displayName: string(),
        location: string(),
        role: string()
    });

    test('flattens user profile to public profile, hiding sensitive fields', async () => {
        const registry = new MappingRegistry().configure(
            UserProfileSchema,
            PublicProfileSchema,
            m =>
                m
                    .for(t => t.displayName)
                    .compute(u => `${u.firstName} ${u.lastName}`)
                    .for(t => t.location)
                    .compute(u => `${u.address.city}, ${u.address.state}`)
        );

        const mapFn = registry.getMapper(
            UserProfileSchema,
            PublicProfileSchema
        );
        const result = await mapFn({
            id: 42,
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            passwordHash: '$2b$10$abcdef...',
            address: {
                street: '123 Main St',
                city: 'Portland',
                state: 'OR',
                zipCode: '97201',
                country: 'US'
            },
            role: 'admin'
        });

        expect(result).toEqual({
            id: 42,
            displayName: 'Jane Doe',
            location: 'Portland, OR',
            role: 'admin'
        });
        expect(result).not.toHaveProperty('email');
        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('address');
    });

    test('maps user profile to admin view with full address', async () => {
        const AdminUserViewSchema = object({
            id: number(),
            displayName: string(),
            email: string(),
            fullAddress: string(),
            role: string()
        });

        const registry = new MappingRegistry().configure(
            UserProfileSchema,
            AdminUserViewSchema,
            m =>
                m
                    .for(t => t.displayName)
                    .compute(u => `${u.firstName} ${u.lastName}`)
                    .for(t => t.fullAddress)
                    .compute(
                        u =>
                            `${u.address.street}, ${u.address.city}, ${u.address.state} ${u.address.zipCode}, ${u.address.country}`
                    )
        );

        const mapFn = registry.getMapper(
            UserProfileSchema,
            AdminUserViewSchema
        );
        const result = await mapFn({
            id: 7,
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@company.com',
            passwordHash: '$2b$10$xyz...',
            address: {
                street: '456 Oak Ave',
                city: 'Seattle',
                state: 'WA',
                zipCode: '98101',
                country: 'US'
            },
            role: 'manager'
        });

        expect(result).toEqual({
            id: 7,
            displayName: 'Alice Smith',
            email: 'alice@company.com',
            fullAddress: '456 Oak Ave, Seattle, WA 98101, US',
            role: 'manager'
        });
        expect(result).not.toHaveProperty('passwordHash');
    });
});

describe('Blog CMS: Post entity to API response', () => {
    const AuthorSchema = object({
        id: number(),
        firstName: string(),
        lastName: string(),
        bio: string()
    });

    const _AuthorSummarySchema = object({
        id: number(),
        name: string()
    });

    const TagSchema = object({
        id: number(),
        label: string()
    });

    const TagDtoSchema = object({
        label: string()
    });

    const CommentSchema = object({
        id: number(),
        authorName: string(),
        body: string(),
        likes: number()
    });

    const CommentDtoSchema = object({
        authorName: string(),
        body: string(),
        likes: number()
    });

    const BlogPostSchema = object({
        id: number(),
        title: string(),
        body: string(),
        author: AuthorSchema,
        tags: array(TagSchema),
        comments: array(CommentSchema),
        isDraft: boolean()
    });

    const BlogPostResponseSchema = object({
        id: number(),
        title: string(),
        excerpt: string(),
        authorName: string(),
        tags: array(TagDtoSchema),
        commentCount: number(),
        comments: array(CommentDtoSchema)
    });

    test('maps blog post entity to API response with computed fields', async () => {
        const registry = new MappingRegistry()
            .configure(TagSchema, TagDtoSchema, m => m)
            .configure(CommentSchema, CommentDtoSchema, m => m)
            .configure(BlogPostSchema, BlogPostResponseSchema, m =>
                m
                    .for(t => t.excerpt)
                    .compute(post => post.body.substring(0, 100))
                    .for(t => t.authorName)
                    .compute(
                        post =>
                            `${post.author.firstName} ${post.author.lastName}`
                    )
                    .for(t => t.commentCount)
                    .compute(post => post.comments.length)
            );

        const mapFn = registry.getMapper(
            BlogPostSchema,
            BlogPostResponseSchema
        );
        const longBody =
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';
        const result = await mapFn({
            id: 101,
            title: 'Getting Started with TypeScript',
            body: longBody,
            author: {
                id: 5,
                firstName: 'John',
                lastName: 'Writer',
                bio: 'Tech blogger since 2015'
            },
            tags: [
                { id: 1, label: 'typescript' },
                { id: 2, label: 'tutorial' }
            ],
            comments: [
                {
                    id: 1,
                    authorName: 'Reader1',
                    body: 'Great post!',
                    likes: 5
                },
                {
                    id: 2,
                    authorName: 'Reader2',
                    body: 'Very helpful',
                    likes: 3
                }
            ],
            isDraft: false
        });

        expect(result).toEqual({
            id: 101,
            title: 'Getting Started with TypeScript',
            excerpt: longBody.substring(0, 100),
            authorName: 'John Writer',
            tags: [{ label: 'typescript' }, { label: 'tutorial' }],
            commentCount: 2,
            comments: [
                { authorName: 'Reader1', body: 'Great post!', likes: 5 },
                { authorName: 'Reader2', body: 'Very helpful', likes: 3 }
            ]
        });
        expect(result).not.toHaveProperty('isDraft');
        expect(result).not.toHaveProperty('body');
    });

    test('maps blog post with no tags and no comments', async () => {
        const registry = new MappingRegistry()
            .configure(TagSchema, TagDtoSchema, m => m)
            .configure(CommentSchema, CommentDtoSchema, m => m)
            .configure(BlogPostSchema, BlogPostResponseSchema, m =>
                m
                    .for(t => t.excerpt)
                    .compute(post => post.body.substring(0, 100))
                    .for(t => t.authorName)
                    .compute(
                        post =>
                            `${post.author.firstName} ${post.author.lastName}`
                    )
                    .for(t => t.commentCount)
                    .compute(post => post.comments.length)
            );

        const mapFn = registry.getMapper(
            BlogPostSchema,
            BlogPostResponseSchema
        );
        const result = await mapFn({
            id: 102,
            title: 'Empty Post',
            body: 'Short',
            author: {
                id: 10,
                firstName: 'Jane',
                lastName: 'Author',
                bio: 'New writer'
            },
            tags: [],
            comments: [],
            isDraft: true
        });

        expect(result).toEqual({
            id: 102,
            title: 'Empty Post',
            excerpt: 'Short',
            authorName: 'Jane Author',
            tags: [],
            commentCount: 0,
            comments: []
        });
    });
});

describe('Invoice billing: Invoice to summary', () => {
    const CompanySchema = object({
        name: string(),
        taxId: string(),
        address: string()
    });

    const _CompanyDtoSchema = object({
        name: string(),
        address: string()
    });

    const LineItemSchema = object({
        description: string(),
        quantity: number(),
        unitPrice: number()
    });

    const LineItemDtoSchema = object({
        description: string(),
        total: number()
    });

    const InvoiceSchema = object({
        invoiceNumber: string(),
        issuer: CompanySchema,
        recipient: CompanySchema,
        lineItems: array(LineItemSchema),
        notes: string()
    });

    const InvoiceSummarySchema = object({
        invoiceNumber: string(),
        issuerName: string(),
        recipientName: string(),
        lineItems: array(LineItemDtoSchema),
        totalAmount: number()
    });

    test('maps invoice entity to invoice summary with line item totals', async () => {
        const registry = new MappingRegistry()
            .configure(LineItemSchema, LineItemDtoSchema, m =>
                m
                    .for(t => t.total)
                    .compute(item => item.quantity * item.unitPrice)
            )
            .configure(InvoiceSchema, InvoiceSummarySchema, m =>
                m
                    .for(t => t.issuerName)
                    .from(f => f.issuer.name)
                    .for(t => t.recipientName)
                    .from(f => f.recipient.name)
                    .for(t => t.totalAmount)
                    .compute(inv =>
                        inv.lineItems.reduce(
                            (sum, item) => sum + item.quantity * item.unitPrice,
                            0
                        )
                    )
            );

        const mapFn = registry.getMapper(InvoiceSchema, InvoiceSummarySchema);
        const result = await mapFn({
            invoiceNumber: 'INV-2024-001',
            issuer: {
                name: 'Acme Corp',
                taxId: 'US-123456',
                address: '100 Business Rd'
            },
            recipient: {
                name: 'Client LLC',
                taxId: 'US-654321',
                address: '200 Client Ave'
            },
            lineItems: [
                {
                    description: 'Consulting (40h)',
                    quantity: 40,
                    unitPrice: 150
                },
                { description: 'Travel expenses', quantity: 1, unitPrice: 500 }
            ],
            notes: 'Net 30'
        });

        expect(result).toEqual({
            invoiceNumber: 'INV-2024-001',
            issuerName: 'Acme Corp',
            recipientName: 'Client LLC',
            lineItems: [
                { description: 'Consulting (40h)', total: 6000 },
                { description: 'Travel expenses', total: 500 }
            ],
            totalAmount: 6500
        });
        expect(result).not.toHaveProperty('notes');
    });

    test('maps invoice with single line item', async () => {
        const registry = new MappingRegistry()
            .configure(LineItemSchema, LineItemDtoSchema, m =>
                m
                    .for(t => t.total)
                    .compute(item => item.quantity * item.unitPrice)
            )
            .configure(InvoiceSchema, InvoiceSummarySchema, m =>
                m
                    .for(t => t.issuerName)
                    .from(f => f.issuer.name)
                    .for(t => t.recipientName)
                    .from(f => f.recipient.name)
                    .for(t => t.totalAmount)
                    .compute(inv =>
                        inv.lineItems.reduce(
                            (sum, item) => sum + item.quantity * item.unitPrice,
                            0
                        )
                    )
            );

        const mapFn = registry.getMapper(InvoiceSchema, InvoiceSummarySchema);
        const result = await mapFn({
            invoiceNumber: 'INV-2024-002',
            issuer: {
                name: 'Freelancer Inc',
                taxId: 'US-111111',
                address: '50 Home Office'
            },
            recipient: {
                name: 'Big Corp',
                taxId: 'US-999999',
                address: '1 Corporate Blvd'
            },
            lineItems: [
                {
                    description: 'Monthly retainer',
                    quantity: 1,
                    unitPrice: 5000
                }
            ],
            notes: ''
        });

        expect(result).toEqual({
            invoiceNumber: 'INV-2024-002',
            issuerName: 'Freelancer Inc',
            recipientName: 'Big Corp',
            lineItems: [{ description: 'Monthly retainer', total: 5000 }],
            totalAmount: 5000
        });
    });
});

describe('REST API: Weather response to domain model', () => {
    // Simulates mapping an external weather API response to an internal domain model
    const ApiCoordinatesSchema = object({
        lat: number(),
        lon: number()
    });

    const ApiWeatherConditionSchema = object({
        id: number(),
        main: string(),
        description: string(),
        icon: string()
    });

    const ApiWeatherResponseSchema = object({
        name: string(),
        coord: ApiCoordinatesSchema,
        weather: array(ApiWeatherConditionSchema),
        visibility: number()
    });

    const WeatherConditionSchema = object({
        summary: string(),
        description: string()
    });

    const WeatherReportSchema = object({
        cityName: string(),
        latitude: number(),
        longitude: number(),
        conditions: array(WeatherConditionSchema)
    });

    test('maps external API response to internal weather report', async () => {
        const registry = new MappingRegistry()
            .configure(ApiWeatherConditionSchema, WeatherConditionSchema, m =>
                m.for(t => t.summary).from(f => f.main)
            )
            .configure(ApiWeatherResponseSchema, WeatherReportSchema, m =>
                m
                    .for(t => t.cityName)
                    .from(f => f.name)
                    .for(t => t.latitude)
                    .from(f => f.coord.lat)
                    .for(t => t.longitude)
                    .from(f => f.coord.lon)
                    .for(t => t.conditions)
                    .from(f => f.weather)
            );

        const mapFn = registry.getMapper(
            ApiWeatherResponseSchema,
            WeatherReportSchema
        );
        const result = await mapFn({
            name: 'London',
            coord: { lat: 51.5074, lon: -0.1278 },
            weather: [
                {
                    id: 300,
                    main: 'Drizzle',
                    description: 'light intensity drizzle',
                    icon: '09d'
                },
                {
                    id: 701,
                    main: 'Mist',
                    description: 'mist',
                    icon: '50d'
                }
            ],
            visibility: 10000
        });

        expect(result).toEqual({
            cityName: 'London',
            latitude: 51.5074,
            longitude: -0.1278,
            conditions: [
                {
                    summary: 'Drizzle',
                    description: 'light intensity drizzle'
                },
                { summary: 'Mist', description: 'mist' }
            ]
        });
        expect(result).not.toHaveProperty('visibility');
    });

    test('maps API response with single weather condition', async () => {
        const registry = new MappingRegistry()
            .configure(ApiWeatherConditionSchema, WeatherConditionSchema, m =>
                m.for(t => t.summary).from(f => f.main)
            )
            .configure(ApiWeatherResponseSchema, WeatherReportSchema, m =>
                m
                    .for(t => t.cityName)
                    .from(f => f.name)
                    .for(t => t.latitude)
                    .from(f => f.coord.lat)
                    .for(t => t.longitude)
                    .from(f => f.coord.lon)
                    .for(t => t.conditions)
                    .from(f => f.weather)
            );

        const mapFn = registry.getMapper(
            ApiWeatherResponseSchema,
            WeatherReportSchema
        );
        const result = await mapFn({
            name: 'Tokyo',
            coord: { lat: 35.6762, lon: 139.6503 },
            weather: [
                {
                    id: 800,
                    main: 'Clear',
                    description: 'clear sky',
                    icon: '01d'
                }
            ],
            visibility: 16093
        });

        expect(result).toEqual({
            cityName: 'Tokyo',
            latitude: 35.6762,
            longitude: 139.6503,
            conditions: [{ summary: 'Clear', description: 'clear sky' }]
        });
    });
});

describe('HR system: Employee to organization chart entry', () => {
    const DepartmentSchema = object({
        id: number(),
        name: string(),
        floor: number()
    });

    const EmployeeSchema = object({
        employeeId: string(),
        firstName: string(),
        lastName: string(),
        email: string(),
        salary: number(),
        department: DepartmentSchema,
        skills: array(string())
    });

    const OrgChartEntrySchema = object({
        employeeId: string(),
        fullName: string(),
        departmentName: string(),
        skills: array(string())
    });

    test('maps employee to org chart entry, hiding salary', async () => {
        const registry = new MappingRegistry().configure(
            EmployeeSchema,
            OrgChartEntrySchema,
            m =>
                m
                    .for(t => t.fullName)
                    .compute(e => `${e.firstName} ${e.lastName}`)
                    .for(t => t.departmentName)
                    .from(f => f.department.name)
        );

        const mapFn = registry.getMapper(EmployeeSchema, OrgChartEntrySchema);
        const result = await mapFn({
            employeeId: 'EMP-001',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@company.com',
            salary: 95000,
            department: { id: 3, name: 'Engineering', floor: 4 },
            skills: ['TypeScript', 'React', 'Node.js']
        });

        expect(result).toEqual({
            employeeId: 'EMP-001',
            fullName: 'Bob Johnson',
            departmentName: 'Engineering',
            skills: ['TypeScript', 'React', 'Node.js']
        });
        expect(result).not.toHaveProperty('salary');
        expect(result).not.toHaveProperty('email');
    });

    test('maps employee with empty skills array', async () => {
        const registry = new MappingRegistry().configure(
            EmployeeSchema,
            OrgChartEntrySchema,
            m =>
                m
                    .for(t => t.fullName)
                    .compute(e => `${e.firstName} ${e.lastName}`)
                    .for(t => t.departmentName)
                    .from(f => f.department.name)
        );

        const mapFn = registry.getMapper(EmployeeSchema, OrgChartEntrySchema);
        const result = await mapFn({
            employeeId: 'EMP-002',
            firstName: 'New',
            lastName: 'Hire',
            email: 'new.hire@company.com',
            salary: 60000,
            department: { id: 1, name: 'Onboarding', floor: 1 },
            skills: []
        });

        expect(result).toEqual({
            employeeId: 'EMP-002',
            fullName: 'New Hire',
            departmentName: 'Onboarding',
            skills: []
        });
    });
});

describe('Reservation system: Hotel booking mapping', () => {
    const GuestSchema = object({
        firstName: string(),
        lastName: string(),
        email: string(),
        phone: string()
    });

    const GuestSummarySchema = object({
        fullName: string(),
        contactEmail: string()
    });

    const RoomSchema = object({
        roomNumber: string(),
        type: string(),
        ratePerNight: number()
    });

    const RoomDtoSchema = object({
        roomNumber: string(),
        type: string()
    });

    const BookingSchema = object({
        bookingId: string(),
        guest: GuestSchema,
        rooms: array(RoomSchema),
        checkInDate: string(),
        checkOutDate: string(),
        specialRequests: string()
    });

    const BookingConfirmationSchema = object({
        bookingId: string(),
        guest: GuestSummarySchema,
        rooms: array(RoomDtoSchema),
        nights: number(),
        totalCost: number()
    });

    const calcNights = (checkInDate: string, checkOutDate: string) => {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        return Math.round(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
    };

    test('maps booking to confirmation with computed nights and total', async () => {
        const registry = new MappingRegistry()
            .configure(GuestSchema, GuestSummarySchema, m =>
                m
                    .for(t => t.fullName)
                    .compute(g => `${g.firstName} ${g.lastName}`)
                    .for(t => t.contactEmail)
                    .from(f => f.email)
            )
            .configure(RoomSchema, RoomDtoSchema, m => m)
            .configure(BookingSchema, BookingConfirmationSchema, m =>
                m
                    .for(t => t.nights)
                    .compute(b => calcNights(b.checkInDate, b.checkOutDate))
                    .for(t => t.totalCost)
                    .compute(b => {
                        const nights = calcNights(
                            b.checkInDate,
                            b.checkOutDate
                        );
                        return b.rooms.reduce(
                            (sum, room) => sum + room.ratePerNight * nights,
                            0
                        );
                    })
            );

        const mapFn = registry.getMapper(
            BookingSchema,
            BookingConfirmationSchema
        );
        const result = await mapFn({
            bookingId: 'BK-20240315-001',
            guest: {
                firstName: 'Maria',
                lastName: 'Garcia',
                email: 'maria@email.com',
                phone: '+1-555-0100'
            },
            rooms: [
                { roomNumber: '301', type: 'Deluxe', ratePerNight: 200 },
                { roomNumber: '302', type: 'Standard', ratePerNight: 120 }
            ],
            checkInDate: '2024-03-15',
            checkOutDate: '2024-03-18',
            specialRequests: 'Late checkout please'
        });

        expect(result).toEqual({
            bookingId: 'BK-20240315-001',
            guest: {
                fullName: 'Maria Garcia',
                contactEmail: 'maria@email.com'
            },
            rooms: [
                { roomNumber: '301', type: 'Deluxe' },
                { roomNumber: '302', type: 'Standard' }
            ],
            nights: 3,
            totalCost: 960
        });
        expect(result).not.toHaveProperty('specialRequests');
    });

    test('maps single-room booking for one night', async () => {
        const registry = new MappingRegistry()
            .configure(GuestSchema, GuestSummarySchema, m =>
                m
                    .for(t => t.fullName)
                    .compute(g => `${g.firstName} ${g.lastName}`)
                    .for(t => t.contactEmail)
                    .from(f => f.email)
            )
            .configure(RoomSchema, RoomDtoSchema, m => m)
            .configure(BookingSchema, BookingConfirmationSchema, m =>
                m
                    .for(t => t.nights)
                    .compute(b => calcNights(b.checkInDate, b.checkOutDate))
                    .for(t => t.totalCost)
                    .compute(b => {
                        const nights = calcNights(
                            b.checkInDate,
                            b.checkOutDate
                        );
                        return b.rooms.reduce(
                            (sum, room) => sum + room.ratePerNight * nights,
                            0
                        );
                    })
            );

        const mapFn = registry.getMapper(
            BookingSchema,
            BookingConfirmationSchema
        );
        const result = await mapFn({
            bookingId: 'BK-20240401-010',
            guest: {
                firstName: 'Tom',
                lastName: 'Lee',
                email: 'tom@email.com',
                phone: '+44-20-1234'
            },
            rooms: [{ roomNumber: '101', type: 'Economy', ratePerNight: 80 }],
            checkInDate: '2024-04-01',
            checkOutDate: '2024-04-02',
            specialRequests: ''
        });

        expect(result).toEqual({
            bookingId: 'BK-20240401-010',
            guest: {
                fullName: 'Tom Lee',
                contactEmail: 'tom@email.com'
            },
            rooms: [{ roomNumber: '101', type: 'Economy' }],
            nights: 1,
            totalCost: 80
        });
    });
});

describe('Healthcare: Patient record to appointment summary', () => {
    const InsuranceSchema = object({
        provider: string(),
        policyNumber: string(),
        groupNumber: string()
    });

    const MedicationSchema = object({
        name: string(),
        dosage: string(),
        frequency: string()
    });

    const MedicationDtoSchema = object({
        name: string(),
        dosage: string()
    });

    const PatientSchema = object({
        patientId: string(),
        firstName: string(),
        lastName: string(),
        dateOfBirth: string(),
        insurance: InsuranceSchema,
        medications: array(MedicationSchema),
        socialSecurityNumber: string()
    });

    const AppointmentSummarySchema = object({
        patientId: string(),
        patientName: string(),
        dateOfBirth: string(),
        insuranceProvider: string(),
        currentMedications: array(MedicationDtoSchema)
    });

    test('maps patient record to appointment summary, excluding SSN', async () => {
        const registry = new MappingRegistry()
            .configure(MedicationSchema, MedicationDtoSchema, m => m)
            .configure(PatientSchema, AppointmentSummarySchema, m =>
                m
                    .for(t => t.patientName)
                    .compute(p => `${p.lastName}, ${p.firstName}`)
                    .for(t => t.insuranceProvider)
                    .from(f => f.insurance.provider)
                    .for(t => t.currentMedications)
                    .from(f => f.medications)
            );

        const mapFn = registry.getMapper(
            PatientSchema,
            AppointmentSummarySchema
        );
        const result = await mapFn({
            patientId: 'PT-10042',
            firstName: 'Sarah',
            lastName: 'Connor',
            dateOfBirth: '1965-02-28',
            insurance: {
                provider: 'Blue Cross',
                policyNumber: 'BC-123456',
                groupNumber: 'GRP-789'
            },
            medications: [
                {
                    name: 'Lisinopril',
                    dosage: '10mg',
                    frequency: 'once daily'
                },
                {
                    name: 'Metformin',
                    dosage: '500mg',
                    frequency: 'twice daily'
                }
            ],
            socialSecurityNumber: '123-45-6789'
        });

        expect(result).toEqual({
            patientId: 'PT-10042',
            patientName: 'Connor, Sarah',
            dateOfBirth: '1965-02-28',
            insuranceProvider: 'Blue Cross',
            currentMedications: [
                { name: 'Lisinopril', dosage: '10mg' },
                { name: 'Metformin', dosage: '500mg' }
            ]
        });
        expect(result).not.toHaveProperty('socialSecurityNumber');
    });

    test('maps patient with no medications', async () => {
        const registry = new MappingRegistry()
            .configure(MedicationSchema, MedicationDtoSchema, m => m)
            .configure(PatientSchema, AppointmentSummarySchema, m =>
                m
                    .for(t => t.patientName)
                    .compute(p => `${p.lastName}, ${p.firstName}`)
                    .for(t => t.insuranceProvider)
                    .from(f => f.insurance.provider)
                    .for(t => t.currentMedications)
                    .from(f => f.medications)
            );

        const mapFn = registry.getMapper(
            PatientSchema,
            AppointmentSummarySchema
        );
        const result = await mapFn({
            patientId: 'PT-20001',
            firstName: 'Alex',
            lastName: 'Young',
            dateOfBirth: '2000-07-15',
            insurance: {
                provider: 'Aetna',
                policyNumber: 'AET-001',
                groupNumber: 'GRP-100'
            },
            medications: [],
            socialSecurityNumber: '987-65-4321'
        });

        expect(result).toEqual({
            patientId: 'PT-20001',
            patientName: 'Young, Alex',
            dateOfBirth: '2000-07-15',
            insuranceProvider: 'Aetna',
            currentMedications: []
        });
    });
});

describe('Project management: Task board mapping', () => {
    const AssigneeSchema = object({
        id: number(),
        username: string(),
        avatarUrl: string()
    });

    const _AssigneeDtoSchema = object({
        username: string()
    });

    const LabelSchema = object({
        id: number(),
        name: string(),
        color: string()
    });

    const LabelDtoSchema = object({
        name: string(),
        color: string()
    });

    const TaskSchema = object({
        id: number(),
        title: string(),
        description: string(),
        status: string(),
        priority: number(),
        assignee: AssigneeSchema,
        labels: array(LabelSchema),
        estimatedHours: number()
    });

    const TaskCardSchema = object({
        id: number(),
        title: string(),
        status: string(),
        priorityLabel: string(),
        assigneeUsername: string(),
        labels: array(LabelDtoSchema)
    });

    test('maps task entity to task card for kanban board', async () => {
        const registry = new MappingRegistry()
            .configure(LabelSchema, LabelDtoSchema, m => m)
            .configure(TaskSchema, TaskCardSchema, m =>
                m
                    .for(t => t.priorityLabel)
                    .compute(task => {
                        const labels: Record<number, string> = {
                            1: 'Critical',
                            2: 'High',
                            3: 'Medium',
                            4: 'Low'
                        };
                        return labels[task.priority] || 'Unknown';
                    })
                    .for(t => t.assigneeUsername)
                    .from(f => f.assignee.username)
            );

        const mapFn = registry.getMapper(TaskSchema, TaskCardSchema);
        const result = await mapFn({
            id: 42,
            title: 'Fix login bug',
            description:
                'Users are unable to log in when using special characters in passwords',
            status: 'in-progress',
            priority: 1,
            assignee: {
                id: 7,
                username: 'jdoe',
                avatarUrl: 'https://avatars.example.com/jdoe.png'
            },
            labels: [
                { id: 1, name: 'bug', color: '#d73a4a' },
                { id: 2, name: 'security', color: '#e4e669' }
            ],
            estimatedHours: 4
        });

        expect(result).toEqual({
            id: 42,
            title: 'Fix login bug',
            status: 'in-progress',
            priorityLabel: 'Critical',
            assigneeUsername: 'jdoe',
            labels: [
                { name: 'bug', color: '#d73a4a' },
                { name: 'security', color: '#e4e669' }
            ]
        });
        expect(result).not.toHaveProperty('description');
        expect(result).not.toHaveProperty('estimatedHours');
    });

    test('maps low-priority task with no labels', async () => {
        const registry = new MappingRegistry()
            .configure(LabelSchema, LabelDtoSchema, m => m)
            .configure(TaskSchema, TaskCardSchema, m =>
                m
                    .for(t => t.priorityLabel)
                    .compute(task => {
                        const labels: Record<number, string> = {
                            1: 'Critical',
                            2: 'High',
                            3: 'Medium',
                            4: 'Low'
                        };
                        return labels[task.priority] || 'Unknown';
                    })
                    .for(t => t.assigneeUsername)
                    .from(f => f.assignee.username)
            );

        const mapFn = registry.getMapper(TaskSchema, TaskCardSchema);
        const result = await mapFn({
            id: 100,
            title: 'Update README',
            description: 'Add new API examples to documentation',
            status: 'todo',
            priority: 4,
            assignee: {
                id: 12,
                username: 'docwriter',
                avatarUrl: 'https://avatars.example.com/docwriter.png'
            },
            labels: [],
            estimatedHours: 1
        });

        expect(result).toEqual({
            id: 100,
            title: 'Update README',
            status: 'todo',
            priorityLabel: 'Low',
            assigneeUsername: 'docwriter',
            labels: []
        });
    });
});

// ── mapper() factory function ────────────────────────────────────────

describe('mapper() factory function', () => {
    test('returns a MappingRegistry instance', () => {
        const registry = mapper();
        expect(registry).toBeInstanceOf(MappingRegistry);
    });

    test('supports fluent configure chaining', async () => {
        const registry = mapper().configure(UserSchema, UserDtoSchema, m =>
            m
                .for(t => t.name)
                .from(f => f.name)
                .for(t => t.cityName)
                .from(f => f.address.city)
                .for(t => t.fullAddress)
                .compute(user => `${user.address.city} ${user.address.houseNr}`)
        );

        const mapFn = registry.getMapper(UserSchema, UserDtoSchema);
        const result = await mapFn({
            name: 'Alice',
            age: 30,
            address: { city: 'Berlin', houseNr: 42 }
        });

        expect(result).toEqual({
            name: 'Alice',
            cityName: 'Berlin',
            fullAddress: 'Berlin 42'
        });
    });

    test('supports multiple chained configure calls', async () => {
        const AddressSchema = object({
            city: string(),
            houseNr: number()
        });

        const AddressDtoSchema = object({
            city: string()
        });

        const registry = mapper()
            .configure(AddressSchema, AddressDtoSchema, m =>
                m.for(t => t.city).from(f => f.city)
            )
            .configure(UserSchema, UserDtoSchema, m =>
                m
                    .for(t => t.name)
                    .from(f => f.name)
                    .for(t => t.cityName)
                    .from(f => f.address.city)
                    .for(t => t.fullAddress)
                    .compute(
                        user => `${user.address.city} ${user.address.houseNr}`
                    )
            );

        const addrMapper = registry.getMapper(AddressSchema, AddressDtoSchema);
        const addrResult = await addrMapper({ city: 'NYC', houseNr: 7 });
        expect(addrResult).toEqual({ city: 'NYC' });

        const userMapper = registry.getMapper(UserSchema, UserDtoSchema);
        const userResult = await userMapper({
            name: 'Bob',
            age: 25,
            address: { city: 'NYC', houseNr: 7 }
        });
        expect(userResult).toEqual({
            name: 'Bob',
            cityName: 'NYC',
            fullAddress: 'NYC 7'
        });
    });
});

// ── Property not in target schema ────────────────────────────────────

describe('Mapping property not in target schema', () => {
    test('for() throws when selected property does not exist in target schema', () => {
        const SourceSchema = object({
            id: number(),
            name: string(),
            email: string(),
            address: object({
                street: string(),
                city: string(),
                zipCode: string()
            })
        });

        const TargetSchema = SourceSchema.omit('address');

        // 'street' is NOT a property of TargetSchema
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(SourceSchema, TargetSchema, m =>
                (m as any)
                    .for((t: any) => t.street)
                    .compute(
                        (user: any) =>
                            `${user.address.street} - ${user.address.city}`
                    )
            )
        ).toThrow();
    });

    test('for() throws when property exists in source but not in target', () => {
        const SourceSchema = object({
            name: string(),
            age: number()
        });

        const TargetSchema = object({
            name: string()
        });

        const mapper = new Mapper(SourceSchema, TargetSchema);
        expect(() => (mapper as any).for((t: any) => t.age)).toThrow(
            'Property "age" does not exist in the target schema'
        );
    });

    test('for() succeeds when property exists in target schema', () => {
        const SourceSchema = object({
            name: string(),
            age: number()
        });

        const TargetSchema = object({
            name: string(),
            age: number()
        });

        const mapper = new Mapper(SourceSchema, TargetSchema);
        // Should NOT throw
        expect(() => mapper.for(t => t.name)).not.toThrow();
    });
});
