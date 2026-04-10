import type {
    FunctionSchemaBuilder,
    InferType,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { ServiceProviderOptions } from './ServiceCollection.js';
import { ServiceScope } from './ServiceScope.js';
import type { IServiceProvider, ServiceDescriptor } from './types.js';
import { ServiceLifetime } from './types.js';

/**
 * An immutable service provider that resolves services from a frozen set of
 * {@link ServiceDescriptor | descriptors}. Obtain an instance by calling
 * {@link ServiceCollection.buildServiceProvider}.
 *
 * Supports three service lifetimes:
 * - **Singleton** — one instance per provider, cached after first resolution.
 * - **Scoped** — one instance per {@link ServiceScope}, created via
 *   {@link createScope}.
 * - **Transient** — a new instance on every call to {@link get}.
 *
 * @example Resolving services
 * ```ts
 * const provider = services.buildServiceProvider();
 *
 * // Typed via the schema — no explicit generic needed
 * const config = provider.get(IConfig);
 * config.port; // number
 *
 * // Optional resolution (returns undefined if not registered)
 * const maybeMail = provider.getOptional(IMailer);
 * ```
 *
 * @example Using scopes
 * ```ts
 * // Per-request scope (e.g. in an HTTP handler)
 * using scope = provider.createScope();
 * const db = scope.serviceProvider.get(IDbContext);
 * // db is disposed when scope exits
 * ```
 *
 * @example Function injection
 * ```ts
 * const handlerSchema = func()
 *     .addParameter(ILogger)
 *     .addParameter(IDbContext)
 *     .hasReturnType(string());
 *
 * const result = provider.invoke(handlerSchema, (logger, db) => {
 *     logger.info('Handling request');
 *     return db.query('SELECT 1');
 * });
 * ```
 *
 * @see {@link ServiceCollection}
 * @see {@link ServiceScope}
 */
export class ServiceProvider implements IServiceProvider {
    readonly #descriptors: Map<
        SchemaBuilder<any, any, any, any, any>,
        ServiceDescriptor
    >;
    readonly #singletonCache: Map<SchemaBuilder<any, any, any, any, any>, any> =
        new Map();
    readonly #validateScopes: boolean;

    /**
     * @hidden
     */
    constructor(
        descriptors: Map<
            SchemaBuilder<any, any, any, any, any>,
            ServiceDescriptor
        >,
        options?: ServiceProviderOptions
    ) {
        this.#descriptors = descriptors;
        this.#validateScopes = options?.validateScopes ?? true;
    }

    /**
     * Resolves a service by its schema key.
     *
     * - **Singleton**: returns the cached instance, or creates and caches it.
     * - **Scoped**: throws if called from the root provider when
     *   `validateScopes` is `true` (default). Use
     *   {@link createScope} to obtain a scoped provider.
     * - **Transient**: creates a new instance on every call.
     *
     * @param schema - The schema instance used as the service identifier.
     *   Must be the same reference used during registration.
     * @returns The resolved service, typed as `InferType<typeof schema>`.
     * @throws {Error} If the schema is not registered.
     * @throws {Error} If a scoped service is resolved from the root provider
     *   with `validateScopes` enabled.
     * @throws {Error} If a circular dependency is detected.
     *
     * @example
     * ```ts
     * const logger = provider.get(ILogger);
     * logger.info('Hello'); // fully typed
     * ```
     */
    public get<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> {
        return this.#resolve(schema, new Set());
    }

    /**
     * Resolves a service by its schema key, or returns `undefined` if the
     * schema is not registered.
     *
     * Unlike {@link get}, this method does **not** throw for unregistered
     * schemas. All other behaviour (lifetime, scope validation, circular
     * dependency detection) is the same.
     *
     * @param schema - The schema instance used as the service identifier.
     * @returns The resolved service or `undefined`.
     *
     * @example
     * ```ts
     * const mailer = provider.getOptional(IMailer);
     * if (mailer) {
     *     mailer.send('test@example.com', 'Hello');
     * }
     * ```
     */
    public getOptional<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> | undefined {
        if (!this.#descriptors.has(schema)) {
            return undefined;
        }
        return this.#resolve(schema, new Set());
    }

    /**
     * Creates a new {@link ServiceScope}. Scoped services resolved from the
     * scope's {@link ServiceScope.serviceProvider | serviceProvider} are
     * cached per-scope and disposed when the scope is disposed.
     *
     * The returned scope implements both `Symbol.dispose` and
     * `Symbol.asyncDispose`, so it works with the `using` keyword:
     *
     * @returns A new {@link ServiceScope}.
     *
     * @example
     * ```ts
     * // Sync disposal
     * using scope = provider.createScope();
     * const db = scope.serviceProvider.get(IDbContext);
     *
     * // Async disposal
     * await using scope = provider.createScope();
     * const db = scope.serviceProvider.get(IDbContext);
     * ```
     */
    public createScope(): ServiceScope {
        return new ServiceScope(this.#descriptors, this.#singletonCache);
    }

    /**
     * Resolves the dependencies described by a {@link FunctionSchemaBuilder}
     * and calls `implementation` with the resolved values.
     *
     * Each parameter schema in `funcSchema.introspect().parameters` is
     * resolved from this provider. The implementation receives the resolved
     * values in the same order as the parameter schemas.
     *
     * @param funcSchema - A {@link FunctionSchemaBuilder} whose parameters
     *   describe the services to inject.
     * @param implementation - A function whose parameters match the
     *   `funcSchema` parameter types and whose return type matches the
     *   `funcSchema` return type.
     * @returns The return value of `implementation`.
     *
     * @example
     * ```ts
     * const handler = func()
     *     .addParameter(ILogger)
     *     .addParameter(IConfig)
     *     .hasReturnType(string());
     *
     * const result = provider.invoke(handler, (logger, config) => {
     *     logger.info(`Running on port ${config.port}`);
     *     return 'ok';
     * });
     * // result: string
     * ```
     *
     * @see {@link FunctionSchemaBuilder.addParameter}
     * @see {@link FunctionSchemaBuilder.hasReturnType}
     */
    public invoke<
        TFuncSchema extends FunctionSchemaBuilder<any, any, any, any, any, any>
    >(
        funcSchema: TFuncSchema,
        implementation: InferType<TFuncSchema>
    ): ReturnType<InferType<TFuncSchema>> {
        const parameterSchemas = funcSchema.introspect().parameters;
        const resolutionStack = new Set<
            SchemaBuilder<any, any, any, any, any>
        >();
        const args = parameterSchemas.map(paramSchema =>
            this.#resolve(paramSchema, resolutionStack)
        );
        return (implementation as Function).apply(null, args);
    }

    /**
     * Internal resolution method shared between root and scoped providers.
     * Handles singleton caching and transient creation. Scoped resolution is
     * handled by {@link ScopedServiceProvider}.
     *
     * @hidden
     */
    #resolve(
        schema: SchemaBuilder<any, any, any, any, any>,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>,
        scopedCache?: Map<SchemaBuilder<any, any, any, any, any>, any>,
        trackDisposable?: (instance: any) => void
    ): any {
        const descriptor = this.#descriptors.get(schema);
        if (!descriptor) {
            throw new Error(
                `Service not registered. The schema passed to get() was not ` +
                    `registered in the ServiceCollection. Ensure you are ` +
                    `using the same schema reference for registration and ` +
                    `resolution.`
            );
        }

        // Circular dependency detection
        if (resolutionStack.has(schema)) {
            const chain = [...resolutionStack]
                .map(s => s.introspect().type ?? '(anonymous)')
                .join(' → ');
            throw new Error(
                `Circular dependency detected: ${chain} → ${descriptor.schema.introspect().type ?? '(anonymous)'}`
            );
        }

        switch (descriptor.lifetime) {
            case ServiceLifetime.Singleton: {
                if (this.#singletonCache.has(schema)) {
                    return this.#singletonCache.get(schema);
                }
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack,
                    scopedCache,
                    trackDisposable
                );
                resolutionStack.delete(schema);
                this.#singletonCache.set(schema, instance);
                return instance;
            }

            case ServiceLifetime.Scoped: {
                if (!scopedCache) {
                    if (this.#validateScopes) {
                        throw new Error(
                            `Cannot resolve scoped service from the root ` +
                                `provider. Create a scope first with ` +
                                `provider.createScope(). If this is ` +
                                `intentional, set validateScopes: false in ` +
                                `buildServiceProvider() options.`
                        );
                    }
                    // If validateScopes is false, treat as transient from root
                    resolutionStack.add(schema);
                    const instance = this.#createAndValidate(
                        descriptor,
                        resolutionStack,
                        scopedCache,
                        trackDisposable
                    );
                    resolutionStack.delete(schema);
                    return instance;
                }
                if (scopedCache.has(schema)) {
                    return scopedCache.get(schema);
                }
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack,
                    scopedCache,
                    trackDisposable
                );
                resolutionStack.delete(schema);
                scopedCache.set(schema, instance);
                if (trackDisposable) {
                    trackDisposable(instance);
                }
                return instance;
            }

            case ServiceLifetime.Transient: {
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack,
                    scopedCache,
                    trackDisposable
                );
                resolutionStack.delete(schema);
                return instance;
            }
        }
    }

    #createAndValidate(
        descriptor: ServiceDescriptor,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>,
        scopedCache?: Map<SchemaBuilder<any, any, any, any, any>, any>,
        trackDisposable?: (instance: any) => void
    ): any {
        const childProvider = new ScopedResolverProxy(
            this,
            resolutionStack,
            scopedCache,
            trackDisposable
        );
        const instance = descriptor.factory(childProvider);

        if (descriptor.validate) {
            const result = descriptor.schema.validate(instance);
            if (!result.valid) {
                const messages =
                    result.errors?.map(e => e.message).join('; ') ??
                    'unknown error';
                throw new Error(
                    `Service validation failed for schema type ` +
                        `"${descriptor.schema.introspect().type ?? '(anonymous)'}": ${messages}`
                );
            }
        }

        return instance;
    }

    /**
     * Resolves a service within a scope context. Called by
     * {@link ScopedServiceProvider}.
     *
     * @hidden
     */
    resolveScoped(
        schema: SchemaBuilder<any, any, any, any, any>,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>,
        scopedCache: Map<SchemaBuilder<any, any, any, any, any>, any>,
        trackDisposable: (instance: any) => void
    ): any {
        return this.#resolve(
            schema,
            resolutionStack,
            scopedCache,
            trackDisposable
        );
    }
}

/**
 * Internal proxy used during factory invocation to enable factories to resolve
 * other services. Routes resolution back through the ServiceProvider with the
 * current resolution stack for circular dependency detection.
 *
 * @hidden
 */
class ScopedResolverProxy implements IServiceProvider {
    readonly #provider: ServiceProvider;
    readonly #resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>;
    readonly #scopedCache?: Map<SchemaBuilder<any, any, any, any, any>, any>;
    readonly #trackDisposable?: (instance: any) => void;

    constructor(
        provider: ServiceProvider,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>,
        scopedCache?: Map<SchemaBuilder<any, any, any, any, any>, any>,
        trackDisposable?: (instance: any) => void
    ) {
        this.#provider = provider;
        this.#resolutionStack = resolutionStack;
        this.#scopedCache = scopedCache;
        this.#trackDisposable = trackDisposable;
    }

    get<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> {
        return this.#provider.resolveScoped(
            schema,
            this.#resolutionStack,
            this.#scopedCache ?? new Map(),
            this.#trackDisposable ?? (() => {})
        );
    }

    getOptional<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> | undefined {
        try {
            return this.get(schema);
        } catch {
            return undefined;
        }
    }
}
