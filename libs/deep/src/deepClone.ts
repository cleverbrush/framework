import { enumerableKeys, isPlainObject } from './data.js';

/**
 * Copies plain objects, arrays and Dates, preserving cycles, shared references,
 * sparse arrays and null prototypes. Other values (including class instances,
 * Files, Maps and Sets) retain their identity.
 *
 * Enumerable own string/symbol properties are read and copied as writable data
 * properties; accessors, non-enumerable properties and descriptors are not cloned.
 */
export function deepClone<T>(value: T): T {
    const seen = new WeakMap<object, object>();

    function clone(source: any): any {
        if (
            !Array.isArray(source) &&
            !(source instanceof Date) &&
            !isPlainObject(source)
        ) {
            return source;
        }
        if (seen.has(source)) return seen.get(source);
        const result = Array.isArray(source)
            ? new Array(source.length)
            : source instanceof Date
              ? new Date(source.getTime())
              : Object.create(Object.getPrototypeOf(source));
        seen.set(source, result);
        for (const key of enumerableKeys(source)) {
            Object.defineProperty(result, key, {
                value: clone(Reflect.get(source, key)),
                enumerable: true,
                configurable: true,
                writable: true
            });
        }
        return result;
    }

    return clone(value);
}
