import type {
    JobAttempt,
    JobEvent,
    RunRecord,
    ScheduleRecord
} from './contracts.js';
import { isTerminal, JobRepository } from './repository.js';
import type { JobStorage, JobStorageTransaction } from './storage.js';

/** Shared process-local state; reuse one instance to model multiple workers. */
export class InMemoryJobStorage implements JobStorage {
    private runs = new Map<string, RunRecord>();
    private schedules = new Map<string, ScheduleRecord>();
    private eventLog = new Map<string, JobEvent[]>();
    private attemptLog = new Map<string, JobAttempt[]>();
    private tail: Promise<void> = Promise.resolve();
    /** Inject a deterministic clock for conformance/recovery tests. */
    constructor(private readonly clock: () => number = Date.now) {}

    /** Serialize transactions and restore snapshots on failure. Returned data is detached. */
    async atomic<T>(
        action: (transaction: JobStorageTransaction) => Promise<T>
    ): Promise<T> {
        const previous = this.tail;
        let release!: () => void;
        this.tail = new Promise(resolve => {
            release = resolve;
        });
        await previous;
        const snapshot = structuredClone([
            this.runs,
            this.schedules,
            this.eventLog,
            this.attemptLog
        ]);
        const scheduleKey = (namespace: string, id: string) =>
            JSON.stringify([namespace, id]);
        const tx: JobStorageTransaction = {
            now: async () => this.clock(),
            run: async (namespace, id) => {
                const run = this.runs.get(id);
                return run?.namespace === namespace
                    ? structuredClone(run)
                    : undefined;
            },
            insertRun: async run => {
                const existing =
                    run.dedupeKey === null
                        ? undefined
                        : [...this.runs.values()].find(
                              item =>
                                  item.namespace === run.namespace &&
                                  item.dedupeKey === run.dedupeKey
                          );
                if (existing)
                    return {
                        record: structuredClone(existing),
                        inserted: false
                    };
                this.runs.set(run.id, structuredClone(run));
                return { record: structuredClone(run), inserted: true };
            },
            saveRun: async run => {
                this.runs.set(run.id, structuredClone(run));
            },
            runnable: async (namespace, supported) => {
                const now = this.clock();
                return structuredClone(
                    [...this.runs.values()]
                        .filter(
                            run =>
                                run.namespace === namespace &&
                                (run.status === 'running'
                                    ? run.leaseExpiresAt! <= now
                                    : (run.status === 'queued' ||
                                          run.status === 'retry_wait') &&
                                      run.availableAt <= now &&
                                      supported.some(
                                          job =>
                                              job.name === run.name &&
                                              job.version === run.version
                                      ))
                        )
                        .sort(
                            (a, b) =>
                                a.availableAt - b.availableAt ||
                                a.id.localeCompare(b.id)
                        )[0]
                );
            },
            appendEvent: async event => {
                const events = this.eventLog.get(event.runId) ?? [];
                if (events.some(item => item.sequence === event.sequence))
                    throw new Error('Duplicate event sequence');
                events.push(structuredClone(event));
                this.eventLog.set(event.runId, events);
            },
            events: async (id, after, limit) =>
                structuredClone(
                    (this.eventLog.get(id) ?? [])
                        .filter(event => event.sequence > after)
                        .slice(0, limit)
                ),
            saveAttempt: async attempt => {
                const attempts = this.attemptLog.get(attempt.runId) ?? [];
                const index = attempts.findIndex(
                    item => item.attempt === attempt.attempt
                );
                if (index < 0) attempts.push(structuredClone(attempt));
                else attempts[index] = structuredClone(attempt);
                this.attemptLog.set(attempt.runId, attempts);
            },
            attempts: async id =>
                structuredClone(this.attemptLog.get(id) ?? []),
            schedule: async (namespace, id) =>
                structuredClone(this.schedules.get(scheduleKey(namespace, id))),
            insertSchedule: async schedule => {
                const key = scheduleKey(schedule.namespace, schedule.id);
                if (!this.schedules.has(key))
                    this.schedules.set(key, structuredClone(schedule));
                return structuredClone(this.schedules.get(key)!);
            },
            saveSchedule: async schedule => {
                this.schedules.set(
                    scheduleKey(schedule.namespace, schedule.id),
                    structuredClone(schedule)
                );
            },
            dueSchedules: async (namespace, limit) =>
                structuredClone(
                    [...this.schedules.values()]
                        .filter(
                            item =>
                                item.namespace === namespace &&
                                item.active &&
                                !item.removed &&
                                item.nextAt !== null &&
                                item.nextAt <= this.clock()
                        )
                        .sort((a, b) => a.nextAt! - b.nextAt!)
                        .slice(0, limit)
                ),
            unfinishedScheduleRun: async (namespace, id) =>
                [...this.runs.values()].some(
                    run =>
                        run.namespace === namespace &&
                        run.scheduleId === id &&
                        !isTerminal(run.status)
                ),
            cleanup: async (namespace, limit) => {
                let count = 0;
                for (const run of this.runs.values()) {
                    if (count >= limit) break;
                    if (
                        run.namespace === namespace &&
                        isTerminal(run.status) &&
                        run.completedAt! + run.policy.retentionMs <=
                            this.clock()
                    ) {
                        this.runs.delete(run.id);
                        this.eventLog.delete(run.id);
                        this.attemptLog.delete(run.id);
                        count++;
                    }
                }
                return count;
            },
            health: async namespace => {
                const counts: Record<string, number> = {};
                let oldestReadyAt: number | null = null;
                const definitions = new Map<
                    string,
                    { name: string; version: number; count: number }
                >();
                for (const run of this.runs.values()) {
                    if (run.namespace !== namespace) continue;
                    counts[run.status] = (counts[run.status] ?? 0) + 1;
                    if (
                        run.status === 'queued' ||
                        run.status === 'retry_wait'
                    ) {
                        if (run.availableAt <= this.clock())
                            oldestReadyAt = Math.min(
                                oldestReadyAt ?? Infinity,
                                run.availableAt
                            );
                        const key = JSON.stringify([run.name, run.version]);
                        const entry = definitions.get(key) ?? {
                            name: run.name,
                            version: run.version,
                            count: 0
                        };
                        entry.count++;
                        definitions.set(key, entry);
                    }
                }
                return {
                    counts,
                    oldestReadyAt,
                    queuedDefinitions: [...definitions.values()]
                };
            }
        };
        try {
            return structuredClone(await action(tx));
        } catch (error) {
            [this.runs, this.schedules, this.eventLog, this.attemptLog] =
                snapshot as [
                    typeof this.runs,
                    typeof this.schedules,
                    typeof this.eventLog,
                    typeof this.attemptLog
                ];
            throw error;
        } finally {
            release();
        }
    }
}

/** Test/development repository. Its state is not durable across process exits. */
export class InMemoryJobRepository extends JobRepository {
    constructor(
        options: { storage?: InMemoryJobStorage; now?: () => number } = {}
    ) {
        super(options.storage ?? new InMemoryJobStorage(options.now));
    }
}
