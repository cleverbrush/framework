import { test, expect, describe } from 'vitest';
import { object, string, number } from '@cleverbrush/schema';
import {
    MappingRegistry,
    Mapper,
    MapperConfigurationError
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
            registry.configure(null as any, null as any, (m) => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(null as any, UserDtoSchema, (m) => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(UserSchema, null as any, (m) => m as any)
        ).toThrow();
    });

    test('throws on non-ObjectSchemaBuilder schemas', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(
                string() as any,
                UserDtoSchema,
                (m) => m as any
            )
        ).toThrow(
            'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
        );
        expect(() =>
            registry.configure(
                UserSchema,
                number() as any,
                (m) => m as any
            )
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
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
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
    test('maps all properties correctly with mapFromProp', async () => {
        const TargetSchema = object({
            userName: string(),
            userCity: string()
        });

        const mapper = new Mapper(UserSchema, TargetSchema);
        const mapFn = mapper
            .forProp((t) => t.userName)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.userCity)
            .mapFromProp((f) => f.address.city)
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

    test('maps with nested source property via mapFromProp', async () => {
        const TargetSchema = object({
            city: string(),
            houseNr: number()
        });

        const mapper = new Mapper(UserSchema, TargetSchema);
        const mapFn = mapper
            .forProp((t) => t.city)
            .mapFromProp((f) => f.address.city)
            .forProp((t) => t.houseNr)
            .mapFromProp((f) => f.address.houseNr)
            .getMapper();

        const result = await mapFn({
            name: 'Bob',
            age: 40,
            address: { city: 'Paris', houseNr: 7 }
        });

        expect(result).toEqual({ city: 'Paris', houseNr: 7 });
    });

    test('maps with mapFrom using sync function', async () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        const mapFn = mapper
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.cityName)
            .mapFrom((user) => user.address.city)
            .forProp((t) => t.fullAddress)
            .mapFrom((user) => `${user.address.city} ${user.address.houseNr}`)
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

    test('maps with mapFrom using async function', async () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        const mapFn = mapper
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.cityName)
            .mapFrom(async (user) => {
                return user.address.city;
            })
            .forProp((t) => t.fullAddress)
            .mapFrom(async (user) => {
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
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.extra)
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
        (mapper as any)
            .forProp((t: any) => t.name)
            .mapFromProp((f: any) => f.name);

        try {
            (mapper as any).getMapper();
            expect.fail('Should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(MapperConfigurationError);
            expect(e.message).toContain('cityName');
            expect(e.message).toContain('fullAddress');
        }
    });

    test('forProp throws when selector does not access a property', () => {
        const mapper = new Mapper(UserSchema, UserDtoSchema);
        expect(() => mapper.forProp((() => undefined) as any)).toThrow(
            'forProp selector must access a property'
        );
    });

    test('full fluent chain with registry', async () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
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

    test('mixed mapFromProp and mapFrom with ignore', async () => {
        const ExtendedDtoSchema = object({
            name: string(),
            cityName: string(),
            fullAddress: string(),
            internalField: string()
        });

        const registry = new MappingRegistry().configure(
            UserSchema,
            ExtendedDtoSchema,
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
                    )
                    .forProp((t) => t.internalField)
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
        const result = original.configure(UserSchema, UserDtoSchema, (m) =>
            m
                .forProp((t) => t.name)
                .mapFromProp((f) => f.name)
                .forProp((t) => t.cityName)
                .mapFromProp((f) => f.address.city)
                .forProp((t) => t.fullAddress)
                .mapFrom(
                    (user) => `${user.address.city} ${user.address.houseNr}`
                )
        );

        expect(result).toBeInstanceOf(MappingRegistry);
        expect(result).not.toBe(original);
    });

    test('returned registry contains the configured mapper', async () => {
        const registry = new MappingRegistry().configure(
            UserSchema,
            UserDtoSchema,
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
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
        original.configure(UserSchema, UserDtoSchema, (m) =>
            m
                .forProp((t) => t.name)
                .mapFromProp((f) => f.name)
                .forProp((t) => t.cityName)
                .mapFromProp((f) => f.address.city)
                .forProp((t) => t.fullAddress)
                .mapFrom(
                    (user) => `${user.address.city} ${user.address.houseNr}`
                )
        );

        // Original registry should NOT have the mapping
        expect(() =>
            original.getMapper(UserSchema, UserDtoSchema)
        ).toThrow('No mapper found');
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
            .configure(AddressSchema, AddressDtoSchema, (m) =>
                m
                    .forProp((t) => t.city)
                    .mapFromProp((f) => f.city)
                    .forProp((t) => t.houseNr)
                    .mapFromProp((f) => f.houseNr)
            )
            .configure(UserSchema, UserDtoSchema, (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
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
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
                    )
        );

        expect(() =>
            registry.configure(UserSchema, UserDtoSchema, (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.cityName)
                    .mapFromProp((f) => f.address.city)
                    .forProp((t) => t.fullAddress)
                    .mapFrom(
                        (user) =>
                            `${user.address.city} ${user.address.houseNr}`
                    )
            )
        ).toThrow('Duplicate mapping');
    });

    test('throws on invalid schemas', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(null as any, UserDtoSchema, (m) => m as any)
        ).toThrow();
        expect(() =>
            registry.configure(string() as any, UserDtoSchema, (m) => m as any)
        ).toThrow();
    });

    test('throws when unmapped properties remain', () => {
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(UserSchema, UserDtoSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
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
            (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.extra)
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
            .configure(AddressSchema, AddressDtoSchema, (m) =>
                m
                    .forProp((t) => t.city)
                    .mapFromProp((f) => f.city)
                    .forProp((t) => t.houseNr)
                    .mapFromProp((f) => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
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
        // PersonDtoSchema.address can only be auto-mapped if
        // AddressSchema→AddressDtoSchema is already registered.
        // Configuring Person first fails because the Address mapping
        // does not yet exist in the registry.
        expect(() =>
            new MappingRegistry()
                .configure(PersonSchema, PersonDtoSchema, (m) =>
                    m.forProp((t) => t.name).mapFromProp((f) => f.name)
                )
        ).toThrow(MapperConfigurationError);
    });

    test('explicit mapping takes priority over auto-mapping', async () => {
        const registry = new MappingRegistry()
            .configure(AddressSchema, AddressDtoSchema, (m) =>
                m
                    .forProp((t) => t.city)
                    .mapFromProp((f) => f.city)
                    .forProp((t) => t.houseNr)
                    .mapFromProp((f) => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.address)
                    .mapFrom((p) => ({
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
            .configure(AddressSchema, AddressDtoSchema, (m) =>
                m
                    .forProp((t) => t.city)
                    .mapFromProp((f) => f.city)
                    .forProp((t) => t.houseNr)
                    .mapFromProp((f) => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, (m) =>
                m
                    .forProp((t) => t.name)
                    .mapFromProp((f) => f.name)
                    .forProp((t) => t.address)
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

    test('non-object fields are not auto-mapped', () => {
        const SourceSchema = object({
            name: string(),
            label: string()
        });

        const TargetSchema = object({
            name: string(),
            label: string()
        });

        // Without configuring the string→string mapping (which makes no sense),
        // configure should fail because 'label' can't be auto-mapped
        const registry = new MappingRegistry();
        expect(() =>
            registry.configure(SourceSchema, TargetSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
            )
        ).toThrow(MapperConfigurationError);
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
            .configure(InnerSchema, InnerDtoSchema, (m) =>
                m.forProp((t) => t.value).mapFromProp((f) => f.value)
            )
            .configure(MiddleSchema, MiddleDtoSchema, (m) =>
                m.forProp((t) => t.inner).ignore()
            )
            .configure(OuterSchema, OuterDtoSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
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
            .configure(AddressSchema, AddressDtoSchema, (m) =>
                m
                    .forProp((t) => t.city)
                    .mapFromProp((f) => f.city)
                    .forProp((t) => t.houseNr)
                    .mapFromProp((f) => f.houseNr)
            )
            .configure(PersonSchema, PersonDtoSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
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
            new MappingRegistry().configure(SourceSchema, TargetSchema, (m) =>
                m.forProp((t) => t.name).mapFromProp((f) => f.name)
            )
        ).toThrow(MapperConfigurationError);
    });
});
