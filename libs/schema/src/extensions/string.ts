/**
 * Built-in string extensions for `@cleverbrush/schema`.
 *
 * Provides common string validators and preprocessors: {@link stringExtensions | email},
 * {@link stringExtensions | url}, {@link stringExtensions | uuid},
 * {@link stringExtensions | ip}, {@link stringExtensions | trim},
 * {@link stringExtensions | toLowerCase}, and {@link stringExtensions | nonempty}.
 *
 * These are pre-applied in the default `@cleverbrush/schema` import.
 * Import from `@cleverbrush/schema/core` to get bare builders without these extensions.
 *
 * @module
 */
import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import { defineExtension } from '../extension.js';
import { resolveErrorMessage } from './util.js';

// ---------------------------------------------------------------------------
// Public interface — carries JSDoc into .d.ts for consumers
// ---------------------------------------------------------------------------

/** Return type shared by every method on {@link StringBuiltinExtensions}. */
type StringExtReturn<T extends string = string> = StringSchemaBuilder<
    T,
    true,
    StringBuiltinExtensions<T>
> &
    StringBuiltinExtensions<T> &
    HiddenExtensionMethods;

/**
 * Methods added to `StringSchemaBuilder` by the built-in string extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * `stringExtensions` so that JSDoc survives into the published `.d.ts`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the `FixedMethods` mapped type (conditional `infer` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface StringBuiltinExtensions<T extends string = string> {
    /**
     * Validates that the string is a well-formed email address.
     *
     * Uses the pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$` for validation.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the email validator applied
     *
     * @example
     * ```ts
     * string().email();
     * string().email('Please enter a valid email');
     * string().email((val) => `"${val}" is not a valid email`);
     * ```
     */
    email(
        errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
    ): StringExtReturn<T>;

    /**
     * Validates that the string is a well-formed URL.
     *
     * By default only `http` and `https` protocols are accepted.
     * Pass `opts.protocols` to restrict or expand the allowed set.
     *
     * @param opts - optional configuration
     * @param opts.protocols - allowed URL protocols (default: `['http', 'https']`)
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the URL validator applied
     *
     * @example
     * ```ts
     * string().url();
     * string().url({ protocols: ['https'] });
     * string().url(undefined, 'Must be a valid URL');
     * ```
     */
    url(
        opts?: { protocols?: string[] },
        errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
    ): StringExtReturn<T>;

    /**
     * Validates that the string is a valid UUID (versions 1–5).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the UUID validator applied
     *
     * @example
     * ```ts
     * string().uuid();
     * string().uuid('Invalid identifier');
     * ```
     */
    uuid(
        errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
    ): StringExtReturn<T>;

    /**
     * Validates that the string is a valid IP address (IPv4 or IPv6).
     *
     * Pass `opts.version` to restrict validation to a specific IP version.
     *
     * @param opts - optional configuration
     * @param opts.version - restrict to `'v4'` or `'v6'` (default: accept both)
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the IP validator applied
     *
     * @example
     * ```ts
     * string().ip();
     * string().ip({ version: 'v4' });
     * string().ip(undefined, 'Bad IP address');
     * ```
     */
    ip(
        opts?: { version?: 'v4' | 'v6' },
        errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
    ): StringExtReturn<T>;

    /**
     * Preprocessor that trims leading and trailing whitespace before validation.
     *
     * @returns a new schema builder with the trim preprocessor applied
     *
     * @example
     * ```ts
     * string().trim().minLength(1); // '  hi  ' → 'hi'
     * ```
     */
    trim(): StringExtReturn<T>;

    /**
     * Preprocessor that converts the string to lowercase before validation.
     *
     * @returns a new schema builder with the toLowerCase preprocessor applied
     *
     * @example
     * ```ts
     * string().toLowerCase(); // 'HELLO' → 'hello'
     * ```
     */
    toLowerCase(): StringExtReturn<T>;

    /**
     * Validates that the string is not empty (length > 0).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the nonempty validator applied
     *
     * @example
     * ```ts
     * string().nonempty();
     * string().nonempty('Name is required');
     * ```
     */
    nonempty(
        errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
    ): StringExtReturn<T>;
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IPV4_RE =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const IPV6_RE =
    /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^::(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}$|^(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}$|^(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}$|^(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}$|^[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}$|^::$/i;

/**
 * Extension descriptor that adds common string validators and preprocessors
 * to `StringSchemaBuilder`.
 *
 * Included methods: `email`, `url`, `uuid`, `ip`, `trim`, `toLowerCase`, `nonempty`.
 *
 * @example
 * ```ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { stringExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(stringExtensions);
 * const schema = s.string().email().trim();
 * ```
 */
export const stringExtensions = defineExtension({
    string: {
        /**
         * Validates that the string is a well-formed email address.
         *
         * Uses the pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$` for validation.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the email validator applied
         *
         * @example
         * ```ts
         * string().email();
         * string().email('Please enter a valid email');
         * string().email((val) => `"${val}" is not a valid email`);
         * ```
         */
        email(
            this: StringSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
        ) {
            return this.withExtension('email', true).addValidator(
                async (val) => {
                    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must be a valid email',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that the string is a well-formed URL.
         *
         * By default only `http` and `https` protocols are accepted.
         * Pass `opts.protocols` to restrict or expand the allowed set.
         *
         * @param opts - optional configuration
         * @param opts.protocols - allowed URL protocols (default: `['http', 'https']`)
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the URL validator applied
         *
         * @example
         * ```ts
         * string().url();
         * string().url({ protocols: ['https'] });
         * string().url(undefined, 'Must be a valid URL');
         * ```
         */
        url(
            this: StringSchemaBuilder,
            opts?: { protocols?: string[] },
            errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
        ) {
            const protocols = opts?.protocols ?? ['http', 'https'];
            const meta = opts?.protocols ? { protocols: opts.protocols } : true;

            return this.withExtension('url', meta).addValidator(async (val) => {
                let valid = false;
                let defaultMsg = 'must be a valid URL';
                try {
                    const parsed = new URL(val);
                    const proto = parsed.protocol.replace(':', '');
                    valid = protocols.includes(proto);
                    if (!valid)
                        defaultMsg = `protocol must be one of: ${protocols.join(', ')}`;
                } catch {
                    /* invalid URL */
                }
                if (valid) return { valid: true, errors: [] };
                const msg = await resolveErrorMessage(
                    errorMessage,
                    defaultMsg,
                    val,
                    this
                );
                return { valid: false, errors: [{ message: msg }] };
            });
        },

        /**
         * Validates that the string is a valid UUID (versions 1–5).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the UUID validator applied
         *
         * @example
         * ```ts
         * string().uuid();
         * string().uuid('Invalid identifier');
         * ```
         */
        uuid(
            this: StringSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
        ) {
            return this.withExtension('uuid', true).addValidator(
                async (val) => {
                    const valid = UUID_RE.test(val);
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must be a valid UUID',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        },

        /**
         * Validates that the string is a valid IP address (IPv4 or IPv6).
         *
         * Pass `opts.version` to restrict validation to a specific IP version.
         *
         * @param opts - optional configuration
         * @param opts.version - restrict to `'v4'` or `'v6'` (default: accept both)
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the IP validator applied
         *
         * @example
         * ```ts
         * string().ip();
         * string().ip({ version: 'v4' });
         * string().ip(undefined, 'Bad IP address');
         * ```
         */
        ip(
            this: StringSchemaBuilder,
            opts?: { version?: 'v4' | 'v6' },
            errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
        ) {
            const version = opts?.version;
            const meta = version ? { version } : true;

            return this.withExtension('ip', meta).addValidator(async (val) => {
                let valid: boolean;
                if (version === 'v4') {
                    valid = IPV4_RE.test(val);
                } else if (version === 'v6') {
                    valid = IPV6_RE.test(val);
                } else {
                    valid = IPV4_RE.test(val) || IPV6_RE.test(val);
                }
                if (valid) return { valid: true, errors: [] };
                const msg = await resolveErrorMessage(
                    errorMessage,
                    version
                        ? `must be a valid ${version} IP address`
                        : 'must be a valid IP address',
                    val,
                    this
                );
                return { valid: false, errors: [{ message: msg }] };
            });
        },

        /**
         * Preprocessor that trims leading and trailing whitespace before validation.
         *
         * @returns a new schema builder with the trim preprocessor applied
         *
         * @example
         * ```ts
         * string().trim().minLength(1); // '  hi  ' → 'hi'
         * ```
         */
        trim(this: StringSchemaBuilder) {
            return this.addPreprocessor((val) => val.trim());
        },

        /**
         * Preprocessor that converts the string to lowercase before validation.
         *
         * @returns a new schema builder with the toLowerCase preprocessor applied
         *
         * @example
         * ```ts
         * string().toLowerCase(); // 'HELLO' → 'hello'
         * ```
         */
        toLowerCase(this: StringSchemaBuilder) {
            return this.addPreprocessor((val) => val.toLowerCase());
        },

        /**
         * Validates that the string is not empty (length > 0).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the nonempty validator applied
         *
         * @example
         * ```ts
         * string().nonempty();
         * string().nonempty('Name is required');
         * ```
         */
        nonempty(
            this: StringSchemaBuilder,
            errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>
        ) {
            return this.withExtension('nonempty', true).addValidator(
                async (val) => {
                    const valid = val.length > 0;
                    if (valid) return { valid: true, errors: [] };
                    const msg = await resolveErrorMessage(
                        errorMessage,
                        'must not be empty',
                        val,
                        this
                    );
                    return { valid: false, errors: [{ message: msg }] };
                }
            );
        }
    }
});
