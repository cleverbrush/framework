import { deepClone, deepEqual } from '@cleverbrush/deep';
import type { FieldState, FormIssue, FormSubmissionState } from './types.js';

type Binding = {
    getValue: (values: any) => { success: boolean; value?: any };
    setValue: (values: any, value: any, options: any) => boolean;
};

/** Internal immutable snapshots shared by all bindings of a form. */
export function createFormStore(initialValues: any) {
    let values = deepClone(initialValues ?? {});
    let baseline = values;
    let revision = 0;
    let issues: readonly FormIssue[] = [];
    let submissionError: string | undefined;
    const localErrors = new Map<string, string | undefined>();
    let submission: FormSubmissionState = {
        submitting: false,
        error: undefined
    };
    const bindings = new Map<string, Binding>();
    const fieldStates = new Map<string, FieldState>();
    const listeners = new Map<string, Set<() => void>>();
    const globalListeners = new Set<() => void>();
    let batching = 0;
    const pendingPaths = new Set<string>();
    let pendingGlobal = false;
    function batch(callback: () => void) {
        batching++;
        try {
            callback();
        } finally {
            batching--;
            if (batching === 0) {
                const paths = [...pendingPaths];
                pendingPaths.clear();
                const global = pendingGlobal;
                pendingGlobal = false;
                for (const path of paths) notifyPath(path);
                if (global) notifyGlobal();
            }
        }
    }
    function notifyGlobal() {
        if (batching) {
            pendingGlobal = true;
            return;
        }
        for (const listener of globalListeners) listener();
    }

    function read(binding: Binding | undefined, source: any) {
        const result = binding?.getValue(source);
        return result?.success ? result.value : undefined;
    }
    function getFieldState(path: string): FieldState {
        if (!fieldStates.has(path)) {
            const binding = bindings.get(path);
            const value = read(binding, values);
            const initialValue = read(binding, baseline);
            fieldStates.set(path, {
                value,
                initialValue,
                dirty: !deepEqual(value, initialValue),
                touched: issues.some(issue => issue.pointer === path),
                error: externalError(path),
                validating: false
            });
        }
        return fieldStates.get(path)!;
    }
    function registerField(path: string, binding: Binding) {
        if (!bindings.has(path)) bindings.set(path, binding);
        return getFieldState(path);
    }
    function notifyPath(path: string) {
        if (batching) {
            pendingPaths.add(path);
            return;
        }
        for (const listener of listeners.get(path) ?? []) listener();
    }
    function notifyAll() {
        for (const path of listeners.keys()) notifyPath(path);
        notifyGlobal();
    }
    function commitFieldState(path: string, patch: Partial<FieldState>) {
        const current = getFieldState(path);
        if (
            Object.entries(patch).every(([key, value]) =>
                Object.is(current[key as keyof FieldState], value)
            )
        )
            return;
        fieldStates.set(path, { ...current, ...patch });
        notifyPath(path);
    }
    function externalError(path: string) {
        return path === ''
            ? undefined
            : issues.find(issue => issue.pointer === path)?.detail;
    }
    function updateFieldState(path: string, patch: Partial<FieldState>) {
        if (Object.hasOwn(patch, 'error')) localErrors.set(path, patch.error);
        commitFieldState(path, {
            ...patch,
            error: externalError(path) ?? localErrors.get(path)
        });
    }
    function setIssues(next: readonly FormIssue[]) {
        batch(() => {
            // Copy caller-owned data; later mutations must not change store snapshots.
            issues = next.map(({ pointer, detail }) => ({ pointer, detail }));
            for (const path of bindings.keys()) {
                commitFieldState(path, {
                    error: externalError(path) ?? localErrors.get(path),
                    ...(externalError(path) !== undefined
                        ? { touched: true }
                        : {})
                });
            }
            setSubmissionState({});
        });
    }
    function setSubmissionFailure(error: string, next?: readonly FormIssue[]) {
        batch(() => {
            if (next) setIssues(next);
            setSubmissionState({ error });
        });
    }
    function syncFields(reset: boolean) {
        for (const [path, binding] of bindings) {
            const value = read(binding, values);
            const initialValue = read(binding, baseline);
            updateFieldState(path, {
                value,
                initialValue,
                dirty: !deepEqual(value, initialValue),
                validating: false,
                ...(reset ? { touched: false, error: undefined } : {})
            });
        }
    }
    function subscribe(path: string, listener: () => void): () => void {
        let set = listeners.get(path);
        if (!set) {
            set = new Set();
            listeners.set(path, set);
        }
        set.add(listener);
        setSubmissionState({});
        return () => {
            set.delete(listener);
            if (set.size === 0) listeners.delete(path);
            setSubmissionState({});
        };
    }
    function subscribeGlobal(listener: () => void): () => void {
        globalListeners.add(listener);
        return () => {
            globalListeners.delete(listener);
        };
    }
    function getSubmissionState() {
        return submission;
    }
    function setSubmissionState(patch: Partial<FormSubmissionState>) {
        if (Object.hasOwn(patch, 'error')) submissionError = patch.error;
        const messages = [
            submissionError,
            ...issues
                .filter(
                    issue =>
                        issue.pointer === '' ||
                        !listeners.get(issue.pointer)?.size
                )
                .map(issue => issue.detail)
        ].filter((message): message is string => !!message);
        const next = {
            ...submission,
            ...patch,
            error: [...new Set(messages)].join('\n') || undefined
        };
        if (
            next.submitting === submission.submitting &&
            next.error === submission.error
        )
            return;
        submission = next;
        notifyGlobal();
    }
    function getValues() {
        return values;
    }
    function getRevision() {
        return revision;
    }
    function setValues(newValues: any, changedPath?: string) {
        const previous = values;
        values = deepClone(newValues ?? {});
        revision++;
        const changed = issues.length > 0 && !deepEqual(previous, values);
        if (changed) {
            const readPointer = (source: any, pointer: string) => {
                if (pointer === '') return source;
                if (!pointer.startsWith('/') || /~(?![01])/.test(pointer))
                    return undefined;
                return pointer
                    .slice(1)
                    .split('/')
                    .reduce((value, part) => {
                        const key = part
                            .replace(/~1/g, '/')
                            .replace(/~0/g, '~');
                        return value != null && Object.hasOwn(value, key)
                            ? value[key]
                            : undefined;
                    }, source);
            };
            // Arrays are positional: replacing/reordering a container invalidates
            // all of its indexed issues, even when two items have equal values.
            const arrayChanges = [...bindings.keys()].filter(
                path =>
                    Array.isArray(readPointer(previous, path)) &&
                    !deepEqual(
                        readPointer(previous, path),
                        readPointer(values, path)
                    ) &&
                    (!changedPath ||
                        changedPath === path ||
                        path.startsWith(changedPath + '/'))
            );
            setIssues(
                issues.filter(issue => {
                    const path = issue.pointer;
                    if (path === '') return false;
                    if (
                        changedPath &&
                        (path === changedPath ||
                            path.startsWith(changedPath + '/') ||
                            changedPath.startsWith(path + '/'))
                    )
                        return false;
                    if (
                        arrayChanges.some(
                            array =>
                                path === array || path.startsWith(array + '/')
                        )
                    )
                        return false;
                    return deepEqual(
                        readPointer(previous, path),
                        readPointer(values, path)
                    );
                })
            );
        }
        syncFields(false);
    }
    function setFieldValue(
        path: string,
        value: any,
        createMissingStructure: boolean
    ) {
        const next = deepClone(values);
        if (
            bindings
                .get(path)
                ?.setValue(next, deepClone(value), { createMissingStructure })
        ) {
            setValues(next, path);
        }
    }
    function resetAll(newInitialValues?: any) {
        values = deepClone(newInitialValues ?? {});
        baseline = values;
        revision++;
        issues = [];
        localErrors.clear();
        syncFields(true);
        setSubmissionState({ error: undefined });
    }
    function getAllFieldPaths() {
        return Array.from(bindings.keys());
    }

    return {
        registerField,
        getFieldState,
        updateFieldState,
        subscribe,
        subscribeGlobal,
        getValues,
        setValues,
        setFieldValue,
        resetAll,
        getAllFieldPaths,
        getRevision,
        getSubmissionState,
        setSubmissionState,
        setIssues,
        setSubmissionFailure,
        notifyAll
    };
}

export type FormStore = ReturnType<typeof createFormStore>;
