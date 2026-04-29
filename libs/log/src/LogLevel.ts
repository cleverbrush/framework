/**
 * Log severity levels as a const object.
 *
 * Use as values (`LogLevel.Information`) or as a type (`LogLevel`).
 * Levels are ordered numerically — higher values indicate greater severity.
 *
 * @example
 * ```ts
 * if (logger.isEnabled(LogLevel.Debug)) {
 *     logger.debug('Expensive computation: {@Result}', { Result: compute() });
 * }
 * ```
 */
export const LogLevel = {
    Trace: 0,
    Debug: 1,
    Information: 2,
    Warning: 3,
    Error: 4,
    Fatal: 5
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Log level name strings for configuration and display.
 */
export type LogLevelName =
    | 'trace'
    | 'debug'
    | 'information'
    | 'warning'
    | 'error'
    | 'fatal';

const levelNameMap: Record<LogLevelName, LogLevel> = {
    trace: LogLevel.Trace,
    debug: LogLevel.Debug,
    information: LogLevel.Information,
    warning: LogLevel.Warning,
    error: LogLevel.Error,
    fatal: LogLevel.Fatal
};

const levelStringMap: Record<LogLevel, LogLevelName> = {
    [LogLevel.Trace]: 'trace',
    [LogLevel.Debug]: 'debug',
    [LogLevel.Information]: 'information',
    [LogLevel.Warning]: 'warning',
    [LogLevel.Error]: 'error',
    [LogLevel.Fatal]: 'fatal'
};

/**
 * Parses a log level name string to a `LogLevel` numeric value.
 *
 * @param name - case-insensitive level name
 * @returns the numeric `LogLevel` value
 */
export function parseLogLevel(name: string): LogLevel {
    const normalized = name.toLowerCase() as LogLevelName;
    const level = levelNameMap[normalized];
    if (level === undefined) {
        throw new Error(
            `Invalid log level: "${name}". Valid levels: ${Object.keys(levelNameMap).join(', ')}`
        );
    }
    return level;
}

/**
 * Converts a `LogLevel` numeric value to its string name.
 *
 * @param level - the numeric log level
 * @returns the level name string
 */
export function levelToString(level: LogLevel): LogLevelName {
    return levelStringMap[level] ?? 'information';
}

/**
 * Three-letter abbreviation for display in console output.
 */
export function levelToShortString(level: LogLevel): string {
    switch (level) {
        case LogLevel.Trace:
            return 'TRC';
        case LogLevel.Debug:
            return 'DBG';
        case LogLevel.Information:
            return 'INF';
        case LogLevel.Warning:
            return 'WRN';
        case LogLevel.Error:
            return 'ERR';
        case LogLevel.Fatal:
            return 'FTL';
        default:
            return 'INF';
    }
}
