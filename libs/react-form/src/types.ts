import type { SchemaBuilder } from '@cleverbrush/schema';
import type { ReactNode } from 'react';

/**
 * A renderer function that receives field state and returns a React node.
 */
export type FieldRenderer = (props: FieldRenderProps) => ReactNode;

/**
 * Props passed to a field renderer.
 */
export type FieldRenderProps = {
    value: any;
    initialValue: any;
    dirty: boolean;
    touched: boolean;
    error: string | undefined;
    validating: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
    setValue: (value: any) => void;
    schema: SchemaBuilder<any, any>;
};

/**
 * Configuration for FormSystemProvider.
 */
export type FormSystemConfig = {
    renderers?: Record<string, FieldRenderer>;
};

/**
 * Field state tracked per-field.
 */
export type FieldState = {
    value: any;
    initialValue: any;
    dirty: boolean;
    touched: boolean;
    error: string | undefined;
    validating: boolean;
};

/**
 * Return type for useField — strongly typed with the inferred property value type.
 * When the value type cannot be inferred, falls back to `any`.
 */
export type UseFieldResult<T = any> = {
    value: T | undefined;
    initialValue: T | undefined;
    dirty: boolean;
    touched: boolean;
    error: string | undefined;
    validating: boolean;
    onChange: (value: T) => void;
    onBlur: () => void;
    setValue: (value: T) => void;
    schema: SchemaBuilder<any, any>;
};

/**
 * Options for useSchemaForm.
 */
export type UseSchemaFormOptions = {
    createMissingStructure?: boolean;
};
