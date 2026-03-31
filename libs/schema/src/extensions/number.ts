/**
 * Built-in number extensions for `@cleverbrush/schema`.
 *
 * Provides common number validators: {@link numberExtensions | positive},
 * {@link numberExtensions | negative}, {@link numberExtensions | finite},
 * and {@link numberExtensions | multipleOf}.
 *
 * These are pre-applied in the default `@cleverbrush/schema` import.
 * Import from `@cleverbrush/schema/core` to get bare builders without these extensions.
 *
 * @module
 */
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { defineExtension } from '../extension.js';
import { resolveErrorMessage } from './util.js';

// ---------------------------------------------------------------------------
// Public interface — carries JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/** Return type shared by every method on {@link NumberBuiltinExtensions}. */
type NumberExtReturn<T extends number = number> = NumberSchemaBuilder<
    T,
    true,
    NumberBuiltinExtensions<T>
> &
    NumberBuiltinExtensions<T> &
    HiddenExtensionMethods;

/**
 * Methods added to `NumberSchemaBuilder` by the built-in number extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * `numberExtensions` so that JSDoc survives into the published `.d.ts`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the `FixedMethods` mapped type (conditional `infer` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface NumberBuiltinExtensions<T extends number = number> {
    /**
     * Validates that the number is strictly greater than zero.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the positive validator applied
     *
     * @example
     * ```ts
     * number().positive();
     * number().positive('Must be greater than zero');
     * ```
     */
    positive(
        errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
    ): NumberExtReturn<T>;

    /**
     * Validates that the number is strictly less than zero.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the negative validator applied
     *
     * @example
     * ```ts
     * number().negative();
     * number().negative('Must be below zero');
     * ```
     */
    negative(
        errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
    ): NumberExtReturn<T>;

    /**
     * Validates that the number is finite (rejects `Infinity` and `-Infinity`).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the finite validator applied
     *
     * @example
     * ```ts
     * number().finite();
     * number().finite('No infinities allowed');
     * ```
     */
    finite(
        errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
    ): NumberExtReturn<T>;

    /**
     * Validates that the number is an exact multiple of `n`.
     *
     * Uses a relative tolerance of `1e-10` for float-safe comparison.
     *
     * @param n - the divisor to check against
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the multipleOf validator applied
     *
     * @example
     * ```ts
     * number().multipleOf(5);
     * number().multipleOf(0.1, 'Must be a multiple of 0.1');
     * ```
     */
    multipleOf(
        n: number,
        errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
    ): NumberExtReturn<T>;
}

/**
 * Extension descriptor that adds common number validators
 * to `NumberSchemaBuilder`.
 *
 * Included methods: `positive`, `negative`, `finite`, `multipleOf`.
 *
 * @example
 * ```ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { numberExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(numberExtensions);
 * const schema = s.number().positive().multipleOf(5);
 * ```
 */
export const numberExtensions = defineExtension({
    number: {
        /**
         * Validates that the number is strictly greater than zero.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the positive validator applied
         *
         * @example
         * ```ts
         * number().positive();
         * number().positive('Must be greater than zero');
         * ```
         */
        positive(
            this: NumberSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
        ) {
            return this.withExtension('positive', true).addValidator(
                async (val) => {
                    const valid = val > 0;
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must be a positive number',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that the number is strictly less than zero.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the negative validator applied
         *
         * @example
         * ```ts
         * number().negative();
         * number().negative('Must be below zero');
         * ```
         */
        negative(
            this: NumberSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
        ) {
            return this.withExtension('negative', true).addValidator(
                async (val) => {
                    const valid = val < 0;
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must be a negative number',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that the number is finite (rejects `Infinity` and `-Infinity`).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the finite validator applied
         *
         * @example
         * ```ts
         * number().finite();
         * number().finite('No infinities allowed');
         * ```
         */
        finite(
            this: NumberSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
        ) {
            return this.withExtension('finite', true).addValidator(
                async (val) => {
                    const valid = Number.isFinite(val);
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must be a finite number',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that the number is an exact multiple of `n`.
         *
         * Uses a relative tolerance of `1e-10` for float-safe comparison.
         *
         * @param n - the divisor to check against
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the multipleOf validator applied
         *
         * @example
         * ```ts
         * number().multipleOf(5);
         * number().multipleOf(0.1, 'Must be a multiple of 0.1');
         * ```
         */
        multipleOf(
            this: NumberSchemaBuilder,
            n: number,
            errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
        ) {
            return this.withExtension('multipleOf', n).addValidator(
                async (val) => {
                    const remainder = Math.abs(val % n);
                    const tolerance = Math.abs(n) * 1e-10;
                    const valid =
                        remainder < tolerance ||
                        Math.abs(remainder - Math.abs(n)) < tolerance;
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        `must be a multiple of ${n}`,
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        }
    }
});
