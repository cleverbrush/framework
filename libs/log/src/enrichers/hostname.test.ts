import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { hostnameEnricher } from './hostname.js';

const baseEvent: LogEvent = {
    timestamp: new Date(0),
    level: LogLevel.Information,
    messageTemplate: 'm',
    renderedMessage: 'm',
    properties: {}
};

describe('hostnameEnricher', () => {
    afterEach(() => vi.restoreAllMocks());

    it('adds the Hostname property from os.hostname()', () => {
        vi.spyOn(os, 'hostname').mockReturnValue('my-host');

        const enriched = hostnameEnricher()(baseEvent);
        expect(enriched.properties.Hostname).toBe('my-host');
    });

    it('caches the hostname after the first call', () => {
        const spy = vi.spyOn(os, 'hostname').mockReturnValue('host-1');
        const enricher = hostnameEnricher();

        enricher(baseEvent);
        // Subsequent calls should not re-query os.hostname.
        spy.mockReturnValue('host-2');
        const second = enricher(baseEvent);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(second.properties.Hostname).toBe('host-1');
    });
});
