import type { InferType, SchemaBuilder } from '@cleverbrush/schema';

/**
 * Brand symbol used to distinguish EnvField from plain objects at the type level.
 */
export const ENV_FIELD_BRAND: unique symbol = Symbol('ENV_FIELD_BRAND');

/**
 * A branded wrapper around a schema builder that associates it with an
 * environment variable name. Created exclusively by the {@link env} function.
 */
export type EnvField<T extends SchemaBuilder<any, any, any, any, any>> = {
    readonly [ENV_FIELD_BRAND]: true;
    readonly varName: string;
    readonly schema: T;
};

/**
 * A node in the config descriptor tree.
 * - Leaf: an `EnvField` (created via `env()`)
 * - Branch: a plain object whose values are themselves `EnvConfigNode`s
 *
 * Schema builders without `env()` wrapping intentionally fail to satisfy
 * this type, producing a compile-time error.
 */
export type EnvConfigNode =
    | EnvField<any>
    | { readonly [key: string]: EnvConfigNode };

/**
 * Top-level config descriptor: a record of `EnvConfigNode`s.
 */
export type EnvConfig = Record<string, EnvConfigNode>;

/**
 * Recursively infers the runtime type from an `EnvConfig` descriptor tree.
 *
 * - `EnvField<S>` leaves resolve to `InferType<S>`
 * - Object branches resolve to `{ [K]: InferEnvConfig<V> }`
 */
export type InferEnvConfig<T> = {
    [K in keyof T]: T[K] extends EnvField<infer S>
        ? InferType<S>
        : T[K] extends Record<string, any>
          ? InferEnvConfig<T[K]>
          : never;
};
