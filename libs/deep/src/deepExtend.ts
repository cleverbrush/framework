type UnsafeMergeKey = '__proto__' | 'constructor' | 'prototype';

type SafeMergeProps<T> = Omit<T, UnsafeMergeKey>;

type SafeProp<T, K extends PropertyKey> = K extends keyof SafeMergeProps<T>
    ? SafeMergeProps<T>[K]
    : never;

type DeepSafeMergeValue<T> = T extends readonly unknown[]
    ? { [K in keyof T]: DeepSafeMergeValue<T[K]> }
    : T extends Record<string, unknown>
      ? DeepSafeMergeProps<T>
      : T;

type DeepSafeMergeProps<T> = {
    [K in keyof SafeMergeProps<T>]: DeepSafeMergeValue<SafeProp<T, K>>;
};

/** Properties that exist in both `T1` and `T2`, typed as `T2`'s version. */
export type CommonProps<T1, T2> = {
    [k in keyof SafeMergeProps<T1> & keyof SafeMergeProps<T2>]: SafeProp<
        T1,
        k
    > extends never
        ? never
        : SafeProp<T2, k> extends never
          ? never
          : SafeProp<T2, k>;
};

/** Properties present in `T1` but not in `T2`. */
export type PropsInFirstOnly<T1, T2> = Omit<
    DeepSafeMergeProps<T1>,
    keyof SafeMergeProps<T2>
>;

/** Recursively merges two object types. Matching keys are merged; unique keys are kept. */
export type MergeTwo<T1, T2> = PropsInFirstOnly<T1, T2> &
    PropsInFirstOnly<T2, T1> & {
        [k in keyof CommonProps<T1, T2>]: SafeProp<T1, k> extends Record<
            string,
            unknown
        >
            ? SafeProp<T2, k> extends Record<string, unknown>
                ? MergeTwo<SafeProp<T1, k>, SafeProp<T2, k>>
                : DeepSafeMergeValue<SafeProp<T2, k>>
            : DeepSafeMergeValue<SafeProp<T2, k>>;
    };

/** Recursively merges a tuple of object types from left to right. */
export type Merge<T extends unknown[]> = T['length'] extends 3
    ? MergeTwo<T[0], MergeTwo<T[1], T[2]>>
    : T['length'] extends 2
      ? MergeTwo<T[0], T[1]>
      : T['length'] extends 1
        ? DeepSafeMergeProps<T[0]>
        : T extends [...infer K, infer PL, infer L]
          ? Merge<[Merge<[...K]>, MergeTwo<PL, L>]>
          : never;

/**
 * Deep-merges multiple objects into one. Later values override earlier ones;
 * nested objects are merged recursively rather than replaced.
 * Prototype-polluting keys (`__proto__`, `constructor`, and `prototype`) are
 * ignored.
 *
 * @example
 * ```ts
 * const a = { x: 1, nested: { a: true } };
 * const b = { y: 2, nested: { b: false } };
 * const result = deepExtend(a, b);
 * // { x: 1, y: 2, nested: { a: true, b: false } }
 * ```
 *
 * @param args - Two or more non-null objects to merge.
 * @returns A new object containing the deep-merged result.
 * @throws If no arguments are provided or any argument is not a non-null object.
 */
export const deepExtend = ((...rest) => {
    if (rest.length === 0) throw new Error('no arguments');
    if (typeof rest[0] !== 'object' || rest[0] === null)
        throw new Error('not a non-null object');

    const result = {};

    const extendObject = (
        o1: any,
        o2: any,
        copiedObjects: WeakMap<object, object>
    ) => {
        const keys = Object.keys(o2);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (isUnsafeMergeKey(key)) continue;

            const sourceValue = o2[key];
            if (!isMergeableObject(sourceValue)) {
                defineMergeProperty(o1, key, sourceValue);
                continue;
            }

            if (copiedObjects.has(sourceValue)) {
                defineMergeProperty(o1, key, copiedObjects.get(sourceValue));
                continue;
            }

            const targetValue = Object.hasOwn(o1, key) ? o1[key] : undefined;
            const targetBranch = isMergeableObject(targetValue)
                ? targetValue
                : createMergeTarget(sourceValue);

            copiedObjects.set(sourceValue, targetBranch);
            extendObject(targetBranch, sourceValue, copiedObjects);
            defineMergeProperty(o1, key, targetBranch);
        }
    };

    for (let i = 0; i < rest.length; i++) {
        const source = rest[i];
        if (typeof source === 'object' && source !== null) {
            const copiedObjects = new WeakMap<object, object>();
            copiedObjects.set(source, result);
            extendObject(result, source, copiedObjects);
        } else {
            throw new Error('not a non-null object');
        }
    }

    return result;
}) as <T extends unknown[]>(...args: T) => Merge<T>;

function isUnsafeMergeKey(key: string): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function isMergeableObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false;
    if (Array.isArray(value)) return true;

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function createMergeTarget(source: Record<string, unknown>): object {
    if (Array.isArray(source)) return [];
    return Object.getPrototypeOf(source) === null ? Object.create(null) : {};
}

function defineMergeProperty(
    target: object,
    key: string,
    value: unknown
): void {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
    });
}
