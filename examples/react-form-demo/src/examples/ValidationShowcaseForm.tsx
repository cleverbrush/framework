import { object, string, number } from '@cleverbrush/schema';
import {
    useSchemaForm,
    Field,
    FormSystemProvider
} from '@cleverbrush/react-form';
import { htmlRenderers } from '../renderers';

/**
 * Example 2: Validation Showcase
 *
 * Demonstrates:
 * - Custom sync/async validators on individual fields
 * - Min-length, regex, and range validation
 * - Error messages flowing from schema to Field renderers via getErrorsFor
 * - Validation runs automatically on every field change
 * - Validation errors displayed inline per field
 */

const SignupSchema = object({
    username: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.length < 3) {
            return {
                valid: false,
                errors: [
                    { message: 'Username must be at least 3 characters long' }
                ]
            };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            return {
                valid: false,
                errors: [
                    {
                        message:
                            'Username can only contain letters, numbers, and underscores'
                    }
                ]
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
    password: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.length < 8) {
            return {
                valid: false,
                errors: [
                    { message: 'Password must be at least 8 characters long' }
                ]
            };
        }
        if (!/[A-Z]/.test(val)) {
            return {
                valid: false,
                errors: [
                    {
                        message:
                            'Password must contain at least one uppercase letter'
                    }
                ]
            };
        }
        if (!/[0-9]/.test(val)) {
            return {
                valid: false,
                errors: [
                    { message: 'Password must contain at least one number' }
                ]
            };
        }
        return { valid: true };
    }),
    age: number().addValidator(async (val) => {
        if (val === undefined || val === null) {
            return {
                valid: false,
                errors: [{ message: 'Age is required' }]
            };
        }
        if (typeof val !== 'number' || val < 18 || val > 120) {
            return {
                valid: false,
                errors: [{ message: 'Age must be between 18 and 120' }]
            };
        }
        return { valid: true };
    })
});

export function ValidationShowcaseForm() {
    const form = useSchemaForm(SignupSchema);

    const handleValidate = async () => {
        const result = await form.validate();
        if (result.valid) {
            alert('All fields are valid!');
        }
    };

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            alert(`Signup successful!\n${JSON.stringify(result.object, null, 2)}`);
        }
    };

    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <div className="example">
                <h2>2. Validation Showcase</h2>
                <p className="description">
                    Demonstrates various validators: min-length, regex
                    patterns, numeric range. Validation runs on every field
                    change — errors appear immediately as you type.
                </p>

                <div className="form-grid">
                    <label>
                        Username{' '}
                        <small>(min 3 chars, letters/numbers/underscores)</small>
                        <Field selector={(t) => t.username} form={form} />
                    </label>

                    <label>
                        Email <small>(valid format required)</small>
                        <Field selector={(t) => t.email} form={form} />
                    </label>

                    <label>
                        Password{' '}
                        <small>(min 8 chars, 1 uppercase, 1 number)</small>
                        <Field selector={(t) => t.password} form={form} />
                    </label>

                    <label>
                        Age <small>(18–120)</small>
                        <Field selector={(t) => t.age} form={form} />
                    </label>
                </div>

                <div className="button-group">
                    <button className="btn-primary" onClick={handleSubmit}>
                        Sign Up
                    </button>
                    <button className="btn-secondary" onClick={handleValidate}>
                        Validate Only
                    </button>
                </div>
            </div>
        </FormSystemProvider>
    );
}
