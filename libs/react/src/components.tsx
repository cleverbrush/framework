import React, { useContext, useMemo } from 'react';
import { FormSystemContext, FormContext } from './contexts.js';
import type { FormContextValue } from './contexts.js';
import type { FormSystemConfig, FieldRenderer } from './types.js';
import type {
    ObjectSchemaBuilder,
    PropertyDescriptorTree,
    PropertyDescriptor,
    SchemaBuilder
} from '@cleverbrush/schema';
import type { SchemaFormInstance } from './hooks.js';
import { useFieldFromContext, resolveRenderer } from './hooks.js';
import type { UseFieldResult } from './types.js';
import { getSchemaType } from './helpers.js';

// ─── FormSystemProvider ──────────────────────────────────────────────────────

export type FormSystemProviderProps = {
    config: FormSystemConfig;
    children: React.ReactNode;
};

/**
 * Provides global renderer configuration via React Context.
 * Supports nesting — inner provider overrides outer.
 */
export function FormSystemProvider({
    config,
    children
}: FormSystemProviderProps): React.ReactNode {
    const parentConfig = useContext(FormSystemContext);

    const mergedConfig = useMemo(() => {
        if (!parentConfig) return config;
        return {
            ...parentConfig,
            ...config,
            renderers: {
                ...parentConfig.renderers,
                ...config.renderers
            }
        };
    }, [parentConfig, config]);

    return (
        <FormSystemContext.Provider value={mergedConfig}>
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
 */
export function useField<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertySchema extends SchemaBuilder<any, any>
>(
    selector: (
        tree: PropertyDescriptorTree<TSchema, TSchema>
    ) => PropertyDescriptor<TSchema, TPropertySchema, any>
): UseFieldResult {
    const formContext = useContext(FormContext);
    if (!formContext) {
        throw new Error(
            'useField must be used within a FormProvider. ' +
                'Wrap your component tree with <FormProvider form={form}>.'
        );
    }
    return useFieldFromContext(formContext, selector);
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

export type FieldProps<
    TSchema extends ObjectSchemaBuilder<any, any, any> = any
> = {
    selector: (
        tree: PropertyDescriptorTree<TSchema, TSchema>
    ) => PropertyDescriptor<TSchema, any, any>;
    form: SchemaFormInstance<TSchema>;
    renderer?: FieldRenderer;
};

/**
 * UI-agnostic Field component.
 * Resolves renderer from:
 * 1. Explicit renderer prop
 * 2. FormSystemProvider registry (by schema type)
 */
export function Field<TSchema extends ObjectSchemaBuilder<any, any, any>>({
    selector,
    form,
    renderer
}: FieldProps<TSchema>): React.ReactNode {
    const fieldResult = form.useField(selector);
    const systemConfig = useContext(FormSystemContext);

    const resolvedRenderer =
        renderer ?? resolveRenderer(systemConfig, fieldResult.schema);

    if (!resolvedRenderer) {
        throw new Error(
            `No renderer found for schema type "${getSchemaType(fieldResult.schema)}". ` +
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
        schema: fieldResult.schema
    });
}
