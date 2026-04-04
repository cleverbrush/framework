/**
 * Built-in nullable extension for `@cleverbrush/schema`.
 *
 * Provides the `.nullable()` convenience method on every schema builder type.
 * It is a shorthand for `union(schema).or(nul())` that changes the inferred
 * type from `T` to `T | null`.
 *
 * This extension is pre-applied in the default `@cleverbrush/schema` import.
 * Import from `@cleverbrush/schema/core` to get bare builders without it.
 *
 * @module
 */
import type { AnySchemaBuilder } from '../builders/AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from '../builders/BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from '../builders/DateSchemaBuilder.js';
import type { FunctionSchemaBuilder } from '../builders/FunctionSchemaBuilder.js';
import { type NullSchemaBuilder, nul } from '../builders/NullSchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from '../builders/ObjectSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import {
    type UnionSchemaBuilder,
    union
} from '../builders/UnionSchemaBuilder.js';
import { defineExtension } from '../extension.js';

// ---------------------------------------------------------------------------
// Public types — carry JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/**
 * The return type produced by `.nullable()` on any schema builder `TBuilder`.
 *
 * Wraps the builder in a union with `NullSchemaBuilder`, giving the inferred
 * type `InferType<TBuilder> | null`.
 */
export type NullableReturn<TBuilder extends SchemaBuilder<any, any, any>> =
    UnionSchemaBuilder<[TBuilder, NullSchemaBuilder<true>]>;

/**
 * The `.nullable()` method added to every built-in schema builder.
 *
 * **WORKAROUND:** This interface duplicates the method signature from
 * `nullableExtension` so that JSDoc survives into the published `.d.ts`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the `FixedMethods` mapped type (conditional `infer` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
// ---------------------------------------------------------------------------
// Per-builder builtin extensions interfaces  — carry `nullable()` through TExtensions
// ---------------------------------------------------------------------------

/** Methods threaded through `TExtensions` for `BooleanSchemaBuilder`. */
export interface BooleanBuiltinExtensions {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        BooleanSchemaBuilder<
            boolean,
            true,
            undefined,
            false,
            BooleanBuiltinExtensions
        >
    >;
}

/** Methods threaded through `TExtensions` for `DateSchemaBuilder`. */
export interface DateBuiltinExtensions {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        DateSchemaBuilder<Date, true, false, DateBuiltinExtensions>
    >;
}

/** Methods threaded through `TExtensions` for `ObjectSchemaBuilder`. */
export interface ObjectBuiltinExtensions<
    TProps extends Record<string, SchemaBuilder<any, any, any>> = {}
> {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        ObjectSchemaBuilder<
            TProps,
            true,
            undefined,
            false,
            ObjectBuiltinExtensions<TProps>
        >
    >;
}

/** Methods threaded through `TExtensions` for `UnionSchemaBuilder`. */
export interface UnionBuiltinExtensions {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<SchemaBuilder<any, any, any>>;
}

/** Methods threaded through `TExtensions` for `FunctionSchemaBuilder`. */
export interface FuncBuiltinExtensions {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        FunctionSchemaBuilder<true, undefined, false, FuncBuiltinExtensions>
    >;
}

/** Methods threaded through `TExtensions` for `AnySchemaBuilder`. */
export interface AnyBuiltinExtensions {
    /** Makes this schema nullable — shorthand for `union(schema).or(nul())`. */
    nullable(): NullableReturn<
        AnySchemaBuilder<true, undefined, false, AnyBuiltinExtensions>
    >;
}

export interface NullableMethod<TBuilder extends SchemaBuilder<any, any, any>> {
    /**
     * Makes this schema nullable by wrapping it in a union with `null`.
     *
     * Shorthand for `union(schema).or(nul())`.
     *
     * After calling `.nullable()`, the schema accepts the original type **or**
     * `null`. The inferred type changes from `T` to `T | null`. Builder-specific
     * methods (e.g. `.email()`, `.positive()`) are no longer available on the
     * result — call them before `.nullable()`.
     *
     * @returns a `UnionSchemaBuilder` that accepts the original type or `null`
     *
     * @example
     * ```ts
     * import { string, number, object, InferType } from '@cleverbrush/schema';
     *
     * // Any builder can be made nullable
     * const name = string().nullable();
     * type Name = InferType<typeof name>; // string | null
     *
     * const age  = number().nullable();
     * type Age  = InferType<typeof age>;  // number | null
     *
     * // Chain validators before .nullable()
     * const email = string().email().nullable();
     * email.validate('user@example.com'); // valid
     * email.validate(null);               // valid
     * email.validate('not-an-email');     // invalid
     *
     * // Useful for optional database columns that can be NULL
     * const UserSchema = object({
     *     name:     string().nonempty(),
     *     bio:      string().nullable(),   // bio can be null
     *     avatarId: number().nullable(),   // FK can be null
     * });
     * ```
     */
    nullable(): NullableReturn<TBuilder>;
}

// ---------------------------------------------------------------------------
// Extension descriptor
// ---------------------------------------------------------------------------

/**
 * Extension descriptor that adds `.nullable()` to every built-in schema
 * builder type.
 *
 * Included on all nine builders: `string`, `number`, `boolean`, `date`,
 * `object`, `array`, `union`, `func`, and `any`.
 *
 * @example
 * ```ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { nullableExtension } from '@cleverbrush/schema';
 *
 * const { string: s } = withExtensions(nullableExtension);
 * const schema = s().nullable();
 * ```
 */
export const nullableExtension = defineExtension({
    string: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts `string | null`
         */
        nullable(this: StringSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    number: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts `number | null`
         */
        nullable(this: NumberSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    boolean: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts `boolean | null`
         */
        nullable(this: BooleanSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    date: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts `Date | null`
         */
        nullable(this: DateSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    object: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts the object type or `null`
         */
        nullable(this: ObjectSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    array: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts the array type or `null`
         */
        nullable(this: ArraySchemaBuilder<any>) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    union: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that includes `null` as an option
         */
        nullable(this: UnionSchemaBuilder<any>) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    func: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts a function or `null`
         */
        nullable(this: FunctionSchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    },
    any: {
        /**
         * Makes this schema nullable — shorthand for `union(schema).or(nul())`.
         *
         * @returns a `UnionSchemaBuilder` that accepts any value or `null`
         */
        nullable(this: AnySchemaBuilder) {
            const u = union(this).or(nul());
            return this.isRequired ? u : u.optional();
        }
    }
});
