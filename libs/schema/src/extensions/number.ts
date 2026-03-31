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
import { defineExtension } from '../extension.js';
import { resolveErrorMessage } from './util.js';

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
