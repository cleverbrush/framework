import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it, vi } from 'vitest';
// Exercise the packed build: thread-entry.js must be emitted beside index.js.
import {
    defineJob,
    InMemoryJobRepository,
    JobScheduler
} from '../dist/index.js';

describe('packaged worker threads', () => {
    it.each([
        'success',
        'exit',
        'hang',
        'invalid',
        'accessor',
        'unawaited-invalid'
    ])('handles %s without leaking a worker', async mode => {
        const job = defineJob({
            name: 'thread',
            version: 1,
            input: object({ id: string(), mode: string() }),
            progress: object({ percent: number() }),
            output: object({ url: string() }),
            timeoutMs: mode === 'hang' ? 200 : 5000
        });
        const repository = new InMemoryJobRepository();
        const scheduler = new JobScheduler({ repository });
        const run = await scheduler.enqueue(job, { id: 'one', mode });
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.thread(
                    new URL(
                        '../../../demos/durable-jobs/thread-handler.mjs',
                        import.meta.url
                    )
                )
            ]
        });
        await worker.start();
        try {
            await vi.waitFor(
                async () =>
                    expect(await scheduler.getRun(job, run.id)).toHaveProperty(
                        'status',
                        mode === 'success' ? 'succeeded' : 'failed'
                    ),
                { timeout: 6000 }
            );
            if (mode === 'success')
                expect(
                    (await repository.events('default', run.id, 0)).map(
                        event => event.type
                    )
                ).toEqual(['queued', 'running', 'progress', 'succeeded']);
            if (mode === 'hang')
                expect(await scheduler.getRun(job, run.id)).toMatchObject({
                    error: { code: 'timeout' }
                });
            if (['invalid', 'accessor', 'unawaited-invalid'].includes(mode))
                expect(await scheduler.getRun(job, run.id)).toMatchObject({
                    error: { code: 'invalid_payload' }
                });
        } finally {
            await worker.stop({ drainTimeoutMs: 100 });
        }
    });
});
