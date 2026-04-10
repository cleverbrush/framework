import type {
    FunctionSchemaBuilder,
    InferType,
    SchemaBuilder
} from '@cleverbrush/schema';
import { ServiceProvider } from './ServiceProvider.js';
import type {
    ServiceDescriptor,
    ServiceFactory,
    ServiceRegistrationOptions
} from './types.js';
import { ServiceLifetime } from './types.js';

/**
 * Options for building a {@link ServiceProvider} from a {@link ServiceCollection}.
 *
 * @see {@link ServiceCollection.buildServiceProvider}
 */
export interface ServiceProviderOptions {
    /**
     * When `true`, resolving a {@link ServiceLifetime.Scoped | Scoped} service
     * from the root provider (outside of a scope) throws an error. This helps
     * catch accidental singleton captures of scoped services.
     *
     * Recommended for development. Matches .NET's `ValidateScopes` behaviour.
     *
     * @defaultValue `true`
     */
    validateScopes?: boolean;
}

/**
 * A mutable collection of service registrations. Build up the collection by
 * calling {@link addSingleton}, {@link addScoped}, or {@link addTransient},
 * then call {@link buildServiceProvider} to create an immutable
 * {@link ServiceProvider}.
 *
 * Schema instances act as service keys via reference equality — the same
 * schema object used during registration must be used during resolution.
 *
 * @example Basic registration and resolution
 * ```ts
 * import { ServiceCollection } from '@cleverbrush/di';
 * import { object, string, number, func } from '@cleverbrush/schema';
 *
 * const IConfig = object({ port: number(), host: string() });
 * const ILogger = object({ info: func() });
 *
 * const services = new ServiceCollection();
 * services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
 * services.addSingleton(ILogger, () => ({ info: console.log }));
 *
 * const provider = services.buildServiceProvider();
 * const config = provider.get(IConfig); // { port: number; host: string }
 * ```
 *
 * @example Function-schema-driven registration
 * ```ts
 * const IGreeter = object({ greet: func() });
 * const greeterFactory = func()
 *     .addParameter(IConfig)
 *     .addParameter(ILogger);
 *
 * services.addSingletonFromSchema(
 *     IGreeter,
 *     greeterFactory,
 *     (config, logger) => ({
 *         greet() { logger.info(`Hello from ${config.host}`); }
 *     })
 * );
 * ```
 *
 * @see {@link ServiceProvider}
 * @see {@link ServiceLifetime}
 */
export class ServiceCollection {
    readonly #descriptors: Map<
        SchemaBuilder<any, any, any, any, any>,
        ServiceDescriptor
    > = new Map();

    /**
     * Registers a service with {@link ServiceLifetime.Singleton | Singleton}
     * lifetime. The factory (or value) is called at most once; every
     * subsequent resolution returns the same instance.
     *
     * @param schema - The schema used as the service identifier.
     * @param factoryOrValue - Either a {@link ServiceFactory} function that
     *   receives the provider, or a plain value (which is wrapped in a
     *   factory automatically).
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @example Factory registration
     * ```ts
     * services.addSingleton(ILogger, (provider) => {
     *     const config = provider.get(IConfig);
     *     return new ConsoleLogger(config.logLevel);
     * });
     * ```
     *
     * @example Value shorthand
     * ```ts
     * services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
     * ```
     *
     * @see {@link addScoped}
     * @see {@link addTransient}
     */
    public addSingleton<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema,
        factoryOrValue: ServiceFactory<InferType<TSchema>> | InferType<TSchema>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#add(
            schema,
            ServiceLifetime.Singleton,
            factoryOrValue,
            options
        );
    }

    /**
     * Registers a service with {@link ServiceLifetime.Scoped | Scoped}
     * lifetime. One instance is created per {@link ServiceScope}; within a
     * scope every resolution returns the same instance.
     *
     * @param schema - The schema used as the service identifier.
     * @param factory - A {@link ServiceFactory} function that creates the
     *   service instance. Unlike {@link addSingleton}, a plain value is
     *   **not** accepted because scoped services must be freshly created
     *   per scope.
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * const IDbContext = object({ query: func() });
     *
     * services.addScoped(IDbContext, (provider) => {
     *     const config = provider.get(IConfig);
     *     return new DbContext(config.connectionString);
     * });
     * ```
     *
     * @see {@link addSingleton}
     * @see {@link addTransient}
     */
    public addScoped<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema,
        factory: ServiceFactory<InferType<TSchema>>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#add(schema, ServiceLifetime.Scoped, factory, options);
    }

    /**
     * Registers a service with {@link ServiceLifetime.Transient | Transient}
     * lifetime. A new instance is created on every resolution.
     *
     * @param schema - The schema used as the service identifier.
     * @param factory - A {@link ServiceFactory} function that creates the
     *   service instance.
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * const IRequestId = object({ id: string() });
     *
     * services.addTransient(IRequestId, () => ({
     *     id: crypto.randomUUID()
     * }));
     * ```
     *
     * @see {@link addSingleton}
     * @see {@link addScoped}
     */
    public addTransient<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema,
        factory: ServiceFactory<InferType<TSchema>>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#add(schema, ServiceLifetime.Transient, factory, options);
    }

    /**
     * Registers a {@link ServiceLifetime.Singleton | Singleton} service whose
     * dependencies are described by a {@link FunctionSchemaBuilder}. The
     * container resolves each parameter schema from the registry and passes
     * the resolved values to `implementation`.
     *
     * @param targetSchema - The schema used as the service identifier for the
     *   created service.
     * @param funcSchema - A {@link FunctionSchemaBuilder} whose
     *   `introspect().parameters` list the dependency schemas.
     * @param implementation - A function whose parameters match the
     *   `funcSchema` parameter schemas (in order) and returns the service
     *   instance.
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @example
     * ```ts
     * const IGreeter = object({ greet: func() });
     *
     * const greeterDeps = func()
     *     .addParameter(IConfig)
     *     .addParameter(ILogger);
     *
     * services.addSingletonFromSchema(
     *     IGreeter,
     *     greeterDeps,
     *     (config, logger) => ({
     *         greet() { logger.info(`Hello from ${config.host}`); }
     *     })
     * );
     * ```
     *
     * @see {@link addScopedFromSchema}
     * @see {@link addTransientFromSchema}
     */
    public addSingletonFromSchema<
        TTargetSchema extends SchemaBuilder<any, any, any, any, any>,
        TFuncSchema extends FunctionSchemaBuilder<any, any, any, any, any, any>
    >(
        targetSchema: TTargetSchema,
        funcSchema: TFuncSchema,
        implementation: (
            ...args: FuncSchemaParameters<TFuncSchema>
        ) => InferType<TTargetSchema>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#addFromSchema(
            targetSchema,
            funcSchema,
            implementation,
            ServiceLifetime.Singleton,
            options
        );
    }

    /**
     * Registers a {@link ServiceLifetime.Scoped | Scoped} service whose
     * dependencies are described by a {@link FunctionSchemaBuilder}.
     *
     * @param targetSchema - The schema used as the service identifier.
     * @param funcSchema - A {@link FunctionSchemaBuilder} describing the
     *   dependency schemas via its parameters.
     * @param implementation - A function receiving the resolved dependencies
     *   and returning the service instance.
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @see {@link addSingletonFromSchema}
     * @see {@link addTransientFromSchema}
     */
    public addScopedFromSchema<
        TTargetSchema extends SchemaBuilder<any, any, any, any, any>,
        TFuncSchema extends FunctionSchemaBuilder<any, any, any, any, any, any>
    >(
        targetSchema: TTargetSchema,
        funcSchema: TFuncSchema,
        implementation: (
            ...args: FuncSchemaParameters<TFuncSchema>
        ) => InferType<TTargetSchema>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#addFromSchema(
            targetSchema,
            funcSchema,
            implementation,
            ServiceLifetime.Scoped,
            options
        );
    }

    /**
     * Registers a {@link ServiceLifetime.Transient | Transient} service whose
     * dependencies are described by a {@link FunctionSchemaBuilder}.
     *
     * @param targetSchema - The schema used as the service identifier.
     * @param funcSchema - A {@link FunctionSchemaBuilder} describing the
     *   dependency schemas via its parameters.
     * @param implementation - A function receiving the resolved dependencies
     *   and returning the service instance.
     * @param options - Optional {@link ServiceRegistrationOptions}.
     * @returns `this` for chaining.
     *
     * @see {@link addSingletonFromSchema}
     * @see {@link addScopedFromSchema}
     */
    public addTransientFromSchema<
        TTargetSchema extends SchemaBuilder<any, any, any, any, any>,
        TFuncSchema extends FunctionSchemaBuilder<any, any, any, any, any, any>
    >(
        targetSchema: TTargetSchema,
        funcSchema: TFuncSchema,
        implementation: (
            ...args: FuncSchemaParameters<TFuncSchema>
        ) => InferType<TTargetSchema>,
        options?: ServiceRegistrationOptions
    ): this {
        return this.#addFromSchema(
            targetSchema,
            funcSchema,
            implementation,
            ServiceLifetime.Transient,
            options
        );
    }

    /**
     * Creates a new {@link ServiceProvider} from the registrations currently
     * contained in this collection.
     *
     * @param options - Optional {@link ServiceProviderOptions} to control
     *   provider behaviour (e.g. scope validation).
     * @returns A new {@link ServiceProvider} instance.
     *
     * @example
     * ```ts
     * const provider = services.buildServiceProvider();
     * const logger = provider.get(ILogger);
     * ```
     *
     * @example With scope validation disabled
     * ```ts
     * const provider = services.buildServiceProvider({
     *     validateScopes: false
     * });
     * ```
     */
    public buildServiceProvider(
        options?: ServiceProviderOptions
    ): ServiceProvider {
        const descriptors = new Map(this.#descriptors);
        return new ServiceProvider(descriptors, options);
    }

    #add<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema,
        lifetime: ServiceLifetime,
        factoryOrValue: ServiceFactory<InferType<TSchema>> | InferType<TSchema>,
        options?: ServiceRegistrationOptions
    ): this {
        const factory: ServiceFactory<InferType<TSchema>> =
            typeof factoryOrValue === 'function'
                ? (factoryOrValue as ServiceFactory<InferType<TSchema>>)
                : () => factoryOrValue;

        this.#descriptors.set(schema, {
            schema,
            lifetime,
            factory,
            validate: options?.validate ?? false
        });

        return this;
    }

    #addFromSchema<
        TTargetSchema extends SchemaBuilder<any, any, any, any, any>,
        TFuncSchema extends FunctionSchemaBuilder<any, any, any, any, any, any>
    >(
        targetSchema: TTargetSchema,
        funcSchema: TFuncSchema,
        implementation: (
            ...args: FuncSchemaParameters<TFuncSchema>
        ) => InferType<TTargetSchema>,
        lifetime: ServiceLifetime,
        options?: ServiceRegistrationOptions
    ): this {
        const parameterSchemas = funcSchema.introspect().parameters;

        const factory: ServiceFactory<InferType<TTargetSchema>> = provider => {
            const args = parameterSchemas.map(paramSchema =>
                provider.get(paramSchema)
            );
            return (implementation as Function).apply(null, args);
        };

        this.#descriptors.set(targetSchema, {
            schema: targetSchema,
            lifetime,
            factory,
            validate: options?.validate ?? false
        });

        return this;
    }
}

/**
 * Extracts the parameter types from a {@link FunctionSchemaBuilder} as a tuple.
 * Used internally to type-check `addSingletonFromSchema`-style registrations.
 */
type FuncSchemaParameters<
    T extends FunctionSchemaBuilder<any, any, any, any, any, any>
> =
    T extends FunctionSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        infer TParams extends SchemaBuilder<any, any, any, any, any>[]
    >
        ? { [K in keyof TParams]: InferType<TParams[K]> }
        : never;
