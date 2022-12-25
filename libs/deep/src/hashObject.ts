const stringHash = (string, noType?) => {
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

function objectHash(obj, exclude) {
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

export function HashObject(unkType, exclude?) {
    let ex = exclude;
    if (ex === undefined) {
        ex = [];
    }
    if (!isNaN(unkType) && typeof unkType !== 'string') {
        return unkType;
    }
    switch (typeof unkType) {
        case 'object':
            return objectHash(unkType, ex);
        default:
            return stringHash(String(unkType));
    }
}

const hashFunc = HashObject;
