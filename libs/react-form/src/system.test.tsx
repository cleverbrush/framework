import { boolean, object, string } from '@cleverbrush/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Field, FormSystemProvider, useSchemaForm } from './index.js';
import { createFormSystem, defineFieldRenderer } from './system.js';

afterEach(cleanup);
const text = defineFieldRenderer<string, { id: string }>(props => (
    <input
        aria-label={props.fieldProps?.id}
        value={props.value ?? ''}
        onChange={event => props.onChange(event.target.value)}
    />
));
const base = createFormSystem({ renderers: { string: text } });
const extended = createFormSystem({
    renderers: {
        ...base.renderers,
        'string:select': defineFieldRenderer<string, { options: string[] }>(
            props => (
                <select
                    aria-label="Choice"
                    value={props.value ?? ''}
                    onChange={event => props.onChange(event.target.value)}
                >
                    <option value="">Choose</option>
                    {props.fieldProps?.options.map(value => (
                        <option key={value}>{value}</option>
                    ))}
                </select>
            )
        ),
        boolean: defineFieldRenderer<boolean>(props => (
            <input
                aria-label="Active"
                type="checkbox"
                checked={props.value ?? false}
                onChange={event => props.onChange(event.target.checked)}
            />
        ))
    }
});

test('typed registries pass custom props and synchronize controls without a provider', () => {
    function Demo() {
        const form = useSchemaForm(
            object({ name: string(), choice: string(), active: boolean() })
        );
        return (
            <>
                <base.Field
                    form={form}
                    forProperty={t => t.name}
                    fieldProps={{ id: 'Name' }}
                />
                <extended.Field
                    form={form}
                    forProperty={t => t.choice}
                    variant="select"
                    fieldProps={{ options: ['one', 'two'] }}
                />
                <extended.Field form={form} forProperty={t => t.active} />
                <button
                    type="button"
                    onClick={() =>
                        form.reset({ name: 'Ada', choice: 'two', active: true })
                    }
                >
                    Reset
                </button>
            </>
        );
    }
    render(<Demo />);
    fireEvent.click(screen.getByText('Reset'));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
        'Ada'
    );
    expect((screen.getByLabelText('Choice') as HTMLSelectElement).value).toBe(
        'two'
    );
    expect((screen.getByLabelText('Active') as HTMLInputElement).checked).toBe(
        true
    );
});

test('Provider supports legacy nesting without overriding a typed Field contract', () => {
    function Demo() {
        const form = useSchemaForm(object({ name: string() }));
        return (
            <base.Provider>
                <Field
                    form={form}
                    forProperty={t => t.name}
                    fieldProps={{ id: 'Legacy' }}
                />
                <FormSystemProvider
                    renderers={{
                        string: () => <span>Inner legacy renderer</span>
                    }}
                >
                    <Field form={form} forProperty={t => t.name} />
                    <base.Field
                        form={form}
                        forProperty={t => t.name}
                        fieldProps={{ id: 'Typed' }}
                    />
                </FormSystemProvider>
            </base.Provider>
        );
    }
    render(<Demo />);
    expect(screen.getByLabelText('Legacy')).toBeTruthy();
    expect(screen.getByText('Inner legacy renderer')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Typed'), {
        target: { value: 'shared' }
    });
    expect((screen.getByLabelText('Legacy') as HTMLInputElement).value).toBe(
        'shared'
    );
});
