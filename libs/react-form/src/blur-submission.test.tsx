import { object, string } from '@cleverbrush/schema';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useSchemaForm } from './hooks.js';

const schema = object({
    first: string().minLength(1, 'First required'),
    second: string().minLength(1, 'Second required')
});
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => {
        resolve = done;
    });
    return { promise, resolve };
}
function bound(options = {}) {
    return renderHook(() => {
        const form = useSchemaForm(schema, options);
        return {
            form,
            first: form.useField(t => t.first),
            second: form.useField(t => t.second)
        };
    });
}
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
describe('opt-in immediate blur validation', () => {
    test('keeps touch-only behavior by default', () => {
        const validate = vi.spyOn(schema, 'validateAsync');
        const hook = bound();
        act(() => hook.result.current.form.reset({ first: '', second: '' }));
        act(() => hook.result.current.first.onBlur());
        expect(hook.result.current.first.touched).toBe(true);
        expect(hook.result.current.second.touched).toBe(false);
        expect(validate).not.toHaveBeenCalled();
    });
    test('validates untouched empty input and touches only the blurred field', async () => {
        const hook = bound({ validateOnBlur: true });
        act(() => hook.result.current.form.reset({ first: '', second: '' }));
        act(() => hook.result.current.first.onBlur());
        await waitFor(() =>
            expect(hook.result.current.first.error).toBe('First required')
        );
        expect(hook.result.current.first.touched).toBe(true);
        expect(hook.result.current.second.error).toBe('Second required');
        expect(hook.result.current.second.touched).toBe(false);
        act(() => hook.result.current.first.onChange('ok'));
        await waitFor(() =>
            expect(hook.result.current.first.error).toBeUndefined()
        );
    });
    test('flushes debounce once without a second scheduled validation', async () => {
        vi.useFakeTimers();
        const validate = vi.spyOn(schema, 'validateAsync');
        const hook = bound({ validateOnBlur: true, validationDebounceMs: 300 });
        act(() =>
            hook.result.current.form.reset({ first: 'ok', second: 'ok' })
        );
        act(() => hook.result.current.first.onChange(''));
        expect(validate).not.toHaveBeenCalled();
        await act(async () => {
            hook.result.current.first.onBlur();
        });
        expect(validate).toHaveBeenCalledTimes(1);
        expect(hook.result.current.first.error).toBe('First required');
        await act(() => vi.advanceTimersByTimeAsync(500));
        expect(validate).toHaveBeenCalledTimes(1);
        expect(hook.result.current.second.touched).toBe(false);
    });
    test.each(['change', 'reset', 'unmount'] as const)(
        'ignores stale blur errors after %s',
        async change => {
            const pending = deferred<{
                valid: false;
                errors: { message: string }[];
            }>();
            const guarded = object({
                name: string().addValidator(() => pending.promise)
            });
            const hook = renderHook(() => {
                const form = useSchemaForm(guarded, {
                    validateOnBlur: true,
                    validationDebounceMs: 300
                });
                return { form, name: form.useField(t => t.name) };
            });
            act(() => hook.result.current.form.reset({ name: 'old' }));
            act(() => hook.result.current.name.onBlur());
            if (change === 'change')
                act(() => hook.result.current.form.setValue({ name: 'new' }));
            else if (change === 'reset')
                act(() => hook.result.current.form.reset({ name: 'new' }));
            else hook.unmount();
            await act(async () => {
                pending.resolve({
                    valid: false,
                    errors: [{ message: 'Old error' }]
                });
            });
            if (change !== 'unmount') {
                expect(hook.result.current.name.value).toBe('new');
                expect(hook.result.current.name.error).toBeUndefined();
                expect(hook.result.current.name.validating).toBe(false);
            }
        }
    );
});
describe('managed invalid submissions', () => {
    test('passes failure to application policy without calling the writer', async () => {
        const hook = bound();
        act(() =>
            hook.result.current.form.reset({ first: '', second: 'saved' })
        );
        const write = vi.fn();
        const invalid = vi.fn(result => {
            expect(result.valid).toBe(false);
            hook.result.current.form.reset({ first: 'saved', second: 'saved' });
        });
        await act(() =>
            hook.result.current.form.handleSubmit(write, {
                onInvalid: invalid
            })()
        );
        expect(invalid).toHaveBeenCalledOnce();
        expect(write).not.toHaveBeenCalled();
        expect(hook.result.current.form.getValue()).toEqual({
            first: 'saved',
            second: 'saved'
        });
        expect(hook.result.current.first.touched).toBe(false);
        expect(hook.result.current.form.submitting).toBe(false);
    });
    test('holds duplicate protection until an asynchronous invalid callback settles', async () => {
        const hook = bound();
        act(() => hook.result.current.form.reset({ first: '', second: '' }));
        const pending = deferred<void>();
        const invalid = vi.fn(() => pending.promise);
        const handler = hook.result.current.form.handleSubmit(vi.fn(), {
            onInvalid: invalid
        });
        let first!: Promise<void>;
        await act(async () => {
            first = handler();
            await Promise.resolve();
        });
        await waitFor(() => expect(invalid).toHaveBeenCalledOnce());
        await act(() => handler());
        expect(invalid).toHaveBeenCalledOnce();
        expect(hook.result.current.form.submitting).toBe(true);
        await act(async () => {
            pending.resolve();
            await first;
        });
        expect(hook.result.current.form.submitting).toBe(false);
    });
    test('propagates invalid-callback exceptions and releases the lock for retry', async () => {
        const hook = bound();
        act(() => hook.result.current.form.reset({ first: '', second: '' }));
        const error = new Error('application callback');
        const onError = vi.fn();
        await act(async () => {
            await expect(
                hook.result.current.form.handleSubmit(vi.fn(), {
                    onInvalid: () => {
                        throw error;
                    },
                    onError
                })()
            ).rejects.toBe(error);
        });
        expect(onError).not.toHaveBeenCalled();
        expect(hook.result.current.form.submitting).toBe(false);
        act(() =>
            hook.result.current.form.setValue({ first: 'ok', second: 'ok' })
        );
        const write = vi.fn();
        const invalid = vi.fn();
        await act(() =>
            hook.result.current.form.handleSubmit(write, {
                onInvalid: invalid
            })()
        );
        expect(write).toHaveBeenCalledOnce();
        expect(invalid).not.toHaveBeenCalled();
    });
    test.each(['change', 'reset', 'unmount'] as const)(
        'suppresses invalid callbacks after %s during validation',
        async change => {
            const pending = deferred<{
                valid: false;
                errors: { message: string }[];
            }>();
            const guarded = object({
                name: string().addValidator(() => pending.promise)
            });
            const hook = renderHook(() => useSchemaForm(guarded));
            act(() => hook.result.current.reset({ name: 'old' }));
            const write = vi.fn();
            const invalid = vi.fn();
            let submission!: Promise<void>;
            act(() => {
                submission = hook.result.current.handleSubmit(write, {
                    onInvalid: invalid
                })();
            });
            if (change === 'change')
                act(() => hook.result.current.setValue({ name: 'new' }));
            else if (change === 'reset')
                act(() => hook.result.current.reset({ name: 'new' }));
            else hook.unmount();
            await act(async () => {
                pending.resolve({
                    valid: false,
                    errors: [{ message: 'Old error' }]
                });
                await submission;
            });
            expect(invalid).not.toHaveBeenCalled();
            expect(write).not.toHaveBeenCalled();
        }
    );
});
