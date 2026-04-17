import { describe, expect, test } from 'vitest';
import {
    errorFrame,
    messageFrame,
    parseClientFrame,
    pongFrame,
    trackedFrame
} from './WebSocketProtocol.js';

describe('WebSocketProtocol', () => {
    describe('server frame constructors', () => {
        test('messageFrame wraps data', () => {
            const frame = messageFrame({ hello: 'world' });
            expect(frame).toEqual({
                type: 'message',
                data: { hello: 'world' }
            });
        });

        test('trackedFrame includes id', () => {
            const frame = trackedFrame('evt-1', { count: 42 });
            expect(frame).toEqual({
                type: 'tracked',
                id: 'evt-1',
                data: { count: 42 }
            });
        });

        test('pongFrame creates pong', () => {
            expect(pongFrame()).toEqual({ type: 'pong' });
        });

        test('errorFrame includes code and message', () => {
            const frame = errorFrame(400, 'something went wrong');
            expect(frame).toEqual({
                type: 'error',
                code: 400,
                message: 'something went wrong'
            });
        });
    });

    describe('parseClientFrame', () => {
        test('parses message frame', () => {
            const raw = JSON.stringify({
                type: 'message',
                data: { text: 'hi' }
            });
            const frame = parseClientFrame(raw);
            expect(frame).toEqual({ type: 'message', data: { text: 'hi' } });
        });

        test('parses ping frame', () => {
            const raw = JSON.stringify({ type: 'ping' });
            const frame = parseClientFrame(raw);
            expect(frame).toEqual({ type: 'ping' });
        });

        test('returns null for invalid JSON', () => {
            expect(parseClientFrame('not json')).toBeNull();
        });

        test('returns null for non-object', () => {
            expect(parseClientFrame('"string"')).toBeNull();
            expect(parseClientFrame('42')).toBeNull();
        });

        test('returns null for unknown frame type', () => {
            expect(
                parseClientFrame(JSON.stringify({ type: 'unknown' }))
            ).toBeNull();
        });

        test('returns null for missing type', () => {
            expect(
                parseClientFrame(JSON.stringify({ data: 'hello' }))
            ).toBeNull();
        });
    });
});
