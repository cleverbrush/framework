import { highlightTS } from '@/lib/highlight';

export default function ValidationSection() {
    return (
        <div className="card">
            <h2>Validation</h2>
            <a href="/playground/validation-errors" className="playground-link">
                ▶ Open in Playground
            </a>

            <h3>Basic Validation</h3>
            <p>
                Every schema has two validation methods:{' '}
                <code>.validate(data)</code> (synchronous) and{' '}
                <code>.validateAsync(data)</code> (asynchronous). Use{' '}
                <code>.validate()</code> by default — it returns a result with{' '}
                <code>valid</code>, <code>errors</code>, and the cleaned{' '}
                <code>object</code>. Switch to <code>.validateAsync()</code>{' '}
                only when your schema includes async validators or
                preprocessors. For object schemas, the result also includes a{' '}
                <code>getErrorsFor()</code> method for per-property error
                inspection — the flat <code>errors</code> array is{' '}
                <strong>deprecated</strong> on object schema results and will be
                removed in a future major version.
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const result = UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  isActive: true
});

if (result.valid) {
  console.log('Validated:', result.object);
} else {
  // Use getErrorsFor() for per-property error inspection (see below)
  const nameErrors = result.getErrorsFor(u => u.name);
  console.log(nameErrors.errors); // ['...']
}

// Use validateAsync() when your schema has async validators/preprocessors
// const asyncResult = await UserSchema.validateAsync({ ... });`)
                    }}
                />
            </pre>

            <h3>Per-Property Errors (Recommended)</h3>
            <p>
                Use <code>getErrorsFor()</code> with a PropertyDescriptor
                selector to get errors for a specific field — perfect for
                showing inline form errors.{' '}
                <strong>
                    This is the recommended way to inspect validation errors on
                    object schemas
                </strong>{' '}
                and replaces the deprecated <code>errors</code> array on object
                schema validation results. It returns an object with{' '}
                <code>isValid</code> (boolean), <code>errors</code> (array of
                error strings), and <code>seenValue</code> (the value that was
                validated).
            </p>
            <p>
                Pass <code>{'{ doNotStopOnFirstError: true }'}</code> to{' '}
                <code>.validate()</code> to collect <strong>all</strong> errors
                at once, instead of stopping at the first failure:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const result = UserSchema.validate(
  { name: 'A', email: '', age: -5, isActive: true },
  { doNotStopOnFirstError: true }
);

// Get errors for a top-level property
const nameErrors = result.getErrorsFor(t => t.name);
console.log(nameErrors.isValid);    // false
console.log(nameErrors.errors);     // ['Name must be at least 2 characters']
console.log(nameErrors.seenValue);  // 'A'

// Get errors for a nested property (e.g. address.city)
// const cityErrors = result.getErrorsFor(t => t.address.city);
// console.log(cityErrors.isValid);  // true or false
// console.log(cityErrors.errors);   // array of error strings`)
                    }}
                />
            </pre>

            <h3>Custom Error Messages</h3>
            <a
                href="/playground/custom-error-messages"
                className="playground-link"
            >
                ▶ Open in Playground
            </a>
            <p>
                Every constraint method accepts an optional second argument for
                a custom error message. This lets you provide user-friendly
                messages instead of the default generic ones:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// String constraints with custom messages
const NameSchema = string()
  .minLength(2, 'Name must be at least 2 characters')
  .maxLength(100, 'Name cannot exceed 100 characters');

// Number constraints with custom messages
const AgeSchema = number()
  .min(0, 'Age cannot be negative')
  .max(150, 'Age seems unrealistic');

// Array constraints with custom messages
const TagsSchema = array(string())
  .minLength(1, 'At least one tag is required')
  .maxLength(10, 'No more than 10 tags allowed');`)
                    }}
                />
            </pre>

            <h3>Custom Validators</h3>
            <a href="/playground/custom-validators" className="playground-link">
                ▶ Open in Playground
            </a>
            <p>
                Add custom synchronous or asynchronous validators to any schema.
                They receive the value and must return an object with{' '}
                <code>valid</code> (boolean) and optionally <code>errors</code>{' '}
                (array of <code>{'{ message: string }'}</code>):
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const EmailSchema = string()
  .minLength(5, 'Email is too short')
  .addValidator(async (value) => {
    // Example: check against an API
    if (value === 'taken@example.com') {
      return {
        valid: false,
        errors: [{ message: 'This email is already registered' }]
      };
    }
    return { valid: true };
  });

// Use validateAsync() because the validator is async
const result = await EmailSchema.validateAsync('taken@example.com');
console.log(result.valid);  // false
console.log(result.errors); // [{ message: 'This email is already registered' }]`)
                    }}
                />
            </pre>
        </div>
    );
}
