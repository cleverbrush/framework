import type {
    InferType,
    ObjectSchemaBuilder,
    PropertyDescriptor,
    PropertyDescriptorTree,
    SchemaBuilder
} from '@cleverbrush/schema';
import type React from 'react';
import { useContext, useMemo } from 'react';
import { FormContext, FormSystemContext } from './contexts.js';
import { getSchemaType } from './helpers.js';
import type { SchemaFormInstance } from './hooks.js';
import { resolveRenderer, useFieldFromContext } from './hooks.js';
import type {
    FieldRenderer,
    FormSystemConfig,
    UseFieldResult
} from './types.js';

// ─── FormSystemProvider ──────────────────────────────────────────────────────

export type FormSystemProviderProps = {
    /**
     * Renderer registry mapping schema types to renderer functions.
     * Example: `{ string: (props) => <input .../>, number: (props) => <input type="number" .../> }`
     */
    renderers?: Record<string, FieldRenderer>;
    /**
     * Full configuration object (for future extensibility).
     * If both `renderers` and `config.renderers` are provided, `renderers` takes precedence.
     */
    config?: FormSystemConfig;
    children: React.ReactNode;
};

/**
 * Provides global renderer configuration via React Context.
 * Supports nesting — inner provider overrides outer.
 *
 * @example
 * ```tsx
 * <FormSystemProvider renderers={htmlRenderers}>
 *   <App />
 * </FormSystemProvider>
 * ```
 */
export function FormSystemProvider({
    renderers,
    config,
    children
}: FormSystemProviderProps): React.ReactNode {
    const parentConfig = useContext(FormSystemContext);

    const resolvedConfig: FormSystemConfig = useMemo(() => {
        const current: FormSystemConfig = {
            ...config,
            renderers: {
                ...config?.renderers,
                ...renderers
            }
        };
        if (!parentConfig) return current;
        return {
            ...parentConfig,
            ...current,
            renderers: {
                ...parentConfig.renderers,
                ...current.renderers
            }
        };
    }, [parentConfig, config, renderers]);

    return (
        <FormSystemContext.Provider value={resolvedConfig}>
            {children}
        </FormSystemContext.Provider>
    );
}

// ─── FormProvider ────────────────────────────────────────────────────────────

export type FormProviderProps<
    TSchema extends ObjectSchemaBuilder<any, any, any>
> = {
    form: SchemaFormInstance<TSchema>;
    children: React.ReactNode;
};

/**
 * Provides form context to children so they can use the context-based useField.
 */
export function FormProvider<
    TSchema extends ObjectSchemaBuilder<any, any, any>
>({ form, children }: FormProviderProps<TSchema>): React.ReactNode {
    const formContext = form._getFormContext();
    return (
        <FormContext.Provider value={formContext}>
            {children}
        </FormContext.Provider>
    );
}

// ─── Context-based useField ──────────────────────────────────────────────────

/**
 * Context-based useField — can be used inside a FormProvider.
 * For best IntelliSense, prefer `form.useField()` which infers field types from the schema.
 * When using this context-based version, specify the schema type explicitly:
 *
 * @example
 * ```tsx
 * const name = useField<typeof MySchema>((t) => t.name);
 * ```
 */
export function useField<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertySchema extends SchemaBuilder<any, any> = SchemaBuilder<any, any>
>(
    forProperty: (
        tree: PropertyDescriptorTree<TSchema, TSchema>
    ) => PropertyDescriptor<TSchema, TPropertySchema, any>
): UseFieldResult<InferType<TPropertySchema>> {
    const formContext = useContext(FormContext);
    if (!formContext) {
        throw new Error(
            'useField must be used within a FormProvider. ' +
                'Wrap your component tree with <FormProvider form={form}>.'
        );
    }
    return useFieldFromContext(formContext, forProperty) as UseFieldResult<
        InferType<TPropertySchema>
    >;
}

// ─── useFormSystem ───────────────────────────────────────────────────────────

/**
 * Hook to access FormSystem configuration.
 */
export function useFormSystem(): FormSystemConfig {
    const config = useContext(FormSystemContext);
    if (!config) {
        throw new Error(
            'useFormSystem must be used within a FormSystemProvider'
        );
    }
    return config;
}

// ─── Field Component ─────────────────────────────────────────────────────────

export type FieldProps<TSchema extends ObjectSchemaBuilder<any, any, any>> = {
    forProperty: (
        tree: PropertyDescriptorTree<TSchema, TSchema>
    ) => PropertyDescriptor<TSchema, any, any>;
    form: SchemaFormInstance<TSchema>;
    renderer?: FieldRenderer;
    /**
     * Rendering variant hint. Participates in renderer resolution:
     * the registry is checked for `"type:variant"` (e.g. `"string:password"`)
     * before falling back to the base `"type"` key.
     * Also forwarded to the renderer via `FieldRenderProps.variant`.
     */
    variant?: string;
    /** Visible label text forwarded to the renderer via `FieldRenderProps.label`. */
    label?: string;
    /** HTML `name` attribute forwarded to the renderer via `FieldRenderProps.name`. */
    name?: string;
    /**
     * Bag of extra renderer-specific props forwarded to the renderer via
     * `FieldRenderProps.fieldProps` (e.g. `placeholder`, `autoComplete`).
     */
    fieldProps?: Record<string, unknown>;
};

/**
 * UI-agnostic Field component.
 *
 * Resolves a renderer from:
 * 1. Explicit `renderer` prop
 * 2. FormSystemProvider registry — checked for `"type:variant"` first,
 *    then for the base `"type"`
 *
 * All rendering hints (`variant`, `label`, `name`, `fieldProps`) are
 * forwarded to the resolved renderer via `FieldRenderProps`.
 *
 * @example
 * ```tsx
 * <Field forProperty={(t) => t.password} form={form}
 *        variant="password" label="Password"
 *        fieldProps={{ placeholder: "Enter password", autoComplete: "current-password" }} />
 * ```
 */
export function Field<TSchema extends ObjectSchemaBuilder<any, any, any>>({
    forProperty,
    form,
    renderer,
    variant,
    label,
    name,
    fieldProps
}: FieldProps<TSchema>): React.ReactNode {
    const fieldResult = form.useField(forProperty);
    const systemConfig = useContext(FormSystemContext);

    const resolvedRenderer =
        renderer ?? resolveRenderer(systemConfig, fieldResult.schema, variant);

    if (!resolvedRenderer) {
        const schemaType = getSchemaType(fieldResult.schema);
        const tried = variant
            ? `"${schemaType}:${variant}" or "${schemaType}"`
            : `"${schemaType}"`;
        throw new Error(
            `No renderer found for schema type ${tried}. ` +
                'Provide a renderer prop or configure one in FormSystemProvider.'
        );
    }

    return resolvedRenderer({
        value: fieldResult.value,
        initialValue: fieldResult.initialValue,
        dirty: fieldResult.dirty,
        touched: fieldResult.touched,
        error: fieldResult.error,
        validating: fieldResult.validating,
        onChange: fieldResult.onChange,
        onBlur: fieldResult.onBlur,
        setValue: fieldResult.setValue,
        schema: fieldResult.schema,
        variant,
        label,
        name,
        fieldProps
    });
}
