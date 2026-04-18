/**
 * @cleverbrush/di — .NET-style dependency injection for TypeScript.
 *
 * Uses `@cleverbrush/schema` instances as service keys for type-safe
 * registration and resolution. Supports singleton, scoped, and transient
 * lifetimes, function injection via {@link FunctionSchemaBuilder}, and
 * automatic disposal of scoped services.
 *
 * @example Quick start
 * ```ts
 * import { ServiceCollection } from '@cleverbrush/di';
 * import { object, string, number, func } from '@cleverbrush/schema';
 *
 * // Define service contracts as schemas
 * const IConfig = object({ port: number(), host: string() });
 * const ILogger = object({ info: func().addParameter(string()) });
 *
 * // Register services
 * const services = new ServiceCollection();
 * services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
 * services.addSingleton(ILogger, () => ({ info: console.log }));
 *
 * // Build the provider
 * const provider = services.buildServiceProvider();
 *
 * // Resolve — fully typed, no generics needed
 * const config = provider.get(IConfig);
 * config.port; // number
 * ```
 *
 * @packageDocumentation
 */

export {
    ServiceCollection,
    type ServiceProviderOptions
} from './ServiceCollection.js';

export { ServiceProvider } from './ServiceProvider.js';

export { ScopedServiceProvider, ServiceScope } from './ServiceScope.js';

export {
    type IServiceProvider,
    isAsyncDisposable,
    isDisposable,
    type ServiceDescriptor,
    type ServiceFactory,
    ServiceLifetime,
    type ServiceRegistrationOptions
} from './types.js';
