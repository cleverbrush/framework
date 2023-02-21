import { any, AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
import { array, ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
import {
    boolean,
    BooleanSchemaBuilder
} from './builders/BooleanSchemaBuilder.js';
import { date, DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
import {
    func,
    FunctionSchemaBuilder
} from './builders/FunctionSchemaBuilder.js';
import { object, ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import { number, NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
import { string, StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
import { union, UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
import { InferType, SchemaBuilder } from './builders/SchemaBuilder.js';

export {
    InferType,
    MakeOptional,
    MakeRequired,
    ValidationError,
    ValidationResult
} from './builders/SchemaBuilder.js';
export { any, AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
export { array, ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
export {
    boolean,
    BooleanSchemaBuilder
} from './builders/BooleanSchemaBuilder.js';
export { date, DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
export {
    func,
    FunctionSchemaBuilder
} from './builders/FunctionSchemaBuilder.js';
export { number, NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
export { object, ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
export { string, StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
export { union, UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';

export default {
    any,
    array,
    boolean,
    date,
    func,
    number,
    object,
    string,
    union,
    builders: {
        AnySchemaBuilder,
        ArraySchemaBuilder,
        BooleanSchemaBuilder,
        DateSchemaBuilder,
        FunctionSchemaBuilder,
        ObjectSchemaBuilder,
        NumberSchemaBuilder,
        SchemaBuilder,
        StringSchemaBuilder,
        UnionSchemaBuilder
    }
};

/**
 * another comment here
 */
export const obj = object({
    /**
     * some comment here
     */
    first: number()
});

export type ObjType = InferType<typeof obj>;
