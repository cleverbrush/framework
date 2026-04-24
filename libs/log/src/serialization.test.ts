import { describe, expect, it } from 'vitest';
import { safeSerialize } from './serialization.js';

describe('safeSerialize', () => {
    it('should pass through primitives', () => {
        expect(safeSerialize(null)).toBeNull();
        expect(safeSerialize(undefined)).toBeUndefined();
        expect(safeSerialize(42)).toBe(42);
        expect(safeSerialize('hello')).toBe('hello');
        expect(safeSerialize(true)).toBe(true);
    });

    it('should convert BigInt to string', () => {
        expect(safeSerialize(9007199254740993n)).toBe('9007199254740993');
    });

    it('should convert Symbol to string', () => {
        expect(safeSerialize(Symbol('test'))).toBe('[Symbol: test]');
    });

    it('should convert Function to string', () => {
        function myFunc() {}
        expect(safeSerialize(myFunc)).toBe('[Function: myFunc]');
    });

    it('should handle anonymous functions', () => {
        expect(safeSerialize(() => {})).toBe('[Function: anonymous]');
    });

    it('should handle Buffer', () => {
        const buf = Buffer.alloc(1024);
        expect(safeSerialize(buf)).toBe('[Buffer(1024 bytes)]');
    });

    it('should handle circular references', () => {
        const obj: any = { name: 'root' };
        obj.self = obj;
        const result = safeSerialize(obj) as any;
        expect(result.name).toBe('root');
        expect(result.self).toBe('[Circular]');
    });

    it('should respect depth limit', () => {
        const deep = {
            a: { b: { c: { d: 'value' } } }
        };
        const result = safeSerialize(deep, {
            maxDepth: 2
        }) as any;
        expect(result.a.b).toBe('[Object]');
    });

    it('should truncate long strings', () => {
        const long = 'a'.repeat(100);
        const result = safeSerialize(long, {
            maxStringLength: 50
        }) as string;
        expect(result.length).toBeLessThan(100);
        expect(result).toContain('...(truncated)');
    });

    it('should serialize Error objects', () => {
        const err = new Error('test error');
        (err as any).code = 'ERR_TEST';
        const result = safeSerialize(err) as any;
        expect(result.name).toBe('Error');
        expect(result.message).toBe('test error');
        expect(result.stack).toBeDefined();
        expect(result.code).toBe('ERR_TEST');
    });

    it('should handle arrays', () => {
        const result = safeSerialize([1, 'two', null]);
        expect(result).toEqual([1, 'two', null]);
    });

    it('should handle Date objects', () => {
        const date = new Date('2026-01-01');
        expect(safeSerialize(date)).toBe(date.toISOString());
    });

    it('should handle RegExp', () => {
        const re = /test/gi;
        expect(safeSerialize(re)).toBe('/test/gi');
    });

    it('should handle Map', () => {
        const map = new Map<string, number>([
            ['a', 1],
            ['b', 2]
        ]);
        expect(safeSerialize(map)).toEqual({
            a: 1,
            b: 2
        });
    });

    it('should handle Set', () => {
        const set = new Set([1, 2, 3]);
        expect(safeSerialize(set)).toEqual([1, 2, 3]);
    });

    it('should handle nested arrays at depth limit', () => {
        const arr = [[[[['deep']]]]];
        const result = safeSerialize(arr, {
            maxDepth: 3
        }) as any;
        expect(result[0][0][0]).toBe('[Array]');
    });

    it('should handle plain objects', () => {
        const obj = { a: 1, b: 'two', c: true };
        expect(safeSerialize(obj)).toEqual({
            a: 1,
            b: 'two',
            c: true
        });
    });
});
