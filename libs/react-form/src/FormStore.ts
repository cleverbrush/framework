import type { FieldState } from './types.js';

/**
 * Internal form store — manages field state and notification.
 * Does not depend on React; used by hooks for state management.
 */
export function createFormStore(initialValues: any) {
    let values: any = initialValues != null ? { ...initialValues } : {};
    const fieldStates = new Map<string, FieldState>();
    const listeners = new Map<string, Set<() => void>>();
    const globalListeners = new Set<() => void>();
    let rootErrors: ReadonlyArray<string> = [];
    const rootErrorListeners = new Set<() => void>();

    function ensureFieldState(path: string): FieldState {
        if (!fieldStates.has(path)) {
            fieldStates.set(path, {
                value: undefined,
                initialValue: undefined,
                dirty: false,
                touched: false,
                error: undefined,
                validating: false
            });
        }
        return fieldStates.get(path)!;
    }

    function getFieldState(path: string): FieldState {
        return ensureFieldState(path);
    }

    function updateFieldState(path: string, patch: Partial<FieldState>) {
        const current = ensureFieldState(path);
        const updated = { ...current, ...patch };
        fieldStates.set(path, updated);
        notifyPath(path);
    }

    function notifyPath(path: string) {
        const pathListeners = listeners.get(path);
        if (pathListeners) {
            for (const listener of pathListeners) {
                listener();
            }
        }
    }

    function notifyAll() {
        for (const [, pathListeners] of listeners) {
            for (const listener of pathListeners) {
                listener();
            }
        }
        for (const listener of globalListeners) {
            listener();
        }
        notifyRootErrors();
    }

    function subscribe(path: string, listener: () => void): () => void {
        if (!listeners.has(path)) {
            listeners.set(path, new Set());
        }
        listeners.get(path)!.add(listener);
        return () => {
            listeners.get(path)?.delete(listener);
        };
    }

    function subscribeGlobal(listener: () => void): () => void {
        globalListeners.add(listener);
        return () => {
            globalListeners.delete(listener);
        };
    }

    function getValues(): any {
        return values;
    }

    function setValues(newValues: any) {
        values = newValues != null ? { ...newValues } : {};
    }

    function resetAll(newInitialValues?: any) {
        values = newInitialValues != null ? { ...newInitialValues } : {};
        fieldStates.clear();
        rootErrors = [];
        notifyAll();
    }

    function getAllFieldPaths(): string[] {
        return Array.from(fieldStates.keys());
    }

    function getRootErrors(): ReadonlyArray<string> {
        return rootErrors;
    }

    function setRootErrors(errors: ReadonlyArray<string>) {
        rootErrors = errors;
        notifyRootErrors();
    }

    function notifyRootErrors() {
        for (const listener of rootErrorListeners) {
            listener();
        }
    }

    function subscribeRootErrors(listener: () => void): () => void {
        rootErrorListeners.add(listener);
        return () => {
            rootErrorListeners.delete(listener);
        };
    }

    return {
        getFieldState,
        updateFieldState,
        subscribe,
        subscribeGlobal,
        getValues,
        setValues,
        resetAll,
        notifyAll,
        getAllFieldPaths,
        getRootErrors,
        setRootErrors,
        subscribeRootErrors
    };
}

export type FormStore = ReturnType<typeof createFormStore>;
