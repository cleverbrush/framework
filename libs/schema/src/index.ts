// Re-export all types, classes, and extension system from core
export * from './core.js';
// Override bare factory functions with augmented versions (extensions pre-applied).
// Named re-exports shadow the identically-named exports from `export *` above.
// Export extension descriptors for composition
export {
    any,
    array,
    arrayExtensions,
    boolean,
    date,
    func,
    number,
    numberExtensions,
    object,
    string,
    stringExtensions,
    union
} from './extensions/index.js';
