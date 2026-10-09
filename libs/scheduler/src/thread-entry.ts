import { parentPort, workerData } from 'node:worker_threads';
import type { JobContext } from './contracts.js';
import { jobError, jsonValue, NonRetryableJobError } from './definition.js';

const port = parentPort!;
const abort = new AbortController();
const pending = new Map<
    number,
    { resolve: () => void; reject: (error: Error) => void }
>();
let sequence = 0;
const reports = new Set<Promise<void>>();
port.on('message', message => {
    if (message.type === 'abort') abort.abort();
    if (message.type === 'ack') {
        const waiter = pending.get(message.sequence);
        pending.delete(message.sequence);
        if (message.error)
            waiter?.reject(
                new NonRetryableJobError(
                    message.error.message,
                    message.error.code
                )
            );
        else waiter?.resolve();
    }
});
const context: JobContext = {
    runId: workerData.runId,
    attempt: workerData.attempt,
    signal: abort.signal,
    report: data => {
        if (reports.size >= workerData.policy.maxProgressEvents)
            throw new NonRetryableJobError(
                'Progress event limit exceeded',
                'progress_limit'
            );
        const promise = new Promise<void>((resolve, reject) => {
            const id = ++sequence;
            const snapshot = jsonValue(
                data,
                workerData.policy.maxProgressBytes
            );
            pending.set(id, { resolve, reject });
            port.postMessage({
                type: 'progress',
                sequence: id,
                data: snapshot
            });
        });
        reports.add(promise);
        void promise.catch(() => undefined);
        return promise;
    }
};
try {
    const module = await import(workerData.moduleUrl);
    if (typeof module.default !== 'function')
        throw new NonRetryableJobError(
            'Thread module must default-export a handler',
            'invalid_handler'
        );
    const result = await module.default(workerData.input, context);
    await Promise.all(reports);
    port.postMessage({
        type: 'result',
        value: jsonValue(result, workerData.policy.maxPayloadBytes)
    });
} catch (error) {
    port.postMessage({
        type: 'error',
        error: jobError(error),
        retryable: !(error instanceof NonRetryableJobError)
    });
} finally {
    port.close();
}
