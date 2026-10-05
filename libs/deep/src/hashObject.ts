const stringHash = (string: string, noType?: boolean) => {
    let hashString = string;
    if (!noType) {
        hashString = `string${string}`;
    }
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
        const character = hashString.charCodeAt(i);
        hash = (hash << 5) - hash + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

function objectHash(
    obj: Record<string, any>,
    exclude: any[],
    ancestors: WeakSet<object>
): number | undefined {
    if (exclude.indexOf(obj) > -1 || ancestors.has(obj)) {
        return undefined;
    }
    ancestors.add(obj);
    try {
        let hash = '';
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
            const keyHash = hashValue(key, [], ancestors);
            const attrHash = hashValue(obj[key], exclude, ancestors);
            exclude.push(obj[key]);
            hash += stringHash(`object${keyHash}${attrHash}`, true);
        }
        return stringHash(hash, true);
    } finally {
        ancestors.delete(obj);
    }
}

/**
 * Computes a 32-bit numeric hash for any value.
 *
 * Objects are hashed by recursively hashing their sorted keys and values;
 * Circular object references terminate at the repeated ancestor. Existing
 * acyclic hashes and the supplied exclusion list retain their behavior.
 *
 * @param unkType - The value to hash (object, string, number, etc.).
 * @param exclude - Internal array used for circular-reference detection.
 * @returns A 32-bit integer hash code.
 */
export function HashObject(unkType: any, exclude?: any[]): number {
    return hashValue(unkType, exclude ?? [], new WeakSet());
}

function hashValue(
    unkType: any,
    exclude: any[],
    ancestors: WeakSet<object>
): number {
    // biome-ignore lint/suspicious/noGlobalIsNan: intentional coercion — isNaN returns true for non-numeric types like objects
    if (!isNaN(unkType) && typeof unkType !== 'string') {
        return unkType;
    }
    switch (typeof unkType) {
        case 'object':
            return objectHash(unkType, exclude, ancestors) as number;
        default:
            return stringHash(String(unkType)) as number;
    }
}
