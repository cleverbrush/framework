/**
 * Deprecated nullable extension types for `@cleverbrush/schema`.
 *
 * `nullable()` and `notNullable()` are now first-class methods on
 * `SchemaBuilder`. These types are kept for backward compatibility
 * but will be removed in a future major version.
 *
 * @module
 * @deprecated Use the first-class `.nullable()` / `.notNullable()` methods
 * on `SchemaBuilder` instead.
 */
import type { NullSchemaBuilder } from '../builders/NullSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { UnionSchemaBuilder } from '../builders/UnionSchemaBuilder.js';

/**
 * @deprecated `nullable()` is now a first-class method on `SchemaBuilder`.
 * This type is kept for backward compatibility only.
 */
export type NullableReturn<TBuilder extends SchemaBuilder<any, any, any>> =
    UnionSchemaBuilder<[TBuilder, NullSchemaBuilder<true>]>;

/**
 * @deprecated `nullable()` is now a first-class method on `SchemaBuilder`.
 * This type is kept for backward compatibility only.
 */
export interface NullableMethod<TBuilder extends SchemaBuilder<any, any, any>> {
    nullable(): NullableReturn<TBuilder>;
}
