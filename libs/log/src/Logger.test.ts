import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEvent } from './LogEvent.js';
import type { TypedTemplate } from './Logger.js';
import { Logger } from './Logger.js';
import { LoggerPipeline } from './LoggerPipeline.js';
import { LogLevel } from './LogLevel.js';
import type { LogSink } from './Sink.js';

function createMockSink(): LogSink & {
    events: LogEvent[];
} {
    const events: LogEvent[] = [];
    return {
        events,
        async emit(batch: LogEvent[]): Promise<void> {
            events.push(...batch);
        },
        async [Symbol.asyncDispose](): Promise<void> {}
    };
}

describe('Logger', () => {
    let sink: ReturnType<typeof createMockSink>;
    let pipeline: LoggerPipeline;
    let logger: Logger;

    beforeEach(() => {
        sink = createMockSink();
        pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });
        logger = new Logger(pipeline);
    });

    it('should check if level is enabled', () => {
        const restrictedPipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            sinks: [sink]
        });
        const restrictedLogger = new Logger(restrictedPipeline);

        expect(restrictedLogger.isEnabled(LogLevel.Trace)).toBe(false);
        expect(restrictedLogger.isEnabled(LogLevel.Debug)).toBe(false);
        expect(restrictedLogger.isEnabled(LogLevel.Information)).toBe(false);
        expect(restrictedLogger.isEnabled(LogLevel.Warning)).toBe(true);
        expect(restrictedLogger.isEnabled(LogLevel.Error)).toBe(true);
    });

    it('should log trace messages', async () => {
        logger.trace('Trace {Value}', { Value: 'test' });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].level).toBe(LogLevel.Trace);
    });

    it('should log debug messages', async () => {
        logger.debug('Debug {Value}', { Value: 42 });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].level).toBe(LogLevel.Debug);
    });

    it('should log info messages', async () => {
        logger.info('Server started on port {Port}', {
            Port: 3000
        });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].renderedMessage).toBe(
            'Server started on port 3000'
        );
    });

    it('should log warn messages', async () => {
        logger.warn('Slow query: {ElapsedMs}ms', {
            ElapsedMs: 2500
        });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].level).toBe(LogLevel.Warning);
    });

    it('should log error messages with exception', async () => {
        const err = new Error('test');
        logger.error(err, 'Failed: {Reason}', {
            Reason: 'timeout'
        });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].level).toBe(LogLevel.Error);
        expect(sink.events[0].exception).toBe(err);
    });

    it('should log error messages without exception', async () => {
        logger.error('Failed: {Reason}', {
            Reason: 'timeout'
        });
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].exception).toBeUndefined();
    });

    it('should log fatal messages with exception', async () => {
        const err = new Error('critical');
        logger.fatal(err, 'Shutting down');
        await logger.flush();
        expect(sink.events.length).toBe(1);
        expect(sink.events[0].level).toBe(LogLevel.Fatal);
        expect(sink.events[0].exception).toBe(err);
    });

    it('should not log below minimum level', async () => {
        const restrictedPipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Warning,
            sinks: [sink]
        });
        const restrictedLogger = new Logger(restrictedPipeline);

        restrictedLogger.trace('Trace');
        restrictedLogger.debug('Debug');
        restrictedLogger.info('Info');
        restrictedLogger.warn('Warn');
        restrictedLogger.error('Error');
        await restrictedLogger.flush();

        expect(sink.events.length).toBe(2);
        expect(sink.events[0].level).toBe(LogLevel.Warning);
        expect(sink.events[1].level).toBe(LogLevel.Error);
    });

    describe('forContext', () => {
        it('should create child logger with string context', async () => {
            const child = logger.forContext('SourceContext', 'OrderService');
            child.info('Test');
            await child.flush();

            expect(sink.events[0].properties.SourceContext).toBe(
                'OrderService'
            );
        });

        it('should create child logger with object context', async () => {
            const child = logger.forContext({
                TenantId: 'acme',
                Region: 'eu-west-1'
            });
            child.info('Test');
            await child.flush();

            expect(sink.events[0].properties.TenantId).toBe('acme');
            expect(sink.events[0].properties.Region).toBe('eu-west-1');
        });

        it('should chain contexts', async () => {
            const child = logger
                .forContext('SourceContext', 'OrderService')
                .forContext({ TenantId: 'acme' });
            child.info('Test');
            await child.flush();

            expect(sink.events[0].properties.SourceContext).toBe(
                'OrderService'
            );
            expect(sink.events[0].properties.TenantId).toBe('acme');
        });
    });

    describe('setMinimumLevel', () => {
        it('should change minimum level at runtime', async () => {
            logger.setMinimumLevel('error');
            logger.info('Should not appear');
            logger.error('Should appear');
            await logger.flush();

            expect(sink.events.length).toBe(1);
            expect(sink.events[0].level).toBe(LogLevel.Error);
        });
    });

    describe('dispose', () => {
        it('should flush and dispose', async () => {
            const disposeSpy = vi.fn();
            const disposableSink: LogSink = {
                async emit() {},
                async [Symbol.asyncDispose]() {
                    disposeSpy();
                }
            };
            const p = new LoggerPipeline({
                minimumLevel: LogLevel.Trace,
                sinks: [disposableSink]
            });
            const l = new Logger(p);
            await l.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('TypedTemplate', () => {
        function makeTypedTemplate<T extends Record<string, unknown>>(
            pattern: string,
            renderFn: (params: T) => string
        ): TypedTemplate<T> {
            return {
                template: pattern,
                serialize: renderFn
            };
        }

        it('uses template getter as messageTemplate, not rendered message', async () => {
            const tmpl = makeTypedTemplate(
                'Todo created: #{TodoId} "{Title}" by user {UserId}',
                ({ TodoId, Title, UserId }) =>
                    `Todo created: #${TodoId} "${Title}" by user ${UserId}`
            );

            logger.info(tmpl, { TodoId: 5, Title: 'Buy milk', UserId: 3 });
            await logger.flush();

            expect(sink.events[0].messageTemplate).toBe(
                'Todo created: #{TodoId} "{Title}" by user {UserId}'
            );
            expect(sink.events[0].renderedMessage).toBe(
                'Todo created: #5 "Buy milk" by user 3'
            );
        });

        it('messageTemplate differs from renderedMessage when values vary', async () => {
            const tmpl = makeTypedTemplate<{ Name: string }>(
                'Hello {Name}',
                ({ Name }) => `Hello ${Name}`
            );

            logger.info(tmpl, { Name: 'Alice' });
            logger.info(tmpl, { Name: 'Bob' });
            await logger.flush();

            // Same template…
            expect(sink.events[0].messageTemplate).toBe(
                sink.events[1].messageTemplate
            );
            // …different rendered messages.
            expect(sink.events[0].renderedMessage).toBe('Hello Alice');
            expect(sink.events[1].renderedMessage).toBe('Hello Bob');
        });

        it('produces the same eventId for all events sharing a template', async () => {
            const tmpl = makeTypedTemplate<{ Id: number }>(
                'Item deleted: {Id}',
                ({ Id }) => `Item deleted: ${Id}`
            );

            logger.info(tmpl, { Id: 1 });
            logger.info(tmpl, { Id: 2 });
            await logger.flush();

            expect(sink.events[0].eventId).toBeDefined();
            expect(sink.events[0].eventId).toBe(sink.events[1].eventId);
        });

        it('falls back to serialize() output when template getter is absent', async () => {
            // TypedTemplate without a template getter (legacy / minimal impl)
            const tmpl: TypedTemplate<{ Value: string }> = {
                serialize: ({ Value }) => `Rendered ${Value}`
            };

            logger.info(tmpl, { Value: 'x' });
            await logger.flush();

            expect(sink.events[0].messageTemplate).toBe('Rendered x');
            expect(sink.events[0].renderedMessage).toBe('Rendered x');
        });

        it('works with all log levels', async () => {
            const tmpl = makeTypedTemplate<{ Msg: string }>(
                'Level test {Msg}',
                ({ Msg }) => `Level test ${Msg}`
            );

            logger.trace(tmpl, { Msg: 'trace' });
            logger.debug(tmpl, { Msg: 'debug' });
            logger.info(tmpl, { Msg: 'info' });
            logger.warn(tmpl, { Msg: 'warn' });
            logger.error(tmpl, { Msg: 'error' });
            logger.fatal(tmpl, { Msg: 'fatal' });
            await logger.flush();

            expect(sink.events).toHaveLength(6);
            for (const event of sink.events) {
                expect(event.messageTemplate).toBe('Level test {Msg}');
            }
        });

        it('works with error overload (error + typed template)', async () => {
            const tmpl = makeTypedTemplate<{ Op: string }>(
                'Operation {Op} failed',
                ({ Op }) => `Operation ${Op} failed`
            );
            const err = new Error('boom');

            logger.error(err, tmpl, { Op: 'save' });
            await logger.flush();

            expect(sink.events[0].messageTemplate).toBe(
                'Operation {Op} failed'
            );
            expect(sink.events[0].renderedMessage).toBe(
                'Operation save failed'
            );
            expect(sink.events[0].exception).toBe(err);
        });

        it('properties are captured from the passed object', async () => {
            const tmpl = makeTypedTemplate<{ UserId: number; Role: string }>(
                'User {UserId} assigned role {Role}',
                ({ UserId, Role }) => `User ${UserId} assigned role ${Role}`
            );

            logger.info(tmpl, { UserId: 42, Role: 'admin' });
            await logger.flush();

            expect(sink.events[0].properties.UserId).toBe(42);
            expect(sink.events[0].properties.Role).toBe('admin');
        });
    });
});
