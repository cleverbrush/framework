---
'@cleverbrush/schema': major
---

Support property-targeted errors from object-level validators

`ValidationError` now accepts an optional `property` selector that routes
the error to a specific property, making it visible via `getErrorsFor()`.
This uses the same selector signature as `getErrorsFor()` and react-form's
`forProperty`, so no new concepts are introduced.

```typescript
const SignupSchema = object({
    password: string().minLength(8),
    confirmPassword: string().minLength(8)
}).addValidator((value) => {
    if (value.password !== value.confirmPassword) {
        return {
            valid: false,
            errors: [{
                message: 'Passwords do not match',
                property: (t) => t.confirmPassword
            }]
        };
    }
    return { valid: true };
});

const result = SignupSchema.validate(
    { password: 'secret1', confirmPassword: 'secret2' },
    { doNotStopOnFirstError: true }
);

// Error is now routed to the confirmPassword property:
const confirmErrors = result.getErrorsFor((t) => t.confirmPassword);
console.log(confirmErrors.errors); // ['Passwords do not match']

// Other properties are not affected:
const passwordErrors = result.getErrorsFor((t) => t.password);
console.log(passwordErrors.errors); // []
```

Additionally, object-level validator errors are now correctly routed through
`getErrorsFor()` when `doNotStopOnFirstError: true` is used. Previously,
these errors were only present in the flat `errors` array and were invisible
to `getErrorsFor()`.
