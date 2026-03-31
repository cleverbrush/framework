import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';

/**
 * Resolves a {@link ValidationErrorMessageProvider} to a concrete error message string.
 * Returns the default message when no custom provider is supplied.
 *
 * @param provider - custom error message provider (string, function, or `undefined`)
 * @param defaultMsg - fallback message used when `provider` is `undefined`
 * @param value - the value that failed validation (passed to function providers)
 * @param schema - the schema builder instance (passed to function providers)
 * @returns the resolved error message string
 */
export async function resolveErrorMessage(
    provider: ValidationErrorMessageProvider<any> | undefined,
    defaultMsg: string,
    value: unknown,
    schema: unknown
): Promise<string> {
    if (provider === undefined) return defaultMsg;
    if (typeof provider === 'string') return provider;
    return provider(value, schema);
}
