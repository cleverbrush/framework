import { object } from './builders/ObjectSchemaBuilder.js';
import { number } from './builders/NumberSchemaBuilder.js';
import { InferType } from './builders/SchemaBuilder.js';

export {
    SchemaBuilder,
    InferType,
    MakeOptional,
    MakeRequired,
    ValidationError,
    ValidationResult
} from './builders/SchemaBuilder.js';
export { number, NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
export { object, ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
export { union, UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';

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
