import { array, object, string } from '@cleverbrush/schema';
import { act, render, renderHook, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { SchemaFormInstance } from './hooks.js';
import { useSchemaForm } from './hooks.js';

const schema = object({
    name: string().minLength(2),
    addresses: array(object({ city: string().minLength(2) })),
    hidden: string().optional()
});
function ready() {
    const hook = renderHook(() => {
        const form = useSchemaForm(schema);
        return {
            form,
            name: form.useField(t => t.name),
            city: form.useField(t => t.addresses[0].city)
        };
    });
    act(() =>
        hook.result.current.form.reset({
            name: 'Ada',
            addresses: [{ city: 'Paris' }]
        })
    );
    return hook;
}
test('submission issues bind indexed fields, stay through validation, and preserve input', async () => {
    const { result } = ready();
    const success = vi.fn();
    await act(() =>
        result.current.form.handleSubmit(
            () => ({
                ok: false,
                error: 'Check input',
                issues: [
                    { pointer: '/name', detail: 'Reserved name' },
                    { pointer: '/addresses/0/city', detail: 'Unsupported city' }
                ]
            }),
            { onSuccess: success }
        )()
    );
    expect(result.current.name).toMatchObject({
        error: 'Reserved name',
        touched: true
    });
    expect(result.current.city).toMatchObject({
        error: 'Unsupported city',
        touched: true
    });
    await act(() => result.current.form.validate());
    expect(result.current.city.error).toBe('Unsupported city');
    expect(result.current.form.getValue().name).toBe('Ada');
    expect(success).not.toHaveBeenCalled();
    await act(async () => result.current.name.onChange('Grace'));
    expect(result.current.name.error).toBeUndefined();
    expect(result.current.city.error).toBe('Unsupported city');
    await act(() => result.current.form.handleSubmit(() => ({ ok: true }))());
    expect(result.current.city.error).toBeUndefined();
    expect(result.current.form.error).toBeUndefined();
});
test('root, unknown and unbound issues stay visible; mounting/unmounting rehomes them', () => {
    const hook = renderHook(
        ({ show }: { show: boolean }) => {
            const form = useSchemaForm(schema);
            // A separate hook component is not necessary here: the store subscription
            // models conditional binding without changing the order of React hooks.
            return { form, context: form._getFormContext(), show };
        },
        { initialProps: { show: false } }
    );
    act(() =>
        hook.result.current.form.setIssues([
            { pointer: '/hidden', detail: 'Hidden issue' },
            { pointer: '/missing', detail: 'Unknown' },
            { pointer: '', detail: 'General' }
        ])
    );
    expect(hook.result.current.form.error).toBe(
        'Hidden issue\nUnknown\nGeneral'
    );
    let unsubscribe!: () => void;
    act(() => {
        unsubscribe = hook.result.current.context.store.subscribe(
            '/hidden',
            () => {}
        );
    });
    expect(hook.result.current.form.error).toBe('Unknown\nGeneral');
    act(unsubscribe);
    expect(hook.result.current.form.error).toContain('Hidden issue');
});
test('clearing issues preserves local errors, and reset clears all issue state', async () => {
    const { result } = ready();
    await act(async () => result.current.name.onChange(''));
    const local = result.current.name.error;
    const issues = [{ pointer: '/name', detail: 'Server' }];
    act(() => result.current.form.setIssues(issues));
    issues[0].detail = 'Mutated';
    expect(result.current.name.error).toBe('Server');
    act(() => result.current.form.setIssues([]));
    expect(result.current.name.error).toBe(local);
    act(() => result.current.form.reset());
    expect(result.current.name.error).toBeUndefined();
    expect(result.current.form.error).toBeUndefined();
});
test.each([
    'edit',
    'reset',
    'unmount'
] as const)('ignores late issues after %s', async action => {
    const { result, unmount } = ready();
    let resolve!: (result: any) => void;
    const pending = new Promise<any>(r => {
        resolve = r;
    });
    let submit!: Promise<void>;
    await act(async () => {
        submit = result.current.form.handleSubmit(() => pending)();
    });
    if (action === 'edit')
        await act(async () => result.current.name.onChange('Grace'));
    if (action === 'reset') act(() => result.current.form.reset());
    if (action === 'unmount') unmount();
    await act(async () => {
        resolve({
            ok: false,
            error: 'Rejected',
            issues: [{ pointer: '/name', detail: 'Old issue' }]
        });
        await submit;
    });
    if (action !== 'unmount') expect(result.current.name.error).toBeUndefined();
});
test('local validation reaches indexed fields and programmatic array replacement clears stale issues', async () => {
    const { result } = ready();
    await act(async () => result.current.city.onChange(''));
    expect(result.current.city.error).toBeDefined();
    act(() =>
        result.current.form.setIssues([
            { pointer: '/addresses/0/city', detail: 'Old city' }
        ])
    );
    act(() => result.current.form.setValue({ addresses: [{ city: 'Rome' }] }));
    expect(result.current.city.error).not.toBe('Old city');
});

test('conditional React field bindings move issues between inline state and summary', () => {
    let controller!: SchemaFormInstance<typeof schema>;
    function HiddenField({
        form
    }: {
        form: SchemaFormInstance<typeof schema>;
    }) {
        const hidden = form.useField(t => t.hidden);
        return <span data-testid="inline">{hidden.error}</span>;
    }
    function Form({ show }: { show: boolean }) {
        const form = useSchemaForm(schema);
        controller = form;
        return (
            <>
                <p data-testid="summary">{form.error}</p>
                {show && <HiddenField form={form} />}
            </>
        );
    }
    const view = render(<Form show={false} />);
    act(() =>
        controller.setIssues([{ pointer: '/hidden', detail: 'Hidden issue' }])
    );
    expect(screen.getByTestId('summary').textContent).toBe('Hidden issue');
    view.rerender(<Form show />);
    expect(screen.getByTestId('inline').textContent).toBe('Hidden issue');
    expect(screen.getByTestId('summary').textContent).toBe('');
    view.rerender(<Form show={false} />);
    expect(screen.getByTestId('summary').textContent).toBe('Hidden issue');
    view.unmount();
});

test('submission failure notifications expose the complete new snapshot', () => {
    const { result } = ready();
    const store = result.current.form._getFormContext().store;
    const snapshots: unknown[] = [];
    const unsubscribe = store.subscribe('/name', () =>
        snapshots.push([
            store.getFieldState('/name').error,
            store.getSubmissionState().error
        ])
    );
    act(() =>
        store.setSubmissionFailure('Check input', [
            { pointer: '/name', detail: 'Taken' }
        ])
    );
    expect(snapshots).toEqual([['Taken', 'Check input']]);
    unsubscribe();
});

test('escaped fields remain distinct and unknown paths never mutate values', () => {
    const special = object({
        'a/b': string(),
        'a.b': string(),
        a: object({ b: string() })
    });
    const { result } = renderHook(() => {
        const form = useSchemaForm(special);
        return {
            form,
            slash: form.useField(t => t['a/b']),
            dot: form.useField(t => t['a.b']),
            nested: form.useField(t => t.a.b)
        };
    });
    act(() =>
        result.current.form.setIssues([
            { pointer: '/a~1b', detail: 'Slash' },
            { pointer: '/a.b', detail: 'Dot' },
            { pointer: '/a/b', detail: 'Nested' },
            { pointer: '/__proto__/polluted', detail: 'Unknown' }
        ])
    );
    expect(result.current.slash.error).toBe('Slash');
    expect(result.current.dot.error).toBe('Dot');
    expect(result.current.nested.error).toBe('Nested');
    expect(result.current.form.error).toBe('Unknown');
    expect(result.current.form.getValue()).toEqual({});
    expect(({} as any).polluted).toBeUndefined();
});

test('unrelated debounced validation preserves external issues and first message wins', async () => {
    vi.useFakeTimers();
    try {
        const { result, unmount } = renderHook(() => {
            const form = useSchemaForm(schema, { validationDebounceMs: 50 });
            return {
                form,
                name: form.useField(t => t.name),
                city: form.useField(t => t.addresses[0].city)
            };
        });
        act(() =>
            result.current.form.reset({
                name: 'Ada',
                addresses: [{ city: 'Paris' }]
            })
        );
        act(() =>
            result.current.form.setIssues([
                { pointer: '/name', detail: 'First' },
                { pointer: '/name', detail: 'Second' }
            ])
        );
        act(() => result.current.city.onChange('Rome'));
        await act(() => vi.advanceTimersByTimeAsync(50));
        expect(result.current.name.error).toBe('First');
        unmount();
    } finally {
        vi.useRealTimers();
    }
});
