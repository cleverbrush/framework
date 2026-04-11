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

type ActionContextParts<TParams, TBody, TQuery, THeaders> = {
    context: RequestContext;
} & (HasKeys<TParams> extends true ? { params: TParams } : {}) &
    (TBody extends undefined ? {} : { body: TBody }) &
    (HasKeys<TQuery> extends true ? { query: TQuery } : {}) &
    (HasKeys<THeaders> extends true ? { headers: THeaders } : {});

export type ActionContext<E> =
    E extends EndpointBuilder<
        infer TParams,
        infer TBody,
        infer TQuery,
        infer THeaders
    >
        ? Simplify<ActionContextParts<TParams, TBody, TQuery, THeaders>>
        : never;

// ---------------------------------------------------------------------------
// Handler — the action function type, inferred from an endpoint
// ---------------------------------------------------------------------------

export type Handler<E> = (arg: ActionContext<E>) => any | Promise<any>;

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
}

export class EndpointBuilder<
    TParams = {},
    TBody = undefined,
    TQuery = {},
    THeaders = {}
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
        > | null
    ) {
        this.#method = method;
        this.#basePath = basePath;
        this.#pathTemplate = pathTemplate;
        this.#bodySchema = bodySchema;
        this.#querySchema = querySchema;
        this.#headerSchema = headerSchema;
    }

    body<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): EndpointBuilder<TParams, InferType<TSchema>, TQuery, THeaders> {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            schema,
            this.#querySchema,
            this.#headerSchema
        );
    }

    query<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): EndpointBuilder<TParams, TBody, InferType<TSchema>, THeaders> {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            schema,
            this.#headerSchema
        );
    }

    headers<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): EndpointBuilder<TParams, TBody, TQuery, InferType<TSchema>> {
        return new EndpointBuilder(
            this.#method,
            this.#basePath,
            this.#pathTemplate,
            this.#bodySchema,
            this.#querySchema,
            schema
        );
    }

    introspect(): EndpointMetadata {
        return {
            method: this.#method,
            basePath: this.#basePath,
            pathTemplate: this.#pathTemplate,
            bodySchema: this.#bodySchema,
            querySchema: this.#querySchema,
            headerSchema: this.#headerSchema
        };
    }
}

// ---------------------------------------------------------------------------
// endpoint factory — creates EndpointBuilder instances
// ---------------------------------------------------------------------------

function createEndpoint<TParams>(
    method: string,
    basePath: string,
    pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
): EndpointBuilder<TParams extends undefined ? {} : TParams>;

function createEndpoint(
    method: string,
    basePath: string,
    pathTemplate?: RoutePath
): EndpointBuilder<any> {
    return new EndpointBuilder(
        method,
        basePath,
        pathTemplate ?? '/',
        null,
        null,
        null
    );
}

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
        createEndpoint('OPTIONS', basePath, pathTemplate)
};
