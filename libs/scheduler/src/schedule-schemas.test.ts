import { describe, expect, it } from 'vitest';
import { testJob } from '../testing/repository-contract.js';
import {
    InMemoryJobRepository,
    JobScheduler,
    ScheduleCalculator,
    ScheduleDaySchema,
    ScheduleMinuteSchema,
    ScheduleMonthSchema,
    ScheduleSchema,
    ScheduleSchemaBase,
    ScheduleWeekSchema,
    ScheduleYearSchema,
    Schemas
} from './index.js';
import { normalizeSchedule } from './schedule-schemas.js';

describe('schedule schemas', () => {
    it('exports independently usable variants and the Schemas facade', () => {
        expect(Schemas).toEqual({
            ScheduleSchemaBase,
            ScheduleMinuteSchema,
            ScheduleDaySchema,
            ScheduleWeekSchema,
            ScheduleMonthSchema,
            ScheduleYearSchema,
            ScheduleSchema
        });
        for (const [schema, input] of [
            [ScheduleMinuteSchema, { every: 'minute', interval: 5 }],
            [ScheduleDaySchema, { every: 'day', hour: 12 }],
            [ScheduleWeekSchema, { every: 'week', dayOfWeek: [7, 1] }],
            [ScheduleMonthSchema, { every: 'month', day: 'last' }],
            [ScheduleYearSchema, { every: 'year', day: 28, month: 2 }]
        ] as const) {
            expect(schema.validate(input).valid).toBe(true);
            expect(ScheduleSchema.validate(input).valid).toBe(true);
        }
    });
    it('parses JSON dates and normalizes defaults without mutating or anchoring input', () => {
        const input = {
            every: 'week',
            dayOfWeek: [5, 1],
            maxOccurences: 4,
            endsOn: '2030-01-01T00:00:00Z'
        };
        const normalized = normalizeSchedule(input);
        expect(normalized).toEqual({
            every: 'week',
            dayOfWeek: [1, 5],
            maxOccurrences: 4,
            endsOn: new Date(input.endsOn),
            interval: 1,
            timeZone: 'UTC',
            skipFirst: 0,
            hour: 9,
            minute: 0
        });
        expect(normalized).not.toHaveProperty('startsOn');
        expect(input.dayOfWeek).toEqual([5, 1]);
        const parsed = ScheduleSchema.parse({
            every: 'minute',
            startsOn: '2026-01-01T00:00:00Z',
            maxOccurrences: 1
        });
        expect(new ScheduleCalculator(parsed).next()).toEqual({
            date: new Date('2026-01-01T00:00:00Z'),
            index: 1
        });
    });
    it.each([
        { every: 'hour' },
        { every: 'week' },
        { every: 'month' },
        { every: 'year', day: 1 },
        { every: 'year', month: 1 },
        { every: 'minute', hour: 9 },
        { every: 'day', dayOfWeek: [1] },
        { every: 'week', dayOfWeek: [] },
        { every: 'week', dayOfWeek: [1, 1] },
        { every: 'week', dayOfWeek: [0] },
        { every: 'week', dayOfWeek: [8] },
        { every: 'day', interval: 0 },
        { every: 'day', interval: 357 },
        { every: 'day', interval: 1.5 },
        { every: 'day', hour: 24 },
        { every: 'day', minute: 60 },
        { every: 'month', day: 29 },
        { every: 'year', day: 1, month: 13 },
        { every: 'day', startsOn: 'invalid' },
        { every: 'day', startsOn: new Date(Number.NaN) },
        { every: 'day', startsOn: new Date(1), endsOn: new Date(0) },
        { every: 'day', maxOccurrences: 1, maxOccurences: 1 },
        { every: 'day', maxOccurrences: 0 },
        { every: 'day', maxOccurences: 0 },
        { every: 'day', skipFirst: -1 },
        { every: 'day', skipFirst: Number.MAX_SAFE_INTEGER + 1 },
        { every: 'day', timeZone: '+02:00' },
        { every: 'day', timeZone: 'Wrong/Zone' }
    ])('rejects %j at validation, calculation and registration boundaries', async input => {
        expect(ScheduleSchema.validate(input).valid).toBe(false);
        expect(() => new ScheduleCalculator(input as any)).toThrow();
        const jobs = new JobScheduler({
            storageRepository: new InMemoryJobRepository()
        });
        await expect(
            jobs.upsertSchedule(
                'bad',
                testJob(),
                { id: 'one' },
                { schedule: input as any }
            )
        ).rejects.toThrow();
        expect((await jobs.health()).counts.queued ?? 0).toBe(0);
    });
    it('keeps shared constraints after schema composition', () => {
        for (const every of [
            'minute',
            'day',
            'week',
            'month',
            'year'
        ] as const) {
            const variant =
                every === 'week'
                    ? { dayOfWeek: [1] }
                    : every === 'month'
                      ? { day: 1 }
                      : every === 'year'
                        ? { day: 1, month: 1 }
                        : {};
            expect(
                ScheduleSchema.validate({
                    every,
                    ...variant,
                    maxOccurrences: 2,
                    maxOccurences: 2
                }).valid
            ).toBe(false);
        }
    });
});
