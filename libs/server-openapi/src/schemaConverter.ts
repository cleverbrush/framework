import type { SchemaBuilder } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';
import type { SchemaRegistry } from './schemaRegistry.js';

/**
 * Converts a `@cleverbrush/schema` builder to a JSON Schema object suitable
 * for embedding in an OpenAPI 3.1 spec (no `$schema` header, Draft 2020-12).
 *
 * Returns an empty schema `{}` when the input is `null` or `undefined`.
 *
 * When a {@link SchemaRegistry} is provided, any schema instance that was
 * registered under a name will be emitted as a
 * `$ref: '#/components/schemas/<name>'` pointer instead of being inlined.
 *
 * @param schema   - The schema to convert, or `null`/`undefined`.
 * @param registry - Optional registry for `$ref` deduplication.
 */
export function convertSchema(
    schema: SchemaBuilder<any, any, any, any, any> | null | undefined,
    registry?: SchemaRegistry
): Record<string, unknown> {
    if (schema == null) return {};
    return toJsonSchema(schema, {
        $schema: false,
        draft: '2020-12',
        nameResolver: registry ? s => registry.getName(s) : undefined
    });
}
