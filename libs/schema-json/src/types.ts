/**
 * Types for `@cleverbrush/schema-json`.
 *
 * @module
 */
import type {
    ArraySchemaBuilder,
    BooleanSchemaBuilder,
    NumberSchemaBuilder,
    ObjectSchemaBuilder,
    SchemaBuilder,
    StringSchemaBuilder,
    UnionSchemaBuilder
} from '@cleverbrush/schema';

/**
 * Subset of JSON Schema (Draft 7 / 2020-12) accepted as input.
 *
 * For accurate TypeScript type inference via {@link InferFromJsonSchema},
 * pass schema literals with `as const`.
 */
export type JsonSchemaNode =
    | {
          readonly type: 'string';
          readonly format?: string;
          readonly minLength?: number;
          readonly maxLength?: number;
          readonly pattern?: string;
          [k: string]: unknown;
      }
    | {
          readonly type: 'number' | 'integer';
          readonly minimum?: number;
          readonly maximum?: number;
          readonly exclusiveMinimum?: number;
          readonly exclusiveMaximum?: number;
          readonly multipleOf?: number;
          [k: string]: unknown;
      }
    | { readonly type: 'boolean'; [k: string]: unknown }
    | { readonly type: 'null'; [k: string]: unknown }
    | {
          readonly type: 'array';
          readonly items?: JsonSchemaNode;
          readonly minItems?: number;
          readonly maxItems?: number;
          [k: string]: unknown;
      }
    | {
          readonly type: 'object';
          readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
          readonly required?: readonly string[];
          readonly additionalProperties?: boolean;
          [k: string]: unknown;
      }
    | { readonly const: unknown; [k: string]: unknown }
    | { readonly enum: readonly unknown[]; [k: string]: unknown }
    | { readonly anyOf: readonly JsonSchemaNode[]; [k: string]: unknown }
    | { readonly allOf: readonly JsonSchemaNode[]; [k: string]: unknown }
    | Record<string, never>;

/**
 * Recursively infers a TypeScript type from a statically-known JSON Schema node.
 *
 * Requires `as const` on the input object for precise inference —
 * without it TypeScript widens string literals to `string` and inference
 * collapses to `unknown`.
 *
 * @example
 * ```ts
 * type User = InferFromJsonSchema<typeof UserJsonSchema>;
 * // { name: string; age?: number }
 * ```
 */
export type InferFromJsonSchema<S> = S extends { readonly const: infer V }
    ? V
    : S extends { readonly enum: readonly (infer V)[] }
      ? V
      : S extends { readonly type: 'string' }
        ? string
        : S extends { readonly type: 'number' | 'integer' }
          ? number
          : S extends { readonly type: 'boolean' }
            ? boolean
            : S extends { readonly type: 'null' }
              ? null
              : S extends { readonly type: 'array'; readonly items: infer I }
                ? InferFromJsonSchema<I>[]
                : S extends { readonly type: 'array' }
                  ? unknown[]
                  : S extends {
                          readonly type: 'object';
                          readonly properties: infer P;
                          readonly required: readonly (infer R extends
                              string)[];
                      }
                    ? {
                          [K in keyof P & string as K extends R
                              ? K
                              : never]: InferFromJsonSchema<P[K]>;
                      } & {
                          [K in keyof P & string as K extends R
                              ? never
                              : K]?: InferFromJsonSchema<P[K]>;
                      }
                    : S extends {
                            readonly type: 'object';
                            readonly properties: infer P;
                        }
                      ? { [K in keyof P]?: InferFromJsonSchema<P[K]> }
                      : S extends { readonly type: 'object' }
                        ? Record<string, unknown>
                        : S extends { readonly anyOf: readonly (infer U)[] }
                          ? InferFromJsonSchema<U>
                          : S extends { readonly allOf: readonly (infer U)[] }
                            ? InferFromJsonSchema<U>
                            : unknown;

/** Options accepted by {@link toJsonSchema}. */
export type ToJsonSchemaOptions = {
    /**
     * JSON Schema draft version to reference in the `$schema` header.
     * @default '2020-12'
     */
    draft?: '2020-12' | '07';

    /**
     * Whether to include the `$schema` header in the output.
     * Set to `false` when embedding in an OpenAPI spec.
     * @default true
     */
    $schema?: boolean;
};

// ---------------------------------------------------------------------------
// Builder-level type inference (strong types for fromJsonSchema)
// ---------------------------------------------------------------------------

/** Maps a JSON Schema `const` value to the narrowest possible builder type. */
type ConstToBuilder<V, TRequired extends boolean> = V extends string
    ? StringSchemaBuilder<V, TRequired>
    : V extends number
      ? NumberSchemaBuilder<V, TRequired>
      : V extends boolean
        ? BooleanSchemaBuilder<V, TRequired>
        : SchemaBuilder<V, TRequired>;

/** Recursively maps a readonly tuple of `const`/`enum` values to a tuple of builders. */
type EnumTupleToBuilders<T extends readonly unknown[]> = T extends readonly []
    ? []
    : T extends readonly [infer First, ...infer Rest extends readonly unknown[]]
      ? [ConstToBuilder<First, true>, ...EnumTupleToBuilders<Rest>]
      : [SchemaBuilder<any, any, any>];

/** Recursively maps a readonly tuple of JSON Schema nodes to a tuple of builders. */
type SchemaNodesTupleToBuilders<T extends readonly unknown[]> =
    T extends readonly []
        ? []
        : T extends readonly [
                infer First,
                ...infer Rest extends readonly unknown[]
            ]
          ? [
                JsonSchemaNodeToBuilder<First, true>,
                ...SchemaNodesTupleToBuilders<Rest>
            ]
          : [SchemaBuilder<any, any, any>];

/**
 * Maps an object schema's `properties` record to the property-descriptor
 * record that `ObjectSchemaBuilder` expects as its first type parameter.
 *
 * Properties present in the `required` array get `TRequired = true`;
 * all others get `TRequired = false`.
 */
type ObjectPropertiesToBuilders<
    P extends Record<string, unknown>,
    R extends string
> = {
    [K in keyof P as K extends R ? K : never]: JsonSchemaNodeToBuilder<
        P[K],
        true
    >;
} & {
    [K in keyof P as K extends R ? never : K]: JsonSchemaNodeToBuilder<
        P[K],
        false
    >;
};

/**
 * Recursively maps a statically-known JSON Schema node (passed with
 * `as const`) to the exact `@cleverbrush/schema` builder type, including:
 *
 * - `StringSchemaBuilder`, `NumberSchemaBuilder`, `BooleanSchemaBuilder`
 *   for primitive types and `const` literals
 * - `ArraySchemaBuilder<ElementBuilder>` with the element builder inferred
 *   from `items`
 * - `ObjectSchemaBuilder<PropertyDescriptors>` where each property is a
 *   typed builder with `TRequired = true/false` driven by the `required`
 *   array
 * - `UnionSchemaBuilder<[...Builders]>` for `enum` and `anyOf`
 *
 * @typeParam S        - The JSON Schema node type (inferred from `as const`).
 * @typeParam TRequired - Whether this node represents a required (`true`) or
 *   optional (`false`) value in its parent context.  Defaults to `true`.
 *
 * @example
 * ```ts
 * import { fromJsonSchema } from '@cleverbrush/schema-json';
 * import type { JsonSchemaNodeToBuilder } from '@cleverbrush/schema-json';
 *
 * const S = {
 *   type: 'object',
 *   properties: {
 *     name:  { type: 'string' },
 *     score: { type: 'number' },
 *   },
 *   required: ['name'],
 * } as const;
 *
 * type Builder = JsonSchemaNodeToBuilder<typeof S>;
 * // ObjectSchemaBuilder<
 * //   { name: StringSchemaBuilder<string, true> } &
 * //   { score: NumberSchemaBuilder<number, false> }
 * // >
 *
 * const schema = fromJsonSchema(S);
 * // TypeScript knows schema is ObjectSchemaBuilder<...>
 * // with full intellisense on .parse(), .addProp(), etc.
 * ```
 */
export type JsonSchemaNodeToBuilder<S, TRequired extends boolean = true> =
    // const (literal value)
    S extends { readonly const: infer V }
        ? ConstToBuilder<V, TRequired>
        : // enum (union of literal values)
          S extends { readonly enum: infer Vals extends readonly unknown[] }
          ? UnionSchemaBuilder<EnumTupleToBuilders<Vals>, TRequired>
          : // anyOf (union of schemas)
            S extends {
                  readonly anyOf: infer Opts extends readonly unknown[];
              }
            ? UnionSchemaBuilder<SchemaNodesTupleToBuilders<Opts>, TRequired>
            : // allOf — no direct builder equivalent, fall back to plain SchemaBuilder
              S extends { readonly allOf: readonly unknown[] }
              ? SchemaBuilder<InferFromJsonSchema<S>, TRequired>
              : // string
                S extends { readonly type: 'string' }
                ? StringSchemaBuilder<string, TRequired>
                : // number
                  S extends { readonly type: 'number' }
                  ? NumberSchemaBuilder<number, TRequired>
                  : // integer
                    S extends { readonly type: 'integer' }
                    ? NumberSchemaBuilder<number, TRequired>
                    : // boolean
                      S extends { readonly type: 'boolean' }
                      ? BooleanSchemaBuilder<boolean, TRequired>
                      : // null
                        S extends { readonly type: 'null' }
                        ? SchemaBuilder<null, TRequired>
                        : // array with items
                          S extends {
                                readonly type: 'array';
                                readonly items: infer I;
                            }
                          ? ArraySchemaBuilder<
                                JsonSchemaNodeToBuilder<I, true>,
                                TRequired
                            >
                          : // array without items
                            S extends {
                                  readonly type: 'array';
                              }
                            ? ArraySchemaBuilder<
                                  SchemaBuilder<unknown, true>,
                                  TRequired
                              >
                            : // object with properties + required array
                              S extends {
                                    readonly type: 'object';
                                    readonly properties: infer P extends Record<
                                        string,
                                        unknown
                                    >;
                                    readonly required: readonly (infer R extends
                                        string)[];
                                }
                              ? ObjectSchemaBuilder<
                                    ObjectPropertiesToBuilders<P, R>,
                                    TRequired
                                >
                              : // object with properties only (all optional)
                                S extends {
                                      readonly type: 'object';
                                      readonly properties: infer P extends
                                          Record<string, unknown>;
                                  }
                                ? ObjectSchemaBuilder<
                                      {
                                          [K in keyof P]: JsonSchemaNodeToBuilder<
                                              P[K],
                                              false
                                          >;
                                      },
                                      TRequired
                                  >
                                : // bare object (no properties declared)
                                  S extends {
                                        readonly type: 'object';
                                    }
                                  ? ObjectSchemaBuilder<{}, TRequired>
                                  : // empty / unknown schema
                                    SchemaBuilder<unknown, TRequired>;
