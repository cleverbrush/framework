import {
    InferType,
    ObjectSchemaBuilder,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    PropertyDescriptorTree,
    PropertyDescriptor
} from '@cleverbrush/schema';

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
    readonly __targetPropertyKey: K;
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
 * Determines whether a property needs an explicit mapping configuration.
 *
 * - Both are ObjectSchemaBuilder with registered mapping → `false` (auto-mappable)
 * - Both are ObjectSchemaBuilder without registered mapping → `true`
 * - Either is ObjectSchemaBuilder but the other is not → `true`
 * - Neither is ObjectSchemaBuilder + InferType<source> extends InferType<target>
 *   → `false` (same-name, compatible primitive types → auto-mappable)
 * - Neither is ObjectSchemaBuilder + incompatible InferType → `true`
 */
type NeedsMapping<TSourcePropSchema, TTargetPropSchema, TRegistered> =
    TSourcePropSchema extends ObjectSchemaBuilder<any, any, any>
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
 * Checks whether a `from` call should produce a compile-time error.
 *
 * Returns `true` (error) when:
 * - `TSourcePropSchema` is `never` (the PropertyDescriptorTree filtered
 *   it out because InferType is not assignable to the target property type)
 * - Source is ObjectSchemaBuilder but target property is not
 *   (cannot auto-map object → primitive)
 * - Both are ObjectSchemaBuilder but no mapping is registered
 *
 * Returns `false` (OK) when:
 * - Source is not ObjectSchemaBuilder and not `never`
 *   (type-compatible; the PropertyDescriptorTree filter ensures this)
 * - Both are ObjectSchemaBuilder and a mapping is registered
 */
type FromNeedsRegistration<
    TSourcePropSchema,
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TRegistered
> = [TSourcePropSchema] extends [never]
    ? true
    : TSourcePropSchema extends ObjectSchemaBuilder<any, any, any>
      ? TargetPropertySchema<TToSchema, TKey> extends ObjectSchemaBuilder<
            any,
            any,
            any
        >
          ? [
                TSourcePropSchema,
                TargetPropertySchema<TToSchema, TKey>
            ] extends TRegistered
              ? false
              : InferType<TSourcePropSchema> extends InferType<
                      TargetPropertySchema<TToSchema, TKey>
                  >
                ? InferType<
                      TargetPropertySchema<TToSchema, TKey>
                  > extends InferType<TSourcePropSchema>
                    ? false
                    : true
                : true
          : true
      : false;

/**
 * Extracts the schema type parameter from a PropertyDescriptor.
 * Used to recover the source property schema from the inferred return
 * type of the `from` selector callback.
 */
type GetSchemaFromDescriptor<T> =
    T extends PropertyDescriptor<any, infer TSchema, any> ? TSchema : never;

// ── Mapper Result Type ────────────────────────────────────────────────

export type SchemaToSchemaMapperResult<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>
> = (from: InferType<TFromSchema>) => Promise<InferType<TToSchema>>;

// ── Error Class ───────────────────────────────────────────────────────

export class MapperConfigurationError extends Error {
    constructor(unmappedProperties: string[]) {
        super(
            `Mapper configuration error: the following target properties are not mapped and not ignored: ${unmappedProperties.join(', ')}`
        );
        this.name = 'MapperConfigurationError';
    }
}

// ── Internal Mapping Entry ────────────────────────────────────────────

type MappingEntry = {
    type: 'prop' | 'custom' | 'ignore' | 'auto';
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
};

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
     */
    public from<
        TPropertySchema extends SchemaBuilder<any, any>,
        TReturn extends PropertyDescriptor<TFromSchema, TPropertySchema, any>
    >(
        selector: (
            tree: PropertyDescriptorTree<
                TFromSchema,
                TFromSchema,
                SchemaPropertyInferredType<TToSchema, TKey>
            >
        ) => TReturn,
        ...args: [TReturn] extends [never]
            ? [
                  error: `Source property type is not assignable to target property '${TKey}' type`
              ]
            : FromNeedsRegistration<
                    GetSchemaFromDescriptor<TReturn>,
                    TToSchema,
                    TKey,
                    TRegistered
                > extends true
              ? [
                    error: `Property '${TKey}' maps between incompatible schema types. Register a mapping for the source→target schema pair first, or use compute() instead.`
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
 * compile-time error showing the names of the unmapped properties.
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
    declare readonly __unmapped: TUnmapped;

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
                return { __targetPropertyKey: prop };
            }
        });

        selector(proxy);

        if (!capturedKey) {
            throw new Error(
                'for selector must access a property on the target tree'
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
        ...args: [TUnmapped] extends [never]
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
                if (
                    !sourceDescriptor ||
                    !sourceDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                )
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
                    !(toPropSchema instanceof ObjectSchemaBuilder)
                ) {
                    this._mappings.set(key, {
                        type: 'prop',
                        sourceDescriptorInner:
                            sourceDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                    });
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
                }

                const targetDescriptor = (targetTree as any)[key];
                if (
                    targetDescriptor &&
                    targetDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                ) {
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
        if (existingFromMappers && existingFromMappers.has(toSchema)) {
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
