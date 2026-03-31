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
import type {
    SchemaBuilder,
    ValidationErrorMessageProvider
} from '../builders/SchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { defineExtension } from '../extension.js';
import { resolveErrorMessage } from './util.js';

// ---------------------------------------------------------------------------
// Public interface — carries JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/** Return type shared by every method on {@link ArrayBuiltinExtensions}. */
type ArrayExtReturn<
    TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<
        any,
        any,
        any
    >
> = ArraySchemaBuilder<
    TElementSchema,
    true,
    undefined,
    ArrayBuiltinExtensions<TElementSchema>
> &
    ArrayBuiltinExtensions<TElementSchema> &
    HiddenExtensionMethods;

/**
 * Methods added to `ArraySchemaBuilder` by the built-in array extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * `arrayExtensions` so that JSDoc survives into the published `.d.ts`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the `FixedMethods` mapped type (conditional `infer` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface ArrayBuiltinExtensions<
    TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<
        any,
        any,
        any
    >
> {
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
        errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>
    ): ArrayExtReturn<TElementSchema>;

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
        keyFn?: (item: any) => unknown,
        errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>
    ): ArrayExtReturn<TElementSchema>;
}

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
                (val: unknown[]) => {
                    const valid = val.length > 0;
                    if (valid) return { valid: true, errors: [] };
                    const msg = resolveErrorMessage(
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
                (val: unknown[]) => {
                    const seen = new Set();
                    for (const item of val) {
                        const key = keyFn ? keyFn(item) : item;
                        if (seen.has(key)) {
                            const msg = resolveErrorMessage(
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
