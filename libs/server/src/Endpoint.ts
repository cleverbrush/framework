import type {
    InferType,
    ObjectSchemaBuilder,
    ParseStringSchemaBuilder,
    PropertyDescriptorTree,
    SchemaBuilder
} from '@cleverbrush/schema';
import type {
    ActionResult,
    ContentResult,
    FileResult,
    JsonResult,
    NoContentResult,
    RedirectResult,
    StatusCodeResult,
    StreamResult
} from './ActionResult.js';
import type { RequestContext } from './RequestContext.js';
import {
    createSubscription,
    isSubscriptionBuilder,
    type SubscriptionBuilder,
    type SubscriptionHandlerEntry
} from './Subscription.js';
import type { Middleware } from './types.js';

// ---------------------------------------------------------------------------
// Simplify — flattens intersection types for clean IDE tooltips
// ---------------------------------------------------------------------------

type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ---------------------------------------------------------------------------
// ActionContext — assembles the typed argument for a handler
// ---------------------------------------------------------------------------

type HasKeys<T> = keyof T extends never ? false : true;

type ActionContextParts<TParams, TBody, TQuery, THeaders, TPrincipal> = {
    context: RequestContext;
} & (HasKeys<TParams> extends true ? { params: TParams } : {}) &
    (TBody extends undefined
        ? {}
        : {
              body: TBody extends SchemaBuilder<any, any, any, any, any>
                  ? InferType<TBody>
                  : TBody;
          }) &
    (HasKeys<TQuery> extends true ? { query: TQuery } : {}) &
    (HasKeys<THeaders> extends true ? { headers: THeaders } : {}) &
    (TPrincipal extends undefined ? {} : { principal: TPrincipal });

/**
 * The fully-typed argument object passed to endpoint handlers.
 *
 * The shape is inferred from the `EndpointBuilder` chain — only the keys
 * actually configured (body, query, headers, params, principal) are present.
 */
export type ActionContext<E> =
    E extends EndpointBuilder<
        infer TParams,
        infer TBody,
        infer TQuery,
        infer THeaders,
        any,
        infer TPrincipal,
        any,
        any,
        any
    >
        ? Simplify<
              ActionContextParts<TParams, TBody, TQuery, THeaders, TPrincipal>
          >
        : never;

// ---------------------------------------------------------------------------
// InferServices — maps { name: SchemaBuilder } to { name: InferType<Schema> }
// ---------------------------------------------------------------------------

type InferServices<T> = {
    [K in keyof T]: T[K] extends SchemaBuilder<any, any, any, any, any>
        ? InferType<T[K]>
        : never;
};

/**
 * Extracts the injected service schemas map from an `EndpointBuilder` type.
 * Used internally by the `Handler` type to derive the `services` argument.
 */
export type ServiceSchemas<E> =
    E extends EndpointBuilder<
        any,
        any,
        any,
        any,
        infer TServices,
        any,
        any,
        any,
        any
    >
        ? TServices
        : {};

type ResponseType<E> =
    E extends EndpointBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer TResponse,
        any
    >
        ? TResponse extends SchemaBuilder<any, any, any, any, any>
            ? InferType<TResponse>
            : TResponse
        : any;

/**
 * Extracts the `TResponses` map from an `EndpointBuilder` type.
 * `TResponses` is a `Record<number, BodyType>` inferred from `.responses()`.
 */
export type ResponsesOf<E> =
    E extends EndpointBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer TResponses
    >
        ? TResponses
        : never;

type HasResponses<E> = keyof ResponsesOf<E> extends never ? false : true;

/**
 * The union of permitted return values for a handler whose endpoint
 * declared `.responses()`. Each member corresponds to one declared code:
 *
 * - `null` schema (e.g. 204) → `NoContentResult` for 204, `StatusCodeResult<K>` otherwise
 * - Non-null schema for code 200 → also allows a plain object (treated as 200 by the server)
 * - Non-null schema for other codes → `JsonResult<K, Body>`
 *
 * `FileResult`, `StreamResult`, `ContentResult`, and `RedirectResult` are always
 * permitted as an escape hatch for non-JSON responses.
 */
export type AllowedResponseReturn<TResponses extends Record<number, any>> =
    | {
          [K in keyof TResponses & number]: TResponses[K] extends null
              ? K extends 204
                  ? NoContentResult
                  : StatusCodeResult<K>
              : JsonResult<K, TResponses[K]>;
      }[keyof TResponses & number]
    | (200 extends keyof TResponses
          ? TResponses[200] extends null
              ? never
              : TResponses[200]
          : never)
    | FileResult
    | StreamResult
    | ContentResult
    | RedirectResult;

// ---------------------------------------------------------------------------
// Handler — the action function type, inferred from an endpoint
// ---------------------------------------------------------------------------

/**
 * The handler function type inferred from an `EndpointBuilder`.
 *
 * When the endpoint has injected services, the handler receives a second
 * `services` argument with all resolved service instances.
 */
type HandlerReturn<E> =
    HasResponses<E> extends true
        ? AllowedResponseReturn<ResponsesOf<E>>
        : ResponseType<E> | ActionResult;

export type Handler<E> =
    HasKeys<ServiceSchemas<E>> extends true
        ? (
              arg: ActionContext<E>,
              services: Simplify<InferServices<ServiceSchemas<E>>>
          ) => HandlerReturn<E> | Promise<HandlerReturn<E>>
        : (
              arg: ActionContext<E>
          ) => HandlerReturn<E> | Promise<HandlerReturn<E>>;

// ---------------------------------------------------------------------------
// Handler mapping — compile-time complete endpoint → handler binding
// ---------------------------------------------------------------------------

type AnyEndpoint = EndpointBuilder<any, any, any, any, any, any, any, any, any>;
type AnySubscriptionBuilder = SubscriptionBuilder<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;

/**
 * A single handler entry in a {@link HandlerMap}.
 *
 * Either a bare handler function or an object with a `handler` function and
 * optional per-endpoint `middlewares`.
 */
export type HandlerEntry<E> =
    | Handler<E>
    | { handler: Handler<E>; middlewares?: Middleware[] };

/**
 * A compile-time complete mapping from an endpoint group structure to
 * handler entries. Every endpoint key in every group must have a
 * corresponding {@link HandlerEntry} — omitting one is a type error.
 *
 * Subscription endpoints (created via `endpoint.subscription()`) are
 * mapped to {@link SubscriptionHandlerEntry} instead of {@link HandlerEntry}.
 *
 * @typeParam TEndpoints - A record of groups, each a record of endpoint
 *   builders. Typically the return type of `defineApi()` with server-side
 *   extensions applied.
 */
export type HandlerMap<TEndpoints> = {
    [G in keyof TEndpoints]: {
        [E in keyof TEndpoints[G]]: TEndpoints[G][E] extends AnySubscriptionBuilder
            ? SubscriptionHandlerEntry<TEndpoints[G][E]>
            : TEndpoints[G][E] extends AnyEndpoint
              ? HandlerEntry<TEndpoints[G][E]>
              : never;
    };
};

/**
 * The opaque result of {@link mapHandlers}. Passed to
 * `ServerBuilder.handleAll()` to register every endpoint at once.
 */
export interface HandlerMapping {
    /** @internal */
    readonly _entries: ReadonlyArray<{
        endpoint: AnyEndpoint;
        handler: (...args: any[]) => any;
        middlewares?: Middleware[];
    }>;
    /** @internal */
    readonly _subscriptions: ReadonlyArray<{
        endpoint: AnySubscriptionBuilder;
        handler: (...args: any[]) => any;
        middlewares?: Middleware[];
    }>;
}

/**
 * Binds a complete set of endpoint builders to their handlers with
 * compile-time exhaustiveness checking.
 *
 * TypeScript will report an error if any endpoint in `endpoints` is
 * missing from `handlers`, or if a handler's signature does not match
 * its endpoint. This is analogous to how `@cleverbrush/mapper` tracks
 * unmapped properties at the type level.
 *
 * @param endpoints - A grouped object of extended endpoint builders
 *   (e.g. after `.authorize()` / `.inject()`).
 * @param handlers - A matching grouped object of handler functions or
 *   `{ handler, middlewares }` entries.
 * @returns A {@link HandlerMapping} to pass to `ServerBuilder.handleAll()`.
 *
 * @example
 * ```ts
 * const mapping = mapHandlers(endpoints, {
 *     auth: {
 *         register: registerHandler,
 *         login: loginHandler,
 *     },
 *     todos: {
 *         list: listTodosHandler,
 *         create: createTodoHandler,
 *         export: { handler: exportHandler, middlewares: [auditLog] },
 *     },
 * });
 *
 * server.handleAll(mapping);
 * ```
 */
export function mapHandlers<
    TEndpoints extends Record<
        string,
        Record<string, AnyEndpoint | AnySubscriptionBuilder>
    >
>(endpoints: TEndpoints, handlers: HandlerMap<TEndpoints>): HandlerMapping {
    const entries: HandlerMapping['_entries'][number][] = [];
    const subscriptions: HandlerMapping['_subscriptions'][number][] = [];

    for (const groupKey of Object.keys(endpoints)) {
        const group = endpoints[groupKey]!;
        const handlerGroup = (handlers as any)[groupKey];

        for (const endpointKey of Object.keys(group)) {
            const ep = group[endpointKey]!;
            const entry = handlerGroup[endpointKey];

            const handler = typeof entry === 'function' ? entry : entry.handler;
            const middlewares =
                typeof entry === 'function' ? undefined : entry.middlewares;

            if (isSubscriptionBuilder(ep)) {
                subscriptions.push({ endpoint: ep, handler, middlewares });
            } else {
                entries.push({
                    endpoint: ep as AnyEndpoint,
                    handler,
                    middlewares
                });
            }
        }
    }

    return { _entries: entries, _subscriptions: subscriptions };
}

// ---------------------------------------------------------------------------
// EndpointBuilder — immutable builder for endpoint definitions
// ---------------------------------------------------------------------------

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

/**
 * Lightweight recursive property reference tree for type-safe runtime
 * expression building in `.links()` and `.callbacks()`.
 *
 * At runtime the actual value is a `PropertyDescriptorTree` from
 * `ObjectSchemaBuilder.getPropertiesFor()`, which provides `toJsonPointer()`
 * and the `SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR` marker used by the OpenAPI
 * generator to resolve path expressions automatically.
 */
export type PropertyRefTree<T> = {
    readonly [K in keyof T]-?: PropertyRefTree<T[K]>;
};

/**
 * A link from a response to a follow-up operation.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#link-object
 */
export interface LinkDefinition<TResponse = any> {
    /** `operationId` of the target operation. */
    readonly operationId: string;
    /**
     * Map of target parameter names to values.
     *
     * - `Record<string, string>` — raw OpenAPI runtime expressions such as
     *   `'$response.body#/id'`.
     * - Callback `(response: PropertyRefTree<TResponse>) => Record<string, unknown>` —
     *   type-safe selector; properties accessed on `response` are converted to
     *   `$response.body#/<pointer>` expressions automatically.
     */
    readonly parameters?:
        | Record<string, string>
        | ((
              response: TResponse extends ObjectSchemaBuilder<
                  any,
                  any,
                  any,
                  any,
                  any
              >
                  ? PropertyDescriptorTree<TResponse, TResponse>
                  : PropertyRefTree<any>
          ) => Record<string, unknown>);
    /** Human-readable description of the link relationship. */
    readonly description?: string;
    /** Runtime expression or literal for the linked operation's request body. */
    readonly requestBody?: string;
}

/**
 * A callback declaration for async request/response patterns.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#callback-object
 */
export interface CallbackDefinition<TBody = any> {
    /**
     * Raw OpenAPI runtime expression for the callback URL,
     * e.g. `'{$request.body#/callbackUrl}'`.
     * Mutually exclusive with `urlFrom`.
     */
    readonly expression?: string;
    /**
     * Type-safe selector for the request body field holding the callback URL.
     * The generator converts the selected property to a
     * `'{$request.body#/<pointer>}'` expression automatically.
     * Mutually exclusive with `expression`.
     */
    readonly urlFrom?: (
        body: TBody extends ObjectSchemaBuilder<any, any, any, any, any>
            ? PropertyDescriptorTree<TBody, TBody>
            : PropertyRefTree<any>
    ) => unknown;
    /** HTTP method for the callback request (default: `'POST'`). */
    readonly method?: string;
    /** Short summary of the callback operation. */
    readonly summary?: string;
    /** Detailed description of the callback operation. */
    readonly description?: string;
    /** Request body schema for the callback payload. */
    readonly body?: SchemaBuilder<any, any, any, any, any>;
    /** Response schema expected from the callback consumer. */
    readonly response?: SchemaBuilder<any, any, any, any, any>;
}

/**
 * Snapshot of all configuration set on an `EndpointBuilder`.
 * Used by the server for routing and by `@cleverbrush/server-openapi` for
 * spec generation.
 */
export interface EndpointMetadata {
    readonly method: string;
    readonly basePath: string;
    readonly pathTemplate: RoutePath;
    readonly bodySchema: SchemaBuilder<any, any, any, any, any> | null;
    readonly querySchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    readonly headerSchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    readonly serviceSchemas: Record<
        string,
        SchemaBuilder<any, any, any, any, any>
    > | null;
    /**
     * Authorization roles required for this endpoint.
     * - `null` → no authorization required (public)
     * - `[]` → any authenticated user
     * - `['admin', ...]` → user must have at least one of these roles
     */
    readonly authRoles: readonly string[] | null;
    readonly summary: string | null;
    readonly description: string | null;
    readonly tags: readonly string[];
    readonly operationId: string | null;
    readonly deprecated: boolean;
    readonly responseSchema: SchemaBuilder<any, any, any, any, any> | null;
    /**
     * Per-status-code response schemas declared via `.responses()`.
     * When non-null, takes precedence over `responseSchema` for OpenAPI generation
     * and constrains the handler return type to the declared codes.
     * A `null` schema value means the response has no body (e.g. 204).
     */
    readonly responsesSchemas: Record<
        number,
        SchemaBuilder<any, any, any, any, any> | null
    > | null;
    /**
     * A single example value for the request body, emitted as `example` on the
     * OpenAPI Media Type Object.
     */
    readonly example: unknown | null;
    /**
     * A map of named examples for the request body, emitted as `examples` on the
     * OpenAPI Media Type Object. Each entry follows the OpenAPI Example Object shape.
     */
    readonly examples: Record<
        string,
        { summary?: string; description?: string; value: unknown }
    > | null;
    /**
     * When set, the endpoint produces a binary file response instead of JSON.
     * The OpenAPI spec will emit the appropriate binary content type.
     */
    readonly producesFile: {
        contentType?: string;
        description?: string;
    } | null;
    /**
     * Multiple response content types for content-negotiated endpoints.
     * Keys are MIME types; an optional `schema` overrides the default response
     * schema for that content type. When set alongside `.producesFile()`,
     * `producesFile` takes precedence.
     */
    readonly produces: Record<
        string,
        { schema?: SchemaBuilder<any, any, any, any, any> }
    > | null;
    /**
     * Schema describing response headers emitted on every response code.
     * Each property in the object schema becomes a header name with its
     * sub-schema and optional description.
     */
    readonly responseHeaderSchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    /**
     * External documentation URL for this operation, emitted as `externalDocs`
     * on the OpenAPI Operation Object.
     */
    readonly externalDocs: { url: string; description?: string } | null;
    /**
     * Response links declared via `.links()`, emitted under the primary
     * success response's `links` map in the OpenAPI spec.
     */
    readonly links: Record<string, LinkDefinition> | null;
    /**
     * Callbacks declared via `.callbacks()`, emitted as `callbacks` on the
     * OpenAPI Operation Object.
     */
    readonly callbacks: Record<string, CallbackDefinition> | null;
}

/**
 * Immutable, fluent builder for HTTP endpoint definitions.
 *
 * All methods return a new builder instance — the original is never mutated.
 * Use the {@link endpoint} singleton (or {@link createEndpoints}) to obtain
 * the first builder in the chain.
 *
 * @example
 * ```ts
 * const GetUser = endpoint
 *     .get('/api/users')
 *     .query(object({ id: number().coerce() }))
 *     .authorize(UserPrincipal, 'admin')
 *     .returns(UserSchema)
 *     .summary('Get a user by ID');
 * ```
 */
/**
 * Infers the per-code body type map from a `.responses()` schema map.
 * Each schema maps to its `InferType`; a `null` schema maps to `null`
 * (meaning the response has no body).
 */
type InferResponsesMap<
    T extends Record<number, SchemaBuilder<any, any, any, any, any> | null>
> = {
    [K in keyof T]: T[K] extends SchemaBuilder<any, any, any, any, any>
        ? InferType<T[K]>
        : null;
};

export class EndpointBuilder<
    TParams = {},
    TBody = undefined,
    TQuery = {},
    THeaders = {},
    TServices = {},
    TPrincipal = undefined,
    TRoles extends string = string,
    TResponse = any,
    TResponses extends Record<number, any> = {}
> {
    readonly #method: string;
    readonly #basePath: string;
    readonly #pathTemplate: RoutePath;
    readonly #bodySchema: SchemaBuilder<any, any, any, any, any> | null;
    readonly #querySchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    readonly #headerSchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    readonly #serviceSchemas: Record<
        string,
        SchemaBuilder<any, any, any, any, any>
    > | null;
    readonly #authRoles: readonly string[] | null;
    readonly #summary: string | null;
    readonly #description: string | null;
    readonly #tags: readonly string[];
    readonly #operationId: string | null;
    readonly #deprecated: boolean;
    readonly #responseSchema: SchemaBuilder<any, any, any, any, any> | null;
    readonly #responsesSchemas: Record<
        number,
        SchemaBuilder<any, any, any, any, any> | null
    > | null;
    readonly #example: unknown | null;
    readonly #examples: Record<
        string,
        { summary?: string; description?: string; value: unknown }
    > | null;
    readonly #producesFile: {
        contentType?: string;
        description?: string;
    } | null;
    readonly #produces: Record<
        string,
        { schema?: SchemaBuilder<any, any, any, any, any> }
    > | null;
    readonly #responseHeaderSchema: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
    readonly #externalDocs: { url: string; description?: string } | null;
    readonly #links: Record<string, LinkDefinition> | null;
    readonly #callbacks: Record<string, CallbackDefinition> | null;

    constructor(
        method: string,
        basePath: string,
        pathTemplate: RoutePath,
        bodySchema: SchemaBuilder<any, any, any, any, any> | null,
        querySchema: ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > | null,
        headerSchema: ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > | null,
        serviceSchemas: Record<
            string,
            SchemaBuilder<any, any, any, any, any>
        > | null = null,
        authRoles: readonly string[] | null = null,
        summary: string | null = null,
        description: string | null = null,
        tags: readonly string[] = [],
        operationId: string | null = null,
        deprecated: boolean = false,
        responseSchema: SchemaBuilder<any, any, any, any, any> | null = null,
        responsesSchemas: Record<
            number,
            SchemaBuilder<any, any, any, any, any> | null
        > | null = null,
        example: unknown | null = null,
        examples: Record<
            string,
            { summary?: string; description?: string; value: unknown }
        > | null = null,
        producesFile: {
            contentType?: string;
            description?: string;
        } | null = null,
        produces: Record<
            string,
            { schema?: SchemaBuilder<any, any, any, any, any> }
        > | null = null,
        responseHeaderSchema: ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > | null = null,
        externalDocs: { url: string; description?: string } | null = null,
        links: Record<string, LinkDefinition> | null = null,
        callbacks: Record<string, CallbackDefinition> | null = null
    ) {
        this.#method = method;
        this.#basePath = basePath;
        this.#pathTemplate = pathTemplate;
        this.#bodySchema = bodySchema;
        this.#querySchema = querySchema;
        this.#headerSchema = headerSchema;
        this.#serviceSchemas = serviceSchemas;
        this.#authRoles = authRoles;
        this.#summary = summary;
        this.#description = description;
        this.#tags = tags;
        this.#operationId = operationId;
        this.#deprecated = deprecated;
        this.#responseSchema = responseSchema;
        this.#responsesSchemas = responsesSchemas;
        this.#example = example;
        this.#examples = examples;
        this.#producesFile = producesFile;
        this.#produces = produces;
        this.#responseHeaderSchema = responseHeaderSchema;
        this.#externalDocs = externalDocs;
        this.#links = links;
        this.#callbacks = callbacks;
    }

    /** Define the request body schema. Validation failures return 422 Problem Details. */
    body<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        TSchema,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            schema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Define the query string schema (must be an object schema). Validation failures return 422. */
    query<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        TBody,
        InferType<TSchema>,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            schema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Define an expected request headers schema (must be an object schema). */
    headers<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        InferType<TSchema>,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            schema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Declare DI services to be resolved per-request and passed as the second handler argument. */
    inject<
        TSchemas extends Record<string, SchemaBuilder<any, any, any, any, any>>
    >(
        schemas: TSchemas
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TSchemas,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            schemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Mark this endpoint as requiring authorization.
     *
     * Overloads:
     * - `authorize(principalSchema, ...roles)` — typed principal, optional role requirements
     * - `authorize(...roles)` — untyped principal (`unknown`), optional role requirements
     *
     * If no roles are specified, any authenticated user is allowed.
     */
    authorize<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        principalSchema: TSchema,
        ...roles: TRoles[]
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        InferType<TSchema>,
        TRoles,
        TResponse,
        TResponses
    >;
    authorize(
        ...roles: TRoles[]
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        unknown,
        TRoles,
        TResponse,
        TResponses
    >;
    authorize(
        ...args: unknown[]
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        any,
        TRoles,
        TResponse,
        TResponses
    > {
        let roles: string[];
        if (
            args.length > 0 &&
            typeof args[0] === 'object' &&
            args[0] !== null &&
            'introspect' in args[0]
        ) {
            // First argument is a schema — remaining are roles
            roles = args.slice(1) as string[];
        } else {
            roles = args as string[];
        }

        // Merge with inherited auth roles
        const merged = this.#authRoles ? [...this.#authRoles, ...roles] : roles;

        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            merged,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Declare the response type for OpenAPI spec generation.
     *
     * Overloads:
     * - `returns<T>()` — generic type only, no runtime schema
     * - `returns(schema)` — provides a schema for spec generation and type inference
     */
    returns<T>(): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        T,
        TResponses
    >;
    returns<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TSchema,
        TResponses
    >;
    returns(
        _schema?: unknown
    ): EndpointBuilder<any, any, any, any, any, any, any, any, any> {
        const schema =
            _schema != null &&
            typeof _schema === 'object' &&
            'introspect' in _schema
                ? (_schema as SchemaBuilder<any, any, any, any, any>)
                : null;
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            schema ?? this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Declare per-status-code response schemas for OpenAPI generation and
     * handler return-type enforcement.
     *
     * Pass `null` as the schema for body-less codes (e.g. 204).
     *
     * @example
     * ```ts
     * const ep = endpoint
     *     .get('/api/todos/:id')
     *     .responses({
     *         200: object({ id: number(), title: string() }),
     *         404: object({ message: string() }),
     *     });
     *
     * const handler: Handler<typeof ep> = ({ params }) => {
     *     const todo = todos.get(params.id);
     *     if (!todo) return ActionResult.notFound({ message: 'Not found' });
     *     return todo; // plain object → 200
     * };
     * ```
     */
    responses<
        const T extends Record<
            number,
            SchemaBuilder<any, any, any, any, any> | null
        >
    >(
        map: T
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        InferResponsesMap<T>
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            map,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Short, human-readable summary for OpenAPI operation objects. */
    summary(
        text: string
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            text,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Longer description for OpenAPI operation objects. Supports Markdown. */
    description(
        text: string
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            text,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** OpenAPI tags grouping this operation in generated documentation. */
    tags(
        ...tags: string[]
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** A unique, stable identifier for this operation in OpenAPI spec. */
    operationId(
        id: string
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            id,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /** Mark this endpoint as deprecated in OpenAPI spec output. */
    deprecated(): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            true,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Provide a single example value for the request body.
     *
     * Emitted as the `example` field on the OpenAPI Media Type Object
     * (`application/json`). Pre-fills the "Try it out" panel in Swagger UI.
     *
     * @param value - An example request body value.
     */
    example(
        value: TBody
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            value,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Provide named examples for the request body.
     *
     * Each entry is emitted under the `examples` map of the OpenAPI Media Type
     * Object following the Example Object shape (`{ summary?, description?, value }`).
     *
     * @param map - A record of named examples.
     */
    examples(
        map: Record<
            string,
            { summary?: string; description?: string; value: TBody }
        >
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            map,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Declare that this endpoint produces a binary file response.
     *
     * When set, the OpenAPI spec emits a binary content type instead of a JSON
     * schema for the success response. Takes precedence over `.returns()`.
     *
     * @param contentType - MIME type (default: `'application/octet-stream'`).
     * @param description - Optional response description for the spec.
     */
    producesFile(
        contentType?: string,
        description?: string
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            { contentType, description },
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * The full path for this endpoint, combining `basePath` and `pathTemplate`.
     *
     * For static routes this is the exact URL path (e.g. `"/todos"`).
     * For dynamic routes the template placeholders are included
     * (e.g. `"/todos/:id"`).
     */
    get path(): string {
        const base = this.#basePath;
        const tpl = this.#pathTemplate;
        let suffix: string;
        if (typeof tpl === 'string') {
            suffix = tpl;
        } else {
            const { literals, segments } = tpl.introspect().templateDefinition;
            let s = '';
            for (let i = 0; i < segments.length; i++) {
                s += literals[i] + `:${segments[i].path}`;
            }
            s += literals[segments.length] ?? '';
            suffix = s;
        }
        if (suffix === '/') return base || '/';
        return base + suffix;
    }

    /** Return an immutable snapshot of this builder's configuration as {@link EndpointMetadata}. */
    introspect(): EndpointMetadata {
        return {
            method: this.#method,
            basePath: this.#basePath,
            pathTemplate: this.#pathTemplate,
            bodySchema: this.#bodySchema,
            querySchema: this.#querySchema,
            headerSchema: this.#headerSchema,
            serviceSchemas: this.#serviceSchemas,
            authRoles: this.#authRoles,
            summary: this.#summary,
            description: this.#description,
            tags: this.#tags,
            operationId: this.#operationId,
            deprecated: this.#deprecated,
            responseSchema: this.#responseSchema,
            responsesSchemas: this.#responsesSchemas,
            example: this.#example,
            examples: this.#examples,
            producesFile: this.#producesFile,
            produces: this.#produces,
            responseHeaderSchema: this.#responseHeaderSchema,
            externalDocs: this.#externalDocs,
            links: this.#links,
            callbacks: this.#callbacks
        };
    }

    /**
     * Declare that this endpoint can produce responses in multiple content types.
     *
     * Each key is a MIME type. Provide an optional `schema` to override the
     * default response schema for that type; otherwise the schema from
     * `.returns()` / `.responses()` is reused for every declared content type.
     *
     * When used alongside `.producesFile()`, the binary response takes precedence.
     *
     * @param contentTypes - Map of MIME type → optional schema override.
     *
     * @example
     * ```ts
     * endpoint.get('/api/items')
     *   .returns(object({ id: number(), name: string() }))
     *   .produces({
     *     'text/csv': {},
     *     'application/xml': { schema: string() }
     *   })
     * ```
     */
    produces(
        contentTypes: Record<
            string,
            { schema?: SchemaBuilder<any, any, any, any, any> }
        >
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            contentTypes,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Declare response headers emitted by this endpoint.
     *
     * The object schema's properties become header names in the OpenAPI spec;
     * each property's sub-schema and description are emitted in the `headers`
     * map on every response code.
     *
     * @param schema - Object schema whose properties describe the response headers.
     *
     * @example
     * ```ts
     * endpoint.get('/api/items')
     *   .responseHeaders(object({
     *     'X-Total-Count': number().describe('Total number of items'),
     *     'X-Page': number()
     *   }))
     * ```
     */
    responseHeaders<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            schema,
            this.#externalDocs,
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Link external documentation to this operation.
     *
     * Emitted as the `externalDocs` field on the OpenAPI Operation Object.
     *
     * @param url - The URL to the external documentation.
     * @param description - Optional short description of the external docs.
     */
    externalDocs(
        url: string,
        description?: string
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            { url, description },
            this.#links,
            this.#callbacks
        );
    }

    /**
     * Declare response links for OpenAPI spec generation.
     *
     * Links describe follow-up actions that can be taken based on the response,
     * emitted under the primary 2xx response's `links` map.
     *
     * @param defs - Record mapping link names to {@link LinkDefinition} objects.
     *
     * @example
     * ```ts
     * endpoint.get('/api/users/:id')
     *   .returns(UserSchema)
     *   .links({
     *     GetUser: {
     *       operationId: 'getUser',
     *       parameters: (r) => ({ id: r.id }),
     *     },
     *   })
     * ```
     */
    links(
        defs: Record<string, LinkDefinition<TResponse>>
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            defs as Record<string, LinkDefinition>,
            this.#callbacks
        );
    }

    /**
     * Declare callbacks for OpenAPI spec generation.
     *
     * Callbacks describe async out-of-band requests that may be sent to a URL
     * provided in the request body, emitted as the `callbacks` field on the
     * OpenAPI Operation Object.
     *
     * @param defs - Record mapping callback names to {@link CallbackDefinition} objects.
     *
     * @example
     * ```ts
     * endpoint.post('/api/subscriptions')
     *   .body(object({ callbackUrl: string() }))
     *   .callbacks({
     *     onEvent: {
     *       urlFrom: (b) => b.callbackUrl,
     *       method: 'POST',
     *       body: EventSchema,
     *     },
     *   })
     * ```
     */
    callbacks(
        defs: Record<string, CallbackDefinition<TBody>>
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TResponse,
        TResponses
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles,
            this.#summary,
            this.#description,
            this.#tags,
            this.#operationId,
            this.#deprecated,
            this.#responseSchema,
            this.#responsesSchemas,
            this.#example,
            this.#examples,
            this.#producesFile,
            this.#produces,
            this.#responseHeaderSchema,
            this.#externalDocs,
            this.#links,
            defs as Record<string, CallbackDefinition>
        );
    }
}

// ---------------------------------------------------------------------------
// endpoint factory — creates EndpointBuilder instances
// ---------------------------------------------------------------------------

/**
 * Optional OpenAPI metadata fields accepted by `createEndpoint` / `createEndpoints`.
 */
export type EndpointMetadataDescriptors = {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: string[];
    readonly operationId?: string;
    readonly deprecated?: boolean;
};

function createEndpoint<TParams>(
    method: string,
    basePath: string,
    pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>,
    authRoles?: readonly string[] | null,
    meta?: EndpointMetadataDescriptors
): EndpointBuilder<TParams extends undefined ? {} : TParams>;

function createEndpoint(
    method: string,
    basePath: string,
    pathTemplate?: RoutePath,
    authRoles?: readonly string[] | null,
    meta?: EndpointMetadataDescriptors
): EndpointBuilder<any> {
    return new EndpointBuilder(
        method,
        basePath,
        pathTemplate ?? '/',
        null,
        null,
        null,
        null,
        authRoles ?? null,
        meta?.summary ?? null,
        meta?.description ?? null,
        meta?.tags ?? [],
        meta?.operationId ?? null,
        meta?.deprecated ?? false,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
}

// ---------------------------------------------------------------------------
// ScopedEndpointFactory — resource-scoped endpoint creation
// ---------------------------------------------------------------------------

type ScopedEndpointFactoryMethods<
    TPrincipal,
    TRoles extends string = string
> = {
    get<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    post<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    put<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    patch<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    delete<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    head<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
    options<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        TPrincipal,
        TRoles,
        any,
        {}
    >;
};

export type ScopedEndpointFactory<TRoles extends string = string> =
    ScopedEndpointFactoryMethods<undefined, TRoles> & {
        /**
         * Returns a new resource factory where all endpoints inherit
         * the given authorization requirements.
         *
         * - `authorize(principalSchema, ...roles)` — typed principal
         * - `authorize(...roles)` — untyped principal
         */
        authorize<TSchema extends SchemaBuilder<any, any, any, any, any>>(
            principalSchema: TSchema,
            ...roles: TRoles[]
        ): ScopedEndpointFactoryMethods<InferType<TSchema>, TRoles>;
        authorize(
            ...roles: TRoles[]
        ): ScopedEndpointFactoryMethods<unknown, TRoles>;
    };

function createScopedFactoryMethods(
    basePath: string,
    authRoles: readonly string[] | null
): ScopedEndpointFactoryMethods<any> {
    return {
        get: (pathTemplate?) =>
            createEndpoint('GET', basePath, pathTemplate, authRoles),
        post: (pathTemplate?) =>
            createEndpoint('POST', basePath, pathTemplate, authRoles),
        put: (pathTemplate?) =>
            createEndpoint('PUT', basePath, pathTemplate, authRoles),
        patch: (pathTemplate?) =>
            createEndpoint('PATCH', basePath, pathTemplate, authRoles),
        delete: (pathTemplate?) =>
            createEndpoint('DELETE', basePath, pathTemplate, authRoles),
        head: (pathTemplate?) =>
            createEndpoint('HEAD', basePath, pathTemplate, authRoles),
        options: (pathTemplate?) =>
            createEndpoint('OPTIONS', basePath, pathTemplate, authRoles)
    };
}

function createScopedFactory(basePath: string): ScopedEndpointFactory {
    return {
        ...createScopedFactoryMethods(basePath, null),
        authorize(...args: unknown[]): ScopedEndpointFactoryMethods<any> {
            let roles: string[];
            if (
                args.length > 0 &&
                typeof args[0] === 'object' &&
                args[0] !== null &&
                'introspect' in args[0]
            ) {
                roles = args.slice(1) as string[];
            } else {
                roles = args as string[];
            }
            return createScopedFactoryMethods(basePath, roles);
        }
    };
}

// ---------------------------------------------------------------------------
// EndpointFactory — top-level endpoint creation
// ---------------------------------------------------------------------------

type EndpointFactory<TRoles extends string = string> = {
    get<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    post<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    put<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    patch<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    delete<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    head<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    options<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<
        TParams,
        undefined,
        {},
        {},
        {},
        undefined,
        TRoles,
        any,
        {}
    >;
    resource(basePath: string): ScopedEndpointFactory<TRoles>;
    subscription<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): SubscriptionBuilder<TParams, {}, {}, {}, undefined, TRoles>;
};

/**
 * Create a role-constrained endpoint factory. Roles are defined as a plain
 * `as const` object whose *values* become the string-literal union accepted
 * by `authorize()`.
 *
 * @example
 * ```ts
 * const Roles = { admin: 'admin', editor: 'editor' } as const;
 * const ep = createEndpoints(Roles);
 * ep.get('/api/admin').authorize(IPrincipal, 'admin'); // ✓
 * ep.get('/api/admin').authorize(IPrincipal, 'typo');  // ✗ type error
 * ```
 */
export function createEndpoints<const T extends Record<string, string>>(
    _roles: T
): EndpointFactory<T[keyof T]> {
    return endpoint as EndpointFactory<T[keyof T]>;
}

/**
 * The global endpoint factory singleton.
 *
 * Creates `EndpointBuilder` instances for each HTTP method. Use
 * {@link createEndpoints} to get a role-constrained version.
 *
 * @example
 * ```ts
 * import { endpoint } from '@cleverbrush/server';
 *
 * const GetUsers = endpoint.get('/api/users');
 * const CreateUser = endpoint.post('/api/users').body(CreateUserSchema);
 * ```
 */
export const endpoint: EndpointFactory = {
    get: (basePath, pathTemplate?) =>
        createEndpoint('GET', basePath, pathTemplate),
    post: (basePath, pathTemplate?) =>
        createEndpoint('POST', basePath, pathTemplate),
    put: (basePath, pathTemplate?) =>
        createEndpoint('PUT', basePath, pathTemplate),
    patch: (basePath, pathTemplate?) =>
        createEndpoint('PATCH', basePath, pathTemplate),
    delete: (basePath, pathTemplate?) =>
        createEndpoint('DELETE', basePath, pathTemplate),
    head: (basePath, pathTemplate?) =>
        createEndpoint('HEAD', basePath, pathTemplate),
    options: (basePath, pathTemplate?) =>
        createEndpoint('OPTIONS', basePath, pathTemplate),
    resource: createScopedFactory,
    subscription: (basePath, pathTemplate?) =>
        createSubscription(basePath, pathTemplate)
};
