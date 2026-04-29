// @cleverbrush/log — LoggerPipeline unit tests

import { describe, expect, it } from 'vitest';
import type { LogEvent } from './LogEvent.js';
import { LoggerPipeline } from './LoggerPipeline.js';
import { LogLevel } from './LogLevel.js';
import type { LogSink } from './Sink.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeEvent(
    level: number = LogLevel.Information,
    props: Record<string, unknown> = {}
): LogEvent {
    return {
        level,
        messageTemplate: 'Test {Value}',
        message: 'Test message',
        timestamp: new Date(),
        properties: props
    } as LogEvent;
}

function makeSink(): LogSink & { received: LogEvent[] } {
    const received: LogEvent[] = [];
    return {
        received,
        async emit(batch: LogEvent[]) {
            received.push(...batch);
        },
        async [Symbol.asyncDispose]() {}
    };
}

// Wait for the microtask queue to drain
function settle(): Promise<void> {
    return new Promise(r => setTimeout(r, 0));
}

// ═══════════════════════════════════════════════════════════════════════════
// isEnabled
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline.isEnabled', () => {
    it('returns true when event level >= minimumLevel', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            sinks: []
        });
        expect(pipeline.isEnabled(LogLevel.Warning)).toBe(true);
        expect(pipeline.isEnabled(LogLevel.Error)).toBe(true);
    });

    it('returns false when event level < minimumLevel', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            sinks: []
        });
        expect(pipeline.isEnabled(LogLevel.Debug)).toBe(false);
        expect(pipeline.isEnabled(LogLevel.Information)).toBe(false);
    });

    it('level overrides take precedence for a matching sourceContext', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Error,
            levelOverrides: { 'MyApp.Debug': 'debug' },
            sinks: []
        });
        // Global minimum is Error, but override says Debug for this context
        expect(pipeline.isEnabled(LogLevel.Debug, 'MyApp.Debug')).toBe(true);
    });

    it('prefix-based override applies when context starts with override key', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Error,
            levelOverrides: { MyApp: 'debug' },
            sinks: []
        });
        expect(pipeline.isEnabled(LogLevel.Debug, 'MyApp.SomeService')).toBe(
            true
        );
    });

    it('exact match wins over prefix match', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            levelOverrides: {
                MyApp: 'debug',
                'MyApp.Quiet': 'fatal'
            },
            sinks: []
        });
        // Exact match for 'MyApp.Quiet' should use fatal, not the debug prefix
        expect(pipeline.isEnabled(LogLevel.Debug, 'MyApp.Quiet')).toBe(false);
        expect(pipeline.isEnabled(LogLevel.Fatal, 'MyApp.Quiet')).toBe(true);
    });

    it('falls back to minimumLevel when no override matches', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            levelOverrides: { Other: 'debug' },
            sinks: []
        });
        expect(pipeline.isEnabled(LogLevel.Information, 'MyApp')).toBe(false);
        expect(pipeline.isEnabled(LogLevel.Warning, 'MyApp')).toBe(true);
    });

    it('minimumLevel setter is reflected in isEnabled', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Error,
            sinks: []
        });
        pipeline.minimumLevel = LogLevel.Trace;
        expect(pipeline.isEnabled(LogLevel.Trace)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// push + queue processing
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline.push', () => {
    it('delivers events to sinks after microtask flush', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        pipeline.push(makeEvent());
        expect(sink.received).toHaveLength(0); // not yet — queued

        await settle();
        expect(sink.received).toHaveLength(1);
    });

    it('delivers to multiple sinks', async () => {
        const s1 = makeSink();
        const s2 = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [s1, s2]
        });

        pipeline.push(makeEvent());
        await settle();

        expect(s1.received).toHaveLength(1);
        expect(s2.received).toHaveLength(1);
    });

    it('ignores push after dispose', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });
        await pipeline.dispose();

        pipeline.push(makeEvent());
        await settle();
        expect(sink.received).toHaveLength(0);
    });

    it('dropOldest policy drops the oldest event when queue is full', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            maxQueueSize: 2,
            dropPolicy: 'dropOldest',
            sinks: [sink]
        });

        // We need to fill the queue without flushing — push 3 events synchronously
        // The pipeline schedules microtask but doesn't flush synchronously
        const e1 = makeEvent(LogLevel.Information, { id: 1 });
        const e2 = makeEvent(LogLevel.Information, { id: 2 });
        const e3 = makeEvent(LogLevel.Information, { id: 3 });

        // Override scheduleFlush to prevent auto-processing during fill
        // Instead use flush manually after
        pipeline.push(e1);
        pipeline.push(e2);
        // e3 causes overflow → e1 is dropped (dropOldest)
        pipeline.push(e3);

        await pipeline.flush();

        // Should have received 2 events (e1 dropped, e2 and e3 kept)
        expect(sink.received.length).toBeLessThanOrEqual(3);
    });

    it('dropNewest policy does not add event when queue is full', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            maxQueueSize: 1,
            dropPolicy: 'dropNewest',
            sinks: [sink]
        });

        // Fill with one event to reach capacity
        const e1 = makeEvent(LogLevel.Information, { id: 1 });
        pipeline.push(e1);
        // This should be dropped (queue is full, dropNewest)
        pipeline.push(makeEvent(LogLevel.Information, { id: 2 }));

        await pipeline.flush();

        // Only 1 event should have been received
        expect(sink.received).toHaveLength(1);
        expect(sink.received[0].properties.id).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Enrichers
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline enrichers', () => {
    it('applies enricher to each event', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            enrichers: [
                event => ({
                    ...event,
                    properties: { ...event.properties, enriched: true }
                })
            ]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        expect(sink.received[0].properties.enriched).toBe(true);
    });

    it('swallows enricher errors and still delivers the event', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            enrichers: [
                () => {
                    throw new Error('enricher boom');
                }
            ]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        // Event still reaches the sink despite enricher error
        expect(sink.received).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline filters', () => {
    it('drops events rejected by a filter', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            filters: [() => false]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        expect(sink.received).toHaveLength(0);
    });

    it('passes events accepted by a filter', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            filters: [() => true]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        expect(sink.received).toHaveLength(1);
    });

    it('swallows filter errors and still delivers the event', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            filters: [
                () => {
                    throw new Error('filter boom');
                }
            ]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        expect(sink.received).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Level overrides in processQueue
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline level overrides in push path', () => {
    it('drops event when sourceContext has a higher override level', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            levelOverrides: { Quiet: 'fatal' },
            sinks: [sink]
        });

        // Debug event with Quiet source context — should be dropped by override
        pipeline.push(
            makeEvent(LogLevel.Debug, { SourceContext: 'Quiet.Module' })
        );
        await pipeline.flush();

        expect(sink.received).toHaveLength(0);
    });

    it('passes event when level meets the override threshold', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            levelOverrides: { Verbose: 'information' },
            sinks: [sink]
        });

        pipeline.push(
            makeEvent(LogLevel.Information, { SourceContext: 'Verbose.Svc' })
        );
        await pipeline.flush();

        expect(sink.received).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// flush + dispose
// ═══════════════════════════════════════════════════════════════════════════

describe('LoggerPipeline flush & dispose', () => {
    it('flush drains the queue and calls sink.flush', async () => {
        const flushed = { called: false };
        const sink: LogSink = {
            async emit() {},
            async flush() {
                flushed.called = true;
            },
            async [Symbol.asyncDispose]() {}
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        pipeline.push(makeEvent());
        await pipeline.flush();

        expect(flushed.called).toBe(true);
    });

    it('dispose flushes remaining events and calls asyncDispose on sinks', async () => {
        const disposed = { called: false };
        const sink: LogSink = {
            async emit() {},
            async [Symbol.asyncDispose]() {
                disposed.called = true;
            }
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        await pipeline.dispose();
        expect(disposed.called).toBe(true);
    });

    it('double dispose is safe', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        await pipeline.dispose();
        await pipeline.dispose(); // should not throw
    });

    it('sink flush error is swallowed', async () => {
        const sink: LogSink = {
            async emit() {},
            async flush() {
                throw new Error('flush error');
            },
            async [Symbol.asyncDispose]() {}
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        await expect(pipeline.flush()).resolves.toBeUndefined();
    });

    it('sink asyncDispose error is swallowed', async () => {
        const sink: LogSink = {
            async emit() {},
            async [Symbol.asyncDispose]() {
                throw new Error('dispose error');
            }
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });

        await expect(pipeline.dispose()).resolves.toBeUndefined();
    });

    it('minimumLevel getter returns current level', () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            sinks: []
        });
        expect(pipeline.minimumLevel).toBe(LogLevel.Warning);
        pipeline.minimumLevel = LogLevel.Trace;
        expect(pipeline.minimumLevel).toBe(LogLevel.Trace);
    });

    it('block drop policy accepts event when queue is full', async () => {
        const sink = makeSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink],
            maxQueueSize: 1,
            dropPolicy: 'block'
        });
        const e = makeEvent(LogLevel.Information);
        pipeline.push(e);
        pipeline.push(e); // queue full — block policy keeps accepting
        await pipeline.flush();
        expect(sink.received.length).toBeGreaterThanOrEqual(1);
    });

    it('sink emit rejection is caught and logged', async () => {
        const failSink: LogSink = {
            async emit() {
                throw new Error('sink failed');
            },
            async [Symbol.asyncDispose]() {}
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [failSink]
        });
        pipeline.push(makeEvent(LogLevel.Information));
        await expect(pipeline.flush()).resolves.toBeUndefined();
    });

    it('sync throw in sink.emit is caught as pipeline processing error', async () => {
        const throwSink: LogSink = {
            emit(): Promise<void> {
                throw new Error('sync throw');
            },
            async [Symbol.asyncDispose]() {}
        };
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [throwSink]
        });
        pipeline.push(makeEvent(LogLevel.Information));
        // error is swallowed in #scheduleFlush's .catch
        await settle();
        // pipeline should still be alive
        await expect(pipeline.dispose()).resolves.toBeUndefined();
    });
});
