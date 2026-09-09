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
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore
} from 'react';
import type { FormContextValue } from './contexts.js';
import type { FormStore } from './FormStore.js';
import { createFormStore } from './FormStore.js';
import {
    buildDescriptorPathMap,
    ensureNestedStructure,
    getSchemaType
} from './helpers.js';
import type {
    FieldRenderer,
    FormSubmissionState,
    FormSubmitHandler,
    FormSubmitOptions,
    FormSubmitResult,
    FormSystemConfig,
    UseFieldResult,
    UseSchemaFormOptions
} from './types.js';

/** A stable form controller with reactive field and submission subscriptions. */
export type SchemaFormInstance<
    TSchema extends ObjectSchemaBuilder<any, any, any>
> = {
    useField: <TPropertySchema extends SchemaBuilder<any, any, any, any>>(
        forProperty: (
            tree: PropertyDescriptorTree<TSchema, TSchema>
        ) => PropertyDescriptor<TSchema, TPropertySchema, any>
    ) => UseFieldResult<InferType<TPropertySchema>>;
    submit: () => Promise<ValidationResult<InferType<TSchema>>>;
    validate: () => Promise<ValidationResult<InferType<TSchema>>>;
    /** Clear values, or establish supplied values as the new clean baseline. */
    reset: (values?: Partial<InferType<TSchema>>) => void;
    /** Read the current snapshot. Use setters rather than mutating it. */
    getValue: () => InferType<TSchema>;
    /** Shallow-merge values without marking fields touched. */
    setValue: (values: Partial<InferType<TSchema>>) => void;
    /** Validate and submit once; repeated calls while pending are ignored. */
    handleSubmit: <TData = void>(
        onValid: (
            values: InferType<TSchema>
        ) => FormSubmitResult<TData> | Promise<FormSubmitResult<TData>>,
        options?: FormSubmitOptions<InferType<TSchema>, TData>
    ) => FormSubmitHandler;
    /** @internal — Used by FormProvider and Field to access internal context. */
    _getFormContext: () => FormContextValue;
} & FormSubmissionState;

/** Bind a schema to independently subscribed fields and a stable form instance. */
export function useSchemaForm<
    TSchema extends ObjectSchemaBuilder<any, any, any>
>(
    schema: TSchema,
    options?: UseSchemaFormOptions
): SchemaFormInstance<TSchema> {
    const storeRef = useRef<FormStore | null>(null);
    if (!storeRef.current) storeRef.current = createFormStore({});
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
    for (const [descriptor] of pathMap) {
        store.registerField(descriptor.toJsonPointer(), descriptor);
    }
    const schemaRef = useRef(schema);
    const optionsRef = useRef<UseSchemaFormOptions>({});
    optionsRef.current = { createMissingStructure: true, ...options };
    const mountedRef = useRef(true);
    const epochRef = useRef(0);
    const validationGenRef = useRef(0);
    const submissionLockRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelScheduledValidation = useCallback(() => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            epochRef.current++;
            validationGenRef.current++;
            cancelScheduledValidation();
        };
    }, [cancelScheduledValidation]);

    const runValidation = useCallback(
        async (
            markTouched: boolean
        ): Promise<ValidationResult<InferType<TSchema>>> => {
            cancelScheduledValidation();
            const gen = ++validationGenRef.current;
            const revision = store.getRevision();
            for (const path of store.getAllFieldPaths()) {
                store.updateFieldState(path, { validating: true });
            }
            const safeValues = ensureNestedStructure(
                store.getValues(),
                schemaRef.current
            );
            let result: ValidationResult<InferType<TSchema>>;
            try {
                result = (await schemaRef.current.validateAsync(safeValues, {
                    doNotStopOnFirstError: true
                })) as ValidationResult<InferType<TSchema>>;
            } catch {
                result = { valid: false } as ValidationResult<
                    InferType<TSchema>
                >;
            }
            // A value update invalidates validation immediately, even while the next
            // validation is only scheduled (debounced) and has not started yet.
            if (
                !mountedRef.current ||
                gen !== validationGenRef.current ||
                revision !== store.getRevision()
            )
                return result;

            for (const path of store.getAllFieldPaths()) {
                store.updateFieldState(path, {
                    error: undefined,
                    validating: false,
                    ...(markTouched ? { touched: true } : {})
                });
            }
            const getErrorsFor = (result as any).getErrorsFor;
            if (typeof getErrorsFor === 'function') {
                for (const [descriptor] of pathMap) {
                    const path = descriptor.toJsonPointer();
                    const parts = path
                        .slice(1)
                        .split('/')
                        .map(part =>
                            part.replace(/~1/g, '/').replace(/~0/g, '~')
                        );
                    try {
                        const field = getErrorsFor((tree: any) =>
                            parts.reduce(
                                (value: any, key) => value?.[key],
                                tree
                            )
                        );
                        if (
                            Array.isArray(field?.errors) &&
                            field.errors.length
                        ) {
                            store.updateFieldState(path, {
                                error: field.errors[0]
                            });
                        }
                    } catch {
                        // A missing error selector must not prevent other fields
                        // from receiving their validation results.
                    }
                }
            }
            return result;
        },
        [cancelScheduledValidation, store, pathMap]
    );

    const validate = useCallback(() => runValidation(true), [runValidation]);
    const submit = useCallback(() => validate(), [validate]);
    const reset = useCallback(
        (values?: Partial<InferType<TSchema>>) => {
            epochRef.current++;
            validationGenRef.current++;
            cancelScheduledValidation();
            store.resetAll(values);
        },
        [store, cancelScheduledValidation]
    );
    const getValue = useCallback(
        (): InferType<TSchema> => store.getValues(),
        [store]
    );
    const setValue = useCallback(
        (values: Partial<InferType<TSchema>>) => {
            cancelScheduledValidation();
            store.setValues({ ...store.getValues(), ...values });
        },
        [store, cancelScheduledValidation]
    );
    const triggerValidation = useCallback(
        (markTouched: boolean) => {
            cancelScheduledValidation();
            const delay = optionsRef.current.validationDebounceMs;
            if (delay != null && delay > 0) {
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    void runValidation(markTouched);
                }, delay);
                return Promise.resolve();
            }
            return runValidation(markTouched);
        },
        [runValidation, cancelScheduledValidation]
    );

    const handleSubmit = useCallback(
        <TData>(
            onValid: (
                values: InferType<TSchema>
            ) => FormSubmitResult<TData> | Promise<FormSubmitResult<TData>>,
            submissionOptions?: FormSubmitOptions<InferType<TSchema>, TData>
        ): FormSubmitHandler =>
            async event => {
                event?.preventDefault();
                if (submissionLockRef.current || !mountedRef.current) return;
                submissionLockRef.current = true;
                const epoch = epochRef.current;
                const current = () =>
                    mountedRef.current && epoch === epochRef.current;
                store.setSubmissionState({
                    submitting: true,
                    error: undefined
                });
                try {
                    const revision = store.getRevision();
                    const result = await runValidation(true);
                    if (
                        !current() ||
                        revision !== store.getRevision() ||
                        !result.valid ||
                        result.object === undefined
                    )
                        return;
                    const values = result.object;
                    let outcome: FormSubmitResult<TData>;
                    try {
                        outcome = await onValid(values);
                    } catch (error) {
                        if (!current()) return;
                        if (!submissionOptions?.onError) throw error;
                        const message = await submissionOptions.onError(error);
                        if (current())
                            store.setSubmissionState({ error: message });
                        return;
                    }
                    if (!current()) return;
                    if (outcome && !outcome.ok) {
                        store.setSubmissionState({ error: outcome.error });
                        return;
                    }
                    // Errors from success callbacks (including redirects) propagate;
                    // they are not translated as failures of a completed submission.
                    await submissionOptions?.onSuccess?.(outcome?.data, values);
                } finally {
                    submissionLockRef.current = false;
                    if (mountedRef.current)
                        store.setSubmissionState({ submitting: false });
                }
            },
        [runValidation, store]
    );

    const formContextValue = useMemo<FormContextValue>(
        () => ({
            store,
            descriptorTree,
            schema: schemaRef.current,
            pathMap,
            get options() {
                return optionsRef.current;
            },
            triggerValidation
        }),
        [store, descriptorTree, pathMap, triggerValidation]
    );
    const formContextRef = useRef(formContextValue);
    formContextRef.current = formContextValue;
    const _getFormContext = useCallback(() => formContextRef.current, []);
    const useFieldHook = useCallback(
        <TPropertySchema extends SchemaBuilder<any, any, any, any>>(
            selector: (
                tree: PropertyDescriptorTree<TSchema, TSchema>
            ) => PropertyDescriptor<TSchema, TPropertySchema, any>
        ): UseFieldResult<InferType<TPropertySchema>> =>
            useFieldFromContext(formContextRef.current, selector),
        []
    );
    const validateOnMountRef = useRef(options?.validateOnMount);
    useEffect(() => {
        if (validateOnMountRef.current) void runValidation(true);
    }, [runValidation]);

    // Subscribe to submission state without changing the controller's identity.
    useSyncExternalStore(
        store.subscribeGlobal,
        store.getSubmissionState,
        store.getSubmissionState
    );
    return useMemo(
        () => ({
            useField: useFieldHook,
            submit,
            validate,
            reset,
            getValue,
            setValue,
            handleSubmit,
            _getFormContext,
            get submitting() {
                return store.getSubmissionState().submitting;
            },
            get error() {
                return store.getSubmissionState().error;
            }
        }),
        [
            useFieldHook,
            submit,
            validate,
            reset,
            getValue,
            setValue,
            handleSubmit,
            _getFormContext,
            store
        ]
    );
}

/** Internal field binding shared by direct and context-based hooks. */
export function useFieldFromContext(
    formContext: FormContextValue,
    forProperty: (tree: any) => any,
    triggerValidation = formContext.triggerValidation
): UseFieldResult {
    const { store, descriptorTree, options } = formContext;
    const inner =
        forProperty(descriptorTree)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
    const path = inner.toJsonPointer();
    store.registerField(path, inner);
    const subscribe = useCallback(
        (listener: () => void) => store.subscribe(path, listener),
        [store, path]
    );
    const getSnapshot = useCallback(
        () => store.getFieldState(path),
        [store, path]
    );
    const fieldState = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot
    );
    const onChange = useCallback(
        (value: any) => {
            store.setFieldValue(
                path,
                value,
                options.createMissingStructure !== false
            );
            void triggerValidation?.(false);
        },
        [store, path, options.createMissingStructure, triggerValidation]
    );
    const onBlur = useCallback(
        () => store.updateFieldState(path, { touched: true }),
        [store, path]
    );
    return {
        ...fieldState,
        onChange,
        onBlur,
        setValue: onChange,
        schema: inner.getSchema()
    };
}

/** Resolve type:variant first, falling back to the base type. */
export function resolveRenderer(
    config: FormSystemConfig | null,
    schema: SchemaBuilder<any, any, any, any>,
    variant?: string
): FieldRenderer | undefined {
    if (!config?.renderers) return undefined;
    const type = getSchemaType(schema);
    return (
        (variant ? config.renderers[`${type}:${variant}`] : undefined) ??
        config.renderers[type]
    );
}
