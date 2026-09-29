import { describe, expect, it, vi } from 'vitest';
import * as core from '../core.js';
import { array, boolean, number, object, string, tuple } from '../index.js';

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
        const ref = user;
        const previous = ref
            .nullable()
            .optional()
            .describe('Previous user')
            .example(null);
        expect(ref.introspect().referenceTarget).toBeUndefined();
        expect(previous.introspect().referenceTarget).toBe(user);
        expect(user.introspect().description).toBeUndefined();
        expect(user.introspect().isRequired).toBe(true);
        expect(ref.safeParse(null).valid).toBe(false);
        expect(previous.parse(null)).toBeNull();
        expect(previous.parse(undefined)).toBeUndefined();
        expect(previous.parse({ name: 'Ada' })).toEqual({ name: 'Ada' });
        expect(
            string().optional().introspect().referenceTarget
        ).toBeUndefined();
    });

    it('preserves deeply nested reference errors and selectors', async () => {
        const address = object({ city: string().minLength(1) }).schemaName(
            'Address'
        );
        const user = object({ address: address.optional() }).schemaName('User');
        const root = object({ user: user.optional().describe('User') });
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
        const ref = target;
        expect(ref.parse(undefined)).toBe(2);
        expect(ref.optional().parse(undefined)).toBe(2);
        expect(ref.optional().default(4).parse(undefined)).toBe(4);
        expect(ref.default(4).clearDefault().safeParse(undefined).valid).toBe(
            false
        );
        expect(target.parse(undefined)).toBe(2);
        const fallback = vi.fn(() => 8);
        const caught = ref.catch(fallback);
        expect(caught.parse('invalid')).toBe(8);
        expect(await caught.parseAsync('invalid')).toBe(8);
        expect(fallback).toHaveBeenCalledTimes(2);
        expect(ref.optional().catch(undefined).parse({})).toBe(
            number().default(2).optional().catch(undefined).parse({})
        );
    });

    it('keeps local optionality, nullability and required error messages distinct', async () => {
        const ref = string().nullable().optional().schemaName('Text');
        expect(ref.parse(null)).toBeNull();
        // Preserve the existing optional-null behavior, not wrapper semantics.
        expect(ref.notNullable().parse(null)).toBeNull();
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
        const ref = target.optional();
        expect(() => ref.parse(' text ')).toThrow(/validateAsync/);
        expect(await ref.parseAsync(' text ')).toBe('text');
        expect(await ref['~standard'].validate(' text ')).toEqual({
            value: 'text'
        });
        const local = number()
            .schemaName('Count')
            .addPreprocessor(v => v + 1)
            .addValidator(v => ({ valid: v < 5 }));
        expect(local.parse(2)).toBe(3);
        expect(local.safeParse(5).valid).toBe(false);
        expect(
            string()
                .schemaName('OptionalText')
                .optional()
                .addPreprocessor(() => undefined)
                .parse('text')
        ).toBeUndefined();
    });

    it('retains existing hasType behavior without changing runtime validation', () => {
        const ref = number().schemaName('Count').hasType<string>();
        expect(ref.parse(3)).toBe(3);
        expect(ref.safeParse('three').valid).toBe(false);
        expect(ref.clearHasType().parse(4)).toBe(4);
    });
});

describe('named schema derivation policy', () => {
    it('uses the same naming policy for every concrete builder', () => {
        const builders = [
            core.any(),
            core.array(core.string()),
            core.boolean(),
            core.date(),
            core.extern(core.string()),
            core.func(),
            core.generic(s => core.object({ value: s })),
            core.intersection(
                core.object({ a: core.string() }),
                core.object({ b: core.number() })
            ),
            core.lazy(() => core.string()),
            core.nul(),
            core.number(),
            core.object({ name: core.string() }),
            core.parseString(
                core.object({ id: core.number() }),
                t => t`/users/${p => p.id}`
            ),
            core.promise(core.string()),
            core.record(core.string()),
            core.string(),
            core.tuple([core.string()]),
            core.union([core.string(), core.number()])
        ];
        for (const builder of builders) {
            const named = builder.schemaName('Definition');
            const alias = named.optional().nullable().describe('Use');
            expect(Object.getPrototypeOf(alias)).toBe(
                Object.getPrototypeOf(named)
            );
            expect(alias.introspect().referenceTarget).toBe(named);
            expect(alias.introspect().schemaName).toBe('Definition');
            expect(
                alias.hasType().clearHasType().introspect().referenceTarget
            ).toBe(named);
            const detached = alias.withExtension('custom', true);
            expect(detached.introspect().schemaName).toBeUndefined();
            expect(detached.introspect().referenceTarget).toBeUndefined();
        }
    });

    it('preserves canonical identity through all use-site and type-only modifiers', () => {
        const user = object({ name: string() }).schemaName('User');
        const variants = [
            user.optional(),
            user.required(),
            user.nullable(),
            user.notNullable(),
            user.describe('Use'),
            user.example({ name: 'Ada' }),
            user.readonly(),
            user.brand<'User'>(),
            user.hasType<{ name: string }>(),
            user.clearHasType(),
            user.optimize(),
            user
                .optional()
                .nullable()
                .required()
                .notNullable()
                .describe('Chained')
        ];
        for (const variant of variants) {
            expect(variant.introspect().schemaName).toBe('User');
            expect(variant.introspect().referenceTarget).toBe(user);
        }
        expect(user.introspect().referenceTarget).toBeUndefined();
        expect(user.introspect().description).toBeUndefined();
    });

    it('detaches structural mutations and never reconnects them', () => {
        const child = string().schemaName('Name');
        const user = object({ name: child, age: number() }).schemaName('User');
        const variants = [
            user.addProp('active', boolean()),
            user.addProps({ active: boolean() }),
            user.omit('age'),
            user.pick('name'),
            user.partial(),
            user.deepPartial(),
            user.modifyPropSchema('name', s => s.optional()),
            user.makePropOptional('age'),
            user.makePropRequired('age'),
            user.makeAllPropsOptional(),
            user.makeAllPropsRequired(),
            user.acceptUnknownProps(),
            user.notAcceptUnknownProps(),
            user.optional().addProp('active', boolean())
        ];
        for (const variant of variants) {
            expect(variant.introspect().schemaName).toBeUndefined();
            expect(variant.introspect().referenceTarget).toBeUndefined();
            expect(
                variant.optional().describe('Use').introspect().referenceTarget
            ).toBeUndefined();
        }
        expect(user.omit('age').introspect().properties.name).toBe(child);
        expect(Object.keys(user.introspect().properties)).toEqual([
            'name',
            'age'
        ]);
    });

    it('detaches rules, callbacks, defaults, fallbacks and extension changes including clear methods', () => {
        const name = string().schemaName('Name').optional();
        const variants = [
            name.minLength(1),
            name.maxLength(2),
            name.clearMinLength(),
            name.clearMaxLength(),
            name.addValidator(() => ({ valid: true })),
            name.clearValidators(),
            name.addPreprocessor(v => v),
            name.clearPreprocessors(),
            name.default('Ada'),
            name.clearDefault(),
            name.catch(undefined),
            name.withExtension('custom', true),
            name.email(),
            number().schemaName('Count').min(0),
            boolean().schemaName('Flag').equals(true),
            array(string()).schemaName('Names').minLength(1),
            array(string()).schemaName('Names').maxLength(2),
            array(string()).schemaName('Names').of(number()),
            array(string()).schemaName('Names').clearOf(),
            tuple([string()]).schemaName('Tuple').rest(number()),
            tuple([string()]).schemaName('Tuple').clearRest()
        ];
        for (const variant of variants) {
            expect(variant.introspect().schemaName).toBeUndefined();
            expect(variant.introspect().referenceTarget).toBeUndefined();
        }
        expect(name.minLength(1).email).toBeTypeOf('function');
        expect(
            array(string()).schemaName('Names').minLength(1).nonempty
        ).toBeTypeOf('function');
    });

    it('explicit naming establishes a new independent definition', () => {
        const original = object({ name: string() }).schemaName('User');
        const renamed = original
            .optional()
            .describe('Alias')
            .schemaName('MaybeUser');
        expect(renamed.introspect().referenceTarget).toBeUndefined();
        expect(renamed.required().introspect().referenceTarget).toBe(renamed);
        const extended = original
            .addProp('id', number())
            .schemaName('UserWithId');
        expect(extended.optional().introspect().referenceTarget).toBe(extended);
        expect(original.introspect().schemaName).toBe('User');
    });

    it('keeps named and unnamed runtime behavior identical including async callbacks', async () => {
        const plain = string().addPreprocessor(async value => value?.trim());
        const named = plain.schemaName('Text');
        for (const value of [undefined, null, '', ' a ']) {
            expect(await named.optional().validateAsync(value)).toEqual(
                await plain.optional().validateAsync(value)
            );
            expect(
                await named.required().nullable().validateAsync(value)
            ).toEqual(await plain.required().nullable().validateAsync(value));
        }
    });
});
