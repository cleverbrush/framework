import {
    boolean,
    defineEntity,
    type Entity,
    number,
    object,
    string
} from '@cleverbrush/orm';

const time = () => number().columnType('double precision');
const runFields = {
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
};
const scheduleFields = {
    namespace: string(),
    id: string(),
    active: boolean(),
    nextAt: time().nullable().optional(),
    record: string().columnType('text')
};
const eventFields = {
    runId: string(),
    sequence: number(),
    record: string().columnType('text')
};
const attemptFields = {
    runId: string(),
    attempt: number(),
    record: string().columnType('text')
};

// Named field maps keep declaration emission portable without duplicating row types.
const runs: ReturnType<typeof object<typeof runFields>> =
    object(runFields).hasTableName('cb_jobs_runs');
const schedules: ReturnType<typeof object<typeof scheduleFields>> = object(
    scheduleFields
)
    .hasTableName('cb_jobs_schedules')
    .hasPrimaryKey(['namespace', 'id']);
const events: ReturnType<typeof object<typeof eventFields>> = object(
    eventFields
)
    .hasTableName('cb_jobs_events')
    .hasPrimaryKey(['runId', 'sequence']);
const attempts: ReturnType<typeof object<typeof attemptFields>> = object(
    attemptFields
)
    .hasTableName('cb_jobs_attempts')
    .hasPrimaryKey(['runId', 'attempt']);

type StorageSchemas = {
    runs: typeof runs;
    schedules: typeof schedules;
    events: typeof events;
    attempts: typeof attempts;
    entities: {
        runs: Entity<typeof runs>;
        schedules: Entity<typeof schedules>;
        events: Entity<typeof events>;
        attempts: Entity<typeof attempts>;
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
    const tables = {
        runs: runs.hasTableName(prefix + '_runs'),
        schedules: schedules.hasTableName(prefix + '_schedules'),
        events: events.hasTableName(prefix + '_events'),
        attempts: attempts.hasTableName(prefix + '_attempts')
    };
    return {
        ...tables,
        entities: {
            runs: defineEntity(tables.runs),
            schedules: defineEntity(tables.schedules),
            events: defineEntity(tables.events),
            attempts: defineEntity(tables.attempts)
        }
    };
}
