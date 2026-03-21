import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type {
    PropertyDescriptorInner,
    PropertyDescriptorTree,
    SchemaBuilder
} from '@cleverbrush/schema';

/**
 * Builds a map from PropertyDescriptorInner identity → dot-separated path
 * by traversing the descriptor tree recursively.
 */
export function buildDescriptorPathMap(
    tree: PropertyDescriptorTree<any, any>,
    schema: ObjectSchemaBuilder<any, any, any>
): Map<PropertyDescriptorInner<any, any, any>, string> {
    const map = new Map<PropertyDescriptorInner<any, any, any>, string>();
    const introspected = schema.introspect();
    if (!introspected.properties) return map;

    for (const propName of Object.keys(introspected.properties)) {
        const propDescriptor = (tree as any)[propName];
        if (!propDescriptor || !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in propDescriptor)) {
            continue;
        }
        const inner = propDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] as PropertyDescriptorInner<any, any, any>;
        map.set(inner, propName);

        // Recurse into nested objects
        const propSchema = introspected.properties[propName];
        if (propSchema instanceof ObjectSchemaBuilder) {
            const childMap = buildDescriptorPathMap(propDescriptor, propSchema);
            for (const [childInner, childPath] of childMap) {
                map.set(childInner, `${propName}.${childPath}`);
            }
        }
    }

    return map;
}

/**
 * Looks up the path for a given descriptor from the pre-built map.
 */
export function getDescriptorPath(
    inner: PropertyDescriptorInner<any, any, any>,
    pathMap: Map<PropertyDescriptorInner<any, any, any>, string>
): string {
    return pathMap.get(inner) ?? '';
}

/**
 * Returns the schema type string (e.g. "string", "number", "object").
 */
export function getSchemaType(schema: SchemaBuilder<any, any>): string {
    const introspected = schema.introspect();
    return introspected?.type ?? 'unknown';
}
