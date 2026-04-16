/**
 * `@cleverbrush/web` — typed HTTP client for `@cleverbrush/server` API contracts.
 *
 * @example
 * ```ts
 * import { createClient } from '@cleverbrush/web';
 * import { api } from 'todo-shared';
 *
 * const client = createClient(api, {
 *     baseUrl: 'https://api.example.com',
 *     getToken: () => localStorage.getItem('token'),
 * });
 *
 * const todos = await client.todos.list();
 * ```
 *
 * @packageDocumentation
 */

export { createClient } from './client.js';
export { ApiError } from './errors.js';
export type {
    ApiContract,
    ClientOptions,
    EndpointCallArgs,
    EndpointResponse,
    TypedClient
} from './types.js';
