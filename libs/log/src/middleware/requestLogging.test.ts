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

describe('requestLoggingMiddleware – level and body branches', () => {
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

    it('logs at warning level for a 4xx status', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx = {
            method: 'GET',
            url: { pathname: '/missing' },
            headers: {},
            response: { statusCode: 404 }
        };
        await mw(ctx, async () => {
            ctx.response.statusCode = 404;
        });
        const event = sink.events[sink.events.length - 1];
        expect(event.level).toBe(LogLevel.Warning);
    });

    it('logs at error level for a 5xx status', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx = {
            method: 'POST',
            url: { pathname: '/crash' },
            headers: {},
            statusCode: 500
        };
        await mw(ctx, async () => {});
        const event = sink.events[sink.events.length - 1];
        expect(event.level).toBe(LogLevel.Error);
    });

    it('uses context.path when context.url is absent', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx: any = {
            method: 'GET',
            path: '/fallback',
            headers: {},
            statusCode: 200
        };
        await mw(ctx, async () => {});
        expect(sink.events.length).toBeGreaterThan(0);
    });

    it('respects custom getLevel function', async () => {
        const mw = requestLoggingMiddleware(logger, {
            getLevel: () => 'error'
        });
        const ctx = createContext('/api');
        await mw(ctx, async () => {});
        const event = sink.events[sink.events.length - 1];
        expect(event.level).toBe(LogLevel.Error);
    });

    it('logs request start when logRequestStart is true', async () => {
        const mw = requestLoggingMiddleware(logger, { logRequestStart: true });
        const ctx = createContext('/api');
        await mw(ctx, async () => {});
        expect(sink.events.length).toBeGreaterThanOrEqual(1);
        expect(
            sink.events.some(e => e.messageTemplate?.includes('started'))
        ).toBe(true);
    });

    it('includes user-agent in properties when present', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx = {
            method: 'GET',
            url: { pathname: '/api' },
            headers: { 'user-agent': 'TestAgent/1.0' },
            statusCode: 200
        };
        await mw(ctx, async () => {});
        expect(sink.events[0].properties?.UserAgent).toBe('TestAgent/1.0');
    });

    it('applies enrichRequest extra properties', async () => {
        const mw = requestLoggingMiddleware(logger, {
            enrichRequest: () => ({ RequestId: 'xyz' })
        });
        const ctx = createContext('/api');
        await mw(ctx, async () => {});
        expect(sink.events[0].properties?.RequestId).toBe('xyz');
    });

    it('swallows enrichRequest errors silently', async () => {
        const mw = requestLoggingMiddleware(logger, {
            enrichRequest: () => {
                throw new Error('enricher boom');
            }
        });
        const ctx = createContext('/api');
        await mw(ctx, async () => {});
        expect(sink.events.length).toBe(1);
    });

    it('logs and re-throws when downstream throws', async () => {
        const mw = requestLoggingMiddleware(logger);
        const ctx: any = {
            method: 'GET',
            url: { pathname: '/api' },
            headers: {}
        };
        await expect(
            mw(ctx, async () => {
                throw new Error('downstream failure');
            })
        ).rejects.toThrow('downstream failure');
        // At least one log event should have been emitted (the finally block logs)
        expect(sink.events.length).toBeGreaterThan(0);
    });
});
