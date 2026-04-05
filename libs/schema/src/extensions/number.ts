/**
 * Built-in number extensions for `@cleverbrush/schema`.
 *
 * Provides common number validators: {@link numberExtensions | positive},
 * {@link numberExtensions | negative}, {@link numberExtensions | finite},
 * {@link numberExtensions | multipleOf}, and {@link numberExtensions | oneOf}.
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
import type { NullableMethod, NullableReturn } from './nullable.js';
import { validationFail } from './util.js';

// ---------------------------------------------------------------------------
// Public interface — carries JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/** Return type shared by every method on {@link NumberBuiltinExtensions}. */
type NumberExtReturn<T extends number = number> = NumberSchemaBuilder<
    T,
    true,
    false,
    NumberBuiltinExtensions<T>
> &
    NumberBuiltinExtensions<T> &
    NullableMethod<
        NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>>
    > &
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

    /**
     * Constrains the number to one of the specified literal values.
     *
     * Narrows the inferred type from `number` to the union of the
     * provided literals.
     *
     * @param values - the allowed number literals
     * @returns a new schema builder restricted to the given values
     *
     * @example
     * ```ts
     * import { number, InferType } from '@cleverbrush/schema';
     *
     * const priority = number().oneOf(1, 2, 3);
     * type Priority = InferType<typeof priority>; // 1 | 2 | 3
     *
     * priority.validate(1);  // valid
     * priority.validate(4);  // invalid — "must be one of: 1, 2, 3"
     * ```
     */
    oneOf<V extends number>(...values: [V, ...V[]]): NumberExtReturn<V>;

    /**
     * Constrains the number to one of the specified literal values,
     * with a custom error message or factory as the last argument.
     *
     * @example
     * ```ts
     * const priority = number().oneOf(1, 2, 3, 'Priority must be 1, 2, or 3');
     * const priority2 = number().oneOf(1, 2, 3, (val) => `${val} is not a valid priority`);
     * ```
     */
    oneOf<V extends number>(
        ...args: [
            ...[V, ...V[]],
            ValidationErrorMessageProvider<NumberSchemaBuilder>
        ]
    ): NumberExtReturn<V>;

    /**
     * Constrains the number to one of the specified literal values,
     * with an optional custom error message or factory.
     *
     * @param values - the allowed number literals as an array
     * @param errorMessage - optional custom error message or factory function
     * @returns a new schema builder restricted to the given values
     *
     * @example
     * ```ts
     * const priority = number().oneOf([1, 2, 3], 'Must be 1, 2, or 3');
     * ```
     */
    oneOf<V extends number>(
        values: readonly [V, ...V[]],
        errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>
    ): NumberExtReturn<V>;

    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>>
    >;
}

/**
 * Subset of {@link NumberBuiltinExtensions} containing only the `.oneOf()` overloads.
 * Exported for backward compatibility.
 */
export type NumberOneOfExtension = Pick<NumberBuiltinExtensions, 'oneOf'>;

/**
 * Extension descriptor that adds common number validators
 * to `NumberSchemaBuilder`.
 *
 * Included methods: `positive`, `negative`, `finite`, `multipleOf`, `oneOf`.
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
            return this.withExtension('positive', true).addValidator(val => {
                if (typeof val !== 'number')
                    return validationFail(
                        errorMessage,
                        'must be a positive number',
                        val,
                        this
                    );
                const valid = val > 0;
                if (valid) return { valid: true, errors: [] };
                return validationFail(
                    errorMessage,
                    'must be a positive number',
                    val,
                    this
                );
            });
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
            return this.withExtension('negative', true).addValidator(val => {
                if (typeof val !== 'number')
                    return validationFail(
                        errorMessage,
                        'must be a negative number',
                        val,
                        this
                    );
                const valid = val < 0;
                if (valid) return { valid: true, errors: [] };
                return validationFail(
                    errorMessage,
                    'must be a negative number',
                    val,
                    this
                );
            });
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
            return this.withExtension('finite', true).addValidator(val => {
                if (typeof val !== 'number')
                    return validationFail(
                        errorMessage,
                        'must be a finite number',
                        val,
                        this
                    );
                const valid = Number.isFinite(val);
                if (valid) return { valid: true, errors: [] };
                return validationFail(
                    errorMessage,
                    'must be a finite number',
                    val,
                    this
                );
            });
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
            if (n === 0 || !Number.isFinite(n)) {
                throw new Error(
                    'multipleOf: n must be a finite, non-zero number'
                );
            }
            return this.withExtension('multipleOf', n).addValidator(val => {
                if (typeof val !== 'number')
                    return validationFail(
                        errorMessage,
                        `must be a multiple of ${n}`,
                        val,
                        this
                    );
                const remainder = Math.abs(val % n);
                const tolerance = Math.abs(n) * 1e-10;
                const valid =
                    remainder < tolerance ||
                    Math.abs(remainder - Math.abs(n)) < tolerance;
                if (valid) return { valid: true, errors: [] };
                return validationFail(
                    errorMessage,
                    `must be a multiple of ${n}`,
                    val,
                    this
                );
            });
        },

        /**
         * Constrains the number to one of the specified literal values.
         *
         * @param args - the allowed number literals, optionally followed by an error message
         * @returns a new schema builder restricted to the given values
         *
         * @example
         * ```ts
         * number().oneOf(1, 2, 3);
         * number().oneOf([1, 2, 3], 'Must be 1, 2, or 3');
         * ```
         */
        oneOf(this: NumberSchemaBuilder, ...args: any[]) {
            let values: number[];
            let errorMessage:
                | ValidationErrorMessageProvider<NumberSchemaBuilder>
                | undefined;

            if (args.length === 0) {
                throw new Error('oneOf requires at least one value');
            }

            if (Array.isArray(args[0])) {
                // Array form: oneOf([1, 2, 3], errorMessage?)
                values = args[0] as number[];
                errorMessage = args[1] as
                    | ValidationErrorMessageProvider<NumberSchemaBuilder>
                    | undefined;
            } else {
                // Rest params form: oneOf(1, 2, 3) or oneOf(1, 2, 3, 'error') or oneOf(1, 2, 3, errorFn)
                // Last arg is a string or function → error message (unambiguous since values are numbers)
                const lastArg = args[args.length - 1];
                if (
                    typeof lastArg === 'string' ||
                    typeof lastArg === 'function'
                ) {
                    values = args.slice(0, -1) as number[];
                    errorMessage =
                        lastArg as ValidationErrorMessageProvider<NumberSchemaBuilder>;
                } else {
                    values = args as number[];
                    errorMessage = undefined;
                }
            }

            if (values.length === 0) {
                throw new Error('oneOf requires at least one value');
            }

            const allowed = new Set(values);
            return this.withExtension('oneOf', values).addValidator(val => {
                if (typeof val === 'number' && allowed.has(val)) {
                    return { valid: true, errors: [] };
                }
                return validationFail(
                    errorMessage,
                    `must be one of: ${values.join(', ')}`,
                    val,
                    this
                );
            });
        }
    }
});
