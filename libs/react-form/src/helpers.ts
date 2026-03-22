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

/**
 * Builds a selector function from a dot-separated path string.
 * The selector traverses the PropertyDescriptorTree by property access.
 * Example: "customer.address.city" → (tree) => tree.customer.address.city
 */
export function buildSelectorFromPath(path: string): (tree: any) => any {
    const parts = path.split('.');
    return (tree: any) => {
        let current = tree;
        for (const part of parts) {
            if (current == null) return undefined;
            current = current[part];
        }
        return current;
    };
}

/**
 * Extracts the field path from a schema validation error path.
 * Schema error paths look like:
 *   "$.email"           → "email"
 *   "$.email($validators[0])" → "email"
 *   "$.customer.address.city" → "customer.address.city"
 *   "$($validators[0])" → "" (root-level error)
 *   "$"                 → "" (root-level error)
 *
 * Returns the dot-separated field path, or empty string for root errors.
 */
export function extractFieldPath(errorPath: string): string {
    let p = errorPath;

    // Strip leading "$." or "$"
    if (p.startsWith('$.')) {
        p = p.slice(2);
    } else if (p.startsWith('$')) {
        p = p.slice(1);
    }

    // Strip validator suffix — matches patterns like:
    //   "($validators[0])"
    //   "($validators[0] (validatorName))"
    p = p.replace(/\(\$validators\[\d+\](?:\s*\([^)]*\))?\)\s*$/, '');

    return p;
}
