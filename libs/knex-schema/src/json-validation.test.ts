import { expect, it, vi } from 'vitest';
import { assertJsonValue } from './json-validation.js';

it('accepts nested JSON, shared references and null-prototype objects', () => {
    const shared = { tags: [null, true, 2.5, 'text'] };
    const value = Object.assign(
        Object.create(null),
        JSON.parse('{"__proto__":{"safe":true}}'),
        { a: shared, b: shared }
    );
    expect(() => assertJsonValue(value)).not.toThrow();
    expect(Object.hasOwn(value, '__proto__')).toBe(true);
    expect(({} as any).safe).toBeUndefined();
});

it('rejects lossy extension values without invoking getters or serialization hooks', () => {
    const cycle: any = {};
    cycle.self = cycle;
    const getter = vi.fn(() => 1);
    const toJSON = vi.fn(() => ({}));
    const invalid = [
        undefined,
        NaN,
        Infinity,
        1n,
        () => 1,
        new Date(),
        new Map(),
        cycle,
        new Array(2),
        [undefined],
        { a: undefined },
        Object.defineProperty({}, 'value', { get: getter, enumerable: true }),
        Object.defineProperty({}, 'hidden', { value: 1 }),
        { [Symbol('key')]: 1 },
        Object.assign([1], { extra: 2 }),
        { toJSON }
    ];
    for (const value of invalid)
        expect(() => assertJsonValue(value)).toThrow(TypeError);
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
});
