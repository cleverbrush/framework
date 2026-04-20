import type { Enricher } from '../Enricher.js';

/**
 * Enriches log events with the caller's source file and line number.
 *
 * **Warning:** This enricher uses `Error.captureStackTrace` internally,
 * which is expensive. Use only when needed for debugging.
 *
 * @returns an enricher that adds `{ SourceFile: '...', SourceLine: number }`
 */
export function callerEnricher(): Enricher {
    return event => {
        const err: { stack?: string } = {};
        Error.captureStackTrace(err);
        const stack = err.stack;
        if (!stack) return event;

        // Skip internal frames to find the caller
        const lines = stack.split('\n');
        // Find the first line that isn't from the log library itself
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (
                !line.includes('/log/src/') &&
                !line.includes('@cleverbrush/log')
            ) {
                const match = line.match(/\(?(.*?):(\d+):\d+\)?$/);
                if (match) {
                    return {
                        ...event,
                        properties: {
                            ...event.properties,
                            SourceFile: match[1],
                            SourceLine: parseInt(match[2], 10)
                        }
                    };
                }
                break;
            }
        }
        return event;
    };
}
