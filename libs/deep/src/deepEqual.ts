import { enumerableKeys, isPlainObject } from './data.js';

function isArrayIndex(key: string | symbol): boolean {
    if (typeof key !== 'string') return false;
    const index = Number(key);
    return (
        Number.isInteger(index) &&
        index >= 0 &&
        index < 2 ** 32 - 1 &&
        String(index) === key
    );
}

/**
 * Structurally compares plain objects and arrays (including cycles). Dates
 * compare by timestamp; primitives and opaque objects use Object.is semantics.
 * Only enumerable own string/symbol properties participate in structural
 * comparisons. Shared-reference topology does not affect equality.
 */
export const deepEqual = (
    p1: any,
    p2: any,
    options?: {
        /** Ignore array element order, but preserve duplicate and hole counts. */
        disregardArrayOrder?: boolean;
    }
): boolean => {
    // Track pairs on the current recursion path, not all objects ever visited.
    // Removing pairs on return also isolates failed unordered-array candidates.
    const active = new WeakMap<object, Set<object>>();

    function compareProperties(
        left: object,
        right: object,
        leftKeys: (string | symbol)[],
        rightKeys: (string | symbol)[]
    ): boolean {
        const rightKeySet = new Set(rightKeys);
        return (
            leftKeys.length === rightKeys.length &&
            leftKeys.every(
                key =>
                    rightKeySet.has(key) &&
                    compare(Reflect.get(left, key), Reflect.get(right, key))
            )
        );
    }

    function compareUnordered(
        left: object,
        right: object,
        leftKeys: (string | symbol)[],
        rightKeys: (string | symbol)[]
    ): boolean {
        const leftIndices = leftKeys.filter(isArrayIndex);
        const rightIndices = rightKeys.filter(isArrayIndex);
        if (leftIndices.length !== rightIndices.length) return false;
        if (
            !compareProperties(
                left,
                right,
                leftKeys.filter(key => !isArrayIndex(key)),
                rightKeys.filter(key => !isArrayIndex(key))
            )
        ) {
            return false;
        }

        const unmatched = new Set(rightIndices);
        for (const key of leftIndices) {
            const value = Reflect.get(left, key);
            const match = Array.from(unmatched).find(candidate =>
                compare(value, Reflect.get(right, candidate))
            );
            if (match === undefined) return false;
            unmatched.delete(match);
        }
        return true;
    }

    function compare(left: any, right: any): boolean {
        if (Object.is(left, right)) return true;
        if (left instanceof Date || right instanceof Date) {
            return (
                left instanceof Date &&
                right instanceof Date &&
                Object.is(left.getTime(), right.getTime())
            );
        }
        if (Array.isArray(left)) {
            if (!Array.isArray(right) || left.length !== right.length) {
                return false;
            }
        } else if (!isPlainObject(left) || !isPlainObject(right)) {
            return false;
        }

        let partners = active.get(left);
        if (partners?.has(right)) return true;
        if (!partners) {
            partners = new Set();
            active.set(left, partners);
        }
        partners.add(right);
        try {
            const leftKeys = enumerableKeys(left);
            const rightKeys = enumerableKeys(right);
            return Array.isArray(left) && options?.disregardArrayOrder
                ? compareUnordered(left, right, leftKeys, rightKeys)
                : compareProperties(left, right, leftKeys, rightKeys);
        } finally {
            partners.delete(right);
        }
    }

    return compare(p1, p2);
};
