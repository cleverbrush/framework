import type { LogFilter } from './Filter.js';
import { type LogLevel, type LogLevelName, parseLogLevel } from './LogLevel.js';

/**
 * Sampling rates per log level. Values are 0–1 where 1 = keep all, 0 = drop all.
 * Unspecified levels pass through unfiltered.
 */
export type SamplingRates = Partial<Record<LogLevelName, number>>;

/**
 * Creates a sampling filter for high-throughput scenarios.
 *
 * Only a fraction of events at the specified levels are kept,
 * reducing log volume without losing visibility at higher severity levels.
 *
 * @param rates - sampling rates per log level (0–1)
 * @returns a `LogFilter` that randomly samples events
 *
 * @example
 * ```ts
 * const filter = samplingFilter({ debug: 0.01, trace: 0.001 });
 * // Keeps 1% of debug events, 0.1% of trace events
 * ```
 */
export function samplingFilter(rates: SamplingRates): LogFilter {
    const resolvedRates = new Map<LogLevel, number>();
    for (const [name, rate] of Object.entries(rates)) {
        resolvedRates.set(
            parseLogLevel(name),
            Math.max(0, Math.min(1, rate as number))
        );
    }

    return event => {
        const rate = resolvedRates.get(event.level);
        if (rate === undefined) return true; // unspecified levels pass through
        return Math.random() < rate;
    };
}
