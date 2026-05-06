import { isNetworkError } from '../errors.js';
import type { Middleware } from '../middleware.js';

export const OPTIMISTIC_MUTATION_ID = Symbol('optimistic-mutation-id');

export interface OptimisticFailure {
    id: string;
    url: string;
    init: RequestInit;
    error: Error;
    timestamp: number;
}

export interface OptimisticUpdateStore {
    failures: OptimisticFailure[];
}

export interface OptimisticUpdateOptions {
    store?: OptimisticUpdateStore;
    skip?: (url: string, init: RequestInit) => boolean;
}

function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function optimisticUpdate(
    options: OptimisticUpdateOptions = {}
): Middleware {
    const { skip, store = { failures: [] } } = options;

    return next => async (url, init) => {
        const method = (init.method ?? 'GET').toUpperCase();
        if (method === 'GET') {
            return next(url, init);
        }
        if (skip?.(url, init)) {
            return next(url, init);
        }

        const mutationId = generateId();
        (init as any)[OPTIMISTIC_MUTATION_ID] = mutationId;

        try {
            return await next(url, init);
        } catch (err) {
            if (isNetworkError(err)) {
                store.failures.push({
                    id: mutationId,
                    url,
                    init: { ...init },
                    error: err instanceof Error ? err : new Error(String(err)),
                    timestamp: Date.now()
                });
            }
            throw err;
        }
    };
}
