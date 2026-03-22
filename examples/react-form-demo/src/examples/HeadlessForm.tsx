import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm } from '@cleverbrush/react-form';


/**
 * Example 4: Headless Form (useField)
 *
 * Demonstrates:
 * - Using form.useField() directly without <Field> or FormSystemProvider
 * - Full control over rendering — no renderer registry needed
 * - Field state: value, dirty, touched, error
 * - Programmatic setValue() and getValue()
 * - Validation runs on every field change — errors appear as you type
 * - Validation errors displayed inline per field
 */

const ProfileSchema = object({
    displayName: string().addValidator(async (val) => {
        if (!val || typeof val !== 'string' || val.trim().length === 0) {
            return {
                valid: false,
                errors: [{ message: 'Display name is required' }]
            };
        }
        if (val.length > 50) {
            return {
                valid: false,
                errors: [
                    { message: 'Display name must be 50 characters or less' }
                ]
            };
        }
        return { valid: true };
    }),
    bio: string().addValidator(async (val) => {
        if (val && typeof val === 'string' && val.length > 200) {
            return {
                valid: false,
                errors: [{ message: 'Bio must be 200 characters or less' }]
            };
        }
        return { valid: true };
    }),
    website: string().addValidator(async (val) => {
        if (val && typeof val === 'string' && val.trim().length > 0) {
            try {
                new URL(val);
            } catch {
                return {
                    valid: false,
                    errors: [
                        { message: 'Please enter a valid URL (e.g., https://example.com)' }
                    ]
                };
            }
        }
        return { valid: true };
    }),
    age: number().optional()
});

export function HeadlessForm() {
    const form = useSchemaForm(ProfileSchema);

    const displayName = form.useField((t) => t.displayName);
    const bio = form.useField((t) => t.bio);
    const website = form.useField((t) => t.website);
    const age = form.useField((t) => t.age);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            alert(
                `Profile saved!\n${JSON.stringify(result.object, null, 2)}`
            );
        }
    };

    const fillSampleData = () => {
        form.setValue({
            displayName: 'Jane Developer',
            bio: 'Full-stack engineer who loves React and TypeScript',
            website: 'https://janedev.io',
            age: 28
        });
    };

    return (
        <div className="example">
            <h2>4. Headless Form (useField)</h2>
            <p className="description">
                No <code>&lt;Field&gt;</code> component, no{' '}
                <code>FormSystemProvider</code>. Uses{' '}
                <code>form.useField()</code> for full rendering control.
                Validation runs on every field change.
            </p>

            <div className="form-grid">
                <label>
                    Display Name{' '}
                    <small>(required, max 50 chars)</small>
                    <div className="field">
                        <input
                            type="text"
                            value={displayName.value ?? ''}
                            onChange={(e) =>
                                displayName.onChange(e.target.value)
                            }
                            onBlur={displayName.onBlur}
                            className={
                                displayName.error
                                    ? 'input-error'
                                    : ''
                            }
                            placeholder="Enter your display name"
                        />
                        {displayName.dirty && (
                            <span className="dirty-indicator">*</span>
                        )}
                        {displayName.error && (
                            <span className="error">{displayName.error}</span>
                        )}
                    </div>
                </label>

                <label>
                    Bio <small>(optional, max 200 chars)</small>
                    <div className="field">
                        <textarea
                            value={bio.value ?? ''}
                            onChange={(e) => bio.onChange(e.target.value)}
                            onBlur={bio.onBlur}
                            className={
                                bio.error ? 'input-error' : ''
                            }
                            placeholder="Tell us about yourself"
                            rows={3}
                        />
                        {bio.dirty && (
                            <span className="dirty-indicator">*</span>
                        )}
                        {bio.error && (
                            <span className="error">{bio.error}</span>
                        )}
                        <small className="char-count">
                            {(bio.value ?? '').length}/200
                        </small>
                    </div>
                </label>

                <label>
                    Website <small>(optional, must be valid URL)</small>
                    <div className="field">
                        <input
                            type="url"
                            value={website.value ?? ''}
                            onChange={(e) => website.onChange(e.target.value)}
                            onBlur={website.onBlur}
                            className={
                                website.error
                                    ? 'input-error'
                                    : ''
                            }
                            placeholder="https://example.com"
                        />
                        {website.dirty && (
                            <span className="dirty-indicator">*</span>
                        )}
                        {website.error && (
                            <span className="error">{website.error}</span>
                        )}
                    </div>
                </label>

                <label>
                    Age <small>(optional)</small>
                    <div className="field">
                        <input
                            type="number"
                            value={age.value ?? ''}
                            onChange={(e) =>
                                age.onChange(
                                    e.target.value === ''
                                        ? undefined
                                        : Number(e.target.value)
                                )
                            }
                            onBlur={age.onBlur}
                            placeholder="Your age"
                        />
                    </div>
                </label>
            </div>

            <div className="button-group">
                <button className="btn-primary" onClick={handleSubmit}>
                    Save Profile
                </button>
                <button className="btn-secondary" onClick={fillSampleData}>
                    Fill Sample Data
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => form.reset()}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
