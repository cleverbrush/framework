import { HashObject } from './hashObject.js';

const isBothNaN = function (v1, v2) {
    return Number.isNaN(v1) && Number.isNaN(v2);
};

const deepEqual = function (
    p1,
    p2,
    options?: { disregardArrayOrder?: boolean }
): boolean {
    const cache = new Map();

    const compare = function (o1, o2) {
        const arraysAreIdentical = function (a1, a2) {
            if (a1.length !== a2.length) return false;
            if (a1.length === 0 && a2.length === 0) return true;

            const c1 = options?.disregardArrayOrder
                ? a1
                      .map((t) => t)
                      .sort((l, r) => {
                          const hash1 = HashObject(l);
                          const hash2 = HashObject(r);
                          return hash1 < hash2 ? 1 : -1;
                      })
                : a1.map((t) => t);
            const c2 = options?.disregardArrayOrder
                ? a2
                      .map((t) => t)
                      .sort((l, r) => {
                          const hash1 = HashObject(l);
                          const hash2 = HashObject(r);
                          return hash1 < hash2 ? 1 : -1;
                      })
                : a2.map((t) => t);

            for (let i = 0; i < c1.length; i++) {
                if (!compare(c1[i], c2[i])) return false;
            }
            return true;
        };

        if (arguments.length !== 2) return false;
        if (o1 === o2) return true;
        if (typeof o1 !== typeof o2) return false;
        if (isBothNaN(o1, o2)) return true;

        if (
            (Array.isArray(o1) && !Array.isArray(o2)) ||
            (!Array.isArray(o1) && Array.isArray(o2))
        ) {
            return false;
        }
        if (Array.isArray(o1) && Array.isArray(o2)) {
            return arraysAreIdentical(o1, o2);
        }

        if (typeof o1 === 'object') {
            if (cache.get(o1) === true) {
                return false;
            }

            cache.set(o1, true);

            if (o1 instanceof Date && o2 instanceof Date) {
                return (
                    !isNaN(o1 as any) &&
                    !isNaN(o2 as any) &&
                    o1.getTime() === o2.getTime()
                );
            }

            const keys1 = Object.keys(o1);
            const keys2 = Object.keys(o2);
            if (keys1.length != keys2.length) return false;

            keys1.sort();
            keys2.sort();
            for (let i = 0; i < keys1.length; i++) {
                if (keys1[i] !== keys2[i]) {
                    return false;
                }

                const v1 = o1[keys1[i]];
                const v2 = o2[keys1[i]];
                if (!compare(v1, v2)) return false;
            }
            return true;
        }

        return false;
    };

    return compare(p1, p2);
};

export default deepEqual;
