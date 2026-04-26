import { describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { callerEnricher } from './caller.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: {}
};

describe('callerEnricher', () => {
    const enricher = callerEnricher();

    it('adds SourceFile and SourceLine for the calling frame', () => {
        const enriched = enricher(baseEvent);

        expect(enriched.properties.SourceFile).toBeTypeOf('string');
        expect(enriched.properties.SourceLine).toBeTypeOf('number');
        // SourceFile should not point to the log library itself.
        expect(enriched.properties.SourceFile as string).not.toContain(
            '/log/src/'
        );
    });

    it('does not mutate the original event', () => {
        enricher(baseEvent);
        expect(baseEvent.properties.SourceFile).toBeUndefined();
    });

    it('returns the event unchanged when no stack is available', () => {
        const original = Error.captureStackTrace;
        // Simulate a runtime where captureStackTrace produces no stack.
        Error.captureStackTrace = ((obj: { stack?: string }) => {
            obj.stack = undefined;
        }) as typeof Error.captureStackTrace;
        try {
            const out = enricher(baseEvent);
            expect(out).toBe(baseEvent);
        } finally {
            Error.captureStackTrace = original;
        }
    });

    it('returns event unchanged when non-library frame has no file:line pattern', () => {
        const original = Error.captureStackTrace;
        // Produce a stack where the first non-library frame has no regex match
        Error.captureStackTrace = ((obj: { stack?: string }) => {
            obj.stack = 'Error\n    at <anonymous>\n    at native code';
        }) as typeof Error.captureStackTrace;
        try {
            const out = enricher(baseEvent);
            expect(out).toBe(baseEvent);
        } finally {
            Error.captureStackTrace = original;
        }
    });
});
