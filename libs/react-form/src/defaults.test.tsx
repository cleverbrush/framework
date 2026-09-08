import { array, boolean, enumOf, object, string } from '@cleverbrush/schema';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useSchemaForm } from './index.js';

afterEach(cleanup);
const schema = object({
    name: string().default('Untitled'),
    kind: enumOf('normal', 'offset').optional().default('normal'),
    active: boolean().default(true),
    tags: array(string()).default(() => [])
});

test('validation applies schema defaults to submitted values without pre-filling the form store', async () => {
    const { result } = renderHook(() => useSchemaForm(schema));
    expect(result.current.getValue()).toEqual({});
    const save = vi.fn();
    await act(async () => {
        await result.current.handleSubmit(save)();
    });
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({
        name: 'Untitled',
        kind: 'normal',
        active: true,
        tags: []
    });
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeUndefined();
});

test('headless defaulted properties remain synchronized through reset and submission', async () => {
    const { result } = renderHook(() => {
        const form = useSchemaForm(schema);
        return {
            form,
            name: form.useField(t => t.name),
            kind: form.useField(t => t.kind),
            active: form.useField(t => t.active),
            tags: form.useField(t => t.tags)
        };
    });
    act(() =>
        result.current.form.reset({
            name: 'Existing',
            kind: 'offset',
            active: false,
            tags: ['one']
        })
    );
    expect(result.current.name.value).toBe('Existing');
    expect(result.current.kind.value).toBe('offset');
    expect(result.current.active.value).toBe(false);
    expect(result.current.tags.value).toEqual(['one']);
    expect(result.current.name.dirty).toBe(false);
    act(() => result.current.name.onChange('Edited'));
    expect(result.current.name.dirty).toBe(true);
    const save = vi.fn();
    await act(async () => {
        await result.current.form.handleSubmit(save)();
    });
    expect(save).toHaveBeenCalledWith({
        name: 'Edited',
        kind: 'offset',
        active: false,
        tags: ['one']
    });
    act(() => result.current.form.reset());
    expect(result.current.name.value).toBeUndefined();
    expect(result.current.name.dirty).toBe(false);
    expect(result.current.active.value).toBeUndefined();
});
