import { isPlainObject } from './data.js';

/** Child selection and subtree filtering for sequential record traversal. */
export interface DeepForEachAsyncOptions<T extends object> {
    /** Traverse only this array-valued field; otherwise visit all own array fields. */
    optimizer?: keyof T & string;
    /** False skips a record and its descendants, without skipping later siblings. */
    validation?: (node: T) => boolean;
}

/**
 * Visit plain records sequentially, parent before children, awaiting each visitor.
 *
 * Arrays, including nested arrays, are containers; primitives and opaque objects
 * are ignored. Record children are selected from own array-valued properties.
 * A shared record is visited at each occurrence; cycles on the active traversal
 * path reject with TypeError. This helper does not copy or mutate input, though
 * the visitor may mutate its records. Visitor failures reject immediately.
 *
 * @param input A record or an arbitrarily nested array of records.
 * @param visitor Synchronous or asynchronous work for each accepted record.
 * @param context Optional visitor `this` value.
 * @param options Child-array selection and subtree filtering.
 */
export async function deepForEachAsync<
    T extends object = Record<string, unknown>,
    TContext = undefined
>(
    input: unknown,
    visitor: (this: TContext, node: T) => unknown,
    context?: TContext,
    options: DeepForEachAsyncOptions<T> = {}
): Promise<void> {
    const active = new Set<object>();
    async function visit(value: unknown): Promise<void> {
        const array = Array.isArray(value);
        if (!array && !isPlainObject(value)) return;
        const node = value as T;
        if (!array && options.validation && !options.validation(node)) return;
        if (active.has(value as object)) {
            throw new TypeError('Cannot traverse circular data.');
        }
        active.add(value as object);
        try {
            if (array) {
                for (const child of value as unknown[]) await visit(child);
                return;
            }
            await visitor.call(context as TContext, node);
            const keys =
                options.optimizer === undefined
                    ? Object.keys(node)
                    : [options.optimizer];
            for (const key of keys) {
                if (!Object.hasOwn(node, key)) continue;
                const child = (node as Record<string, unknown>)[key];
                if (Array.isArray(child)) await visit(child);
            }
        } finally {
            active.delete(value as object);
        }
    }
    await visit(input);
}
