/**
 * `@cleverbrush/schema-json` — Bidirectional JSON Schema interop for `@cleverbrush/schema`.
 *
 * @example
 * ```ts
 * import { toJsonSchema, fromJsonSchema } from '@cleverbrush/schema-json';
 * import { object, string, number } from '@cleverbrush/schema';
 *
 * // Schema → JSON Schema
 * const spec = toJsonSchema(object({ name: string(), age: number().optional() }));
 *
 * // JSON Schema → Schema (use `as const` for type inference)
 * const schema = fromJsonSchema({ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } as const);
 * schema.parse({ name: 'Alice' }); // inferred as { name: string }
 * ```
 *
 * @module
 */

export type {
    StandardJSONSchemaV1,
    StandardTypedV1
} from '@standard-schema/spec';
export { fromJsonSchema } from './fromJsonSchema.js';
export { withStandardJsonSchema } from './standardJsonSchema.js';
export { toJsonSchema } from './toJsonSchema.js';
export type {
    InferFromJsonSchema,
    JsonSchemaNode,
    JsonSchemaNodeToBuilder,
    ToJsonSchemaOptions
} from './types.js';
