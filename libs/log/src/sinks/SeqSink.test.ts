import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { seqSink } from './SeqSink.js';

function makeEvent(level: LogLevel = LogLevel.Information): LogEvent {
    return {
        timestamp: new Date('2026-04-20T14:30:00.000Z'),
        level,
        messageTemplate: 'Test {Value}',
        renderedMessage: 'Test value',
        properties: { Value: 'value' },
        eventId: '12345678'
    };
}

describe('seqSink', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('sends events to the correct ingest endpoint', async () => {
        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 1,
            flushInterval: 60_000
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('http://localhost:5341/ingest/clef');

        await sink[Symbol.asyncDispose]();
    });

    it('strips a trailing slash from serverUrl before constructing the endpoint', async () => {
        const sink = seqSink({
            serverUrl: 'http://localhost:5341/',
            batchSize: 1,
            flushInterval: 60_000
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('http://localhost:5341/ingest/clef');

        await sink[Symbol.asyncDispose]();
    });

    it('sends correct Content-Type header and POST method', async () => {
        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 1,
            flushInterval: 60_000
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>)['Content-Type']).toBe(
            'application/vnd.serilog.clef'
        );

        await sink[Symbol.asyncDispose]();
    });

    it('includes X-Seq-ApiKey header when an API key is provided', async () => {
        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            apiKey: 'my-secret-key',
            batchSize: 1,
            flushInterval: 60_000
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect((init.headers as Record<string, string>)['X-Seq-ApiKey']).toBe(
            'my-secret-key'
        );

        await sink[Symbol.asyncDispose]();
    });

    it('omits X-Seq-ApiKey header when no API key is configured', async () => {
        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 1,
            flushInterval: 60_000
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(
            (init.headers as Record<string, string>)['X-Seq-ApiKey']
        ).toBeUndefined();

        await sink[Symbol.asyncDispose]();
    });

    it('retries on non-2xx response and eventually succeeds', async () => {
        fetchSpy
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 503,
                    statusText: 'Service Unavailable'
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 1,
            flushInterval: 60_000,
            maxRetries: 2,
            retryDelay: 1
        });

        await sink.emit([makeEvent()]);
        await sink.flush();

        expect(fetchSpy).toHaveBeenCalledTimes(2);

        await sink[Symbol.asyncDispose]();
    });

    it('uses X-Seq-MinimumLevelAccepted to filter events in subsequent batches', async () => {
        fetchSpy
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 200,
                    headers: { 'X-Seq-MinimumLevelAccepted': 'warning' }
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 10,
            flushInterval: 60_000
        });

        // First flush — server replies with minimum level: warning
        await sink.emit([makeEvent(LogLevel.Information)]);
        await sink.flush();
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Second flush — debug/info events should be filtered out
        await sink.emit([
            makeEvent(LogLevel.Debug),
            makeEvent(LogLevel.Information),
            makeEvent(LogLevel.Warning),
            makeEvent(LogLevel.Error)
        ]);
        await sink.flush();
        expect(fetchSpy).toHaveBeenCalledTimes(2);

        // Only warning + error lines should appear in the body
        const [, secondInit] = fetchSpy.mock.calls[1] as [string, RequestInit];
        const lines = (secondInit.body as string)
            .trim()
            .split('\n')
            .filter(Boolean);
        expect(lines.length).toBe(2);
        for (const line of lines) {
            const obj = JSON.parse(line) as Record<string, unknown>;
            // CLEF omits @l for Information; Warning and Error are present
            expect(obj['@l']).toMatch(/Warning|Error/);
        }

        await sink[Symbol.asyncDispose]();
    });

    it('clears dynamic minimum level when X-Seq-MinimumLevelAccepted is absent', async () => {
        fetchSpy
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 200,
                    headers: { 'X-Seq-MinimumLevelAccepted': 'warning' }
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        const sink = seqSink({
            serverUrl: 'http://localhost:5341',
            batchSize: 10,
            flushInterval: 60_000
        });

        // First flush: server responds with minimum level warning
        await sink.emit([makeEvent(LogLevel.Warning)]);
        await sink.flush();
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Second flush: use a warning-level event so it passes the filter;
        // server responds without the header → dynamicMinLevel resets to undefined
        await sink.emit([makeEvent(LogLevel.Warning)]);
        await sink.flush();
        expect(fetchSpy).toHaveBeenCalledTimes(2);

        // Third flush: a debug event should now pass because the filter was cleared
        await sink.emit([makeEvent(LogLevel.Debug)]);
        await sink.flush();
        expect(fetchSpy).toHaveBeenCalledTimes(3);

        const [, thirdInit] = fetchSpy.mock.calls[2] as [string, RequestInit];
        const lines = (thirdInit.body as string)
            .trim()
            .split('\n')
            .filter(Boolean);
        expect(lines.length).toBe(1);

        await sink[Symbol.asyncDispose]();
    });
});
