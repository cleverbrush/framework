import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LogEvent } from './LogEvent.js';
import { LogLevel } from './LogLevel.js';
import { samplingFilter } from './samplingFilter.js';

function event(level: LogLevel): LogEvent {
    return {
        timestamp: new Date(),
        level,
        messageTemplate: 'm',
        renderedMessage: 'm',
        properties: {}
    };
}

describe('samplingFilter', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('passes through levels not listed in the rates map', () => {
        const filter = samplingFilter({ debug: 0 });

        // info is not in the map → always pass
        expect(filter(event(LogLevel.Information))).toBe(true);
        expect(filter(event(LogLevel.Error))).toBe(true);
    });

    it('drops everything at rate 0', () => {
        const filter = samplingFilter({ debug: 0 });
        vi.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0 → false

        for (let i = 0; i < 5; i++) {
            expect(filter(event(LogLevel.Debug))).toBe(false);
        }
    });

    it('keeps everything at rate 1', () => {
        const filter = samplingFilter({ trace: 1 });
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        expect(filter(event(LogLevel.Trace))).toBe(true);
    });

    it('clamps rates above 1 down to 1', () => {
        const filter = samplingFilter({ debug: 999 as number });
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);

        expect(filter(event(LogLevel.Debug))).toBe(true);
    });

    it('clamps negative rates up to 0', () => {
        const filter = samplingFilter({ debug: -5 as number });
        vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(filter(event(LogLevel.Debug))).toBe(false);
    });

    it('uses different rates per level', () => {
        const filter = samplingFilter({ debug: 0, trace: 1 });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        expect(filter(event(LogLevel.Trace))).toBe(true); // 0.5 < 1
        expect(filter(event(LogLevel.Debug))).toBe(false); // 0.5 < 0 is false
    });

    it('does sample by random comparison (rate boundary)', () => {
        const filter = samplingFilter({ debug: 0.4 });
        const random = vi.spyOn(Math, 'random');

        random.mockReturnValueOnce(0.39);
        expect(filter(event(LogLevel.Debug))).toBe(true);

        random.mockReturnValueOnce(0.41);
        expect(filter(event(LogLevel.Debug))).toBe(false);
    });
});
