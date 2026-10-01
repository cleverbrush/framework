import type { Entity } from '@cleverbrush/orm';
import {
    boolean,
    defineEntity,
    number,
    object,
    string
} from '@cleverbrush/orm';
import type { ObjectSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';

type RowSchema<T> = ObjectSchemaBuilder<{
    [K in keyof T & string]: SchemaBuilder<T[K]>;
}>;
type RunRow = {
    id: string;
    namespace: string;
    name: string;
    version: number;
    status: string;
    availableAt: number;
    leaseExpiresAt: number | null;
    expiresAt: number | null;
    scheduleId: string | null;
    dedupeKey: string | null;
    record: string;
};
type ScheduleRow = {
    namespace: string;
    id: string;
    active: boolean;
    nextAt: number | null;
    record: string;
};
type EventRow = { runId: string; sequence: number; record: string };
type AttemptRow = { runId: string; attempt: number; record: string };
type StorageSchemas = {
    runs: RowSchema<RunRow>;
    schedules: RowSchema<ScheduleRow>;
    events: RowSchema<EventRow>;
    attempts: RowSchema<AttemptRow>;
    entities: {
        runs: Entity<RowSchema<RunRow>>;
        schedules: Entity<RowSchema<ScheduleRow>>;
        events: Entity<RowSchema<EventRow>>;
        attempts: Entity<RowSchema<AttemptRow>>;
    };
};

/** Storage table naming. Use separate prefixes for independent schema ownership. */
export type PostgresStorageOptions = { tablePrefix?: string };
/** @internal Indexed columns plus an opaque JSON text snapshot, decoded explicitly. */
export function storageSchemas(
    options: PostgresStorageOptions = {}
): StorageSchemas {
    const prefix = options.tablePrefix ?? 'cb_jobs';
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(prefix))
        throw new TypeError('Invalid scheduler table prefix');
    const time = () => number().columnType('double precision');
    const runs = object({
        id: string().primaryKey(),
        namespace: string(),
        name: string(),
        version: number(),
        status: string(),
        availableAt: time(),
        leaseExpiresAt: time().nullable().optional(),
        expiresAt: time().nullable().optional(),
        scheduleId: string().nullable().optional(),
        dedupeKey: string().nullable().optional(),
        record: string().columnType('text')
    }).hasTableName(prefix + '_runs') as unknown as RowSchema<RunRow>;
    const schedules = object({
        namespace: string(),
        id: string(),
        active: boolean(),
        nextAt: time().nullable().optional(),
        record: string().columnType('text')
    })
        .hasTableName(prefix + '_schedules')
        .hasPrimaryKey([
            'namespace',
            'id'
        ]) as unknown as RowSchema<ScheduleRow>;
    const events = object({
        runId: string(),
        sequence: number(),
        record: string().columnType('text')
    })
        .hasTableName(prefix + '_events')
        .hasPrimaryKey(['runId', 'sequence']) as unknown as RowSchema<EventRow>;
    const attempts = object({
        runId: string(),
        attempt: number(),
        record: string().columnType('text')
    })
        .hasTableName(prefix + '_attempts')
        .hasPrimaryKey([
            'runId',
            'attempt'
        ]) as unknown as RowSchema<AttemptRow>;
    return {
        runs,
        schedules,
        events,
        attempts,
        entities: {
            runs: defineEntity(runs),
            schedules: defineEntity(schedules),
            events: defineEntity(events),
            attempts: defineEntity(attempts)
        }
    };
}
