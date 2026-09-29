import type { InferType, SchemaBuilder } from '@cleverbrush/schema';
import type { ApiContract, ApiGroup } from './contract.js';
import {
    type EndpointBuilder,
    type Handler,
    type HandlerMapping,
    mapHandlers,
    type ResponsesOf
} from './Endpoint.js';
import {
    type ErrorMap,
    type ErrorResponsesOf,
    withErrors
} from './ErrorMap.js';
import {
    isSubscriptionBuilder,
    type SubscriptionBuilder,
    type SubscriptionHandlerEntry
} from './Subscription.js';
import type { Middleware } from './types.js';

type AnySchema = SchemaBuilder<any, any, any, any, any>;
type Services = Record<string, AnySchema>;
type AnyEndpoint = EndpointBuilder<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;
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
type Definition = AnyEndpoint | AnySubscription;
type Merge<A, B> = {
    [K in keyof A | keyof B]: K extends keyof B
        ? B[K]
        : K extends keyof A
          ? A[K]
          : never;
};

/** Server-only enrichment shared by every operation in a scope. */
export interface ImplementationDefaults {
    /** Merged with contract services; later same-name bindings win. */
    readonly inject?: Services;
    /** Explicitly require authentication, retaining any existing role requirements. */
    readonly authorize?: AnySchema;
    /** Replace inherited documentation tags when supplied. */
    readonly tags?: readonly string[];
}

/** Per-operation overrides. Wire schemas and cache metadata are not configurable here. */
export interface ImplementationOperationOptions extends ImplementationDefaults {
    /** Short documentation summary. */
    readonly summary?: string;
    /** Longer documentation description. */
    readonly description?: string;
    /** Stable OpenAPI/AsyncAPI operation identifier. */
    readonly operationId?: string;
    /** Mark deprecated; this cannot clear an inherited deprecation. */
    readonly deprecated?: true;
}

/** Typed defaults and operation-specific server settings for a contract group. */
export interface ImplementationGroupOptions<G extends ApiGroup>
    extends ImplementationDefaults {
    /** Keys must belong to the selected group. */
    readonly operations?: {
        readonly [K in keyof G]?: ImplementationOperationOptions;
    };
}

type Injected<O> = O extends { readonly inject: infer I extends Services }
    ? I
    : {};
type Principal<P, O> = O extends {
    readonly authorize: infer S extends AnySchema;
}
    ? InferType<S>
    : P;
type OperationOptions<O, K extends PropertyKey> = O extends {
    readonly operations: infer Operations;
}
    ? K extends keyof Operations
        ? Operations[K]
        : {}
    : {};

type Configured<E, Defaults, Options> =
    E extends EndpointBuilder<
        infer P,
        infer B,
        infer Q,
        infer H,
        infer S,
        infer A,
        infer Roles,
        infer R,
        infer Rs,
        infer U
    >
        ? EndpointBuilder<
              P,
              B,
              Q,
              H,
              Merge<Merge<S, Injected<Defaults>>, Injected<Options>>,
              Principal<Principal<A, Defaults>, Options>,
              Roles,
              R,
              Rs,
              U
          >
        : E extends SubscriptionBuilder<
                infer P,
                infer Q,
                infer H,
                infer S,
                infer A,
                infer Roles,
                infer I,
                infer O
            >
          ? SubscriptionBuilder<
                P,
                Q,
                H,
                Merge<Merge<S, Injected<Defaults>>, Injected<Options>>,
                Principal<Principal<A, Defaults>, Options>,
                Roles,
                I,
                O
            >
          : never;

type ConfiguredGroup<G extends ApiGroup, O> = {
    readonly [K in keyof G]: Configured<G[K], O, OperationOptions<O, K>>;
};

/** Handler binding accepted by an implementation scope. Policies apply only to HTTP handlers. */
export type ImplementationHandlerEntry<E> = E extends AnySubscription
    ? SubscriptionHandlerEntry<E> & { errors?: never }
    : E extends AnyEndpoint
      ?
            | Handler<E>
            | {
                  handler: Handler<E>;
                  middlewares?: Middleware[];
                  errors?: keyof ResponsesOf<E> extends never
                      ? never
                      : ErrorMap<ErrorResponsesOf<E>>;
              }
      : never;

/** Complete, endpoint-specific handler bindings for one configured scope. */
export type ImplementationHandlers<G extends ApiGroup> = {
    [K in keyof G]: ImplementationHandlerEntry<G[K]>;
};

type ExactKeys<Given, Expected> = Record<
    Exclude<keyof Given, keyof Expected>,
    never
>;
type ExactOperations<O, G> = O extends { readonly operations: infer Ops }
    ? { readonly operations: ExactKeys<Ops, G> }
    : unknown;

type Entry = {
    readonly group: string;
    readonly name: string;
    readonly source: Definition;
    readonly endpoint: Definition;
    readonly handler: (...args: any[]) => any;
    readonly middlewares?: Middleware[];
};
type RuntimeBinding =
    | Entry['handler']
    | {
          handler: Entry['handler'];
          middlewares?: Middleware[];
          errors?: ErrorMap<any, any>;
      };

const moduleContract: unique symbol = Symbol('implementationContract');
const moduleEntries: unique symbol = Symbol('implementationEntries');

/**
 * Exportable, immutable set of bound operations. Its type retains the original
 * contract slice, not just an erased array of registrations.
 * Obtain modules with `scope.withHandlers()` or `implement(api).use(...)`.
 */
export class ImplementationModule<C extends ApiContract> {
    /** @internal Compile-time contract coverage. */
    declare readonly [moduleContract]: C;
    readonly #entries: readonly Entry[];

    /** @internal Construct modules through an implementation scope. */
    constructor(entries: readonly Entry[]) {
        this.#entries = Object.freeze(
            entries.map(entry =>
                Object.freeze({
                    ...entry,
                    middlewares: entry.middlewares
                        ? [...entry.middlewares]
                        : undefined
                })
            )
        );
    }

    /** @internal */
    [moduleEntries](): readonly Entry[] {
        return this.#entries;
    }
}

/**
 * Configured, unbound operations from a single contract group.
 * Export the scope from a configuration-only module, then use
 * `Handler<typeof scope.endpoints.operation>` in separate handler files.
 * No handler imports or registration side effects are needed here.
 */
export class ImplementationScope<
    G extends string,
    Source extends ApiGroup,
    Endpoints extends ApiGroup
> {
    readonly #group: G;
    readonly #source: Source;
    readonly #endpoints: Endpoints;

    /** @internal Use `implement(api).group(...)`. */
    constructor(group: G, source: Source, endpoints: Endpoints) {
        this.#group = group;
        this.#source = Object.freeze({ ...source });
        this.#endpoints = Object.freeze({ ...endpoints });
    }

    /** Configured endpoint builders: the source of handler request, DI and response types. */
    get endpoints(): Endpoints {
        return this.#endpoints;
    }

    /**
     * Select operations for a smaller module without losing source identity.
     * The composition root still checks coverage of the full contract.
     */
    pick<const K extends keyof Source & keyof Endpoints & string>(
        ...names: K[]
    ): ImplementationScope<G, Pick<Source, K>, Pick<Endpoints, K>> {
        const source: ApiGroup = {};
        const endpoints: ApiGroup = {};
        const seen = new Set<string>();
        for (const name of names) {
            if (!Object.hasOwn(this.#source, name)) {
                throw new TypeError(`Unknown operation ${this.#group}.${name}`);
            }
            if (seen.has(name))
                throw new TypeError(
                    `Duplicate operation ${this.#group}.${name}`
                );
            seen.add(name);
            Object.defineProperty(source, name, {
                value: this.#source[name],
                enumerable: true
            });
            Object.defineProperty(endpoints, name, {
                value: this.#endpoints[name],
                enumerable: true
            });
        }
        return new ImplementationScope(
            this.#group,
            source,
            endpoints
        ) as ImplementationScope<G, Pick<Source, K>, Pick<Endpoints, K>>;
    }

    /**
     * Bind exactly one handler for every operation in this scope.
     * Named handlers and inline functions receive the same endpoint typing.
     * Optional descriptors attach middleware and HTTP error policies.
     */
    withHandlers<const H extends ImplementationHandlers<Endpoints>>(
        handlers: H & ExactKeys<H, Endpoints>
    ): ImplementationModule<{ [K in G]: Source }> {
        for (const key of Object.keys(handlers)) {
            if (!Object.hasOwn(this.#endpoints, key)) {
                throw new TypeError(`Unknown handler ${this.#group}.${key}`);
            }
        }
        const entries: Entry[] = [];
        for (const name of Object.keys(this.#endpoints)) {
            const endpoint = this.#endpoints[name];
            const binding = (
                Object.hasOwn(handlers, name) ? handlers[name] : undefined
            ) as RuntimeBinding | undefined;
            const handler =
                typeof binding === 'function' ? binding : binding?.handler;
            if (typeof handler !== 'function') {
                throw new TypeError(`Missing handler ${this.#group}.${name}`);
            }
            const errors =
                typeof binding === 'function' ? undefined : binding?.errors;
            if (errors && isSubscriptionBuilder(endpoint)) {
                throw new TypeError(
                    'HTTP error policies cannot wrap subscription handlers'
                );
            }
            entries.push({
                group: this.#group,
                name,
                source: this.#source[name],
                endpoint,
                handler: errors
                    ? withErrors(endpoint as AnyEndpoint, errors, handler)
                    : handler,
                middlewares:
                    typeof binding === 'function'
                        ? undefined
                        : binding?.middlewares
            });
        }
        return new ImplementationModule(entries);
    }
}

type ContractOf<M> = M extends ImplementationModule<infer C> ? C : never;
type MergeContracts<A extends ApiContract, B extends ApiContract> = {
    [G in keyof A | keyof B]: G extends keyof A
        ? G extends keyof B
            ? A[G] & B[G]
            : A[G]
        : G extends keyof B
          ? B[G]
          : never;
};
type Joined<
    Bound extends ApiContract,
    Modules extends readonly ImplementationModule<any>[]
> = Modules extends readonly [
    infer Head,
    ...infer Tail extends readonly ImplementationModule<any>[]
]
    ? Joined<MergeContracts<Bound, ContractOf<Head>>, Tail>
    : Bound;
type Missing<C, B> = {
    [G in keyof C &
        string]: `${G}.${Exclude<keyof C[G], G extends keyof B ? keyof B[G] : never> & string}`;
}[keyof C & string];
type Overlap<A, B> = {
    [G in keyof A &
        keyof B &
        string]: `${G}.${keyof A[G] & keyof B[G] & string}`;
}[keyof A & keyof B & string];
type Incompatible<C, S> = {
    [G in keyof S & string]: G extends keyof C
        ? {
              [K in keyof S[G] & string]: K extends keyof C[G]
                  ? S[G][K] extends C[G][K]
                      ? never
                      : `${G}.${K}`
                  : `${G}.${K}`;
          }[keyof S[G] & string]
        : `${G}.${keyof S[G] & string}`;
}[keyof S & string];
type CheckModules<
    C,
    B extends ApiContract,
    M extends readonly ImplementationModule<any>[]
> = number extends M['length']
    ? {
          readonly implementationError: 'Use a tuple of modules with known operation keys';
      }
    : M extends readonly [
            infer Head,
            ...infer Tail extends readonly ImplementationModule<any>[]
        ]
      ? [
            Overlap<B, ContractOf<Head>> | Incompatible<C, ContractOf<Head>>
        ] extends [never]
          ? CheckModules<C, MergeContracts<B, ContractOf<Head>>, Tail>
          : {
                readonly duplicateOrIncompatibleOperations:
                    | Overlap<B, ContractOf<Head>>
                    | Incompatible<C, ContractOf<Head>>;
            }
      : unknown;

/**
 * Immutable composition root bound to a shared contract. Compose exported
 * feature modules with `use`, then pass `complete()` to `server.handleAll`.
 * Partial roots are themselves modules and can be composed in larger roots.
 */
export class ApiImplementation<
    C extends ApiContract,
    Bound extends ApiContract = {}
> extends ImplementationModule<Bound> {
    readonly #contract: C;

    /** @internal Use {@link implement}. */
    constructor(contract: C, entries: readonly Entry[] = []) {
        super(entries);
        this.#contract = Object.freeze(
            Object.fromEntries(
                Object.entries(contract).map(([name, group]) => [
                    name,
                    Object.freeze({ ...group })
                ])
            )
        ) as C;
    }

    /**
     * Create an unbound scope; does not register handlers or change this root.
     * Services merge contract → group → operation. Only explicitly supplied
     * documentation fields override inherited values. Authorization retains roles.
     */
    group<
        K extends keyof C & string,
        const O extends ImplementationGroupOptions<C[K]> = {}
    >(
        name: K,
        options?: O & ExactOperations<O, C[K]>
    ): ImplementationScope<K, C[K], ConfiguredGroup<C[K], O>> {
        if (!Object.hasOwn(this.#contract, name)) {
            throw new TypeError(`Unknown contract group ${name}`);
        }
        const source = this.#contract[name];
        const config: ImplementationGroupOptions<C[K]> = options ?? {};
        for (const key of Object.keys(config.operations ?? {})) {
            if (!Object.hasOwn(source, key))
                throw new TypeError(`Unknown operation ${name}.${key}`);
        }
        const endpoints = Object.fromEntries(
            Object.entries(source).map(([key, endpoint]) => [
                key,
                configure(endpoint, config, config.operations?.[key] ?? {})
            ])
        );
        return new ImplementationScope(
            name,
            source,
            endpoints
        ) as ImplementationScope<K, C[K], ConfiguredGroup<C[K], O>>;
    }

    /**
     * Compose modules without erasing their operation coverage. Rejects duplicate
     * and incompatible bindings, including runtime source-identity mismatches.
     */
    use<const M extends readonly ImplementationModule<any>[]>(
        ...modules: M & CheckModules<C, Bound, M>
    ): ApiImplementation<C, Joined<Bound, M>> {
        const entries = [...this[moduleEntries]()];
        const seen = new Map<string, Set<string>>();
        for (const entry of entries) {
            if (!seen.has(entry.group)) seen.set(entry.group, new Set());
            seen.get(entry.group)!.add(entry.name);
        }
        for (const module of modules) {
            if (!(module instanceof ImplementationModule))
                throw new TypeError('Expected an implementation module');
            for (const entry of module[moduleEntries]()) {
                if (
                    !Object.hasOwn(this.#contract, entry.group) ||
                    !Object.hasOwn(this.#contract[entry.group], entry.name) ||
                    this.#contract[entry.group][entry.name] !== entry.source
                ) {
                    throw new TypeError(
                        `Incompatible source endpoint ${entry.group}.${entry.name}`
                    );
                }
                if (seen.get(entry.group)?.has(entry.name)) {
                    throw new TypeError(
                        `Duplicate implementation ${entry.group}.${entry.name}`
                    );
                }
                if (!seen.has(entry.group)) seen.set(entry.group, new Set());
                seen.get(entry.group)!.add(entry.name);
                entries.push(entry);
            }
        }
        return new ApiImplementation<C, Joined<Bound, M>>(
            this.#contract,
            entries
        );
    }

    /**
     * Finalize only when every operation in the original contract is covered.
     * Rechecks coverage at runtime for JavaScript callers and erased types.
     * Returns the existing registration format; the server pipeline is unchanged.
     */
    complete(
        this: [Missing<C, Bound>] extends [never]
            ? ApiImplementation<C, Bound>
            : { readonly missingOperations: Missing<C, Bound> }
    ): HandlerMapping;
    complete(): HandlerMapping {
        const endpoints: Record<string, ApiGroup> = Object.create(null);
        const handlers: Record<string, Record<string, any>> = Object.create(
            null
        );
        for (const entry of this[moduleEntries]()) {
            endpoints[entry.group] ??= Object.create(null);
            handlers[entry.group] ??= Object.create(null);
            endpoints[entry.group][entry.name] = entry.endpoint;
            handlers[entry.group][entry.name] = {
                handler: entry.handler,
                middlewares: entry.middlewares
                    ? [...entry.middlewares]
                    : undefined
            };
        }
        const missing: string[] = [];
        for (const [group, operations] of Object.entries(this.#contract)) {
            for (const name of Object.keys(operations)) {
                if (!Object.hasOwn(endpoints[group] ?? {}, name))
                    missing.push(`${group}.${name}`);
            }
        }
        if (missing.length)
            throw new TypeError(
                `Missing implementations: ${missing.join(', ')}`
            );
        return mapHandlers<any>(endpoints, handlers);
    }
}

function configure(
    endpoint: Definition,
    defaults: ImplementationDefaults,
    options: ImplementationOperationOptions
): Definition {
    let result: any = endpoint;
    if (defaults.inject || options.inject) {
        result = result.inject({
            ...endpoint.introspect().serviceSchemas,
            ...defaults.inject,
            ...options.inject
        });
    }
    const authorize = options.authorize ?? defaults.authorize;
    if (authorize) result = result.authorize(authorize);
    const tags = options.tags ?? defaults.tags;
    if (tags) result = result.tags(...tags);
    if (options.summary !== undefined) result = result.summary(options.summary);
    if (options.description !== undefined)
        result = result.description(options.description);
    if (options.operationId !== undefined)
        result = result.operationId(options.operationId);
    if (options.deprecated) result = result.deprecated();
    return result;
}

/**
 * Start an immutable implementation bound to a shared API contract.
 *
 * @param contract - Complete shared contract, or an intentional audience slice.
 * @example
 * ```ts
 * const todos = implement(api).group('todos', { inject: { db: DbToken } });
 * const module = todos.withHandlers({ list: listHandler, create: createHandler });
 * server.handleAll(implement(api).use(module).complete());
 * ```
 */
export function implement<C extends ApiContract>(
    contract: C
): ApiImplementation<C> {
    return new ApiImplementation(contract);
}
