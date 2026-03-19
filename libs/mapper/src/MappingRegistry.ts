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
 * `forProp` callback, enabling compile-time tracking of mapped vs unmapped
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
    type: 'prop' | 'custom' | 'ignore';
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
};

// ── PropertyMappingBuilder ────────────────────────────────────────────

/**
 * Intermediate builder returned by `forProp()`. Provides three strategies
 * to configure how the selected target property is populated:
 * - `mapFromProp()` — copy from a source property
 * - `mapFrom()` — compute from the entire source object
 * - `ignore()` — explicitly skip the property
 */
export class PropertyMappingBuilder<
    TFromSchema extends ObjectSchemaBuilder<any, any, any>,
    TToSchema extends ObjectSchemaBuilder<any, any, any>,
    TKey extends string,
    TUnmapped extends string
> {
    private readonly _mapper: Mapper<TFromSchema, TToSchema, any>;
    private readonly _targetKey: TKey;

    /** @internal */
    constructor(mapper: Mapper<TFromSchema, TToSchema, any>, targetKey: TKey) {
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
    public mapFromProp<TPropertySchema extends SchemaBuilder<any, any>>(
        selector: (
            tree: PropertyDescriptorTree<
                TFromSchema,
                TFromSchema,
                SchemaPropertyInferredType<TToSchema, TKey>
            >
        ) => PropertyDescriptor<TFromSchema, TPropertySchema, any>
    ): Mapper<TFromSchema, TToSchema, Exclude<TUnmapped, TKey>> {
        const sourceTree = ObjectSchemaBuilder.getPropertiesFor(
            this._mapper['_fromSchema']
        );
        const sourceDescriptor = selector(sourceTree as any);
        const inner = sourceDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];

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
    public mapFrom(
        fn:
            | ((
                  obj: InferType<TFromSchema>
              ) => SchemaPropertyInferredType<TToSchema, TKey>)
            | ((
                  obj: InferType<TFromSchema>
              ) => Promise<SchemaPropertyInferredType<TToSchema, TKey>>)
    ): Mapper<TFromSchema, TToSchema, Exclude<TUnmapped, TKey>> {
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
    public ignore(): Mapper<TFromSchema, TToSchema, Exclude<TUnmapped, TKey>> {
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
    TUnmapped extends string = SchemaKeys<TToSchema>
> {
    private readonly _fromSchema: TFromSchema;
    private readonly _toSchema: TToSchema;
    private readonly _registry: MappingRegistry | undefined;
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
        registry?: MappingRegistry
    ) {
        this._fromSchema = fromSchema;
        this._toSchema = toSchema;
        this._registry = registry;
    }

    /**
     * Selects a target property to configure. The selector callback
     * receives a tree of all unmapped target properties. Navigate by
     * property name: `(t) => t.cityName`.
     *
     * Only properties that have not yet been mapped or ignored are
     * available in the selector tree.
     */
    public forProp<TKey extends TUnmapped>(
        selector: (
            tree: TargetPropertyTree<TToSchema, TUnmapped>
        ) => TargetPropertyKey<TKey>
    ): PropertyMappingBuilder<TFromSchema, TToSchema, TKey, TUnmapped> {
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
                'forProp selector must access a property on the target tree'
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
        const introspection = this._toSchema.introspect();
        const targetProperties = introspection.properties
            ? Object.keys(introspection.properties)
            : [];

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

export class MappingRegistry {
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
     * Registers a new mapper for the given schemas pair.
     * If a mapper already exists for the given schemas pair
     * it will be overwritten silently.
     * If the fromSchema or toSchema are not instances of ObjectSchemaBuilder
     * an error will be thrown.
     * @param fromSchema a schema to map from
     * @param toSchema a schema to map to (must be an ObjectSchemaBuilder)
     * @returns a new instance of the Mapper class for the given schemas pair
     * to allow for further configuration
     */
    public map<
        TFromSchema extends ObjectSchemaBuilder<any, any, any>,
        TToSchema extends ObjectSchemaBuilder<any, any, any>
    >(
        fromSchema: TFromSchema,
        toSchema: TToSchema
    ): Mapper<TFromSchema, TToSchema> {
        if (!this.#ensureObjectSchemas(fromSchema, toSchema)) {
            throw new Error(
                'Both fromSchema and toSchema must be instances of ObjectSchemaBuilder'
            );
        }

        const fromSchemaMappers = this._mappers.get(fromSchema) || new Map();
        this._mappers.set(fromSchema, fromSchemaMappers);

        const result = new Mapper(fromSchema, toSchema, this);
        return result;
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
