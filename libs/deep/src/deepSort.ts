/**
 * Stably sort records in place by one numeric position in an array-valued field.
 *
 * Input must be a dense array of records; missing entries reject before mutation.
 * All keys are validated before changing the input. An invalid index rejects
 * with RangeError; missing/non-array fields and non-finite keys reject with
 * TypeError. Empty input is valid. Equal keys retain their original order.
 *
 * @example
 * ```ts
 * deepSort([{ path: [2, 0] }, { path: [1, 4] }], 0, 'path');
 * // => [{ path: [1, 4] }, { path: [2, 0] }]
 * ```
 */
export function deepSort<T extends object>(
    items: T[],
    index: number,
    field: keyof T
): T[] {
    if (!Number.isSafeInteger(index) || index < 0) {
        throw new RangeError('index must be a non-negative integer.');
    }
    if (!Array.isArray(items)) throw new TypeError('items must be an array.');
    const sorted = Array.from(items, item => {
        const values = item?.[field];
        if (!Array.isArray(values)) {
            throw new TypeError('The selected field must be an array.');
        }
        if (index >= values.length) {
            throw new RangeError('index exceeds a selected field length.');
        }
        const key = values[index];
        if (typeof key !== 'number' || !Number.isFinite(key)) {
            throw new TypeError('Sort keys must be finite numbers.');
        }
        return { item, key };
    });
    sorted.sort((a, b) => a.key - b.key);
    sorted.forEach(({ item }, position) => {
        items[position] = item;
    });
    return items;
}
