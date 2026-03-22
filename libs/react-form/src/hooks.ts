import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type {
    SchemaBuilder,
    PropertyDescriptorTree,
    PropertyDescriptor,
    PropertyDescriptorInner,
    InferType,
    ValidationResult
} from '@cleverbrush/schema';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { createFormStore } from './FormStore.js';
import type { FormStore } from './FormStore.js';
import type { FormContextValue } from './contexts.js';
import type {
    UseFieldResult,
    UseSchemaFormOptions,
    FormSystemConfig,
    FieldRenderer
} from './types.js';
import { buildDescriptorPathMap, getDescriptorPath, getSchemaType, buildSelectorFromPath } from './helpers.js';

// ─── SchemaFormInstance ──────────────────────────────────────────────────────

/**
 * Return type for useSchemaForm — fully typed for IntelliSense.
 * The `useField` method infers the field value type from the schema via PropertyDescriptor.
 */
export type SchemaFormInstance<
    TSchema extends ObjectSchemaBuilder<any, any, any>
> = {
    useField: <TPropertySchema extends SchemaBuilder<any, any>>(
        selector: (
            tree: PropertyDescriptorTree<TSchema, TSchema>
        ) => PropertyDescriptor<TSchema, TPropertySchema, any>
    ) => UseFieldResult<InferType<TPropertySchema>>;
    submit: () => Promise<ValidationResult<InferType<TSchema>>>;
    validate: () => Promise<ValidationResult<InferType<TSchema>>>;
    reset: (values?: Partial<InferType<TSchema>>) => void;
    getValue: () => InferType<TSchema>;
    setValue: (values: Partial<InferType<TSchema>>) => void;
    /** @internal — Used by FormProvider and Field to access internal context */
    _getFormContext: () => FormContextValue;
};

// ─── useSchemaForm ───────────────────────────────────────────────────────────

/**
 * Hook that binds a schema to a form instance.
 * Provides field binding API, form-level validation, submit, reset.
 */
export function useSchemaForm<
    TSchema extends ObjectSchemaBuilder<any, any, any>
>(
    schema: TSchema,
    options?: UseSchemaFormOptions
): SchemaFormInstance<TSchema> {
    const resolvedOptions: UseSchemaFormOptions = {
        createMissingStructure: true,
        ...options
    };

    const storeRef = useRef<FormStore | null>(null);
    if (!storeRef.current) {
        storeRef.current = createFormStore({});
    }
    const store = storeRef.current;

    const descriptorTreeRef = useRef<PropertyDescriptorTree<
        TSchema,
        TSchema
    > | null>(null);
    if (!descriptorTreeRef.current) {
        descriptorTreeRef.current = ObjectSchemaBuilder.getPropertiesFor(
            schema
        ) as PropertyDescriptorTree<TSchema, TSchema>;
    }
    const descriptorTree = descriptorTreeRef.current;

    const pathMapRef = useRef<Map<PropertyDescriptorInner<any, any, any>, string> | null>(null);
    if (!pathMapRef.current) {
        pathMapRef.current = buildDescriptorPathMap(descriptorTree, schema);
    }
    const pathMap = pathMapRef.current;

    const schemaRef = useRef(schema);
    const optionsRef = useRef(resolvedOptions);
    optionsRef.current = resolvedOptions;

    const formContextValue = useMemo<FormContextValue>(
        () => ({
            store,
            descriptorTree,
            schema: schemaRef.current,
            options: optionsRef.current,
            pathMap
        }),
        [store, descriptorTree, pathMap]
    );

    const formContextRef = useRef(formContextValue);
    formContextRef.current = formContextValue;

    /**
     * Runs full schema validation using getErrorsFor to extract per-field errors.
     * Optionally marks all fields as touched (used by submit/explicit validate).
     */
    const runValidation = useCallback(async (markTouched: boolean): Promise<
        ValidationResult<InferType<TSchema>>
    > => {
        const values = store.getValues();
        let result: ValidationResult<InferType<TSchema>>;
        try {
            result = await schemaRef.current.validate(values, {
                doNotStopOnFirstError: true
            }) as ValidationResult<InferType<TSchema>>;
        } catch {
            // If validation itself throws (e.g., null values), treat as no errors
            return { valid: false } as ValidationResult<InferType<TSchema>>;
        }

        // Clear all existing field errors
        const allPaths = store.getAllFieldPaths();
        for (const p of allPaths) {
            const patch: Partial<{ error: string | undefined; touched: boolean }> = { error: undefined };
            if (markTouched) {
                patch.touched = true;
            }
            store.updateFieldState(p, patch);
        }

        // Use getErrorsFor to extract per-field errors via tree selectors
        const resultWithErrors = result as ValidationResult<InferType<TSchema>> & {
            getErrorsFor?: (selector: (t: any) => any) => {
                errors: ReadonlyArray<string>;
                isValid: boolean;
            };
        };
        if (typeof resultWithErrors.getErrorsFor === 'function') {
            const getErrorsFor = resultWithErrors.getErrorsFor;

            // Extract per-field errors by building selectors from field paths
            for (const [, path] of pathMap) {
                try {
                    const selector = buildSelectorFromPath(path);
                    const fieldResult = getErrorsFor(selector);
                    if (fieldResult && Array.isArray(fieldResult.errors) && fieldResult.errors.length > 0) {
                        const errorMessage = fieldResult.errors[0];
                        const patch: Partial<{ error: string | undefined; touched: boolean }> = { error: errorMessage };
                        if (markTouched) {
                            patch.touched = true;
                        }
                        store.updateFieldState(path, patch);
                    }
                } catch {
                    // If getErrorsFor fails for this path, skip
                }
            }
        }

        return result as ValidationResult<InferType<TSchema>>;
    }, [store, pathMap]);

    const validate = useCallback(async (): Promise<
        ValidationResult<InferType<TSchema>>
    > => {
        return runValidation(true);
    }, [runValidation]);

    const submit = useCallback(async (): Promise<
        ValidationResult<InferType<TSchema>>
    > => {
        return validate();
    }, [validate]);

    const reset = useCallback(
        (values?: Partial<InferType<TSchema>>) => {
            const newValues = values ?? {};
            store.resetAll(newValues);
        },
        [store]
    );

    const getValue = useCallback((): InferType<TSchema> => {
        return store.getValues();
    }, [store]);

    const setValueFn = useCallback(
        (values: Partial<InferType<TSchema>>) => {
            const currentValues = store.getValues();
            const merged = { ...currentValues, ...values };
            store.setValues(merged);
            store.notifyAll();
        },
        [store]
    );

    const _getFormContext = useCallback(
        () => formContextRef.current,
        []
    );

    const useFieldHook = useCallback(
        <TPropertySchema extends SchemaBuilder<any, any>>(
            selector: (
                tree: PropertyDescriptorTree<TSchema, TSchema>
            ) => PropertyDescriptor<TSchema, TPropertySchema, any>
        ): UseFieldResult<InferType<TPropertySchema>> => {
            return useFieldFromContext(formContextRef.current, selector, runValidation) as UseFieldResult<InferType<TPropertySchema>>;
        },
        [runValidation]
    );

    return useMemo(
        () => ({
            useField: useFieldHook,
            submit,
            validate,
            reset,
            getValue,
            setValue: setValueFn,
            _getFormContext
        }),
        [useFieldHook, submit, validate, reset, getValue, setValueFn, _getFormContext]
    );
}

// ─── useField (from context) ─────────────────────────────────────────────────

/**
 * Internal useField implementation, requires FormContextValue.
 * Returns UseFieldResult with untyped values — callers should cast to the proper generic type.
 */
export function useFieldFromContext(
    formContext: FormContextValue,
    selector: (tree: any) => any,
    triggerValidation?: (markTouched: boolean) => Promise<any>
): UseFieldResult {
    const { store, descriptorTree, options, pathMap } = formContext;

    const descriptor = selector(descriptorTree as any);
    const inner = descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
    const path = getDescriptorPath(inner, pathMap);
    const fieldSchema = inner.getSchema();

    // Initialize field state from current values on first access
    const initializedRef = useRef<string | null>(null);

    if (initializedRef.current !== path) {
        const values = store.getValues();
        const { success, value } = inner.getValue(values);
        const currentState = store.getFieldState(path);
        if (currentState.initialValue === undefined && !currentState.touched) {
            const resolvedValue = success ? value : undefined;
            store.updateFieldState(path, {
                value: resolvedValue,
                initialValue: resolvedValue,
                dirty: false
            });
        }
        initializedRef.current = path;
    }

    const [, setRenderTick] = useState(0);

    // Subscribe to field changes with proper cleanup on unmount/path change
    useEffect(() => {
        const unsub = store.subscribe(path, () => {
            setRenderTick((c) => c + 1);
        });
        return unsub;
    }, [store, path]);

    const onChange = useCallback(
        (value: any) => {
            const values = store.getValues();
            inner.setValue(values, value, {
                createMissingStructure: options.createMissingStructure !== false
            });
            const currentState = store.getFieldState(path);
            store.updateFieldState(path, {
                value,
                dirty: value !== currentState.initialValue
            });
            // Run validation on every field change (without marking all fields touched)
            if (triggerValidation) {
                triggerValidation(false);
            }
        },
        [store, inner, path, options, triggerValidation]
    );

    const onBlur = useCallback(() => {
        store.updateFieldState(path, { touched: true });
    }, [store, path]);

    const setValue = useCallback(
        (value: any) => {
            onChange(value);
        },
        [onChange]
    );

    const fieldState = store.getFieldState(path);

    return {
        value: fieldState.value,
        initialValue: fieldState.initialValue,
        dirty: fieldState.dirty,
        touched: fieldState.touched,
        error: fieldState.error,
        validating: fieldState.validating,
        onChange,
        onBlur,
        setValue,
        schema: fieldSchema
    };
}

/**
 * Resolves renderer from the FormSystem config based on schema type.
 */
export function resolveRenderer(
    config: FormSystemConfig | null,
    schema: SchemaBuilder<any, any>
): FieldRenderer | undefined {
    if (!config?.renderers) return undefined;
    const type = getSchemaType(schema);
    return config.renderers[type];
}
