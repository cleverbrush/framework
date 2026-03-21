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
 * Return type for useField.
 */
export type UseFieldResult = FieldState & {
    onChange: (value: any) => void;
    onBlur: () => void;
    setValue: (value: any) => void;
    schema: SchemaBuilder<any, any>;
};

/**
 * Options for useSchemaForm.
 */
export type UseSchemaFormOptions = {
    createMissingStructure?: boolean;
};
