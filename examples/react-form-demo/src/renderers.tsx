import { FieldRenderProps } from '@cleverbrush/react-form';

/**
 * Plain HTML renderers for each schema type.
 * These map schema types (string, number, boolean) to React components.
 * Errors are displayed immediately when present (validation runs on every change).
 */
export const htmlRenderers: Record<
    string,
    (props: FieldRenderProps) => React.ReactNode
> = {
    string: ({
        value,
        onChange,
        onBlur,
        error,
        dirty
    }: FieldRenderProps) => (
        <div className="field">
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={error ? 'input-error' : ''}
            />
            {dirty && <span className="dirty-indicator">*</span>}
            {error && <span className="error">{error}</span>}
        </div>
    ),

    number: ({
        value,
        onChange,
        onBlur,
        error,
        dirty
    }: FieldRenderProps) => (
        <div className="field">
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) =>
                    onChange(
                        e.target.value === '' ? undefined : Number(e.target.value)
                    )
                }
                onBlur={onBlur}
                className={error ? 'input-error' : ''}
            />
            {dirty && <span className="dirty-indicator">*</span>}
            {error && <span className="error">{error}</span>}
        </div>
    ),

    boolean: ({ value, onChange, onBlur }: FieldRenderProps) => (
        <div className="field">
            <input
                type="checkbox"
                checked={value ?? false}
                onChange={(e) => onChange(e.target.checked)}
                onBlur={onBlur}
            />
        </div>
    )
};

/**
 * Validation Summary component — displays root-level schema errors
 * that are not associated with specific fields.
 */
export function ValidationSummary({
    rootErrors
}: {
    rootErrors: ReadonlyArray<string>;
}) {
    if (rootErrors.length === 0) return null;

    return (
        <div className="validation-summary">
            <strong>Validation Errors:</strong>
            <ul>
                {rootErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                ))}
            </ul>
        </div>
    );
}
