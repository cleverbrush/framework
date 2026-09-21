/**
 * Test whether a value is a supported, single SQL identifier, such as a table
 * alias. Accepts ASCII letters/underscores followed by letters/digits/underscores.
 *
 * This deliberately excludes qualified names, quoted identifiers and Unicode;
 * it is not a validator for every identifier accepted by a database dialect.
 * Keywords are accepted because query builders quote identifiers. Always keep
 * using identifier bindings (`??`), even after this check succeeds.
 *
 * @param value - Untrusted value to test without coercing it to a string.
 * @returns Whether the value is a string in Framework's supported format.
 * @example
 * isSqlIdentifier('task_owner'); // true
 * isSqlIdentifier('public.tasks'); // false: qualified, not a single name
 */
export function isSqlIdentifier(value: unknown): value is string {
    return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}
