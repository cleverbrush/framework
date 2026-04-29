import { formatClef } from '../formatters/ClefFormatter.js';
import type { LogEvent } from '../LogEvent.js';
import {
    LogLevel,
    type LogLevelName,
    levelToShortString,
    parseLogLevel
} from '../LogLevel.js';
import type { LogSink } from '../Sink.js';
import { safeSerialize } from '../serialization.js';

/**
 * Console sink configuration.
 */
export interface ConsoleSinkOptions {
    /** Output mode: `'pretty'` for colored human-readable, `'json'` for CLEF. @default 'pretty' */
    mode?: 'pretty' | 'json';
    /** Color theme for pretty mode. @default 'dark' */
    theme?: 'dark' | 'light' | 'none';
    /** Minimum level for this sink. @default undefined (uses pipeline level) */
    minimumLevel?: LogLevelName;
}

const LEVEL_COLORS_DARK: Record<LogLevel, string> = {
    [LogLevel.Trace]: '\x1b[90m', // gray
    [LogLevel.Debug]: '\x1b[36m', // cyan
    [LogLevel.Information]: '\x1b[32m', // green
    [LogLevel.Warning]: '\x1b[33m', // yellow
    [LogLevel.Error]: '\x1b[31m', // red
    [LogLevel.Fatal]: '\x1b[35m' // magenta
};

const LEVEL_COLORS_LIGHT: Record<LogLevel, string> = {
    [LogLevel.Trace]: '\x1b[37m',
    [LogLevel.Debug]: '\x1b[34m',
    [LogLevel.Information]: '\x1b[32m',
    [LogLevel.Warning]: '\x1b[33m',
    [LogLevel.Error]: '\x1b[31m',
    [LogLevel.Fatal]: '\x1b[35m'
};

const RESET = '\x1b[0m';

/**
 * Creates a console sink for log output.
 *
 * Supports two modes:
 * - `'pretty'` — colored, human-readable output (default for development)
 * - `'json'` — CLEF JSON output (for production / container logs)
 *
 * @param options - console sink configuration
 * @returns a `LogSink` that writes to stdout/stderr
 *
 * @example
 * ```ts
 * const sink = consoleSink({ theme: 'dark', minimumLevel: 'debug' });
 * ```
 */
export function consoleSink(options?: ConsoleSinkOptions): LogSink {
    const mode = options?.mode ?? 'pretty';
    const theme = options?.theme ?? 'dark';
    const minLevel = options?.minimumLevel
        ? parseLogLevel(options.minimumLevel)
        : undefined;
    const colors =
        theme === 'dark'
            ? LEVEL_COLORS_DARK
            : theme === 'light'
              ? LEVEL_COLORS_LIGHT
              : undefined;

    return {
        async emit(events: LogEvent[]): Promise<void> {
            for (const event of events) {
                if (minLevel !== undefined && event.level < minLevel) {
                    continue;
                }

                const output =
                    event.level >= LogLevel.Warning
                        ? process.stderr
                        : process.stdout;

                if (mode === 'json') {
                    output.write(formatClef(event) + '\n');
                } else {
                    const timestamp = formatTimestamp(event.timestamp);
                    const levelStr = levelToShortString(event.level);
                    const color = colors?.[event.level] ?? '';
                    const reset = colors ? RESET : '';

                    let line = `${color}[${timestamp} ${levelStr}]${reset} ${event.renderedMessage}\n`;

                    // Print properties (excluding common ones already in message)
                    const props = event.properties;
                    if (props && Object.keys(props).length > 0) {
                        for (const [key, value] of Object.entries(props)) {
                            const serialized = safeSerialize(value, {
                                maxDepth: 3
                            });
                            line += `  ${key}: ${JSON.stringify(serialized)}\n`;
                        }
                    }

                    if (event.exception) {
                        line += `  ${event.exception.stack ?? event.exception.message}\n`;
                    }

                    output.write(line);
                }
            }
        },

        async [Symbol.asyncDispose](): Promise<void> {
            // Console doesn't need cleanup
        }
    };
}

function formatTimestamp(date: Date): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
}
