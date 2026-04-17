/**
 * Typed API client for the Todo application.
 *
 * Uses `createClient()` from `@cleverbrush/web` with the shared API
 * contract to provide a fully typed HTTP client.  All endpoint arguments
 * (params, body, query) and responses are inferred from the contract —
 * no manual type annotations needed.
 *
 * @example
 * ```ts
 * import { client } from './client';
 *
 * // Fully typed — body shape and response type inferred from contract
 * const todos = await client.todos.list({ query: { page: 1 } });
 * const todo  = await client.todos.get({ params: { id: 1 } });
 * ```
 */

import { createClient } from '@cleverbrush/web';
import { retry } from '@cleverbrush/web/retry';
import { timeout } from '@cleverbrush/web/timeout';
import { dedupe } from '@cleverbrush/web/dedupe';
import { throttlingCache } from '@cleverbrush/web/cache';
import { api } from '@cleverbrush/todo-backend/contract';
import { loadToken, setToken } from '../lib/http-client';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Typed API client backed by the shared todo-app contract.
 *
 * Groups: `auth`, `todos`, `users`, `webhooks`, `admin`, `demo`.
 *
 * Resilience middlewares are applied in order:
 * 1. **retry** — retries failed requests up to 2 times with exponential backoff
 * 2. **timeout** — aborts requests exceeding 10 seconds
 * 3. **dedupe** — coalesces identical in-flight GET requests
 * 4. **cache** — serves cached GET responses within a 2-second TTL
 */
export const client = createClient(api, {
    baseUrl: BASE_URL,
    getToken: () => loadToken(),
    onUnauthorized: () => {
        setToken(null);
        window.location.href = '/login';
    },
    middlewares: [
        retry({ limit: 2, retryOnTimeout: true }),
        timeout({ timeout: 10_000 }),
        dedupe(),
        throttlingCache({ throttle: 2000 })
    ]
});
