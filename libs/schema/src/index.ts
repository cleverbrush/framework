// Re-export all types, classes, and extension system from core

export { LazySchemaBuilder, lazy } from './builders/LazySchemaBuilder.js';
export * from './core.js';
// Override bare factory functions with augmented versions (extensions pre-applied).
// Named re-exports shadow the identically-named exports from `export *` above.
// Export extension descriptors for composition
export {
    type AnyBuiltinExtensions,
    type ArrayBuiltinExtensions,
    any,
    array,
    arrayExtensions,
    type BooleanBuiltinExtensions,
    boolean,
    type DateBuiltinExtensions,
    date,
    type ExtendedAny,
    type ExtendedArray,
    type ExtendedBoolean,
    type ExtendedDate,
    type ExtendedFunc,
    type ExtendedNumber,
    type ExtendedObject,
    type ExtendedString,
    type ExtendedUnion,
    type FuncBuiltinExtensions,
    func,
    type NullableMethod,
    type NullableReturn,
    type NumberBuiltinExtensions,
    nullableExtension,
    number,
    numberExtensions,
    type ObjectBuiltinExtensions,
    object,
    type StringBuiltinExtensions,
    string,
    stringExtensions,
    type UnionBuiltinExtensions,
    union
} from './extensions/index.js';
