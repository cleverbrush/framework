// @cleverbrush/log — BatchingSink unit tests

import { describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { BatchingSink } from './BatchingSink.js';

function makeEvent(id: number = 1): LogEvent {
    return {
        level: 2,
        messageTemplate: `Event {Id}`,
        message: `Event ${id}`,
        timestamp: new Date(),
        properties: { Id: id }
    } as LogEvent;
}

describe('BatchingSink — basic buffering', () => {
    it('emits a batch when batchSize is reached', async () => {
        const batches: LogEvent[][] = [];
        const sink = new BatchingSink({
            batchSize: 3,
            flushInterval: 60_000,
            emit: async batch => {
                batches.push(batch);
            }
        });

        await sink.emit([makeEvent(1), makeEvent(2), makeEvent(3)]);
        // flush from batchSize trigger is background — call flush explicitly
        await sink.flush();

        expect(batches.length).toBeGreaterThan(0);
        expect(batches.flat().length).toBe(3);
        await sink[Symbol.asyncDispose]();
    });

    it('flush drains the buffer', async () => {
        const received: LogEvent[] = [];
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            emit: async batch => {
                received.push(...batch);
            }
        });

        await sink.emit([makeEvent(1), makeEvent(2)]);
        await sink.flush();

        expect(received).toHaveLength(2);
        await sink[Symbol.asyncDispose]();
    });

    it('flush is a no-op when buffer is empty', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({ batchSize: 100, emit });

        await sink.flush();
        expect(emit).not.toHaveBeenCalled();
        await sink[Symbol.asyncDispose]();
    });

    it('multiple concurrent flush calls join the same write', async () => {
        let emitCount = 0;
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            emit: async () => {
                emitCount++;
            }
        });

        await sink.emit([makeEvent(1)]);
        // Start three flushes simultaneously
        await Promise.all([sink.flush(), sink.flush(), sink.flush()]);

        // Only one actual emit should have run
        expect(emitCount).toBe(1);
        await sink[Symbol.asyncDispose]();
    });
});

describe('BatchingSink — queue overflow', () => {
    it('drops oldest events when maxQueueSize is exceeded', async () => {
        const received: LogEvent[] = [];
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxQueueSize: 2,
            emit: async batch => {
                received.push(...batch);
            }
        });

        // Push 3 events — the first should be dropped (oldest)
        await sink.emit([makeEvent(1), makeEvent(2), makeEvent(3)]);
        await sink.flush();

        expect(received).toHaveLength(2);
        expect(received.map(e => e.properties.Id)).toEqual([2, 3]);
        await sink[Symbol.asyncDispose]();
    });
});

describe('BatchingSink — dispose', () => {
    it('flushes remaining events on dispose', async () => {
        const received: LogEvent[] = [];
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            emit: async batch => {
                received.push(...batch);
            }
        });

        await sink.emit([makeEvent(1), makeEvent(2)]);
        await sink[Symbol.asyncDispose]();

        expect(received).toHaveLength(2);
    });

    it('ignores emit after dispose', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = new BatchingSink({ batchSize: 100, emit });

        await sink[Symbol.asyncDispose]();
        await sink.emit([makeEvent(1)]);
        await sink.flush();

        expect(emit).not.toHaveBeenCalled();
    });
});

describe('BatchingSink — retry and circuit breaker', () => {
    it('retries on transient failure and eventually emits', async () => {
        vi.useFakeTimers();
        let attempts = 0;
        const emit = vi.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 3) throw new Error('transient');
        });
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxRetries: 5,
            retryDelay: 10,
            emit
        });

        await sink.emit([makeEvent(1)]);

        const flushPromise = sink.flush();
        await vi.runAllTimersAsync();
        await flushPromise;

        expect(emit).toHaveBeenCalledTimes(3);
        await sink[Symbol.asyncDispose]();
        vi.useRealTimers();
    });

    it('opens circuit breaker after consecutive failures exceeding threshold', async () => {
        // No fake timers — emit mock rejects immediately, no delays needed
        const emit = vi.fn().mockRejectedValue(new Error('always fails'));
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxRetries: 0,
            circuitBreakerThreshold: 2,
            emit
        });

        // Two manual failures to open the circuit
        await sink.emit([makeEvent(1)]);
        await sink.flush();

        await sink.emit([makeEvent(2)]);
        await sink.flush();

        const callsBeforeCircuit = emit.mock.calls.length;

        // Circuit is now open — subsequent flush should NOT call emit
        await sink.emit([makeEvent(3)]);
        await sink.flush();

        expect(emit.mock.calls.length).toBe(callsBeforeCircuit);
        await sink[Symbol.asyncDispose]();
    });

    it('circuit breaker closes after reset timer elapses', async () => {
        vi.useFakeTimers();
        const emit = vi
            .fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue(undefined);

        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxRetries: 0,
            circuitBreakerThreshold: 2,
            emit
        });

        // Open the circuit with 2 failures
        await sink.emit([makeEvent(1)]);
        const p1 = sink.flush();
        await vi.runAllTimersAsync();
        await p1.catch(() => {});

        await sink.emit([makeEvent(2)]);
        const p2 = sink.flush();
        await vi.runAllTimersAsync();
        await p2.catch(() => {});

        const callsAfterOpen = emit.mock.calls.length;

        // Add an event that will flush once the circuit resets
        await sink.emit([makeEvent(4)]);

        // Advance exactly 31s to fire the reset timer (not runAll which could chain)
        await vi.advanceTimersByTimeAsync(31_000);
        await sink.flush();

        // emit should have been called again after the circuit closed
        expect(emit.mock.calls.length).toBeGreaterThan(callsAfterOpen);
        await sink[Symbol.asyncDispose]();
        vi.useRealTimers();
    });

    it('circuit reset triggers background flush when buffer is non-empty', async () => {
        vi.useFakeTimers();
        const received: LogEvent[] = [];
        const emit = vi
            .fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockImplementation(async (batch: LogEvent[]) => {
                received.push(...batch);
            });

        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxRetries: 0,
            circuitBreakerThreshold: 2,
            emit
        });

        // Open circuit
        await sink.emit([makeEvent(1)]);
        await sink.flush().catch(() => {});
        await sink.emit([makeEvent(2)]);
        await sink.flush().catch(() => {});

        // Add event to buffer before circuit resets (covers line 199-200)
        await sink.emit([makeEvent(3)]);

        // Fire circuit reset timer; flush().catch() in callback covers line 200-201
        await vi.advanceTimersByTimeAsync(31_000);
        await vi.runAllTimersAsync();

        expect(received).toContainEqual(
            expect.objectContaining({ properties: { Id: 3 } })
        );
        await sink[Symbol.asyncDispose]();
        vi.useRealTimers();
    });

    it('flush timer fires after flushInterval and drains buffer', async () => {
        vi.useFakeTimers();
        const received: LogEvent[] = [];
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 1_000,
            emit: async batch => {
                received.push(...batch);
            }
        });

        // emit with fewer events than batchSize → triggers #resetTimer (line 219)
        await sink.emit([makeEvent(1), makeEvent(2)]);

        // Advance past flushInterval → timer fires, flush().catch() runs (line 220)
        await vi.advanceTimersByTimeAsync(1_001);

        expect(received).toHaveLength(2);
        await sink[Symbol.asyncDispose]();
        vi.useRealTimers();
    });

    it('dispose catches emit failure during final flush (line 148)', async () => {
        const emit = vi.fn().mockRejectedValue(new Error('dispose flush fail'));
        const sink = new BatchingSink({
            batchSize: 100,
            flushInterval: 60_000,
            maxRetries: 0,
            circuitBreakerThreshold: 100,
            emit
        });

        // Add event to buffer without triggering a flush
        await sink.emit([makeEvent(1)]);
        // Dispose will try to flush the buffer and emit will fail → line 148
        await sink[Symbol.asyncDispose](); // should NOT throw
        expect(emit).toHaveBeenCalled();
    });
});
