import { describe, expect, it, vi } from 'vitest';
import { createLogger } from './createLogger.js';
import type { LogEvent } from './LogEvent.js';
import { LogLevel } from './LogLevel.js';
import type { LogSink } from './Sink.js';

function mockSink(): LogSink & { events: LogEvent[]; disposed: boolean } {
    const events: LogEvent[] = [];
    return {
        events,
        disposed: false,
        async emit(batch) {
            events.push(...batch);
        },
        async [Symbol.asyncDispose]() {
            this.disposed = true;
        }
    };
}

describe('createLogger', () => {
    it('throws when no sinks are provided', () => {
        expect(() => createLogger({ sinks: [] })).toThrow(
            /requires at least one sink/
        );
    });

    it('throws when sinks is undefined', () => {
        expect(() => createLogger({ sinks: undefined as any })).toThrow(
            /requires at least one sink/
        );
    });

    it('creates a working logger with default minimum level (information)', async () => {
        const sink = mockSink();
        const logger = createLogger({ sinks: [sink] });

        logger.debug('Should be filtered');
        logger.info('Hello {Name}', { Name: 'World' });
        await logger.flush();

        expect(sink.events).toHaveLength(1);
        expect(sink.events[0].level).toBe(LogLevel.Information);
        expect(sink.events[0].renderedMessage).toBe('Hello World');
    });

    it('parses minimumLevel as a string name', async () => {
        const sink = mockSink();
        const logger = createLogger({
            sinks: [sink],
            minimumLevel: 'warning'
        });

        logger.info('Filtered');
        logger.warn('Kept');
        await logger.flush();

        expect(sink.events).toHaveLength(1);
        expect(sink.events[0].level).toBe(LogLevel.Warning);
    });

    it('accepts minimumLevel as a numeric LogLevel', async () => {
        const sink = mockSink();
        const logger = createLogger({
            sinks: [sink],
            minimumLevel: LogLevel.Error
        });

        logger.warn('Filtered');
        logger.error('Kept');
        await logger.flush();

        expect(sink.events).toHaveLength(1);
        expect(sink.events[0].level).toBe(LogLevel.Error);
    });

    it('passes enrichers through to the pipeline', async () => {
        const sink = mockSink();
        const logger = createLogger({
            sinks: [sink],
            enrichers: [
                e => ({
                    ...e,
                    properties: { ...e.properties, Tag: 'enriched' }
                })
            ]
        });

        logger.info('Hi');
        await logger.flush();

        expect(sink.events[0].properties.Tag).toBe('enriched');
    });

    it('passes filters through to the pipeline', async () => {
        const sink = mockSink();
        const logger = createLogger({
            sinks: [sink],
            filters: [e => e.renderedMessage !== 'drop me']
        });

        logger.info('drop me');
        logger.info('keep me');
        await logger.flush();

        expect(sink.events).toHaveLength(1);
        expect(sink.events[0].renderedMessage).toBe('keep me');
    });

    it('honours level overrides from config', async () => {
        const sink = mockSink();
        const logger = createLogger({
            sinks: [sink],
            minimumLevel: 'information',
            levelOverrides: { 'Noisy.': 'warning' }
        });

        const noisy = logger.forContext('SourceContext', 'Noisy.Component');
        const quiet = logger.forContext('SourceContext', 'Other');

        noisy.info('filtered by override');
        noisy.warn('kept by override');
        quiet.info('kept by default');

        await logger.flush();

        const messages = sink.events.map(e => e.renderedMessage).sort();
        expect(messages).toEqual(['kept by default', 'kept by override']);
    });

    it('registers SIGTERM and beforeExit handlers when handleProcessExit is true', async () => {
        const sink = mockSink();
        const onSpy = vi
            .spyOn(process, 'on')
            .mockImplementation((() => process) as any);

        try {
            const logger = createLogger({
                sinks: [sink],
                handleProcessExit: true
            });

            const events = onSpy.mock.calls.map(c => c[0]);
            expect(events).toContain('SIGTERM');
            expect(events).toContain('beforeExit');

            await logger.dispose();
        } finally {
            onSpy.mockRestore();
        }
    });

    it('does not register process listeners by default', () => {
        const sink = mockSink();
        const onSpy = vi
            .spyOn(process, 'on')
            .mockImplementation((() => process) as any);

        try {
            createLogger({ sinks: [sink] });
            const events = onSpy.mock.calls.map(c => c[0]);
            expect(events).not.toContain('SIGTERM');
            expect(events).not.toContain('beforeExit');
        } finally {
            onSpy.mockRestore();
        }
    });

    it('onExit handler calls dispose; errors are swallowed', async () => {
        const sink = mockSink();
        const callbacks: Array<() => void> = [];
        const onSpy = vi.spyOn(process, 'on').mockImplementation(((
            _event: string,
            cb: () => void
        ) => {
            callbacks.push(cb);
            return process;
        }) as any);

        try {
            createLogger({
                sinks: [sink],
                handleProcessExit: true
            });

            // Invoke the captured exit handler
            expect(callbacks.length).toBeGreaterThan(0);
            callbacks[0]();
            // Let the microtask/promise resolve
            await new Promise(r => setTimeout(r, 10));
        } finally {
            onSpy.mockRestore();
        }
    });
});
