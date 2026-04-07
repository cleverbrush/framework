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
    exclude: any[]
): number | undefined {
    if (exclude.indexOf(obj) > -1) {
        return undefined;
    }
    let hash = '';
    const keys = Object.keys(obj).sort();
    for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const keyHash = hashFunc(key);
        const attrHash = hashFunc(obj[key], exclude);
        exclude.push(obj[key]);
        hash += stringHash(`object${keyHash}${attrHash}`, true);
    }
    return stringHash(hash, true);
}

/**
 * Computes a 32-bit numeric hash for any value.
 *
 * Objects are hashed by recursively hashing their sorted keys and values;
 * circular references are detected via an internal exclusion list.
 *
 * @param unkType - The value to hash (object, string, number, etc.).
 * @param exclude - Internal array used for circular-reference detection.
 * @returns A 32-bit integer hash code.
 */
export function HashObject(unkType: any, exclude?: any[]): number {
    let ex = exclude;
    if (ex === undefined) {
        ex = [];
    }
    // biome-ignore lint/suspicious/noGlobalIsNan: intentional coercion — isNaN returns true for non-numeric types like objects
    if (!isNaN(unkType) && typeof unkType !== 'string') {
        return unkType;
    }
    switch (typeof unkType) {
        case 'object':
            return objectHash(unkType, ex) as number;
        default:
            return stringHash(String(unkType)) as number;
    }
}

const hashFunc = HashObject;
