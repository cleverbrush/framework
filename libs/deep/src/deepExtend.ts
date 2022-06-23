export type CommonProps<T1, T2> = {
    [k in keyof T1 & keyof T2]: T1[k] extends never
        ? never
        : T2[k] extends never
        ? never
        : T2[k];
};

export type PropsInFirstOnly<T1, T2> = Omit<T1, keyof T2>;

export type MergeTwo<T1, T2> = PropsInFirstOnly<T1, T2> &
    PropsInFirstOnly<T2, T1> & {
        [k in keyof CommonProps<T1, T2>]: T1[k] extends Record<string, unknown>
            ? T2[k] extends Record<string, unknown>
                ? MergeTwo<T1[k], T2[k]>
                : T2[k]
            : T2[k];
    };

export type Merge<T extends unknown[]> = T['length'] extends 3
    ? MergeTwo<T[0], MergeTwo<T[1], T[2]>>
    : T['length'] extends 2
    ? MergeTwo<T[0], T[1]>
    : T['length'] extends 1
    ? T[0]
    : T extends [...infer K, infer PL, infer L]
    ? Merge<[Merge<[...K]>, MergeTwo<PL, L>]>
    : never;

const deepExtend: <T extends unknown[]>(...args: T) => Merge<T> = function () {
    if (arguments.length === 0) return false;
    if (arguments.length === 1) return arguments[0];
    if (typeof arguments[0] !== 'object') return false;

    const result = {};

    const extendObject = function (o1, o2) {
        if (o2 == null) return;
        const keys = Object.keys(o2);

        for (let i = 0; i < keys.length; i++) {
            if (o2.hasOwnProperty(keys[i])) {
                if (
                    !o1.hasOwnProperty(keys[i]) ||
                    !(
                        typeof o1[keys[i]] === 'object' &&
                        typeof o2[keys[i]] === 'object'
                    )
                ) {
                    o1[keys[i]] = o2[keys[i]];
                } else {
                    if (o1[keys[i]] == null) {
                        o1[keys[i]] = o2[keys[i]];
                    } else {
                        extendObject(o1[keys[i]], o2[keys[i]]);
                    }
                }
            }
        }
    };

    for (let i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] === 'object' && arguments[i]) {
            extendObject(result, arguments[i]);
        }
    }

    return result;
};
export default deepExtend;
