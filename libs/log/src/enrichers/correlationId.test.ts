import { describe, expect, it } from 'vitest';
import { LogContext } from '../LogContext.js';
import type { LogEvent } from '../LogEvent.js';
import type { Logger } from '../Logger.js';
import { LogLevel } from '../LogLevel.js';
import { correlationIdEnricher } from './correlationId.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: {}
};

const fakeLogger = {} as Logger;

describe('correlationIdEnricher', () => {
    const enricher = correlationIdEnricher();

    it('returns the event unchanged when no LogContext is active', () => {
        const enriched = enricher(baseEvent);
        expect(enriched).toBe(baseEvent);
    });

    it('returns the event unchanged when context has no correlationId', () => {
        LogContext.run(fakeLogger, () => {
            const enriched = enricher(baseEvent);
            expect(enriched).toBe(baseEvent);
        });
    });

    it('adds CorrelationId from the active context', () => {
        LogContext.run(fakeLogger, () => {
            LogContext.runWithCorrelationId('req-123', () => {
                const enriched = enricher(baseEvent);
                expect(enriched.properties.CorrelationId).toBe('req-123');
            });
        });
    });

    it('isolates context between async branches', async () => {
        const seen: (string | undefined)[] = [];

        await Promise.all([
            new Promise<void>(resolve =>
                LogContext.run(fakeLogger, () => {
                    LogContext.runWithCorrelationId('a', () => {
                        seen.push(
                            enricher(baseEvent).properties.CorrelationId as
                                | string
                                | undefined
                        );
                        resolve();
                    });
                })
            ),
            new Promise<void>(resolve =>
                LogContext.run(fakeLogger, () => {
                    LogContext.runWithCorrelationId('b', () => {
                        seen.push(
                            enricher(baseEvent).properties.CorrelationId as
                                | string
                                | undefined
                        );
                        resolve();
                    });
                })
            )
        ]);

        expect(seen.sort()).toEqual(['a', 'b']);
    });
});
