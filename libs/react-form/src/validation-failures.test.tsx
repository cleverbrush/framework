import { object, string } from '@cleverbrush/schema';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSchemaForm } from './hooks.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
it('settles field validation when a schema rejects unexpectedly', async () => {
    const schema = object({ name: string() });
    vi.spyOn(schema, 'validateAsync').mockRejectedValue(
        new Error('validator unavailable')
    );
    const hook = renderHook(() => {
        const form = useSchemaForm(schema);
        return { form, field: form.useField(t => t.name) };
    });
    await act(() => hook.result.current.form.validate());
    expect(hook.result.current.field.validating).toBe(false);
    const save = vi.fn();
    await act(() => hook.result.current.form.handleSubmit(save)());
    expect(save).not.toHaveBeenCalled();
    expect(hook.result.current.form.submitting).toBe(false);
});
it('ignores a rejected submission after unmount without calling its error handler', async () => {
    const hook = renderHook(() => useSchemaForm(object({ name: string() })));
    act(() => hook.result.current.reset({ name: 'Ada' }));
    let reject!: (error: Error) => void;
    const save = vi.fn(
        () =>
            new Promise<never>((_resolve, fail) => {
                reject = fail;
            })
    );
    const onError = vi.fn();
    let submit!: Promise<void>;
    await act(async () => {
        submit = hook.result.current.handleSubmit(save, { onError })();
        await Promise.resolve();
    });
    expect(save).toHaveBeenCalledOnce();
    hook.unmount();
    reject(new Error('late failure'));
    await submit;
    expect(onError).not.toHaveBeenCalled();
});
