import { any, AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
import { object, ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import { number, NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
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
export { number, NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
export { object, ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
export { union, UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';

export default {
    any,
    number,
    object,
    union,
    builders: {
        AnySchemaBuilder,
        ObjectSchemaBuilder,
        NumberSchemaBuilder,
        UnionSchemaBuilder,
        SchemaBuilder
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
