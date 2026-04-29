import type { LogEvent } from '../LogEvent.js';
import { type LogLevelName, parseLogLevel } from '../LogLevel.js';
import type { LogSink } from '../Sink.js';

/**
 * Configuration for a quick custom sink.
 */
export interface CreateSinkOptions {
    /** Minimum level for this sink. */
    minimumLevel?: LogLevelName;
    /** The emit function that writes events. */
    emit: (events: LogEvent[]) => Promise<void>;
    /** Optional flush function. */
    flush?: () => Promise<void>;
    /** Optional dispose function. */
    dispose?: () => Promise<void>;
}

/**
 * Creates a simple `LogSink` from an emit function.
 *
 * @param options - sink configuration with emit function
 * @returns a `LogSink` instance
 *
 * @example
 * ```ts
 * const sink = createSink({
 *     minimumLevel: 'error',
 *     emit: async (events) => {
 *         for (const event of events) {
 *             await sendAlert(event.renderedMessage);
 *         }
 *     },
 * });
 * ```
 */
export function createSink(options: CreateSinkOptions): LogSink {
    const minLevel = options.minimumLevel
        ? parseLogLevel(options.minimumLevel)
        : undefined;

    return {
        async emit(events: LogEvent[]): Promise<void> {
            const filtered =
                minLevel !== undefined
                    ? events.filter(e => e.level >= minLevel!)
                    : events;
            if (filtered.length > 0) {
                await options.emit(filtered);
            }
        },

        flush: options.flush,

        async [Symbol.asyncDispose](): Promise<void> {
            if (options.dispose) {
                await options.dispose();
            }
        }
    };
}
