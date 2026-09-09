import { array, boolean, number, object, string } from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import {
    createFormSystem,
    defineFieldRenderer,
    Field,
    type FieldRenderer,
    type FieldRenderProps,
    useSchemaForm
} from './index.js';

const schema = object({
    name: string(),
    age: number(),
    active: boolean(),
    tags: array(string()),
    optional: string().optional(),
    nullable: string().nullable(),
    nested: object({ name: string() })
});
const system = createFormSystem({
    renderers: {
        string: defineFieldRenderer<string, { placeholder?: string }>(
            () => null
        ),
        'string:select': defineFieldRenderer<
            string,
            {
                options: readonly string[];
                disabled?: boolean;
            }
        >(() => null),
        'boolean:checkbox': defineFieldRenderer<boolean>(() => null),
        'array:tags': defineFieldRenderer<string[], { choices: string[] }>(
            () => null
        ),
        'string:nullable': defineFieldRenderer<string | null>(() => null)
    }
});

test('typed fields preserve schema and renderer props', () => {
    const form = useSchemaForm(schema);
    <system.Field
        form={form}
        forProperty={t => t.name}
        fieldProps={{ placeholder: 'Name' }}
    />;
    <system.Field form={form} forProperty={t => t.optional} />;
    <system.Field form={form} forProperty={t => t.nested.name} />;
    <system.Field
        form={form}
        forProperty={t => t.name}
        variant="select"
        fieldProps={{ options: ['a'] }}
    />;
    <system.Field form={form} forProperty={t => t.active} variant="checkbox" />;
    <system.Field
        form={form}
        forProperty={t => t.tags}
        variant="tags"
        fieldProps={{ choices: ['a'] }}
    />;
    <system.Field
        form={form}
        forProperty={t => t.nullable}
        variant="nullable"
    />;
    <system.Field
        form={form}
        forProperty={t => t.name}
        // @ts-expect-error misspelled custom prop
        fieldProps={{ placehoder: 'Name' }}
    />;
    // @ts-expect-error required options missing
    <system.Field form={form} forProperty={t => t.name} variant="select" />;
    <system.Field
        form={form}
        forProperty={t => t.name}
        variant="select"
        // @ts-expect-error options must be strings
        fieldProps={{ options: [1] }}
    />;
    // @ts-expect-error variant does not exist for strings
    <system.Field form={form} forProperty={t => t.name} variant="checkbox" />;
    // @ts-expect-error no numeric renderer registered
    <system.Field form={form} forProperty={t => t.age} />;
    // @ts-expect-error this renderer does not support null
    <system.Field form={form} forProperty={t => t.nullable} />;
    // @ts-expect-error invalid schema property
    <system.Field form={form} forProperty={t => t.missing} />;
});

test('registry extensions and legacy integrations remain supported', () => {
    const extended = createFormSystem({
        renderers: {
            ...system.renderers,
            'number:slider': defineFieldRenderer<number, { min: number }>(
                () => null
            )
        }
    });
    const form = useSchemaForm(schema);
    <extended.Field
        form={form}
        forProperty={t => t.age}
        variant="slider"
        fieldProps={{ min: 0 }}
    />;
    <extended.Field form={form} forProperty={t => t.name} />;
    const legacy: FieldRenderer = (props: FieldRenderProps) => props.value;
    <Field
        form={form}
        forProperty={t => t.name}
        renderer={legacy}
        fieldProps={{ custom: true }}
    />;
});

test('renderer values and submission callbacks infer correctly', () => {
    defineFieldRenderer<number, { step: number }>(props => {
        expectTypeOf(props.value).toEqualTypeOf<number | undefined>();
        expectTypeOf(props.fieldProps).toEqualTypeOf<
            { step: number } | undefined
        >();
        props.onChange(1);
        // @ts-expect-error renderer cannot write strings
        props.onChange('1');
        return null;
    });
    const form = useSchemaForm(schema);
    form.handleSubmit(
        async values => {
            expectTypeOf(values.name).toEqualTypeOf<string>();
            return { ok: true, data: { id: 1 } };
        },
        {
            onSuccess: data => {
                expectTypeOf(data).toEqualTypeOf<{ id: number } | undefined>();
            }
        }
    );
    form.handleSubmit(() => ({ ok: false, error: 'Try again' }));
    form.handleSubmit(() => undefined);
    // @ts-expect-error errors are displayable strings
    form.handleSubmit(() => ({ ok: false, error: 123 }));
    expectTypeOf(form.submitting).toEqualTypeOf<boolean>();
    expectTypeOf(form.error).toEqualTypeOf<string | undefined>();
});
