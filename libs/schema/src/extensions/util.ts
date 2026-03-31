import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';

/**
 * Synchronously resolves a {@link ValidationErrorMessageProvider} to a concrete error message string.
 * Returns the default message when no custom provider is supplied.
 * Throws if the provider function returns a Promise.
 *
 * @param provider - custom error message provider (string, sync function, or `undefined`)
 * @param defaultMsg - fallback message used when `provider` is `undefined`
 * @param value - the value that failed validation (passed to function providers)
 * @param schema - the schema builder instance (passed to function providers)
 * @returns the resolved error message string
 * @throws Error if the provider returns a Promise
 */
export function resolveErrorMessage(
    provider: ValidationErrorMessageProvider<any> | undefined,
    defaultMsg: string,
    value: unknown,
    schema: unknown
): string {
    if (provider === undefined) return defaultMsg;
    if (typeof provider === 'string') return provider;
    const result = provider(value, schema);
    if (result instanceof Promise) {
        throw new Error(
            'Async error message providers require validateAsync(). Use a string or sync function instead.'
        );
    }
    return result;
}

/**
 * Asynchronously resolves a {@link ValidationErrorMessageProvider} to a concrete error message string.
 * Returns the default message when no custom provider is supplied.
 * Supports async provider functions.
 *
 * @param provider - custom error message provider (string, function, or `undefined`)
 * @param defaultMsg - fallback message used when `provider` is `undefined`
 * @param value - the value that failed validation (passed to function providers)
 * @param schema - the schema builder instance (passed to function providers)
 * @returns the resolved error message string
 */
export async function resolveErrorMessageAsync(
    provider: ValidationErrorMessageProvider<any> | undefined,
    defaultMsg: string,
    value: unknown,
    schema: unknown
): Promise<string> {
    if (provider === undefined) return defaultMsg;
    if (typeof provider === 'string') return provider;
    return provider(value, schema);
}
