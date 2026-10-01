import {
    array,
    date,
    type InferType,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';
import { Temporal } from '@js-temporal/polyfill';

const count = () => number().isInteger().min(1).max(Number.MAX_SAFE_INTEGER);
const scheduleDate = date()
    .coerce()
    .addValidator(value =>
        Number.isFinite(value.getTime())
            ? { valid: true }
            : { valid: false, errors: [{ message: 'Invalid schedule date' }] }
    );
const calendarDay = union(string('last')).or(
    number().isInteger().min(1).max(28)
);

/** Shared recurrence bounds and local time; omitted values are normalized at registration. */
export const ScheduleSchemaBase = object({
    /** Number of periods between occurrences; defaults to 1. */
    interval: count().max(356).optional(),
    /** Named IANA time zone; defaults to UTC. Fixed numeric offsets are rejected. */
    timeZone: string()
        .addValidator(value => {
            try {
                if (/^[+-]/.test(value)) throw new RangeError();
                Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(
                    value
                );
                return { valid: true };
            } catch {
                return {
                    valid: false,
                    errors: [{ message: 'Use a named IANA time zone' }]
                };
            }
        })
        .optional(),
    /** Local hour, 0–23; defaults to 9 for calendar schedules. */
    hour: number().isInteger().min(0).max(23).optional(),
    /** Local minute, 0–59; defaults to 0 for calendar schedules. */
    minute: number().isInteger().min(0).max(59).optional(),
    /** Inclusive start; omitted starts are anchored once by the repository clock. */
    startsOn: scheduleDate.optional(),
    /** Inclusive end; JSON date strings are accepted at validation boundaries. */
    endsOn: scheduleDate.optional(),
    /** Maximum calendar slots, including skipped slots, not successful executions. */
    maxOccurrences: count().optional(),
    /** @deprecated Use maxOccurrences. Supplying both spellings is invalid. */
    maxOccurences: count().optional(),
    /** Number of initial calendar slots to skip; defaults to 0. */
    skipFirst: number()
        .isInteger()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
}).addValidator(value => {
    if (value.maxOccurrences !== undefined && value.maxOccurences !== undefined)
        return {
            valid: false,
            errors: [
                { message: 'Supply only maxOccurrences, not both spellings' }
            ]
        };
    if (
        value.startsOn &&
        value.endsOn &&
        new Date(value.endsOn).getTime() < new Date(value.startsOn).getTime()
    )
        return {
            valid: false,
            errors: [{ message: 'endsOn must not precede startsOn' }]
        };
    return { valid: true };
});

/** Elapsed-minute recurrence, including the start instant; no wall-clock hour/minute. */
export const ScheduleMinuteSchema = ScheduleSchemaBase.omit('hour')
    .omit('minute')
    .addProps({ every: string('minute') });
/** Daily calendar recurrence at a local wall-clock time. */
export const ScheduleDaySchema = ScheduleSchemaBase.addProps({
    every: string('day')
});
/** Weekly recurrence on unique ISO weekdays (Monday = 1, Sunday = 7). */
export const ScheduleWeekSchema = ScheduleSchemaBase.addProps({
    every: string('week'),
    dayOfWeek: array()
        .of(number().isInteger().min(1).max(7))
        .minLength(1)
        .maxLength(7)
        .addValidator(value =>
            new Set(value).size === value.length
                ? { valid: true }
                : {
                      valid: false,
                      errors: [{ message: 'Weekdays must be unique' }]
                  }
        )
});
/** Monthly recurrence on day 1–28 or the last day of the month. */
export const ScheduleMonthSchema = ScheduleSchemaBase.addProps({
    every: string('month'),
    day: calendarDay
});
/** Yearly recurrence on an explicit month and day (or the month's last day). */
export const ScheduleYearSchema = ScheduleSchemaBase.addProps({
    every: string('year'),
    day: calendarDay,
    month: number().isInteger().min(1).max(12)
});
/** Discriminated recurrence contract shared by registration and calendar calculation. */
export const ScheduleSchema = union(ScheduleMinuteSchema)
    .or(ScheduleDaySchema)
    .or(ScheduleWeekSchema)
    .or(ScheduleMonthSchema)
    .or(ScheduleYearSchema);

/** Calendar recurrence inferred from the public validation schema. */
export type Schedule = InferType<typeof ScheduleSchema>;

/** Reusable schema members for validating schedule configuration. */
export const Schemas = {
    ScheduleSchemaBase,
    ScheduleMinuteSchema,
    ScheduleDaySchema,
    ScheduleWeekSchema,
    ScheduleMonthSchema,
    ScheduleYearSchema,
    ScheduleSchema
};

/** @internal Canonicalize without inventing a start instant before fingerprinting. */
export function normalizeSchedule(input: unknown): Schedule {
    const parsed = ScheduleSchema.parse(input);
    const { maxOccurences, maxOccurrences, startsOn, endsOn, ...rest } = parsed;
    const limit = maxOccurrences ?? maxOccurences;
    const common = {
        interval: parsed.interval ?? 1,
        timeZone: parsed.timeZone ?? 'UTC',
        skipFirst: parsed.skipFirst ?? 0,
        ...(startsOn === undefined ? {} : { startsOn: new Date(startsOn) }),
        ...(endsOn === undefined ? {} : { endsOn: new Date(endsOn) }),
        ...(limit === undefined ? {} : { maxOccurrences: limit })
    };
    if (rest.every === 'minute') return { ...rest, ...common };
    const time = { hour: rest.hour ?? 9, minute: rest.minute ?? 0 };
    if (rest.every === 'week')
        return {
            ...rest,
            ...common,
            ...time,
            dayOfWeek: [...rest.dayOfWeek].sort((a, b) => a - b)
        };
    return { ...rest, ...common, ...time };
}
