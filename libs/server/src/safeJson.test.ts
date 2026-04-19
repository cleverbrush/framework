import { describe, expect, it } from 'vitest';
import { checkJsonDepth, safeJsonParse } from './safeJson.js';

describe('safeJsonParse', () => {
    it('parses valid JSON normally', () => {
        expect(safeJsonParse('{"a":1,"b":"hello"}')).toEqual({
            a: 1,
            b: 'hello'
        });
    });

    it('parses arrays', () => {
        expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('parses primitives', () => {
        expect(safeJsonParse('"hello"')).toBe('hello');
        expect(safeJsonParse('42')).toBe(42);
        expect(safeJsonParse('true')).toBe(true);
        expect(safeJsonParse('null')).toBeNull();
    });

    it('throws on invalid JSON', () => {
        expect(() => safeJsonParse('not json')).toThrow();
    });

    it('strips __proto__ keys to prevent prototype pollution', () => {
        const result = safeJsonParse(
            '{"__proto__":{"polluted":true},"safe":"value"}'
        ) as any;
        expect(result.safe).toBe('value');
        expect(result.__proto__).toBe(Object.prototype);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('strips nested __proto__ keys', () => {
        const result = safeJsonParse(
            '{"a":{"__proto__":{"polluted":true},"b":1}}'
        ) as any;
        expect(result.a.b).toBe(1);
        expect(result.a.__proto__).toBe(Object.prototype);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('strips constructor keys to prevent prototype pollution', () => {
        const result = safeJsonParse(
            '{"constructor":{"prototype":{"polluted":true}}}'
        ) as any;
        expect(result.constructor).toBe(Object);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('strips __proto__ inside arrays', () => {
        const result = safeJsonParse(
            '[{"__proto__":{"polluted":true},"ok":1}]'
        ) as any[];
        expect(result[0].ok).toBe(1);
        expect(result[0].__proto__).toBe(Object.prototype);
        expect(({} as any).polluted).toBeUndefined();
    });

    it('preserves safe keys that look similar', () => {
        const result = safeJsonParse(
            '{"__proto": 1, "proto": "safe", "prototype": "also_safe"}'
        ) as any;
        // __proto__ is stripped, but "proto" and "prototype" are preserved
        expect(result.proto).toBe('safe');
        expect(result.prototype).toBe('also_safe');
    });
});

describe('checkJsonDepth', () => {
    it('accepts shallow objects', () => {
        expect(() => checkJsonDepth({ a: 1, b: { c: 2 } })).not.toThrow();
    });

    it('accepts shallow arrays', () => {
        expect(() => checkJsonDepth([1, [2, [3]]])).not.toThrow();
    });

    it('accepts primitives at any depth setting', () => {
        expect(() => checkJsonDepth('hello', 1)).not.toThrow();
        expect(() => checkJsonDepth(42, 1)).not.toThrow();
        expect(() => checkJsonDepth(null, 1)).not.toThrow();
    });

    it('rejects objects exceeding max depth', () => {
        // Build an object nested 65 levels deep
        let obj: any = { value: 'leaf' };
        for (let i = 0; i < 65; i++) {
            obj = { nested: obj };
        }
        expect(() => checkJsonDepth(obj, 64)).toThrow(
            'JSON nesting depth exceeds maximum of 64'
        );
    });

    it('rejects arrays exceeding max depth', () => {
        let arr: any = ['leaf'];
        for (let i = 0; i < 65; i++) {
            arr = [arr];
        }
        expect(() => checkJsonDepth(arr, 64)).toThrow(
            'JSON nesting depth exceeds maximum of 64'
        );
    });

    it('accepts objects exactly at max depth', () => {
        // 3 levels: { a: { b: { c: 1 } } }
        const obj = { a: { b: { c: 1 } } };
        expect(() => checkJsonDepth(obj, 3)).not.toThrow();
    });

    it('rejects objects one level beyond max depth', () => {
        const obj = { a: { b: { c: { d: 1 } } } };
        expect(() => checkJsonDepth(obj, 3)).toThrow(
            'JSON nesting depth exceeds maximum of 3'
        );
    });

    it('uses default max depth of 64', () => {
        let obj: any = { value: 'leaf' };
        for (let i = 0; i < 63; i++) {
            obj = { nested: obj };
        }
        // 64 levels — should pass
        expect(() => checkJsonDepth(obj)).not.toThrow();

        // 65 levels — should fail
        obj = { nested: obj };
        expect(() => checkJsonDepth(obj)).toThrow();
    });
});
