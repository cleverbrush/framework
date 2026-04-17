/**
 * Type utilities for the `@cleverbrush/web` typed HTTP client.
 *
 * These types extract request argument shapes and response types from
 * `EndpointBuilder` instances defined via `@cleverbrush/server/contract`.
 *
 * @module
 */

import type { InferType, SchemaBuilder } from '@cleverbrush/schema';
import type {
    EndpointBuilder,
    ApiContract as ServerApiContract
} from '@cleverbrush/server/contract';
import type { WebError } from './errors.js';
import type { Middleware } from './middleware.js';

// ---------------------------------------------------------------------------
// Re-export contract types
// ---------------------------------------------------------------------------

/**
 * Re-export of the API contract type from `@cleverbrush/server/contract`.
 *
 * A record of named groups, each containing named `EndpointBuilder` instances.
 */
export type { ServerApiContract as ApiContract };

// ---------------------------------------------------------------------------
// Simplify — flattens intersection types for clean IDE tooltips
// ---------------------------------------------------------------------------

type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ---------------------------------------------------------------------------
// HasKeys — checks whether a type has any known keys
// ---------------------------------------------------------------------------

type HasKeys<T> = keyof T extends never ? false : true;

// ---------------------------------------------------------------------------
// EndpointCallArgs — request argument shape
// ---------------------------------------------------------------------------

type InferSchema<T> =
    T extends SchemaBuilder<any, any, any, any, any> ? InferType<T> : T;

/**
 * Assembles the parts of the request argument object conditionally.
 * Only keys that carry data are included.
 */
type CallArgsParts<TParams, TBody, TQuery, THeaders> =
    (HasKeys<TParams> extends true ? { params: TParams } : {}) &
        (TBody extends undefined ? {} : { body: InferSchema<TBody> }) &
        (HasKeys<TQuery> extends true ? { query: TQuery } : {}) &
        (HasKeys<THeaders> extends true ? { headers: THeaders } : {});

/**
 * Extracts the typed request argument shape from an `EndpointBuilder`.
 *
 * The resulting type includes only the keys that carry data:
 * - `params` — path parameters (when the endpoint uses `route()`)
 * - `body` — request body (when `.body()` was called)
 * - `query` — query string parameters (when `.query()` was called)
 * - `headers` — request headers (when `.headers()` was called)
 *
 * When no keys are required the type collapses to `void` so the call can
 * be made without arguments: `client.users.me()`.
 *
 * @typeParam E - An `EndpointBuilder` instance type.
 *
 * @example
 * ```ts
 * // Endpoint with body:
 * type Args = EndpointCallArgs<typeof CreateTodoEndpoint>;
 * //   ^? { body: { title: string; description?: string } }
 *
 * // Endpoint with path params:
 * type Args = EndpointCallArgs<typeof GetTodoEndpoint>;
 * //   ^? { params: { id: number } }
 *
 * // Endpoint with no required args:
 * type Args = EndpointCallArgs<typeof GetProfileEndpoint>;
 * //   ^? void
 * ```
 */
export type EndpointCallArgs<E> =
    E extends EndpointBuilder<
        infer TParams,
        infer TBody,
        infer TQuery,
        infer THeaders,
        any, // TServices
        any, // TPrincipal
        any, // TRoles
        any, // TResponse
        any // TResponses
    >
        ? HasKeys<
              Simplify<CallArgsParts<TParams, TBody, TQuery, THeaders>>
          > extends true
            ? Simplify<CallArgsParts<TParams, TBody, TQuery, THeaders>>
            : undefined
        : never;

// ---------------------------------------------------------------------------
// EndpointResponse — success response type
// ---------------------------------------------------------------------------

/**
 * Finds the first 2xx status code in a responses map and returns its body type.
 * A `null` body (used for 204 No Content) maps to `void`.
 */
type FirstSuccessResponse<TResponses extends Record<number, any>> =
    200 extends keyof TResponses
        ? TResponses[200] extends null
            ? undefined
            : TResponses[200]
        : 201 extends keyof TResponses
          ? TResponses[201] extends null
              ? undefined
              : TResponses[201]
          : 202 extends keyof TResponses
            ? TResponses[202] extends null
                ? undefined
                : TResponses[202]
            : 204 extends keyof TResponses
              ? undefined
              : unknown;

/**
 * Extracts the success response type from an `EndpointBuilder`.
 *
 * - When `.responses()` was used, returns the body type of the first
 *   declared 2xx status code (200 → 201 → 202 → 204).
 * - When `.returns(schema)` was used, returns the inferred schema type.
 * - A `null` response schema (e.g. for 204) maps to `void`.
 *
 * @typeParam E - An `EndpointBuilder` instance type.
 *
 * @example
 * ```ts
 * type Resp = EndpointResponse<typeof ListTodosEndpoint>;
 * //   ^? TodoResponse[]
 *
 * type Resp = EndpointResponse<typeof DeleteTodoEndpoint>;
 * //   ^? void
 * ```
 */
export type EndpointResponse<E> =
    E extends EndpointBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer TResponse,
        infer TResponses
    >
        ? HasKeys<TResponses> extends true
            ? FirstSuccessResponse<TResponses>
            : TResponse extends SchemaBuilder<any, any, any, any, any>
              ? InferType<TResponse>
              : TResponse
        : never;

// ---------------------------------------------------------------------------
// TypedClient — the client shape mirroring the API contract
// ---------------------------------------------------------------------------

/**
 * Per-call overrides that can be passed alongside endpoint arguments to
 * override middleware defaults for a single request.
 */
export interface PerCallOverrides {
    /**
     * Override retry middleware options for this call only.
     * Pass `{ limit: 0 }` to disable retries entirely.
     */
    retry?: {
        limit?: number;
        methods?: string[];
        statusCodes?: number[];
        backoffLimit?: number;
        jitter?: boolean;
        retryOnTimeout?: boolean;
    };
    /**
     * Override the timeout (in milliseconds) for this call only.
     */
    timeout?: number;
}

/**
 * The callable signature for a single endpoint on the typed client.
 *
 * When the endpoint requires arguments (path params, body, query, or
 * headers) the function takes a single argument object.  When no arguments
 * are needed the function can be called with no arguments.
 *
 * Every endpoint call also exposes a `.stream()` method that returns an
 * `AsyncIterable<string>` yielding newline-delimited chunks (e.g. NDJSON).
 * An optional `AbortSignal` can be passed to cancel an in-flight stream.
 */
export type EndpointCall<E> =
    EndpointCallArgs<E> extends undefined
        ? ((args?: PerCallOverrides) => Promise<EndpointResponse<E>>) & {
              stream: (options?: {
                  signal?: AbortSignal;
              }) => AsyncIterable<string>;
          }
        : ((
              args: EndpointCallArgs<E> & PerCallOverrides
          ) => Promise<EndpointResponse<E>>) & {
              stream: (
                  args: EndpointCallArgs<E> & { signal?: AbortSignal }
              ) => AsyncIterable<string>;
          };

/**
 * Maps an {@link ApiContract} to a fully typed client object.
 *
 * Each group becomes a namespace and each endpoint within that group
 * becomes a callable async function.
 *
 * @typeParam T - The exact API contract type (preserving endpoint builder generics).
 *
 * @example
 * ```ts
 * // Given:
 * const api = defineApi({
 *     todos: { list: ..., create: ..., delete: ... },
 *     auth:  { login: ... },
 * });
 *
 * type Client = TypedClient<typeof api>;
 * // {
 * //   todos: {
 * //     list:   (args: { query: ... }) => Promise<TodoResponse[]>,
 * //     create: (args: { body: ... }) => Promise<TodoResponse>,
 * //     delete: (args: { params: ... }) => Promise<void>,
 * //   },
 * //   auth: {
 * //     login: (args: { body: ... }) => Promise<{ token: string }>,
 * //   },
 * // }
 * ```
 */
export type TypedClient<T extends ServerApiContract> = {
    [G in keyof T]: {
        [E in keyof T[G]]: EndpointCall<T[G][E]>;
    };
};

// ---------------------------------------------------------------------------
// ClientHooks — lifecycle hook types
// ---------------------------------------------------------------------------

/**
 * Lifecycle hooks that are invoked at various stages of a request.
 *
 * All hook arrays are executed serially in order. Hooks can be synchronous
 * or asynchronous.
 */
export interface ClientHooks {
    /**
     * Called before every request is sent.
     * Can be used to log, modify headers, or add tracing information.
     *
     * @example
     * ```ts
     * hooks: {
     *     beforeRequest: [(req) => {
     *         req.init.headers = {
     *             ...req.init.headers as Record<string, string>,
     *             'X-Request-Id': crypto.randomUUID(),
     *         };
     *     }],
     * }
     * ```
     */
    beforeRequest?: ((request: {
        url: string;
        init: RequestInit;
    }) => void | Promise<void>)[];

    /**
     * Called after a successful response is received.
     * Returning a `Response` replaces the original response.
     *
     * @example
     * ```ts
     * hooks: {
     *     afterResponse: [(req, res) => {
     *         console.log(`${req.init.method} ${req.url} → ${res.status}`);
     *     }],
     * }
     * ```
     */
    afterResponse?: ((
        request: { url: string; init: RequestInit },
        response: Response
    ) => any | Response | Promise<any | Response>)[];

    /**
     * Called before a retry attempt.
     * Useful for logging retry attempts or modifying the request between retries.
     */
    beforeRetry?: ((info: {
        url: string;
        init: RequestInit;
        error: Error;
        retryCount: number;
    }) => void | Promise<void>)[];

    /**
     * Called before an error is thrown.
     * Can transform or enrich the error before it reaches the caller.
     * The returned error replaces the original.
     */
    beforeError?: ((error: WebError) => WebError | Promise<WebError>)[];
}

// ---------------------------------------------------------------------------
// ClientOptions
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link createClient}.
 */
export interface ClientOptions {
    /**
     * Base URL prepended to every request path.
     * Defaults to `''` (same origin).
     *
     * @example `'https://api.example.com'`
     */
    baseUrl?: string;

    /**
     * Returns the current authentication token, or `null` if unauthenticated.
     * When a non-null value is returned it is sent as a `Bearer` token in
     * the `Authorization` header.
     */
    getToken?: () => string | null;

    /**
     * Custom `fetch` implementation.
     * Defaults to the global `fetch`.  Useful for testing or server-side
     * rendering where a polyfill is needed.
     */
    fetch?: typeof globalThis.fetch;

    /**
     * Called when a `401 Unauthorized` response is received.
     * Typically used to clear stored tokens and redirect to a login page.
     */
    onUnauthorized?: () => void;

    /**
     * Additional headers sent with every request.
     */
    headers?: Record<string, string>;

    /**
     * Middleware functions that wrap the fetch call.
     * Applied in array order — the first middleware is the outermost wrapper.
     *
     * @example
     * ```ts
     * import { retry } from '@cleverbrush/web/retry';
     * import { timeout } from '@cleverbrush/web/timeout';
     *
     * const client = createClient(api, {
     *     middlewares: [retry(), timeout({ timeout: 10000 })],
     * });
     * ```
     */
    middlewares?: Middleware[];

    /**
     * Lifecycle hooks invoked at various stages of a request.
     *
     * @example
     * ```ts
     * const client = createClient(api, {
     *     hooks: {
     *         beforeRequest: [(req) => { console.log('→', req.url); }],
     *         afterResponse: [(req, res) => { console.log('←', res.status); }],
     *     },
     * });
     * ```
     */
    hooks?: ClientHooks;
}
