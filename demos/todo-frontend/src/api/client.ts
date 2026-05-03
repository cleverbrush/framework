/**
 * Unified typed API client for the Todo application.
 *
 * Uses `createClient()` from `@cleverbrush/client/react` with the shared
 * API contract to provide a client where every endpoint is both callable
 * (direct HTTP fetch) and exposes TanStack Query hooks.
 *
 * @example
 * ```ts
 * import { client } from './client';
 *
 * // Direct fetch
 * const todos = await client.todos.list({ query: { page: 1 } });
 *
 * // React Query hooks
 * const { data } = client.todos.list.useQuery();
 * ```
 */

import { createClient } from '@cleverbrush/client/react';
import { retry } from '@cleverbrush/client/retry';
import { timeout } from '@cleverbrush/client/timeout';
import { dedupe } from '@cleverbrush/client/dedupe';
import { throttlingCache } from '@cleverbrush/client/cache';
import { batching } from '@cleverbrush/client/batching';
import { optimisticUpdate } from '@cleverbrush/client/optimistic-update';
import { offlineQueue } from '@cleverbrush/client/offline-queue';
import { api } from '@cleverbrush/todo-backend/contract';
import { loadToken, setToken } from '../lib/http-client';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Typed API client backed by the shared todo-app contract.
 *
 * Groups: `auth`, `todos`, `users`, `webhooks`, `admin`, `demo`.
 *
 * Resilience middlewares are applied in order:
 * 1. **offlineQueue** — queues mutations when offline, replays on reconnect (outermost)
 * 2. **retry** — retries failed requests up to 2 times with exponential backoff
 * 3. **timeout** — aborts requests exceeding 10 seconds
 * 4. **dedupe** — coalesces identical in-flight GET requests
 * 5. **cache** — serves cached GET responses within a 2-second TTL
 * 6. **batching** — coalesces concurrent requests into a single `POST /__batch`
 * 7. **optimisticUpdate** — tags mutations and tracks network failures (innermost)
 */

export const offlineQueueStore = { queue: [], isOnline: true, isReplaying: false };

export const client = createClient(api, {
    baseUrl: BASE_URL,
    getToken: () => loadToken(),
    onUnauthorized: () => {
        const wasAuthenticated = !!loadToken();
        setToken(null);
        if (wasAuthenticated) {
            window.location.href = '/login';
        }
    },
    middlewares: [
        offlineQueue({ store: offlineQueueStore }),
        retry({ limit: 2, retryOnTimeout: true }),
        timeout({ timeout: 10_000 }),
        dedupe(),
        throttlingCache({
            throttle: 2000,
            invalidate: (_url, _init, meta) => {
                if (meta && meta.method !== 'GET') {
                    return `GET@${meta.collectionPath}`;
                }
                return null;
            }
        }),
        batching({ maxSize: 10, windowMs: 10 }),
        optimisticUpdate()
    ]
});
