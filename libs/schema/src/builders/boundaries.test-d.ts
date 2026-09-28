import { expectTypeOf, test } from 'vitest';
import {
    array,
    decode,
    type InferInput,
    type InferOutput,
    type InferType,
    intersection,
    lazy,
    number,
    object,
    record,
    schemaRef,
    string,
    tuple,
    union
} from '../index.js';

test('input/output inference composes without changing InferType', () => {
    const size = decode(string(), number(), Number);
    expectTypeOf<InferInput<typeof size>>().toEqualTypeOf<string>();
    expectTypeOf<InferOutput<typeof size>>().toEqualTypeOf<number>();
    expectTypeOf<InferType<typeof size>>().toEqualTypeOf<number>();
    expectTypeOf(size.parse('1')).toEqualTypeOf<number>();
    const form = object({ size, title: string().default('untitled') });
    expectTypeOf<InferInput<typeof form>>().toMatchTypeOf<{
        size: string;
        title?: string;
    }>();
    expectTypeOf<{ size: string }>().toMatchTypeOf<InferInput<typeof form>>();
    expectTypeOf<InferOutput<typeof form>>().toMatchTypeOf<{
        size: number;
        title: string;
    }>();
    const list = array(size);
    expectTypeOf<InferInput<typeof list>>().toEqualTypeOf<string[]>();
    expectTypeOf<InferOutput<typeof list>>().toEqualTypeOf<number[]>();
    const pair = tuple([size, string()]);
    expectTypeOf<InferInput<typeof pair>>().toEqualTypeOf<[string, string]>();
    const dictionary = record(string(), size);
    expectTypeOf<InferInput<typeof dictionary>>().toEqualTypeOf<
        Record<string, string>
    >();
    const choice = union(size).or(string());
    expectTypeOf<InferInput<typeof choice>>().toEqualTypeOf<string>();
    const joined = intersection(object({ size }), object({ title: string() }));
    expectTypeOf<InferInput<typeof joined>>().toMatchTypeOf<{
        size: string;
        title: string;
    }>();
    const ref = schemaRef(form.schemaName('Form'));
    expectTypeOf<InferInput<typeof ref>>().toEqualTypeOf<
        InferInput<typeof form>
    >();
    const deferred = lazy(() => size);
    expectTypeOf<InferInput<typeof deferred>>().toEqualTypeOf<string>();
    // @ts-expect-error required schemas cannot fall back to undefined
    string().catch(undefined);
    // @ts-expect-error non-nullable schemas cannot fall back to null
    string().catch(null);
    // @ts-expect-error converter must return the output schema's input
    decode(string(), number(), value => value);
    string().optional().catch(undefined);
    string()
        .nullable()
        .catch(() => null);
    string()
        .optional()
        .addPreprocessor(() => undefined);
});

test('boundary presence belongs to each side independently', () => {
    const nullableOutput = decode(string(), number().nullable(), () => null);
    expectTypeOf<InferInput<typeof nullableOutput>>().toEqualTypeOf<string>();
    expectTypeOf<InferOutput<typeof nullableOutput>>().toEqualTypeOf<
        number | null
    >();
    const nullableInput = decode(string().nullable(), number(), value =>
        value === null ? 0 : Number(value)
    );
    expectTypeOf<InferInput<typeof nullableInput>>().toEqualTypeOf<
        string | null
    >();
    expectTypeOf<InferOutput<typeof nullableInput>>().toEqualTypeOf<number>();
    const defaults = object({
        size: decode(string().default('1'), number(), Number)
    });
    expectTypeOf<{}>().toMatchTypeOf<InferInput<typeof defaults>>();
    const optimized = defaults.optimize();
    expectTypeOf<InferInput<typeof optimized>>().toEqualTypeOf<
        InferInput<typeof defaults>
    >();
    const required = nullableInput.optional().required().notNullable();
    expectTypeOf<InferInput<typeof required>>().toEqualTypeOf<string>();
    const ref = schemaRef(object({ name: string() }).schemaName('User'))
        .nullable()
        .optional();
    const root = object({ user: ref });
    root.validate({ user: null }).getErrorsFor(t => t.user.name);
    // @ts-expect-error concrete descriptor trees still reject unknown fields
    root.validate({ user: null }).getErrorsFor(t => t.user.missing);
});
