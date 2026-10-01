import type { InferType } from '@cleverbrush/schema';
import { expectTypeOf } from 'vitest';
import type { Schedule, ScheduleSchema, TaskSchedule } from './index.js';

expectTypeOf<Schedule>().toEqualTypeOf<InferType<typeof ScheduleSchema>>();
expectTypeOf<TaskSchedule>().toEqualTypeOf<Schedule>();
const examples: Schedule[] = [
    { every: 'minute' },
    { every: 'day', hour: 12 },
    { every: 'week', dayOfWeek: [1, 5] },
    { every: 'month', day: 'last' },
    { every: 'year', day: 1, month: 1 }
];
for (const value of examples) {
    if (value.every === 'week')
        expectTypeOf(value.dayOfWeek).toEqualTypeOf<number[]>();
    if (value.every === 'year')
        expectTypeOf(value.month).toEqualTypeOf<number>();
    if (value.every === 'minute') {
        // @ts-expect-error Elapsed-minute schedules do not have a local hour.
        value.hour;
    }
}
// @ts-expect-error Weekly schedules require weekdays.
const week: Schedule = { every: 'week' };
// @ts-expect-error Monthly schedules require a day.
const month: Schedule = { every: 'month' };
// @ts-expect-error Yearly schedules require a month.
const year: Schedule = { every: 'year', day: 1 };
// @ts-expect-error Irrelevant local time is not part of the minute variant.
const minute: Schedule = { every: 'minute', hour: 9 };
void [week, month, year, minute];
