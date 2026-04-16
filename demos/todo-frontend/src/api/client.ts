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
import { api } from '@cleverbrush/todo-backend/contract';
import { loadToken, setToken } from '../lib/http-client';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Typed API client backed by the shared todo-app contract.
 *
 * Groups: `auth`, `todos`, `users`, `webhooks`, `admin`.
 */
export const client = createClient(api, {
    baseUrl: BASE_URL,
    getToken: () => loadToken(),
    onUnauthorized: () => {
        setToken(null);
        window.location.href = '/login';
    }
});
