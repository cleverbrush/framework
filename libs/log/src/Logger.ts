import type { LoggerPipeline } from './LoggerPipeline.js';
import { LogLevel, type LogLevelName, parseLogLevel } from './LogLevel.js';
import { createLogEvent } from './MessageTemplate.js';

/**
 * A typed message template created via `ParseStringSchemaBuilder`.
 *
 * When passed to a `Logger` log method, the logger uses `template` as the
 * `messageTemplate` (so events with the same shape are grouped in Seq /
 * HyperDX / ClickHouse) and derives the rendered message by interpolating
 * `template` with the supplied parameters.
 *
 * @example
 * ```ts
 * import { s } from '@cleverbrush/schema';
 *
 * // Build a reusable typed template once
 * const tmpl = s.parseString('Todo #{TodoId} "{Title}" created by {UserId}');
 *
 * // All log sites share the same messageTemplate → groupable in the UI
 * logger.info(tmpl, { TodoId: 1, Title: 'Buy milk', UserId: 'u-42' });
 * ```
 */
export interface TypedTemplate<T extends Record<string, unknown>> {
    serialize(params: T): string;
    /** The raw `{Property}` pattern string, used as `messageTemplate`. */
    readonly template?: string;
}

/**
 * Structured logger with per-level methods, child context support,
 * and `AsyncDisposable` for graceful shutdown.
 *
 * Log methods are synchronous and fire-and-forget — they push events
 * into an internal async microtask pipeline.
 *
 * Accepts both plain string templates and typed {@link TypedTemplate}
 * objects (produced by `ParseStringSchemaBuilder` from `@cleverbrush/schema`).
 * Typed templates carry a `template` property with the raw `{Property}` pattern,
 * which the logger uses as `messageTemplate` so all events of the same shape
 * are grouped correctly in Seq, HyperDX, ClickHouse, etc.
 *
 * @example
 * ```ts
 * logger.info('Server started on port {Port}', { Port: 3000 });
 *
 * const child = logger.forContext('SourceContext', 'OrderService');
 * child.info('Processing order {OrderId}', { OrderId: 42 });
 *
 * // Typed template — structured grouping
 * import { s } from '@cleverbrush/schema';
 * const tmpl = s.parseString('Order #{OrderId} placed by {UserId}');
 * child.info(tmpl, { OrderId: 1, UserId: 'u-99' });
 * ```
 */
export class Logger implements AsyncDisposable {
    readonly #pipeline: LoggerPipeline;
    readonly #contextProperties: Record<string, unknown>;
    #levelWatchInterval: ReturnType<typeof setInterval> | undefined;

    constructor(
        pipeline: LoggerPipeline,
        contextProperties?: Record<string, unknown>
    ) {
        this.#pipeline = pipeline;
        this.#contextProperties = contextProperties ?? {};
    }

    /**
     * Checks whether the given level is enabled for this logger.
     *
     * @param level - the log level to check
     * @returns `true` if events at this level would be processed
     */
    isEnabled(level: LogLevel): boolean {
        const sourceContext = this.#contextProperties.SourceContext as
            | string
            | undefined;
        return this.#pipeline.isEnabled(level, sourceContext);
    }

    /**
     * Creates a child logger with additional context properties.
     *
     * @param key - property name, or an object of key-value pairs
     * @param value - property value (when key is a string)
     * @returns a new `Logger` with merged context properties
     */
    forContext(key: string | Record<string, unknown>, value?: unknown): Logger {
        const extra = typeof key === 'string' ? { [key]: value } : key;
        return new Logger(this.#pipeline, {
            ...this.#contextProperties,
            ...extra
        });
    }

    /**
     * Changes the minimum log level at runtime.
     *
     * @param level - new minimum level (name string or numeric value)
     */
    setMinimumLevel(level: LogLevelName | LogLevel): void {
        this.#pipeline.minimumLevel =
            typeof level === 'string' ? parseLogLevel(level) : level;
    }

    /**
     * Polls an environment variable for log level changes.
     *
     * @param envVar - environment variable name to watch
     * @param intervalMs - polling interval in milliseconds (default: 30000)
     */
    watchLevel(envVar: string, intervalMs = 30_000): void {
        if (this.#levelWatchInterval) {
            clearInterval(this.#levelWatchInterval);
        }
        this.#levelWatchInterval = setInterval(() => {
            const val = process.env[envVar];
            if (val) {
                try {
                    this.setMinimumLevel(val.toLowerCase() as LogLevelName);
                } catch {
                    // ignore invalid values
                }
            }
        }, intervalMs);
        // Don't keep the process alive just for log level watching
        if (this.#levelWatchInterval.unref) {
            this.#levelWatchInterval.unref();
        }
    }

    // -----------------------------------------------------------------
    // Level methods
    // -----------------------------------------------------------------

    /** Log a trace-level message. */
    trace(template: string, properties?: Record<string, unknown>): void;
    trace<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    trace(
        template: string | TypedTemplate<any>,
        properties?: Record<string, unknown>
    ): void {
        this.#write(LogLevel.Trace, undefined, template, properties);
    }

    /** Log a debug-level message. */
    debug(template: string, properties?: Record<string, unknown>): void;
    debug<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    debug(
        template: string | TypedTemplate<any>,
        properties?: Record<string, unknown>
    ): void {
        this.#write(LogLevel.Debug, undefined, template, properties);
    }

    /** Log an information-level message. */
    info(template: string, properties?: Record<string, unknown>): void;
    info<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    info(
        template: string | TypedTemplate<any>,
        properties?: Record<string, unknown>
    ): void {
        this.#write(LogLevel.Information, undefined, template, properties);
    }

    /** Log a warning-level message. */
    warn(template: string, properties?: Record<string, unknown>): void;
    warn<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    warn(
        template: string | TypedTemplate<any>,
        properties?: Record<string, unknown>
    ): void {
        this.#write(LogLevel.Warning, undefined, template, properties);
    }

    /** Log an error-level message with an optional exception. */
    error(template: string, properties?: Record<string, unknown>): void;
    error(
        error: Error,
        template: string,
        properties?: Record<string, unknown>
    ): void;
    error<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    error<T extends Record<string, unknown>>(
        error: Error,
        template: TypedTemplate<T>,
        properties: T
    ): void;
    error(
        errorOrTemplate: Error | string | TypedTemplate<any>,
        templateOrProps?: string | TypedTemplate<any> | Record<string, unknown>,
        properties?: Record<string, unknown>
    ): void {
        if (errorOrTemplate instanceof Error) {
            this.#write(
                LogLevel.Error,
                errorOrTemplate,
                templateOrProps as string | TypedTemplate<any>,
                properties
            );
        } else {
            this.#write(
                LogLevel.Error,
                undefined,
                errorOrTemplate,
                templateOrProps as Record<string, unknown>
            );
        }
    }

    /** Log a fatal-level message with an optional exception. */
    fatal(template: string, properties?: Record<string, unknown>): void;
    fatal(
        error: Error,
        template: string,
        properties?: Record<string, unknown>
    ): void;
    fatal<T extends Record<string, unknown>>(
        template: TypedTemplate<T>,
        properties: T
    ): void;
    fatal<T extends Record<string, unknown>>(
        error: Error,
        template: TypedTemplate<T>,
        properties: T
    ): void;
    fatal(
        errorOrTemplate: Error | string | TypedTemplate<any>,
        templateOrProps?: string | TypedTemplate<any> | Record<string, unknown>,
        properties?: Record<string, unknown>
    ): void {
        if (errorOrTemplate instanceof Error) {
            this.#write(
                LogLevel.Fatal,
                errorOrTemplate,
                templateOrProps as string | TypedTemplate<any>,
                properties
            );
        } else {
            this.#write(
                LogLevel.Fatal,
                undefined,
                errorOrTemplate,
                templateOrProps as Record<string, unknown>
            );
        }
    }

    // -----------------------------------------------------------------
    // Flush & Dispose
    // -----------------------------------------------------------------

    /** Flushes all pending events through the pipeline to sinks. */
    async flush(): Promise<void> {
        return this.#pipeline.flush();
    }

    /** Flushes all sinks and releases resources. */
    async dispose(): Promise<void> {
        if (this.#levelWatchInterval) {
            clearInterval(this.#levelWatchInterval);
        }
        return this.#pipeline.dispose();
    }

    async [Symbol.asyncDispose](): Promise<void> {
        return this.dispose();
    }

    // -----------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------

    #write(
        level: LogLevel,
        exception: Error | undefined,
        template: string | TypedTemplate<any>,
        properties?: Record<string, unknown>
    ): void {
        if (!this.isEnabled(level)) return;

        let templateStr: string;
        const props = properties ?? {};

        if (typeof template === 'string') {
            templateStr = template;
        } else {
            // Typed template via ParseStringSchemaBuilder.
            // Use the raw {Property} pattern as messageTemplate so logs with
            // the same shape can be grouped in observability tools; the
            // rendered message is derived by createLogEvent from the pattern.
            templateStr = template.template ?? template.serialize(props);
        }

        const mergedProps = {
            ...this.#contextProperties,
            ...props
        };

        const event = createLogEvent(
            level,
            typeof template === 'string' ? templateStr : templateStr,
            mergedProps,
            exception
        );

        this.#pipeline.push(event);
    }
}
