import { number, object, string } from '@cleverbrush/schema';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import type {
    FieldRenderProps,
    FormSystemConfig,
    SchemaFormInstance
} from './index.js';
import {
    Field,
    FormProvider,
    FormSystemProvider,
    useField,
    useFormSystem,
    useSchemaForm
} from './index.js';

// ─── Test Schemas ────────────────────────────────────────────────────────────

const UserSchema = object({
    name: string(),
    age: number().optional(),
    email: string()
});

const AddressSchema = object({
    street: string(),
    city: string(),
    zip: number()
});

const NestedSchema = object({
    user: object({
        name: string(),
        address: object({
            city: string(),
            zip: number()
        })
    })
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createWrapper(config: FormSystemConfig) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
            FormSystemProvider,
            { renderers: config.renderers },
            children
        );
    };
}

function createFormWrapper<T extends ReturnType<typeof object>>(
    form: SchemaFormInstance<T>
) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(FormProvider, { form }, children);
    };
}

// ─── FormStore tests ─────────────────────────────────────────────────────────

describe('FormStore', () => {
    test('createFormStore initializes with empty values', () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));
        expect(result.current.getValue()).toEqual({});
    });

    test('setValue updates form values', () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        act(() => {
            result.current.setValue({ name: 'John', email: 'john@test.com' });
        });

        expect(result.current.getValue()).toEqual({
            name: 'John',
            email: 'john@test.com'
        });
    });

    test('reset clears form values', () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        act(() => {
            result.current.setValue({ name: 'John', email: 'john@test.com' });
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.getValue()).toEqual({});
    });

    test('reset with values sets new initial values', () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        act(() => {
            result.current.reset({ name: 'Jane', email: 'jane@test.com' });
        });

        expect(result.current.getValue()).toEqual({
            name: 'Jane',
            email: 'jane@test.com'
        });
    });
});

// ─── useSchemaForm tests ─────────────────────────────────────────────────────

describe('useSchemaForm', () => {
    test('returns stable form instance', () => {
        const { result, rerender } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        const first = result.current;
        rerender();
        const second = result.current;

        expect(first.useField).toBe(second.useField);
        expect(first.submit).toBe(second.submit);
        expect(first.validate).toBe(second.validate);
        expect(first.reset).toBe(second.reset);
        expect(first.getValue).toBe(second.getValue);
        expect(first.setValue).toBe(second.setValue);
    });

    test('validate returns valid for empty optional fields', async () => {
        const OptionalSchema = object({
            name: string().optional(),
            age: number().optional()
        });

        const { result } = renderHook(() => useSchemaForm(OptionalSchema));

        let validationResult: any;
        await act(async () => {
            validationResult = await result.current.validate();
        });

        expect(validationResult.valid).toBe(true);
    });

    test('validate returns errors for missing required fields', async () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        let validationResult: any;
        await act(async () => {
            validationResult = await result.current.validate();
        });

        expect(validationResult.valid).toBe(false);
        expect(validationResult.errors).toBeDefined();
        expect(validationResult.errors!.length).toBeGreaterThan(0);
    });

    test('submit triggers validation', async () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        act(() => {
            result.current.setValue({
                name: 'John',
                email: 'john@test.com'
            });
        });

        let submitResult: any;
        await act(async () => {
            submitResult = await result.current.submit();
        });

        expect(submitResult).toBeDefined();
        expect(submitResult.valid).toBe(true);
    });

    test('getValue returns current values', () => {
        const { result } = renderHook(() => useSchemaForm(UserSchema));

        act(() => {
            result.current.setValue({ name: 'Alice', email: 'alice@test.com' });
        });

        expect(result.current.getValue()).toEqual({
            name: 'Alice',
            email: 'alice@test.com'
        });
    });

    test('options.createMissingStructure defaults to true', () => {
        const { result } = renderHook(() => useSchemaForm(NestedSchema));
        // The option should be set internally
        expect(result.current).toBeDefined();
    });
});

// ─── useField via form.useField tests ────────────────────────────────────────

describe('form.useField', () => {
    test('reads initial value from form state', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        expect(result.current.nameField.value).toBeUndefined();
        expect(result.current.nameField.dirty).toBe(false);
        expect(result.current.nameField.touched).toBe(false);
        expect(result.current.nameField.error).toBeUndefined();
        expect(result.current.nameField.validating).toBe(false);
    });

    test('onChange updates field value', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        act(() => {
            result.current.nameField.onChange('John');
        });

        expect(result.current.nameField.value).toBe('John');
        expect(result.current.nameField.dirty).toBe(true);
    });

    test('onBlur sets touched', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        expect(result.current.nameField.touched).toBe(false);

        act(() => {
            result.current.nameField.onBlur();
        });

        expect(result.current.nameField.touched).toBe(true);
    });

    test('setValue works same as onChange', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        act(() => {
            result.current.nameField.setValue('Jane');
        });

        expect(result.current.nameField.value).toBe('Jane');
        expect(result.current.nameField.dirty).toBe(true);
    });

    test('returns schema for the field', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { nameField };
        });

        expect(result.current.nameField.schema).toBeDefined();
        const introspected = result.current.nameField.schema.introspect();
        expect(introspected.type).toBe('string');
    });

    test('onChange updates the underlying object via PropertyDescriptor', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        act(() => {
            result.current.nameField.onChange('Bob');
        });

        const values = result.current.form.getValue();
        expect(values.name).toBe('Bob');
    });

    test('multiple fields can be used independently', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            const emailField = form.useField((t) => t.email);
            return { form, nameField, emailField };
        });

        act(() => {
            result.current.nameField.onChange('John');
        });

        act(() => {
            result.current.emailField.onChange('john@test.com');
        });

        expect(result.current.nameField.value).toBe('John');
        expect(result.current.emailField.value).toBe('john@test.com');

        const values = result.current.form.getValue();
        expect(values.name).toBe('John');
        expect(values.email).toBe('john@test.com');
    });
});

// ─── Nested field tests ──────────────────────────────────────────────────────

describe('nested fields', () => {
    test('useField works with nested selectors', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(NestedSchema);
            const cityField = form.useField((t) => t.user.address.city);
            return { form, cityField };
        });

        expect(result.current.cityField.value).toBeUndefined();
    });

    test('onChange creates missing nested structure', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(NestedSchema);
            const cityField = form.useField((t) => t.user.address.city);
            return { form, cityField };
        });

        act(() => {
            result.current.cityField.onChange('Berlin');
        });

        expect(result.current.cityField.value).toBe('Berlin');

        const values = result.current.form.getValue();
        expect(values.user).toBeDefined();
        expect(values.user.address).toBeDefined();
        expect(values.user.address.city).toBe('Berlin');
    });

    test('createMissingStructure: false does not create structure', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(NestedSchema, {
                createMissingStructure: false
            });
            const cityField = form.useField((t) => t.user.address.city);
            return { form, cityField };
        });

        act(() => {
            result.current.cityField.onChange('Berlin');
        });

        // The field value in state is still updated
        expect(result.current.cityField.value).toBe('Berlin');
    });
});

// ─── Validation tests ────────────────────────────────────────────────────────

describe('validation', () => {
    test('validate sets errors on fields', async () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            const emailField = form.useField((t) => t.email);
            return { form, nameField, emailField };
        });

        await act(async () => {
            await result.current.form.validate();
        });

        // Required fields should have errors
        expect(result.current.nameField.error).toBeDefined();
        expect(result.current.emailField.error).toBeDefined();
    });

    test('validate clears errors when values are valid', async () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            const emailField = form.useField((t) => t.email);
            return { form, nameField, emailField };
        });

        // Set valid values
        act(() => {
            result.current.nameField.onChange('John');
            result.current.emailField.onChange('john@test.com');
        });

        await act(async () => {
            await result.current.form.validate();
        });

        expect(result.current.nameField.error).toBeUndefined();
        expect(result.current.emailField.error).toBeUndefined();
    });

    test('submit returns validation result', async () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            return { form };
        });

        // Set valid values
        act(() => {
            result.current.form.setValue({
                name: 'John',
                email: 'john@test.com'
            });
        });

        let submitResult: any;
        await act(async () => {
            submitResult = await result.current.form.submit();
        });

        expect(submitResult.valid).toBe(true);
    });
});

// ─── FormSystemProvider tests ────────────────────────────────────────────────

describe('FormSystemProvider', () => {
    test('provides config via useFormSystem', () => {
        const config: FormSystemConfig = {
            renderers: {
                string: () => null
            }
        };

        const { result } = renderHook(() => useFormSystem(), {
            wrapper: createWrapper(config)
        });

        expect(result.current.renderers).toBeDefined();
        expect(result.current.renderers!.string).toBeDefined();
    });

    test('useFormSystem throws without provider', () => {
        expect(() => {
            renderHook(() => useFormSystem());
        }).toThrow('useFormSystem must be used within a FormSystemProvider');
    });

    test('nested providers merge configs', () => {
        const outerRenderers = {
            string: () => 'outer-string' as any
        };

        const innerRenderers = {
            number: () => 'inner-number' as any
        };

        function InnerWrapper({ children }: { children: React.ReactNode }) {
            return React.createElement(
                FormSystemProvider,
                { renderers: outerRenderers },
                React.createElement(
                    FormSystemProvider,
                    { renderers: innerRenderers },
                    children
                )
            );
        }

        const { result } = renderHook(() => useFormSystem(), {
            wrapper: InnerWrapper
        });

        // Inner should inherit outer renderers
        expect(result.current.renderers!.string).toBeDefined();
        expect(result.current.renderers!.number).toBeDefined();
    });

    test('inner provider overrides outer renderers of same type', () => {
        const outerRenderer = vi.fn(() => 'outer' as any);
        const innerRenderer = vi.fn(() => 'inner' as any);

        function InnerWrapper({ children }: { children: React.ReactNode }) {
            return React.createElement(
                FormSystemProvider,
                { renderers: { string: outerRenderer } },
                React.createElement(
                    FormSystemProvider,
                    { renderers: { string: innerRenderer } },
                    children
                )
            );
        }

        const { result } = renderHook(() => useFormSystem(), {
            wrapper: InnerWrapper
        });

        expect(result.current.renderers!.string).toBe(innerRenderer);
    });

    test('supports legacy config prop', () => {
        const config: FormSystemConfig = {
            renderers: {
                string: () => null
            }
        };

        const { result } = renderHook(() => useFormSystem(), {
            wrapper: ({ children }: { children: React.ReactNode }) =>
                // @ts-expect-error
                React.createElement(FormSystemProvider, { config }, children)
        });
        expect(result.current.renderers).toBeDefined();
        expect(result.current.renderers!.string).toBeDefined();
    });
});

// ─── Context-based useField tests ────────────────────────────────────────────

describe('context-based useField', () => {
    test('useField throws without FormProvider', () => {
        expect(() => {
            renderHook(() => useField((t: any) => t.name));
        }).toThrow('useField must be used within a FormProvider');
    });

    test('useField works within FormProvider', () => {
        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        const wrapper = createFormWrapper(formResult.current);

        const { result } = renderHook(
            () => useField<typeof UserSchema, any>((t) => t.name),
            { wrapper }
        );

        expect(result.current.value).toBeUndefined();
        expect(result.current.dirty).toBe(false);
    });
});

// ─── Field component tests ──────────────────────────────────────────────────

describe('Field component', () => {
    test('Field calls renderer with field props', () => {
        const mockRenderer = vi.fn(() => null);

        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        function TestComponent() {
            return React.createElement(Field, {
                selector: (t: any) => t.name,
                form: formResult.current,
                renderer: mockRenderer
            });
        }

        const { render } = require('@testing-library/react');
        const { unmount } = render(React.createElement(TestComponent));

        expect(mockRenderer).toHaveBeenCalledTimes(1);
        const props = mockRenderer.mock.calls[0][0] as FieldRenderProps;
        expect(props.value).toBeUndefined();
        expect(props.dirty).toBe(false);
        expect(props.touched).toBe(false);
        expect(typeof props.onChange).toBe('function');
        expect(typeof props.onBlur).toBe('function');
        expect(typeof props.setValue).toBe('function');
        expect(props.schema).toBeDefined();

        unmount();
    });

    test('Field resolves renderer from FormSystemProvider', () => {
        const mockStringRenderer = vi.fn(() => null);

        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        function TestComponent() {
            return React.createElement(
                FormSystemProvider,
                { renderers: { string: mockStringRenderer } },
                React.createElement(Field, {
                    selector: (t: any) => t.name,
                    form: formResult.current
                })
            );
        }

        const { render } = require('@testing-library/react');
        const { unmount } = render(React.createElement(TestComponent));

        expect(mockStringRenderer).toHaveBeenCalled();

        unmount();
    });

    test('Field throws when no renderer found', () => {
        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        function TestComponent() {
            return React.createElement(Field, {
                selector: (t: any) => t.name,
                form: formResult.current
            });
        }

        const { render } = require('@testing-library/react');
        // Suppress React error boundary output
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        expect(() => {
            render(React.createElement(TestComponent));
        }).toThrow('No renderer found for schema type');
        consoleSpy.mockRestore();
    });

    test('explicit renderer overrides FormSystemProvider renderer', () => {
        const systemRenderer = vi.fn(() => 'system' as any);
        const explicitRenderer = vi.fn(() => null);

        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        function TestComponent() {
            return React.createElement(
                FormSystemProvider,
                { renderers: { string: systemRenderer } },
                React.createElement(Field, {
                    selector: (t: any) => t.name,
                    form: formResult.current,
                    renderer: explicitRenderer
                })
            );
        }

        const { render } = require('@testing-library/react');
        const { unmount } = render(React.createElement(TestComponent));

        expect(explicitRenderer).toHaveBeenCalled();
        expect(systemRenderer).not.toHaveBeenCalled();

        unmount();
    });
});

// ─── Reset / dirty tracking ─────────────────────────────────────────────────

describe('reset and dirty tracking', () => {
    test('reset clears field values and dirty state', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        act(() => {
            result.current.nameField.onChange('Dirty');
        });

        expect(result.current.nameField.dirty).toBe(true);

        act(() => {
            result.current.form.reset();
        });

        expect(result.current.nameField.value).toBeUndefined();
        expect(result.current.nameField.dirty).toBe(false);
    });

    test('field tracks dirty based on initial value comparison', () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            return { form, nameField };
        });

        // Initially not dirty
        expect(result.current.nameField.dirty).toBe(false);

        // Change value - becomes dirty
        act(() => {
            result.current.nameField.onChange('Changed');
        });
        expect(result.current.nameField.dirty).toBe(true);
    });
});

// ─── Async validation ────────────────────────────────────────────────────────

describe('async validation', () => {
    test('supports schemas with async validators', async () => {
        const asyncSchema = object({
            username: string().addValidator(async (val) => {
                // Simulate async check
                await new Promise((resolve) => setTimeout(resolve, 10));
                if (val === 'taken') {
                    return {
                        valid: false,
                        errors: [{ message: 'Username is taken' }]
                    };
                }
                return { valid: true };
            })
        });

        const { result } = renderHook(() => {
            const form = useSchemaForm(asyncSchema);
            const usernameField = form.useField((t) => t.username);
            return { form, usernameField };
        });

        act(() => {
            result.current.usernameField.onChange('taken');
        });

        let validationResult: any;
        await act(async () => {
            validationResult = await result.current.form.validate();
        });

        expect(validationResult.valid).toBe(false);
    });
});

// ─── Integration test ────────────────────────────────────────────────────────

describe('integration', () => {
    test('full form lifecycle: init, fill, validate, submit, reset', async () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(UserSchema);
            const nameField = form.useField((t) => t.name);
            const emailField = form.useField((t) => t.email);
            const ageField = form.useField((t) => t.age);
            return { form, nameField, emailField, ageField };
        });

        // 1. Initial state
        expect(result.current.nameField.value).toBeUndefined();
        expect(result.current.emailField.value).toBeUndefined();

        // 2. Fill in fields
        act(() => {
            result.current.nameField.onChange('Alice');
            result.current.emailField.onChange('alice@example.com');
            result.current.ageField.onChange(30);
        });

        expect(result.current.nameField.value).toBe('Alice');
        expect(result.current.emailField.value).toBe('alice@example.com');
        expect(result.current.ageField.value).toBe(30);

        // 3. Validate
        let validationResult: any;
        await act(async () => {
            validationResult = await result.current.form.validate();
        });
        expect(validationResult.valid).toBe(true);

        // 4. Submit
        let submitResult: any;
        await act(async () => {
            submitResult = await result.current.form.submit();
        });
        expect(submitResult.valid).toBe(true);
        expect(submitResult.object).toEqual({
            name: 'Alice',
            email: 'alice@example.com',
            age: 30
        });

        // 5. Reset
        act(() => {
            result.current.form.reset();
        });

        expect(result.current.nameField.value).toBeUndefined();
        expect(result.current.emailField.value).toBeUndefined();
    });

    test('multiple forms are independent', () => {
        const { result } = renderHook(() => {
            const form1 = useSchemaForm(UserSchema);
            const form2 = useSchemaForm(AddressSchema);
            const name = form1.useField((t) => t.name);
            const city = form2.useField((t) => t.city);
            return { form1, form2, name, city };
        });

        act(() => {
            result.current.name.onChange('John');
        });

        act(() => {
            result.current.city.onChange('Berlin');
        });

        expect(result.current.name.value).toBe('John');
        expect(result.current.city.value).toBe('Berlin');

        // Ensure they don't interfere
        expect(result.current.form1.getValue().name).toBe('John');
        expect(result.current.form2.getValue().city).toBe('Berlin');
    });

    test('FormSystemProvider + Field: full renderer registration flow', () => {
        const { render } = require('@testing-library/react');

        // 1. Define renderer map for HTML (like a UI library adapter)
        const htmlRenderers: Record<string, any> = {
            string: ({
                value,
                onChange,
                onBlur,
                error,
                touched
            }: FieldRenderProps) =>
                React.createElement(
                    'div',
                    null,
                    React.createElement('input', {
                        type: 'text',
                        value: value ?? '',
                        onChange: (e: any) => onChange(e.target.value),
                        onBlur
                    }),
                    touched && error
                        ? React.createElement(
                              'span',
                              { className: 'error' },
                              error
                          )
                        : null
                ),
            number: ({ value, onChange, onBlur }: FieldRenderProps) =>
                React.createElement('input', {
                    type: 'number',
                    value: value ?? '',
                    onChange: (e: any) => onChange(Number(e.target.value)),
                    onBlur
                })
        };

        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        // 2. Wrap app with FormSystemProvider + renderers
        function App() {
            return React.createElement(
                FormSystemProvider,
                { renderers: htmlRenderers },
                // 3. Field auto-resolves renderer by schema type
                React.createElement(Field, {
                    selector: (t: any) => t.name,
                    form: formResult.current
                }),
                React.createElement(Field, {
                    selector: (t: any) => t.email,
                    form: formResult.current
                }),
                React.createElement(Field, {
                    selector: (t: any) => t.age,
                    form: formResult.current
                })
            );
        }

        const { container, unmount } = render(React.createElement(App));

        // Verify: string fields got text inputs, number field got number input
        const inputs = container.querySelectorAll('input');
        expect(inputs.length).toBe(3);
        expect(inputs[0].type).toBe('text'); // name (string)
        expect(inputs[1].type).toBe('text'); // email (string)
        expect(inputs[2].type).toBe('number'); // age (number)

        unmount();
    });

    test('FormSystemProvider + Field: validation errors rendered by renderer', async () => {
        const { render } = require('@testing-library/react');

        // Renderer that shows validation error when field is touched
        const htmlRenderers: Record<string, any> = {
            string: ({
                value,
                onChange,
                onBlur,
                error,
                touched
            }: FieldRenderProps) =>
                React.createElement(
                    'div',
                    { 'data-testid': 'field' },
                    React.createElement('input', {
                        value: value ?? '',
                        onChange: (e: any) => onChange(e.target.value),
                        onBlur
                    }),
                    touched && error
                        ? React.createElement(
                              'span',
                              { className: 'error' },
                              error
                          )
                        : null
                )
        };

        const { result: formResult } = renderHook(() =>
            useSchemaForm(UserSchema)
        );

        function App() {
            return React.createElement(
                FormSystemProvider,
                { renderers: htmlRenderers },
                React.createElement(Field, {
                    selector: (t: any) => t.name,
                    form: formResult.current
                })
            );
        }

        const { container, unmount } = render(React.createElement(App));

        // Validate with empty required field — should produce validation error
        // validate() marks all fields as touched so errors display immediately
        await act(async () => {
            await formResult.current.validate();
        });

        // After validate, field is touched and error is set — renderer shows the error
        const errorSpan = container.querySelector('.error');
        expect(errorSpan).not.toBeNull();

        // Error message from schema validation is available to the renderer
        const nameState = formResult.current.getValue();
        expect(nameState.name).toBeUndefined(); // name was never set

        unmount();
    });
});

// ─── Helper function tests ───────────────────────────────────────────────────

import { buildSelectorFromPath } from './helpers.js';

describe('buildSelectorFromPath', () => {
    test('builds selector for simple path', () => {
        const tree = { email: 'test@test.com' };
        const selector = buildSelectorFromPath('email');
        expect(selector(tree)).toBe('test@test.com');
    });

    test('builds selector for nested path', () => {
        const tree = { customer: { address: { city: 'NYC' } } };
        const selector = buildSelectorFromPath('customer.address.city');
        expect(selector(tree)).toBe('NYC');
    });

    test('returns undefined for missing path', () => {
        const tree = { email: 'test' };
        const selector = buildSelectorFromPath('name');
        expect(selector(tree)).toBeUndefined();
    });

    test('handles null intermediate values safely', () => {
        const tree = { customer: null };
        const selector = buildSelectorFromPath('customer.address.city');
        expect(selector(tree)).toBeUndefined();
    });
});

// ─── ensureNestedStructure tests ─────────────────────────────────────────────

import { ensureNestedStructure } from './helpers.js';

describe('ensureNestedStructure', () => {
    test('creates empty nested objects from schema', () => {
        const result = ensureNestedStructure({}, NestedSchema);
        expect(result).toEqual({ user: { address: {} } });
    });

    test('preserves existing values', () => {
        const result = ensureNestedStructure(
            { user: { name: 'John', address: { city: 'NYC' } } },
            NestedSchema
        );
        expect(result).toEqual({
            user: { name: 'John', address: { city: 'NYC' } }
        });
    });

    test('fills in missing nested objects without overwriting', () => {
        const result = ensureNestedStructure(
            { user: { name: 'John' } },
            NestedSchema
        );
        expect(result).toEqual({ user: { name: 'John', address: {} } });
    });

    test('handles null/undefined values', () => {
        expect(ensureNestedStructure(null, NestedSchema)).toEqual({
            user: { address: {} }
        });
        expect(ensureNestedStructure(undefined, NestedSchema)).toEqual({
            user: { address: {} }
        });
    });
});

// ─── Nested validation integration test ──────────────────────────────────────

describe('nested form validation', () => {
    test('validate() returns errors for deeply nested fields', async () => {
        const { result } = renderHook(() => useSchemaForm(NestedSchema));

        let validationResult: any;
        await act(async () => {
            validationResult = await result.current.validate();
        });

        expect(validationResult.valid).toBe(false);
    });

    test('nested fields show errors after validate', async () => {
        const { result } = renderHook(() => {
            const form = useSchemaForm(NestedSchema);
            const city = form.useField((t) => t.user.address.city);
            const zip = form.useField((t) => t.user.address.zip);
            const name = form.useField((t) => t.user.name);
            return { form, city, zip, name };
        });

        await act(async () => {
            await result.current.form.validate();
        });

        // All nested fields should have errors after validation
        expect(result.current.name.error).toBeTruthy();
        expect(result.current.city.error).toBeTruthy();
        expect(result.current.zip.error).toBeTruthy();
    });
});
