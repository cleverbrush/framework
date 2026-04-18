/**
 * Describes a single missing environment variable.
 */
export interface MissingEnvVar {
    /** The environment variable name (e.g. `'DB_HOST'`). */
    varName: string;
    /** Dot-separated config path (e.g. `'db.host'`). */
    configPath: string;
    /** Schema type identifier (e.g. `'string'`, `'number'`). */
    type: string;
}

/**
 * Describes a single invalid environment variable.
 */
export interface InvalidEnvVar {
    /** The environment variable name (e.g. `'DB_PORT'`). */
    varName: string;
    /** Dot-separated config path (e.g. `'db.port'`). */
    configPath: string;
    /** The raw string value that failed validation. */
    value: string;
    /** Validation error messages. */
    errors: string[];
}

/**
 * Thrown by `parseEnv()` when one or more environment variables are missing
 * or fail validation.
 *
 * The structured `missing` and `invalid` properties allow programmatic
 * inspection, while the formatted `message` provides a human-readable
 * summary suitable for CI logs and startup output.
 */
export class EnvValidationError extends Error {
    public readonly missing: readonly MissingEnvVar[];
    public readonly invalid: readonly InvalidEnvVar[];

    constructor(missing: MissingEnvVar[], invalid: InvalidEnvVar[]) {
        const lines: string[] = [];

        if (missing.length > 0) {
            lines.push('Missing environment variables:');
            for (const m of missing) {
                lines.push(
                    `  - ${m.varName} (required by ${m.configPath}) [${m.type}]`
                );
            }
        }

        if (invalid.length > 0) {
            lines.push('Invalid environment variables:');
            for (const inv of invalid) {
                lines.push(
                    `  - ${inv.varName}: ${JSON.stringify(inv.value)} (required by ${inv.configPath}) — ${inv.errors.join('; ')}`
                );
            }
        }

        super(lines.join('\n'));
        this.name = 'EnvValidationError';
        this.missing = missing;
        this.invalid = invalid;
    }
}
