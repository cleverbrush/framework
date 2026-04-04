import type {
    PropertyDescriptorInner,
    PropertyDescriptorTree,
    SchemaBuilder
} from '@cleverbrush/schema';
import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
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
        if (
            !propDescriptor ||
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in propDescriptor)
        ) {
            continue;
        }
        const inner = propDescriptor[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ] as PropertyDescriptorInner<any, any, any>;
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
export function getSchemaType(schema: SchemaBuilder<any, any, any>): string {
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
 * Checks whether a validation error path matches a field's expected error path.
 * Matches exact path, path with nested suffix, or path with validator suffix.
 * Example: isErrorPathMatch("$.user.name", "$.user.name") → true
 *          isErrorPathMatch("$.user.name($validators[0])", "$.user.name") → true
 */
export function isErrorPathMatch(
    errPath: string,
    fieldErrorPath: string
): boolean {
    return (
        errPath === fieldErrorPath ||
        errPath.startsWith(fieldErrorPath + '.') ||
        errPath.startsWith(fieldErrorPath + '(')
    );
}

/**
 * Ensures all nested object structures exist in the values object
 * by traversing the schema and creating empty objects where needed.
 * This prevents ObjectSchemaBuilder.validate() from throwing when
 * nested object properties are undefined.
 *
 * Example: ensureNestedStructure({}, OrderSchema)
 *   → { customer: { address: {} } }
 */
export function ensureNestedStructure(
    values: any,
    schema: ObjectSchemaBuilder<any, any, any>
): any {
    const introspected = schema.introspect();
    if (!introspected.properties) return values != null ? values : {};

    const result = values != null ? { ...values } : {};
    for (const key of Object.keys(introspected.properties)) {
        const propSchema = introspected.properties[key];
        if (propSchema instanceof ObjectSchemaBuilder) {
            result[key] = ensureNestedStructure(result[key], propSchema);
        }
    }
    return result;
}
