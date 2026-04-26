import { describe, expect, it, vi } from 'vitest';
import type { LogEvent } from './LogEvent.js';
import { LogLevel } from './LogLevel.js';
import { consoleSink } from './sinks/ConsoleSink.js';

function makeEvent(overrides?: Partial<LogEvent>): LogEvent {
    return {
        timestamp: new Date('2026-04-20T14:30:00.123Z'),
        level: LogLevel.Information,
        messageTemplate: 'Server started on port {Port}',
        renderedMessage: 'Server started on port 3000',
        properties: { Port: 3000 },
        eventId: 'abcd1234',
        ...overrides
    };
}

describe('ConsoleSink', () => {
    it('should write pretty output to stdout for info', async () => {
        const writeSpy = vi
            .spyOn(process.stdout, 'write')
            .mockImplementation(() => true);

        const sink = consoleSink({ theme: 'none' });
        await sink.emit([makeEvent()]);

        expect(writeSpy).toHaveBeenCalledTimes(1);
        const output = writeSpy.mock.calls[0][0] as string;
        expect(output).toContain('INF');
        expect(output).toContain('Server started on port 3000');
        writeSpy.mockRestore();
    });

    it('should write to stderr for warning and above', async () => {
        const stderrSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        const sink = consoleSink({ theme: 'none' });
        await sink.emit([makeEvent({ level: LogLevel.Warning })]);

        expect(stderrSpy).toHaveBeenCalledTimes(1);
        stderrSpy.mockRestore();
    });

    it('should write JSON/CLEF in json mode', async () => {
        const writeSpy = vi
            .spyOn(process.stdout, 'write')
            .mockImplementation(() => true);

        const sink = consoleSink({ mode: 'json' });
        await sink.emit([makeEvent()]);

        const output = writeSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(output.trim());
        expect(parsed['@mt']).toBe('Server started on port {Port}');
        expect(parsed.Port).toBe(3000);
        writeSpy.mockRestore();
    });

    it('should filter by minimumLevel', async () => {
        const writeSpy = vi
            .spyOn(process.stdout, 'write')
            .mockImplementation(() => true);

        const sink = consoleSink({
            minimumLevel: 'warning',
            theme: 'none'
        });
        await sink.emit([makeEvent({ level: LogLevel.Debug })]);

        expect(writeSpy).not.toHaveBeenCalled();
        writeSpy.mockRestore();
    });

    it('should append exception stack to output (line 106)', async () => {
        const writeSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        const err = new Error('something went wrong');
        const sink = consoleSink({ theme: 'none' });
        await sink.emit([
            makeEvent({
                level: LogLevel.Error,
                exception: err
            })
        ]);

        const output = writeSpy.mock.calls[0][0] as string;
        expect(output).toContain('something went wrong');
        writeSpy.mockRestore();
    });
});
