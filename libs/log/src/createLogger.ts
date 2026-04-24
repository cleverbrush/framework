import type { Enricher } from './Enricher.js';
import type { LogFilter } from './Filter.js';
import { Logger } from './Logger.js';
import { LoggerPipeline } from './LoggerPipeline.js';
import { LogLevel, type LogLevelName, parseLogLevel } from './LogLevel.js';
import type { LogSink } from './Sink.js';

/**
 * Configuration for creating a structured logger.
 */
export interface LoggerConfig {
    /** Minimum log level (name or numeric). @default 'information' */
    minimumLevel?: LogLevelName | LogLevel;
    /** Namespace-level overrides for minimum log level. */
    levelOverrides?: Record<string, LogLevelName>;
    /** Output sinks for log events. */
    sinks: LogSink[];
    /** Enrichers that add properties to every event. */
    enrichers?: Enricher[];
    /** Filters that determine which events pass through. */
    filters?: LogFilter[];
    /** Maximum queued events before dropping. @default 10000 */
    maxQueueSize?: number;
    /** Policy when queue is full. @default 'dropOldest' */
    dropPolicy?: 'dropOldest' | 'dropNewest' | 'block';
    /** Whether to hook `SIGTERM` and `beforeExit` for flush. @default false */
    handleProcessExit?: boolean;
}

/**
 * Creates a structured logger with the specified configuration.
 *
 * The logger uses fire-and-forget semantics — log methods are synchronous
 * and push events into an internal async pipeline. Events flow through
 * enrichers, filters, and level overrides before being dispatched to sinks.
 *
 * @param config - logger configuration including sinks, enrichers, and filters
 * @returns a configured `Logger` instance that implements `AsyncDisposable`
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *     minimumLevel: 'information',
 *     sinks: [consoleSink({ theme: 'dark' })],
 *     enrichers: [hostnameEnricher()],
 * });
 *
 * logger.info('Server started on port {Port}', { Port: 3000 });
 * ```
 *
 * @see {@link Logger} for the full Logger API
 * @see {@link LoggerConfig} for configuration options
 */
export function createLogger(config: LoggerConfig): Logger {
    if (!config.sinks || config.sinks.length === 0) {
        throw new Error('createLogger requires at least one sink');
    }

    const minimumLevel =
        typeof config.minimumLevel === 'string'
            ? parseLogLevel(config.minimumLevel)
            : (config.minimumLevel ?? LogLevel.Information);

    const pipeline = new LoggerPipeline({
        minimumLevel,
        levelOverrides: config.levelOverrides,
        sinks: config.sinks,
        enrichers: config.enrichers,
        filters: config.filters,
        maxQueueSize: config.maxQueueSize,
        dropPolicy: config.dropPolicy
    });

    const logger = new Logger(pipeline);

    if (config.handleProcessExit) {
        const onExit = () => {
            logger.dispose().catch(() => {
                // Best-effort flush on exit
            });
        };
        process.on('SIGTERM', onExit);
        process.on('beforeExit', onExit);
    }

    return logger;
}
