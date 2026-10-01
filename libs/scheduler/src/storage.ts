import type {
    JobAttempt,
    JobEvent,
    RunRecord,
    ScheduleRecord
} from './contracts.js';

/** Name/version pair a worker is deployed to execute. */
export type SupportedJob = { name: string; version: number };
/**
 * Transactional storage primitives for adapter authors.
 * Locked rows remain locked until atomic() commits. Reads/writes must be detached.
 * Implementations must roll back every write on callback failure.
 */
export interface JobStorageTransaction {
    /** Current repository time, obtained after any blocking lock acquisition. */
    now(): Promise<number>;
    run(
        namespace: string,
        id: string,
        lock?: boolean
    ): Promise<RunRecord | undefined>;
    /** Insert or return the conflicting dedupe record, atomically. */
    insertRun(
        run: RunRecord
    ): Promise<{ record: RunRecord; inserted: boolean }>;
    saveRun(run: RunRecord): Promise<void>;
    /** Lock one ready supported run OR any expired owner; skip rows locked elsewhere. */
    runnable(
        namespace: string,
        supported: readonly SupportedJob[]
    ): Promise<RunRecord | undefined>;
    appendEvent(event: JobEvent): Promise<void>;
    events(runId: string, after: number, limit: number): Promise<JobEvent[]>;
    saveAttempt(attempt: JobAttempt): Promise<void>;
    attempts(runId: string): Promise<JobAttempt[]>;
    schedule(
        namespace: string,
        id: string
    ): Promise<ScheduleRecord | undefined>;
    /** Insert-if-absent; returns the actual locked record, including concurrent inserts. */
    insertSchedule(schedule: ScheduleRecord): Promise<ScheduleRecord>;
    saveSchedule(schedule: ScheduleRecord): Promise<void>;
    dueSchedules(namespace: string, limit: number): Promise<ScheduleRecord[]>;
    unfinishedScheduleRun(
        namespace: string,
        scheduleId: string
    ): Promise<boolean>;
    /** Lock and remove expired terminal runs plus dependent events/attempts. */
    cleanup(namespace: string, limit: number): Promise<number>;
    /** Lightweight aggregate health; no job payloads. */
    health(namespace: string): Promise<JobRepositoryHealth>;
}
/** Aggregate health includes queued versions so deployments can detect unsupported work. */
export type JobRepositoryHealth = {
    counts: Record<string, number>;
    oldestReadyAt: number | null;
    queuedDefinitions: Array<SupportedJob & { count: number }>;
};
/** Adapter transaction boundary. No execution handler runs inside this callback. */
export interface JobStorage {
    atomic<T>(
        action: (transaction: JobStorageTransaction) => Promise<T>
    ): Promise<T>;
}
