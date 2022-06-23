import { Merge } from '@cleverbrush/deep';
import SchemaValidator from './schemaValidator';

export type DefaultSchemaType =
    | 'object'
    | 'boolean'
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
        [S in keyof T | '*']: S extends keyof T
            ?
                  | ((
                        value: unknown
                    ) => undefined | PropType<T, S> | Promise<PropType<T, S>>)
                  | string
            : (value: T) => void | Promise<void>;
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

export type BooleanSchemaDefinition<TObj> = Omit<
    SchemaDefintion<TObj>,
    'type'
> & {
    type: 'boolean';
    equals?: boolean;
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
    preprocessor?: ((value: unknown) => unknown | Promise<unknown>) | string;
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
          | BooleanSchemaDefinition<TObj>
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

export type Cons<H, T extends unknown[] = []> = T['length'] extends 0
    ? [H]
    : ((h: H, ...t: T) => void) extends (...r: infer R) => void
    ? R
    : never;

export interface ISchemaActions<S> {
    validate(value: any): Promise<ValidationResult>;
    schema: S;
}

export interface ISchemasProvider<T extends unknown[]> {
    schemas: Merge<T>;
}

export interface ISchemaValidator<
    T extends Record<string, never> = Record<string, never>,
    SchemaTypesStructures extends unknown[] = []
> {
    get preprocessors(): Map<
        string,
        (value: unknown) => unknown | Promise<unknown>
    >;
    addPreprocessor(
        name: string,
        preprocessor: (value: unknown) => unknown | Promise<unknown>
    ): SchemaValidator<T, SchemaTypesStructures>;

    addSchemaType<
        K,
        L extends ObjectSchemaDefinitionParam<M> | Array<Schema<any>>,
        M = any
    >(
        name: keyof K,
        schema: L
    ): SchemaValidator<
        T & { [key in keyof K]: typeof schema },
        Cons<Unfold<keyof K, ISchemaActions<L>>, SchemaTypesStructures>
    >;

    validate(
        schema: keyof T | DefaultSchemaType | Schema<any>,
        obj: any
    ): Promise<ValidationResult>;
}

export type Unfold<T, K> = T extends string
    ? T extends `${infer F}.${infer L}`
        ? {
              [k in F]: Unfold<L, K>;
          }
        : {
              [k in T]: K;
          }
    : never;

export { SchemaValidator };
export default SchemaValidator;
