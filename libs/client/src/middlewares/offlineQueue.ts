import type { FetchLike, Middleware } from '../middleware.js';

export interface QueuedRequest {
    id: string;
    url: string;
    init: RequestInit;
    timestamp: number;
    retryCount: number;
}

export interface OfflineQueueStore {
    queue: QueuedRequest[];
    isOnline: boolean;
    isReplaying: boolean;
}

export interface OfflineQueueOptions {
    store?: OfflineQueueStore;
    skip?: (url: string, init: RequestInit) => boolean;
    maxRetries?: number;
}

const MAX_FLUSH_RETRIES = 3;

interface Deferred {
    resolve: (value: Response | PromiseLike<Response>) => void;
    reject: (reason: unknown) => void;
}

function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

export function offlineQueue(options: OfflineQueueOptions = {}): Middleware {
    const {
        skip,
        store = { queue: [], isOnline: true, isReplaying: false },
        maxRetries = MAX_FLUSH_RETRIES
    } = options;

    const deferredMap = new Map<string, Deferred>();

    let nextRef: FetchLike | null = null;

    function flushQueue(): void {
        const next = nextRef;
        if (!next || store.queue.length === 0) return;

        store.isReplaying = true;
        const batch = store.queue.splice(0);

        Promise.all(
            batch.map(async item => {
                const deferred = deferredMap.get(item.id);
                deferredMap.delete(item.id);
                if (!deferred) return;

                try {
                    const init = { ...item.init };
                    delete (init as any).signal;
                    const response = await next(item.url, init);
                    deferred.resolve(response);
                } catch (err) {
                    if (item.retryCount < maxRetries) {
                        item.retryCount++;
                        store.queue.push(item);
                        deferredMap.set(item.id, deferred);
                    } else {
                        deferred.reject(err);
                    }
                }
            })
        ).finally(() => {
            store.isReplaying = false;
        });
    }

    store.isOnline = isBrowser() ? navigator.onLine : true;

    if (isBrowser()) {
        window.addEventListener('online', () => {
            store.isOnline = true;
            flushQueue();
        });
        window.addEventListener('offline', () => {
            store.isOnline = false;
        });
    }

    return next => {
        nextRef = next;

        return async (url, init) => {
            if (skip?.(url, init)) {
                return next(url, init);
            }

            const method = (init.method ?? 'GET').toUpperCase();
            if (method === 'GET') {
                return next(url, init);
            }

            if (!store.isOnline) {
                const id = generateId();
                const queued: QueuedRequest = {
                    id,
                    url,
                    init: { ...init },
                    timestamp: Date.now(),
                    retryCount: 0
                };
                store.queue.push(queued);

                return new Promise<Response>((resolve, reject) => {
                    deferredMap.set(id, { resolve, reject });
                });
            }

            return next(url, init);
        };
    };
}
