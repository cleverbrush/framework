import type { SchemaBuilder } from '@cleverbrush/schema';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { toJsonSchema } from './toJsonSchema.js';

/**
 * Maps Standard JSON Schema target identifiers to the options accepted by
 * {@link toJsonSchema}.
 */
function targetToOptions(target: StandardJSONSchemaV1.Target): {
    draft: '2020-12' | '07';
    $schema: false;
} {
    switch (target) {
        case 'draft-2020-12':
            return { draft: '2020-12', $schema: false };
        case 'draft-07':
            return { draft: '07', $schema: false };
        case 'openapi-3.0':
            // OpenAPI 3.0 is a superset of JSON Schema Draft 04; Draft 07 is
            // the closest we support.
            return { draft: '07', $schema: false };
        default:
            throw new Error(
                `@cleverbrush/schema-json: unsupported JSON Schema target "${target}".`
            );
    }
}

/**
 * Wraps a `@cleverbrush/schema` builder with the
 * [Standard JSON Schema v1](https://standardschema.dev/) interface.
 *
 * The returned schema object's `~standard` property is enriched with a
 * `jsonSchema` converter. Because `@cleverbrush/schema` does not
 * distinguish between input and output types, both `input()` and `output()`
 * produce the same JSON Schema document.
 *
 * **Note:** this mutates the schema instance by overriding the `~standard`
 * property. The returned reference is the same schema object.
 *
 * @example
 * ```ts
 * import { object, string, number } from '@cleverbrush/schema';
 * import { withStandardJsonSchema } from '@cleverbrush/schema-json';
 *
 * const schema = object({ name: string(), age: number().optional() });
 * const wrapped = withStandardJsonSchema(schema);
 *
 * // Access standard JSON Schema properties
 * wrapped['~standard'].jsonSchema.input({ target: 'draft-2020-12' });
 * wrapped['~standard'].jsonSchema.output({ target: 'draft-07' });
 * ```
 *
 * @param schema - Any `@cleverbrush/schema` builder instance.
 * @returns The same schema instance, now also conforming to `StandardJSONSchemaV1`.
 */
export function withStandardJsonSchema<
    T extends SchemaBuilder<any, any, any, any, any>
>(schema: T): T & StandardJSONSchemaV1 {
    const converter: StandardJSONSchemaV1.Converter = {
        input(options: StandardJSONSchemaV1.Options): Record<string, unknown> {
            return toJsonSchema(schema, targetToOptions(options.target));
        },
        output(options: StandardJSONSchemaV1.Options): Record<string, unknown> {
            return toJsonSchema(schema, targetToOptions(options.target));
        }
    };

    // Extend the existing `~standard` props (which already include the
    // StandardSchemaV1 validate function from the schema library) with the
    // jsonSchema converter.
    const existingStandard = schema['~standard'];
    const enrichedStandard = { ...existingStandard, jsonSchema: converter };

    // Override the prototype getter with an instance-level property so that
    // private field access continues to work correctly (proxies break this).
    Object.defineProperty(schema, '~standard', {
        value: enrichedStandard,
        configurable: true,
        writable: false,
        enumerable: false
    });

    return schema as T & StandardJSONSchemaV1;
}
