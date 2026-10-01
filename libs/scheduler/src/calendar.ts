const DAY_MS = 86400000;
const DATE_LIMIT = 8640000000000000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** @internal Validate named zones and reuse a bounded set of ICU formatters. */
export function timeZoneFormatter(zone: string): Intl.DateTimeFormat {
    if (/^[+-]/.test(zone)) throw new RangeError('Use a named IANA time zone');
    let formatter = formatters.get(zone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            // Gregorian fields match the ISO calendar; requesting gregory
            // also preserves the era on ICU versions that omit it for iso8601.
            calendar: 'gregory',
            numberingSystem: 'latn',
            hourCycle: 'h23',
            era: 'short',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        if (formatters.size >= 64)
            formatters.delete(formatters.keys().next().value!);
        formatters.set(zone, formatter);
    }
    return formatter;
}

/** @internal Construct a wall-clock date in UTC fields, preserving years 0–99. */
export function calendarDate(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0
): Date {
    const value = new Date(0);
    value.setUTCFullYear(year, month - 1, day);
    value.setUTCHours(hour, minute, second, millisecond);
    return validDate(value);
}

function validDate(date: Date): Date {
    if (!Number.isFinite(date.getTime()))
        throw new RangeError('Calendar exhausted');
    return date;
}

/** @internal Add calendar days to a UTC-field wall-clock date, not an instant. */
export function addDays(local: Date, days: number): Date {
    return validDate(new Date(local.getTime() + days * DAY_MS));
}

/** @internal Advance a first-of-month wall-clock date without host-zone arithmetic. */
export function addMonths(first: Date, months: number): Date {
    const value = new Date(first);
    value.setUTCMonth(value.getUTCMonth() + months);
    return validDate(value);
}

/** @internal Represent an instant's local ISO calendar fields using UTC Date fields. */
export function localDate(at: number, zone: string): Date {
    if (zone === 'UTC') return validDate(new Date(at));
    const fields = Object.fromEntries(
        timeZoneFormatter(zone)
            .formatToParts(at)
            .map(part => [part.type, part.value])
    );
    const year = Number(fields.year);
    return calendarDate(
        fields.era === 'BC' ? 1 - year : year,
        Number(fields.month),
        Number(fields.day),
        Number(fields.hour),
        Number(fields.minute),
        Number(fields.second),
        Number(fields.fractionalSecond)
    );
}

/**
 * @internal Resolve a wall-clock date to the earlier instant of a fold.
 * IANA offsets are shorter than a day. Probe either side of that window to
 * find both offsets of a transition, then round-trip each candidate. This
 * handles non-hour shifts and date-line jumps without assuming a 1-hour DST
 * change. A gap keeps its earlier ordering instant but is never executable.
 */
export function resolveLocal(
    local: Date,
    zone: string
): { at: number; executable: boolean } {
    const wall = validDate(local).getTime();
    if (zone === 'UTC') return { at: wall, executable: true };
    const offsets = new Set<number>();
    for (const delta of [-DAY_MS, 0, DAY_MS]) {
        const probe = Math.max(-DATE_LIMIT, Math.min(DATE_LIMIT, wall + delta));
        offsets.add(localDate(probe, zone).getTime() - probe);
    }
    const candidates = [...offsets]
        .map(offset => wall - offset)
        .filter(at => Math.abs(at) <= DATE_LIMIT)
        .sort((a, b) => a - b);
    for (const at of candidates)
        if (localDate(at, zone).getTime() === wall)
            return { at, executable: true };
    if (!candidates.length) throw new RangeError('Calendar exhausted');
    return { at: candidates[0], executable: false };
}
