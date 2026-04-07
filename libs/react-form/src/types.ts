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
    schema: SchemaBuilder<any, any, any>;
    /**
     * Rendering variant hint passed from the `Field` component.
     * Used by renderers to select a sub-variant of the base schema type
     * (e.g. `"password"` for a string field rendered as a password input).
     *
     * Also participates in renderer resolution: when set, the renderer
     * registry is first checked for `"type:variant"` (e.g. `"string:password"`)
     * before falling back to the base `"type"` key.
     *
     * @example
     * ```tsx
     * <Field forProperty={(t) => t.secret} form={form} variant="password" />
     * ```
     */
    variant?: string;
    /**
     * Visible label text forwarded from the `Field` component.
     * Renderers can use this to render a `<label>` element.
     *
     * @example
     * ```tsx
     * <Field forProperty={(t) => t.name} form={form} label="Full name" />
     * ```
     */
    label?: string;
    /**
     * HTML `name` attribute forwarded from the `Field` component.
     * Renderers can apply this to the underlying input for `FormData` submission.
     *
     * @example
     * ```tsx
     * <Field forProperty={(t) => t.email} form={form} name="email" />
     * ```
     */
    name?: string;
    /**
     * Bag of extra renderer-specific props forwarded from the `Field` component.
     * Useful for passing HTML attributes (`placeholder`, `autoComplete`, `type`)
     * or UI-library-specific options without extending `FieldRenderProps` itself.
     *
     * @example
     * ```tsx
     * <Field
     *   forProperty={(t) => t.email}
     *   form={form}
     *   fieldProps={{ placeholder: "you@example.com", autoComplete: "email" }}
     * />
     * ```
     */
    fieldProps?: Record<string, unknown>;
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
    schema: SchemaBuilder<any, any, any>;
};

/**
 * Options for useSchemaForm.
 */
export type UseSchemaFormOptions = {
    createMissingStructure?: boolean;
    /**
     * When `true`, runs full schema validation on mount and marks all fields
     * as touched so that error messages (e.g. for required fields) are visible
     * immediately without waiting for user interaction.
     *
     * @default false
     */
    validateOnMount?: boolean;
    /**
     * Debounce delay in milliseconds for onChange-triggered validation.
     * When set, rapid field changes only trigger one validation run after
     * the user stops typing for the specified duration.
     *
     * Explicit calls to `form.validate()`, `form.submit()`, and
     * `validateOnMount` are **not** debounced — they always run immediately.
     *
     * @example
     * ```tsx
     * const form = useSchemaForm(Schema, { validationDebounceMs: 300 });
     * ```
     */
    validationDebounceMs?: number;
};
