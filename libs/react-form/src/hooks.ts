import { debounce } from '@cleverbrush/async';
import type {
    InferType,
    PropertyDescriptor,
    PropertyDescriptorInner,
    PropertyDescriptorTree,
    SchemaBuilder,
    ValidationResult
} from '@cleverbrush/schema';
import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormContextValue } from './contexts.js';
import type { FormStore } from './FormStore.js';
import { createFormStore } from './FormStore.js';
import {
    buildDescriptorPathMap,
    buildSelectorFromPath,
    ensureNestedStructure,
    getDescriptorPath,
    getSchemaType,
    isErrorPathMatch
} from './helpers.js';
import type {
    FieldRenderer,
    FormSystemConfig,
    UseFieldResult,
    UseSchemaFormOptions
} from './types.js';

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

    const pathMapRef = useRef<Map<
        PropertyDescriptorInner<any, any, any>,
        string
    > | null>(null);
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

    // Generation counter to discard stale validation results from concurrent runs
    const validationGenRef = useRef(0);

    /**
     * Runs full schema validation using getErrorsFor to extract per-field errors.
     * Optionally marks all fields as touched (used by submit/explicit validate).
     */
    const runValidation = useCallback(
        async (
            markTouched: boolean
        ): Promise<ValidationResult<InferType<TSchema>>> => {
            const gen = ++validationGenRef.current;
            const values = store.getValues();
            // Ensure all nested object structures exist to prevent
            // ObjectSchemaBuilder.validateAsync() from throwing on undefined nested objects
            const safeValues = ensureNestedStructure(values, schemaRef.current);
            let result: ValidationResult<InferType<TSchema>>;
            try {
                result = (await schemaRef.current.validateAsync(safeValues, {
                    doNotStopOnFirstError: true
                })) as ValidationResult<InferType<TSchema>>;
            } catch {
                // If validation itself throws, treat as invalid
                return { valid: false } as ValidationResult<InferType<TSchema>>;
            }

            // Discard results if a newer validation has started since this one began
            if (gen !== validationGenRef.current) {
                return result as ValidationResult<InferType<TSchema>>;
            }

            // Clear all existing field errors
            const allPaths = store.getAllFieldPaths();
            for (const p of allPaths) {
                const patch: Partial<{
                    error: string | undefined;
                    touched: boolean;
                }> = { error: undefined };
                if (markTouched) {
                    patch.touched = true;
                }
                store.updateFieldState(p, patch);
            }

            // Use getErrorsFor to extract per-field errors via tree selectors
            const resultWithErrors = result as ValidationResult<
                InferType<TSchema>
            > & {
                getErrorsFor?: (selector: (t: any) => any) => {
                    errors: ReadonlyArray<string>;
                    isValid: boolean;
                };
                errors?: ReadonlyArray<{ message: string; path?: string }>;
            };

            // Build a map of errors found via getErrorsFor so we can detect gaps
            const fieldsWithErrors = new Set<string>();

            if (typeof resultWithErrors.getErrorsFor === 'function') {
                const getErrorsFor = resultWithErrors.getErrorsFor;

                // Extract per-field errors by building selectors from field paths
                for (const [, path] of pathMap) {
                    try {
                        const selector = buildSelectorFromPath(path);
                        const fieldResult = getErrorsFor(selector);
                        if (
                            fieldResult &&
                            Array.isArray(fieldResult.errors) &&
                            fieldResult.errors.length > 0
                        ) {
                            const errorMessage = fieldResult.errors[0];
                            const patch: Partial<{
                                error: string | undefined;
                                touched: boolean;
                            }> = { error: errorMessage };
                            if (markTouched) {
                                patch.touched = true;
                            }
                            store.updateFieldState(path, patch);
                            fieldsWithErrors.add(path);
                        }
                    } catch {
                        // If getErrorsFor fails for this path, skip — fallback below will handle it
                    }
                }
            }

            // Fallback: for fields not covered by getErrorsFor (e.g., deeply nested fields
            // where getErrorsFor has a known issue), match errors by path from result.errors
            if (Array.isArray(resultWithErrors.errors)) {
                for (const [, path] of pathMap) {
                    if (fieldsWithErrors.has(path)) continue;
                    const errorPath = `$.${path}`;
                    for (const err of resultWithErrors.errors) {
                        if (isErrorPathMatch(err.path ?? '', errorPath)) {
                            const patch: Partial<{
                                error: string | undefined;
                                touched: boolean;
                            }> = { error: err.message };
                            if (markTouched) {
                                patch.touched = true;
                            }
                            store.updateFieldState(path, patch);
                            fieldsWithErrors.add(path);
                            break;
                        }
                    }
                }
            }

            return result as ValidationResult<InferType<TSchema>>;
        },
        [store, pathMap]
    );

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

    const _getFormContext = useCallback(() => formContextRef.current, []);

    // Validate on mount when requested — runs once after first render
    const validateOnMountRef = useRef(resolvedOptions.validateOnMount);
    // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to check validateOnMount on the initial mount, ignoring changes to it after that
    useEffect(() => {
        if (validateOnMountRef.current) {
            runValidation(true);
        }
    }, []);

    // Create a debounced version of runValidation for onChange triggers.
    // validate(), submit(), and validateOnMount always use runValidation directly.
    const debouncedValidationRef = useRef<
        ((markTouched: boolean) => void) | null
    >(null);
    if (
        resolvedOptions.validationDebounceMs != null &&
        resolvedOptions.validationDebounceMs > 0 &&
        !debouncedValidationRef.current
    ) {
        debouncedValidationRef.current = debounce((markTouched: boolean) => {
            runValidation(markTouched);
        }, resolvedOptions.validationDebounceMs);
    }

    const triggerValidation = useCallback(
        (markTouched: boolean) => {
            if (debouncedValidationRef.current) {
                debouncedValidationRef.current(markTouched);
                return Promise.resolve(
                    undefined as unknown as ValidationResult<InferType<TSchema>>
                );
            }
            return runValidation(markTouched);
        },
        [runValidation]
    );

    const useFieldHook = useCallback(
        <TPropertySchema extends SchemaBuilder<any, any>>(
            selector: (
                tree: PropertyDescriptorTree<TSchema, TSchema>
            ) => PropertyDescriptor<TSchema, TPropertySchema, any>
        ): UseFieldResult<InferType<TPropertySchema>> => {
            return useFieldFromContext(
                formContextRef.current,
                selector,
                triggerValidation
            ) as UseFieldResult<InferType<TPropertySchema>>;
        },
        [triggerValidation]
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
        [
            useFieldHook,
            submit,
            validate,
            reset,
            getValue,
            setValueFn,
            _getFormContext
        ]
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
            store.setValues(values);
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
 * Resolves a renderer from the FormSystem config based on schema type and optional variant.
 *
 * When `variant` is provided the registry is checked for `"type:variant"` first
 * (e.g. `"string:password"`). If no match is found it falls back to the base
 * `"type"` key (e.g. `"string"`).
 */
export function resolveRenderer(
    config: FormSystemConfig | null,
    schema: SchemaBuilder<any, any>,
    variant?: string
): FieldRenderer | undefined {
    if (!config?.renderers) return undefined;
    const type = getSchemaType(schema);
    if (variant) {
        const variantRenderer = config.renderers[`${type}:${variant}`];
        if (variantRenderer) return variantRenderer;
    }
    return config.renderers[type];
}
