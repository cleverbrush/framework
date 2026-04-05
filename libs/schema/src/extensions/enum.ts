/**
 * Built-in enum extension for `@cleverbrush/schema`.
 *
 * Provides the `.oneOf()` method on `StringSchemaBuilder` and
 * `NumberSchemaBuilder`, constraining the value to a fixed set of
 * allowed literals and narrowing the inferred type accordingly.
 *
 * Also exports the top-level {@link enumOf} convenience factory, which is
 * sugar for `string().oneOf(...)`.
 *
 * These are pre-applied in the default `@cleverbrush/schema` import.
 * Import from `@cleverbrush/schema/core` to get bare builders without
 * these extensions.
 *
 * @module
 */
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { defineExtension } from '../extension.js';
import type { NullableMethod } from './nullable.js';
import { validationFail } from './util.js';

// ---------------------------------------------------------------------------
// Public interfaces — carry JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/** Return type for `.oneOf()` on `StringSchemaBuilder`. */
type StringOneOfReturn<T extends string = string> = StringSchemaBuilder<
    T,
    true,
    false,
    StringOneOfExtension
> &
    StringOneOfExtension &
    NullableMethod<StringSchemaBuilder<T, true, false, StringOneOfExtension>> &
    HiddenExtensionMethods;

/** Return type for `.oneOf()` on `NumberSchemaBuilder`. */
type NumberOneOfReturn<T extends number = number> = NumberSchemaBuilder<
    T,
    true,
    false,
    NumberOneOfExtension
> &
    NumberOneOfExtension &
    NullableMethod<NumberSchemaBuilder<T, true, false, NumberOneOfExtension>> &
    HiddenExtensionMethods;

/**
 * `.oneOf()` method added to `StringSchemaBuilder` by the built-in enum
 * extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signature from
 * `enumExtension` so that JSDoc survives into the published `.d.ts`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the `FixedMethods` mapped type (conditional `infer` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface StringOneOfExtension {
    /**
     * Constrains the string to one of the specified literal values.
     *
     * Narrows the inferred type from `string` to the union of the
     * provided literals.
     *
     * @param values - the allowed string literals
     * @returns a new schema builder restricted to the given values
     *
     * @example
     * ```ts
     * import { string, InferType } from '@cleverbrush/schema';
     *
     * const role = string().oneOf('admin', 'user', 'guest');
     * type Role = InferType<typeof role>; // 'admin' | 'user' | 'guest'
     *
     * role.validate('admin');  // valid
     * role.validate('other');  // invalid — "must be one of: admin, user, guest"
     * ```
     */
    oneOf<V extends string>(...values: [V, ...V[]]): StringOneOfReturn<V>;
}

/**
 * `.oneOf()` method added to `NumberSchemaBuilder` by the built-in enum
 * extension pack.
 *
 * @see StringOneOfExtension for full JSDoc rationale.
 */
export interface NumberOneOfExtension {
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
    oneOf<V extends number>(...values: [V, ...V[]]): NumberOneOfReturn<V>;
}

/**
 * Extension descriptor that adds `.oneOf()` to `StringSchemaBuilder`
 * and `NumberSchemaBuilder`.
 *
 * @example
 * ```ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { enumExtension } from '@cleverbrush/schema';
 *
 * const s = withExtensions(enumExtension);
 * const role = s.string().oneOf('admin', 'user', 'guest');
 * ```
 */
export const enumExtension = defineExtension({
    string: {
        oneOf(this: StringSchemaBuilder, ...values: [string, ...string[]]) {
            if (values.length === 0) {
                throw new Error('oneOf requires at least one value');
            }
            const allowed = new Set(values);
            return this.withExtension('oneOf', values).addValidator(val => {
                if (typeof val === 'string' && allowed.has(val)) {
                    return { valid: true, errors: [] };
                }
                return validationFail(
                    undefined,
                    `must be one of: ${values.join(', ')}`,
                    val,
                    this
                );
            });
        }
    },
    number: {
        oneOf(this: NumberSchemaBuilder, ...values: [number, ...number[]]) {
            if (values.length === 0) {
                throw new Error('oneOf requires at least one value');
            }
            const allowed = new Set(values);
            return this.withExtension('oneOf', values).addValidator(val => {
                if (typeof val === 'number' && allowed.has(val)) {
                    return { valid: true, errors: [] };
                }
                return validationFail(
                    undefined,
                    `must be one of: ${values.join(', ')}`,
                    val,
                    this
                );
            });
        }
    }
});
