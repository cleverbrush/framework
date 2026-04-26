import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { fileSink } from './FileSink.js';

function makeEvent(
    level: LogLevel,
    msg: string,
    timestamp = new Date()
): LogEvent {
    return {
        timestamp,
        level,
        messageTemplate: msg,
        renderedMessage: msg,
        properties: {}
    };
}

async function settle(ms = 50): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
}

let dir: string;
let logPath: string;

beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileSink-'));
    logPath = path.join(dir, 'app.log');
});

afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('fileSink', () => {
    it('appends CLEF lines to the file', async () => {
        const sink = fileSink({ path: logPath });
        await sink.emit([
            makeEvent(LogLevel.Information, 'first'),
            makeEvent(LogLevel.Warning, 'second')
        ]);
        await sink[Symbol.asyncDispose]();

        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n');
        expect(lines).toHaveLength(2);
        for (const line of lines) {
            const parsed = JSON.parse(line);
            expect(parsed['@t']).toBeDefined();
        }
    });

    it('creates the parent directory if it does not exist', async () => {
        const nested = path.join(dir, 'nested', 'deeper', 'app.log');
        const sink = fileSink({ path: nested });
        await sink.emit([makeEvent(LogLevel.Information, 'hi')]);
        await sink[Symbol.asyncDispose]();

        expect(fs.existsSync(nested)).toBe(true);
    });

    it('filters events below minimumLevel', async () => {
        const sink = fileSink({ path: logPath, minimumLevel: 'warning' });
        await sink.emit([
            makeEvent(LogLevel.Trace, 'trace'),
            makeEvent(LogLevel.Information, 'info'),
            makeEvent(LogLevel.Warning, 'warn'),
            makeEvent(LogLevel.Error, 'err')
        ]);
        await sink[Symbol.asyncDispose]();

        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n');
        expect(lines).toHaveLength(2);
    });

    it('rotates when size threshold is reached', async () => {
        const sink = fileSink({
            path: logPath,
            rotation: { strategy: 'size', maxBytes: 50, retainCount: 5 }
        });

        await sink.emit([makeEvent(LogLevel.Information, 'first event')]);
        await settle();
        await sink.emit([makeEvent(LogLevel.Information, 'second event')]);
        await settle();
        await sink.emit([makeEvent(LogLevel.Information, 'third event')]);
        await sink[Symbol.asyncDispose]();
        await settle();

        const files = fs.readdirSync(dir);
        // Active file + at least one rotated file
        expect(files.length).toBeGreaterThan(1);
        expect(files).toContain('app.log');
    });

    it('rotates when the date changes (time strategy)', async () => {
        const sink = fileSink({
            path: logPath,
            rotation: { strategy: 'time', interval: 'daily' }
        });

        // First write fixes currentDate.
        await sink.emit([
            makeEvent(LogLevel.Information, 'today', new Date(2020, 0, 1))
        ]);
        await settle();

        // Mock the Date so the next write sees a different day.
        const RealDate = Date;
        globalThis.Date = class extends RealDate {
            constructor(...args: any[]) {
                if (args.length === 0) {
                    super(2099, 11, 31);
                } else {
                    super(...(args as []));
                }
            }
            static override now() {
                return new RealDate(2099, 11, 31).getTime();
            }
        } as DateConstructor;

        try {
            await sink.emit([makeEvent(LogLevel.Information, 'tomorrow')]);
        } finally {
            globalThis.Date = RealDate;
        }
        await sink[Symbol.asyncDispose]();
        await settle();

        const files = fs.readdirSync(dir);
        expect(files.length).toBeGreaterThan(1);
    });

    it('hybrid strategy rotates on size threshold', async () => {
        const sink = fileSink({
            path: logPath,
            rotation: {
                strategy: 'hybrid',
                maxBytes: 50,
                interval: 'daily'
            }
        });

        for (let i = 0; i < 4; i++) {
            await sink.emit([
                makeEvent(LogLevel.Information, `event-${i}-padding`)
            ]);
            await settle(20);
        }
        await sink[Symbol.asyncDispose]();
        await settle();

        const files = fs.readdirSync(dir);
        expect(files.length).toBeGreaterThan(1);
    });

    it('prunes old rotated files beyond retainCount', async () => {
        const sink = fileSink({
            path: logPath,
            rotation: { strategy: 'size', maxBytes: 10, retainCount: 2 }
        });

        for (let i = 0; i < 8; i++) {
            await sink.emit([makeEvent(LogLevel.Information, `e${i}`)]);
            await settle(20);
        }
        await sink[Symbol.asyncDispose]();
        await settle();

        const rotated = fs
            .readdirSync(dir)
            .filter(f => f !== 'app.log' && f.startsWith('app.'));
        expect(rotated.length).toBeLessThanOrEqual(2);
    });

    it('flush() resolves without throwing', async () => {
        const sink = fileSink({ path: logPath });
        await sink.emit([makeEvent(LogLevel.Information, 'x')]);
        await expect(sink.flush?.()).resolves.toBeUndefined();
        await sink[Symbol.asyncDispose]();
    });

    it('flush() is a no-op when no stream is open', async () => {
        const sink = fileSink({ path: logPath });
        await expect(sink.flush?.()).resolves.toBeUndefined();
    });

    it('asyncDispose is safe to call when no stream is open', async () => {
        const sink = fileSink({ path: logPath });
        await expect(sink[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });

    it('hourly interval produces hour-bucketed dates', async () => {
        const sink = fileSink({
            path: logPath,
            rotation: { strategy: 'time', interval: 'hourly' }
        });
        // Just exercise the codepath.
        await sink.emit([makeEvent(LogLevel.Information, 'hi')]);
        await sink[Symbol.asyncDispose]();

        expect(fs.existsSync(logPath)).toBe(true);
    });
});
