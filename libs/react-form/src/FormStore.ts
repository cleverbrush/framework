import type { FieldState, FormSubmissionState } from './types.js';

type Binding = {
    getValue: (values: any) => { success: boolean; value?: any };
    setValue: (values: any, value: any, options: any) => boolean;
};

function isPlain(value: any): value is Record<string, any> {
    return (
        value != null &&
        typeof value === 'object' &&
        (Object.getPrototypeOf(value) === Object.prototype ||
            Object.getPrototypeOf(value) === null)
    );
}

/** Copy editable data; opaque values such as Files retain their identity. */
function copy(value: any, seen = new WeakMap<object, any>()): any {
    if (value instanceof Date) return new Date(value.getTime());
    if (!Array.isArray(value) && !isPlain(value)) return value;
    if (seen.has(value)) return seen.get(value);
    const result: any = Array.isArray(value) ? new Array(value.length) : {};
    seen.set(value, result);
    for (const key of Object.keys(value)) {
        Object.defineProperty(result, key, {
            value: copy(Reflect.get(value, key), seen),
            enumerable: true,
            writable: true,
            configurable: true
        });
    }
    return result;
}

function equal(a: any, b: any, seen = new WeakMap<object, object>()): boolean {
    if (Object.is(a, b)) return true;
    if (a instanceof Date && b instanceof Date) {
        return Object.is(a.getTime(), b.getTime());
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && a.length !== b.length) return false;
    if (
        !(Array.isArray(a) && Array.isArray(b)) &&
        !(isPlain(a) && isPlain(b))
    ) {
        return false;
    }
    if (seen.has(a)) return seen.get(a) === b;
    seen.set(a, b);
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every(
            key =>
                Object.hasOwn(b, key) &&
                equal(Reflect.get(a, key), Reflect.get(b, key), seen)
        )
    );
}

/** Internal immutable snapshots shared by all bindings of a form. */
export function createFormStore(initialValues: any) {
    let values = copy(initialValues ?? {});
    let baseline = values;
    let revision = 0;
    let submission: FormSubmissionState = {
        submitting: false,
        error: undefined
    };
    const bindings = new Map<string, Binding>();
    const fieldStates = new Map<string, FieldState>();
    const listeners = new Map<string, Set<() => void>>();
    const globalListeners = new Set<() => void>();

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
                dirty: !equal(value, initialValue),
                touched: false,
                error: undefined,
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
        for (const listener of listeners.get(path) ?? []) listener();
    }
    function notifyAll() {
        for (const path of listeners.keys()) notifyPath(path);
        for (const listener of globalListeners) listener();
    }
    function updateFieldState(path: string, patch: Partial<FieldState>) {
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
    function syncFields(reset: boolean) {
        for (const [path, binding] of bindings) {
            const value = read(binding, values);
            const initialValue = read(binding, baseline);
            updateFieldState(path, {
                value,
                initialValue,
                dirty: !equal(value, initialValue),
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
        return () => {
            set.delete(listener);
            if (set.size === 0) listeners.delete(path);
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
        const next = { ...submission, ...patch };
        if (
            next.submitting === submission.submitting &&
            next.error === submission.error
        )
            return;
        submission = next;
        for (const listener of globalListeners) listener();
    }
    function getValues() {
        return values;
    }
    function getRevision() {
        return revision;
    }
    function setValues(newValues: any) {
        values = copy(newValues ?? {});
        revision++;
        syncFields(false);
    }
    function setFieldValue(
        path: string,
        value: any,
        createMissingStructure: boolean
    ) {
        const next = copy(values);
        if (
            bindings
                .get(path)
                ?.setValue(next, copy(value), { createMissingStructure })
        ) {
            setValues(next);
        }
    }
    function resetAll(newInitialValues?: any) {
        values = copy(newInitialValues ?? {});
        baseline = values;
        revision++;
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
        notifyAll
    };
}

export type FormStore = ReturnType<typeof createFormStore>;
