import {
    ArraySchemaBuilder,
    type InferType,
    ObjectSchemaBuilder,
    type PropertyDescriptor,
    type PropertyDescriptorTree,
    type SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';

/**
 * Internal symbol used to brand target property descriptors with their key.
 * Using a symbol instead of a string property keeps it out of IntelliSense.
 */
const SYMBOL_TARGET_PROPERTY_KEY: unique symbol = Symbol('targetPropertyKey');

/**
 * Internal symbol used as a phantom property key on Mapper to track
 * unmapped target properties. Using a symbol keeps it out of IntelliSense.
 */
const SYMBOL_UNMAPPED: unique symbol = Symbol('unmapped');
const SYMBOL_STEPS: unique symbol = Symbol('mappingSteps');

type Step<T, K extends string, Async extends boolean> = Omit<T, K> &
    Record<K, Async>;
type IsAsync<T> = 0 extends 1 & T
    ? true
    : [Extract<T, PromiseLike<any>>] extends [never]
      ? false
      : true;
// Inspect metadata instead of recursively comparing the entire fluent builder.
type ArraySchemaShape = { introspect(): { elementSchema: unknown } };
type ObjectSchemaShape = { introspect(): { properties: unknown } };
type SameProperties<A, B> = [keyof A, keyof B] extends [keyof B, keyof A]
    ? [A, B] extends [B, A]
        ? true
        : false
    : false;
// Runtime registration still uses schema identity. At compile time compare the
// declared fields, not every recursive builder/validation method. Exact key sets
// prevent an empty or smaller schema from matching an unrelated registration.
type RegisteredMatch<S, T, Registered> = S extends ObjectSchemaShape
    ? T extends ObjectSchemaShape
        ? Registered extends [infer From, infer To]
            ? [InferType<S>, InferType<T>] extends [
                  InferType<From>,
                  InferType<To>
              ]
                ? [InferType<From>, InferType<To>] extends [
                      InferType<S>,
                      InferType<T>
                  ]
                    ? SameProperties<
                          ExtractSchemaProperties<S>,
                          ExtractSchemaProperties<From>
                      > extends true
                        ? SameProperties<
                              ExtractSchemaProperties<T>,
                              ExtractSchemaProperties<To>
                          >
                        : false
                    : false
                : false
            : false
        : false
    : false;
type NestedAsync<S, T, Registered> = S extends ArraySchemaShape
    ? T extends ArraySchemaShape
        ? NestedAsync<
              ExtractArrayElementSchema<S>,
              ExtractArrayElementSchema<T>,
              Registered
          >
        : false
    : true extends RegisteredMatch<S, T, Registered>
      ? true
      : false;
type AsyncKeys<S, T, Registered, Steps> = {
    [K in keyof ExtractSchemaProperties<T> & string]: K extends keyof Steps
        ? Steps[K] extends false
            ? never
            : K
        : K extends keyof ExtractSchemaProperties<S>
          ? NestedAsync<
                ExtractSchemaProperties<S>[K],
                ExtractSchemaProperties<T>[K],
                Registered
            > extends false
              ? never
              : K
          : never;
}[keyof ExtractSchemaProperties<T> & string];

/** Compile-time diagnostics for incomplete or asynchronous mapping steps. */
type SyncMappingArguments<Unmapped extends string, Async> = [Unmapped] extends [
    never
]
    ? [Async] extends [never]
        ? []
        : [error: 'Mapping contains asynchronous steps']
    : [error: `Unmapped properties: ${Unmapped}`];

/** Compile-time diagnostics for registered synchronous mapping pairs. */
type RegisteredSyncArguments<Pair, Registered, Async> = Pair extends Registered
    ? Pair extends Async
        ? [error: 'Mapping contains asynchronous steps']
        : []
    : [error: 'Mapping is not registered'];

const syncImplementations = new WeakMap<Function, (source: any) => any>();

function assertSync(value: any, key: string): any {
    if (value != null && typeof value.then === 'function') {
        throw new MapperConfigurationError(
            `Synchronous mapping returned a thenable for property "${key}"`
        );
    }
    return value;
}

function synchronous(fn: Function): (source: any) => any {
    const result = syncImplementations.get(fn);
    if (!result)
        throw new MapperConfigurationError(
            'Mapping contains an asynchronous computation or nested mapper'
        );
    return result;
}

// ── Helper Types ──────────────────────────────────────────────────────

/**
 * Extracts the properties record from an ObjectSchemaBuilder.
 */
type ExtractSchemaProperties<T> = T extends {
    introspect(): { properties: infer TProperties };
}
    ? TProperties
    : never;

/**
 * Gets all top-level property key names of an ObjectSchemaBuilder.
 */
type SchemaKeys<T extends ObjectSchemaShape> =
    keyof ExtractSchemaProperties<T> & string;

/**
 * Branded phantom type that tags a property descriptor with its key name.
 * This allows TypeScript to infer which property was selected in the
 * `for` callback, enabling compile-time tracking of mapped vs unmapped
 * properties.
 */
type TargetPropertyKey<K extends string> = {
    readonly [SYMBOL_TARGET_PROPERTY_KEY]: K;
};

/**
 * Creates a tree of selectable target properties, filtered to only show
 * properties whose keys are in `TAllowedKeys`. Each property is branded
 * with `TargetPropertyKey<K>` so the key can be inferred from the return
 * type of the selector callback.
 */
type TargetPropertyTree<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TAllowedKeys extends string
> = {
    // Filter source properties without detaching the target key's declaration.
    -readonly [K in keyof ExtractSchemaProperties<TSchema> as K extends TAllowedKeys
        ? K
        : never]-?: TargetPropertyKey<K & string> &
        PropertyDescriptor<TSchema, ExtractSchemaProperties<TSchema>[K], any>;
};

/**
 * Infers the TypeScript type of a specific property in an ObjectSchemaBuilder
 * by its key name.
 */
type SchemaPropertyInferredType<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    K extends string
> = K extends keyof ExtractSchemaProperties<TSchema>
    ? InferType<ExtractSchemaProperties<TSchema>[K]>
    : never;

/**
 * Extracts the schema (SchemaBuilder) of a specific property in an
 * ObjectSchemaBuilder by its key name.
 */
type TargetPropertySchema<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    K extends string
> = K extends keyof ExtractSchemaProperties<TSchema>
    ? ExtractSchemaProperties<TSchema>[K]
    : never;

/**
 * Extracts the element schema from an ArraySchemaBuilder.
 */
type ExtractArrayElementSchema<T> = T extends {
    introspect(): { elementSchema: infer TElementSchema };
}
    ? NonNullable<TElementSchema>
    : never;

/**
 * Extracts the property schema from a PropertyDescriptor's `getSchema()`
 * return type. Used by {@link IsFromCompatible} to recover the source
 * property's schema from the inferred `TReturn` of the `from()` selector.
 */
type ExtractPropertySchema<T> = T extends {
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        getSchema(): infer TSchema;
    };
}
    ? TSchema
    : never;

/**
 * Determines whether a property needs an explicit mapping configuration.
 *
 * - Both are ObjectSchemaBuilder with registered mapping → `false` (auto-mappable)
 * - Both are ObjectSchemaBuilder without registered mapping → `true`
 * - Either is ObjectSchemaBuilder but the other is not → `true`
 * - Both are ArraySchemaBuilder with element schemas that have registered mapping → `false`
 * - Both are ArraySchemaBuilder with same InferType → `false`
 * - Array vs non-array → `true`
 * - Neither is ObjectSchemaBuilder + InferType<source> extends InferType<target>
 *   → `false` (same-name, compatible primitive types → auto-mappable)
 * - Neither is ObjectSchemaBuilder + incompatible InferType → `true`
 */
type NeedsMapping<TSourcePropSchema, TTargetPropSchema, TRegistered> =
    TSourcePropSchema extends ArraySchemaShape
        ? TTargetPropSchema extends ArraySchemaShape
            ? NeedsMapping<
                  ExtractArrayElementSchema<TSourcePropSchema>,
                  ExtractArrayElementSchema<TTargetPropSchema>,
                  TRegistered
              >
            : true
        : TTargetPropSchema extends ArraySchemaShape
          ? true
          : TSourcePropSchema extends ObjectSchemaShape
            ? TTargetPropSchema extends ObjectSchemaShape
                ? true extends RegisteredMatch<
                      TSourcePropSchema,
                      TTargetPropSchema,
                      TRegistered
                  >
                    ? false
                    : InferType<TSourcePropSchema> extends InferType<TTargetPropSchema>
                      ? InferType<TTargetPropSchema> extends InferType<TSourcePropSchema>
                          ? false
                          : true
                      : true
                : true
            : TTargetPropSchema extends ObjectSchemaShape
              ? true
              : InferType<TSourcePropSchema> extends InferType<TTargetPropSchema>
                ? false
                : true;

/**
 * From all keys of the target schema, filter down to only those that
 * require explicit mapping (i.e. `NeedsMapping` is `true`).
 * Keys where `NeedsMapping` is `false` can be auto-mapped via the registry.
 */
type KeysNeedingMapping<
    TFromSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TRegistered
> = {
    [K in SchemaKeys<TToSchema>]: K extends SchemaKeys<TFromSchema>
        ? NeedsMapping<
              ExtractSchemaProperties<TFromSchema>[K],
              ExtractSchemaProperties<TToSchema>[K],
              TRegistered
          > extends true
            ? K
            : never
        : K;
}[SchemaKeys<TToSchema>];

/**
 * Checks whether two property schemas are compatible, considering
 * registered mappings. Mirrors {@link NeedsMapping}'s structure:
 * receives schemas as direct type parameters, uses
 * {@link ExtractArrayElementSchema} for arrays, and checks registration
 * via tuple-extends-union (not inline `infer`).
 */
type CheckSchemaCompatible<TSourceSchema, TTargetSchema, TRegistered> =
    // Direct InferType match → compatible
    [InferType<TSourceSchema>] extends [InferType<TTargetSchema>]
        ? true
        : // Both arrays → recurse into element schemas
          TSourceSchema extends ArraySchemaShape
          ? TTargetSchema extends ArraySchemaShape
              ? CheckSchemaCompatible<
                    ExtractArrayElementSchema<TSourceSchema>,
                    ExtractArrayElementSchema<TTargetSchema>,
                    TRegistered
                >
              : false
          : // Both objects → check registration
            TSourceSchema extends ObjectSchemaShape
            ? TTargetSchema extends ObjectSchemaShape
                ? true extends RegisteredMatch<
                      TSourceSchema,
                      TTargetSchema,
                      TRegistered
                  >
                    ? true
                    : false
                : false
            : false;

/**
 * Checks whether the source property selected by `from()` is compatible
 * with the target property, evaluated *after* `TReturn` has been inferred.
 *
 * This decouples inference from validation: the `TReturn` constraint uses
 * `any` for setValue/getValue value types so TypeScript always infers
 * successfully, and this type performs the actual compatibility check
 * in the `_args` conditional spread.
 */
type IsFromCompatible<
    TReturn,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TKey extends string,
    TRegistered
> = [ExtractPropertySchema<TReturn>] extends [never]
    ? false
    : CheckSchemaCompatible<
          ExtractPropertySchema<TReturn>,
          TargetPropertySchema<TToSchema, TKey>,
          TRegistered
      >;

// ── Mapper Result Type ────────────────────────────────────────────────

/** A mapping function that always returns a Promise, including for pure mappings. */
export type SchemaToSchemaMapperResult<
    TFromSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = (from: InferType<TFromSchema>) => Promise<InferType<TToSchema>>;

/** A complete synchronous mapping; unexpected thenables throw instead of leaking into DTOs. */
export type SyncSchemaToSchemaMapperResult<
    TFromSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = (from: InferType<TFromSchema>) => InferType<TToSchema>;

// ── Error Class ───────────────────────────────────────────────────────

export class MapperConfigurationError extends Error {
    constructor(messageOrUnmappedProperties: string | string[]) {
        super(
            typeof messageOrUnmappedProperties === 'string'
                ? messageOrUnmappedProperties
                : `Mapper configuration error: the following target properties are not mapped and not ignored: ${messageOrUnmappedProperties.join(', ')}`
        );
        this.name = 'MapperConfigurationError';
    }
}

// ── Internal Mapping Entry ────────────────────────────────────────────

type MappingEntry = {
    type: 'prop' | 'custom' | 'ignore' | 'auto' | 'autoArray';
    sourceDescriptorInner?: ReturnType<
        PropertyDescriptor<
            any,
            any,
            any
        >[typeof SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]['getValue']
    > extends any
        ? any
        : never;
    fn?: (obj: any) => any;
    autoMapper?: SchemaToSchemaMapperResult<any, any>;
    elementMapper?: (element: any) => Promise<any>;
};

// ── Array Element Mapper Resolution ───────────────────────────────────

/**
 * Resolves an element mapper for array properties.
 * Handles ObjectSchemaBuilder elements (via registry) and
 * primitive elements (direct copy when types match).
 * Returns null if no valid element mapper can be resolved.
 */
function resolveElementMapper(
    sourceElementSchema: SchemaBuilder<any, any, any>,
    targetElementSchema: SchemaBuilder<any, any, any>,
    registry: MappingRegistry<any, any> | undefined
): ((element: any) => Promise<any>) | null {
    // Both element schemas are ObjectSchemaBuilder: look up registered mapper
    if (
        sourceElementSchema instanceof ObjectSchemaBuilder &&
        targetElementSchema instanceof ObjectSchemaBuilder
    ) {
        if (registry) {
            const fromSchemaMappers =
                registry['_mappers'].get(sourceElementSchema);
            const autoMapper = fromSchemaMappers?.get(targetElementSchema);
            if (autoMapper) {
                return autoMapper as (element: any) => Promise<any>;
            }
        }
        // Same inferred structure: copy directly
        const fromKeys = Object.keys(
            sourceElementSchema.introspect().properties || {}
        ).sort();
        const toKeys = Object.keys(
            targetElementSchema.introspect().properties || {}
        ).sort();
        if (
            fromKeys.length === toKeys.length &&
            fromKeys.every((k, i) => k === toKeys[i])
        ) {
            const copy = async (element: any) => element;
            syncImplementations.set(copy, element => element);
            return copy;
        }
        return null;
    }

    // Both element schemas are ArraySchemaBuilder: recursive element mapping
    if (
        sourceElementSchema instanceof ArraySchemaBuilder &&
        targetElementSchema instanceof ArraySchemaBuilder
    ) {
        const innerSourceElement =
            sourceElementSchema.introspect().elementSchema;
        const innerTargetElement =
            targetElementSchema.introspect().elementSchema;
        if (innerSourceElement && innerTargetElement) {
            const innerMapper = resolveElementMapper(
                innerSourceElement,
                innerTargetElement,
                registry
            );
            if (innerMapper) {
                const mapArray = async (arr: any) => {
                    if (arr == null) return undefined;
                    if (!Array.isArray(arr)) return arr;
                    return Promise.all(arr.map(innerMapper));
                };
                const sync = syncImplementations.get(innerMapper);
                if (sync)
                    syncImplementations.set(mapArray, arr => {
                        if (arr == null) return undefined;
                        if (!Array.isArray(arr)) return arr;
                        return arr.map(sync);
                    });
                return mapArray;
            }
        }
        return null;
    }

    // Neither is ObjectSchemaBuilder nor ArraySchemaBuilder:
    // treat as primitive-compatible only when element schema types match.
    if (
        !(sourceElementSchema instanceof ObjectSchemaBuilder) &&
        !(targetElementSchema instanceof ObjectSchemaBuilder) &&
        !(sourceElementSchema instanceof ArraySchemaBuilder) &&
        !(targetElementSchema instanceof ArraySchemaBuilder)
    ) {
        const sourceIntrospection =
            typeof (sourceElementSchema as any).introspect === 'function'
                ? (sourceElementSchema as any).introspect()
                : undefined;
        const targetIntrospection =
            typeof (targetElementSchema as any).introspect === 'function'
                ? (targetElementSchema as any).introspect()
                : undefined;

        if (
            !sourceIntrospection ||
            !targetIntrospection ||
            sourceIntrospection.type !== targetIntrospection.type
        ) {
            return null;
        }
        const copy = async (element: any) => element;
        syncImplementations.set(copy, element => element);
        return copy;
    }

    return null;
}

// ── PropertyMappingBuilder ────────────────────────────────────────────

/**
 * Intermediate builder returned by `for()`. Provides three strategies
 * to configure how the selected target property is populated:
 * - `from()` — copy from a source property
 * - `compute()` — compute from the entire source object
 * - `ignore()` — explicitly skip the property
 */
export class PropertyMappingBuilder<
    TFromSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TKey extends string,
    TUnmapped extends string,
    TRegistered = never,
    TAsyncRegistered = never,
    TSteps = {}
> {
    private readonly _mapper: Mapper<
        TFromSchema,
        TToSchema,
        any,
        TRegistered,
        TAsyncRegistered,
        TSteps
    >;
    private readonly _targetKey: TKey;

    /** @internal */
    constructor(
        mapper: Mapper<
            TFromSchema,
            TToSchema,
            any,
            TRegistered,
            TAsyncRegistered,
            TSteps
        >,
        targetKey: TKey
    ) {
        this._mapper = mapper;
        this._targetKey = targetKey;
    }

    /**
     * Maps the target property from a source property. The selector
     * receives the source schema's PropertyDescriptorTree and supports
     * nested paths (e.g. `(s) => s.address.city`).
     *
     * Type compatibility is enforced: only source properties whose
     * inferred type is assignable to the target property type will
     * appear in the selector callback.
     *
     * Under `strictFunctionTypes`, the `setValue` and `getValue` constraints
     * provide bidirectional type checking:
     * - `setValue` contravariance rejects source schemas with extra properties
     * - `getValue` covariance rejects source schemas with missing properties
     * - registered mappings widen the constraint via intersection
     */
    public from<
        TReturn extends {
            [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
                getSchema(): SchemaBuilder<any, any, any>;
                setValue: (obj: any, value: any) => any;
                getValue: (obj: any) => {
                    value?: any;
                    success: boolean;
                };
            };
        }
    >(
        selector: (
            tree: PropertyDescriptorTree<TFromSchema, TFromSchema, any>
        ) => TReturn,
        ..._args: [TReturn] extends [never]
            ? [
                  error: `Property '${TKey}': source property type is not assignable to the target property type. Use compute() instead.`
              ]
            : IsFromCompatible<
                    TReturn,
                    TToSchema,
                    TKey,
                    TRegistered
                > extends true
              ? []
              : [
                    error: `Property '${TKey}': source property type is not assignable to the target property type. Use compute() instead.`
                ]
    ): Mapper<
        TFromSchema,
        TToSchema,
        Exclude<TUnmapped, TKey>,
        TRegistered,
        TAsyncRegistered,
        Step<
            TSteps,
            TKey,
            NestedAsync<
                ExtractPropertySchema<TReturn>,
                TargetPropertySchema<TToSchema, TKey>,
                TAsyncRegistered
            >
        >
    > {
        const sourceTree = ObjectSchemaBuilder.getPropertiesFor(
            this._mapper['_fromSchema']
        );
        const sourceDescriptor = selector(sourceTree as any);
        const inner = sourceDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];

        // Check if both source and target property schemas are ObjectSchemaBuilder;
        // if so, look up the registered mapper and use it at runtime.
        const sourceSchema = inner.getSchema();
        const toProperties = (this._mapper['_toSchema'].introspect()
            .properties || {}) as Record<string, any>;
        const targetPropSchema = toProperties[this._targetKey];

        if (
            sourceSchema instanceof ObjectSchemaBuilder &&
            targetPropSchema instanceof ObjectSchemaBuilder &&
            this._mapper['_registry']
        ) {
            const fromSchemaMappers =
                this._mapper['_registry']['_mappers'].get(sourceSchema);
            const autoMapper = fromSchemaMappers?.get(targetPropSchema);
            if (autoMapper) {
                this._mapper['_mappings'].set(this._targetKey, {
                    type: 'auto',
                    sourceDescriptorInner: inner,
                    autoMapper
                });
                return this._mapper as any;
            }
        }

        // Check if both source and target are ArraySchemaBuilder;
        // if so, resolve the element mapper and use element-wise mapping.
        if (
            sourceSchema instanceof ArraySchemaBuilder &&
            targetPropSchema instanceof ArraySchemaBuilder
        ) {
            const sourceElementSchema = (
                sourceSchema as ArraySchemaBuilder<
                    any,
                    any,
                    any,
                    any,
                    any,
                    any,
                    any
                >
            ).introspect().elementSchema;
            const targetElementSchema = (
                targetPropSchema as ArraySchemaBuilder<
                    any,
                    any,
                    any,
                    any,
                    any,
                    any,
                    any
                >
            ).introspect().elementSchema;

            if (sourceElementSchema && targetElementSchema) {
                const elementMapper = resolveElementMapper(
                    sourceElementSchema,
                    targetElementSchema,
                    this._mapper['_registry']
                );
                if (elementMapper) {
                    this._mapper['_mappings'].set(this._targetKey, {
                        type: 'autoArray',
                        sourceDescriptorInner: inner,
                        elementMapper
                    });
                    return this._mapper as any;
                }
            }
        }

        this._mapper['_mappings'].set(this._targetKey, {
            type: 'prop',
            sourceDescriptorInner: inner
        });

        return this._mapper as any;
    }

    /**
     * Computes the target property value from the entire source object.
     * Supports both sync and async functions.
     */
    public compute<
        TResult extends
            | SchemaPropertyInferredType<TToSchema, TKey>
            | Promise<SchemaPropertyInferredType<TToSchema, TKey>>
    >(
        fn: (obj: InferType<TFromSchema>) => TResult
    ): Mapper<
        TFromSchema,
        TToSchema,
        Exclude<TUnmapped, TKey>,
        TRegistered,
        TAsyncRegistered,
        Step<TSteps, TKey, IsAsync<TResult>>
    > {
        this._mapper['_mappings'].set(this._targetKey, {
            type: 'custom',
            fn: fn as any
        });

        return this._mapper as any;
    }

    /**
     * Explicitly excludes the target property from mapping.
     * The property will not appear in the output object.
     */
    public ignore(): Mapper<
        TFromSchema,
        TToSchema,
        Exclude<TUnmapped, TKey>,
        TRegistered,
        TAsyncRegistered,
        Step<TSteps, TKey, false>
    > {
        this._mapper['_mappings'].set(this._targetKey, {
            type: 'ignore'
        });

        return this._mapper as any;
    }
}

// ── Mapper ────────────────────────────────────────────────────────────

/**
 * A fluent builder for configuring how each target property is populated
 * from a source schema. Uses PropertyDescriptors as pointers to properties
 * (similar to expressions in C# .NET).
 *
 * The `TUnmapped` type parameter tracks which target properties have not
 * yet been mapped or ignored. `getMapper()` is only callable (without
 * arguments) when `TUnmapped` is `never` — i.e. all properties have been
 * accounted for. If any property is missing, TypeScript will produce a
 * compile-time type error (a type-assignability mismatch that includes
 * the unmapped property names in its type parameters).
 *
 * @typeParam TFromSchema - source ObjectSchemaBuilder
 * @typeParam TToSchema - target ObjectSchemaBuilder
 * @typeParam TUnmapped - union of target property key names not yet mapped
 */
export class Mapper<
    TFromSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TUnmapped extends string = SchemaKeys<TToSchema>,
    TRegistered = never,
    TAsyncRegistered = never,
    TSteps = {}
> {
    /** Phantom property for structural type-checking of TUnmapped. */
    declare readonly [SYMBOL_UNMAPPED]: TUnmapped;
    /** @internal Tracks final per-property computations without executing them. */
    declare readonly [SYMBOL_STEPS]: TSteps;

    private readonly _fromSchema: TFromSchema;
    private readonly _toSchema: TToSchema;
    private readonly _registry: MappingRegistry<any, any> | undefined;
    private readonly _mappings: Map<string, MappingEntry> = new Map();

    /**
     * Creates a new instance of the Mapper class.
     * @param fromSchema - `object` schema to map from
     * @param toSchema - `object` schema to map to
     * @param registry - optional MappingRegistry to auto-register the mapper
     */
    public constructor(
        fromSchema: TFromSchema,
        toSchema: TToSchema,
        registry?: MappingRegistry<any, any>
    ) {
        this._fromSchema = fromSchema;
        this._toSchema = toSchema;
        this._registry = registry;
    }

    /**
     * Selects a target property to configure. The selector callback
     * receives a tree of all target properties. Navigate by
     * property name: `(t) => t.cityName`.
     *
     * Auto-mappable properties (same name and compatible type, or
     * ObjectSchemaBuilder with a registered mapping) are also available
     * for explicit override.
     */
    public for<TKey extends SchemaKeys<TToSchema>>(
        selector: (
            tree: TargetPropertyTree<TToSchema, SchemaKeys<TToSchema>>
        ) => TargetPropertyKey<TKey>
    ): PropertyMappingBuilder<
        TFromSchema,
        TToSchema,
        TKey,
        TUnmapped,
        TRegistered,
        TAsyncRegistered,
        TSteps
    > {
        // At runtime, use a Proxy to detect which property was accessed
        let capturedKey: string | undefined;
        const proxy = new Proxy({} as any, {
            get(_target, prop) {
                if (typeof prop === 'string') {
                    capturedKey = prop;
                }
                return { [SYMBOL_TARGET_PROPERTY_KEY]: prop };
            }
        });

        selector(proxy);

        if (!capturedKey) {
            throw new Error(
                'for selector must access a property on the target tree'
            );
        }

        // Validate that the captured key exists in the target schema
        const toIntrospection = this._toSchema.introspect();
        const targetProperties = toIntrospection.properties
            ? Object.keys(toIntrospection.properties)
            : [];
        if (!targetProperties.includes(capturedKey)) {
            throw new MapperConfigurationError(
                `Property "${capturedKey}" does not exist in the target schema`
            );
        }

        return new PropertyMappingBuilder(this, capturedKey as TKey);
    }

    /**
     * Compile a synchronous function when the complete mapping has no async steps.
     * Eligibility is inferred through compute(), from(), nested mappings and overrides.
     * Callbacks are never probed during configuration. A disguised Promise/thenable
     * throws at invocation; known async functions/dependencies throw at compilation.
     * @throws MapperConfigurationError for incomplete or asynchronous mappings.
     */
    public getSyncMapper(
        ..._args: SyncMappingArguments<
            TUnmapped,
            AsyncKeys<TFromSchema, TToSchema, TAsyncRegistered, TSteps>
        >
    ): SyncSchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        return synchronous(
            (
                this.getMapper as () => SchemaToSchemaMapperResult<
                    TFromSchema,
                    TToSchema
                >
            )()
        );
    }

    /**
     * Returns the configured async mapping function.
     *
     * **Compile-time safety:** This method is only callable without
     * arguments when all target properties have been mapped or explicitly
     * ignored. If any property is unmapped, TypeScript will require
     * a string argument describing the unmapped properties, producing
     * a clear compile-time error.
     *
     * **Runtime safety:** Even if TypeScript checks are bypassed (e.g.
     * via `as any`), a `MapperConfigurationError` is thrown at runtime
     * listing the unmapped properties.
     */
    public getMapper(
        ..._args: [TUnmapped] extends [never]
            ? []
            : [error: `Unmapped properties: ${TUnmapped}`]
    ): SchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        // Runtime validation: ensure all target properties are covered
        const toIntrospection = this._toSchema.introspect();
        const targetProperties = toIntrospection.properties
            ? Object.keys(toIntrospection.properties)
            : [];

        // Auto-mapping: fill in unmapped properties using registered nested mappers
        if (this._registry) {
            const fromIntrospection = this._fromSchema.introspect();
            const fromProperties = (fromIntrospection.properties ||
                {}) as Record<string, any>;
            const toProperties = (toIntrospection.properties || {}) as Record<
                string,
                any
            >;
            const fromTree = ObjectSchemaBuilder.getPropertiesFor(
                this._fromSchema
            );

            for (const key of targetProperties) {
                if (this._mappings.has(key)) continue;

                const fromPropSchema = fromProperties[key];
                const toPropSchema = toProperties[key];

                if (!fromPropSchema || !toPropSchema) continue;

                const sourceDescriptor = (fromTree as any)[key];
                if (!sourceDescriptor?.[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR])
                    continue;

                // ObjectSchemaBuilder → ObjectSchemaBuilder: use registered mapper
                if (
                    fromPropSchema instanceof ObjectSchemaBuilder &&
                    toPropSchema instanceof ObjectSchemaBuilder
                ) {
                    const fromSchemaMappers =
                        this._registry['_mappers'].get(fromPropSchema);
                    const autoMapper = fromSchemaMappers?.get(toPropSchema);
                    if (autoMapper) {
                        this._mappings.set(key, {
                            type: 'auto',
                            sourceDescriptorInner:
                                sourceDescriptor[
                                    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                                ],
                            autoMapper
                        });
                        continue;
                    }

                    // Same-name ObjectSchemaBuilder with identical property keys:
                    // copy directly (full type safety ensured at compile time
                    // via bidirectional InferType check)
                    const fromKeys = Object.keys(
                        fromPropSchema.introspect().properties || {}
                    ).sort();
                    const toKeys = Object.keys(
                        toPropSchema.introspect().properties || {}
                    ).sort();
                    if (
                        fromKeys.length === toKeys.length &&
                        fromKeys.every((k, i) => k === toKeys[i])
                    ) {
                        this._mappings.set(key, {
                            type: 'prop',
                            sourceDescriptorInner:
                                sourceDescriptor[
                                    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                                ]
                        });
                    }
                    continue;
                }

                // Primitive → Primitive: auto-map same-name props
                // (type compatibility is ensured at the type level by
                // KeysNeedingMapping / NeedsMapping)
                if (
                    !(fromPropSchema instanceof ObjectSchemaBuilder) &&
                    !(toPropSchema instanceof ObjectSchemaBuilder) &&
                    !(fromPropSchema instanceof ArraySchemaBuilder) &&
                    !(toPropSchema instanceof ArraySchemaBuilder)
                ) {
                    this._mappings.set(key, {
                        type: 'prop',
                        sourceDescriptorInner:
                            sourceDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                    });
                    continue;
                }

                // ArraySchemaBuilder → ArraySchemaBuilder: use element mapper
                if (
                    fromPropSchema instanceof ArraySchemaBuilder &&
                    toPropSchema instanceof ArraySchemaBuilder
                ) {
                    const sourceElementSchema =
                        fromPropSchema.introspect().elementSchema;
                    const targetElementSchema =
                        toPropSchema.introspect().elementSchema;
                    if (sourceElementSchema && targetElementSchema) {
                        const elementMapper = resolveElementMapper(
                            sourceElementSchema,
                            targetElementSchema,
                            this._registry
                        );
                        if (elementMapper) {
                            this._mappings.set(key, {
                                type: 'autoArray',
                                sourceDescriptorInner:
                                    sourceDescriptor[
                                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                                    ],
                                elementMapper
                            });
                        }
                    }
                }
            }
        }

        const unmapped = targetProperties.filter(
            key => !this._mappings.has(key)
        );

        if (unmapped.length > 0) {
            throw new MapperConfigurationError(unmapped);
        }

        const targetTree = ObjectSchemaBuilder.getPropertiesFor(this._toSchema);

        const mappings = new Map(this._mappings);

        const mapperFn = async (
            source: InferType<TFromSchema>
        ): Promise<InferType<TToSchema>> => {
            const result = {} as any;

            for (const [key, entry] of mappings) {
                if (entry.type === 'ignore') {
                    continue;
                }

                let value: any;

                if (entry.type === 'prop') {
                    const getResult =
                        entry.sourceDescriptorInner.getValue(source);
                    if (getResult.success) {
                        value = getResult.value;
                    } else {
                        continue;
                    }
                } else if (entry.type === 'custom') {
                    value = await entry.fn!(source);
                } else if (entry.type === 'auto') {
                    const getResult =
                        entry.sourceDescriptorInner.getValue(source);
                    if (getResult.success && getResult.value !== undefined) {
                        value = await entry.autoMapper!(getResult.value);
                    } else {
                        continue;
                    }
                } else if (entry.type === 'autoArray') {
                    const getResult =
                        entry.sourceDescriptorInner.getValue(source);
                    // null/undefined → skip (spec §6); non-array → error
                    if (getResult.success && getResult.value != null) {
                        if (!Array.isArray(getResult.value)) {
                            throw new MapperConfigurationError(
                                `Expected array for property "${key}" but got ${typeof getResult.value}`
                            );
                        }
                        value = await Promise.all(
                            getResult.value.map(entry.elementMapper!)
                        );
                    } else {
                        continue;
                    }
                }

                const targetDescriptor = (targetTree as any)[key];
                if (targetDescriptor?.[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]) {
                    targetDescriptor[
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                    ].setValue(result, value, {
                        createMissingStructure: true
                    });
                } else {
                    result[key] = value;
                }
            }

            return result;
        };

        // The same finalized entries drive the sync executor. Only execution differs;
        // descriptor selection, automatic mapping and completeness are shared above.
        const syncEntries = [...mappings].map(([key, entry]) => {
            const nested = entry.autoMapper ?? entry.elementMapper;
            const nestedSync = nested
                ? syncImplementations.get(nested)
                : undefined;
            if (
                (nested && !nestedSync) ||
                entry.fn?.constructor.name === 'AsyncFunction'
            )
                return null;
            return { key, entry, nestedSync };
        });
        if (syncEntries.every(entry => entry !== null)) {
            syncImplementations.set(mapperFn, source => {
                const result: Record<string, any> = {};
                for (const { key, entry, nestedSync } of syncEntries) {
                    if (entry.type === 'ignore') continue;
                    let value: any;
                    if (entry.type === 'custom')
                        value = assertSync(entry.fn!(source), key);
                    else {
                        const read =
                            entry.sourceDescriptorInner.getValue(source);
                        if (!read.success) continue;
                        value = read.value;
                        if (entry.type === 'auto') {
                            if (value === undefined) continue;
                            value = assertSync(nestedSync!(value), key);
                        } else if (entry.type === 'autoArray') {
                            if (value == null) continue;
                            if (!Array.isArray(value))
                                throw new MapperConfigurationError(
                                    `Expected array for property "${key}" but got ${typeof value}`
                                );
                            value = value.map(element =>
                                assertSync(nestedSync!(element), key)
                            );
                        }
                    }
                    const target = (targetTree as any)[key]?.[
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                    ];
                    if (target)
                        target.setValue(result, value, {
                            createMissingStructure: true
                        });
                    else result[key] = value;
                }
                return result;
            });
        }

        // Auto-register in the registry if available
        if (this._registry) {
            this._registry['_mappers']
                .get(this._fromSchema)
                ?.set(this._toSchema, mapperFn);
        }

        return mapperFn;
    }
}

// ── MappingRegistry ───────────────────────────────────────────────────

export class MappingRegistry<TRegistered = never, TAsyncRegistered = never> {
    protected readonly _mappers: Map<
        ObjectSchemaBuilder<any, any, any, any, any, any, any>,
        Map<
            ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            SchemaToSchemaMapperResult<any, any>
        >
    > = new Map();

    #ensureObjectSchemas(
        fromSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
        toSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
    ): boolean {
        return !(
            !fromSchema ||
            !toSchema ||
            fromSchema instanceof ObjectSchemaBuilder === false ||
            toSchema instanceof ObjectSchemaBuilder === false
        );
    }

    /**
     * Defines a mapping between two schemas and returns a new immutable
     * registry containing the mapping. The callback `fn` receives a fresh
     * `Mapper` and must return it after configuring property mappings.
     * The mapper is automatically finalized and registered. Properties
     * not explicitly mapped or ignored may be auto-mapped if a matching
     * nested mapping is already registered in the registry.
     *
     * @param fromSchema - source ObjectSchemaBuilder
     * @param toSchema - target ObjectSchemaBuilder
     * @param fn - callback that configures property mappings on the mapper
     * @returns a new MappingRegistry containing all previous mappings plus
     *          the newly configured one
     * @throws if schemas are invalid, mapping is duplicate, or unmapped
     *         properties remain that cannot be auto-mapped
     */
    public configure<
        TFromSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TToSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TSteps = {}
    >(
        fromSchema: TFromSchema,
        toSchema: TToSchema,
        fn: (
            mapper: Mapper<
                TFromSchema,
                TToSchema,
                KeysNeedingMapping<TFromSchema, TToSchema, TRegistered>,
                TRegistered,
                TAsyncRegistered
            >
        ) => Mapper<
            TFromSchema,
            TToSchema,
            never,
            TRegistered,
            TAsyncRegistered,
            TSteps
        >
    ): MappingRegistry<
        TRegistered | [TFromSchema, TToSchema],
        | TAsyncRegistered
        | ([
              AsyncKeys<TFromSchema, TToSchema, TAsyncRegistered, TSteps>
          ] extends [never]
              ? never
              : [TFromSchema, TToSchema])
    > {
        if (!this.#ensureObjectSchemas(fromSchema, toSchema)) {
            throw new Error(
                'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
            );
        }

        // Check for duplicate mappings
        const existingFromMappers = this._mappers.get(fromSchema);
        if (existingFromMappers?.has(toSchema)) {
            throw new Error(
                'Duplicate mapping: a mapping for this schemas pair is already registered'
            );
        }

        // Create new immutable registry with cloned mappings
        const newRegistry = new MappingRegistry<
            TRegistered | [TFromSchema, TToSchema],
            | TAsyncRegistered
            | ([
                  AsyncKeys<TFromSchema, TToSchema, TAsyncRegistered, TSteps>
              ] extends [never]
                  ? never
                  : [TFromSchema, TToSchema])
        >();
        for (const [from, toMap] of this._mappers) {
            newRegistry._mappers.set(from, new Map(toMap));
        }

        // Ensure the from→to map slot exists so getMapper can register
        if (!newRegistry._mappers.has(fromSchema)) {
            newRegistry._mappers.set(fromSchema, new Map());
        }

        // Create mapper with new registry reference
        const mapper = new Mapper<
            TFromSchema,
            TToSchema,
            KeysNeedingMapping<TFromSchema, TToSchema, TRegistered>,
            TRegistered,
            TAsyncRegistered
        >(fromSchema, toSchema, newRegistry);

        // Configure via user callback
        const configuredMapper = fn(mapper);

        // Implicit finalization: auto-map + validate + register
        configuredMapper.getMapper();

        return newRegistry;
    }

    /**
     * Retrieve a registered synchronous mapper inferred from configure().
     * The pair must be registered and its final steps must all be synchronous.
     * Async mappings remain usable with getMapper(); configuration never executes
     * compute callbacks. Unexpected thenables throw when the returned mapper runs.
     * @throws MapperConfigurationError for an asynchronous dependency.
     * @throws Error if the schema pair has not been registered.
     */
    public getSyncMapper<
        TFromSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        fromSchema: TFromSchema,
        toSchema: TToSchema,
        ..._args: RegisteredSyncArguments<
            [TFromSchema, TToSchema],
            TRegistered,
            TAsyncRegistered
        >
    ): SyncSchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        return synchronous(this.getMapper(fromSchema, toSchema));
    }

    /**
     * Gets a mapper function that will map from the fromSchema to the toSchema.
     * Throws an error if no mapper is found for the given schemas pair.
     * @param fromSchema a schema to map from
     * @param toSchema a schema to map to
     * @returns a function that will take a value of the fromSchema type as an argument and
     * return a promise resolving to a value of the toSchema type
     */
    public getMapper<
        TFromSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >,
        TToSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
    >(
        fromSchema: TFromSchema,
        toSchema: TToSchema
    ): SchemaToSchemaMapperResult<TFromSchema, TToSchema> {
        if (!this.#ensureObjectSchemas(fromSchema, toSchema)) {
            throw new Error(
                'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
            );
        }

        const mappers = this._mappers.get(fromSchema);
        if (!mappers) {
            throw new Error('No mapper found for the given schemas pair');
        }
        const mapper = mappers.get(toSchema);
        if (!mapper) {
            throw new Error('No mapper found for the given schemas pair');
        }

        return mapper;
    }
}

/**
 * Creates a new empty {@link MappingRegistry}.
 *
 * This is a convenience factory function — an alternative to
 * `new MappingRegistry()` that reads better in a fluent chain:
 *
 * ```ts
 * const registry = mapper()
 *   .configure(A, B, m => ...)
 *   .configure(C, D, m => ...);
 * ```
 */
export function mapper(): MappingRegistry {
    return new MappingRegistry();
}
