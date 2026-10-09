import type { InferType, SchemaBuilder } from '@cleverbrush/schema';

/** Synchronous Framework schema accepted at a durable boundary. */
export type JobSchema = SchemaBuilder<any, any, any, any, any>;
/** Strict durable JSON transport; dates and files should be represented by strings. */
export type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonValue[]
    | { [key: string]: JsonValue };
/** Persisted lifecycle state. */
export type RunStatus =
    | 'queued'
    | 'running'
    | 'retry_wait'
    | 'succeeded'
    | 'failed'
    | 'cancelled';
/** Bounded persisted error, without stack or arbitrary exception properties. */
export type JobError = { code: string; message: string };
/** maxAttempts includes the first execution and lease-expiry recovery. */
export type RetryPolicy = {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
};
/** Resource and retry policy snapshotted when a run is accepted. */
export type RunPolicy = {
    retry: RetryPolicy;
    timeoutMs: number;
    retentionMs: number;
    maxPayloadBytes: number;
    maxProgressBytes: number;
    maxProgressEvents: number;
};
/** Definition defaults. A retry requires an explicit maxAttempts greater than one. */
export type JobOptions = Omit<Partial<RunPolicy>, 'retry'> & {
    retry?: Partial<RetryPolicy>;
};
/** Handler context; cancellation is cooperative for ordinary functions. */
export type JobContext<P = JsonValue> = {
    readonly runId: string;
    readonly attempt: number;
    readonly signal: AbortSignal;
    /** Resolves after the current lease holder commits this progress event. */
    report(progress: P): Promise<void>;
};
/** Strong handler typing without importing execution dependencies into producers. */
export type JobHandler<D extends JobDefinition<any, any, any>> = (
    input: InferType<D['input']>,
    context: JobContext<InferType<D['progress']>>
) => Promise<InferType<D['output']>> | InferType<D['output']>;
/** Trusted deployment registration; module URLs are never enqueued. */
export type JobBinding = {
    readonly definition: JobDefinition<any, any, any>;
    readonly handler?: JobHandler<any>;
    readonly moduleUrl?: string;
};
/** Versioned contract shared by producers and workers. */
export interface JobDefinition<
    I extends JobSchema,
    P extends JobSchema,
    O extends JobSchema
> {
    readonly name: string;
    readonly version: number;
    readonly input: I;
    readonly progress: P;
    readonly output: O;
    readonly policy: Readonly<RunPolicy>;
    /** Bind a handler imported from a separate module. */
    handle(handler: JobHandler<JobDefinition<I, P, O>>): JobBinding;
    /** Bind a module whose default export is a compatible handler. */
    thread(moduleUrl: URL): JobBinding;
}
/** Public snapshot. Times are UTC Unix milliseconds; ownership secrets are excluded. */
export type JobRun<O = JsonValue> = {
    id: string;
    namespace: string;
    name: string;
    version: number;
    status: RunStatus;
    input: JsonValue;
    output: O | null;
    error: JobError | null;
    attempt: number;
    createdAt: number;
    availableAt: number;
    completedAt: number | null;
    scheduleId: string | null;
    sequence: number;
};
/** Ordered event. Cursors are exclusive and scoped to a run. */
export type JobEvent<P = JsonValue> = {
    runId: string;
    sequence: number;
    attempt: number;
    at: number;
} & (
    | { type: 'progress'; data: P }
    | { type: RunStatus; data: JobError | null }
);
/** Audit entry for one acquisition of execution ownership. */
export type JobAttempt = {
    runId: string;
    attempt: number;
    startedAt: number;
    endedAt: number | null;
    status: 'running' | 'succeeded' | 'failed' | 'interrupted' | 'cancelled';
    error: JobError | null;
};
/** Adapter record. Never return lease tokens through an application API. */
export type RunRecord = JobRun & {
    policy: RunPolicy;
    leaseToken: string | null;
    leaseExpiresAt: number | null;
    dedupeKey: string | null;
    fingerprint: string;
    progressCount: number;
};
/** Calendar recurrence. DST gaps are skipped; repeated wall times execute once. */
export type TaskSchedule = import('./schedule-schemas.js').Schedule;
/** Serializable recurrence anchored once at registration, preserving each variant. */
export type StoredSchedule = TaskSchedule extends infer S
    ? S extends TaskSchedule
        ? Omit<S, 'startsOn' | 'endsOn' | 'maxOccurences'> & {
              startsOn: number;
              endsOn?: number;
          }
        : never
    : never;
/** Recurring trigger, revision and persisted cursor. */
export type ScheduleRecord = {
    namespace: string;
    id: string;
    revision: number;
    fingerprint: string;
    active: boolean;
    removed: boolean;
    name: string;
    version: number;
    input: JsonValue;
    policy: RunPolicy;
    schedule: StoredSchedule;
    missed: 'coalesce' | 'skip' | 'replay';
    overlap: 'allow' | 'skip';
    cursor: number;
    nextAt: number | null;
};
/** Operational hook deliberately excludes payloads and credentials. */
export type SchedulerDiagnostic = {
    type: 'started' | 'settled' | 'lease_lost' | 'infrastructure_error';
    runId?: string;
    name?: string;
    attempt?: number;
};
