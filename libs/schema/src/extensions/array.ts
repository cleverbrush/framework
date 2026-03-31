/**
 * Built-in array extensions for `@cleverbrush/schema`.
 *
 * Provides common array validators: {@link arrayExtensions | nonempty}
 * and {@link arrayExtensions | unique}.
 *
 * These are pre-applied in the default `@cleverbrush/schema` import.
 * Import from `@cleverbrush/schema/core` to get bare builders without these extensions.
 *
 * @module
 */
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import { defineExtension } from '../extension.js';
import { resolveErrorMessage } from './util.js';

/**
 * Extension descriptor that adds common array validators
 * to `ArraySchemaBuilder`.
 *
 * Included methods: `nonempty`, `unique`.
 *
 * @example
 * ```ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { arrayExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(arrayExtensions);
 * const schema = s.array().nonempty().unique();
 * ```
 */
export const arrayExtensions = defineExtension({
    array: {
        /**
         * Validates that the array contains at least one element.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the nonempty validator applied
         *
         * @example
         * ```ts
         * array().nonempty();
         * array().nonempty('At least one item required');
         * ```
         */
        nonempty(
            this: ArraySchemaBuilder<any>,
            errorMessage?: ValidationErrorMessageProvider<
                ArraySchemaBuilder<any>
            >
        ) {
            return this.withExtension('nonempty', true).addValidator(
                async (val: unknown[]) => {
                    const valid = val.length > 0;
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must not be empty',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that all elements in the array are unique.
         *
         * For primitive elements, uses strict equality. For objects, pass a `keyFn`
         * that extracts a comparison key from each element.
         *
         * @param keyFn - optional function to extract a comparison key from each element
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the unique validator applied
         *
         * @example
         * ```ts
         * array().unique();
         * array().unique((item) => item.id);
         * array().unique(undefined, 'No duplicates allowed');
         * ```
         */
        unique(
            this: ArraySchemaBuilder<any>,
            keyFn?: (item: any) => unknown,
            errorMessage?: ValidationErrorMessageProvider<
                ArraySchemaBuilder<any>
            >
        ) {
            const meta = keyFn ?? true;

            return this.withExtension('unique', meta).addValidator(
                async (val: unknown[]) => {
                    const seen = new Set();
                    for (const item of val) {
                        const key = keyFn ? keyFn(item) : item;
                        if (seen.has(key)) {
                            const msg = await resolveErrorMessage(
                                errorMessage,
                                'must contain unique elements',
                                val,
                                this
                            );
                            return {
                                valid: false,
                                errors: [{ message: msg }]
                            };
                        }
                        seen.add(key);
                    }
                    return { valid: true, errors: [] };
                }
            );
        }
    }
});
