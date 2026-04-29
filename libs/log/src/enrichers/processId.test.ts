import { describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { processIdEnricher } from './processId.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: {}
};

describe('processIdEnricher', () => {
    it('adds the current ProcessId', () => {
        const enriched = processIdEnricher()(baseEvent);
        expect(enriched.properties.ProcessId).toBe(process.pid);
    });

    it('returns the same cached pid across calls', () => {
        const enricher = processIdEnricher();
        const first = enricher(baseEvent);
        const second = enricher(baseEvent);
        expect(first.properties.ProcessId).toBe(second.properties.ProcessId);
    });
});
