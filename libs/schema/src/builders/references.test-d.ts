import { expectTypeOf, test } from 'vitest';
import { type InferType, number, object, schemaRef, string } from '../index.js';

test('optional-aware fallback and preprocessing types remain checked', () => {
    // @ts-expect-error required schemas cannot fall back to undefined
    string().catch(undefined);
    // @ts-expect-error non-nullable schemas cannot fall back to null
    string().catch(null);
    string().optional().catch(undefined);
    string()
        .nullable()
        .catch(() => null);
    string()
        .optional()
        .addPreprocessor(() => undefined);
    string()
        .nullable()
        .addPreprocessor(async () => null);
});

test('references preserve inferred types, local modifiers and selectors', () => {
    const user = object({ name: string() }).schemaName('User');
    const ref = schemaRef(user);
    expectTypeOf<InferType<typeof ref>>().toEqualTypeOf<
        InferType<typeof user>
    >();
    const optional = ref.optional().nullable();
    expectTypeOf<InferType<typeof optional>>().toEqualTypeOf<
        InferType<typeof user> | undefined | null
    >();
    const required = optional.required().notNullable();
    expectTypeOf<InferType<typeof required>>().toEqualTypeOf<
        InferType<typeof user>
    >();
    const withDefault = ref.optional().default({ name: 'Ada' });
    expectTypeOf<InferType<typeof withDefault>>().toEqualTypeOf<
        InferType<typeof user>
    >();
    const root = object({ user: optional });
    root.validate({ user: null }).getErrorsFor(t => t.user.name);
    // @ts-expect-error concrete descriptor trees still reject unknown fields
    root.validate({ user: null }).getErrorsFor(t => t.user.missing);
    const override = schemaRef(number().schemaName('Number')).hasType<string>();
    expectTypeOf<InferType<typeof override>>().toEqualTypeOf<string>();
    const cleared = override.clearHasType();
    expectTypeOf<InferType<typeof cleared>>().toEqualTypeOf<number>();
});
