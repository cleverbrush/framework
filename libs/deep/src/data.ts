/** The structural data types supported by cloning and equality. */
export function isPlainObject(value: unknown): value is object {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
}

export function enumerableKeys(value: object): (string | symbol)[] {
    return Reflect.ownKeys(value).filter(key =>
        Object.prototype.propertyIsEnumerable.call(value, key)
    );
}
