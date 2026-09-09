import {
    array,
    boolean,
    date,
    enumOf,
    number,
    object,
    string
} from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import {
    createFormSystem,
    defineFieldRenderer,
    Field,
    type FieldRenderProps,
    FormProvider,
    useField,
    useSchemaForm
} from './index.js';

const nameSchema = string().default('Untitled');
const schema = object({
    name: nameSchema,
    kind: enumOf('normal', 'offset').optional().default('normal'),
    active: boolean().default(true),
    count: number().default(1),
    tags: array(string()).default(() => []),
    when: date().default(() => new Date()),
    optional: string().optional(),
    nullable: string().nullable().default('Fallback')
});
const system = createFormSystem({
    renderers: {
        string: defineFieldRenderer<string>(() => null),
        'string:select': defineFieldRenderer<
            string,
            { onSelect?: (value: string) => void }
        >(() => null),
        'number:select': defineFieldRenderer<
            number,
            { onSelect?: (value: number) => void }
        >(() => null),
        boolean: defineFieldRenderer<boolean>(() => null),
        array: defineFieldRenderer<string[]>(() => null),
        date: defineFieldRenderer<Date>(() => null),
        'string:nullable': defineFieldRenderer<string | null>(() => null)
    }
});

test('defaulted properties retain their values in headless and rendered fields', () => {
    const form = useSchemaForm(schema);
    const name = form.useField(t => t.name);
    const kind = form.useField(t => t.kind);
    const active = form.useField(t => t.active);
    const count = form.useField(t => t.count);
    const tags = form.useField(t => t.tags);
    const when = form.useField(t => t.when);
    const optional = form.useField(t => t.optional);
    const nullable = form.useField(t => t.nullable);
    expectTypeOf(name.value).toEqualTypeOf<string | undefined>();
    expectTypeOf(kind.value).toEqualTypeOf<'normal' | 'offset' | undefined>();
    expectTypeOf(active.value).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(count.value).toEqualTypeOf<number | undefined>();
    expectTypeOf(tags.value).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(when.value).toEqualTypeOf<Date | undefined>();
    expectTypeOf(optional.value).toEqualTypeOf<string | undefined>();
    expectTypeOf(nullable.value).toEqualTypeOf<string | null | undefined>();
    name.setValue('New');
    kind.setValue('offset');
    active.setValue(false);
    tags.setValue(['new']);
    nullable.setValue(null);
    // @ts-expect-error defaults must not erase the property's value type
    name.setValue(1);
    // @ts-expect-error enum remains narrow
    kind.setValue('invalid');
    // @ts-expect-error array element types remain checked
    tags.setValue([1]);
    // @ts-expect-error default does not make a non-nullable string nullable
    name.setValue(null);
    <system.Field form={form} forProperty={t => t.name} />;
    <system.Field form={form} forProperty={t => t.active} />;
    <system.Field form={form} forProperty={t => t.tags} />;
    <system.Field form={form} forProperty={t => t.when} />;
    <system.Field form={form} forProperty={t => t.kind} />;
    <system.Field
        form={form}
        forProperty={t => t.nullable}
        variant="nullable"
    />;
    // @ts-expect-error nullable default requires a nullable renderer
    <system.Field form={form} forProperty={t => t.nullable} />;
    // @ts-expect-error numeric field cannot use a string variant
    <system.Field form={form} forProperty={t => t.count} variant="nullable" />;
    <FormProvider form={form}>
        <Field form={form} forProperty={t => t.name} />
    </FormProvider>;
    useField<typeof schema>(t => t.name);
    const contextField = useField<typeof schema, typeof nameSchema>(
        t => t.name
    );
    expectTypeOf(contextField.value).toEqualTypeOf<string | undefined>();
    form.handleSubmit(values => {
        expectTypeOf(values.name).toEqualTypeOf<string>();
        expectTypeOf(values.tags).toEqualTypeOf<string[]>();
        expectTypeOf(values.active).toEqualTypeOf<boolean>();
    });
    const rendererSchema: FieldRenderProps<string>['schema'] = nameSchema;
    expectTypeOf(rendererSchema).not.toBeNever();
});

test('same-name variants check explicitly typed callbacks against the selected property', () => {
    const form = useSchemaForm(schema);
    <system.Field
        form={form}
        forProperty={t => t.name}
        variant="select"
        fieldProps={{
            onSelect: (value: string) => {
                expectTypeOf(value).toEqualTypeOf<string>();
            }
        }}
    />;
    <system.Field
        form={form}
        forProperty={t => t.count}
        variant="select"
        fieldProps={{
            onSelect: (value: number) => {
                expectTypeOf(value).toEqualTypeOf<number>();
            }
        }}
    />;
    <system.Field
        form={form}
        forProperty={t => t.name}
        variant="select"
        // @ts-expect-error callbacks must match the selected renderer's props
        fieldProps={{ onSelect: (_value: number) => {} }}
    />;
});
