import type { SchemaBuilder } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

/**
 * Converts a `@cleverbrush/schema` builder to a JSON Schema object suitable
 * for embedding in an OpenAPI 3.1 spec (no `$schema` header, Draft 2020-12).
 *
 * Returns an empty schema `{}` when the input is `null` or `undefined`.
 */
export function convertSchema(
    schema: SchemaBuilder<any, any, any, any, any> | null | undefined
): Record<string, unknown> {
    if (schema == null) return {};
    return toJsonSchema(schema, { $schema: false, draft: '2020-12' });
}
