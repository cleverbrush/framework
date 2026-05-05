import {
    type ObjectSchemaBuilder,
    object,
    type PropertyDescriptor,
    type SchemaBuilder,
    SYMBOL_HAS_PROPERTIES,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An accessor that can extract a property value from a structured
 * request root.  Wraps a {@link PropertyDescriptor}'s `getValue`
 * closure so the middleware layer does not need to know about schemas.
 */
export interface CacheTagPropertyAccessor {
    getValue(root: {
        params: Record<string, unknown>;
        body: unknown;
        query: Record<string, unknown>;
        headers: Record<string, string>;
    }): { value?: unknown; success: boolean };
}

/**
 * A serialisable cache-tag definition stored on endpoint metadata.
 *
 * `properties` maps human-readable key names (used as label segments
 * in the final cache key) to accessors that resolve the actual value
 * from call-time request data.
 */
export interface CacheTagDefinition {
    readonly name: string;
    readonly properties: Readonly<Record<string, CacheTagPropertyAccessor>>;
}

// ---------------------------------------------------------------------------
// Synthetic schema construction
// ---------------------------------------------------------------------------

/**
 * Builds a synthetic `object({ params, body, query, headers })` schema
 * from the endpoint's schema definitions and returns its
 * `PropertyDescriptorTree` so callers can write type-safe selectors like:
 *
 * ```ts
 * endpoint.cacheTag('todo', p => ({
 *     id: p.query.id,
 *     fromBodyId: p.body.id
 * }))
 * ```
 *
 * Only non-null schemas are included in the synthetic schema.
 */
export function createCacheTagTree(schemas: {
    paramsSchema?: SchemaBuilder<any, any, any, any, any> | null;
    bodySchema?: SchemaBuilder<any, any, any, any, any> | null;
    querySchema?: ObjectSchemaBuilder<any, any, any, any, any, any, any> | null;
    headerSchema?: ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > | null;
}): any {
    const props: Record<string, SchemaBuilder<any, any, any, any, any>> = {};

    if (schemas.paramsSchema) {
        const ps = schemas.paramsSchema;
        // ParseStringSchemaBuilder wraps an ObjectSchemaBuilder;
        // extract it so PropertyDescriptorTree can recurse into params.
        if (
            typeof (ps as any).introspect === 'function' &&
            (ps as any).introspect().objectSchema
        ) {
            props.params = (ps as any).introspect().objectSchema;
        } else if ((ps as any)[SYMBOL_HAS_PROPERTIES] === true) {
            props.params = ps;
        }
    }

    if (schemas.bodySchema) {
        const bs = schemas.bodySchema;
        if (
            (bs as any)[SYMBOL_HAS_PROPERTIES] === true ||
            typeof (bs as any).introspect === 'function'
        ) {
            props.body = bs;
        }
    }

    if (schemas.querySchema) {
        props.query = schemas.querySchema;
    }

    if (schemas.headerSchema) {
        props.headers = schemas.headerSchema;
    }

    const syn = object(props as any);
    return (object as any).getPropertiesFor(syn);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Validates that a value returned from a cache-tag selector is a valid
 * property descriptor.
 */
function isPropertyDescriptor(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object') return false;
    return (
        typeof (value as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] === 'object' &&
        (value as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] !== null
    );
}

/**
 * Serialises the result of a cache-tag selector callback into a
 * {@link CacheTagDefinition} that can be stored on endpoint metadata
 * and forwarded to the client middleware.
 *
 * Each value in `descriptors` must be a {@link PropertyDescriptor} —
 * its `getValue` closure is wrapped in a {@link CacheTagPropertyAccessor}.
 *
 * @throws If any value is not a valid property descriptor.
 */
export function serializeTag(
    name: string,
    descriptors: Record<string, unknown>
): CacheTagDefinition {
    const properties: Record<string, CacheTagPropertyAccessor> = {};

    for (const [key, value] of Object.entries(descriptors)) {
        if (!isPropertyDescriptor(value)) {
            throw new Error(
                `Cache tag "${name}": property "${key}" is not a valid ` +
                    `PropertyDescriptor. Make sure you select a leaf property ` +
                    `from the tree (e.g. p.query.id, not p.query).`
            );
        }

        const inner = (value as PropertyDescriptor<any, any, any, any>)[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ];

        properties[key] = {
            getValue: (root: {
                params: Record<string, unknown>;
                body: unknown;
                query: Record<string, unknown>;
                headers: Record<string, string>;
            }) => inner.getValue(root as any)
        };
    }

    return { name, properties };
}

// ---------------------------------------------------------------------------
// Key computation (client-side)
// ---------------------------------------------------------------------------

/**
 * Computes a deterministic cache key from a tag definition and live
 * request data.
 *
 * - Simple tags (no properties) produce just the tag name.
 * - Tags with properties produce `name:key1=val1,key2=val2` where
 *   keys are sorted alphabetically for determinism.
 *
 * Properties whose `getValue` returns `success: false` are skipped
 * (their value is not included in the key).
 */
export function computeCacheKey(
    tag: CacheTagDefinition,
    root: {
        params: Record<string, unknown>;
        body: unknown;
        query: Record<string, unknown>;
        headers: Record<string, string>;
    }
): string {
    const entries = Object.entries(tag.properties);

    if (entries.length === 0) {
        return tag.name;
    }

    const parts: string[] = [];
    for (const [key, accessor] of entries.sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        const result = accessor.getValue(root);
        if (result.success && result.value !== undefined) {
            parts.push(`${key}=${String(result.value)}`);
        }
    }

    if (parts.length === 0) {
        return tag.name;
    }

    return `${tag.name}:${parts.join(',')}`;
}
