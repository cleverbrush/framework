import { describe, expect, it, vi } from 'vitest';
import { array, boolean, number, object, schemaRef, string } from '../index.js';

describe('optional fallbacks', () => {
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

    it('supports async optional preprocessing without dropping array entries', async () => {
        const fallback = vi.fn(() => undefined);
        const text = string().optional().catch(fallback);
        expect(array(text).parse(['ok', 42])).toEqual(['ok', undefined]);
        expect(fallback).toHaveBeenCalledTimes(1);
        const normalized = string()
            .optional()
            .addPreprocessor(async v => (v == null ? undefined : v));
        expect(await normalized.parseAsync(null)).toBeUndefined();
        expect(() => normalized.parse(null)).toThrow(/validateAsync/);
    });
});

describe('named schema references', () => {
    it('preserves one target definition and independent local metadata', () => {
        const user = object({ name: string().minLength(1) }).schemaName('User');
        const ref = schemaRef(user);
        const previous = ref
            .nullable()
            .optional()
            .describe('Previous user')
            .example(null);
        expect(ref.introspect().targetSchema).toBe(user);
        expect(previous.introspect().targetSchema).toBe(user);
        expect(user.introspect().description).toBeUndefined();
        expect(user.introspect().isRequired).toBe(true);
        expect(ref.safeParse(null).valid).toBe(false);
        expect(previous.parse(null)).toBeNull();
        expect(previous.parse(undefined)).toBeUndefined();
        expect(previous.parse({ name: 'Ada' })).toEqual({ name: 'Ada' });
        expect(() => schemaRef(string())).toThrow(/named schema/);
        expect(() => schemaRef(string().schemaName(' '))).toThrow(
            /named schema/
        );
    });

    it('preserves deeply nested reference errors and selectors', async () => {
        const address = object({ city: string().minLength(1) }).schemaName(
            'Address'
        );
        const user = object({ address: schemaRef(address) }).schemaName('User');
        const root = object({ user: schemaRef(user) });
        for (const result of [
            root.validate({ user: { address: { city: '' } } }),
            await root.validateAsync({ user: { address: { city: '' } } })
        ]) {
            expect(result.valid).toBe(false);
            expect(
                result.getErrorsFor(t => t.user.address.city).errors.length
            ).toBeGreaterThan(0);
            expect(
                result
                    .getInvalidProperties()
                    .map(p => p.descriptor.toJsonPointer())
            ).toContain('/user/address/city');
        }
    });

    it('keeps target defaults, local defaults and fallbacks independent', async () => {
        const target = number().default(2).schemaName('Size');
        const ref = schemaRef(target);
        expect(ref.parse(undefined)).toBe(2);
        expect(ref.optional().parse(undefined)).toBeUndefined();
        expect(ref.optional().default(4).parse(undefined)).toBe(4);
        expect(ref.default(4).clearDefault().parse(undefined)).toBe(2);
        expect(target.parse(undefined)).toBe(2);
        const fallback = vi.fn(() => 8);
        const caught = ref.catch(fallback);
        expect(caught.parse('invalid')).toBe(8);
        expect(await caught.parseAsync('invalid')).toBe(8);
        expect(fallback).toHaveBeenCalledTimes(2);
        expect(ref.optional().catch(undefined).parse({})).toBeUndefined();
    });

    it('keeps local optionality, nullability and required error messages distinct', async () => {
        const ref = schemaRef(
            string().nullable().optional().schemaName('Text')
        );
        expect(ref.parse(null)).toBeNull();
        expect(ref.notNullable().safeParse(null).valid).toBe(false);
        expect(ref.notNullable().parse(undefined)).toBeUndefined();
        const required = ref.required('Provide text');
        expect(required.safeParse(undefined).errors?.[0].message).toBe(
            'Provide text'
        );
        expect(required.parse(null)).toBeNull();
        const asyncRequired = ref.required(async () => 'Async required');
        expect(() => asyncRequired.parse(undefined)).toThrow(/Async|async/);
        expect(
            (await asyncRequired.safeParseAsync(undefined)).errors?.[0].message
        ).toBe('Async required');
    });

    it('delegates async target validation and runs local callbacks', async () => {
        const target = string()
            .addPreprocessor(async v => v.trim())
            .schemaName('Trimmed');
        const ref = schemaRef(target);
        expect(() => ref.parse(' text ')).toThrow(/validateAsync/);
        expect(await ref.parseAsync(' text ')).toBe('text');
        expect(await ref['~standard'].validate(' text ')).toEqual({
            value: 'text'
        });
        const local = schemaRef(number().schemaName('Count'))
            .addPreprocessor(v => v + 1)
            .addValidator(v => ({ valid: v < 5 }));
        expect(local.parse(2)).toBe(3);
        expect(local.safeParse(5).valid).toBe(false);
        expect(
            schemaRef(string().schemaName('OptionalText'))
                .optional()
                .addPreprocessor(() => undefined)
                .parse('text')
        ).toBeUndefined();
    });

    it('retains existing hasType behavior without changing runtime validation', () => {
        const ref = schemaRef(number().schemaName('Count')).hasType<string>();
        expect(ref.parse(3)).toBe(3);
        expect(ref.safeParse('three').valid).toBe(false);
        expect(ref.clearHasType().parse(4)).toBe(4);
    });
});
