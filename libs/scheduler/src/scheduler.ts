import type { InferType } from '@cleverbrush/schema';
import type {
    JobDefinition,
    JobEvent,
    JobRun,
    RunRecord,
    TaskSchedule
} from './contracts.js';
import { fingerprint, identity, parsePayload, positive } from './definition.js';
import { isTerminal, type JobRepository } from './repository.js';
import { delay } from './wait.js';
import { JobWorker, type JobWorkerOptions } from './worker.js';

/** Producer and schedule-dispatcher options; no implicit in-memory persistence. */
export type JobSchedulerOptions = {
    repository: JobRepository;
    namespace?: string;
    pollIntervalMs?: number;
    onError?: (error: unknown) => void;
};
/** Durable scheduling and production API. Workers have a separate lifecycle. */
export class JobScheduler {
    readonly namespace: string;
    private readonly pollMs: number;
    private controller?: AbortController;
    private loop?: Promise<void>;
    lastError: unknown;
    constructor(private readonly options: JobSchedulerOptions) {
        this.namespace = identity(options.namespace ?? 'default', 'namespace');
        this.pollMs = positive(
            options.pollIntervalMs ?? 1000,
            'pollIntervalMs',
            2147483647
        );
    }
    /** Accept a validated immediate/delayed job, or return its retained duplicate. */
    async enqueue<D extends JobDefinition<any, any, any>>(
        definition: D,
        input: InferType<D['input']>,
        options: { idempotencyKey?: string; runAt?: Date } = {}
    ): Promise<JobRun<InferType<D['output']>>> {
        const parsed = parsePayload(
            definition.input,
            input,
            definition.policy.maxPayloadBytes
        );
        const at = options.runAt?.getTime();
        if (at !== undefined && !Number.isFinite(at))
            throw new RangeError('Invalid runAt');
        const key =
            options.idempotencyKey === undefined
                ? null
                : 'submission:' +
                  fingerprint([
                      definition.name,
                      definition.version,
                      identity(options.idempotencyKey, 'idempotencyKey')
                  ]);
        const run = await this.options.repository.enqueue({
            namespace: this.namespace,
            name: definition.name,
            version: definition.version,
            input: parsed,
            policy: structuredClone(definition.policy),
            dedupeKey: key,
            fingerprint: fingerprint([parsed, definition.policy, at ?? null]),
            availableAt: at
        });
        return this.snapshot(definition, run);
    }
    private snapshot<D extends JobDefinition<any, any, any>>(
        definition: D,
        run: RunRecord
    ): JobRun<InferType<D['output']>> {
        if (run.name !== definition.name || run.version !== definition.version)
            throw new TypeError('Job definition does not match run');
        const {
            leaseToken: _token,
            leaseExpiresAt: _expiry,
            dedupeKey: _key,
            fingerprint: _hash,
            policy: _policy,
            progressCount: _count,
            ...snapshot
        } = run;
        return {
            ...snapshot,
            output:
                run.status === 'succeeded'
                    ? parsePayload(
                          definition.output,
                          run.output,
                          run.policy.maxPayloadBytes
                      )
                    : null
        };
    }
    /** Read a typed snapshot without leaking worker ownership credentials. */
    async getRun<D extends JobDefinition<any, any, any>>(
        definition: D,
        id: string
    ): Promise<JobRun<InferType<D['output']>> | undefined> {
        const run = await this.options.repository.get(this.namespace, id);
        return run ? this.snapshot(definition, run) : undefined;
    }
    /** Replay then follow committed events; disconnecting does not cancel the job. */
    async *events<D extends JobDefinition<any, any, any>>(
        definition: D,
        id: string,
        options: { after?: number; signal?: AbortSignal } = {}
    ): AsyncGenerator<JobEvent<InferType<D['progress']>>> {
        let cursor = options.after ?? 0;
        if (!Number.isSafeInteger(cursor) || cursor < 0)
            throw new RangeError('Invalid event cursor');
        while (!options.signal?.aborted) {
            const run = await this.options.repository.get(this.namespace, id);
            if (!run) return;
            this.snapshot(definition, run);
            const events = await this.options.repository.events(
                this.namespace,
                id,
                cursor
            );
            for (const event of events) {
                if (options.signal?.aborted) return;
                yield event.type === 'progress'
                    ? {
                          ...event,
                          data: parsePayload(
                              definition.progress,
                              event.data,
                              run.policy.maxProgressBytes
                          )
                      }
                    : event;
                cursor = event.sequence;
            }
            if (isTerminal(run.status) && cursor >= run.sequence) return;
            if (events.length < 100) await delay(this.pollMs, options.signal);
        }
    }
    /** Fence cancellation; application authorization must happen before calling. */
    cancel(id: string): Promise<boolean> {
        return this.options.repository.cancel(this.namespace, id);
    }
    /** Create a separately startable worker sharing this namespace/repository. */
    createWorker(options: JobWorkerOptions): JobWorker {
        return new JobWorker(this.options.repository, this.namespace, options);
    }
    /** Upsert future recurrence; already accepted runs are never rewritten. */
    async upsertSchedule<D extends JobDefinition<any, any, any>>(
        id: string,
        definition: D,
        input: InferType<D['input']>,
        options: {
            schedule: TaskSchedule;
            missed?: 'coalesce' | 'skip' | 'replay';
            overlap?: 'allow' | 'skip';
        }
    ) {
        identity(id, 'schedule id');
        const parsed = parsePayload(
            definition.input,
            input,
            definition.policy.maxPayloadBytes
        );
        const missed = options.missed ?? 'coalesce',
            overlap = options.overlap ?? 'allow';
        if (
            !['coalesce', 'skip', 'replay'].includes(missed) ||
            !['allow', 'skip'].includes(overlap)
        )
            throw new TypeError('Invalid schedule policy');
        return this.options.repository.upsertSchedule({
            namespace: this.namespace,
            id,
            name: definition.name,
            version: definition.version,
            input: parsed,
            policy: structuredClone(definition.policy),
            schedule: structuredClone(options.schedule),
            missed,
            overlap,
            fingerprint: fingerprint([
                definition.name,
                definition.version,
                parsed,
                definition.policy,
                {
                    ...options.schedule,
                    startsOn: options.schedule.startsOn?.getTime() ?? null,
                    endsOn: options.schedule.endsOn?.getTime() ?? null
                },
                missed,
                overlap
            ])
        });
    }
    /** Pause/resume future occurrences. Resume applies the configured missed policy. */
    pauseSchedule(id: string, paused = true) {
        return this.options.repository.pauseSchedule(
            this.namespace,
            id,
            paused
        );
    }
    /** Remove a recurring trigger, not its already accepted runs. */
    removeSchedule(id: string) {
        return this.options.repository.removeSchedule(this.namespace, id);
    }
    /** Run one bounded dispatcher pass, useful for externally managed lifecycles. */
    dispatch(): Promise<number> {
        return this.options.repository.dispatch(this.namespace);
    }
    /** Inspect operational counts/queue age and queued definition versions. */
    health() {
        return this.options.repository.health(this.namespace);
    }
    /** Explicit bounded terminal-data cleanup. Workers/dispatcher also run this periodically. */
    cleanup(limit = 100) {
        return this.options.repository.cleanup(
            this.namespace,
            positive(limit, 'cleanup limit', 10000)
        );
    }
    /** Start only recurring dispatch; producer-only processes do not need start(). */
    async start(): Promise<void> {
        if (this.controller) throw new Error('Scheduler already started');
        this.controller = new AbortController();
        const signal = this.controller.signal;
        this.loop = (async () => {
            let cleanupAt = 0;
            while (!signal.aborted) {
                try {
                    await this.dispatch();
                    if (Date.now() >= cleanupAt) {
                        await this.cleanup();
                        cleanupAt = Date.now() + 60000;
                    }
                    this.lastError = undefined;
                } catch (error) {
                    this.lastError = error;
                    try {
                        this.options.onError?.(error);
                    } catch {
                        /* Observer isolation. */
                    }
                }
                await delay(this.pollMs, signal);
            }
        })();
    }
    /** Stop dispatching. Workers must be stopped separately before closing database pools. */
    async stop(): Promise<void> {
        this.controller?.abort();
        await this.loop;
    }
}
