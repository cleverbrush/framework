import {
    InferType,
    ObjectSchemaBuilder,
    SchemaPropertySelector,
    object,
    string,
    number
} from '@cleverbrush/schema';

export type SchemaToSchemaMapperResult<TFromSchema, TToSchema> = (
    from: InferType<TFromSchema>
) => Promise<InferType<TToSchema>>;

export type PropertyMappingStrategy<
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertyType,
    TReturnType
> = {
    ignore: () => TReturnType;
    mapFromProp: (
        p: SchemaPropertySelector<TToSchema, TPropertyType>
    ) => TReturnType;
    mapFrom: (
        setings:
            | ((obj?: InferType<TToSchema>) => TPropertyType)
            | ((obj?: InferType<TToSchema>) => Promise<TPropertyType>)
    ) => TReturnType;
};

/**
 * A class to map properties from one schema to another
 * by defualt it will map all properties with the same name
 * and type (schema). If you want to map a property to a different
 * property you can use the forProp method to specify the target.
 * When you are done you can call the `getMapper` method to get the
 * function that will do the mapping.
 *
 * If there are properties that you don't want to map you can use the
 * ignore method.
 * Also if at the time of calling `getMapper` function there are properties
 * in the target schema that are not mapped (and not ignored)
 * and MapperConfigurationError will be thrown.
 */
export class Mapper<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>
> {
    private readonly _fromSchema: TFromSchema;
    private readonly _toSchema: TToSchema;

    /**
     * Creates a new instance of the Mapper class given the two schemas.
     * @param fromSchema - `object` schema to map from
     * @param toSchema  - `object` schema to map to
     */
    public constructor(fromSchema: TFromSchema, toSchema: TToSchema) {
        this._fromSchema = fromSchema;
        this._toSchema = toSchema;
    }

    public forProp<TPropertyType>(
        selector: SchemaPropertySelector<TToSchema, TPropertyType>
    ): PropertyMappingStrategy<TFromSchema, TPropertyType, this> {
        throw new Error();
    }

    public getMapper(): SchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        throw new Error();
    }
}

const UserSchema = object({
    name: string(),
    age: number(),
    address: object({
        city: string(),
        houseNr: number()
    })
});

const DtoSchema = object({
    name: string(),
    cityName: string(),
    houseNr: string(),
    fullAddress: string(),
    alwaysTen: number().equals(10)
});

const mapper = new Mapper(UserSchema, DtoSchema);

const mapUserToUserDto = mapper
    .forProp((t) => t.name)
    .mapFromProp((t) => t.name)
    .forProp((t) => t.cityName)
    .mapFromProp((t) => t.address.city)
    .forProp((t) => t.houseNr)
    .mapFrom((user) => {
        var houseNr = user.address.houseNr;
        return houseNr.toString();
    })
    .forProp((t) => t.fullAddress)
    .mapFrom((t) => t.address.city + ' ' + t.address.houseNr)
    .forProp((t) => t.alwaysTen)
    .mapFrom(() => 10)
    .getMapper();

const user: InferType<typeof UserSchema> = {
    address: {
        city: 'New York',
        houseNr: 123
    },
    age: 25,
    name: 'John Doe'
};

const dto = await mapUserToUserDto(user);
