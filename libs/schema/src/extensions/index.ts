/**
 * Pre‑wired extension pack for `@cleverbrush/schema`.
 *
 * Combines {@link stringExtensions}, {@link numberExtensions},
 * {@link arrayExtensions}, and {@link nullableExtension} via
 * `withExtensions()` and re‑exports the augmented factory functions.
 *
 * The default `@cleverbrush/schema` entry point re‑exports these
 * augmented factories so that `email()`, `positive()`, `nonempty()`,
 * `.nullable()`, etc. are available without any setup.
 *
 * @module
 */
import type { AnySchemaBuilder } from '../builders/AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from '../builders/BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from '../builders/DateSchemaBuilder.js';
import type { FunctionSchemaBuilder } from '../builders/FunctionSchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from '../builders/ObjectSchemaBuilder.js';
import type { RecordSchemaBuilder } from '../builders/RecordSchemaBuilder.js';
import type {
    SchemaBuilder,
    ValidationErrorMessageProvider
} from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { TupleSchemaBuilder } from '../builders/TupleSchemaBuilder.js';
import type { UnionSchemaBuilder } from '../builders/UnionSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { withExtensions } from '../extension.js';
import type { ArrayBuiltinExtensions } from './array.js';
import { arrayExtensions } from './array.js';
import type {
    AnyBuiltinExtensions,
    BooleanBuiltinExtensions,
    DateBuiltinExtensions,
    FuncBuiltinExtensions,
    ObjectBuiltinExtensions,
    RecordBuiltinExtensions,
    TupleBuiltinExtensions,
    UnionBuiltinExtensions
} from './nullable.js';
import { nullableExtension } from './nullable.js';
import type { NumberBuiltinExtensions } from './number.js';
import { numberExtensions } from './number.js';
import type { StringBuiltinExtensions } from './string.js';
import { stringExtensions } from './string.js';

export { type ArrayBuiltinExtensions, arrayExtensions } from './array.js';
export {
    type AnyBuiltinExtensions,
    type BooleanBuiltinExtensions,
    type DateBuiltinExtensions,
    type FuncBuiltinExtensions,
    type NullableMethod,
    type NullableReturn,
    nullableExtension,
    type ObjectBuiltinExtensions,
    type RecordBuiltinExtensions,
    type TupleBuiltinExtensions,
    type UnionBuiltinExtensions
} from './nullable.js';
export {
    type NumberBuiltinExtensions,
    type NumberOneOfExtension,
    numberExtensions
} from './number.js';
export {
    type StringBuiltinExtensions,
    type StringOneOfExtension,
    stringExtensions
} from './string.js';

// ---------------------------------------------------------------------------
// Explicitly-typed factories — preserves JSDoc in .d.ts output.
// WORKAROUND: TypeScript strips JSDoc when signatures pass through the
// FixedMethods mapped type (conditional `infer` loses comments). These
// explicit type aliases + factory annotations bypass FixedMethods so that
// JSDoc from the *BuiltinExtensions interfaces reaches consumers.
// Remove once TypeScript preserves JSDoc through mapped types.
// See: https://github.com/microsoft/TypeScript/issues/50715
// ---------------------------------------------------------------------------

/** A `StringSchemaBuilder` with built-in extension methods. */
export type ExtendedString<T extends string = string> = StringSchemaBuilder<
    T,
    true,
    false,
    StringBuiltinExtensions<T>
> &
    StringBuiltinExtensions<T> &
    HiddenExtensionMethods;

/** A `NumberSchemaBuilder` with built-in extension methods. */
export type ExtendedNumber<T extends number = number> = NumberSchemaBuilder<
    T,
    true,
    false,
    NumberBuiltinExtensions<T>
> &
    NumberBuiltinExtensions<T> &
    HiddenExtensionMethods;

/** An `ArraySchemaBuilder` with built-in extension methods. */
export type ExtendedArray<
    TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<
        any,
        any,
        any
    >
> = ArraySchemaBuilder<
    TElementSchema,
    true,
    undefined,
    false,
    ArrayBuiltinExtensions<TElementSchema>
> &
    ArrayBuiltinExtensions<TElementSchema> &
    HiddenExtensionMethods;

/** A `BooleanSchemaBuilder` with built-in extension methods. */
export type ExtendedBoolean = BooleanSchemaBuilder<
    boolean,
    true,
    undefined,
    false,
    BooleanBuiltinExtensions
> &
    BooleanBuiltinExtensions &
    HiddenExtensionMethods;

/** A `DateSchemaBuilder` with built-in extension methods. */
export type ExtendedDate = DateSchemaBuilder<
    Date,
    true,
    false,
    DateBuiltinExtensions
> &
    DateBuiltinExtensions &
    HiddenExtensionMethods;

/** An `ObjectSchemaBuilder` with built-in extension methods. */
export type ExtendedObject<
    TProps extends Record<string, SchemaBuilder<any, any, any>> = {}
> = ObjectSchemaBuilder<
    TProps,
    true,
    undefined,
    false,
    ObjectBuiltinExtensions<TProps>
> &
    ObjectBuiltinExtensions<TProps> &
    HiddenExtensionMethods;

/** A `UnionSchemaBuilder` with built-in extension methods. */
export type ExtendedUnion<
    TOptions extends readonly SchemaBuilder<any, any, any>[]
> = UnionSchemaBuilder<
    TOptions,
    true,
    undefined,
    false,
    UnionBuiltinExtensions
> &
    UnionBuiltinExtensions &
    HiddenExtensionMethods;

/** A `FunctionSchemaBuilder` with built-in extension methods. */
export type ExtendedFunc = FunctionSchemaBuilder<
    true,
    undefined,
    false,
    FuncBuiltinExtensions
> &
    FuncBuiltinExtensions &
    HiddenExtensionMethods;

/** An `AnySchemaBuilder` with built-in extension methods. */
export type ExtendedAny = AnySchemaBuilder<
    true,
    undefined,
    false,
    AnyBuiltinExtensions
> &
    AnyBuiltinExtensions &
    HiddenExtensionMethods;

/** A `TupleSchemaBuilder` with built-in extension methods. */
export type ExtendedTuple<
    TElements extends readonly SchemaBuilder<
        any,
        any,
        any
    >[] = readonly SchemaBuilder<any, any, any>[]
> = TupleSchemaBuilder<
    TElements,
    true,
    undefined,
    false,
    TupleBuiltinExtensions<TElements>
> &
    TupleBuiltinExtensions<TElements> &
    HiddenExtensionMethods;

/** A `RecordSchemaBuilder` with built-in extension methods. */
export type ExtendedRecord<
    TKeySchema extends StringSchemaBuilder<
        any,
        any,
        any,
        any
    > = StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<
        any,
        any,
        any
    >
> = RecordSchemaBuilder<
    TKeySchema,
    TValueSchema,
    true,
    undefined,
    false,
    RecordBuiltinExtensions<TKeySchema, TValueSchema>
> &
    RecordBuiltinExtensions<TKeySchema, TValueSchema> &
    HiddenExtensionMethods;

// -- Runtime factories with explicit type annotations -------------------------

const s = withExtensions(
    stringExtensions,
    numberExtensions,
    arrayExtensions,
    nullableExtension
);

export const string: {
    (): ExtendedString;
    <T extends string>(equals: T): ExtendedString<T>;
} = s.string as any;

export const number: {
    (): ExtendedNumber;
    <T extends number>(equals: T): ExtendedNumber<T>;
} = s.number as any;

export const array: <TElementSchema extends SchemaBuilder<any, any, any>>(
    elementSchema?: TElementSchema
) => ExtendedArray<TElementSchema> = s.array as any;

export const boolean: () => ExtendedBoolean = s.boolean as any;
export const date: () => ExtendedDate = s.date as any;
export const object: {
    (): ExtendedObject<{}>;
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(
        props: TProps
    ): ExtendedObject<TProps>;
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(
        props?: TProps
    ): ExtendedObject<TProps>;
} = s.object as any;
export const union: <TOptions extends SchemaBuilder<any, any, any>>(
    schema: TOptions
) => ExtendedUnion<[TOptions]> = s.union as any;
export const func: () => ExtendedFunc = s.func as any;
export const any: () => ExtendedAny = s.any as any;
export const tuple: <
    const TElements extends readonly SchemaBuilder<any, any, any>[]
>(
    elements: [...TElements]
) => ExtendedTuple<TElements> = s.tuple as any;

export const record: <
    TKeySchema extends StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any>
>(
    keySchema: TKeySchema,
    valueSchema: TValueSchema
) => ExtendedRecord<TKeySchema, TValueSchema> = s.record as any;

/**
 * Creates a string schema constrained to the given literal values.
 *
 * Convenience factory equivalent to `string().oneOf(...values)`.
 * Mirrors Zod's `z.enum(['admin', 'user', 'guest'])` API.
 *
 * **Rest-params form** (no custom error message):
 * ```ts
 * const Role = enumOf('admin', 'user', 'guest');
 * ```
 *
 * **Array form** (with optional custom error message):
 * ```ts
 * const Role = enumOf(['admin', 'user', 'guest'], 'Invalid role');
 * const Role2 = enumOf(['admin', 'user'], (val) => `"${val}" is not a valid role`);
 * ```
 *
 * @param values - the allowed string literals (at least one required)
 * @returns a typed `StringSchemaBuilder` that only accepts the given values
 *
 * @example
 * ```ts
 * import { enumOf, InferType } from '@cleverbrush/schema';
 *
 * const Role = enumOf('admin', 'user', 'guest');
 * type Role = InferType<typeof Role>; // 'admin' | 'user' | 'guest'
 *
 * Role.validate('admin');  // valid
 * Role.validate('other');  // invalid
 * ```
 */
export function enumOf<const T extends string>(
    ...values: [T, ...T[]]
): ExtendedString<T>;
export function enumOf<const T extends string>(
    values: readonly [T, ...T[]],
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
): ExtendedString<T>;
export function enumOf<const T extends string>(
    ...args:
        | [T, ...T[]]
        | [
              readonly [T, ...T[]],
              ValidationErrorMessageProvider<StringSchemaBuilder>?
          ]
): ExtendedString<T> {
    if (Array.isArray(args[0])) {
        return string().oneOf(
            args[0] as readonly [T, ...T[]],
            args[1] as
                | ValidationErrorMessageProvider<StringSchemaBuilder>
                | undefined
        ) as unknown as ExtendedString<T>;
    }
    return string().oneOf(
        ...(args as [T, ...T[]])
    ) as unknown as ExtendedString<T>;
}
