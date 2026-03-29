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

// ── Helper Types ──────────────────────────────────────────────────────

/**
 * Extracts the properties record from an ObjectSchemaBuilder.
 */
type ExtractSchemaProperties<T> =
    T extends ObjectSchemaBuilder<infer TProperties, any, any>
        ? TProperties
        : never;

/**
 * Gets all top-level property key names of an ObjectSchemaBuilder.
 */
type SchemaKeys<T extends ObjectSchemaBuilder<any, any, any>> =
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
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TAllowedKeys extends string
> = {
    [K in SchemaKeys<TSchema> & TAllowedKeys]: TargetPropertyKey<K> &
        PropertyDescriptor<TSchema, ExtractSchemaProperties<TSchema>[K], any>;
};

/**
 * Infers the TypeScript type of a specific property in an ObjectSchemaBuilder
 * by its key name.
 */
type SchemaPropertyInferredType<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    K extends string
> = K extends keyof ExtractSchemaProperties<TSchema>
    ? InferType<ExtractSchemaProperties<TSchema>[K]>
    : never;

/**
 * Extracts the schema (SchemaBuilder) of a specific property in an
 * ObjectSchemaBuilder by its key name.
 */
type TargetPropertySchema<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    K extends string
> = K extends keyof ExtractSchemaProperties<TSchema>
    ? ExtractSchemaProperties<TSchema>[K]
    : never;

/**
 * Extracts the element schema from an ArraySchemaBuilder.
 */
type ExtractArrayElementSchema<T> =
    T extends ArraySchemaBuilder<infer TElementSchema, any, any>
        ? TElementSchema
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
    TSourcePropSchema extends ArraySchemaBuilder<any, any, any>
        ? TTargetPropSchema extends ArraySchemaBuilder<any, any, any>
            ? NeedsMapping<
                  ExtractArrayElementSchema<TSourcePropSchema>,
                  ExtractArrayElementSchema<TTargetPropSchema>,
                  TRegistered
              >
            : true
        : TTargetPropSchema extends ArraySchemaBuilder<any, any, any>
          ? true
          : TSourcePropSchema extends ObjectSchemaBuilder<any, any, any>
            ? TTargetPropSchema extends ObjectSchemaBuilder<any, any, any>
                ? [TSourcePropSchema, TTargetPropSchema] extends TRegistered
                    ? false
                    : InferType<TSourcePropSchema> extends InferType<TTargetPropSchema>
                      ? InferType<TTargetPropSchema> extends InferType<TSourcePropSchema>
                          ? false
                          : true
                      : true
                : true
            : TTargetPropSchema extends ObjectSchemaBuilder<any, any, any>
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
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
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
 * From a TRegistered union of [SourceSchema, TargetSchema] tuples,
 * extract the source schema(s) registered for a given target schema.
 */
type ExtractRegisteredSource<TTargetSchema, TRegistered> = TRegistered extends [
    infer TSource,
    TTargetSchema
]
    ? TSource
    : never;

/**
 * Compute the InferType of the registered source schema for a target
 * property's schema. Returns `never` when no registration exists.
 */
type RegisteredSourceInferType<
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TRegistered
> =
    TargetPropertySchema<TToSchema, TKey> extends ObjectSchemaBuilder<
        any,
        any,
        any
    >
        ? InferType<
              ExtractRegisteredSource<
                  TargetPropertySchema<TToSchema, TKey>,
                  TRegistered
              >
          >
        : TargetPropertySchema<TToSchema, TKey> extends ArraySchemaBuilder<
                infer TTargetElem,
                any,
                any
            >
          ? TTargetElem extends ObjectSchemaBuilder<any, any, any>
              ? InferType<ExtractRegisteredSource<TTargetElem, TRegistered>>[]
              : never
          : never;

/**
 * The InferType value acceptable for the `from()` setValue constraint
 * (contravariant position).
 *
 * When no registration exists, this is the target property's InferType.
 * When a registration exists, this is the intersection of the target
 * property's InferType and the registered source's InferType. The
 * intersection widens the constraint under `strictFunctionTypes`
 * contravariance (setValue's parameter), allowing registered source
 * schemas whose InferType differs from the target's.
 */
type AcceptableFromValue<
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TRegistered
> = [RegisteredSourceInferType<TToSchema, TKey, TRegistered>] extends [never]
    ? SchemaPropertyInferredType<TToSchema, TKey>
    : SchemaPropertyInferredType<TToSchema, TKey> &
          RegisteredSourceInferType<TToSchema, TKey, TRegistered>;

/**
 * The InferType value acceptable for the `from()` getValue constraint
 * (covariant position).
 *
 * When no registration exists, this is the target property's InferType.
 * When a registration exists, this is the union of the target property's
 * InferType and the registered source's InferType. The union widens the
 * constraint under covariance (getValue's return), allowing registered
 * source schemas whose InferType differs from the target's.
 */
type AcceptableFromValueCovariant<
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TRegistered
> = [RegisteredSourceInferType<TToSchema, TKey, TRegistered>] extends [never]
    ? SchemaPropertyInferredType<TToSchema, TKey>
    :
          | SchemaPropertyInferredType<TToSchema, TKey>
          | RegisteredSourceInferType<TToSchema, TKey, TRegistered>;

// ── Mapper Result Type ────────────────────────────────────────────────

export type SchemaToSchemaMapperResult<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>
> = (from: InferType<TFromSchema>) => Promise<InferType<TToSchema>>;

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
    sourceElementSchema: SchemaBuilder<any, any>,
    targetElementSchema: SchemaBuilder<any, any>,
    registry: MappingRegistry<any> | undefined
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
            return async (element: any) => element;
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
                return async (arr: any) => {
                    if (arr == null) return undefined;
                    if (!Array.isArray(arr)) return arr;
                    return Promise.all(arr.map(innerMapper));
                };
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
        return async (element: any) => element;
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
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TUnmapped extends string,
    TRegistered = never
> {
    private readonly _mapper: Mapper<TFromSchema, TToSchema, any, TRegistered>;
    private readonly _targetKey: TKey;

    /** @internal */
    constructor(
        mapper: Mapper<TFromSchema, TToSchema, any, TRegistered>,
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
                getSchema(): SchemaBuilder<any, any>;
                setValue: (
                    obj: any,
                    value: AcceptableFromValue<TToSchema, TKey, TRegistered>
                ) => any;
                getValue: (obj: any) => {
                    value?: AcceptableFromValueCovariant<
                        TToSchema,
                        TKey,
                        TRegistered
                    >;
                    success: boolean;
                };
            };
        }
    >(
        selector: (
            tree: PropertyDescriptorTree<
                TFromSchema,
                TFromSchema,
                SchemaPropertyInferredType<TToSchema, TKey>
            >
        ) => TReturn,
        ..._args: [TReturn] extends [never]
            ? [
                  error: `Property '${TKey}': source property type is not assignable to the target property type. Use compute() instead.`
              ]
            : []
    ): Mapper<TFromSchema, TToSchema, Exclude<TUnmapped, TKey>, TRegistered> {
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
                sourceSchema as ArraySchemaBuilder<any, any, any>
            ).introspect().elementSchema;
            const targetElementSchema = (
                targetPropSchema as ArraySchemaBuilder<any, any, any>
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
    public compute(
        fn:
            | ((
                  obj: InferType<TFromSchema>
              ) => SchemaPropertyInferredType<TToSchema, TKey>)
            | ((
                  obj: InferType<TFromSchema>
              ) => Promise<SchemaPropertyInferredType<TToSchema, TKey>>)
    ): Mapper<TFromSchema, TToSchema, Exclude<TUnmapped, TKey>, TRegistered> {
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
        TRegistered
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
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TUnmapped extends string = SchemaKeys<TToSchema>,
    TRegistered = never
> {
    /** Phantom property for structural type-checking of TUnmapped. */
    declare readonly [SYMBOL_UNMAPPED]: TUnmapped;

    private readonly _fromSchema: TFromSchema;
    private readonly _toSchema: TToSchema;
    private readonly _registry: MappingRegistry<any> | undefined;
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
        registry?: MappingRegistry<any>
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
        TRegistered
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
            (key) => !this._mappings.has(key)
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

export class MappingRegistry<TRegistered = never> {
    protected readonly _mappers: Map<
        ObjectSchemaBuilder<any, any, any>,
        Map<
            ObjectSchemaBuilder<any, any, any>,
            SchemaToSchemaMapperResult<any, any>
        >
    > = new Map();

    #ensureObjectSchemas(
        fromSchema: ObjectSchemaBuilder<any, any, any>,
        toSchema: ObjectSchemaBuilder<any, any, any>
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
        TFromSchema extends ObjectSchemaBuilder<any, any, any>,
        TToSchema extends ObjectSchemaBuilder<any, any, any>
    >(
        fromSchema: TFromSchema,
        toSchema: TToSchema,
        fn: (
            mapper: Mapper<
                TFromSchema,
                TToSchema,
                KeysNeedingMapping<TFromSchema, TToSchema, TRegistered>,
                TRegistered
            >
        ) => Mapper<TFromSchema, TToSchema, never, TRegistered>
    ): MappingRegistry<TRegistered | [TFromSchema, TToSchema]> {
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
            TRegistered | [TFromSchema, TToSchema]
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
            TRegistered
        >(fromSchema, toSchema, newRegistry);

        // Configure via user callback
        const configuredMapper = fn(mapper);

        // Implicit finalization: auto-map + validate + register
        (
            configuredMapper as Mapper<
                TFromSchema,
                TToSchema,
                never,
                TRegistered
            >
        ).getMapper();

        return newRegistry;
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
        TFromSchema extends ObjectSchemaBuilder<any, any, any>,
        TToSchema extends ObjectSchemaBuilder<any, any, any>
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
