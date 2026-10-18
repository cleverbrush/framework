import { object, string, type ValidationResult } from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import { useSchemaForm } from './hooks.js';
import type { FormSubmitOptions, UseSchemaFormOptions } from './types.js';

const schema = object({ name: string() });
test('blur and invalid-submit options preserve public value types', () => {
    const options: UseSchemaFormOptions = { validateOnBlur: true };
    const form = useSchemaForm(schema, options);
    form.handleSubmit(
        values => {
            expectTypeOf(values).toEqualTypeOf<{ name: string }>();
        },
        {
            onInvalid: async result => {
                expectTypeOf(result).toEqualTypeOf<
                    ValidationResult<{ name: string }>
                >();
            }
        }
    );
    const invalidOptions: UseSchemaFormOptions = {
        // @ts-expect-error Blur validation is an opt-in boolean.
        validateOnBlur: 'always'
    };
    const wrongCallback: FormSubmitOptions<{ name: string }> = {
        // @ts-expect-error Invalid validation still carries the schema's value type.
        onInvalid: (_result: ValidationResult<{ count: number }>) => {}
    };
    void invalidOptions;
    void wrongCallback;
});
