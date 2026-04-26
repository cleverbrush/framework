import { describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { environmentEnricher } from './environment.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: { Other: true }
};

describe('environmentEnricher', () => {
    it('adds the Environment property', () => {
        const enriched = environmentEnricher('production')(baseEvent);
        expect(enriched.properties.Environment).toBe('production');
    });

    it('preserves existing properties and is non-mutating', () => {
        const enriched = environmentEnricher('staging')(baseEvent);
        expect(enriched.properties.Other).toBe(true);
        expect(baseEvent.properties.Environment).toBeUndefined();
    });
});
