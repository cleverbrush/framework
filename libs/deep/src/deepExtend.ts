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

export const deepExtend = ((...rest) => {
    if (rest.length === 0) throw new Error('no arguments');
    if (typeof rest[0] !== 'object' || rest[0] === null)
        throw new Error('not a non-null object');
    if (rest.length === 1) return rest[0];

    const result = {};

    const extendObject = function (o1, o2) {
        const keys = Object.keys(o2);

        for (let i = 0; i < keys.length; i++) {
            if (
                !Reflect.has(o1, keys[i]) ||
                !(
                    typeof o1[keys[i]] === 'object' &&
                    o1[keys[i]] !== null &&
                    typeof o2[keys[i]] === 'object'
                )
            ) {
                o1[keys[i]] = o2[keys[i]];
            } else {
                if (o1[keys[i]] == null || o2[keys[i]] == null) {
                    o1[keys[i]] = o2[keys[i]];
                } else {
                    extendObject(o1[keys[i]], o2[keys[i]]);
                }
            }
        }
    };

    for (let i = 0; i < rest.length; i++) {
        if (typeof rest[i] === 'object' && rest[i] !== null && rest[i]) {
            extendObject(result, rest[i]);
        } else {
            throw new Error('not a non-null object');
        }
    }

    return result;
}) as <T extends unknown[]>(...args: T) => Merge<T>;
