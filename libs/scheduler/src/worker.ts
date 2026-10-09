import { Worker } from 'node:worker_threads';
import type {
    JobBinding,
    JobContext,
    RunPolicy,
    RunRecord,
    SchedulerDiagnostic
} from './contracts.js';
import {
    jobError,
    LeaseLostError,
    NonRetryableJobError,
    parsePayload,
    positive
} from './definition.js';
import type { JobRepository } from './repository.js';
import { delay } from './wait.js';

/** Worker options are local capacity controls, not cluster-wide quotas. */
export type JobWorkerOptions = {
    jobs: readonly JobBinding[];
    concurrency?: number;
    pollIntervalMs?: number;
    leaseMs?: number;
    heartbeatMs?: number;
    onDiagnostic?: (event: SchedulerDiagnostic) => void;
};

/** Executes persisted work with bounded local concurrency and fenced ownership. */
export class JobWorker {
    private readonly bindings = new Map<string, JobBinding>();
    private readonly active = new Map<
        string,
        { abort: AbortController; task: Promise<void> }
    >();
    private readonly concurrency: number;
    private readonly pollMs: number;
    private readonly leaseMs: number;
    private readonly heartbeatMs: number;
    private controller?: AbortController;
    private loop?: Promise<void>;
    private stopPromise?: Promise<void>;
    /** Most recent infrastructure failure; cleared after a successful repository poll. */
    lastError: unknown;

    constructor(
        private readonly repository: JobRepository,
        private readonly namespace: string,
        private readonly options: JobWorkerOptions
    ) {
        this.concurrency = positive(
            options.concurrency ?? 1,
            'concurrency',
            10000
        );
        this.pollMs = positive(
            options.pollIntervalMs ?? 1000,
            'pollIntervalMs',
            2147483647
        );
        this.leaseMs = positive(options.leaseMs ?? 30000, 'leaseMs');
        this.heartbeatMs = positive(
            options.heartbeatMs ?? 10000,
            'heartbeatMs',
            2147483647
        );
        if (this.heartbeatMs >= this.leaseMs)
            throw new RangeError('heartbeatMs must be shorter than leaseMs');
        for (const binding of options.jobs) {
            const key = this.key(
                binding.definition.name,
                binding.definition.version
            );
            if (this.bindings.has(key))
                throw new TypeError('Duplicate job name/version registration');
            if (!!binding.handler === !!binding.moduleUrl)
                throw new TypeError('Register exactly one execution mode');
            this.bindings.set(key, binding);
        }
        if (!this.bindings.size)
            throw new TypeError('At least one handler is required');
    }
    private key(name: string, version: number) {
        return JSON.stringify([name, version]);
    }
    private diagnostic(type: SchedulerDiagnostic['type'], run?: RunRecord) {
        try {
            this.options.onDiagnostic?.({
                type,
                ...(run
                    ? { runId: run.id, name: run.name, attempt: run.attempt }
                    : {})
            });
        } catch {
            /* Observers cannot change job execution semantics. */
        }
    }
    /** Start polling; resolves after startup, not after jobs finish. A worker is single-use. */
    async start(): Promise<void> {
        if (this.controller || this.stopPromise)
            throw new Error('Worker already started or stopped');
        this.controller = new AbortController();
        this.loop = this.poll(this.controller.signal);
    }
    private async poll(signal: AbortSignal) {
        let cleanupAt = 0;
        const supported = [...this.bindings.values()].map(binding => ({
            name: binding.definition.name,
            version: binding.definition.version
        }));
        while (!signal.aborted) {
            try {
                if (Date.now() >= cleanupAt) {
                    await this.repository.cleanup(this.namespace);
                    cleanupAt = Date.now() + 60000;
                }
                while (!signal.aborted && this.active.size < this.concurrency) {
                    const run = await this.repository.claim(
                        this.namespace,
                        supported,
                        this.leaseMs
                    );
                    this.lastError = undefined;
                    if (!run) break;
                    if (signal.aborted) {
                        await this.repository.fail(
                            this.namespace,
                            run.id,
                            run.leaseToken!,
                            {
                                code: 'shutdown',
                                message: 'Worker stopped after claim'
                            },
                            true,
                            true
                        );
                        break;
                    }
                    const abort = new AbortController();
                    const task = this.execute(run, abort)
                        .catch(error => {
                            this.lastError = error;
                            this.diagnostic('infrastructure_error', run);
                        })
                        .finally(() => this.active.delete(run.id));
                    this.active.set(run.id, { abort, task });
                }
            } catch (error) {
                this.lastError = error;
                this.diagnostic('infrastructure_error');
            }
            await delay(this.pollMs, signal);
        }
    }
    private async inThread(
        binding: JobBinding,
        input: unknown,
        context: JobContext,
        policy: RunPolicy
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const thread = new Worker(
                new URL('./thread-entry.js', import.meta.url),
                {
                    workerData: {
                        moduleUrl: binding.moduleUrl,
                        input,
                        runId: context.runId,
                        attempt: context.attempt,
                        policy
                    },
                    execArgv: [],
                    stdout: true,
                    stderr: true
                }
            );
            // Drain rather than buffer unbounded output or persist possible secrets.
            thread.stdout.resume();
            thread.stderr.resume();
            let settled = false;
            const finish = (error?: unknown, value?: unknown) => {
                if (settled) return;
                settled = true;
                context.signal.removeEventListener('abort', abort);
                void thread
                    .terminate()
                    .then(
                        () => (error ? reject(error) : resolve(value)),
                        reject
                    );
            };
            const abort = () => {
                thread.postMessage({ type: 'abort' });
                finish(context.signal.reason ?? new Error('Aborted'));
            };
            context.signal.addEventListener('abort', abort, { once: true });
            thread.on('message', message => {
                if (message?.type === 'progress') {
                    void context.report(message.data).then(
                        () => {
                            if (!settled)
                                thread.postMessage({
                                    type: 'ack',
                                    sequence: message.sequence
                                });
                        },
                        error => {
                            if (!settled)
                                thread.postMessage({
                                    type: 'ack',
                                    sequence: message.sequence,
                                    error: jobError(error)
                                });
                        }
                    );
                } else if (message?.type === 'result')
                    finish(undefined, message.value);
                else if (message?.type === 'error')
                    finish(
                        message.retryable
                            ? new Error(message.error.message)
                            : new NonRetryableJobError(
                                  message.error.message,
                                  message.error.code
                              )
                    );
            });
            thread.on('error', error => finish(error));
            thread.on('exit', code => {
                if (!settled)
                    finish(
                        new Error(
                            'Worker thread exited without a result (' +
                                code +
                                ')'
                        )
                    );
            });
            if (context.signal.aborted) abort();
        });
    }
    private async execute(
        run: RunRecord,
        abort: AbortController
    ): Promise<void> {
        const binding = this.bindings.get(this.key(run.name, run.version))!;
        const owner = [this.namespace, run.id, run.leaseToken!] as const;
        const heartbeatStop = new AbortController();
        let heartbeatError: unknown;
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            abort.abort(new Error('Job attempt timed out'));
        }, run.policy.timeoutMs);
        const heartbeat = (async () => {
            while (!heartbeatStop.signal.aborted) {
                await delay(this.heartbeatMs, heartbeatStop.signal);
                if (heartbeatStop.signal.aborted) break;
                try {
                    await this.repository.heartbeat(...owner, this.leaseMs);
                } catch (error) {
                    heartbeatError = error;
                    abort.abort(error);
                    break;
                }
            }
        })();
        const reports = new Set<Promise<void>>();
        const context: JobContext = {
            runId: run.id,
            attempt: run.attempt,
            signal: abort.signal,
            report: data => {
                if (reports.size >= run.policy.maxProgressEvents) {
                    const error = new NonRetryableJobError(
                        'Progress event limit exceeded',
                        'progress_limit'
                    );
                    abort.abort(error);
                    const rejected = Promise.reject<void>(error);
                    void rejected.catch(() => undefined);
                    return rejected;
                }
                const promise = Promise.resolve().then(async () => {
                    abort.signal.throwIfAborted();
                    const progress = parsePayload(
                        binding.definition.progress,
                        data,
                        run.policy.maxProgressBytes
                    );
                    await this.repository.report(...owner, progress);
                });
                reports.add(promise);
                // Retain failures for completion even when the handler forgets to await.
                void promise.catch(() => undefined);
                return promise;
            }
        };
        this.diagnostic('started', run);
        let removeAbort = () => {};
        const aborted = new Promise<never>((_, reject) => {
            const listener = () =>
                reject(abort.signal.reason ?? new Error('Aborted'));
            removeAbort = () =>
                abort.signal.removeEventListener('abort', listener);
            abort.signal.addEventListener('abort', listener, { once: true });
            if (abort.signal.aborted) listener();
        });
        const work = Promise.resolve().then(async () => {
            const input = parsePayload(
                binding.definition.input,
                run.input,
                run.policy.maxPayloadBytes
            );
            const output = binding.handler
                ? await binding.handler(input, context)
                : await this.inThread(binding, input, context, run.policy);
            await Promise.all(reports);
            return parsePayload(
                binding.definition.output,
                output,
                run.policy.maxPayloadBytes
            );
        });
        try {
            const output = await Promise.race([work, aborted]);
            await this.repository.complete(...owner, output);
        } catch (error) {
            if (heartbeatError) {
                this.diagnostic(
                    heartbeatError instanceof LeaseLostError
                        ? 'lease_lost'
                        : 'infrastructure_error',
                    run
                );
            } else {
                try {
                    const interrupted =
                        abort.signal.aborted &&
                        !timedOut &&
                        !(error instanceof NonRetryableJobError);
                    const failure = timedOut
                        ? { code: 'timeout', message: 'Job attempt timed out' }
                        : interrupted
                          ? {
                                code: 'shutdown',
                                message: 'Worker shutdown interrupted execution'
                            }
                          : jobError(error);
                    await this.repository.fail(
                        ...owner,
                        failure,
                        !(error instanceof NonRetryableJobError),
                        interrupted
                    );
                } catch (failure) {
                    this.lastError = failure;
                    this.diagnostic(
                        failure instanceof LeaseLostError
                            ? 'lease_lost'
                            : 'infrastructure_error',
                        run
                    );
                }
            }
        } finally {
            clearTimeout(timeout);
            removeAbort();
            heartbeatStop.abort();
            await heartbeat;
            this.diagnostic('settled', run);
        }
        // A non-cooperative function still occupies its local slot. Never start an
        // unbounded stream of overlapping functions just because timers expired.
        await work.catch(() => undefined);
    }
    /** Stop claims, drain, then abort. Does not forcibly stop an ordinary function. */
    stop(options: { drainTimeoutMs?: number } = {}): Promise<void> {
        if (this.stopPromise) return this.stopPromise;
        this.stopPromise = this.shutdown(
            positive(
                options.drainTimeoutMs ?? 30000,
                'drainTimeoutMs',
                2147483647
            )
        );
        return this.stopPromise;
    }
    private async shutdown(drainTimeoutMs: number): Promise<void> {
        this.controller?.abort();
        await this.loop;
        const deadline = new AbortController();
        const all = Promise.all(
            [...this.active.values()].map(entry => entry.task)
        );
        await Promise.race([all, delay(drainTimeoutMs, deadline.signal)]);
        deadline.abort();
        for (const entry of this.active.values())
            entry.abort.abort(new Error('Worker shutdown'));
        // Give cooperative handlers/fenced failures a bounded chance to settle.
        if (this.active.size) {
            const cancellation = new AbortController();
            await Promise.race([
                all,
                delay(Math.min(drainTimeoutMs, 1000), cancellation.signal)
            ]);
            cancellation.abort();
        }
    }
}
