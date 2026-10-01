import {
    createDb,
    getTableName,
    number,
    object,
    rawQuery,
    string
} from '@cleverbrush/orm';
import {
    type JobAttempt,
    type JobEvent,
    JobRepository,
    type JobRepositoryHealth,
    type JobStorage,
    type JobStorageTransaction,
    type RunRecord,
    type ScheduleRecord
} from '@cleverbrush/scheduler';
import type { Knex } from 'knex';
import { type PostgresStorageOptions, storageSchemas } from './schema.js';

const clockSql = 'floor(extract(epoch from clock_timestamp()) * 1000)';
function runRow(run: RunRecord) {
    return {
        id: run.id,
        namespace: run.namespace,
        name: run.name,
        version: run.version,
        status: run.status,
        availableAt: run.availableAt,
        leaseExpiresAt: run.leaseExpiresAt,
        expiresAt:
            run.completedAt === null
                ? null
                : run.completedAt + run.policy.retentionMs,
        scheduleId: run.scheduleId,
        dedupeKey: run.dedupeKey,
        record: JSON.stringify(run)
    };
}
function scheduleRow(schedule: ScheduleRecord) {
    return {
        namespace: schedule.namespace,
        id: schedule.id,
        active: schedule.active,
        nextAt: schedule.nextAt,
        record: JSON.stringify(schedule)
    };
}
/** @internal Storage records are library-owned JSON, never arbitrary driver objects. */
function unpack<T>(row: { record: string } | undefined): T | undefined {
    return row ? (JSON.parse(row.record) as T) : undefined;
}

/**
 * PostgreSQL transactional adapter. The supplied Knex instance/pool remains caller-owned.
 * Binding to a transaction provides atomic business-write + enqueue; do not start a worker
 * on a transaction-bound repository. Acceptance is durable only after the outer commit.
 */
export class PostgresJobStorage implements JobStorage {
    private readonly schemas;
    constructor(
        private readonly knex: Knex,
        options: PostgresStorageOptions = {}
    ) {
        this.schemas = storageSchemas(options);
    }
    /** Run an atomic transition; row locks, events and cursor writes share the commit. */
    async atomic<T>(
        action: (transaction: JobStorageTransaction) => Promise<T>
    ): Promise<T> {
        return this.knex.transaction(async tx => {
            await tx.raw("set local lock_timeout = '5s'");
            await tx.raw("set local statement_timeout = '15s'");
            return action(this.transaction(tx));
        });
    }
    private transaction(tx: Knex.Transaction): JobStorageTransaction {
        const db = createDb(tx, this.schemas.entities);
        const runs = getTableName(this.schemas.runs);
        // Native Knex is confined to row locking and aggregates unsupported by the ORM.
        const lockedRun = async (builder: Knex.QueryBuilder) =>
            unpack<RunRecord>(
                (
                    await rawQuery(
                        tx,
                        db.runs.rowSchema,
                        builder.forUpdate().limit(1)
                    )
                )[0]
            );
        const lockedSchedule = async (builder: Knex.QueryBuilder) =>
            unpack<ScheduleRecord>(
                (
                    await rawQuery(
                        tx,
                        db.schedules.rowSchema,
                        builder.forUpdate().limit(1)
                    )
                )[0]
            );
        const runQuery = (namespace: string, id: string) =>
            db.runs.where(t => t.namespace, namespace).where(t => t.id, id);
        const scheduleQuery = (namespace: string, id: string) =>
            db.schedules
                .where(t => t.namespace, namespace)
                .where(t => t.id, id);
        return {
            now: async () =>
                (
                    await rawQuery(
                        tx,
                        object({ now: number() }),
                        'select (' + clockSql + ')::double precision as now'
                    )
                )[0].now,
            run: async (namespace, id, lock) =>
                lock
                    ? lockedRun(runQuery(namespace, id).toKnexQuery())
                    : unpack<RunRecord>(await runQuery(namespace, id).first()),
            insertRun: async run => {
                const inserted = await db.runs
                    .onConflict(
                        t => t.namespace,
                        t => t.dedupeKey
                    )
                    .ignore(runRow(run));
                if (inserted)
                    return {
                        record: unpack<RunRecord>(inserted)!,
                        inserted: true
                    };
                const record = await lockedRun(
                    db.runs
                        .where(t => t.namespace, run.namespace)
                        .where(t => t.dedupeKey, run.dedupeKey)
                        .toKnexQuery()
                );
                if (!record) throw new Error('Conflicting run disappeared');
                return { record, inserted: false };
            },
            saveRun: async run => {
                await runQuery(run.namespace, run.id).update(runRow(run));
            },
            runnable: async (namespace, supported) => {
                const builder = db.runs
                    .where(t => t.namespace, namespace)
                    .toKnexQuery();
                builder.andWhere(group => {
                    group.where(expired =>
                        expired
                            .where('status', 'running')
                            .whereRaw('?? <= ' + clockSql, ['leaseExpiresAt'])
                    );
                    if (supported.length)
                        group.orWhere(ready =>
                            ready
                                .whereIn('status', ['queued', 'retry_wait'])
                                .whereRaw('?? <= ' + clockSql, ['availableAt'])
                                .where(versions => {
                                    for (const job of supported)
                                        versions.orWhere({
                                            name: job.name,
                                            version: job.version
                                        });
                                })
                        );
                });
                return lockedRun(
                    builder
                        .orderBy('availableAt')
                        .orderBy('id')
                        .forUpdate()
                        .skipLocked()
                );
            },
            appendEvent: async event => {
                await db.events.insert({
                    runId: event.runId,
                    sequence: event.sequence,
                    record: JSON.stringify(event)
                });
            },
            events: async (runId, after, limit) =>
                (
                    await db.events
                        .where(t => t.runId, runId)
                        .where(t => t.sequence, '>', after)
                        .orderBy(t => t.sequence)
                        .limit(limit)
                        .execute()
                ).map(row => unpack<JobEvent>(row)!),
            saveAttempt: async attempt => {
                await db.attempts
                    .onConflict(
                        t => t.runId,
                        t => t.attempt
                    )
                    .merge({
                        runId: attempt.runId,
                        attempt: attempt.attempt,
                        record: JSON.stringify(attempt)
                    });
            },
            attempts: async runId =>
                (
                    await db.attempts
                        .where(t => t.runId, runId)
                        .orderBy(t => t.attempt)
                        .execute()
                ).map(row => unpack<JobAttempt>(row)!),
            schedule: async (namespace, id) =>
                lockedSchedule(scheduleQuery(namespace, id).toKnexQuery()),
            insertSchedule: async schedule => {
                await db.schedules
                    .onConflict(
                        t => t.namespace,
                        t => t.id
                    )
                    .ignore(scheduleRow(schedule));
                return (await lockedSchedule(
                    scheduleQuery(schedule.namespace, schedule.id).toKnexQuery()
                ))!;
            },
            saveSchedule: async schedule => {
                await scheduleQuery(schedule.namespace, schedule.id).update(
                    scheduleRow(schedule)
                );
            },
            dueSchedules: async (namespace, limit) => {
                const rows = await rawQuery(
                    tx,
                    db.schedules.rowSchema,
                    db.schedules
                        .where(t => t.namespace, namespace)
                        .where(t => t.active, true)
                        .toKnexQuery()
                        .whereRaw('?? <= ' + clockSql, ['nextAt'])
                        .orderBy('nextAt')
                        .orderBy('id')
                        .limit(limit)
                        .forUpdate()
                        .skipLocked()
                );
                return rows.map(row => unpack<ScheduleRecord>(row)!);
            },
            unfinishedScheduleRun: async (namespace, scheduleId) =>
                !!(await db.runs
                    .where(t => t.namespace, namespace)
                    .where(t => t.scheduleId, scheduleId)
                    .whereIn(t => t.status, ['queued', 'running', 'retry_wait'])
                    .first()),
            cleanup: async (namespace, limit) => {
                const rows = await rawQuery(
                    tx,
                    object({ id: string() }),
                    tx(runs)
                        .select('id')
                        .where({ namespace })
                        .whereIn('status', ['succeeded', 'failed', 'cancelled'])
                        .whereRaw('?? <= ' + clockSql, ['expiresAt'])
                        .orderBy('expiresAt')
                        .limit(limit)
                        .forUpdate()
                        .skipLocked()
                );
                if (!rows.length) return 0;
                return db.runs
                    .whereIn(
                        t => t.id,
                        rows.map(row => row.id)
                    )
                    .delete();
            },
            health: async namespace => {
                const counts = await rawQuery(
                    tx,
                    object({ status: string(), count: number() }),
                    tx(runs)
                        .select('status')
                        .select(tx.raw('count(*)::float8 as count'))
                        .where({ namespace })
                        .groupBy('status')
                );
                const queued = tx(runs)
                    .where({ namespace })
                    .whereIn('status', ['queued', 'retry_wait']);
                const queuedDefinitions = await rawQuery(
                    tx,
                    object({
                        name: string(),
                        version: number(),
                        count: number()
                    }),
                    queued
                        .clone()
                        .select('name', 'version')
                        .select(tx.raw('count(*)::float8 as count'))
                        .groupBy('name', 'version')
                );
                const oldest = await rawQuery(
                    tx,
                    object({ at: number().nullable() }),
                    queued
                        .clone()
                        .whereRaw('?? <= ' + clockSql, ['availableAt'])
                        .select(
                            tx.raw('min(??)::float8 as at', ['availableAt'])
                        )
                );
                return {
                    counts: Object.fromEntries(
                        counts.map(row => [row.status, row.count])
                    ),
                    oldestReadyAt: oldest[0].at,
                    queuedDefinitions
                } satisfies JobRepositoryHealth;
            }
        };
    }
}

/** Durable PostgreSQL repository with database-time leases and SKIP LOCKED claims. */
export class PostgresJobRepository extends JobRepository {
    constructor(knex: Knex, options: PostgresStorageOptions = {}) {
        super(new PostgresJobStorage(knex, options));
    }
}
