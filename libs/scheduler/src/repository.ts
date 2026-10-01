import { randomUUID } from 'node:crypto';
import type {
    JobAttempt,
    JobError,
    JobEvent,
    JsonValue,
    RunRecord,
    ScheduleRecord,
    TaskSchedule
} from './contracts.js';
import {
    fingerprint,
    jsonValue,
    LeaseLostError,
    NonRetryableJobError,
    SubmissionConflictError
} from './definition.js';
import {
    latestDueOccurrence,
    nextOccurrence,
    storeSchedule
} from './recurrence.js';
import type {
    JobStorage,
    JobStorageTransaction,
    SupportedJob
} from './storage.js';

/** Fields accepted by a repository after schema validation by the producer. */
export type JobSubmission = Pick<
    RunRecord,
    | 'namespace'
    | 'name'
    | 'version'
    | 'input'
    | 'policy'
    | 'dedupeKey'
    | 'fingerprint'
> & { availableAt?: number };
/** Schedule registration, before its initial anchor/cursor is persisted. */
export type ScheduleSubmission = Omit<
    ScheduleRecord,
    'revision' | 'active' | 'removed' | 'cursor' | 'nextAt' | 'schedule'
> & { schedule: TaskSchedule };
/** Terminal states are immutable and eligible for retention cleanup. */
export function isTerminal(status: string): boolean {
    return (
        status === 'succeeded' || status === 'failed' || status === 'cancelled'
    );
}

/**
 * Shared durable transition engine. Adapters supply locking/storage, not policy.
 * Lease fencing protects scheduler state only, never a handler's external effects.
 */
export class JobRepository {
    constructor(readonly storage: JobStorage) {}

    private async emit(
        tx: JobStorageTransaction,
        run: RunRecord,
        type: JobEvent['type'],
        data: JsonValue | JobError | null,
        at: number
    ) {
        run.sequence++;
        await tx.appendEvent({
            runId: run.id,
            sequence: run.sequence,
            attempt: run.attempt,
            at,
            ...(type === 'progress'
                ? { type, data }
                : { type, data: data as JobError | null })
        });
        await tx.saveRun(run);
    }

    private async insert(
        tx: JobStorageTransaction,
        submission: JobSubmission,
        now: number,
        scheduleId: string | null = null
    ): Promise<RunRecord> {
        const record: RunRecord = {
            ...submission,
            id: randomUUID(),
            status: 'queued',
            output: null,
            error: null,
            attempt: 0,
            createdAt: now,
            availableAt: submission.availableAt ?? now,
            completedAt: null,
            scheduleId,
            sequence: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            progressCount: 0
        };
        const result = await tx.insertRun(record);
        if (result.record.fingerprint !== submission.fingerprint)
            throw new SubmissionConflictError();
        if (result.inserted) await this.emit(tx, record, 'queued', null, now);
        return result.inserted ? record : result.record;
    }

    /** Resolve only after persisted acceptance (or the enclosing transaction commit). */
    enqueue(submission: JobSubmission): Promise<RunRecord> {
        return this.storage.atomic(async tx =>
            this.insert(tx, submission, await tx.now())
        );
    }

    private async attemptEnd(
        tx: JobStorageTransaction,
        run: RunRecord,
        status: JobAttempt['status'],
        error: JobError | null,
        now: number
    ) {
        const attempt = (await tx.attempts(run.id)).find(
            item => item.attempt === run.attempt
        );
        if (!attempt) throw new Error('Missing running attempt');
        await tx.saveAttempt({ ...attempt, endedAt: now, status, error });
    }

    private async endFailed(
        tx: JobStorageTransaction,
        run: RunRecord,
        error: JobError,
        retryable: boolean,
        interrupted: boolean,
        now: number
    ) {
        await this.attemptEnd(
            tx,
            run,
            interrupted ? 'interrupted' : 'failed',
            error,
            now
        );
        const retry = run.policy.retry;
        run.error = error;
        run.leaseToken = null;
        run.leaseExpiresAt = null;
        if (retryable && run.attempt < retry.maxAttempts) {
            run.status = 'retry_wait';
            run.availableAt =
                now +
                Math.min(
                    retry.maxDelayMs,
                    retry.initialDelayMs * 2 ** (run.attempt - 1)
                );
        } else {
            run.status = 'failed';
            run.completedAt = now;
        }
        await this.emit(tx, run, run.status, error, now);
    }

    /** Atomically acquire one run. Expired attempts are recorded before any retry. */
    claim(
        namespace: string,
        supported: readonly SupportedJob[],
        leaseMs: number
    ): Promise<RunRecord | undefined> {
        return this.storage.atomic(async tx => {
            const run = await tx.runnable(namespace, supported);
            if (!run) return undefined;
            const now = await tx.now();
            if (run.status === 'running') {
                await this.endFailed(
                    tx,
                    run,
                    { code: 'lease_expired', message: 'Worker lease expired' },
                    true,
                    true,
                    now
                );
                return undefined;
            }
            run.status = 'running';
            run.attempt++;
            run.error = null;
            run.leaseToken = randomUUID();
            run.leaseExpiresAt = now + leaseMs;
            await tx.saveAttempt({
                runId: run.id,
                attempt: run.attempt,
                startedAt: now,
                endedAt: null,
                status: 'running',
                error: null
            });
            await this.emit(tx, run, 'running', null, now);
            return run;
        });
    }

    private owned<T>(
        namespace: string,
        id: string,
        token: string,
        action: (
            tx: JobStorageTransaction,
            run: RunRecord,
            now: number
        ) => Promise<T>
    ): Promise<T> {
        return this.storage.atomic(async tx => {
            const run = await tx.run(namespace, id, true);
            const now = await tx.now();
            if (
                !run ||
                run.status !== 'running' ||
                run.leaseToken !== token ||
                run.leaseExpiresAt! <= now
            )
                throw new LeaseLostError();
            return action(tx, run, now);
        });
    }

    /** Renew an unexpired lease; a late heartbeat cannot resurrect ownership. */
    heartbeat(
        namespace: string,
        id: string,
        token: string,
        leaseMs: number
    ): Promise<void> {
        return this.owned(namespace, id, token, async (tx, run, now) => {
            run.leaseExpiresAt = now + leaseMs;
            await tx.saveRun(run);
        });
    }

    /** Commit ordered progress within the ownership transaction. */
    report(
        namespace: string,
        id: string,
        token: string,
        progress: JsonValue
    ): Promise<void> {
        return this.owned(namespace, id, token, async (tx, run, now) => {
            const data = jsonValue(progress, run.policy.maxProgressBytes);
            if (run.progressCount >= run.policy.maxProgressEvents)
                throw new NonRetryableJobError(
                    'Progress event limit exceeded',
                    'progress_limit'
                );
            run.progressCount++;
            await this.emit(tx, run, 'progress', data, now);
        });
    }

    /** Publish output and terminal event atomically, rejecting stale owners. */
    complete(
        namespace: string,
        id: string,
        token: string,
        output: JsonValue
    ): Promise<void> {
        return this.owned(namespace, id, token, async (tx, run, now) => {
            run.output = jsonValue(output, run.policy.maxPayloadBytes);
            await this.attemptEnd(tx, run, 'succeeded', null, now);
            run.status = 'succeeded';
            run.completedAt = now;
            run.leaseToken = null;
            run.leaseExpiresAt = null;
            await this.emit(tx, run, 'succeeded', null, now);
        });
    }

    /** Persist a failure or shutdown interruption and its retry decision. */
    fail(
        namespace: string,
        id: string,
        token: string,
        error: JobError,
        retryable = true,
        interrupted = false
    ): Promise<void> {
        return this.owned(namespace, id, token, (tx, run, now) =>
            this.endFailed(tx, run, error, retryable, interrupted, now)
        );
    }

    /** Fence a running owner immediately; physical cancellation is cooperative. */
    cancel(namespace: string, id: string): Promise<boolean> {
        return this.storage.atomic(async tx => {
            const run = await tx.run(namespace, id, true);
            if (!run || isTerminal(run.status)) return false;
            const now = await tx.now();
            if (run.status === 'running')
                await this.attemptEnd(tx, run, 'cancelled', null, now);
            run.status = 'cancelled';
            run.completedAt = now;
            run.leaseToken = null;
            run.leaseExpiresAt = null;
            await this.emit(tx, run, 'cancelled', null, now);
            return true;
        });
    }

    /** Read a detached internal record. Applications should use JobScheduler.getRun. */
    get(namespace: string, id: string): Promise<RunRecord | undefined> {
        return this.storage.atomic(tx => tx.run(namespace, id));
    }
    /** Read a bounded page of committed events, scoped through the owning run. */
    events(
        namespace: string,
        id: string,
        after: number,
        limit = 100
    ): Promise<JobEvent[]> {
        return this.storage.atomic(async tx =>
            (await tx.run(namespace, id)) ? tx.events(id, after, limit) : []
        );
    }
    /** Read attempt audit history, scoped through the owning run. */
    attempts(namespace: string, id: string): Promise<JobAttempt[]> {
        return this.storage.atomic(async tx =>
            (await tx.run(namespace, id)) ? tx.attempts(id) : []
        );
    }
    /** Purge terminal data only; deduplication ends when the retained run is removed. */
    cleanup(namespace: string, limit = 100): Promise<number> {
        return this.storage.atomic(tx => tx.cleanup(namespace, limit));
    }
    /** Inspect aggregate queue health without reading payloads. */
    health(namespace: string) {
        return this.storage.atomic(tx => tx.health(namespace));
    }

    /** Idempotent identical registration; changed specs create future-only revisions. */
    upsertSchedule(submission: ScheduleSubmission): Promise<ScheduleRecord> {
        return this.storage.atomic(async tx => {
            const now = await tx.now();
            const rule = storeSchedule(submission.schedule, now);
            const cursor = rule.skipFirst ?? 0;
            const proposed: ScheduleRecord = {
                ...submission,
                schedule: rule,
                revision: 1,
                active: true,
                removed: false,
                cursor,
                nextAt: nextOccurrence(rule, cursor)?.at ?? null
            };
            const current = await tx.insertSchedule(proposed);
            if (
                current.fingerprint === proposed.fingerprint &&
                !current.removed
            )
                return current;
            // Changed triggers only affect future slots, even when callers retain
            // the original startsOn anchor. Never replay a previous revision's past.
            const past = latestDueOccurrence(
                rule,
                cursor,
                (await tx.now()) - 1
            );
            const revisedCursor = past ? past.index + 1 : cursor;
            const next = {
                ...proposed,
                revision: current.revision + 1,
                cursor: revisedCursor,
                nextAt: nextOccurrence(rule, revisedCursor)?.at ?? null
            };
            await tx.saveSchedule(next);
            return next;
        });
    }
    /** Pausing stops new occurrences, not already accepted runs. */
    pauseSchedule(
        namespace: string,
        id: string,
        paused = true
    ): Promise<boolean> {
        return this.storage.atomic(async tx => {
            const current = await tx.schedule(namespace, id);
            if (!current || current.removed) return false;
            await tx.saveSchedule({ ...current, active: !paused });
            return true;
        });
    }
    /** Tombstone a trigger while preserving identity/revision history. */
    removeSchedule(namespace: string, id: string): Promise<boolean> {
        return this.storage.atomic(async tx => {
            const current = await tx.schedule(namespace, id);
            if (!current || current.removed) return false;
            await tx.saveSchedule({ ...current, active: false, removed: true });
            return true;
        });
    }

    /** Atomically materialize due occurrences and advance locked schedule cursors. */
    dispatch(
        namespace: string,
        scheduleLimit = 10,
        replayLimit = 100
    ): Promise<number> {
        return this.storage.atomic(async tx => {
            const schedules = await tx.dueSchedules(namespace, scheduleLimit);
            let inserted = 0;
            for (const schedule of schedules) {
                const now = await tx.now();
                const first = nextOccurrence(
                    schedule.schedule,
                    schedule.cursor
                );
                if (!first || first.at > now) continue;
                const due: (typeof first)[] = [];
                if (schedule.missed === 'replay') {
                    let candidate: typeof first | undefined = first;
                    while (
                        candidate &&
                        candidate.at <= now &&
                        due.length < replayLimit
                    ) {
                        due.push(candidate);
                        candidate = nextOccurrence(
                            schedule.schedule,
                            candidate.index + 1
                        );
                    }
                    schedule.cursor = due.at(-1)!.index + 1;
                } else {
                    const last = latestDueOccurrence(
                        schedule.schedule,
                        first.index,
                        now
                    )!;
                    if (
                        schedule.missed === 'coalesce' ||
                        last.index === first.index
                    )
                        due.push(last);
                    schedule.cursor = last.index + 1;
                }
                for (const occurrence of due) {
                    if (
                        schedule.overlap === 'skip' &&
                        (await tx.unfinishedScheduleRun(namespace, schedule.id))
                    )
                        continue;
                    const submission = {
                        namespace,
                        name: schedule.name,
                        version: schedule.version,
                        input: schedule.input,
                        policy: schedule.policy,
                        availableAt: occurrence.at,
                        dedupeKey:
                            'occurrence:' +
                            fingerprint([
                                schedule.id,
                                schedule.revision,
                                occurrence.index
                            ]),
                        fingerprint: fingerprint([
                            schedule.fingerprint,
                            schedule.revision,
                            occurrence.index
                        ])
                    };
                    await this.insert(tx, submission, now, schedule.id);
                    inserted++;
                }
                schedule.nextAt =
                    nextOccurrence(schedule.schedule, schedule.cursor)?.at ??
                    null;
                await tx.saveSchedule(schedule);
            }
            return inserted;
        });
    }
}
