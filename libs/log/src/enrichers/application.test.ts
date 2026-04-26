import { describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { applicationEnricher } from './application.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: { Existing: 1 }
};

describe('applicationEnricher', () => {
    it('adds the Application property', () => {
        const enriched = applicationEnricher('order-service')(baseEvent);
        expect(enriched.properties.Application).toBe('order-service');
    });

    it('preserves existing properties', () => {
        const enriched = applicationEnricher('svc')(baseEvent);
        expect(enriched.properties.Existing).toBe(1);
    });

    it('does not mutate the original event', () => {
        applicationEnricher('svc')(baseEvent);
        expect(baseEvent.properties.Application).toBeUndefined();
    });
});
