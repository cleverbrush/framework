import { object, string, number, boolean } from '@cleverbrush/schema';
import {
    useSchemaForm,
    Field,
    FormSystemProvider
} from '@cleverbrush/react-form';
import { htmlRenderers, ValidationSummary } from '../renderers';

/**
 * Example 1: Basic Contact Form
 *
 * Demonstrates:
 * - Simple string/number fields with required validation
 * - FormSystemProvider renderer registration
 * - <Field> auto-rendering by schema type
 * - submit() with validation result
 * - reset() to clear form
 * - Validation runs on every field change — errors appear immediately
 * - Root-level schema errors shown in ValidationSummary
 */

const ContactSchema = object({
    firstName: string(),
    lastName: string(),
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
                errors: [{ message: 'Please enter a valid email address' }]
            };
        }
        return { valid: true };
    }),
    age: number().optional(),
    subscribeToNewsletter: boolean().optional()
});

export function BasicContactForm() {
    const form = useSchemaForm(ContactSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            alert(`Form submitted!\n${JSON.stringify(result.object, null, 2)}`);
        }
    };

    const handleReset = () => {
        form.reset();
    };

    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <div className="example">
                <h2>1. Basic Contact Form</h2>
                <p className="description">
                    Simple form with string, number, and boolean fields. Uses{' '}
                    <code>&lt;Field&gt;</code> with auto-rendering from{' '}
                    <code>FormSystemProvider</code>. Validation runs on every
                    field change.
                </p>

                <ValidationSummary rootErrors={form.rootErrors} />

                <div className="form-grid">
                    <label>
                        First Name
                        <Field selector={(t) => t.firstName} form={form} />
                    </label>

                    <label>
                        Last Name
                        <Field selector={(t) => t.lastName} form={form} />
                    </label>

                    <label>
                        Email
                        <Field selector={(t) => t.email} form={form} />
                    </label>

                    <label>
                        Age
                        <Field selector={(t) => t.age} form={form} />
                    </label>

                    <label className="checkbox-label">
                        <Field
                            selector={(t) => t.subscribeToNewsletter}
                            form={form}
                        />
                        Subscribe to newsletter
                    </label>
                </div>

                <div className="button-group">
                    <button className="btn-primary" onClick={handleSubmit}>
                        Submit
                    </button>
                    <button className="btn-secondary" onClick={handleReset}>
                        Reset
                    </button>
                </div>
            </div>
        </FormSystemProvider>
    );
}
