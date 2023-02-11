const TRANSACTION_SYMBOL = Symbol('transaction');

const defaultNonTransactionalTypes = [Error, RegExp];

export type TransactionOptions = {
    /**
     * An optional callback returning boolean. Called for every
     * nested object's property (recursively) which is not
     * null `Object`. Using this function you can define if `child`
     * should be wrapped with transaction. It is useful for
     * some cases like Error, Map, etc. when you want to preserve a link,
     * instead of creation of the new transaction.
     * By default it's filtering all instances inheriting from Error and RegExp
     * If `true` is returned from this function `child` will not be wrapped with
     * nested transaction object.
     */
    shouldNotWrapWithTransaction?: (child: any) => boolean;
};

const defaultTransactionOptions: TransactionOptions = {
    shouldNotWrapWithTransaction: (child) =>
        !!defaultNonTransactionalTypes.find((t) => child instanceof t)
};

export type Transaction<T> = {
    /**
     * Transaction object you can modify (equals to `initial` right after the call).
     * All changes to `object` will not be reflected to `initial` until `commit`
     * is called.
     */
    object: T;
    /**
     * Commits transaction, all changes to `object` will be reflected to `initial`
     * after the call of this function.
     */
    commit: () => T;
    /**
     * Rollbacks transaction moving it to the initial state (`object` will be equal to `initial`
     * after the call of this function).
     */
    rollback: () => T;
    /**
     * Returns `true` if there are any changes to `object` which makes is different from `initial`
     */
    isDirty: () => boolean;
};

/**
 * Starts transaction over the `initial` object.
 */
export const transaction = <T extends {}>(
    initial: T,
    options?: TransactionOptions
): Transaction<T> => {
    let newProperties = {};
    let deletedProperties = new Map<keyof T, true>();

    options = Object.assign({}, defaultTransactionOptions, options || {});

    const { shouldNotWrapWithTransaction } =
        options as Required<TransactionOptions>;

    const isDirty = () =>
        !!Object.keys(newProperties).find((key) => {
            if (newProperties[key] && newProperties[key][TRANSACTION_SYMBOL]) {
                return newProperties[key][TRANSACTION_SYMBOL].isDirty();
            }
            return true;
        }) || ((deletedProperties.size > 0) as any);

    const commit = () => {
        Object.keys(newProperties).forEach((key) => {
            const value = newProperties[key];
            if (value[TRANSACTION_SYMBOL]) {
                const { commit: childCommit } = value[TRANSACTION_SYMBOL];
                initial[key] = childCommit();
            } else {
                initial[key] = newProperties[key];
            }
        });

        for (const key of deletedProperties.keys()) {
            delete initial[key];
        }

        newProperties = {};
        deletedProperties = new Map<keyof T, true>();

        return initial;
    };

    const rollback = () => {
        for (const key in newProperties) {
            const value = newProperties[key];
            if (
                value &&
                typeof value === 'object' &&
                value[TRANSACTION_SYMBOL]
            ) {
                // this is nested transaction, let's rollback it as well
                value[TRANSACTION_SYMBOL].rollback();
            }
        }
        newProperties = {};
        deletedProperties = new Map<keyof T, true>();
        return initial;
    };

    if (Array.isArray(initial)) {
        const result = initial.map((el) =>
            typeof el === 'object' && el && !shouldNotWrapWithTransaction(el)
                ? transaction(el).object
                : el
        );
        const commitArray = () =>
            result.map((el) =>
                el && typeof el[TRANSACTION_SYMBOL] === 'object'
                    ? el[TRANSACTION_SYMBOL].commit()
                    : el
            );

        const isDirtyArray = () => {
            return !!result.find((val, index) => {
                if (val && typeof val[TRANSACTION_SYMBOL] === 'object') {
                    return val[TRANSACTION_SYMBOL].isDirty();
                }
                return result[index] !== initial[index];
            });
        };
        Object.defineProperty(result, TRANSACTION_SYMBOL, {
            writable: false,
            configurable: false,
            value: {
                initial,
                object: result,
                commit: commitArray as any,
                rollback: () => initial,
                isDirty: isDirtyArray
            }
        });
        return {
            object: result as any,
            commit: commitArray as any,
            rollback: () => initial,
            isDirty: isDirtyArray
        };
    }

    const proxy = new Proxy<T>(initial, {
        set: (target, property, value) => {
            if (target && target[property] === value) {
                delete newProperties[property];
                return true;
            }
            newProperties[property] = value;
            deletedProperties.delete(property as any);
            return true;
        },
        ownKeys: (target) => {
            return [
                ...Object.keys(target).filter(
                    (k: any) => !deletedProperties.has(k)
                ),
                ...Object.keys(newProperties).filter((k: any) => !(k in target))
            ];
        },
        getOwnPropertyDescriptor: (target, prop: any) => {
            if (deletedProperties.has(prop)) {
                return undefined;
            }

            if (prop in newProperties) {
                return Object.getOwnPropertyDescriptor(newProperties, prop);
            }

            return Object.getOwnPropertyDescriptor(target, prop);
        },
        has: (target, prop: any) => {
            if (deletedProperties.has(prop)) {
                return false;
            }

            if (prop in newProperties) {
                return true;
            }

            return prop in target;
        },
        get: (target, prop) => {
            if (typeof prop === 'symbol') {
                if (prop === TRANSACTION_SYMBOL) {
                    return {
                        initial,
                        object: proxy,
                        commit,
                        rollback,
                        isDirty
                    };
                }
                return target[prop];
            }

            if (prop in newProperties) {
                return newProperties[prop];
            }

            if (deletedProperties.has(prop as any)) {
                return undefined;
            }

            if (
                typeof target[prop] === 'object' &&
                target[prop] &&
                !shouldNotWrapWithTransaction(target[prop])
            ) {
                const { object } = transaction(target[prop], options);
                newProperties[prop] = object;
                return object;
            }

            return target[prop];
        },
        deleteProperty: (target, p) => {
            if (p in newProperties) {
                if (
                    newProperties[p] &&
                    typeof newProperties[p][TRANSACTION_SYMBOL] === 'object'
                ) {
                    newProperties[p][TRANSACTION_SYMBOL].rollback();
                }
                delete newProperties[p];
            }
            if (p in target) {
                deletedProperties.set(p as any, true);
            }
            return true;
        }
    });

    return {
        object: proxy,
        commit,
        rollback,
        isDirty
    };
};
