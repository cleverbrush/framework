import type { InferType, SchemaBuilder } from '@cleverbrush/schema';

/**
 * Defines the lifetime of a service within the dependency injection container.
 *
 * The lifetime determines when a new instance is created versus when a cached
 * instance is returned.
 *
 * @example
 * ```ts
 * import { ServiceCollection, ServiceLifetime } from '@cleverbrush/di';
 * import { object, string } from '@cleverbrush/schema';
 *
 * const ILogger = object({ info: func() });
 *
 * const services = new ServiceCollection();
 * // Equivalent to services.addSingleton(ILogger, ...)
 * services.add(ILogger, () => console, ServiceLifetime.Singleton);
 * ```
 *
 * @see {@link ServiceCollection}
 */
export enum ServiceLifetime {
    /**
     * A new instance is created every time the service is resolved.
     *
     * Use for lightweight, stateless services.
     */
    Transient = 'Transient',

    /**
     * One instance is created per {@link ServiceScope}. The same instance is
     * returned for every resolution within that scope.
     *
     * Use for services that should be shared within a single unit of work
     * (e.g. an HTTP request) but isolated between units.
     */
    Scoped = 'Scoped',

    /**
     * One instance is created for the entire lifetime of the
     * {@link ServiceProvider}. All subsequent resolutions return the same instance.
     *
     * Use for expensive-to-create or truly global services (loggers,
     * configuration, connection pools).
     */
    Singleton = 'Singleton'
}

/**
 * A factory function that creates a service instance, optionally resolving
 * other services from the provided {@link ServiceProvider}.
 *
 * @typeParam T - The type of the service instance the factory creates.
 *
 * @example
 * ```ts
 * const loggerFactory: ServiceFactory<Logger> = (provider) => {
 *     const config = provider.get(IConfig);
 *     return new Logger(config.logLevel);
 * };
 * ```
 *
 * @see {@link ServiceCollection}
 */
export type ServiceFactory<T> = (provider: IServiceProvider) => T;

/**
 * Describes a registered service: its schema key, lifetime, factory, and
 * optional runtime validation flag.
 *
 * @typeParam T - The type of the service instance.
 *
 * @see {@link ServiceCollection}
 * @see {@link ServiceLifetime}
 */
export interface ServiceDescriptor<T = any> {
    /** The schema used as the service identifier (reference equality). */
    readonly schema: SchemaBuilder<T, any, any, any, any>;

    /** The lifetime of the service. */
    readonly lifetime: ServiceLifetime;

    /** The factory function that creates the service instance. */
    readonly factory: ServiceFactory<T>;

    /**
     * When `true`, the container validates the factory's return value against
     * the schema at resolution time using `schema.validate()`.
     *
     * @defaultValue `false`
     */
    readonly validate: boolean;
}

/**
 * Options for service registration.
 *
 * @see {@link ServiceCollection.addSingleton}
 * @see {@link ServiceCollection.addScoped}
 * @see {@link ServiceCollection.addTransient}
 */
export interface ServiceRegistrationOptions {
    /**
     * When `true`, the resolved value is validated against the schema at
     * resolution time. Useful for development/debugging. Has a performance
     * cost proportional to the schema complexity.
     *
     * @defaultValue `false`
     */
    validate?: boolean;
}

/**
 * Minimal interface for the service provider, used to avoid circular
 * dependencies between modules.
 *
 * @see {@link ServiceProvider}
 */
export interface IServiceProvider {
    /**
     * Resolves a service by its schema key.
     * @param schema - The schema instance used as the service identifier.
     * @throws If the service is not registered.
     */
    get<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema>;

    /**
     * Resolves a service by its schema key, or returns `undefined` if not registered.
     * @param schema - The schema instance used as the service identifier.
     */
    getOptional<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> | undefined;
}

/**
 * Checks whether a value implements the synchronous `Disposable` protocol
 * (`Symbol.dispose`).
 *
 * @param value - The value to check.
 * @returns `true` if `value` has a `Symbol.dispose` method.
 *
 * @example
 * ```ts
 * const resource = {
 *     [Symbol.dispose]() { console.log('disposed'); }
 * };
 * isDisposable(resource); // true
 * isDisposable({});       // false
 * ```
 */
export function isDisposable(value: unknown): value is Disposable {
    return (
        value != null &&
        typeof value === 'object' &&
        Symbol.dispose in (value as object) &&
        typeof (value as Record<symbol, unknown>)[Symbol.dispose] === 'function'
    );
}

/**
 * Checks whether a value implements the asynchronous `Disposable` protocol
 * (`Symbol.asyncDispose`).
 *
 * @param value - The value to check.
 * @returns `true` if `value` has a `Symbol.asyncDispose` method.
 *
 * @example
 * ```ts
 * const connection = {
 *     async [Symbol.asyncDispose]() { await db.close(); }
 * };
 * isAsyncDisposable(connection); // true
 * isAsyncDisposable({});         // false
 * ```
 */
export function isAsyncDisposable(value: unknown): value is AsyncDisposable {
    return (
        value != null &&
        typeof value === 'object' &&
        Symbol.asyncDispose in (value as object) &&
        typeof (value as Record<symbol, unknown>)[Symbol.asyncDispose] ===
            'function'
    );
}
