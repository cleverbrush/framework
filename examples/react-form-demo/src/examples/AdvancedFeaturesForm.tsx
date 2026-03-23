import { object, string } from '@cleverbrush/schema';
import {
    useSchemaForm,
    FormProvider,
    useField,
    FormSystemProvider,
    Field
} from '@cleverbrush/react-form';
import type { FieldRenderProps } from '@cleverbrush/react-form';
import { htmlRenderers } from '../renderers';

/**
 * Example 5: FormProvider & Nested Provider Override
 *
 * Demonstrates:
 * - FormProvider for context-based useField()
 * - Nested FormSystemProvider overriding a specific renderer
 * - Custom renderer passed via explicit renderer prop
 * - Validation on every field change
 * - Validation errors displayed inline per field
 */

const FeedbackSchema = object({
    name: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.trim().length === 0) {
            return {
                valid: false,
                errors: [{ message: 'Name is required' }]
            };
        }
        return { valid: true };
    }),
    email: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string') {
            return {
                valid: false,
                errors: [{ message: 'Email is required' }]
            };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            return {
                valid: false,
                errors: [{ message: 'Invalid email format' }]
            };
        }
        return { valid: true };
    }),
    subject: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.trim().length === 0) {
            return {
                valid: false,
                errors: [{ message: 'Subject is required' }]
            };
        }
        return { valid: true };
    }),
    message: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.trim().length < 10) {
            return {
                valid: false,
                errors: [
                    { message: 'Message must be at least 10 characters long' }
                ]
            };
        }
        return { valid: true };
    })
});

/**
 * A custom renderer that displays as a textarea with a blue border.
 */
const textareaRenderer = ({
    value,
    onChange,
    onBlur,
    error
}: FieldRenderProps) => (
    <div className="field">
        <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`custom-textarea ${error ? 'input-error' : ''}`}
            rows={4}
            placeholder="Write your message here..."
        />
        {error && <span className="error">{error}</span>}
    </div>
);

/**
 * A custom "fancy" string renderer used to override the default string renderer
 * in a nested FormSystemProvider.
 */
const fancyStringRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    dirty
}: FieldRenderProps) => (
    <div className="field fancy-field">
        <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={error ? 'input-error' : ''}
        />
        {dirty && <span className="dirty-indicator">✏️</span>}
        {error && <span className="error">{error}</span>}
    </div>
);

/**
 * A child component that uses the context-based useField() hook
 * (no form prop needed — reads from FormProvider).
 */
function NameFieldViaContext() {
    const name = useField((t: any) => t.name);

    return (
        <label>
            Name <small>(via context-based useField)</small>
            <div className="field context-field">
                <input
                    type="text"
                    value={name.value ?? ''}
                    onChange={(e) => name.onChange(e.target.value)}
                    onBlur={name.onBlur}
                    className={name.error ? 'input-error' : ''}
                    placeholder="Your name (from useField context)"
                />
                {name.error && (
                    <span className="error">{name.error}</span>
                )}
            </div>
        </label>
    );
}

export function AdvancedFeaturesForm() {
    const form = useSchemaForm(FeedbackSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            alert(
                `Feedback sent!\n${JSON.stringify(result.object, null, 2)}`
            );
        }
    };

    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <div className="example">
                <h2>5. Advanced Features</h2>
                <p className="description">
                    Shows FormProvider context, nested provider overrides,
                    and custom explicit renderers. Validation runs on every
                    field change.
                </p>

                <div className="form-grid">
                    {/* Section 1: FormProvider — useField via context */}
                    <div className="section-box">
                        <h3>Context-based useField (FormProvider)</h3>
                        <FormProvider form={form}>
                            <NameFieldViaContext />
                        </FormProvider>
                    </div>

                    {/* Section 2: Standard Field with default renderers */}
                    <label>
                        Email{' '}
                        <small>(standard renderer from provider)</small>
                        <Field selector={(t) => t.email} form={form} />
                    </label>

                    {/* Section 3: Nested provider override */}
                    <div className="section-box">
                        <h3>Nested Provider Override</h3>
                        <p className="description">
                            The subject field uses a "fancy" string renderer
                            from a nested <code>FormSystemProvider</code>.
                        </p>
                        <FormSystemProvider
                            renderers={{ string: fancyStringRenderer }}
                        >
                            <label>
                                Subject{' '}
                                <small>(fancy renderer via override)</small>
                                <Field
                                    selector={(t) => t.subject}
                                    form={form}
                                />
                            </label>
                        </FormSystemProvider>
                    </div>

                    {/* Section 4: Explicit renderer prop */}
                    <label>
                        Message{' '}
                        <small>(explicit textarea renderer prop)</small>
                        <Field
                            selector={(t) => t.message}
                            form={form}
                            renderer={textareaRenderer}
                        />
                    </label>
                </div>

                <div className="button-group">
                    <button className="btn-primary" onClick={handleSubmit}>
                        Send Feedback
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => form.reset()}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </FormSystemProvider>
    );
}
