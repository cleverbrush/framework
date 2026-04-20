import { describe, expect, it } from 'vitest';
import { LogLevel } from './LogLevel.js';
import {
    captureProperties,
    computeEventId,
    createLogEvent,
    parseTemplate,
    renderTemplate
} from './MessageTemplate.js';

describe('MessageTemplate', () => {
    describe('parseTemplate', () => {
        it('should parse plain text', () => {
            const tokens = parseTemplate('Hello world');
            expect(tokens).toEqual([{ type: 'text', value: 'Hello world' }]);
        });

        it('should parse property tokens', () => {
            const tokens = parseTemplate(
                'User {UserId} signed in from {IpAddress}'
            );
            expect(tokens).toEqual([
                { type: 'text', value: 'User ' },
                {
                    type: 'property',
                    value: 'UserId',
                    destructure: false
                },
                { type: 'text', value: ' signed in from ' },
                {
                    type: 'property',
                    value: 'IpAddress',
                    destructure: false
                }
            ]);
        });

        it('should parse destructure tokens', () => {
            const tokens = parseTemplate('Order received: {@Order}');
            expect(tokens).toEqual([
                { type: 'text', value: 'Order received: ' },
                {
                    type: 'property',
                    value: 'Order',
                    destructure: true
                }
            ]);
        });

        it('should handle escaped braces', () => {
            const tokens = parseTemplate('{{escaped}} {Prop}');
            expect(tokens).toEqual([
                { type: 'text', value: '{' },
                { type: 'text', value: 'escaped}} ' },
                {
                    type: 'property',
                    value: 'Prop',
                    destructure: false
                }
            ]);
        });

        it('should handle unclosed braces', () => {
            const tokens = parseTemplate('unclosed {brace');
            expect(tokens).toEqual([
                { type: 'text', value: 'unclosed ' },
                { type: 'text', value: '{brace' }
            ]);
        });

        it('should cache parsed templates', () => {
            const template = 'Cached {Template}';
            const first = parseTemplate(template);
            const second = parseTemplate(template);
            expect(first).toBe(second);
        });
    });

    describe('renderTemplate', () => {
        it('should interpolate properties', () => {
            const tokens = parseTemplate('User {UserId} signed in');
            const result = renderTemplate(tokens, {
                UserId: 'usr_abc'
            });
            expect(result).toBe('User usr_abc signed in');
        });

        it('should handle missing properties', () => {
            const tokens = parseTemplate('Value: {Missing}');
            const result = renderTemplate(tokens, {});
            expect(result).toBe('Value: {Missing}');
        });

        it('should call toString for non-destructured objects', () => {
            const tokens = parseTemplate('Order: {Order}');
            const result = renderTemplate(tokens, {
                Order: {
                    id: 42,
                    toString: () => 'Order#42'
                }
            });
            expect(result).toBe('Order: Order#42');
        });

        it('should JSON.stringify destructured objects', () => {
            const tokens = parseTemplate('Order: {@Order}');
            const result = renderTemplate(tokens, {
                Order: { id: 42, name: 'test' }
            });
            expect(result).toBe('Order: {"id":42,"name":"test"}');
        });

        it('should handle number and boolean values', () => {
            const tokens = parseTemplate('Port: {Port}, Active: {Active}');
            const result = renderTemplate(tokens, {
                Port: 3000,
                Active: true
            });
            expect(result).toBe('Port: 3000, Active: true');
        });
    });

    describe('captureProperties', () => {
        it('should capture scalar properties', () => {
            const tokens = parseTemplate('{Name} is {Age}');
            const result = captureProperties(tokens, {
                Name: 'Alice',
                Age: 30
            });
            expect(result).toEqual({
                Name: 'Alice',
                Age: 30
            });
        });

        it('should call toString for non-destructured objects', () => {
            const tokens = parseTemplate('{Order}');
            const result = captureProperties(tokens, {
                Order: {
                    toString: () => 'Order#42'
                }
            });
            expect(result).toEqual({ Order: 'Order#42' });
        });

        it('should keep destructured objects intact', () => {
            const tokens = parseTemplate('{@Order}');
            const obj = { id: 42, items: ['a'] };
            const result = captureProperties(tokens, {
                Order: obj
            });
            expect(result.Order).toBe(obj);
        });

        it('should include extra properties not in template', () => {
            const tokens = parseTemplate('{Name}');
            const result = captureProperties(tokens, {
                Name: 'Alice',
                Extra: 'value'
            });
            expect(result).toEqual({
                Name: 'Alice',
                Extra: 'value'
            });
        });
    });

    describe('computeEventId', () => {
        it('should return an 8-char hex string', () => {
            const id = computeEventId('Test template');
            expect(id).toMatch(/^[0-9a-f]{8}$/);
        });

        it('should be deterministic', () => {
            const id1 = computeEventId('Same template');
            const id2 = computeEventId('Same template');
            expect(id1).toBe(id2);
        });

        it('should differ for different templates', () => {
            const id1 = computeEventId('Template A');
            const id2 = computeEventId('Template B');
            expect(id1).not.toBe(id2);
        });

        it('should cache event IDs', () => {
            const template = 'Cached event ID';
            const id1 = computeEventId(template);
            const id2 = computeEventId(template);
            expect(id1).toBe(id2);
        });
    });

    describe('createLogEvent', () => {
        it('should create a complete log event', () => {
            const event = createLogEvent(
                LogLevel.Information,
                'User {UserId} signed in',
                { UserId: 'usr_abc' }
            );

            expect(event.level).toBe(LogLevel.Information);
            expect(event.messageTemplate).toBe('User {UserId} signed in');
            expect(event.renderedMessage).toBe('User usr_abc signed in');
            expect(event.properties.UserId).toBe('usr_abc');
            expect(event.eventId).toMatch(/^[0-9a-f]{8}$/);
            expect(event.timestamp).toBeInstanceOf(Date);
        });

        it('should include exception', () => {
            const err = new Error('test error');
            const event = createLogEvent(
                LogLevel.Error,
                'Failed: {Reason}',
                { Reason: 'timeout' },
                err
            );

            expect(event.exception).toBe(err);
        });
    });
});
