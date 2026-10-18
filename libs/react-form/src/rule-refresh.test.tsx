import { object, string } from '@cleverbrush/schema';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { useSchemaForm } from './hooks.js';

afterEach(cleanup);
function rules(minimum: number) {
    return object({
        name: string().minLength(minimum, `Minimum ${minimum}`),
        note: string().optional()
    });
}
function useRules(minimum: number, enabled?: boolean) {
    const schema = useMemo(() => rules(minimum), [minimum]);
    const form = useSchemaForm(schema, { refreshValidationRules: enabled });
    return {
        form,
        name: form.useField(t => t.name),
        note: form.useField(t => t.note)
    };
}
test('captures the first schema unless refresh is enabled', async () => {
    const hook = renderHook(({ minimum }) => useRules(minimum), {
        initialProps: { minimum: 1 }
    });
    act(() => hook.result.current.form.reset({ name: 'ab' }));
    hook.rerender({ minimum: 3 });
    await act(() => hook.result.current.form.validate());
    expect(hook.result.current.name.error).toBeUndefined();
});
test('adopts new bounds/messages without discarding values or field state', async () => {
    const hook = renderHook(({ minimum }) => useRules(minimum, true), {
        initialProps: { minimum: 1 }
    });
    act(() => hook.result.current.form.reset({ name: 'saved' }));
    act(() => {
        hook.result.current.name.onChange('ab');
        hook.result.current.name.onBlur();
    });
    await waitFor(() =>
        expect(hook.result.current.name.validating).toBe(false)
    );
    hook.rerender({ minimum: 3 });
    await waitFor(() =>
        expect(hook.result.current.name.error).toBe('Minimum 3')
    );
    expect(hook.result.current.name).toMatchObject({
        value: 'ab',
        initialValue: 'saved',
        dirty: true,
        touched: true
    });
    expect(hook.result.current.note.touched).toBe(false);
    hook.rerender({ minimum: 1 });
    await waitFor(() => expect(hook.result.current.name.error).toBeUndefined());
    expect(hook.result.current.name.dirty).toBe(true);
});
test('discards obsolete managed validation after a rule change', async () => {
    let resolve!: (value: {
        valid: false;
        errors: { message: string }[];
    }) => void;
    const pending = new Promise<{
        valid: false;
        errors: { message: string }[];
    }>(done => {
        resolve = done;
    });
    const first = object({ name: string().addValidator(() => pending) });
    const second = object({ name: string() });
    const hook = renderHook(
        ({ schema }) => {
            const form = useSchemaForm(schema, {
                refreshValidationRules: true
            });
            return { form, name: form.useField(t => t.name) };
        },
        { initialProps: { schema: first } }
    );
    act(() => hook.result.current.form.reset({ name: 'current' }));
    const write = vi.fn(),
        invalid = vi.fn();
    let submitted!: Promise<void>;
    act(() => {
        submitted = hook.result.current.form.handleSubmit(write, {
            onInvalid: invalid
        })();
    });
    hook.rerender({ schema: second });
    await waitFor(() =>
        expect(hook.result.current.name.validating).toBe(false)
    );
    await act(async () => {
        resolve({ valid: false, errors: [{ message: 'obsolete' }] });
        await submitted;
    });
    expect(write).not.toHaveBeenCalled();
    expect(invalid).not.toHaveBeenCalled();
    expect(hook.result.current.name.error).toBeUndefined();
    expect(hook.result.current.name.value).toBe('current');
});
