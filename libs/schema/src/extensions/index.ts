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
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
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
    type UnionBuiltinExtensions
} from './nullable.js';
export { type NumberBuiltinExtensions, numberExtensions } from './number.js';
export { type StringBuiltinExtensions, stringExtensions } from './string.js';

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
