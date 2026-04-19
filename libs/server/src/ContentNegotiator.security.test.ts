import { describe, expect, it } from 'vitest';
import { ContentNegotiator } from './ContentNegotiator.js';

describe('ContentNegotiator — security', () => {
    it('JSON deserializer strips __proto__ keys (prototype pollution)', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectRequestHandler('application/json')!;
        const result = handler.deserialize(
            '{"__proto__":{"polluted":true},"safe":"ok"}'
        ) as any;

        expect(result.safe).toBe('ok');
        expect(result.__proto__).toBe(Object.prototype);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('JSON deserializer strips constructor keys (prototype pollution)', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectRequestHandler('application/json')!;
        const result = handler.deserialize(
            '{"constructor":{"prototype":{"polluted":true}},"ok":1}'
        ) as any;

        expect(result.ok).toBe(1);
        expect(result.constructor).toBe(Object);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('JSON deserializer rejects deeply nested payloads', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectRequestHandler('application/json')!;
        let json = '"leaf"';
        for (let i = 0; i < 70; i++) {
            json = `{"d":${json}}`;
        }

        expect(() => handler.deserialize(json)).toThrow(
            'JSON nesting depth exceeds maximum of 64'
        );
    });

    it('JSON deserializer accepts payloads within max depth', () => {
        const cn = new ContentNegotiator();
        const handler = cn.selectRequestHandler('application/json')!;
        let json = '"leaf"';
        for (let i = 0; i < 60; i++) {
            json = `{"d":${json}}`;
        }

        expect(handler.deserialize(json)).toBeDefined();
    });
});
