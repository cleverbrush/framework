import type {
    InferType,
    ObjectSchemaBuilder,
    ParseStringSchemaBuilder,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { RequestContext } from './RequestContext.js';
import type { Middleware } from './types.js';

// ---------------------------------------------------------------------------
// Simplify — flattens intersection types for clean IDE tooltips
// ---------------------------------------------------------------------------

type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ---------------------------------------------------------------------------
// tracked() — resumable event wrapper
// ---------------------------------------------------------------------------

const TRACKED_SYMBOL = Symbol.for('cleverbrush.tracked');

/**
 * A server-sent event wrapped with a unique ID for resumable subscriptions.
 *
 * When a client reconnects, it can send the last received event ID so the
 * server resumes from that point instead of replaying everything.
 *
 * @see {@link tracked}
 */
export interface TrackedEvent<T = unknown> {
    /** @internal Brand marker. */
    readonly [TRACKED_SYMBOL]: true;
    /** Unique event identifier for resume tracking. */
    readonly id: string;
    /** The actual event payload. */
    readonly data: T;
}

/**
 * Wrap a server-sent event with a unique ID for resumable subscriptions.
 *
 * When a handler yields a `TrackedEvent`, the server sends the event with its
 * ID. If the client disconnects and reconnects with the last received ID,
 * the handler can skip already-delivered events.
 *
 * @param id - A unique, monotonically increasing identifier for this event.
 * @param data - The event payload to send to the client.
 * @returns A {@link TrackedEvent} wrapper.
 *
 * @example
 * ```ts
 * async function* handler({ incoming }) {
 *     yield tracked('evt-1', { message: 'Hello' });
 *     yield tracked('evt-2', { message: 'World' });
 * }
 * ```
 */
export function tracked<T>(id: string, data: T): TrackedEvent<T> {
    return { [TRACKED_SYMBOL]: true, id, data };
}

/**
 * Check whether a value is a {@link TrackedEvent}.
 * @internal
 */
export function isTrackedEvent(value: unknown): value is TrackedEvent {
    return (
        value !== null &&
        typeof value === 'object' &&
        TRACKED_SYMBOL in value &&
        (value as any)[TRACKED_SYMBOL] === true
    );
}

// ---------------------------------------------------------------------------
// SubscriptionContext — the typed argument for subscription handlers
// ---------------------------------------------------------------------------

type HasKeys<T> = keyof T extends never ? false : true;

type SubscriptionContextParts<
    TParams,
    TQuery,
    THeaders,
    TPrincipal,
    TIncoming
> = {
    context: RequestContext;
    signal: AbortSignal;
} & (HasKeys<TParams> extends true ? { params: TParams } : {}) &
    (HasKeys<TQuery> extends true ? { query: TQuery } : {}) &
    (HasKeys<THeaders> extends true ? { headers: THeaders } : {}) &
    (TPrincipal extends undefined ? {} : { principal: TPrincipal }) &
    ([TIncoming] extends [undefined]
        ? {}
        : {
              incoming: AsyncIterable<
                  TIncoming extends SchemaBuilder<any, any, any, any, any>
                      ? InferType<TIncoming>
                      : TIncoming
              >;
          });

/**
 * The fully-typed argument object passed to subscription handlers.
 *
 * The shape is inferred from the `SubscriptionBuilder` chain — only the keys
 * actually configured (query, headers, params, principal, incoming) are present.
 * Always includes `context` ({@link RequestContext}) and `signal` ({@link AbortSignal}).
 */
export type SubscriptionContext<E> =
    E extends SubscriptionBuilder<
        infer TParams,
        infer TQuery,
        infer THeaders,
        any,
        infer TPrincipal,
        any,
        infer TIncoming,
        any
    >
        ? Simplify<
              SubscriptionContextParts<
                  TParams,
                  TQuery,
                  THeaders,
                  TPrincipal,
                  TIncoming
              >
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
 * Extracts the injected service schemas map from a `SubscriptionBuilder`.
 */
export type SubscriptionServiceSchemas<E> =
    E extends SubscriptionBuilder<
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

// ---------------------------------------------------------------------------
// InferOutgoing — extracts the outgoing event type
// ---------------------------------------------------------------------------

type OutgoingType<E> =
    E extends SubscriptionBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer TOutgoing
    >
        ? TOutgoing extends SchemaBuilder<any, any, any, any, any>
            ? InferType<TOutgoing> | TrackedEvent<InferType<TOutgoing>>
            : TOutgoing | TrackedEvent<TOutgoing>
        : any;

// ---------------------------------------------------------------------------
// SubscriptionHandler — the async generator function type
// ---------------------------------------------------------------------------

/**
 * The handler function type inferred from a `SubscriptionBuilder`.
 *
 * Must be an async generator that yields outgoing events. When the endpoint
 * has injected services, the handler receives a second `services` argument.
 *
 * @example
 * ```ts
 * const handler: SubscriptionHandler<typeof chatEndpoint> =
 *     async function* ({ incoming, principal }) {
 *         yield tracked('welcome', { text: 'Hello!' });
 *         for await (const msg of incoming) {
 *             yield { text: `${principal.name}: ${msg.text}` };
 *         }
 *     };
 * ```
 */
export type SubscriptionHandler<E> =
    HasKeys<SubscriptionServiceSchemas<E>> extends true
        ? (
              arg: SubscriptionContext<E>,
              services: Simplify<InferServices<SubscriptionServiceSchemas<E>>>
          ) => AsyncGenerator<OutgoingType<E>>
        : (arg: SubscriptionContext<E>) => AsyncGenerator<OutgoingType<E>>;

// ---------------------------------------------------------------------------
// SubscriptionMetadata — runtime introspection snapshot
// ---------------------------------------------------------------------------

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

/**
 * Snapshot of all configuration set on a `SubscriptionBuilder`.
 * Used by the server for WebSocket upgrade handling and by documentation
 * generators for AsyncAPI / OpenAPI spec output.
 */
export interface SubscriptionMetadata {
    /** Always `'subscription'`. Distinguishes from HTTP endpoint metadata. */
    readonly protocol: 'subscription';
    readonly basePath: string;
    readonly pathTemplate: RoutePath;
    readonly incomingSchema: SchemaBuilder<any, any, any, any, any> | null;
    readonly outgoingSchema: SchemaBuilder<any, any, any, any, any> | null;
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
    readonly authRoles: readonly string[] | null;
    readonly summary: string | null;
    readonly description: string | null;
    readonly tags: readonly string[];
    readonly operationId: string | null;
    readonly deprecated: boolean;
    readonly externalDocs: { url: string; description?: string } | null;
}

// ---------------------------------------------------------------------------
// SubscriptionBuilder — immutable builder for WebSocket subscription endpoints
// ---------------------------------------------------------------------------

/**
 * Immutable, fluent builder for WebSocket subscription endpoint definitions.
 *
 * All methods return a new builder instance — the original is never mutated.
 * Use `endpoint.subscription()` to obtain the first builder in the chain.
 *
 * @example
 * ```ts
 * const ChatRoom = endpoint
 *     .subscription('/ws/chat')
 *     .incoming(object({ text: string() }))
 *     .outgoing(object({ user: string(), text: string(), timestamp: number() }))
 *     .authorize(PrincipalSchema)
 *     .summary('Real-time chat room');
 * ```
 */
export class SubscriptionBuilder<
    TParams = {},
    TQuery = {},
    THeaders = {},
    TServices = {},
    TPrincipal = undefined,
    TRoles extends string = string,
    TIncoming = undefined,
    TOutgoing = undefined
> {
    readonly #basePath: string;
    readonly #pathTemplate: RoutePath;
    readonly #incomingSchema: SchemaBuilder<any, any, any, any, any> | null;
    readonly #outgoingSchema: SchemaBuilder<any, any, any, any, any> | null;
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
    readonly #externalDocs: { url: string; description?: string } | null;

    constructor(
        basePath: string,
        pathTemplate: RoutePath = '/',
        incomingSchema: SchemaBuilder<any, any, any, any, any> | null = null,
        outgoingSchema: SchemaBuilder<any, any, any, any, any> | null = null,
        querySchema: ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > | null = null,
        headerSchema: ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > | null = null,
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
        externalDocs: { url: string; description?: string } | null = null
    ) {
        this.#basePath = basePath;
        this.#pathTemplate = pathTemplate;
        this.#incomingSchema = incomingSchema;
        this.#outgoingSchema = outgoingSchema;
        this.#querySchema = querySchema;
        this.#headerSchema = headerSchema;
        this.#serviceSchemas = serviceSchemas;
        this.#authRoles = authRoles;
        this.#summary = summary;
        this.#description = description;
        this.#tags = tags;
        this.#operationId = operationId;
        this.#deprecated = deprecated;
        this.#externalDocs = externalDocs;
    }

    // -- Helper to clone with one field changed ---------------------------------

    #clone(
        overrides: Partial<{
            basePath: string;
            pathTemplate: RoutePath;
            incomingSchema: SchemaBuilder<any, any, any, any, any> | null;
            outgoingSchema: SchemaBuilder<any, any, any, any, any> | null;
            querySchema: ObjectSchemaBuilder<
                any,
                any,
                any,
                any,
                any,
                any,
                any
            > | null;
            headerSchema: ObjectSchemaBuilder<
                any,
                any,
                any,
                any,
                any,
                any,
                any
            > | null;
            serviceSchemas: Record<
                string,
                SchemaBuilder<any, any, any, any, any>
            > | null;
            authRoles: readonly string[] | null;
            summary: string | null;
            description: string | null;
            tags: readonly string[];
            operationId: string | null;
            deprecated: boolean;
            externalDocs: { url: string; description?: string } | null;
        }>
    ): SubscriptionBuilder<any, any, any, any, any, any, any, any> {
        return new SubscriptionBuilder(
            overrides.basePath ?? this.#basePath,
            overrides.pathTemplate ?? this.#pathTemplate,
            overrides.incomingSchema !== undefined
                ? overrides.incomingSchema
                : this.#incomingSchema,
            overrides.outgoingSchema !== undefined
                ? overrides.outgoingSchema
                : this.#outgoingSchema,
            overrides.querySchema !== undefined
                ? overrides.querySchema
                : this.#querySchema,
            overrides.headerSchema !== undefined
                ? overrides.headerSchema
                : this.#headerSchema,
            overrides.serviceSchemas !== undefined
                ? overrides.serviceSchemas
                : this.#serviceSchemas,
            overrides.authRoles !== undefined
                ? overrides.authRoles
                : this.#authRoles,
            overrides.summary !== undefined ? overrides.summary : this.#summary,
            overrides.description !== undefined
                ? overrides.description
                : this.#description,
            overrides.tags ?? this.#tags,
            overrides.operationId !== undefined
                ? overrides.operationId
                : this.#operationId,
            overrides.deprecated ?? this.#deprecated,
            overrides.externalDocs !== undefined
                ? overrides.externalDocs
                : this.#externalDocs
        );
    }

    /**
     * Define the schema for client→server messages.
     * Messages that do not match this schema are rejected with an error frame.
     */
    incoming<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TSchema,
        TOutgoing
    > {
        return this.#clone({ incomingSchema: schema }) as any;
    }

    /**
     * Define the schema for server→client events.
     * All yielded values are validated against this schema before sending.
     */
    outgoing<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TSchema
    > {
        return this.#clone({ outgoingSchema: schema }) as any;
    }

    /** Define the query string schema for the WebSocket upgrade URL. */
    query<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): SubscriptionBuilder<
        TParams,
        InferType<TSchema>,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ querySchema: schema }) as any;
    }

    /** Define expected headers on the WebSocket upgrade request. */
    headers<
        TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        schema: TSchema
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        InferType<TSchema>,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ headerSchema: schema }) as any;
    }

    /** Declare DI services to be resolved per-connection and passed as the second handler argument. */
    inject<
        TSchemas extends Record<string, SchemaBuilder<any, any, any, any, any>>
    >(
        schemas: TSchemas
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TSchemas,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ serviceSchemas: schemas }) as any;
    }

    /**
     * Mark this subscription as requiring authorization.
     *
     * Overloads:
     * - `authorize(principalSchema, ...roles)` — typed principal, optional role requirements
     * - `authorize(...roles)` — untyped principal (`unknown`), optional role requirements
     */
    authorize<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        principalSchema: TSchema,
        ...roles: TRoles[]
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        InferType<TSchema>,
        TRoles,
        TIncoming,
        TOutgoing
    >;
    authorize(
        ...roles: TRoles[]
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        unknown,
        TRoles,
        TIncoming,
        TOutgoing
    >;
    authorize(
        ...args: unknown[]
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        any,
        TRoles,
        TIncoming,
        TOutgoing
    > {
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
        const merged = this.#authRoles ? [...this.#authRoles, ...roles] : roles;
        return this.#clone({ authRoles: merged }) as any;
    }

    /** Short, human-readable summary for documentation. */
    summary(
        text: string
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ summary: text }) as any;
    }

    /** Longer description for documentation. Supports Markdown. */
    description(
        text: string
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ description: text }) as any;
    }

    /** Documentation tags for grouping. */
    tags(
        ...tags: string[]
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ tags }) as any;
    }

    /** A unique, stable identifier for documentation. */
    operationId(
        id: string
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ operationId: id }) as any;
    }

    /** Mark this subscription as deprecated in documentation. */
    deprecated(): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ deprecated: true }) as any;
    }

    /** Link external documentation. */
    externalDocs(
        url: string,
        description?: string
    ): SubscriptionBuilder<
        TParams,
        TQuery,
        THeaders,
        TServices,
        TPrincipal,
        TRoles,
        TIncoming,
        TOutgoing
    > {
        return this.#clone({ externalDocs: { url, description } }) as any;
    }

    /** Return an immutable snapshot of this builder's configuration as {@link SubscriptionMetadata}. */
    introspect(): SubscriptionMetadata {
        return {
            protocol: 'subscription',
            basePath: this.#basePath,
            pathTemplate: this.#pathTemplate,
            incomingSchema: this.#incomingSchema,
            outgoingSchema: this.#outgoingSchema,
            querySchema: this.#querySchema,
            headerSchema: this.#headerSchema,
            serviceSchemas: this.#serviceSchemas,
            authRoles: this.#authRoles,
            summary: this.#summary,
            description: this.#description,
            tags: this.#tags,
            operationId: this.#operationId,
            deprecated: this.#deprecated,
            externalDocs: this.#externalDocs
        };
    }
}

// ---------------------------------------------------------------------------
// Subscription handler mapping types
// ---------------------------------------------------------------------------

type AnySubscription = SubscriptionBuilder<
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
 * A single handler entry for a subscription in a handler map.
 *
 * Either a bare handler function or an object with a `handler` function
 * and optional per-subscription `middlewares`.
 */
export type SubscriptionHandlerEntry<E> =
    | SubscriptionHandler<E>
    | { handler: SubscriptionHandler<E>; middlewares?: Middleware[] };

/**
 * Create a subscription endpoint builder.
 * @internal — used by the endpoint factory.
 */
export function createSubscription<TParams>(
    basePath: string,
    pathTemplate?: ParseStringSchemaBuilder<TParams, any, any, any, any>
): SubscriptionBuilder<TParams extends undefined ? {} : TParams>;

export function createSubscription(
    basePath: string,
    pathTemplate?: RoutePath
): SubscriptionBuilder<any> {
    return new SubscriptionBuilder(basePath, pathTemplate ?? '/');
}

/**
 * Runtime check: is this endpoint builder a subscription?
 * @internal
 */
export function isSubscriptionBuilder(
    value: unknown
): value is AnySubscription {
    return value instanceof SubscriptionBuilder;
}

/**
 * Runtime check: is this metadata from a subscription?
 * @internal
 */
export function isSubscriptionMetadata(
    value: unknown
): value is SubscriptionMetadata {
    return (
        value !== null &&
        typeof value === 'object' &&
        (value as any).protocol === 'subscription'
    );
}
