/**
 * Assert strict JSON without invoking getters or serialization hooks.
 * Shared references are allowed; cycles and lossy JavaScript values are not.
 */
export function assertJsonValue(value: unknown, allowDates = false): void {
    const ancestors = new Set<object>();
    const pending: { value: unknown; path: string; leave?: boolean }[] = [
        { value, path: '$' }
    ];
    while (pending.length) {
        const item = pending.pop()!;
        const current = item.value;
        if (
            allowDates &&
            current instanceof Date &&
            Number.isFinite(current.getTime())
        )
            continue;
        if (item.leave) {
            ancestors.delete(current as object);
            continue;
        }
        if (
            current === null ||
            typeof current === 'string' ||
            typeof current === 'boolean' ||
            (typeof current === 'number' && Number.isFinite(current))
        )
            continue;
        const invalid = (reason: string): never => {
            throw new TypeError(`${item.path}: ${reason}`);
        };
        if (typeof current !== 'object' || current === null)
            invalid('Expected a JSON value');
        const object = current as object;
        if (ancestors.has(object)) invalid('Cyclic JSON value');
        const array = Array.isArray(object);
        if (
            !array &&
            Object.getPrototypeOf(object) !== Object.prototype &&
            Object.getPrototypeOf(object) !== null
        )
            invalid('Expected a plain JSON object');
        ancestors.add(object);
        pending.push({ value: object, path: item.path, leave: true });
        const keys = Reflect.ownKeys(object);
        if (array && keys.length !== (object as unknown[]).length + 1)
            invalid('Sparse arrays or extra array properties are not JSON');
        for (const key of keys) {
            if (array && key === 'length') continue;
            const descriptor = Object.getOwnPropertyDescriptor(object, key)!;
            if (
                typeof key !== 'string' ||
                !descriptor.enumerable ||
                !('value' in descriptor)
            )
                invalid('Only enumerable string data properties are JSON');
            if (
                array &&
                (!/^(0|[1-9]\d*)$/.test(String(key)) ||
                    Number(key) >= (object as unknown[]).length)
            )
                invalid('Extra array properties are not JSON');
            pending.push({
                value: descriptor.value,
                path: `${item.path}[${JSON.stringify(key)}]`
            });
        }
    }
}
