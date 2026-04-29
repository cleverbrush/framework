import { describe, expect, it, vi } from 'vitest';
import type { LogEvent } from './LogEvent.js';
import { LogLevel } from './LogLevel.js';
import { BatchingSink } from './sinks/BatchingSink.js';

function makeEvent(level: number = LogLevel.Information): LogEvent {
    return {
        timestamp: new Date(),
        level: level as LogEvent['level'],
        messageTemplate: 'Test {Value}',
        renderedMessage: 'Test value',
        properties: { Value: 'value' },
        eventId: '12345678'
    };
}

describe('BatchingSink', () => {
    it('should flush when batch size is reached', async () => {
        const emitFn = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({
            batchSize: 3,
            flushInterval: 60_000,
            emit: emitFn
        });

        await sink.emit([makeEvent(), makeEvent(), makeEvent()]);
        await sink.flush();

        expect(emitFn).toHaveBeenCalledTimes(1);
        expect(emitFn).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    messageTemplate: 'Test {Value}'
                })
            ])
        );
    });

    it('should flush explicitly', async () => {
        const emitFn = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            emit: emitFn
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        expect(emitFn).toHaveBeenCalledTimes(1);
    });

    it('should flush remaining events on dispose', async () => {
        const emitFn = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({
            batchSize: 100,
            emit: emitFn
        });

        await sink.emit([makeEvent()]);
        await (sink as any)[(Symbol as any).asyncDispose]();

        expect(emitFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
        let attempts = 0;
        const emitFn = vi.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('transient');
            }
        });

        const sink = new BatchingSink({
            batchSize: 1,
            maxRetries: 5,
            retryDelay: 1,
            emit: emitFn
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        expect(emitFn).toHaveBeenCalledTimes(3);
    });

    it('should drop oldest when queue is full', async () => {
        const batches: LogEvent[][] = [];
        const emitFn = vi.fn().mockImplementation(async (batch: LogEvent[]) => {
            batches.push([...batch]);
        });

        const sink = new BatchingSink({
            batchSize: 100,
            maxQueueSize: 2,
            emit: emitFn
        });

        await sink.emit([
            makeEvent(LogLevel.Trace),
            makeEvent(LogLevel.Debug),
            makeEvent(LogLevel.Information)
        ]);
        await sink.flush();

        // Only 2 events should remain (oldest dropped)
        expect(emitFn).toHaveBeenCalledTimes(1);
        const flushed = batches[0];
        expect(flushed.length).toBe(2);
    });

    it('should not emit after dispose', async () => {
        const emitFn = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({
            batchSize: 100,
            emit: emitFn
        });

        await (sink as any)[(Symbol as any).asyncDispose]();
        await sink.emit([makeEvent()]);
        await sink.flush();

        // Only the dispose flush, not the post-dispose emit
        expect(emitFn).not.toHaveBeenCalled();
    });

    it('emit() returns before the underlying write completes (non-blocking)', async () => {
        let writeStarted = false;
        let writeResolveFn!: () => void;
        const writePromise = new Promise<void>(res => {
            writeResolveFn = res;
        });

        const emitFn = vi.fn().mockImplementation(() => {
            writeStarted = true;
            return writePromise;
        });

        const sink = new BatchingSink({ batchSize: 1, emit: emitFn });

        // emit() must resolve without waiting for the underlying write
        await sink.emit([makeEvent()]);
        expect(writeStarted).toBe(true); // write was kicked off...
        expect(writePromise).not.toBe(undefined); // ...but its promise is still pending

        // unblock the write and confirm flush reports completion
        writeResolveFn();
        await sink.flush();
        expect(emitFn).toHaveBeenCalledTimes(1);
    });

    it('concurrent flush() calls share a single write', async () => {
        let inflight = 0;
        let maxInflight = 0;
        const emitFn = vi.fn().mockImplementation(async () => {
            inflight++;
            maxInflight = Math.max(maxInflight, inflight);
            await new Promise(r => setTimeout(r, 5));
            inflight--;
        });

        const sink = new BatchingSink({
            batchSize: 2,
            flushInterval: 60_000,
            emit: emitFn
        });
        await sink.emit([makeEvent(), makeEvent()]);

        // Two concurrent explicit flush calls should not spawn two writes
        await Promise.all([sink.flush(), sink.flush()]);

        expect(maxInflight).toBe(1);
    });
});
