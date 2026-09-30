import type { AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from './builders/BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
import type { FunctionSchemaBuilder } from './builders/FunctionSchemaBuilder.js';
import type { GenericSchemaBuilder } from './builders/GenericSchemaBuilder.js';
import type { NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import type { PromiseSchemaBuilder } from './builders/PromiseSchemaBuilder.js';
import type { RecordSchemaBuilder } from './builders/RecordSchemaBuilder.js';
import type {
    PropertyDescriptorTree,
    SchemaBuilder
} from './builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
import type { TupleSchemaBuilder } from './builders/TupleSchemaBuilder.js';
import type { UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
import type {
    EXTRA_TYPE_BRAND,
    HiddenExtensionMethods,
    METHOD_LITERAL_BRAND
} from './extension.js';

const metadataMethods = new WeakSet<Function>();

/** @internal Metadata helpers own their key, including explicitly undefined values. */
export function isMetadataMethod(method: Function): boolean {
    return metadataMethods.has(method);
}

/** Metadata recorded by typed extension methods; unannotated builders yield `{}`. */
export type InferExtensionMetadata<S> = S extends {
    readonly __cleverbrush_extension_metadata__: infer M;
}
    ? M
    : {};

/** @internal Description carried on a metadata method's type, not on schemas. */
export type MetadataMethod<K extends string, A extends any[], V, Mode> = ((
    this: SchemaBuilder<any, any, any, any, any>,
    ...args: A
) => SchemaBuilder<any, any, any, any, any>) & {
    readonly __cleverbrush_metadata_method__: { key: K; value: V; mode: Mode };
};

/** Defines the source of a typed metadata value for an extension method. */
export interface MetadataMethodBuilder<K extends string> {
    /** Store the caller's argument, retaining its literal type. */
    argument<TValue = unknown>(): MetadataMethod<
        K,
        [value: TValue],
        TValue,
        'argument'
    >;
    /** Create a zero-argument method that stores a fixed value. */
    value<const TValue>(value: TValue): MetadataMethod<K, [], TValue, 'value'>;
    /** Compute metadata from typed arguments; inference uses the callback's return type. */
    compute<TArgs extends any[], TValue>(
        compute: (...args: TArgs) => TValue
    ): MetadataMethod<K, TArgs, TValue, 'computed'>;
}

/**
 * Define an immutable metadata-only method for use inside `defineExtension()`.
 *
 * Unlike ordinary extension methods, its stored value is also available through
 * `InferExtensionMetadata<S>`. Repeated writes replace the value for that key.
 * The method does not validate input or change the schema's inferred value type.
 * Methods are installed only on factories returned by `withExtensions()`.
 *
 * @param key - Runtime introspection key, independent of the fluent method name.
 * @example
 * ```ts
 * const labels = defineExtension({
 *     string: {
 *         label: defineMetadataMethod('label').argument<string>(),
 *         internal: defineMetadataMethod('visibility').value('internal')
 *     }
 * });
 * const s = withExtensions(labels).string().label('Title').optional();
 * type Label = InferExtensionMetadata<typeof s>['label']; // 'Title'
 * ```
 */
export function defineMetadataMethod<const K extends string>(
    key: K
): MetadataMethodBuilder<K> {
    const method = (compute: (...args: any[]) => unknown) => {
        const apply = function (
            this: SchemaBuilder<any, any, any, any, any>,
            ...args: any[]
        ) {
            return this.withExtension(key, compute(...args));
        };
        metadataMethods.add(apply);
        return apply;
    };
    return {
        argument: () => method(value => value),
        value: value => method(() => value),
        compute: method
    } as MetadataMethodBuilder<K>;
}

/** @internal Rebuild a native builder with new extension state, preserving its value flags. */
type WithExtensions<S, E> = S extends {
    readonly __cleverbrush_builder_type__: infer P;
}
    ? P extends readonly [
          'number',
          infer T,
          infer R extends boolean,
          infer N extends boolean,
          infer D extends boolean
      ]
        ? NumberSchemaBuilder<T, R, N, D, E>
        : P extends readonly [
                'string',
                infer T,
                infer R extends boolean,
                infer N extends boolean,
                infer D extends boolean
            ]
          ? StringSchemaBuilder<T, R, N, D, E>
          : P extends readonly [
                  'date',
                  infer T,
                  infer R extends boolean,
                  infer N extends boolean,
                  infer D extends boolean
              ]
            ? DateSchemaBuilder<T, R, N, D, E>
            : P extends readonly [
                    'object',
                    infer P extends Record<
                        string,
                        SchemaBuilder<any, any, any, any, any>
                    >,
                    infer R extends boolean,
                    infer N extends boolean,
                    infer T,
                    infer D extends boolean,
                    infer C extends SchemaBuilder<any, any, any, any, any>[]
                ]
              ? ObjectSchemaBuilder<P, R, N, T, D, E, C>
              : P extends readonly [
                      'array',
                      infer P extends SchemaBuilder<any, any, any, any, any>,
                      infer R extends boolean,
                      infer N extends boolean,
                      infer T,
                      infer D extends boolean,
                      infer V
                  ]
                ? ArraySchemaBuilder<P, R, N, T, D, E, V>
                : P extends readonly [
                        'boolean',
                        infer T,
                        infer R extends boolean,
                        infer N extends boolean,
                        infer X,
                        infer D extends boolean,
                        infer V
                    ]
                  ? BooleanSchemaBuilder<T, R, N, X, D, E, V>
                  : P extends readonly [
                          'tuple',
                          infer P extends readonly SchemaBuilder<
                              any,
                              any,
                              any,
                              any,
                              any
                          >[],
                          infer R extends boolean,
                          infer N extends boolean,
                          infer T,
                          infer D extends boolean,
                          infer Rest extends
                              | SchemaBuilder<any, any, any, any, any>
                              | undefined,
                          infer V
                      ]
                    ? TupleSchemaBuilder<P, R, N, T, D, E, Rest, V>
                    : P extends readonly [
                            'record',
                            infer K extends StringSchemaBuilder<
                                any,
                                any,
                                any,
                                any
                            >,
                            infer P extends SchemaBuilder<
                                any,
                                any,
                                any,
                                any,
                                any
                            >,
                            infer R extends boolean,
                            infer N extends boolean,
                            infer T,
                            infer D extends boolean,
                            infer V
                        ]
                      ? RecordSchemaBuilder<K, P, R, N, T, D, E, V>
                      : P extends readonly [
                              'union',
                              infer P extends readonly SchemaBuilder<
                                  any,
                                  any,
                                  any,
                                  any,
                                  any
                              >[],
                              infer R extends boolean,
                              infer N extends boolean,
                              infer T,
                              infer D extends boolean
                          ]
                        ? UnionSchemaBuilder<P, R, N, T, D, E>
                        : P extends readonly [
                                'func',
                                infer R extends boolean,
                                infer N extends boolean,
                                infer T,
                                infer D extends boolean,
                                infer P extends SchemaBuilder<
                                    any,
                                    any,
                                    any,
                                    any,
                                    any
                                >[],
                                infer Return extends
                                    | SchemaBuilder<any, any, any, any, any>
                                    | undefined,
                                infer V
                            ]
                          ? FunctionSchemaBuilder<R, N, T, D, E, P, Return, V>
                          : P extends readonly [
                                  'promise',
                                  infer R extends boolean,
                                  infer N extends boolean,
                                  infer T,
                                  infer D extends boolean,
                                  infer P extends
                                      | SchemaBuilder<any, any, any, any, any>
                                      | undefined,
                                  infer V
                              ]
                            ? PromiseSchemaBuilder<R, N, T, D, E, P, V>
                            : P extends readonly [
                                    'generic',
                                    infer F extends (
                                        ...args: any[]
                                    ) => SchemaBuilder<any, any, any, any, any>,
                                    infer R extends boolean,
                                    infer N extends boolean,
                                    infer T,
                                    infer D extends boolean,
                                    infer V
                                ]
                              ? GenericSchemaBuilder<F, R, N, T, D, E, V>
                              : P extends readonly [
                                      'any',
                                      infer R extends boolean,
                                      infer N extends boolean,
                                      infer T,
                                      infer D extends boolean,
                                      infer V
                                  ]
                                ? AnySchemaBuilder<R, N, T, D, E, V>
                                : never
    : never;

/** @internal Named declaration support for metadata-aware fluent builders. */
export type MetadataState<Methods, Metadata, Extras> =
    MetadataMethods<Methods> &
        HiddenExtensionMethods &
        Extras & {
            readonly __cleverbrush_extension_metadata__: Metadata;
        };

/** @internal A metadata-aware factory result; state survives native builder modifiers. */
export type MetadataExtended<
    S,
    Methods,
    Metadata = {},
    Extras = ExtraProperties<S, Methods>
> = WithExtensions<S, MetadataState<Methods, Metadata, Extras>> &
    MetadataState<Methods, Metadata, Extras>;

/** @internal Preserve author-defined type brands without intersecting stale metadata or methods. */
export type ExtraProperties<S, Methods> = Pick<
    S,
    Exclude<
        keyof S,
        | keyof WithExtensions<S, {}>
        | keyof Methods
        | '__cleverbrush_extension_metadata__'
    >
>;

type ExtraTypes<S> = S extends { readonly [EXTRA_TYPE_BRAND]?: infer T }
    ? T
    : {};
type LiteralNames<S> = S extends { readonly [METHOD_LITERAL_BRAND]?: infer T }
    ? T
    : never;
type WithBrand<S, Methods, K extends PropertyKey, V> = MetadataExtended<
    S,
    Methods,
    InferExtensionMetadata<S>,
    Omit<ExtraProperties<S, Methods>, K> & { readonly [P in K]?: V }
>;

type SetMetadata<S, Methods, K extends string, V> = MetadataExtended<
    S,
    Methods,
    Omit<InferExtensionMetadata<S>, K> & Record<K, V>
>;

/** Describe fields without recursively inspecting the receiver's fluent methods. */
type MetadataPropertyTree<S> = S extends {
    readonly __cleverbrush_builder_type__: readonly [
        'object',
        infer P extends Record<string, SchemaBuilder<any, any, any, any, any>>,
        ...unknown[]
    ];
}
    ? PropertyDescriptorTree<ObjectSchemaBuilder<P>, ObjectSchemaBuilder<P>>
    : never;

/** @internal Named declaration support for extension method signatures. */
export type MetadataMethods<Methods> = {
    [M in keyof Methods]: Methods[M] extends MetadataMethod<
        infer K,
        infer A,
        infer V,
        infer Mode
    >
        ? Mode extends 'argument'
            ? <S, const Value extends A[0]>(
                  this: S,
                  value: Value
              ) => SetMetadata<S, Methods, K, Value>
            : <S>(this: S, ...args: A) => SetMetadata<S, Methods, K, V>
        : Methods[M] extends (this: any, ...args: infer A) => infer R
          ? typeof EXTRA_TYPE_BRAND extends keyof R
              ? <S, const Name extends string & A[0], const Key extends string>(
                    this: S,
                    name: Name,
                    ...columns: ReadonlyArray<
                        Key | ((t: MetadataPropertyTree<S>) => any)
                    >
                ) => WithBrand<
                    S,
                    Methods,
                    typeof EXTRA_TYPE_BRAND,
                    ExtraTypes<S> & Record<Name, readonly Key[]>
                >
              : typeof METHOD_LITERAL_BRAND extends keyof R
                ? <S, const Name extends string & A[0]>(
                      this: S,
                      name: Name,
                      ...rest: A extends [any, ...infer Rest] ? Rest : []
                  ) => WithBrand<
                      S,
                      Methods,
                      typeof METHOD_LITERAL_BRAND,
                      LiteralNames<S> | Name
                  >
                : <S>(this: S, ...args: A) => S
          : Methods[M];
};
