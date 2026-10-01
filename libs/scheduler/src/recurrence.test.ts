import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { TaskSchedule } from './contracts.js';
import {
    latestDueOccurrence,
    nextOccurrence,
    occurrenceAt,
    ScheduleCalculator,
    storeSchedule
} from './recurrence.js';

function dates(rule: TaskSchedule, count: number) {
    const calc = new ScheduleCalculator(rule);
    return Array.from({ length: count }, () => calc.next().date.toISOString());
}
describe('calendar recurrence', () => {
    it('keeps gaps as non-executable slots for limits and seeking', () => {
        const rule = storeSchedule(
            {
                every: 'day',
                hour: 2,
                minute: 30,
                timeZone: 'America/New_York',
                startsOn: new Date('2026-03-07T00:00:00Z'),
                maxOccurrences: 3
            },
            0
        );
        expect(occurrenceAt(rule, 1)).toMatchObject({
            index: 1,
            executable: false
        });
        expect(nextOccurrence(rule, 1)).toMatchObject({
            index: 2,
            at: Date.parse('2026-03-09T06:30:00Z'),
            executable: true
        });
        expect(
            latestDueOccurrence(rule, 0, Date.parse('2026-03-08T12:00:00Z'))
                ?.index
        ).toBe(0);
        expect(
            nextOccurrence({ ...rule, maxOccurrences: 2 }, 1)
        ).toBeUndefined();
    });
    it('skips a missing local calendar date without shifting following occurrences', () => {
        expect(
            dates(
                {
                    every: 'day',
                    timeZone: 'Pacific/Apia',
                    startsOn: new Date('2011-12-29T10:00:00Z')
                },
                3
            )
        ).toEqual([
            '2011-12-29T19:00:00.000Z',
            '2011-12-30T19:00:00.000Z',
            '2011-12-31T19:00:00.000Z'
        ]);
    });
    it('exhausts minute schedules at the Date limit instead of returning Invalid Date', () => {
        const calc = new ScheduleCalculator({
            every: 'minute',
            startsOn: new Date(8640000000000000)
        });
        expect(calc.next().date.getTime()).toBe(8640000000000000);
        expect(calc.hasNext()).toBe(false);
    });
    it.each([
        'UTC',
        'America/Los_Angeles',
        'Asia/Tokyo'
    ])('is independent of the host TZ=%s', tz => {
        const moduleUrl = new URL('../dist/index.js', import.meta.url).href;
        const program = `import { ScheduleCalculator } from ${JSON.stringify(moduleUrl)};
            const calc = new ScheduleCalculator({ every: 'day', hour: 9,
                timeZone: 'Europe/Berlin', startsOn: new Date('2026-03-28T00:00:00Z') });
            process.stdout.write(JSON.stringify([calc.next().date, calc.next().date]));`;
        const result = execFileSync(
            process.execPath,
            ['--input-type=module', '--eval', program],
            {
                env: { ...process.env, TZ: tz },
                encoding: 'utf8',
                timeout: 5000
            }
        );
        expect(JSON.parse(result)).toEqual([
            '2026-03-28T08:00:00.000Z',
            '2026-03-29T07:00:00.000Z'
        ]);
    });
    it('skips DST gaps and selects the earlier repeated wall time once', () => {
        expect(
            dates(
                {
                    every: 'day',
                    hour: 2,
                    minute: 30,
                    timeZone: 'America/New_York',
                    startsOn: new Date('2026-03-07T00:00:00Z')
                },
                3
            )
        ).toEqual([
            '2026-03-07T07:30:00.000Z',
            '2026-03-09T06:30:00.000Z',
            '2026-03-10T06:30:00.000Z'
        ]);
        expect(
            dates(
                {
                    every: 'day',
                    hour: 1,
                    minute: 30,
                    timeZone: 'America/New_York',
                    startsOn: new Date('2026-10-31T00:00:00Z')
                },
                3
            )
        ).toEqual([
            '2026-10-31T05:30:00.000Z',
            '2026-11-01T05:30:00.000Z',
            '2026-11-02T06:30:00.000Z'
        ]);
    });
    it('supports last day, leap years, weeks and anchored intervals', () => {
        expect(
            dates(
                {
                    every: 'month',
                    day: 'last',
                    startsOn: new Date('2028-01-01T00:00:00Z')
                },
                3
            )
        ).toEqual([
            '2028-01-31T09:00:00.000Z',
            '2028-02-29T09:00:00.000Z',
            '2028-03-31T09:00:00.000Z'
        ]);
        expect(
            dates(
                {
                    every: 'year',
                    month: 2,
                    day: 'last',
                    startsOn: new Date('2028-01-01T00:00:00Z')
                },
                2
            )
        ).toEqual(['2028-02-29T09:00:00.000Z', '2029-02-28T09:00:00.000Z']);
        expect(
            dates(
                {
                    every: 'week',
                    interval: 2,
                    dayOfWeek: [1, 5],
                    startsOn: new Date('2026-10-01T00:00:00Z')
                },
                3
            )
        ).toEqual([
            '2026-10-02T09:00:00.000Z',
            '2026-10-12T09:00:00.000Z',
            '2026-10-16T09:00:00.000Z'
        ]);
    });
    it('counts calendar slots for limits and seeks over long outages', () => {
        const calc = new ScheduleCalculator({
            every: 'minute',
            startsOn: new Date(0),
            skipFirst: 2,
            maxOccurrences: 3
        });
        expect(calc.next().index).toBe(3);
        expect(calc.hasNext()).toBe(false);
        expect(() => calc.next()).toThrow('exhausted');
        const rule = storeSchedule(
            { every: 'minute', startsOn: new Date(0) },
            0
        );
        expect(latestDueOccurrence(rule, 0, 600000000000)?.index).toBe(
            10000000
        );
    });
    it.each([
        { every: 'day', timeZone: 'Wrong/Zone' },
        { every: 'week', dayOfWeek: [] },
        { every: 'month', day: 31 },
        { every: 'minute', interval: 0 },
        { every: 'day', hour: 24 }
    ])('rejects invalid rule %j', rule => {
        expect(() => new ScheduleCalculator(rule as TaskSchedule)).toThrow();
    });
});
