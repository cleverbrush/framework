import type { SchemaBuilder } from '@cleverbrush/schema';
import { ENV_FIELD_BRAND, type EnvField } from './types.js';

/**
 * Associates a schema builder with an environment variable name.
 *
 * Every leaf field in a config descriptor passed to `parseEnv()` must be
 * wrapped with `env()`. This is enforced at the TypeScript level — passing
 * a bare schema builder produces a compile-time error.
 *
 * @param varName - The environment variable name to read (e.g. `'DB_HOST'`).
 * @param schema  - A `@cleverbrush/schema` builder describing the expected
 *                  type, constraints, coercion, and defaults.
 * @returns A branded `EnvField` descriptor.
 *
 * @example
 * ```ts
 * env('DB_PORT', number().coerce().default(5432))
 * ```
 */
export function env<T extends SchemaBuilder<any, any, any, any, any>>(
    varName: string,
    schema: T
): EnvField<T> {
    if (typeof varName !== 'string' || !varName) {
        throw new Error('env(): varName must be a non-empty string');
    }
    return {
        [ENV_FIELD_BRAND]: true,
        varName,
        schema
    } as EnvField<T>;
}
