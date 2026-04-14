import type { InferType, SchemaBuilder } from '@cleverbrush/schema';
import { env } from './env.js';
import { parseEnv } from './parseEnv.js';

/**
 * Flat schema map: keys are environment variable names, values are schema builders.
 */
type FlatEnvSchemas = Record<string, SchemaBuilder<any, any, any, any, any>>;

/**
 * Infers the runtime type from a flat schema map.
 */
type InferFlatEnv<T extends FlatEnvSchemas> = {
    [K in keyof T]: InferType<T[K]>;
};

/**
 * Convenience wrapper for simple flat configs where each key is both the
 * config property name and the environment variable name.
 *
 * Equivalent to calling `parseEnv()` with every entry wrapped in `env()`.
 *
 * @param schemas - A record mapping env var names to schema builders.
 * @param source  - The environment variable source. Defaults to `process.env`.
 *
 * @example
 * ```ts
 * const config = parseEnvFlat({
 *   DB_HOST: string().default('localhost'),
 *   DB_PORT: number().coerce().default(5432),
 *   JWT_SECRET: string().minLength(32),
 * });
 * // Type: { DB_HOST: string, DB_PORT: number, JWT_SECRET: string }
 * ```
 */
export function parseEnvFlat<T extends FlatEnvSchemas>(
    schemas: T,
    source?: Record<string, string | undefined>
): InferFlatEnv<T> {
    const config: Record<string, ReturnType<typeof env>> = {};
    for (const key of Object.keys(schemas)) {
        config[key] = env(key, schemas[key]);
    }
    return parseEnv(config as any, source) as InferFlatEnv<T>;
}
