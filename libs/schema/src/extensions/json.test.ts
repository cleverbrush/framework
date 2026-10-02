import { expect, expectTypeOf, it } from 'vitest';
import { type InferType, object } from '../index.js';
import {
    assertJsonValue,
    type JsonObject,
    type JsonValue,
    jsonObject,
    jsonValue
} from './json.js';

it('preserves complete JSON values and unknown nested properties', () => {
    const data = {
        type: 'drawing',
        scenes: [{ extra: { tags: [null, true, 2.5] } }]
    };
    expect(jsonValue().parse(data)).toEqual(data);
    expect(jsonObject().parse(data)).toEqual(data);
    for (const value of [null, true, 3.5, 'text', [], {}])
        expect(jsonValue().parse(value)).toEqual(value);
    expect(jsonObject().validate([] as never).valid).toBe(false);
    expect(jsonObject().validate(null as never).valid).toBe(false);
    expect(jsonObject().optional().validate(undefined).valid).toBe(true);
    expect(jsonObject().nullable().parse(null)).toBeNull();
    const schema = object({ document: jsonObject() });
    expect(schema.parse({ document: data }).document).toEqual(data);
    expectTypeOf<
        InferType<ReturnType<typeof jsonValue>>
    >().toEqualTypeOf<JsonValue>();
    expectTypeOf<
        InferType<ReturnType<typeof jsonObject>>
    >().toEqualTypeOf<JsonObject>();
});

it('rejects values that JSON would silently convert or omit, without invoking getters', () => {
    const cycle: any = {};
    cycle.self = cycle;
    let calls = 0;
    const accessor = {
        get value() {
            calls++;
            return 1;
        }
    };
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
        accessor,
        Object.defineProperty({}, 'hidden', { value: 1 }),
        { [Symbol('key')]: 1 },
        Object.assign([1], { extra: 2 })
    ];
    for (const value of invalid) {
        expect(() => assertJsonValue(value)).toThrow(TypeError);
        expect(jsonValue().validate(value as never).valid).toBe(false);
    }
    expect(calls).toBe(0);
});

it('allows shared references, null-prototype objects and special property names', () => {
    const shared = { a: 1 };
    const value = Object.assign(
        Object.create(null),
        JSON.parse('{"__proto__":{"safe":true}}'),
        { a: shared, b: shared }
    );
    expect(jsonObject().parse(value)).toBe(value);
    expect(Object.hasOwn(value, '__proto__')).toBe(true);
    expect(({} as any).safe).toBeUndefined();
});
