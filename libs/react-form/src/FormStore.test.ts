import { describe, expect, test, vi } from 'vitest';
import { createFormStore } from './FormStore.js';

function setup(profile: any) {
    const store = createFormStore({ profile });
    store.registerField('/profile', {
        getValue: values => ({ success: true, value: values.profile }),
        setValue: (values, value) => {
            values.profile = value;
            return true;
        }
    });
    return store;
}

describe('shared deep utilities in the form store', () => {
    test('reset isolates caller-owned nested objects, arrays and Dates', () => {
        const store = setup(undefined);
        const profile = { name: 'Ada', tags: ['a'], date: new Date(1) };
        store.resetAll({ profile });
        profile.name = 'Grace';
        profile.tags.push('b');
        profile.date.setTime(2);
        expect(store.getFieldState('/profile')).toMatchObject({
            value: { name: 'Ada', tags: ['a'], date: new Date(1) },
            initialValue: { name: 'Ada', tags: ['a'], date: new Date(1) },
            dirty: false
        });
    });

    test('equal replacement clears dirty even with different reference sharing', () => {
        const child = { value: 1 };
        const store = setup({ left: child, right: child });
        store.setFieldValue('/profile', { left: { value: 2 } }, true);
        expect(store.getFieldState('/profile').dirty).toBe(true);
        store.setFieldValue(
            '/profile',
            { left: { value: 1 }, right: { value: 1 } },
            true
        );
        expect(store.getFieldState('/profile').dirty).toBe(false);
    });

    test('Files retain identity and distinct replacements become dirty', () => {
        const original = new File(['text'], 'file.txt');
        const replacement = new File(['text'], 'file.txt');
        const store = setup(original);
        expect(store.getFieldState('/profile').value).toBe(original);
        store.setFieldValue('/profile', replacement, true);
        expect(store.getFieldState('/profile')).toMatchObject({
            value: replacement,
            initialValue: original,
            dirty: true
        });
        store.setFieldValue('/profile', original, true);
        expect(store.getFieldState('/profile').dirty).toBe(false);
        store.resetAll({ profile: replacement });
        expect(store.getFieldState('/profile').initialValue).toBe(replacement);
        expect(store.getFieldState('/profile').dirty).toBe(false);
    });

    test('cyclic values and sparse array baselines survive setters', () => {
        const profile: any = { entries: new Array(2) };
        profile.self = profile;
        const store = setup(profile);
        const replacement: any = { entries: new Array(2) };
        replacement.self = replacement;
        store.setFieldValue('/profile', replacement, true);
        expect(store.getFieldState('/profile').dirty).toBe(false);
        replacement.entries[0] = undefined;
        store.setFieldValue('/profile', replacement, true);
        expect(store.getFieldState('/profile').dirty).toBe(true);
    });
});
test('notifies subscribers explicitly and clears root issues after value changes', () => {
    const store = createFormStore(null);
    const listener = vi.fn();
    const unsubscribe = store.subscribe('/name', listener);
    store.setIssues([{ pointer: '', detail: 'Invalid form' }]);
    expect(store.getFieldState('/name').error).toBeUndefined();
    store.notifyAll();
    expect(listener).toHaveBeenCalled();
    store.setValues({ name: 'Ada' });
    expect(store.getSubmissionState().error).toBeUndefined();
    unsubscribe();
});

test('safely reads escaped and malformed pointers when invalidating server issues', () => {
    const store = createFormStore({ 'a/b': { 'c~d': 'old' }, name: 'old' });
    store.setIssues([
        { pointer: '/a~1b/c~0d', detail: 'Reserved value' },
        { pointer: '/missing/child', detail: 'Unknown field' },
        { pointer: '/bad~2pointer', detail: 'Malformed escape' },
        { pointer: 'not-a-pointer', detail: 'Malformed root' }
    ]);
    store.setValues({ 'a/b': { 'c~d': 'new' }, name: 'new' });
    expect(store.getSubmissionState().error).not.toContain('Reserved value');
    expect(store.getSubmissionState().error).toContain('Malformed escape');
});
