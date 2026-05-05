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
import { idempotency } from '@cleverbrush/client/idempotency';
import { cacheTags } from '@cleverbrush/client/cache';
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
 * 2. **idempotency** — adds X-Idempotency-Key to mutations for server deduplication
 * 3. **retry** — retries failed requests (preserves idempotency key across retries)
 * 4. **timeout** — aborts requests exceeding 10 seconds
 * 5. **dedupe** — coalesces identical in-flight GET requests
 * 6. **cacheTags** — tag-based caching and auto-invalidation
 * 7. **batching** — coalesces concurrent requests into a single `POST /__batch`
 * 8. **optimisticUpdate** — tags mutations and tracks network failures (innermost)
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
        idempotency(),
        retry({ limit: 2, retryOnTimeout: true }),
        timeout({ timeout: 10_000 }),
        dedupe(),
        cacheTags({
            defaultTtl: 5000
        }),
        batching({ maxSize: 10, windowMs: 10 }),
        optimisticUpdate()
    ] as any
});
