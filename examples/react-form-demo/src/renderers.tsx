import { FieldRenderProps } from '@cleverbrush/react-form';

/**
 * Plain HTML renderers for each schema type.
 * These map schema types (string, number, boolean) to React components.
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
        touched,
        dirty
    }: FieldRenderProps) => (
        <div className="field">
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={touched && error ? 'input-error' : ''}
            />
            {dirty && <span className="dirty-indicator">*</span>}
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),

    number: ({
        value,
        onChange,
        onBlur,
        error,
        touched,
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
                className={touched && error ? 'input-error' : ''}
            />
            {dirty && <span className="dirty-indicator">*</span>}
            {touched && error && <span className="error">{error}</span>}
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
