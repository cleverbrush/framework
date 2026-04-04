/**
 * Pre‑wired extension pack for `@cleverbrush/schema`.
 *
 * Combines {@link stringExtensions}, {@link numberExtensions}, and
 * {@link arrayExtensions} via `withExtensions()` and re‑exports the
 * augmented factory functions.
 *
 * The default `@cleverbrush/schema` entry point re‑exports these
 * augmented factories so that `email()`, `positive()`, `nonempty()`,
 * etc. are available without any setup.
 *
 * @module
 */
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { withExtensions } from '../extension.js';
import type { ArrayBuiltinExtensions } from './array.js';
import { arrayExtensions } from './array.js';
import type { NumberBuiltinExtensions } from './number.js';
import { numberExtensions } from './number.js';
import type { StringBuiltinExtensions } from './string.js';
import { stringExtensions } from './string.js';

export { type ArrayBuiltinExtensions, arrayExtensions } from './array.js';
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

// -- Runtime factories with explicit type annotations -------------------------

const s = withExtensions(stringExtensions, numberExtensions, arrayExtensions);

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

export const boolean = s.boolean;
export const date = s.date;
export const object = s.object;
export const union = s.union;
export const func = s.func;
export const any = s.any;
