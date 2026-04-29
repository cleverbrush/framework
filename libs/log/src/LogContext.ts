import { AsyncLocalStorage } from 'node:async_hooks';
import type { Logger } from './Logger.js';

/**
 * Store shape for the ambient log context.
 */
export interface LogContextStore {
    logger: Logger;
    correlationId?: string;
    properties?: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<LogContextStore>();

/**
 * Ambient logger context using `AsyncLocalStorage`.
 *
 * Zero overhead when not used — the `AsyncLocalStorage` instance
 * is only created once, and `getStore()` is a near-zero-cost operation.
 *
 * @example
 * ```ts
 * LogContext.run(logger, async () => {
 *     const log = LogContext.current()!;
 *     log.info('Inside context');
 * });
 * ```
 */
export const LogContext = {
    /**
     * Runs a callback with the given logger as the ambient context.
     *
     * @param logger - the logger to set as ambient
     * @param fn - the async function to run within the context
     * @returns the result of the callback
     */
    run<T>(logger: Logger, fn: () => T): T {
        return storage.run({ logger }, fn);
    },

    /**
     * Returns the ambient logger, or `undefined` if no context is active.
     */
    current(): Logger | undefined {
        return storage.getStore()?.logger;
    },

    /**
     * Returns the raw store, useful for enrichers to read correlation IDs.
     */
    getStore(): LogContextStore | undefined {
        return storage.getStore();
    },

    /**
     * Runs a callback with additional enrichment properties added
     * to the ambient logger context.
     *
     * @param properties - additional properties to add to the context logger
     * @param fn - the async function to run
     * @returns the result of the callback
     */
    enrichWith<T>(properties: Record<string, unknown>, fn: () => T): T {
        const current = storage.getStore();
        if (!current) {
            throw new Error(
                'LogContext.enrichWith() called outside of LogContext.run()'
            );
        }
        const enrichedLogger = current.logger.forContext(properties);
        return storage.run(
            {
                ...current,
                logger: enrichedLogger,
                properties: {
                    ...current.properties,
                    ...properties
                }
            },
            fn
        );
    },

    /**
     * Runs a callback with a correlation ID set in the ambient context.
     *
     * @param correlationId - the correlation ID to set
     * @param fn - the async function to run
     * @returns the result of the callback
     */
    runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
        const current = storage.getStore();
        const logger = current?.logger;
        if (!logger) {
            throw new Error(
                'LogContext.runWithCorrelationId() called outside of LogContext.run()'
            );
        }
        return storage.run({ ...current, logger, correlationId }, fn);
    }
};
