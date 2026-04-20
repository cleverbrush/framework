import { object, parseString, string } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { Logger } from '../Logger.js';
import { LoggerPipeline } from '../LoggerPipeline.js';
import { LogLevel } from '../LogLevel.js';
import type { LogSink } from '../Sink.js';
import { requestLoggingMiddleware } from './requestLogging.js';

function createMockSink(): LogSink & { events: LogEvent[] } {
    const events: LogEvent[] = [];
    return {
        events,
        async emit(batch: LogEvent[]): Promise<void> {
            events.push(...batch);
        },
        async [Symbol.asyncDispose](): Promise<void> {}
    };
}

function createContext(pathname: string, method = 'GET') {
    return {
        method,
        url: { pathname },
        headers: {},
        response: { statusCode: 200 }
    };
}

describe('requestLoggingMiddleware – excludePaths', () => {
    let sink: ReturnType<typeof createMockSink>;
    let logger: Logger;

    beforeEach(() => {
        sink = createMockSink();
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: [sink]
        });
        logger = new Logger(pipeline);
    });

    it('should log requests for non-excluded paths', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx = createContext('/api/todos');
        await mw(ctx, async () => {});

        expect(sink.events.length).toBeGreaterThan(0);
    });

    it('should exclude paths given as plain strings', async () => {
        const mw = requestLoggingMiddleware(logger, {
            excludePaths: ['/health']
        });
        const ctx = createContext('/health');
        await mw(ctx, async () => {});

        expect(sink.events).toHaveLength(0);
    });

    it('should exclude paths given as endpoint builders', async () => {
        const healthEndpoint = endpoint.get('/health');
        const mw = requestLoggingMiddleware(logger, {
            excludePaths: [healthEndpoint]
        });
        const ctx = createContext('/health');
        await mw(ctx, async () => {});

        expect(sink.events).toHaveLength(0);
    });

    it('should exclude paths from endpoint with basePath + static pathTemplate', async () => {
        const metricsEndpoint = endpoint.get('/api/metrics');
        const mw = requestLoggingMiddleware(logger, {
            excludePaths: [metricsEndpoint]
        });

        const excluded = createContext('/api/metrics');
        await mw(excluded, async () => {});
        expect(sink.events).toHaveLength(0);

        const notExcluded = createContext('/api/todos');
        await mw(notExcluded, async () => {});
        expect(sink.events.length).toBeGreaterThan(0);
    });

    it('should exclude parameterized endpoint path templates', async () => {
        const pathSchema = parseString(
            object({ id: string().required() }),
            $t => $t`/${t => t.id}`
        );
        const userEndpoint = endpoint.get('/users', pathSchema);

        // The path is '/users/:id' — exact match against the template string
        const mw = requestLoggingMiddleware(logger, {
            excludePaths: [userEndpoint]
        });

        // Exact template match — would be excluded
        const ctx = createContext('/users/:id');
        await mw(ctx, async () => {});
        expect(sink.events).toHaveLength(0);

        // Actual runtime path — does NOT match the template, so it's logged
        const runtimeCtx = createContext('/users/123');
        await mw(runtimeCtx, async () => {});
        expect(sink.events.length).toBeGreaterThan(0);
    });

    it('should support mixing strings and endpoint builders', async () => {
        const specEndpoint = endpoint.get('/openapi.json');
        const mw = requestLoggingMiddleware(logger, {
            excludePaths: ['/health', specEndpoint]
        });

        const healthCtx = createContext('/health');
        await mw(healthCtx, async () => {});
        expect(sink.events).toHaveLength(0);

        const specCtx = createContext('/openapi.json');
        await mw(specCtx, async () => {});
        expect(sink.events).toHaveLength(0);

        const todosCtx = createContext('/api/todos');
        await mw(todosCtx, async () => {});
        expect(sink.events.length).toBeGreaterThan(0);
    });
});
