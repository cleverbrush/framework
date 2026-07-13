import { expect, test } from 'vitest';

import { deepExtend } from './deepExtend.js';

test('deepExtend - 1', () => {
    const res = deepExtend({ a: 1 });
    expect(res).toEqual({ a: 1 });
});

test('deepExtend - 2', () => {
    expect(deepExtend({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
});

test('deepExtend - 3', () => {
    expect(deepExtend({ a: 1 }, { b: { c: 20 } })).toEqual({
        a: 1,
        b: { c: 20 }
    });
});

test('deepExtend - 4', () => {
    expect(deepExtend({ a: 1 }, { b: { c: 20, d: 'some string' } })).toEqual({
        a: 1,
        b: { c: 20, d: 'some string' }
    });
});

test('deepExtend - 5', () => {
    const res = deepExtend(
        { a: 1 },
        { b: { c: 20, d: 'some string', e: null } }
    );
    expect(res).toEqual({ a: 1, b: { c: 20, d: 'some string', e: null } });
});

test('deepExtend - 6', () => {
    expect(deepExtend({ a: 1 }, { a: null })).toEqual({ a: null });
});

test('deepExtend - 7', () => {
    expect(() => deepExtend()).toThrow('no arguments');
});

test('deepExtend - 8', () => {
    expect(() => deepExtend(null)).toThrow('not a non-null object');
});

test('deepExtend - 9', () => {
    expect(() => deepExtend(undefined)).toThrow('not a non-null object');
});

test('deepExtend - 10', () => {
    expect(() => deepExtend({ a: 1 }, null)).toThrow('not a non-null object');
});

test('deepExtend - 11', () => {
    expect(deepExtend({ a: null }, { a: { b: 20 } })).toEqual({
        a: { b: 20 }
    });
});

test('deepExtend - 12', () => {
    expect(deepExtend({ a: { b: 20 } }, { a: { b: 30, c: 40 } })).toEqual({
        a: { b: 30, c: 40 }
    });
});

test('deepExtend - 13', () => {
    expect(deepExtend({ a: { b: 20 } }, { a: null })).toEqual({
        a: null
    });
});

test('deepExtend skips top-level __proto__ keys', () => {
    removePollutedMarker();

    try {
        const payload = JSON.parse(
            '{"__proto__":{"polluted":"pp"},"safe":"ok"}'
        ) as Record<string, unknown>;

        const result = deepExtend({}, payload) as Record<string, unknown>;

        expect(result.safe).toBe('ok');
        expect(Object.hasOwn(result, '__proto__')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
    } finally {
        removePollutedMarker();
    }
});

test('deepExtend skips nested __proto__ keys', () => {
    removePollutedMarker();

    try {
        const payload = JSON.parse(
            '{"a":{"__proto__":{"polluted":"pp"},"safe":1}}'
        ) as any;

        const result = deepExtend({ a: {} }, payload) as any;

        expect(result.a.safe).toBe(1);
        expect(Object.hasOwn(result.a, '__proto__')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
    } finally {
        removePollutedMarker();
    }
});

test('deepExtend skips constructor and prototype keys', () => {
    removePollutedMarker();

    try {
        const payload = JSON.parse(
            '{"constructor":{"prototype":{"polluted":true}},' +
                '"prototype":{"polluted":true},"safe":"ok"}'
        ) as Record<string, unknown>;

        const result = deepExtend({}, payload) as Record<string, unknown>;

        expect(result.safe).toBe('ok');
        expect(Object.hasOwn(result, 'constructor')).toBe(false);
        expect(Object.hasOwn(result, 'prototype')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
    } finally {
        removePollutedMarker();
    }
});

test('deepExtend filters unsafe keys from a single source object', () => {
    removePollutedMarker();

    try {
        const payload = JSON.parse(
            '{"__proto__":{"polluted":"pp"},"safe":"ok"}'
        ) as Record<string, unknown>;

        const result = deepExtend(payload) as Record<string, unknown>;

        expect(result).not.toBe(payload);
        expect(result.safe).toBe('ok');
        expect(Object.hasOwn(result, '__proto__')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
    } finally {
        removePollutedMarker();
    }
});

test('deepExtend does not recurse into inherited target properties', () => {
    const inheritedRetry = { maxRetries: 1 };
    const options = Object.create({ retry: inheritedRetry });

    const result = deepExtend(
        { options },
        { options: { retry: { minDelay: 10 } } }
    ) as any;

    expect(inheritedRetry).toEqual({ maxRetries: 1 });
    expect(result.options.retry).toEqual({ minDelay: 10 });
    expect(Object.hasOwn(result.options, 'retry')).toBe(true);
});

function removePollutedMarker(): void {
    delete (Object.prototype as { polluted?: unknown }).polluted;
}
