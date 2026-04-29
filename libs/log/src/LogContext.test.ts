import { describe, expect, it } from 'vitest';
import { LogContext } from './LogContext.js';
import type { LogEvent } from './LogEvent.js';
import { Logger } from './Logger.js';
import { LoggerPipeline } from './LoggerPipeline.js';
import { LogLevel } from './LogLevel.js';
import type { LogSink } from './Sink.js';

function createTestLogger(): {
    logger: Logger;
    events: LogEvent[];
} {
    const events: LogEvent[] = [];
    const sink: LogSink = {
        async emit(batch) {
            events.push(...batch);
        },
        async [Symbol.asyncDispose]() {}
    };
    const pipeline = new LoggerPipeline({
        minimumLevel: LogLevel.Trace,
        sinks: [sink]
    });
    return { logger: new Logger(pipeline), events };
}

describe('LogContext', () => {
    it('should set and retrieve ambient logger', async () => {
        const { logger } = createTestLogger();

        await LogContext.run(logger, async () => {
            const current = LogContext.current();
            expect(current).toBe(logger);
        });
    });

    it('should return undefined outside of run', () => {
        expect(LogContext.current()).toBeUndefined();
    });

    it('should support nested contexts', async () => {
        const { logger: outer } = createTestLogger();
        const { logger: inner } = createTestLogger();

        await LogContext.run(outer, async () => {
            expect(LogContext.current()).toBe(outer);

            await LogContext.run(inner, async () => {
                expect(LogContext.current()).toBe(inner);
            });

            expect(LogContext.current()).toBe(outer);
        });
    });

    it('should enrich context with additional properties', async () => {
        const { logger, events } = createTestLogger();

        await LogContext.run(logger, async () => {
            await LogContext.enrichWith({ OrderId: 42 }, async () => {
                const log = LogContext.current()!;
                log.info('Processing');
                await log.flush();
            });
        });

        expect(events[0].properties.OrderId).toBe(42);
    });

    it('should throw when enrichWith is called outside run', () => {
        expect(() => LogContext.enrichWith({ a: 1 }, () => {})).toThrow();
    });

    describe('runWithCorrelationId', () => {
        it('should set correlation ID in store', async () => {
            const { logger } = createTestLogger();

            await LogContext.run(logger, async () => {
                await LogContext.runWithCorrelationId(
                    'test-correlation-id',
                    async () => {
                        const store = LogContext.getStore();
                        expect(store?.correlationId).toBe(
                            'test-correlation-id'
                        );
                    }
                );
            });
        });

        it('should throw when called outside run', () => {
            expect(() =>
                LogContext.runWithCorrelationId('id', () => {})
            ).toThrow();
        });
    });
});
