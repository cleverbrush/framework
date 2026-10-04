/** A snapshot of one logical mutation, suitable for a typed client or action bridge. */
export interface IdempotentRequest<T> {
    readonly value: T;
    readonly idempotencyKey: string;
}

/** Application-owned data preparation and transport; Framework owns attempt state. */
export interface IdempotentOperationOptions<TInput, TRequest, TResult> {
    /** Called once per changed input. Put generated defaults here. */
    prepare: (input: TInput) => TRequest;
    execute: (
        request: IdempotentRequest<TRequest>
    ) => TResult | Promise<TResult>;
    /** Defaults to success on resolution; use this for actions returning failure values. */
    isSuccess?: (result: TResult) => boolean;
}

/** JSON-compatible values and Dates are compared structurally, independent of object key order. */
function fingerprint(value: unknown): string {
    function canonical(input: unknown): unknown {
        if (input instanceof Date) return input.toISOString();
        if (Array.isArray(input)) return input.map(canonical);
        if (input && typeof input === 'object') {
            if (
                Object.getPrototypeOf(input) !== Object.prototype &&
                Object.getPrototypeOf(input) !== null
            )
                throw new TypeError(
                    'Idempotent operation input must contain JSON values or Dates'
                );
            return Object.fromEntries(
                Object.keys(input)
                    .sort()
                    .map(key => [
                        key,
                        canonical((input as Record<string, unknown>)[key])
                    ])
            );
        }
        if (
            typeof input === 'function' ||
            typeof input === 'symbol' ||
            typeof input === 'bigint' ||
            (typeof input === 'number' && !Number.isFinite(input))
        )
            throw new TypeError(
                'Idempotent operation input must contain JSON values or Dates'
            );
        return input;
    }
    return JSON.stringify(canonical(value)) ?? 'undefined';
}

/**
 * Active-session attempt state. Retries retain their key and prepared payload;
 * changed input and acknowledged success start a new logical operation. Use a
 * distinct operationId per draft, and clear state when its owning session ends.
 * Concurrent calls for the same operationId join the in-flight call.
 */
export function createIdempotentOperation<TInput, TRequest, TResult>(
    options: IdempotentOperationOptions<TInput, TRequest, TResult>
) {
    type Entry = {
        fingerprint: string;
        request: IdempotentRequest<TRequest>;
        pending?: Promise<TResult>;
    };
    const entries = new Map<string, Entry>();
    function prepare(
        input: TInput,
        operationId = 'default'
    ): IdempotentRequest<TRequest> {
        let entry = entries.get(operationId);
        if (!entry?.pending) {
            const identity = fingerprint(input);
            if (!entry || entry.fingerprint !== identity) {
                entry = {
                    fingerprint: identity,
                    request: {
                        value: structuredClone(
                            options.prepare(structuredClone(input))
                        ),
                        idempotencyKey: crypto.randomUUID()
                    }
                };
                entries.set(operationId, entry);
            }
        }
        return structuredClone(entry.request);
    }
    return {
        prepare,
        run(input: TInput, operationId = 'default'): Promise<TResult> {
            const active = entries.get(operationId);
            if (active?.pending) return active.pending;
            const request = prepare(input, operationId);
            const entry = entries.get(operationId)!;
            const pending = Promise.resolve()
                .then(() => options.execute(request))
                .then(result => {
                    if (
                        (options.isSuccess?.(result) ?? true) &&
                        entries.get(operationId) === entry
                    )
                        entries.delete(operationId);
                    return result;
                })
                .finally(() => {
                    if (entries.get(operationId) === entry)
                        entry.pending = undefined;
                });
            entry.pending = pending;
            return pending;
        },
        reset(operationId = 'default'): void {
            entries.delete(operationId);
        },
        clear(): void {
            entries.clear();
        }
    };
}

/** Carry attempt metadata through a FormData action without putting it in the domain body. */
export function withIdempotencyKey(formData: FormData, key: string): FormData {
    if (!key || key.length > 256)
        throw new TypeError('Invalid idempotency key');
    formData.set('idempotencyKey', key);
    return formData;
}

/** Read optional action metadata; missing keys preserve compatibility with older callers. */
export function readIdempotencyKey(formData: FormData): string | undefined {
    const key = formData.get('idempotencyKey');
    if (key === null) return undefined;
    if (typeof key !== 'string' || !key || key.length > 256)
        throw new TypeError('Invalid idempotency key');
    return key;
}
