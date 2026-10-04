import { afterEach, describe, expect, it, vi } from 'vitest';
import { testJob } from '../testing/repository-contract.js';
import {
    InMemoryJobRepository,
    JobScheduler,
    type JobWorker
} from './index.js';

const { threads } = vi.hoisted(() => ({ threads: [] as any[] }));
vi.mock('node:worker_threads', async () => {
    const { EventEmitter } = await import('node:events');
    return {
        Worker: class extends EventEmitter {
            stdout = { resume: vi.fn() };
            stderr = { resume: vi.fn() };
            terminate = vi.fn(async () => {
                this.emit('exit', 0);
                return 0;
            });
            postMessage = vi.fn((message: any) => {
                if (message.type === 'ack') {
                    if (message.error)
                        this.emit('message', {
                            type: 'error',
                            error: message.error,
                            retryable: false
                        });
                    else
                        this.emit('message', {
                            type: 'result',
                            value: { url: '/result' }
                        });
                }
            });
            constructor(
                readonly url: URL,
                readonly options: any
            ) {
                super();
                threads.push(this);
                queueMicrotask(() => {
                    const mode = options.workerData.input.id;
                    if (mode === 'hang') return;
                    if (mode === 'error') {
                        this.emit('error', new Error('thread crashed'));
                        return;
                    }
                    if (mode === 'exit') {
                        this.emit('exit', 7);
                        return;
                    }
                    if (mode === 'retryable') {
                        this.emit('message', {
                            type: 'error',
                            error: { message: 'temporary' },
                            retryable: true
                        });
                        return;
                    }
                    this.emit('message', { type: 'ignored' });
                    this.emit('message', {
                        type: 'progress',
                        sequence: 1,
                        data: { percent: mode === 'invalid' ? 'bad' : 50 }
                    });
                });
            }
        }
    };
});
const workers: JobWorker[] = [];
afterEach(async () => {
    await Promise.all(
        workers.splice(0).map(worker => worker.stop({ drainTimeoutMs: 30 }))
    );
    threads.length = 0;
});

describe('worker thread coordination', () => {
    it.each(['success', 'invalid', 'error', 'exit', 'hang', 'retryable'])(
        'settles %s and releases the worker',
        async mode => {
            const repository = new InMemoryJobRepository();
            const scheduler = new JobScheduler({
                storageRepository: repository
            });
            const job = testJob({ timeoutMs: mode === 'hang' ? 30 : 1000 });
            const run = await scheduler.enqueue(job, { id: mode });
            const worker = scheduler.createWorker({
                pollIntervalMs: 2,
                jobs: [job.thread(new URL('file:///jobs/handler.mjs'))]
            });
            workers.push(worker);
            await worker.start();
            await vi.waitFor(async () =>
                expect(await scheduler.getRun(job, run.id)).toHaveProperty(
                    'status',
                    mode === 'success' ? 'succeeded' : 'failed'
                )
            );
            const thread = threads[0];
            expect(thread.stdout.resume).toHaveBeenCalledOnce();
            expect(thread.stderr.resume).toHaveBeenCalledOnce();
            expect(thread.terminate).toHaveBeenCalledOnce();
            expect(thread.options.workerData.runId).toBe(run.id);
            if (mode === 'success') {
                expect(thread.postMessage).toHaveBeenCalledWith({
                    type: 'ack',
                    sequence: 1
                });
                expect(
                    (await repository.events('default', run.id, 0)).map(
                        event => event.type
                    )
                ).toEqual(['queued', 'running', 'progress', 'succeeded']);
            }
            if (mode === 'hang') {
                expect(thread.postMessage).toHaveBeenCalledWith({
                    type: 'abort'
                });
                expect(await scheduler.getRun(job, run.id)).toMatchObject({
                    error: { code: 'timeout' }
                });
            }
            if (mode === 'invalid')
                expect(await scheduler.getRun(job, run.id)).toMatchObject({
                    error: { code: 'invalid_payload' }
                });
        }
    );
});
