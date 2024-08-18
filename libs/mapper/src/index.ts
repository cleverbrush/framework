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

export class SchemaToSchemaMapper<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>
> {
    public forProp<TPropertyType>(
        selector: SchemaPropertySelector<TToSchema, TPropertyType>
    ): PropertyMappingStrategy<TFromSchema, TPropertyType, this> {
        throw new Error();
    }

    public end(): SchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        throw new Error();
    }
}

export class Mapper<TFromSchema extends ObjectSchemaBuilder<any, any, any>> {
    private readonly _fromSchema: TFromSchema;

    public constructor(fromSchema: TFromSchema) {
        this._fromSchema = fromSchema;
    }

    public to<TToSchema extends ObjectSchemaBuilder<any, any, any>>(
        schema: TToSchema
    ): SchemaToSchemaMapper<TFromSchema, TToSchema> {
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

const mapper = new Mapper(UserSchema);

const mapUserToUserDto = mapper
    .to(DtoSchema)
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
    .end();

const user: InferType<typeof UserSchema> = {
    address: {
        city: 'New York',
        houseNr: 123
    },
    age: 25,
    name: 'John Doe'
};

const dto = await mapUserToUserDto(user);
