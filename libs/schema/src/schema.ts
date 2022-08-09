import { ISchemaBuilder } from './builders/SchemaBuilder.js';
import { IAliasSchemaBuilder } from './builders/AliasSchemaBuilder.js';
import { IUnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
import { IStringSchemaBuilder } from './builders/StringSchemaBuilder.js';
import { IObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import { INumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
import { IArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
import { IBooleanSchemaBuilder } from './builders/BooleanSchemaBuilder.js';

export type DefaultSchemaType =
    | 'alias'
    | 'boolean'
    | 'number'
    | 'string'
    | 'array'
    | 'object'
    | 'union';

export type KeysWithNoNever<T> = {
    [k in keyof T]: T[k] extends never ? never : k;
}[keyof T];

export type OmitNever<T> = {
    [k in KeysWithNoNever<T>]: T[k];
};

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> &
    Omit<T, K>;

export type Union<T1, T2> = {
    [k in keyof Omit<T1, keyof T2>]: T1[k];
} & T2;

export type DefaultCommonSchema = {
    isRequired: true;
    isNullable: false;
};

export type DefaultBooleanSchema = DefaultCommonSchema & {
    type: 'boolean';
};
export type DefaultNumberSchema = DefaultCommonSchema & {
    type: 'number';
    ensureNotNaN: true;
    ensureIsFinite: true;
};

export type DefaultStringSchema = DefaultCommonSchema & {
    type: 'string';
};

export type DefaultArraySchema = DefaultCommonSchema & {
    type: 'array';
};

export type DefaultUnionSchema = DefaultCommonSchema & {
    type: 'union';
};

export type DefaultObjectSchema = DefaultCommonSchema & {
    type: 'object';
    noUnknownProperties: false;
};

export type ValidationResultRaw = {
    valid: boolean;
    errors?: Array<string>;
};

export type ValidationResult =
    | ValidationResultRaw
    | Promise<ValidationResultRaw>;
export type Validator = (value: any) => ValidationResult;

export type CommonSchemaSpecification<TRequired extends boolean = true, TNullable extends boolean = false> = {
    isRequired?: TRequired;
    isNullable?: TNullable;
    validators?: Array<Validator>;
};
export type BooleanSchema = CommonSchemaSpecification<any, any> & {
    type: 'boolean';
    equals?: boolean;
};

export type NumberSchema = CommonSchemaSpecification<any, any> & {
    type: 'number';
    min?: number;
    max?: number;
    equals?: number;
    isInteger?: boolean;
    ensureNotNaN?: boolean;
    ensureIsFinite?: boolean;
};

export type ArraySchema<T> = CommonSchemaSpecification<any, any> & {
    type: 'array';
    preprocessor?: ((value: unknown) => unknown | Promise<unknown>) | string;
    ofType?: T;
    minLength?: number;
    maxLength?: number;
};

export type ObjectSchema<T extends Record<string, Schema> = never> =
    CommonSchemaSpecification<any, any> & {
        type: 'object';
        noUnknownProperties?: boolean;
        properties?: T;
        preprocessors?: {
            [S in keyof T | '*']?: S extends keyof T
                ?
                      | ((
                            value: any
                        ) =>
                            | undefined
                            | InferType<T[S]>
                            | Promise<InferType<T[S]>>)
                      | string
                : (value: InferType<T>) => void | Promise<void>;
        };
    };

export type AliasSchema = CommonSchemaSpecification<any, any> & {
    type: 'alias';
    schemaName: string;
};

export type UnionSchema<T extends any[]> = CommonSchemaSpecification<any, any> & {
    type: 'union';
    variants: T;
};

export type StringSchema = CommonSchemaSpecification<any, any> & {
    type: 'string';
    equals?: string;
    minLength?: number;
    maxLength?: number;
};

export type SchemaSpecification =
    | ObjectSchema
    | BooleanSchema
    | NumberSchema
    | ArraySchema<any>
    | AliasSchema
    | UnionSchema<any>
    | StringSchema;

export type Schema<T = any> = T extends Record<string, any>
    ? any
    : // ObjectSchema<{
    //       //   [k in keyof T]?: Schema<T[k]> | Schema;
    //       [k in keyof T]?: Schema<T[k]> | AliasSchema;
    //   }>
    T extends number
    ? NumberSchema | number | 'number'
    : T extends string
    ? StringSchema | string | 'string'
    : T extends boolean
    ? BooleanSchema | boolean
    : number | DefaultSchemaType | SchemaSpecification | Schema[];

export type ExpandUnionVariants<TVariants extends any[]> = TVariants extends [infer T]
    ? [ExpandSchemaBuilder<T>]
    : TVariants extends [infer T, ...infer Rest] ? [ExpandSchemaBuilder<T>, ExpandUnionVariants<[...Rest]>] : never;

export type ExpandSchemaBuilder<TSchema> = TSchema extends [
    infer TType,
    ...infer TParams
]
    ? TType extends 'object'
        ? TParams extends [
              infer TRequired extends boolean,
              infer TNullable extends boolean,
              infer TNoUnknownProperties extends boolean | undefined,
              infer TProperties,
              infer TMapToType
          ]
            ? IObjectSchemaBuilder<
                TRequired,
                TNullable,
                TNoUnknownProperties,
                {
                    [k in keyof TProperties]: ExpandSchemaBuilder<
                        TProperties[k]
                    >;
                },
                TMapToType
            >
            : IObjectSchemaBuilder
        : TType extends 'string'
        ? TParams extends [
              infer TRequired extends boolean,
              infer TNullable extends boolean,
              infer TMinLength extends number | undefined,
              infer TMaxLength extends number | undefined,
              infer TEqualsTo extends string | undefined
            ]
            ? TEqualsTo extends undefined
                ? IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, undefined>
                : IStringSchemaBuilder<TRequired, TNullable, TMinLength, TMaxLength, TEqualsTo>
            : IStringSchemaBuilder
        : TType extends 'number'
        ? TParams extends [
             infer TRequired extends boolean,
             infer TNullable extends boolean,
             infer TMin extends number | undefined,
             infer TMax extends number | undefined,
             infer TIsInteger extends boolean | undefined,
             infer TEnsureNotNaN extends boolean | undefined,
             infer TEnsureIsFinite extends boolean | undefined,
             infer TEqualsTo extends number | undefined
            ]
            ? TEqualsTo extends undefined
                ? INumberSchemaBuilder<TRequired, TNullable, TMin, TMax, TIsInteger, TEnsureNotNaN, TEnsureIsFinite, TEqualsTo>
                : INumberSchemaBuilder<TRequired, TNullable, TMin, TMax, TIsInteger, TEnsureNotNaN, TEnsureIsFinite, undefined>
            : INumberSchemaBuilder
        : TType extends 'alias'
        ? TParams extends [
            infer TSchemaName extends string,
            infer TRequired extends boolean,
            infer TNullable extends boolean,
            infer TAliasesCompiledType
        ]
        ? IAliasSchemaBuilder<TSchemaName, TRequired, TNullable, any, TAliasesCompiledType> : IAliasSchemaBuilder<any>
        : TType extends 'array'
        ? TParams extends [infer TRequired extends boolean, infer TNullable extends boolean, infer TOfType, infer TMaxLength extends number | undefined, infer TMinLength extends number | undefined]
            ? IArraySchemaBuilder<TRequired, TNullable, ExpandSchemaBuilder<TOfType>, TMaxLength, TMinLength> : IArraySchemaBuilder
        : TType extends 'union'
        ? TParams extends [infer TRequired extends boolean, infer TNullable extends boolean, infer TVariants extends any[]]
            ? IUnionSchemaBuilder<TRequired, TNullable, ExpandUnionVariants<TVariants>> : IUnionSchemaBuilder
        : TType extends 'boolean'
        ? TParams extends [infer TRequired extends boolean, infer TNullable extends boolean, infer TEqualsTo extends boolean | undefined]
            ? IBooleanSchemaBuilder<TRequired, TNullable, TEqualsTo extends undefined ? undefined : boolean> : IBooleanSchemaBuilder
        : TSchema
    : TSchema;

export type ReduceSchemaBuilder<TBuilder> =
    TBuilder extends IObjectSchemaBuilder<
        infer TRequired,
        infer TNullable,
        infer TNoUnknownProperties,
        infer TProperties,
        infer TMapToType
    >
        ? [
              'object',
              TRequired,
              TNullable,
              TNoUnknownProperties,
              {
                  [k in keyof TProperties]: ReduceSchemaBuilder<TProperties[k]>;
              },
              TMapToType
          ]
        : TBuilder extends IStringSchemaBuilder<
              infer TRequired,
              infer TNullable,
              infer TMinLength,
              infer TMaxLength,
              infer TEqualsTo
          >
        ? ['string', TRequired, TNullable, TMinLength, TMaxLength, TEqualsTo]
        : TBuilder extends INumberSchemaBuilder<
              infer TRequired,
              infer TNullable,
              infer TMin,
              infer TMax,
              infer TIsInteger,
              infer TEnsureNotNaN,
              infer TEnsureIsFinite,
              infer TEqualsTo
          >
        ? ['number', TRequired, TNullable, TMin, TMax, TIsInteger, TEnsureNotNaN, TEnsureIsFinite, TEqualsTo]
        : TBuilder extends IAliasSchemaBuilder<
              infer TSchemaName,
              infer TRequired,
              infer TNullable,
              infer TAliases
          >
        ? ['alias', TSchemaName, TRequired, TNullable, InferType<ExpandSchemaBuilder<TAliases[TSchemaName]>>]
        : TBuilder extends IArraySchemaBuilder<
            infer TRequired,
            infer TNullable,
            infer TOfType,
            infer TMaxLength,
            infer TMinLength
          >
        ? ['array', TRequired, TNullable, ReduceSchemaBuilder<TOfType>, TMaxLength, TMinLength]
        : TBuilder extends IUnionSchemaBuilder<infer TRequired, infer TNullable, infer TVariants>
        ? ['union', TRequired, TNullable, ReduceSchemaBuilder<TVariants>]
        : TBuilder extends IBooleanSchemaBuilder<infer TRequired, infer TNullable, infer TEqualsTo>
        ? ['boolean', TRequired, TNullable, TEqualsTo]
        : TBuilder extends [infer F]
        ? [ ReduceSchemaBuilder<F> ]
        : TBuilder extends [infer F, ...infer Rest]
        ? [ ReduceSchemaBuilder<F>, ...ReduceSchemaBuilder<Rest> ]
        : TBuilder;

export type InferType<S> = S extends DefaultSchemaType
    ? S extends 'string'
        ? string
        : S extends 'boolean'
        ? boolean
        : S extends 'number'
        ? number
        : S extends 'array'
        ? Array<any>
        : S extends 'object'
        ? Record<string, never>
        : never
    : S extends number
    ? S
    : S extends BooleanSchema
    ? S['equals'] extends undefined
        ? boolean
        : S['equals']
    : S extends UnionSchema<infer K>
    ? InferType<K>
    : S extends { type: 'union'; variants: infer K }
    ? K extends any[]
        ? InferType<K>
        : any
    : S extends IObjectSchemaBuilder<infer TRequired, infer TNullable, infer TNoUnknownProperties, infer TProperties, infer TMapToType>
        ? TMapToType extends undefined
            ? InferType<CommonSchemaSpecification<TRequired, TNullable> & {
                type: 'object';
            } &
            (TNoUnknownProperties extends true ? {noUnknownProperties: true}: { noUnknownProperties: false }) &
            (TProperties extends Record<string, any> ? {
                properties: TProperties;
            } : {})>
        : TMapToType
    : S extends INumberSchemaBuilder<infer TRequired, infer TNullable, infer TMin, infer TMax, infer TIsInteger, infer TEnsureNotNaN, infer TEnsureIsFinite, infer TEqualsTo>
        ? TRequired extends true
           ? TEqualsTo extends undefined ? number : TEqualsTo
           : TEqualsTo extends undefined ? (number | undefined) : (TEqualsTo | undefined)
    : S extends IBooleanSchemaBuilder<infer TRequired, infer TNullable, infer TEqualsTo>
        ? TRequired extends true
            ? TEqualsTo extends undefined ? boolean : TEqualsTo
            : TEqualsTo extends undefined ? (boolean | undefined): (TEqualsTo | undefined)
    : S extends IStringSchemaBuilder<infer TRequired, infer TNullable, infer TMinLength, infer TMaxLength, infer TEqualsTo>
        ? TRequired extends true ?
            TEqualsTo extends undefined ? string : TEqualsTo
           : TEqualsTo extends undefined ? (string | undefined) : (TEqualsTo | undefined)
    : S extends IAliasSchemaBuilder<infer TSchemaName, infer TRequired, infer TNullable, infer TAliases, infer TAliasesCompiledType>
        ? TRequired extends true ? TAliasesCompiledType : TAliasesCompiledType | undefined
    : S extends IArraySchemaBuilder<infer TRequired, infer TNullable, infer TOfType, infer TMaxLength, infer TMinLength>
        ? TRequired extends true
            ? TOfType extends undefined
                ? any[] : InferType<TOfType>[]
            : TOfType extends undefined
                ? (any[] | undefined) : (InferType<TOfType>[] | undefined)
    : S extends StringSchema ?
         S['equals'] extends undefined
            ? string
            : S['equals']
    : S extends NumberSchema
    ? S['equals'] extends undefined
        ? number
        : S['equals']
    : S extends ObjectSchema<infer K>
    ? OptionalPropertiesOf<K> extends never
        ? { [k in keyof K]: InferType<K[k]> }
        : MakeOptional<
              { [k in keyof K]: InferType<K[k]> },
              OptionalPropertiesOf<K>
          >
    : S extends { type: 'object'; properties: infer K }
    ? OptionalPropertiesOf<K> extends never
        ? { [k in keyof K]: InferType<K[k]> }
        : MakeOptional<
              { [k in keyof K]: InferType<K[k]> },
              OptionalPropertiesOf<K>
          >
    : S extends [infer F]
    ? InferType<F>
    : S extends [infer F, ...infer Rest]
    ? InferType<F> | InferType<Rest>
    : S extends ArraySchema<infer L>
    ? InferType<L> extends never
        ? Array<any>
        : InferType<L>[]
    : S extends { type: 'array'; ofType: infer L }
    ? InferType<L>[]
    : S extends { type: 'array' }
    ? Array<any>
    : any;

type OptionalPropertiesOf<T> = {
    [k in keyof T]: T[k] extends ISchemaBuilder<infer TRequired, any> ? TRequired extends false ? k : never : never
}[keyof T];
