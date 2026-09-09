import { array, boolean, object, string } from '@cleverbrush/schema';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen
} from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FormProvider, useField, useSchemaForm } from './index.js';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});
const schema = object({
    name: string().minLength(1),
    active: boolean(),
    tags: array(string()),
    nested: object({ city: string() })
});
const baseline = {
    name: 'Ada',
    active: true,
    tags: ['a'],
    nested: { city: 'Paris' }
};
function useBoundForm() {
    const form = useSchemaForm(schema);
    return {
        form,
        name: form.useField(t => t.name),
        active: form.useField(t => t.active),
        tags: form.useField(t => t.tags),
        parent: form.useField(t => t.nested),
        city: form.useField(t => t.nested.city)
    };
}
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

describe('synchronized mounted fields', () => {
    test('reset updates values and baselines without remounting', () => {
        const { result } = renderHook(useBoundForm);
        const instance = result.current.form;
        act(() => result.current.form.reset(baseline));
        expect(result.current.form).toBe(instance);
        expect(result.current.name.value).toBe('Ada');
        expect(result.current.name.initialValue).toBe('Ada');
        expect(result.current.active.value).toBe(true);
        expect(result.current.tags.value).toEqual(['a']);
        expect(result.current.city.value).toBe('Paris');
        expect(result.current.city.dirty).toBe(false);
        act(() => {
            result.current.name.onChange('Grace');
            result.current.name.onBlur();
        });
        act(() => result.current.form.reset(baseline));
        expect(result.current.name).toMatchObject({
            value: 'Ada',
            dirty: false,
            touched: false,
            error: undefined
        });
        act(() => result.current.form.reset());
        expect(result.current.form.getValue()).toEqual({});
        expect(result.current.city.value).toBeUndefined();
    });
    test('form and field setters synchronize parent, child and array bindings', () => {
        const { result } = renderHook(useBoundForm);
        act(() => result.current.form.reset(baseline));
        act(() =>
            result.current.form.setValue({
                nested: { city: 'Berlin' },
                tags: ['b']
            })
        );
        expect(result.current.city.value).toBe('Berlin');
        expect(result.current.parent.value).toEqual({ city: 'Berlin' });
        expect(result.current.city.touched).toBe(false);
        expect(result.current.city.dirty).toBe(true);
        expect(result.current.name.value).toBe('Ada');
        act(() => result.current.city.onChange('Rome'));
        expect(result.current.parent.value).toEqual({ city: 'Rome' });
        expect(result.current.form.getValue().nested.city).toBe('Rome');
        expect(result.current.parent.initialValue).toEqual({ city: 'Paris' });
        act(() => result.current.tags.setValue(['a']));
        expect(result.current.tags.dirty).toBe(false);
    });
    test('caller-owned reset objects cannot mutate the baseline', () => {
        const { result } = renderHook(useBoundForm);
        const values = { ...baseline, nested: { city: 'Paris' }, tags: ['a'] };
        act(() => result.current.form.reset(values));
        values.nested.city = 'Elsewhere';
        values.tags.push('b');
        expect(result.current.city.initialValue).toBe('Paris');
        expect(result.current.tags.value).toEqual(['a']);
    });
    test('property names containing dots and slashes remain distinct', () => {
        const special = object({
            'a.b': string(),
            'a/b': string(),
            a: object({ b: string() })
        });
        const { result } = renderHook(() => {
            const form = useSchemaForm(special);
            return {
                form,
                dotted: form.useField(t => t['a.b']),
                slash: form.useField(t => t['a/b']),
                nested: form.useField(t => t.a.b)
            };
        });
        act(() =>
            result.current.form.reset({
                'a.b': 'dot',
                'a/b': 'slash',
                a: { b: 'nested' }
            })
        );
        expect(result.current.dotted.value).toBe('dot');
        expect(result.current.slash.value).toBe('slash');
        expect(result.current.nested.value).toBe('nested');
    });
    test('text, select and checkbox controls follow programmatic updates in Strict Mode', () => {
        function Controls() {
            const { form, name, city, active } = useBoundForm();
            useEffect(() => form.reset(baseline), [form]);
            return (
                <>
                    <input
                        aria-label="Name"
                        value={name.value ?? ''}
                        onChange={e => name.onChange(e.target.value)}
                    />
                    <select
                        aria-label="City"
                        value={city.value ?? ''}
                        onChange={e => city.onChange(e.target.value)}
                    >
                        <option>Paris</option>
                        <option>Berlin</option>
                    </select>
                    <input
                        aria-label="Active"
                        type="checkbox"
                        checked={active.value ?? false}
                        onChange={e => active.onChange(e.target.checked)}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            form.setValue({
                                name: 'Grace',
                                nested: { city: 'Berlin' },
                                active: false
                            })
                        }
                    >
                        Update
                    </button>
                </>
            );
        }
        render(
            <StrictMode>
                <Controls />
            </StrictMode>
        );
        fireEvent.click(screen.getByText('Update'));
        expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
            'Grace'
        );
        expect((screen.getByLabelText('City') as HTMLSelectElement).value).toBe(
            'Berlin'
        );
        expect(
            (screen.getByLabelText('Active') as HTMLInputElement).checked
        ).toBe(false);
    });
    test('server rendering supplies a stable server snapshot', () => {
        function ServerForm() {
            const form = useSchemaForm(object({ name: string() }));
            const field = form.useField(t => t.name);
            return (
                <input aria-label="Name" value={field.value ?? ''} readOnly />
            );
        }
        expect(renderToString(<ServerForm />)).toContain('value=""');
    });
    test('context-based fields share values and validation with direct hooks', async () => {
        const simple = object({ name: string().minLength(2) });
        function Child() {
            const name = useField<typeof simple>(t => t.name);
            return (
                <>
                    <input
                        aria-label="Name"
                        value={name.value ?? ''}
                        onChange={e => name.onChange(e.target.value)}
                    />
                    <span>{name.error}</span>
                </>
            );
        }
        function Parent() {
            const form = useSchemaForm(simple);
            return (
                <FormProvider form={form}>
                    <Child />
                </FormProvider>
            );
        }
        render(<Parent />);
        await act(async () =>
            fireEvent.change(screen.getByLabelText('Name'), {
                target: { value: 'x' }
            })
        );
        expect(screen.getByLabelText('Name').nextSibling?.textContent).not.toBe(
            ''
        );
    });
});

describe('validation generations', () => {
    test.each([
        'reset',
        'setValue',
        'onChange'
    ] as const)('ignores old async results after %s', async action => {
        vi.useFakeTimers();
        const pending = deferred<{
            valid: boolean;
            errors: { message: string }[];
        }>();
        const asyncSchema = object({
            name: string().addValidator(() => pending.promise)
        });
        const { result } = renderHook(() => {
            const form = useSchemaForm(asyncSchema, {
                validationDebounceMs: 100
            });
            return { form, field: form.useField(t => t.name) };
        });
        act(() => result.current.form.reset({ name: 'old' }));
        let validation!: ReturnType<typeof result.current.form.validate>;
        act(() => {
            validation = result.current.form.validate();
        });
        act(() => {
            if (action === 'onChange') result.current.field.onChange('new');
            else result.current.form[action]({ name: 'new' });
        });
        await act(async () => {
            pending.resolve({
                valid: false,
                errors: [{ message: 'obsolete' }]
            });
            await validation;
        });
        expect(result.current.field.value).toBe('new');
        expect(result.current.field.error).toBeUndefined();
        expect(result.current.field.validating).toBe(false);
    });
    test('reset and unmount cancel scheduled validation', async () => {
        vi.useFakeTimers();
        const validator = vi.fn(() => ({ valid: true }));
        const simple = object({ name: string().addValidator(validator) });
        const { result, unmount } = renderHook(() => {
            const form = useSchemaForm(simple, { validationDebounceMs: 100 });
            return { form, field: form.useField(t => t.name) };
        });
        act(() => {
            result.current.field.onChange('one');
            result.current.form.reset();
        });
        await act(() => vi.advanceTimersByTimeAsync(101));
        expect(validator).not.toHaveBeenCalled();
        act(() => result.current.field.onChange('two'));
        unmount();
        await vi.advanceTimersByTimeAsync(101);
        expect(validator).not.toHaveBeenCalled();
    });
});

describe('submission lifecycle', () => {
    const simple = object({ name: string().minLength(1) });
    function ready() {
        const hook = renderHook(() => useSchemaForm(simple));
        act(() => hook.result.current.reset({ name: 'Ada' }));
        return hook;
    }
    test('exposes reactive state with stable identity and prevents double submits', async () => {
        const { result } = ready();
        const form = result.current;
        const pending = deferred<{ ok: true; data: number }>();
        const send = vi.fn(() => pending.promise);
        const success = vi.fn();
        const handler = form.handleSubmit(send, { onSuccess: success });
        const preventDefault = vi.fn();
        let first!: Promise<void>;
        await act(async () => {
            first = handler({ preventDefault });
            await handler();
        });
        expect(result.current).toBe(form);
        expect(result.current.submitting).toBe(true);
        expect(send).toHaveBeenCalledTimes(1);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        await act(async () => {
            pending.resolve({ ok: true, data: 42 });
            await first;
        });
        expect(success).toHaveBeenCalledWith(42, { name: 'Ada' });
        expect(result.current.submitting).toBe(false);
    });
    test('invalid values never reach the submit callback', async () => {
        const { result } = ready();
        const send = vi.fn();
        act(() => result.current.setValue({ name: '' }));
        await act(() => result.current.handleSubmit(send)());
        expect(send).not.toHaveBeenCalled();
        expect(result.current.submitting).toBe(false);
    });
    test('explicit and translated failures preserve input; retry clears the error', async () => {
        const { result } = ready();
        const success = vi.fn();
        await act(() =>
            result.current.handleSubmit(
                () => ({ ok: false, error: 'Rejected' }),
                { onSuccess: success }
            )()
        );
        expect(result.current.error).toBe('Rejected');
        expect(result.current.getValue()).toEqual({ name: 'Ada' });
        expect(success).not.toHaveBeenCalled();
        await act(() =>
            result.current.handleSubmit(
                () => {
                    throw new Error('offline');
                },
                { onError: () => 'Try again' }
            )()
        );
        expect(result.current.error).toBe('Try again');
        await act(() =>
            result.current.handleSubmit(() => undefined, {
                onSuccess: success
            })()
        );
        expect(result.current.error).toBeUndefined();
        expect(success).toHaveBeenCalledTimes(1);
    });
    test('unhandled errors and callback rethrows propagate', async () => {
        const { result } = ready();
        const redirect = new Error('application redirect');
        await act(async () => {
            await expect(
                result.current.handleSubmit(() => {
                    throw redirect;
                })()
            ).rejects.toBe(redirect);
            await expect(
                result.current.handleSubmit(
                    () => {
                        throw redirect;
                    },
                    {
                        onError: error => {
                            throw error;
                        }
                    }
                )()
            ).rejects.toBe(redirect);
            await expect(
                result.current.handleSubmit(() => undefined, {
                    onSuccess: () => {
                        throw redirect;
                    }
                })()
            ).rejects.toBe(redirect);
        });
        expect(result.current.submitting).toBe(false);
    });
    test.each([
        'reset',
        'unmount'
    ] as const)('ignores obsolete success after %s', async action => {
        const { result, unmount } = ready();
        const pending = deferred<void>();
        const success = vi.fn();
        let submitted!: Promise<void>;
        await act(async () => {
            submitted = result.current.handleSubmit(() => pending.promise, {
                onSuccess: success
            })();
        });
        if (action === 'reset')
            act(() => result.current.reset({ name: 'New' }));
        else unmount();
        await act(async () => {
            pending.resolve();
            await submitted;
        });
        expect(success).not.toHaveBeenCalled();
        if (action === 'reset')
            expect(result.current.getValue()).toEqual({ name: 'New' });
    });
    test('does not dispatch values changed during asynchronous validation', async () => {
        const pending = deferred<{ valid: true }>();
        const guarded = object({
            name: string().addValidator(() => pending.promise)
        });
        const { result } = renderHook(() => useSchemaForm(guarded));
        act(() => result.current.reset({ name: 'Old' }));
        const send = vi.fn();
        let submitted!: Promise<void>;
        act(() => {
            submitted = result.current.handleSubmit(send)();
        });
        act(() => result.current.setValue({ name: 'New' }));
        await act(async () => {
            pending.resolve({ valid: true });
            await submitted;
        });
        expect(send).not.toHaveBeenCalled();
    });
});
