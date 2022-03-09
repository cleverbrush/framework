import SchemaValidator from './schemaValidator';

export type DefaultSchemaType =
    | 'object'
    | 'function'
    | 'number'
    | 'string'
    | 'array'
    | 'alias';

export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type DefaultPropertyDefinition = {
    isRequired: boolean;
    isNullable: boolean;
};

export type ValidationResultRaw = {
    valid: boolean;
    errors?: Array<string>;
};

export type ValidationResult =
    | ValidationResultRaw
    | Promise<ValidationResultRaw>;

export type Validator<TObj> = (value: TObj) => ValidationResult;

export type SchemaDefintion<TObj> = {
    type: DefaultSchemaType;
    isRequired?: boolean;
    isNullable?: boolean;
    validators?: Array<Validator<TObj>>;
};

export type ObjectSchemaDefinition<T> = Omit<SchemaDefintion<T>, 'type'> & {
    type: 'object';
    extends?: string;
    properties?: Partial<{
        [S in keyof T]: Schema<PropType<T, S>>;
    }>;
    preprocessors?: Partial<{
        [S in keyof T]:
            | ((value: unknown) => PropType<T, S> | Promise<PropType<T, S>>)
            | string;
    }>;
};

export type AliasSchemaDefinition<T> = Omit<SchemaDefintion<T>, 'type'> & {
    type: 'alias';
    schemaName: string;
};

export type ObjectSchemaDefinitionParam<T> = Omit<
    ObjectSchemaDefinition<T>,
    'type'
>;

export type ParamsValidators<TFunc extends (...args: any) => any> = {
    [S in keyof Parameters<TFunc>]: SingleSchema<Parameters<TFunc>[S]>;
};

export type FunctionSchemaDefinition<T extends (...args: any) => any> = Omit<
    SchemaDefintion<T>,
    'type'
> & {
    type: 'function';
    params?: ParamsValidators<T>;
};

export type NumberSchemaDefinition<TObj> = Omit<
    SchemaDefintion<TObj>,
    'type'
> & {
    type: 'number';
    min?: number;
    max?: number;
    equals?: number;
    isInteger?: boolean;
    ensureNotNaN?: boolean;
    ensureIsFinite?: boolean;
};

export type StringSchemaDefinition<TObj> = Omit<
    SchemaDefintion<TObj>,
    'type'
> & {
    type: 'string';
    equals?: string;
    minLength?: number;
    maxLength?: number;
};

export type ArraySchemaDefinition<TObj> = Omit<
    SchemaDefintion<TObj>,
    'type'
> & {
    type: 'array';
    ofType?: Schema<any>;
    minLength?: number;
    maxLength?: number;
};

export type CompositeSchema<TObj> = TObj extends (...args: any) => any
    ? FunctionSchemaDefinition<TObj>
    : TObj extends number
    ? NumberSchemaDefinition<TObj>
    : TObj extends string
    ? StringSchemaDefinition<TObj> | 'string'
    :
          | NumberSchemaDefinition<TObj>
          | StringSchemaDefinition<TObj>
          | ArraySchemaDefinition<TObj>
          | ObjectSchemaDefinition<TObj>
          | AliasSchemaDefinition<TObj>;

export type SingleSchema<TObj = Record<string, never>> =
    | number
    | string
    | DefaultSchemaType
    | CompositeSchema<TObj>;

export type Schema<TObj> = SingleSchema<TObj> | Array<SingleSchema<TObj>>;

export interface ISchemaActions<K, T extends keyof K> {
    validate(value: any): Promise<ValidationResult>;
    schema: PropType<K, T>;
}

export interface ISchemasProvider<T = Record<string, never>> {
    schemas: {
        [K in keyof T]: ISchemaActions<T, K>;
    };
}

export interface ISchemaValidator<T = Record<string, never>> {
    get preprocessors(): Map<
        string,
        (value: unknown) => unknown | Promise<unknown>
    >;
    addPreprocessor(
        name: string,
        preprocessor: (value: unknown) => unknown | Promise<unknown>
    ): SchemaValidator<T>;

    addSchemaType<K, L extends ObjectSchemaDefinitionParam<M>, M = any>(
        name: keyof K,
        schema: L | Array<Schema<any>>
    ): SchemaValidator<T & { [key in keyof K]: typeof schema }>;

    validate(
        schema: keyof T | DefaultSchemaType | Schema<any>,
        obj: any
    ): Promise<ValidationResult>;
}

export { SchemaValidator };
export default SchemaValidator;
