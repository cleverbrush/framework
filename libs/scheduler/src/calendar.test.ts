import { describe, expect, it } from 'vitest';
import {
    addDays,
    addMonths,
    calendarDate,
    localDate,
    resolveLocal,
    timeZoneFormatter
} from './calendar.js';

describe('native calendar and time zones', () => {
    it.each([
        ['UTC', '2026-01-01T09:00:00Z', '2026-01-01T09:00:00Z', true],
        [
            'America/New_York',
            '2026-01-01T00:00:00Z',
            '2026-01-01T05:00:00Z',
            true
        ],
        [
            'America/New_York',
            '2026-03-08T02:30:00Z',
            '2026-03-08T06:30:00Z',
            false
        ],
        [
            'America/New_York',
            '2026-11-01T01:30:00Z',
            '2026-11-01T05:30:00Z',
            true
        ],
        [
            'Australia/Lord_Howe',
            '2026-10-04T02:15:00Z',
            '2026-10-03T15:15:00Z',
            false
        ],
        [
            'Australia/Lord_Howe',
            '2026-04-05T01:45:00Z',
            '2026-04-04T14:45:00Z',
            true
        ],
        ['Pacific/Apia', '2011-12-30T09:00:00Z', '2011-12-29T19:00:00Z', false],
        [
            'Asia/Kathmandu',
            '2026-01-01T09:00:00Z',
            '2026-01-01T03:15:00Z',
            true
        ],
        [
            'America/St_Johns',
            '2026-01-01T09:00:00Z',
            '2026-01-01T12:30:00Z',
            true
        ],
        ['Etc/GMT+5', '2026-01-01T09:00:00Z', '2026-01-01T14:00:00Z', true],
        ['Europe/Paris', '1890-01-01T09:00:00Z', '1890-01-01T08:50:39Z', true]
    ] as const)('resolves %s local %s', (zone, wall, instant, executable) => {
        const result = resolveLocal(new Date(wall), zone);
        expect(result).toEqual({ at: Date.parse(instant), executable });
        expect(localDate(result.at, zone).getTime() === Date.parse(wall)).toBe(
            executable
        );
    });
    it.each([
        0, 1, 22, 99, -1
    ])('preserves ISO year %s, including eras', year => {
        const wall = calendarDate(year, 1, 1, 0, 0, 0, 123);
        expect(wall.getUTCFullYear()).toBe(year);
        expect(localDate(wall.getTime(), 'Etc/UTC')).toEqual(wall);
        expect(resolveLocal(wall, 'Etc/UTC')).toEqual({
            at: wall.getTime(),
            executable: true
        });
    });
    it('uses calendar arithmetic without changing the input date', () => {
        const leap = calendarDate(2028, 2, 28, 9);
        expect(addDays(leap, 1).toISOString()).toBe('2028-02-29T09:00:00.000Z');
        expect(addDays(leap, 2).toISOString()).toBe('2028-03-01T09:00:00.000Z');
        const first = calendarDate(2026, 12, 1, 9);
        expect(addMonths(first, 2).toISOString()).toBe(
            '2027-02-01T09:00:00.000Z'
        );
        expect(first.toISOString()).toBe('2026-12-01T09:00:00.000Z');
        expect(leap.getUTCDate()).toBe(28);
    });
    it('rejects invalid zones and fixed-offset identifiers, and caches valid formatters', () => {
        for (const zone of ['Wrong/Zone', '+02:00', '-0500'])
            expect(() => timeZoneFormatter(zone)).toThrow();
        const formatter = timeZoneFormatter('Europe/Berlin');
        expect(timeZoneFormatter('Europe/Berlin')).toBe(formatter);
        expect(formatter.resolvedOptions()).toMatchObject({
            calendar: 'gregory',
            numberingSystem: 'latn',
            hourCycle: 'h23'
        });
    });
    it('evicts old formatters without changing results', () => {
        const formatter = timeZoneFormatter('UTC');
        for (const zone of Intl.supportedValuesOf('timeZone').slice(0, 65))
            timeZoneFormatter(zone);
        expect(timeZoneFormatter('UTC')).not.toBe(formatter);
        expect(localDate(0, 'Asia/Kathmandu').toISOString()).toBe(
            '1970-01-01T05:30:00.000Z'
        );
    });
    it('fails cleanly outside the Date range', () => {
        const last = new Date(8640000000000000);
        expect(resolveLocal(last, 'UTC')).toEqual({
            at: last.getTime(),
            executable: true
        });
        expect(() => addDays(last, 1)).toThrow(RangeError);
        expect(() => calendarDate(999999, 1, 1)).toThrow(RangeError);
        expect(() => resolveLocal(new Date(Number.NaN), 'UTC')).toThrow(
            RangeError
        );
    });
});
