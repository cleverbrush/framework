import { describe, expect, it } from 'vitest';
import { formatClef, formatClefBatch } from './formatters/ClefFormatter.js';
import type { LogEvent } from './LogEvent.js';
import { LogLevel } from './LogLevel.js';

function makeEvent(overrides?: Partial<LogEvent>): LogEvent {
    return {
        timestamp: new Date('2026-04-20T14:30:00.123Z'),
        level: LogLevel.Information,
        messageTemplate: 'User {UserId} signed in',
        renderedMessage: 'User usr_abc signed in',
        properties: { UserId: 'usr_abc' },
        eventId: 'a1b2c3d4',
        ...overrides
    };
}

describe('ClefFormatter', () => {
    describe('formatClef', () => {
        it('should include @t timestamp', () => {
            const line = formatClef(makeEvent());
            const obj = JSON.parse(line);
            expect(obj['@t']).toBe('2026-04-20T14:30:00.123Z');
        });

        it('should include @mt message template', () => {
            const line = formatClef(makeEvent());
            const obj = JSON.parse(line);
            expect(obj['@mt']).toBe('User {UserId} signed in');
        });

        it('should include @m when it differs from @mt', () => {
            const line = formatClef(makeEvent());
            const obj = JSON.parse(line);
            expect(obj['@m']).toBe('User usr_abc signed in');
        });

        it('should omit @m when it equals @mt', () => {
            const event = makeEvent({
                messageTemplate: 'No holes',
                renderedMessage: 'No holes'
            });
            const line = formatClef(event);
            const obj = JSON.parse(line);
            expect(obj['@m']).toBeUndefined();
        });

        it('should omit @l for Information level', () => {
            const line = formatClef(makeEvent());
            const obj = JSON.parse(line);
            expect(obj['@l']).toBeUndefined();
        });

        it('should include @l for non-Information levels', () => {
            const levels: [LogLevel, string][] = [
                [LogLevel.Trace, 'Verbose'],
                [LogLevel.Debug, 'Debug'],
                [LogLevel.Warning, 'Warning'],
                [LogLevel.Error, 'Error'],
                [LogLevel.Fatal, 'Fatal']
            ];

            for (const [level, expected] of levels) {
                const line = formatClef(makeEvent({ level }));
                const obj = JSON.parse(line);
                expect(obj['@l']).toBe(expected);
            }
        });

        it('should include @x for exceptions', () => {
            const err = new Error('test error');
            const line = formatClef(makeEvent({ exception: err }));
            const obj = JSON.parse(line);
            expect(obj['@x']).toContain('test error');
        });

        it('should include @i event ID', () => {
            const line = formatClef(makeEvent());
            const obj = JSON.parse(line);
            expect(obj['@i']).toBe('a1b2c3d4');
        });

        it('should spread properties as top-level fields', () => {
            const line = formatClef(
                makeEvent({
                    properties: {
                        UserId: 'usr_abc',
                        Port: 3000
                    }
                })
            );
            const obj = JSON.parse(line);
            expect(obj.UserId).toBe('usr_abc');
            expect(obj.Port).toBe(3000);
        });

        it('should safely serialize complex properties', () => {
            const circular: any = { name: 'test' };
            circular.self = circular;
            const line = formatClef(
                makeEvent({
                    properties: { Data: circular }
                })
            );
            const obj = JSON.parse(line);
            expect(obj.Data.self).toBe('[Circular]');
        });
    });

    describe('formatClefBatch', () => {
        it('should join events with newlines', () => {
            const events = [
                makeEvent(),
                makeEvent({
                    level: LogLevel.Warning
                })
            ];
            const result = formatClefBatch(events);
            const lines = result.split('\n');
            expect(lines.length).toBe(2);
            expect(JSON.parse(lines[0])['@mt']).toBe('User {UserId} signed in');
        });
    });
});
