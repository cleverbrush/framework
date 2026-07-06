import { boolean } from '@cleverbrush/schema';

/**
 * Options for {@link envBoolean}.
 */
export interface EnvBooleanOptions {
    /**
     * String values accepted as `true`.
     *
     * @defaultValue `['true', '1', 'yes', 'on']`
     */
    trueValues?: readonly string[];

    /**
     * String values accepted as `false`.
     *
     * @defaultValue `['false', '0', 'no', 'off']`
     */
    falseValues?: readonly string[];

    /**
     * Whether string matching is case-sensitive.
     *
     * @defaultValue `false`
     */
    caseSensitive?: boolean;

    /**
     * Whether to trim surrounding whitespace before matching.
     *
     * @defaultValue `true`
     */
    trim?: boolean;
}

const DEFAULT_TRUE_VALUES = ['true', '1', 'yes', 'on'] as const;
const DEFAULT_FALSE_VALUES = ['false', '0', 'no', 'off'] as const;

/**
 * Create a boolean schema tuned for environment variables.
 *
 * The base schema `boolean().coerce()` intentionally accepts only
 * `"true"`/`"false"`. Environment variables often use shell-style toggles
 * such as `1`, `0`, `yes`, `no`, `on`, and `off`, so this helper normalizes
 * those values before boolean validation runs.
 *
 * @param options - Matching behavior and accepted true/false strings.
 * @returns A boolean schema builder with env-style string preprocessing.
 *
 * @example
 * ```ts
 * const config = parseEnv({
 *     debug: env('DEBUG', envBoolean().default(false)),
 * });
 * ```
 */
export function envBoolean(options: EnvBooleanOptions = {}) {
    const {
        trueValues = DEFAULT_TRUE_VALUES,
        falseValues = DEFAULT_FALSE_VALUES,
        caseSensitive = false,
        trim = true
    } = options;

    const normalize = (value: string): string => {
        const trimmed = trim ? value.trim() : value;
        return caseSensitive ? trimmed : trimmed.toLowerCase();
    };

    const trueSet = new Set(trueValues.map(normalize));
    const falseSet = new Set(falseValues.map(normalize));

    return boolean().addPreprocessor(
        value => {
            if (typeof value !== 'string') return value;

            const normalized = normalize(value);
            if (trueSet.has(normalized)) return true;
            if (falseSet.has(normalized)) return false;

            return value;
        },
        { mutates: true }
    );
}
