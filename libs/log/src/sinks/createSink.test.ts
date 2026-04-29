import { describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { createSink } from './createSink.js';

function event(level: LogLevel, msg = 'm'): LogEvent {
    return {
        timestamp: new Date(),
        level,
        messageTemplate: msg,
        renderedMessage: msg,
        properties: {}
    };
}

describe('createSink', () => {
    it('forwards events to the emit function', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ emit });

        const batch = [event(LogLevel.Information), event(LogLevel.Error)];
        await sink.emit(batch);

        expect(emit).toHaveBeenCalledWith(batch);
    });

    it('filters events below minimumLevel before emit', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ minimumLevel: 'warning', emit });

        await sink.emit([
            event(LogLevel.Trace),
            event(LogLevel.Information),
            event(LogLevel.Warning),
            event(LogLevel.Error)
        ]);

        expect(emit).toHaveBeenCalledTimes(1);
        const forwarded = emit.mock.calls[0][0] as LogEvent[];
        expect(forwarded.map(e => e.level)).toEqual([
            LogLevel.Warning,
            LogLevel.Error
        ]);
    });

    it('skips emit when filtered batch is empty', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ minimumLevel: 'fatal', emit });

        await sink.emit([event(LogLevel.Information)]);

        expect(emit).not.toHaveBeenCalled();
    });

    it('skips emit when input batch is empty', async () => {
        const emit = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ emit });

        await sink.emit([]);

        expect(emit).not.toHaveBeenCalled();
    });

    it('exposes the provided flush function', async () => {
        const flush = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ emit: vi.fn(), flush });

        await sink.flush?.();
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('omits flush when not provided', () => {
        const sink = createSink({ emit: vi.fn() });
        expect(sink.flush).toBeUndefined();
    });

    it('invokes dispose function on asyncDispose', async () => {
        const dispose = vi.fn().mockResolvedValue(undefined);
        const sink = createSink({ emit: vi.fn(), dispose });

        await sink[Symbol.asyncDispose]();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('asyncDispose is safe when dispose is not provided', async () => {
        const sink = createSink({ emit: vi.fn() });
        await expect(sink[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });
});
