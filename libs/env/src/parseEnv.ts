import { deepExtend, type Merge } from '@cleverbrush/deep';
import { object, type SchemaBuilder } from '@cleverbrush/schema';
import {
    EnvValidationError,
    type InvalidEnvVar,
    type MissingEnvVar
} from './errors.js';
import {
    ENV_FIELD_BRAND,
    type EnvConfig,
    type EnvField,
    type InferEnvConfig
} from './types.js';

/**
 * Returns `true` if the value is an `EnvField` (created by `env()`).
 */
function isEnvField(value: unknown): value is EnvField<any> {
    return (
        typeof value === 'object' &&
        value !== null &&
        ENV_FIELD_BRAND in value &&
        (value as any)[ENV_FIELD_BRAND] === true
    );
}

/**
 * Metadata collected during the config tree walk, tracking which env var
 * maps to which config path for error reporting.
 */
interface EnvMapping {
    varName: string;
    configPath: string;
    schema: SchemaBuilder<any, any, any, any, any>;
}

/**
 * Recursively walks the config descriptor tree:
 * - For `EnvField` leaves: reads `source[varName]` and places the raw value
 * - For object branches: recurses into children
 *
 * @returns `rawObject` — a nested object with raw string values at the
 *   correct paths, and `mappings` — an array tracking varName→configPath
 *   for error reporting.
 */
function walkConfig(
    config: Record<string, unknown>,
    source: Record<string, string | undefined>,
    pathPrefix: string
): { rawObject: Record<string, unknown>; mappings: EnvMapping[] } {
    const rawObject: Record<string, unknown> = {};
    const mappings: EnvMapping[] = [];

    for (const key of Object.keys(config)) {
        const node = config[key];
        const configPath = pathPrefix ? `${pathPrefix}.${key}` : key;

        if (isEnvField(node)) {
            const raw = source[node.varName];
            rawObject[key] = raw;
            mappings.push({
                varName: node.varName,
                configPath,
                schema: node.schema
            });
        } else if (typeof node === 'object' && node !== null) {
            const child = walkConfig(
                node as Record<string, unknown>,
                source,
                configPath
            );
            rawObject[key] = child.rawObject;
            mappings.push(...child.mappings);
        }
    }

    return { rawObject, mappings };
}

/**
 * Recursively builds an `ObjectSchemaBuilder` from the config descriptor tree.
 *
 * For `EnvField` leaves the inner schema is used directly.
 * For object branches a nested `object()` schema is constructed.
 */
function buildSchema(
    config: Record<string, unknown>
): SchemaBuilder<any, any, any, any, any> {
    const props: Record<string, SchemaBuilder<any, any, any, any, any>> = {};

    for (const key of Object.keys(config)) {
        const node = config[key];

        if (isEnvField(node)) {
            props[key] = node.schema;
        } else if (typeof node === 'object' && node !== null) {
            props[key] = buildSchema(node as Record<string, unknown>);
        }
    }

    return object(props as any) as any;
}

/**
 * Parses environment variables into a validated, typed config object.
 *
 * Every leaf field in the config descriptor must be wrapped with `env()` —
 * this is enforced at the TypeScript level.
 *
 * The function:
 * 1. Walks the descriptor tree, reading raw values from `source` (defaults
 *    to `process.env`).
 * 2. Assembles a `@cleverbrush/schema` object schema from the leaf schemas.
 * 3. Validates and coerces the raw values via `schema.validate()`.
 * 4. Returns the typed result or throws an `EnvValidationError` listing
 *    all missing and invalid variables.
 *
 * @param config - A descriptor tree where leaves are `EnvField`s and
 *   branches are plain objects.
 * @param source - The environment variable source. Defaults to `process.env`.
 *
 * @example
 * ```ts
 * const config = parseEnv({
 *   db: {
 *     host: env('DB_HOST', string().default('localhost')),
 *     port: env('DB_PORT', number().coerce().default(5432)),
 *   },
 *   debug: env('DEBUG', boolean().coerce().default(false)),
 * });
 * ```
 */
export function parseEnv<T extends EnvConfig>(
    config: T,
    source?: Record<string, string | undefined>
): InferEnvConfig<T>;
export function parseEnv<
    T extends EnvConfig,
    C extends Record<string, unknown>
>(
    config: T,
    compute: (base: InferEnvConfig<T>) => C,
    source?: Record<string, string | undefined>
): Merge<[InferEnvConfig<T>, C]>;
export function parseEnv<T extends EnvConfig>(
    config: T,
    computeOrSource?:
        | ((base: InferEnvConfig<T>) => Record<string, unknown>)
        | Record<string, string | undefined>,
    maybeSource?: Record<string, string | undefined>
): unknown {
    const isCompute = typeof computeOrSource === 'function';
    const source: Record<string, string | undefined> = isCompute
        ? (maybeSource ?? (typeof process !== 'undefined' ? process.env : {}))
        : (computeOrSource ??
          (typeof process !== 'undefined' ? process.env : {}));

    const { rawObject, mappings } = walkConfig(config, source, '');
    const schema = buildSchema(config);

    const result = schema.validate(rawObject, {
        doNotStopOnFirstError: true
    });

    if (result.valid) {
        const base = result.object as InferEnvConfig<T>;
        if (isCompute) {
            const computed = (
                computeOrSource as (
                    base: InferEnvConfig<T>
                ) => Record<string, unknown>
            )(base);
            return deepExtend(base, computed);
        }
        return base;
    }

    // Map schema validation errors back to env var names
    const missing: MissingEnvVar[] = [];
    const invalid: InvalidEnvVar[] = [];

    const errorMessages = result.errors?.map(e => e.message) ?? [];

    // For each mapping, check if the var was present and if there's an error
    for (const mapping of mappings) {
        const raw = source[mapping.varName];
        const introspected = mapping.schema.introspect();
        const isRequired = introspected.isRequired;
        const hasDefault = introspected.hasDefault;

        if (raw === undefined || raw === '') {
            if (isRequired && !hasDefault) {
                missing.push({
                    varName: mapping.varName,
                    configPath: mapping.configPath,
                    type: introspected.type
                });
            }
        } else {
            // Validate this individual field to see if it's invalid
            const fieldResult = mapping.schema.validate(raw);
            if (!fieldResult.valid) {
                invalid.push({
                    varName: mapping.varName,
                    configPath: mapping.configPath,
                    value: raw,
                    errors: fieldResult.errors?.map(e => e.message) ?? []
                });
            }
        }
    }

    // If we couldn't categorize any errors but validation still failed,
    // add the raw error messages as a generic invalid entry
    if (
        missing.length === 0 &&
        invalid.length === 0 &&
        errorMessages.length > 0
    ) {
        invalid.push({
            varName: '(unknown)',
            configPath: '(unknown)',
            value: '',
            errors: errorMessages
        });
    }

    throw new EnvValidationError(missing, invalid);
}
