/**
 * Flattens an object to a single level, with the nested keys separated by a `delimiter`.
 * @example
 * ```ts
 * deepFlatten({ a: { b: 1, c: 2 } });
 * // => { 'a.b': 1, 'a.c': 2 }
 *
 * deepFlatten({ a: { b: 1, c: 2 } }, '/');
 * // => { 'a/b': 1, 'a/c': 2 }
 *
 * deepFlatten({ a: { b: 1, c: { d: 'some val' } }, d: 3 });
 * // => { 'a.b': 1, 'a.c.d': 'some val', d: 3 }
 *
 * ```
 * @param {string} [delimiter]
 */
export function deepFlatten(
    obj: Record<string, any>,
    delimiter = '.'
): Record<string, any> {
    const shouldFlatten = (obj) =>
        typeof obj === 'object' &&
        obj !== null &&
        !Array.isArray(obj) &&
        Object.getPrototypeOf(obj) === Object.prototype;

    if (!shouldFlatten(obj)) throw new Error('cannot flatten this object');

    const stack: any[] = [];

    const result: Record<string, any> = {};

    const deepFlattenHelper = (obj: any, prefix = '') => {
        if (stack.find((o) => o === obj))
            throw new Error('circular reference detected');

        stack.push(obj);

        Object.keys(obj).forEach((key) => {
            if (!shouldFlatten(obj[key])) {
                result[prefix ? `${prefix}${delimiter}${key}` : key] = obj[key];
                return;
            }
            deepFlattenHelper(
                obj[key],
                prefix ? `${prefix}${delimiter}${key}` : key
            );
        });

        stack.pop();
    };

    deepFlattenHelper(obj);

    return result;
}
