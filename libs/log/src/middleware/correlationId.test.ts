import { describe, expect, it, vi } from 'vitest';
import { LogContext } from '../LogContext.js';
import { Logger } from '../Logger.js';
import { LoggerPipeline } from '../LoggerPipeline.js';
import { LogLevel } from '../LogLevel.js';
import { correlationIdMiddleware } from './correlationId.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(headers: Record<string, string> = {}) {
    const setHeader = vi.fn();
    return {
        headers,
        setHeader,
        items: new Map<string, unknown>()
    };
}

const next = async () => {};

// ---------------------------------------------------------------------------
// responseHeader behaviour
// ---------------------------------------------------------------------------

describe('correlationIdMiddleware — responseHeader', () => {
    it('sets X-Correlation-Id on the response by default', async () => {
        const mw = correlationIdMiddleware();
        const ctx = makeContext();

        await mw(ctx, next);

        expect(ctx.setHeader).toHaveBeenCalledTimes(1);
        const [name, value] = ctx.setHeader.mock.calls[0];
        expect(name).toBe('X-Correlation-Id');
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
    });

    it('uses a custom response header name when provided', async () => {
        const mw = correlationIdMiddleware({ responseHeader: 'X-Trace-Id' });
        const ctx = makeContext();

        await mw(ctx, next);

        expect(ctx.setHeader).toHaveBeenCalledTimes(1);
        expect(ctx.setHeader.mock.calls[0][0]).toBe('X-Trace-Id');
    });

    it('does NOT set a response header when responseHeader is false', async () => {
        const mw = correlationIdMiddleware({ responseHeader: false });
        const ctx = makeContext();

        await mw(ctx, next);

        expect(ctx.setHeader).not.toHaveBeenCalled();
    });

    it('still extracts (or generates) and stores the id when responseHeader is false', async () => {
        const mw = correlationIdMiddleware({ responseHeader: false });
        const ctx = makeContext({
            'x-correlation-id': '00000000-0000-0000-0000-000000000abc'
        });

        await mw(ctx, next);

        // Header is suppressed but downstream middleware can still read the id.
        expect(ctx.setHeader).not.toHaveBeenCalled();
        expect(ctx.items.get('correlationId')).toBe(
            '00000000-0000-0000-0000-000000000abc'
        );
    });

    it('falls back to context.response.setHeader when context.setHeader is absent', async () => {
        const mw = correlationIdMiddleware();
        const responseSetHeader = vi.fn();
        const ctx: any = {
            headers: {},
            response: { setHeader: responseSetHeader },
            items: new Map<string, unknown>()
        };

        await mw(ctx, next);

        expect(responseSetHeader).toHaveBeenCalledTimes(1);
        expect(responseSetHeader.mock.calls[0][0]).toBe('X-Correlation-Id');
    });

    it('does not touch context.response.setHeader when responseHeader is false', async () => {
        const mw = correlationIdMiddleware({ responseHeader: false });
        const responseSetHeader = vi.fn();
        const ctx: any = {
            headers: {},
            response: { setHeader: responseSetHeader },
            items: new Map<string, unknown>()
        };

        await mw(ctx, next);

        expect(responseSetHeader).not.toHaveBeenCalled();
    });
});

describe('correlationIdMiddleware — LogContext integration', () => {
    it('runs next within runWithCorrelationId when a LogContext store exists (line 62)', async () => {
        const pipeline = new LoggerPipeline({
            minimumLevel: LogLevel.Trace,
            sinks: []
        });
        const logger = new Logger(pipeline);
        const mw = correlationIdMiddleware();
        const ctx = makeContext();

        let nextCalled = false;
        const trackingNext = async () => {
            nextCalled = true;
        };

        await LogContext.run(logger, async () => {
            await mw(ctx, trackingNext);
        });

        expect(nextCalled).toBe(true);
        expect(ctx.items.get('correlationId')).toBeDefined();
        await logger.dispose();
    });
});
