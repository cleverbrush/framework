import type {
    InferType,
    ObjectSchemaBuilder,
    ParseStringSchemaBuilder,
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
    (TBody extends undefined ? {} : { body: TBody }) &
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
        ? TResponse
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
// EndpointBuilder — immutable builder for endpoint definitions
// ---------------------------------------------------------------------------

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

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
        > | null = null
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
    }

    /** Define the request body schema. Validation failures return 422 Problem Details. */
    body<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        InferType<TSchema>,
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
        InferType<TSchema>,
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
            this.#responsesSchemas
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
            map
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
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
            this.#responsesSchemas
        );
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
            responsesSchemas: this.#responsesSchemas
        };
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
    resource: createScopedFactory
};
