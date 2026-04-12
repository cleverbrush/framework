import type {
    InferType,
    ObjectSchemaBuilder,
    ParseStringSchemaBuilder,
    SchemaBuilder
} from '@cleverbrush/schema';
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

export type ActionContext<E> =
    E extends EndpointBuilder<
        infer TParams,
        infer TBody,
        infer TQuery,
        infer THeaders,
        any,
        infer TPrincipal
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

export type ServiceSchemas<E> =
    E extends EndpointBuilder<any, any, any, any, infer TServices>
        ? TServices
        : {};

// ---------------------------------------------------------------------------
// Handler — the action function type, inferred from an endpoint
// ---------------------------------------------------------------------------

export type Handler<E> =
    HasKeys<ServiceSchemas<E>> extends true
        ? (
              arg: ActionContext<E>,
              services: Simplify<InferServices<ServiceSchemas<E>>>
          ) => any | Promise<any>
        : (arg: ActionContext<E>) => any | Promise<any>;

// ---------------------------------------------------------------------------
// EndpointBuilder — immutable builder for endpoint definitions
// ---------------------------------------------------------------------------

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

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
}

export class EndpointBuilder<
    TParams = {},
    TBody = undefined,
    TQuery = {},
    THeaders = {},
    TServices = {},
    TPrincipal = undefined
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
        authRoles: readonly string[] | null = null
    ) {
        this.#method = method;
        this.#basePath = basePath;
        this.#pathTemplate = pathTemplate;
        this.#bodySchema = bodySchema;
        this.#querySchema = querySchema;
        this.#headerSchema = headerSchema;
        this.#serviceSchemas = serviceSchemas;
        this.#authRoles = authRoles;
    }

    body<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): EndpointBuilder<
        TParams,
        InferType<TSchema>,
        TQuery,
        THeaders,
        TServices,
        TPrincipal
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            schema,
            this.#querySchema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles
        );
    }

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
        TPrincipal
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            schema,
            this.#headerSchema,
            this.#serviceSchemas,
            this.#authRoles
        );
    }

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
        TPrincipal
    > {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            schema,
            this.#serviceSchemas,
            this.#authRoles
        );
    }

    inject<
        TSchemas extends Record<string, SchemaBuilder<any, any, any, any, any>>
    >(
        schemas: TSchemas
    ): EndpointBuilder<TParams, TBody, TQuery, THeaders, TSchemas, TPrincipal> {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            this.#headerSchema,
            schemas,
            this.#authRoles
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
        ...roles: string[]
    ): EndpointBuilder<
        TParams,
        TBody,
        TQuery,
        THeaders,
        TServices,
        InferType<TSchema>
    >;
    authorize(
        ...roles: string[]
    ): EndpointBuilder<TParams, TBody, TQuery, THeaders, TServices, unknown>;
    authorize(
        ...args: unknown[]
    ): EndpointBuilder<TParams, TBody, TQuery, THeaders, TServices, any> {
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
            merged
        );
    }

    introspect(): EndpointMetadata {
        return {
            method: this.#method,
            basePath: this.#basePath,
            pathTemplate: this.#pathTemplate,
            bodySchema: this.#bodySchema,
            querySchema: this.#querySchema,
            headerSchema: this.#headerSchema,
            serviceSchemas: this.#serviceSchemas,
            authRoles: this.#authRoles
        };
    }
}

// ---------------------------------------------------------------------------
// endpoint factory — creates EndpointBuilder instances
// ---------------------------------------------------------------------------

function createEndpoint<TParams>(
    method: string,
    basePath: string,
    pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>,
    authRoles?: readonly string[] | null
): EndpointBuilder<TParams extends undefined ? {} : TParams>;

function createEndpoint(
    method: string,
    basePath: string,
    pathTemplate?: RoutePath,
    authRoles?: readonly string[] | null
): EndpointBuilder<any> {
    return new EndpointBuilder(
        method,
        basePath,
        pathTemplate ?? '/',
        null,
        null,
        null,
        null,
        authRoles ?? null
    );
}

// ---------------------------------------------------------------------------
// ScopedEndpointFactory — resource-scoped endpoint creation
// ---------------------------------------------------------------------------

type ScopedEndpointFactoryMethods<TPrincipal> = {
    get<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    post<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    put<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    patch<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    delete<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    head<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
    options<TParams = {}>(
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams, undefined, {}, {}, {}, TPrincipal>;
};

export type ScopedEndpointFactory = ScopedEndpointFactoryMethods<undefined> & {
    /**
     * Returns a new resource factory where all endpoints inherit
     * the given authorization requirements.
     *
     * - `authorize(principalSchema, ...roles)` — typed principal
     * - `authorize(...roles)` — untyped principal
     */
    authorize<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        principalSchema: TSchema,
        ...roles: string[]
    ): ScopedEndpointFactoryMethods<InferType<TSchema>>;
    authorize(...roles: string[]): ScopedEndpointFactoryMethods<unknown>;
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

type EndpointFactory = {
    get<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    post<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    put<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    patch<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    delete<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    head<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    options<TParams = {}>(
        basePath: string,
        pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
    ): EndpointBuilder<TParams>;
    resource(basePath: string): ScopedEndpointFactory;
};

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
