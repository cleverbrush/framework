import { ISchemaBuilder } from './builders/SchemaBuilder.js';
import { IAliasSchemaBuilder } from './builders/AliasSchemaBuilder.js';

export type DefaultSchemaType =
    | 'alias'
    | 'boolean'
    | 'number'
    | 'string'
    | 'array'
    | 'object'
    | 'union';

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

export type CommonSchemaSpecification = {
    isRequired?: boolean;
    isNullable?: boolean;
    validators?: Array<Validator>;
};
export type BooleanSchema = CommonSchemaSpecification & {
    type: 'boolean';
    equals?: boolean;
};

export type NumberSchema = CommonSchemaSpecification & {
    type: 'number';
    min?: number;
    max?: number;
    equals?: number;
    isInteger?: boolean;
    ensureNotNaN?: boolean;
    ensureIsFinite?: boolean;
};

export type ArraySchema<T> = CommonSchemaSpecification & {
    type: 'array';
    preprocessor?: ((value: unknown) => unknown | Promise<unknown>) | string;
    ofType?: T;
    minLength?: number;
    maxLength?: number;
};

export type ObjectSchema<T extends Record<string, Schema> = never> =
    CommonSchemaSpecification & {
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

export type AliasSchema = CommonSchemaSpecification & {
    type: 'alias';
    schemaName: string;
};

export type UnionSchema<T extends any[]> = CommonSchemaSpecification & {
    type: 'union';
    variants: T;
};

export type StringSchema = CommonSchemaSpecification & {
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
    : S extends StringSchema
    ? S['equals'] extends undefined
        ? string
        : S['equals']
    : S extends NumberSchema
    ? S['equals'] extends undefined
        ? number
        : S['equals']
    : S extends ArraySchema<infer L>
    ? InferType<L> extends never
        ? Array<any>
        : InferType<L>[]
    : S extends { type: 'array'; ofType: infer L }
    ? InferType<L>[]
    : S extends { type: 'array' }
    ? Array<any>
    : S extends [infer F]
    ? InferType<F>
    : S extends [infer F, ...infer Rest]
    ? InferType<F> | InferType<Rest>
    : S extends ObjectSchema<infer K>
    ? MakeOptional<
          {
              [k in keyof K]: InferType<K[k]>;
          },
          OptionalPropertiesOf<K>
      >
    : S extends { type: 'object'; properties: infer K }
    ? MakeOptional<{ [k in keyof K]: InferType<K[k]> }, OptionalPropertiesOf<K>>
    : S extends UnionSchema<infer K>
    ? InferType<K>
    : S extends { type: 'union'; variants: infer K }
    ? K extends any[]
        ? InferType<K>
        : any
    : S extends IAliasSchemaBuilder<infer TAName, any, any, infer TAliases>
    ? InferType<TAliases[TAName]>
    : any;

type OptionalPropertiesOf<
    T extends Record<string, any> = Record<string, never>
> = Exclude<
    {
        [K in keyof T]: T[K] extends ISchemaBuilder<false, any>
            ? K
            : T[K] extends CommonSchemaSpecification
            ? T[K]['isRequired'] extends false
                ? K
                : never
            : never;
    }[keyof T],
    undefined
>;
