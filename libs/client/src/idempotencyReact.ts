import { useEffect, useRef } from 'react';
import {
    createIdempotentOperation,
    type IdempotentOperationOptions
} from './IdempotentOperation.js';

/** Stable component-owned operation state, independent of any form or query library. */
export function useIdempotentOperation<TInput, TRequest, TResult>(
    options: IdempotentOperationOptions<TInput, TRequest, TResult>
) {
    const current = useRef(options);
    current.current = options;
    const operation = useRef<ReturnType<
        typeof createIdempotentOperation<TInput, TRequest, TResult>
    > | null>(null);
    if (!operation.current)
        operation.current = createIdempotentOperation({
            prepare: input => current.current.prepare(input),
            execute: request => current.current.execute(request),
            isSuccess: result => current.current.isSuccess?.(result) ?? true
        });
    const instance = operation.current;
    useEffect(() => () => instance.clear(), [instance]);
    return instance;
}
