import {
    addDays,
    addMonths,
    calendarDate,
    localDate,
    resolveLocal
} from './calendar.js';
import type { StoredSchedule, TaskSchedule } from './contracts.js';
import { normalizeSchedule } from './schedule-schemas.js';

/** One recurrence slot. A DST gap has an ordering instant but is not executable. */
export type Occurrence = { index: number; at: number; executable: boolean };

/** Validate and anchor a recurrence exactly once, using the repository clock. */
export function storeSchedule(
    input: TaskSchedule,
    now: number
): StoredSchedule {
    const { startsOn, endsOn, ...schedule } = normalizeSchedule(input);
    const start = startsOn?.getTime() ?? now;
    if (!Number.isFinite(start) || (endsOn && endsOn.getTime() < start))
        throw new RangeError('Invalid schedule date range');
    return {
        ...schedule,
        startsOn: start,
        ...(endsOn === undefined ? {} : { endsOn: endsOn.getTime() })
    };
}

/** Calculate a slot without reference to the wall clock or successful run count. */
export function occurrenceAt(
    rule: StoredSchedule,
    index: number
): Occurrence | undefined {
    if (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        (rule.maxOccurrences !== undefined && index >= rule.maxOccurrences)
    )
        return undefined;
    const interval = rule.interval ?? 1;
    let value: { at: number; executable: boolean };
    try {
        if (rule.every === 'minute') {
            const at = rule.startsOn + index * interval * 60000;
            if (
                !Number.isSafeInteger(at) ||
                !Number.isFinite(new Date(at).getTime())
            )
                return undefined;
            value = { at, executable: true };
        } else {
            const zone = rule.timeZone ?? 'UTC';
            const anchor = localDate(rule.startsOn, zone);
            const hour = rule.hour ?? 9,
                minute = rule.minute ?? 0;
            const onDate = (day: number, month = anchor.getUTCMonth() + 1) =>
                calendarDate(anchor.getUTCFullYear(), month, day, hour, minute);
            let local: Date;
            if (rule.every === 'day') {
                let first = onDate(anchor.getUTCDate());
                if (resolveLocal(first, zone).at < rule.startsOn)
                    first = addDays(first, 1);
                local = addDays(first, index * interval);
            } else if (rule.every === 'week') {
                const monday = addDays(
                    onDate(anchor.getUTCDate()),
                    1 - (anchor.getUTCDay() || 7)
                );
                const days = rule.dayOfWeek;
                const initial = days.filter(
                    day =>
                        resolveLocal(addDays(monday, day - 1), zone).at >=
                        rule.startsOn
                );
                if (index < initial.length)
                    local = addDays(monday, initial[index] - 1);
                else {
                    const remaining = index - initial.length;
                    local = addDays(
                        monday,
                        (Math.floor(remaining / days.length) + 1) *
                            interval *
                            7 +
                            days[remaining % days.length] -
                            1
                    );
                }
            } else {
                let first = onDate(
                    1,
                    rule.every === 'year'
                        ? rule.month
                        : anchor.getUTCMonth() + 1
                );
                const period = rule.every === 'year' ? 12 : 1;
                const onDay = (date: Date) =>
                    calendarDate(
                        date.getUTCFullYear(),
                        date.getUTCMonth() + (rule.day === 'last' ? 2 : 1),
                        rule.day === 'last' ? 0 : rule.day,
                        hour,
                        minute
                    );
                if (resolveLocal(onDay(first), zone).at < rule.startsOn)
                    first = addMonths(first, period);
                local = onDay(addMonths(first, index * interval * period));
            }
            value = resolveLocal(local, zone);
        }
    } catch (error) {
        if (error instanceof RangeError) return undefined; // End of JavaScript Date's supported calendar range.
        throw error;
    }
    if (rule.endsOn !== undefined && value.at > rule.endsOn) return undefined;
    return { index, ...value };
}

/** Find the next real occurrence, skipping nonexistent local wall-clock times. */
export function nextOccurrence(
    rule: StoredSchedule,
    from: number
): Occurrence | undefined {
    let index = Math.max(from, rule.skipFirst ?? 0);
    for (;;) {
        const value = occurrenceAt(rule, index++);
        if (!value || value.executable) return value;
    }
}

/** Seek logarithmically across long outages instead of iterating every missed minute. */
export function latestDueOccurrence(
    rule: StoredSchedule,
    from: number,
    now: number
): Occurrence | undefined {
    const first = nextOccurrence(rule, from);
    if (!first || first.at > now) return undefined;
    let low = first.index,
        high = low + 1,
        distance = 1;
    for (;;) {
        const candidate = occurrenceAt(rule, high);
        if (!candidate || candidate.at > now) break;
        low = high;
        distance *= 2;
        high = Math.min(Number.MAX_SAFE_INTEGER, high + distance);
        if (low === high) break;
    }
    while (high - low > 1) {
        const mid = low + Math.floor((high - low) / 2);
        const candidate = occurrenceAt(rule, mid);
        if (candidate && candidate.at <= now) low = mid;
        else high = mid;
    }
    for (let index = low; index >= first.index; index--) {
        const candidate = occurrenceAt(rule, index);
        if (candidate?.executable) return candidate;
    }
    return first;
}

/** Deterministic calendar iterator. Supply startsOn for reproducible sequences. */
export class ScheduleCalculator {
    private cursor: number;
    private readonly rule: StoredSchedule;
    constructor(schedule: TaskSchedule) {
        this.rule = storeSchedule(schedule, Date.now());
        this.cursor = this.rule.skipFirst ?? 0;
    }
    /** Whether an occurrence remains, optionally within a look-ahead window. */
    hasNext(withinMs?: number): boolean {
        const next = nextOccurrence(this.rule, this.cursor);
        return (
            !!next &&
            (withinMs === undefined || next.at <= Date.now() + withinMs)
        );
    }
    /** Advance one occurrence; index is one-based and includes skipped calendar slots. */
    next(): { date: Date; index: number } {
        const next = nextOccurrence(this.rule, this.cursor);
        if (!next) throw new RangeError('Schedule exhausted');
        this.cursor = next.index + 1;
        return { date: new Date(next.at), index: next.index + 1 };
    }
}
