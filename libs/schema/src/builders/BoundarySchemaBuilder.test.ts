import { describe, expect, it, vi } from 'vitest';
import {
    array,
    boolean,
    decode,
    number,
    object,
    schemaRef,
    string
} from '../index.js';

describe('schema boundaries', () => {
    it('accepts optional/nullable fallbacks and preserves legacy null acceptance', async () => {
        const text = string().optional().catch(undefined);
        expect(text.parse(42)).toBeUndefined();
        expect(await text.parseAsync(false)).toBeUndefined();
        expect(text.parse(null)).toBeNull();
        expect(string().nullable().catch(null).parse(42)).toBeNull();
        const normalize = string()
            .optional()
            .addPreprocessor(v => (v == null ? undefined : v))
            .catch(undefined);
        expect(normalize.parse(null)).toBeUndefined();
        expect(object({ text }).safeParse(null).valid).toBe(false);
        expect(
            object({
                text,
                flag: boolean()
                    .optional()
                    .catch(() => undefined)
            }).parse({ text: {}, flag: 1 })
        ).toEqual({ text: undefined, flag: undefined });
    });

    it('validates both sides and converts once', () => {
        const convert = vi.fn(Number);
        const size = decode(
            string(),
            number().isInteger().min(1).max(100),
            convert
        );
        expect(size.parse('12')).toBe(12);
        expect(convert).toHaveBeenCalledTimes(1);
        expect(size.safeParse(12).valid).toBe(false);
        expect(convert).toHaveBeenCalledTimes(1);
        expect(size.safeParse('0').valid).toBe(false);
        expect(size.safeParse('nope').valid).toBe(false);
        expect(object({ size }).parse({ size: '5' })).toEqual({ size: 5 });
        expect(array(size).parse(['2', '3'])).toEqual([2, 3]);
    });

    it('supports async conversion and captures converter failures', async () => {
        const size = decode(string(), number(), async value => Number(value));
        expect(() => size.parse('1')).toThrow(/parseAsync/);
        expect(await size.parseAsync('2')).toBe(2);
        expect(await size['~standard'].validate('3')).toEqual({ value: 3 });
        const broken = decode(string(), number(), () => {
            throw new Error('not convertible');
        });
        expect(broken.safeParse('x')).toMatchObject({
            valid: false,
            errors: [{ message: 'Decoder failed: not convertible' }]
        });
        const rejected = decode(string(), number(), async () => {
            throw new Error('rejected');
        });
        expect((await rejected.safeParseAsync('x')).valid).toBe(false);
    });

    it('handles input defaults, output defaults and use-site modifiers', () => {
        const size = decode(string().default('2'), number(), Number);
        expect(size.parse(undefined)).toBe(2);
        expect(size.optional().parse(undefined)).toBeUndefined();
        expect(size.nullable().parse(null)).toBeNull();
        expect(size.default(4).parse(undefined)).toBe(4);
        expect(size.default(4).clearDefault().parse(undefined)).toBe(2);
        expect(size.optional().required().safeParse(undefined).valid).toBe(
            false
        );
    });

    it('preserves one named definition and local metadata', () => {
        const user = object({ name: string().minLength(1) }).schemaName('User');
        const ref = schemaRef(user);
        const previous = ref.nullable().optional().describe('Previous user');
        expect(ref.introspect().outputSchema).toBe(user);
        expect(previous.introspect().outputSchema).toBe(user);
        expect(user.introspect().description).toBeUndefined();
        expect(ref.safeParse(null).valid).toBe(false);
        expect(previous.parse(null)).toBeNull();
        expect(previous.parse(undefined)).toBeUndefined();
        expect(previous.parse({ name: 'Ada' })).toEqual({ name: 'Ada' });
        expect(() => schemaRef(string())).toThrow(/named schema/);
    });

    it('preserves nested reference errors and selectors', () => {
        const user = object({ name: string().minLength(1) }).schemaName('User');
        const result = object({ user: schemaRef(user) }).validate({
            user: { name: '' }
        });
        expect(result.valid).toBe(false);
        expect(
            result.getErrorsFor(t => t.user.name).errors.length
        ).toBeGreaterThan(0);
        expect(
            result.getInvalidProperties().map(p => p.descriptor.toJsonPointer())
        ).toContain('/user/name');
    });
});

describe('decoding boundary edge cases', () => {
    it('uses output defaults and never re-runs conversion for catch', async () => {
        const convert = vi.fn(() => undefined);
        const schema = decode(string(), number().default(8), convert);
        expect(schema.parse('missing')).toBe(8);
        expect(convert).toHaveBeenCalledTimes(1);
        const fail = vi.fn(() => {
            throw new Error('conversion');
        });
        const fallback = decode(string(), number(), fail).catch(() => 4);
        expect(fallback.parse('x')).toBe(4);
        expect(await fallback.parseAsync('y')).toBe(4);
        expect(fail).toHaveBeenCalledTimes(2);
    });

    it('keeps required messages and sync/async rules', async () => {
        const schema = decode(string(), number(), Number).optional();
        expect(
            schema.required('Provide a size').safeParse(undefined).errors?.[0]
                .message
        ).toBe('Provide a size');
        const asyncRequired = schema.required(async () => 'Async required');
        expect(() => asyncRequired.parse(undefined)).toThrow(/Async|async/);
        expect(
            (await asyncRequired.safeParseAsync(undefined)).errors?.[0].message
        ).toBe('Async required');
    });

    it('retains nested errors from both decoding stages', () => {
        const schema = object({
            item: decode(
                object({ input: object({ value: string().minLength(1) }) }),
                object({ output: object({ count: number().min(1) }) }),
                input => ({ output: { count: Number(input.input.value) } })
            )
        });
        const inputFailure = schema.validate({
            item: { input: { value: '' } }
        } as any);
        expect(
            inputFailure
                .getInvalidProperties()
                .map(p => p.descriptor.toJsonPointer())
        ).toContain('/item/input/value');
        const outputFailure = schema.validate({
            item: { input: { value: '0' } }
        } as any);
        expect(
            outputFailure.getErrorsFor(t => t.item.output.count).errors.length
        ).toBeGreaterThan(0);
        expect(
            outputFailure
                .getInvalidProperties()
                .map(p => p.descriptor.toJsonPointer())
        ).toContain('/item/output/count');
    });
});
