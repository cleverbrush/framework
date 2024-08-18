export { AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
export { ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
export { BooleanSchemaBuilder } from './builders/BooleanSchemaBuilder.js';
export { DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
export { FunctionSchemaBuilder } from './builders/FunctionSchemaBuilder.js';
export { ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
export { NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
export { StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
export { UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
export { SchemaBuilder } from './builders/SchemaBuilder.js';

export {
    InferType,
    MakeOptional,
    ValidationError,
    ValidationResult
} from './builders/SchemaBuilder.js';
export { any } from './builders/AnySchemaBuilder.js';
export { array } from './builders/ArraySchemaBuilder.js';
export { boolean } from './builders/BooleanSchemaBuilder.js';
export { date } from './builders/DateSchemaBuilder.js';
export { func } from './builders/FunctionSchemaBuilder.js';
export { number } from './builders/NumberSchemaBuilder.js';
export { object } from './builders/ObjectSchemaBuilder.js';
export { string } from './builders/StringSchemaBuilder.js';
export { union } from './builders/UnionSchemaBuilder.js';

import { InferType, SchemaBuilder } from './builders/SchemaBuilder.js';
import { ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';

export const SYMBOL_SCHEMA_PROPERTY = Symbol();

export type PropertyDescriptor<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertyType
> = {
    [SYMBOL_SCHEMA_PROPERTY]: {
        schema?: SchemaBuilder<any, any>;
        setValue: (obj: InferType<TSchema>, value: TPropertyType) => void;
        getValue: (obj: InferType<TSchema>) => TPropertyType;
    };
};

export type PropertyDescriptorTree<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TRootSchema extends ObjectSchemaBuilder<any, any, any> = TSchema,
    TAssignableTo = any
> =
    TSchema extends ObjectSchemaBuilder<infer TProperties, any, any>
        ? {
              [K in keyof TProperties]: TProperties[K] extends ObjectSchemaBuilder<
                  any,
                  any,
                  any
              >
                  ? PropertyDescriptorTree<TProperties[K], TRootSchema> &
                        PropertyDescriptor<
                            TRootSchema,
                            InferType<TProperties[K]>
                        >
                  : InferType<TProperties[K]> extends TAssignableTo
                    ? PropertyDescriptor<TRootSchema, InferType<TProperties[K]>>
                    : never;
          }
        : never;

export type SchemaPropertySelector<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertyType,
    TAssignableTo = any
> = (
    l: PropertyDescriptorTree<TFromSchema, TFromSchema, TAssignableTo>
) => PropertyDescriptor<TFromSchema, TPropertyType>;
