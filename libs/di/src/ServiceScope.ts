import type {
    FunctionSchemaBuilder,
    InferType,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { ServiceProvider } from './ServiceProvider.js';
import type { IServiceProvider, ServiceDescriptor } from './types.js';
import { isAsyncDisposable, isDisposable, ServiceLifetime } from './types.js';

/**
 * A scoped service container that caches {@link ServiceLifetime.Scoped | Scoped}
 * services for the duration of its lifetime. Obtain instances via
 * {@link ServiceProvider.createScope}.
 *
 * The scope tracks all created scoped services that implement `Disposable` or
 * `AsyncDisposable` and disposes them in reverse creation order (LIFO) when the
 * scope is disposed. This matches .NET's scope disposal semantics.
 *
 * Supports the `using` keyword via `Symbol.dispose` and `Symbol.asyncDispose`:
 *
 * @example Synchronous disposal
 * ```ts
 * using scope = provider.createScope();
 * const db = scope.serviceProvider.get(IDbContext);
 * // db is automatically disposed when the block exits
 * ```
 *
 * @example Asynchronous disposal
 * ```ts
 * await using scope = provider.createScope();
 * const db = scope.serviceProvider.get(IDbContext);
 * // db is asynchronously disposed when the block exits
 * ```
 *
 * @example Manual disposal
 * ```ts
 * const scope = provider.createScope();
 * try {
 *     const db = scope.serviceProvider.get(IDbContext);
 *     // use db...
 * } finally {
 *     await scope.asyncDispose();
 * }
 * ```
 *
 * @see {@link ServiceProvider.createScope}
 * @see {@link ServiceLifetime.Scoped}
 */
export class ServiceScope implements Disposable, AsyncDisposable {
    readonly #descriptors: Map<
        SchemaBuilder<any, any, any, any, any>,
        ServiceDescriptor
    >;
    readonly #singletonCache: Map<SchemaBuilder<any, any, any, any, any>, any>;
    readonly #scopedCache: Map<SchemaBuilder<any, any, any, any, any>, any> =
        new Map();
    readonly #disposables: any[] = [];
    #disposed = false;

    /**
     * A child {@link IServiceProvider} that resolves services within this scope.
     *
     * - **Singleton** services are resolved from the root provider's cache.
     * - **Scoped** services are resolved from this scope's cache (created on
     *   first access, reused within the scope).
     * - **Transient** services create a new instance on every call.
     *
     * @example
     * ```ts
     * const scope = provider.createScope();
     * const db = scope.serviceProvider.get(IDbContext); // scoped
     * const logger = scope.serviceProvider.get(ILogger); // singleton from root
     * ```
     */
    public readonly serviceProvider: ScopedServiceProvider;

    /**
     * @hidden
     */
    constructor(
        descriptors: Map<
            SchemaBuilder<any, any, any, any, any>,
            ServiceDescriptor
        >,
        singletonCache: Map<SchemaBuilder<any, any, any, any, any>, any>
    ) {
        this.#descriptors = descriptors;
        this.#singletonCache = singletonCache;
        this.serviceProvider = new ScopedServiceProvider(this);
    }

    /**
     * Synchronously disposes all scoped services that implement
     * `Symbol.dispose`, in reverse creation order (LIFO).
     *
     * Services that only implement `Symbol.asyncDispose` are skipped (a
     * warning is logged to the console). Use {@link asyncDispose} to properly
     * dispose all services including async ones.
     *
     * @throws Re-throws the first error encountered during disposal, but
     *   still attempts to dispose remaining services.
     */
    public dispose(): void {
        if (this.#disposed) return;
        this.#disposed = true;

        let firstError: unknown;

        // Dispose in reverse order (LIFO)
        for (let i = this.#disposables.length - 1; i >= 0; i--) {
            const instance = this.#disposables[i];
            try {
                if (isDisposable(instance)) {
                    instance[Symbol.dispose]();
                }
                // async-only disposables are skipped during sync disposal —
                // use asyncDispose() to properly clean up async resources.
            } catch (err) {
                if (!firstError) firstError = err;
            }
        }

        this.#scopedCache.clear();

        if (firstError) throw firstError;
    }

    /**
     * Asynchronously disposes all scoped services that implement
     * `Symbol.asyncDispose` or `Symbol.dispose`, in reverse creation order
     * (LIFO).
     *
     * For each service:
     * - If it implements `Symbol.asyncDispose`, that method is awaited.
     * - Otherwise, if it implements `Symbol.dispose`, that method is called
     *   synchronously.
     *
     * @throws Re-throws the first error encountered during disposal, but
     *   still attempts to dispose remaining services.
     */
    public async asyncDispose(): Promise<void> {
        if (this.#disposed) return;
        this.#disposed = true;

        let firstError: unknown;

        // Dispose in reverse order (LIFO)
        for (let i = this.#disposables.length - 1; i >= 0; i--) {
            const instance = this.#disposables[i];
            try {
                if (isAsyncDisposable(instance)) {
                    await instance[Symbol.asyncDispose]();
                } else if (isDisposable(instance)) {
                    instance[Symbol.dispose]();
                }
            } catch (err) {
                if (!firstError) firstError = err;
            }
        }

        this.#scopedCache.clear();

        if (firstError) throw firstError;
    }

    /**
     * Implements the synchronous `Disposable` protocol. Delegates to
     * {@link dispose}.
     *
     * @example
     * ```ts
     * using scope = provider.createScope();
     * ```
     */
    [Symbol.dispose](): void {
        this.dispose();
    }

    /**
     * Implements the asynchronous `AsyncDisposable` protocol. Delegates to
     * {@link asyncDispose}.
     *
     * @example
     * ```ts
     * await using scope = provider.createScope();
     * ```
     */
    async [Symbol.asyncDispose](): Promise<void> {
        await this.asyncDispose();
    }

    /**
     * @hidden
     */
    getDescriptors(): Map<
        SchemaBuilder<any, any, any, any, any>,
        ServiceDescriptor
    > {
        return this.#descriptors;
    }

    /**
     * @hidden
     */
    getSingletonCache(): Map<SchemaBuilder<any, any, any, any, any>, any> {
        return this.#singletonCache;
    }

    /**
     * @hidden
     */
    getScopedCache(): Map<SchemaBuilder<any, any, any, any, any>, any> {
        return this.#scopedCache;
    }

    /**
     * @hidden
     */
    trackDisposable(instance: any): void {
        if (isDisposable(instance) || isAsyncDisposable(instance)) {
            this.#disposables.push(instance);
        }
    }
}

/**
 * A service provider scoped to a {@link ServiceScope}. Resolves scoped
 * services from the scope's cache and singletons from the root cache.
 *
 * This class is not instantiated directly — obtain it via
 * `scope.serviceProvider`.
 *
 * @see {@link ServiceScope}
 */
export class ScopedServiceProvider implements IServiceProvider {
    readonly #scope: ServiceScope;

    /**
     * @hidden
     */
    constructor(scope: ServiceScope) {
        this.#scope = scope;
    }

    /**
     * Resolves a service within this scope.
     *
     * - **Singleton** services are resolved from the root provider's cache.
     * - **Scoped** services are created once per scope and cached.
     * - **Transient** services are created fresh on every call.
     *
     * @param schema - The schema instance used as the service identifier.
     * @returns The resolved service, typed as `InferType<typeof schema>`.
     * @throws {Error} If the schema is not registered.
     * @throws {Error} If a circular dependency is detected.
     *
     * @example
     * ```ts
     * using scope = provider.createScope();
     * const db = scope.serviceProvider.get(IDbContext);
     * ```
     */
    public get<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> {
        return this.#resolve(schema, new Set());
    }

    /**
     * Resolves a service within this scope, or returns `undefined` if not
     * registered.
     *
     * @param schema - The schema instance used as the service identifier.
     * @returns The resolved service or `undefined`.
     */
    public getOptional<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> | undefined {
        if (!this.#scope.getDescriptors().has(schema)) {
            return undefined;
        }
        return this.#resolve(schema, new Set());
    }

    /**
     * Resolves the dependencies described by a {@link FunctionSchemaBuilder}
     * and calls `implementation` with the resolved values. Scoped services
     * are resolved within this scope.
     *
     * @param funcSchema - A {@link FunctionSchemaBuilder} whose parameters
     *   describe the services to inject.
     * @param implementation - A function whose parameters match the
     *   `funcSchema` parameter types.
     * @returns The return value of `implementation`.
     *
     * @example
     * ```ts
     * using scope = provider.createScope();
     * const result = scope.serviceProvider.invoke(handler, (logger, db) => {
     *     logger.info('Handling request');
     *     return db.query('SELECT 1');
     * });
     * ```
     *
     * @see {@link ServiceProvider.invoke}
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

    #resolve(
        schema: SchemaBuilder<any, any, any, any, any>,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>
    ): any {
        const descriptors = this.#scope.getDescriptors();
        const descriptor = descriptors.get(schema);
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
                const singletonCache = this.#scope.getSingletonCache();
                if (singletonCache.has(schema)) {
                    return singletonCache.get(schema);
                }
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack
                );
                resolutionStack.delete(schema);
                singletonCache.set(schema, instance);
                return instance;
            }

            case ServiceLifetime.Scoped: {
                const scopedCache = this.#scope.getScopedCache();
                if (scopedCache.has(schema)) {
                    return scopedCache.get(schema);
                }
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack
                );
                resolutionStack.delete(schema);
                scopedCache.set(schema, instance);
                this.#scope.trackDisposable(instance);
                return instance;
            }

            case ServiceLifetime.Transient: {
                resolutionStack.add(schema);
                const instance = this.#createAndValidate(
                    descriptor,
                    resolutionStack
                );
                resolutionStack.delete(schema);
                return instance;
            }
        }
    }

    /**
     * Internal resolution entry point that reuses an existing resolution
     * stack. Called by {@link ScopedResolverProxy} to propagate the stack
     * across factory-to-factory calls, enabling circular dependency
     * detection across the full chain.
     *
     * @hidden
     */
    resolveWithStack(
        schema: SchemaBuilder<any, any, any, any, any>,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>
    ): any {
        return this.#resolve(schema, resolutionStack);
    }

    #createAndValidate(
        descriptor: ServiceDescriptor,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>
    ): any {
        const childProxy = new ScopedResolverProxy(this, resolutionStack);
        const instance = descriptor.factory(childProxy);

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
}

/**
 * Internal proxy used during factory invocation within a scope.
 * Routes resolution back through the ScopedServiceProvider with the current
 * resolution stack for circular dependency detection.
 *
 * @hidden
 */
class ScopedResolverProxy implements IServiceProvider {
    readonly #provider: ScopedServiceProvider;
    readonly #resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>;

    constructor(
        provider: ScopedServiceProvider,
        resolutionStack: Set<SchemaBuilder<any, any, any, any, any>>
    ) {
        this.#provider = provider;
        this.#resolutionStack = resolutionStack;
    }

    get<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> {
        return this.#provider.resolveWithStack(schema, this.#resolutionStack);
    }

    getOptional<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): InferType<TSchema> | undefined {
        return this.#provider.getOptional(schema);
    }
}
