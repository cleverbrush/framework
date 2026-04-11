// Re-export all types, classes, and extension system from core

export type { InterpolatedTemplateTag } from './builders/InterpolatedStringSchemaBuilder.js';
export {
    InterpolatedStringSchemaBuilder,
    interpolatedString
} from './builders/InterpolatedStringSchemaBuilder.js';
export { LazySchemaBuilder, lazy } from './builders/LazySchemaBuilder.js';
export { PromiseSchemaBuilder } from './builders/PromiseSchemaBuilder.js';
export type { RecordSchemaValidationResult } from './builders/RecordSchemaBuilder.js';
export { RecordSchemaBuilder } from './builders/RecordSchemaBuilder.js';
export type {
    TupleElementValidationResults,
    TupleSchemaValidationResult
} from './builders/TupleSchemaBuilder.js';
export { TupleSchemaBuilder } from './builders/TupleSchemaBuilder.js';
export * from './core.js';
// Override bare factory functions with augmented versions (extensions pre-applied).
// Named re-exports shadow the identically-named exports from `export *` above.
// Export extension descriptors for composition
export {
    type ArrayBuiltinExtensions,
    any,
    array,
    arrayExtensions,
    boolean,
    date,
    type ExtendedAny,
    type ExtendedArray,
    type ExtendedBoolean,
    type ExtendedDate,
    type ExtendedFunc,
    type ExtendedNumber,
    type ExtendedObject,
    type ExtendedPromise,
    type ExtendedRecord,
    type ExtendedString,
    type ExtendedTuple,
    type ExtendedUnion,
    enumOf,
    func,
    type NumberBuiltinExtensions,
    type NumberOneOfExtension,
    number,
    numberExtensions,
    object,
    promise,
    record,
    type StringBuiltinExtensions,
    type StringOneOfExtension,
    string,
    stringExtensions,
    tuple,
    union
} from './extensions/index.js';
