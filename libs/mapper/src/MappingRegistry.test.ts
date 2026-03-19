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
        expect(() => registry.map(null as any, null as any)).toThrow();
        expect(() => registry.map(null as any, UserDtoSchema)).toThrow();
        expect(() => registry.map(UserSchema, null as any)).toThrow();
    });

    test('throws on non-ObjectSchemaBuilder schemas', () => {
        const registry = new MappingRegistry();
        expect(() => registry.map(string() as any, UserDtoSchema)).toThrow(
            'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
        );
        expect(() => registry.map(UserSchema, number() as any)).toThrow(
            'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
        );
    });

    test('creates mapper for valid schema pair', () => {
        const registry = new MappingRegistry();
        const mapper = registry.map(UserSchema, UserDtoSchema);
        expect(mapper).toBeInstanceOf(Mapper);
    });

    test('getMapper throws when no mapper registered', () => {
        const registry = new MappingRegistry();
        expect(() => registry.getMapper(UserSchema, UserDtoSchema)).toThrow(
            'No mapper found'
        );
    });

    test('getMapper retrieves registered mapper', async () => {
        const registry = new MappingRegistry();
        registry
            .map(UserSchema, UserDtoSchema)
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.cityName)
            .mapFromProp((f) => f.address.city)
            .forProp((t) => t.fullAddress)
            .mapFrom((user) => `${user.address.city} ${user.address.houseNr}`)
            .getMapper();

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

        expect(dto).toEqual({
            name: 'John Doe',
            cityName: 'New York',
            fullAddress: 'New York 123'
        });

        // Also retrievable from registry
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

        const registry = new MappingRegistry();

        const mapFn = registry
            .map(UserSchema, ExtendedDtoSchema)
            .forProp((t) => t.name)
            .mapFromProp((f) => f.name)
            .forProp((t) => t.cityName)
            .mapFromProp((f) => f.address.city)
            .forProp((t) => t.fullAddress)
            .mapFrom((user) => `${user.address.city} ${user.address.houseNr}`)
            .forProp((t) => t.internalField)
            .ignore()
            .getMapper();

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
