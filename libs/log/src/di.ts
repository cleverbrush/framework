import type { Logger } from './Logger.js';

/**
 * DI service key for the `Logger` instance.
 *
 * Uses a symbol-based key for use with `@cleverbrush/di` `ServiceCollection`.
 * In the absence of `@cleverbrush/di`, this serves as a plain token.
 */
export const ILogger = Symbol.for('ILogger') as unknown as {
    __brand: 'ILogger';
};

/**
 * Configures logging services in the DI container.
 *
 * Registers the root logger as a singleton and optionally sets up
 * scoped loggers that auto-enrich with request context.
 *
 * @param services - the `ServiceCollection` to register with
 * @param logger - the root logger instance
 *
 * @example
 * ```ts
 * const server = new ServerBuilder()
 *     .services((svc) => {
 *         configureLogging(svc, logger);
 *     })
 *     .build();
 * ```
 */
export function configureLogging(services: any, logger: Logger): void {
    // Register as singleton — consumers get the same logger instance
    if (typeof services.addSingleton === 'function') {
        services.addSingleton(ILogger, () => logger);
    }
}
