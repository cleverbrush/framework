/**
 * Schema builder for objects with dynamic string keys, where every value
 * must satisfy the same value schema.
 *
 * Equivalent to TypeScript's `Record<string, V>` (or a more constrained key
 * set when using a string-literal key schema) and Zod's `z.record()`.
 *
 * Unlike `ObjectSchemaBuilder` — which validates objects with a **known,
 * fixed set of property names** — `RecordSchemaBuilder` validates objects
 * whose keys are not known at schema-definition time (look-up tables, i18n
 * bundles, caches, etc.).
 *
 * @module
 */
import {
    type BRAND,
    type InferType,
    SchemaBuilder,
    type ValidationContext,
    type ValidationResult
} from './SchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Validation result type returned by `RecordSchemaBuilder.validate()`.
 *
 * Extends `ValidationResult` with `getNestedErrors()`, which returns a
 * plain object mapping each key to its own `ValidationResult` — making it
 * easy to surface per-field errors in a form or API response.
 */
export type RecordSchemaValidationResult<
    TResult,
    TValueSchema extends SchemaBuilder<any, any, any>
> = ValidationResult<TResult> & {
    /**
     * Returns per-key validation results as a plain object.
     *
     * Each key in the returned object corresponds to a key in the input that
     * **failed** validation (in `doNotStopOnFirstError` mode) or the single
     * first failing key (in the default stop-on-first-error mode). Keys that
     * passed are not included.
     *
     * The result is only populated after a validation call. Reading it
     * before validating returns an empty object.
     *
     * @example
     * ```ts
     * const schema = record(string(), number().positive());
     * const result = schema.validate(
     *   { a: 1, b: -2, c: 'oops' },
     *   { doNotStopOnFirstError: true }
     * );
     *
     * if (!result.valid) {
     *   const nested = result.getNestedErrors();
     *   console.log(nested['b']); // ValidationResult for key 'b'
     *   console.log(nested['c']); // ValidationResult for key 'c'
     * }
     * ```
     */
    getNestedErrors(): Record<
        string,
        ValidationResult<InferType<TValueSchema>>
    >;
};

type RecordSchemaBuilderCreateProps<
    TKeySchema extends StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any>,
    R extends boolean = true
> = Partial<
    ReturnType<RecordSchemaBuilder<TKeySchema, TValueSchema, R>['introspect']>
>;

// ---------------------------------------------------------------------------
// Builder class
// ---------------------------------------------------------------------------

/**
 * Schema builder for objects with dynamic string keys.
 *
 * Every key in the validated object must be accepted by `keySchema` (a
 * `StringSchemaBuilder`) and every value must satisfy `valueSchema`.
 *
 * The inferred TypeScript type mirrors `Record<K, V>` where `K` is the
 * string type produced by `keySchema` and `V` is the type produced by
 * `valueSchema`.
 *
 * **NOTE** — this class is exported to allow extension by inheritance. Use
 * the {@link record | record()} factory function instead of instantiating it
 * directly.
 *
 * @example
 * ```ts
 * import { record, string, number } from '@cleverbrush/schema';
 *
 * // Basic: string keys, number values
 * const scores = record(string(), number().min(0));
 * // InferType<typeof scores> → Record<string, number>
 *
 * scores.validate({ alice: 95, bob: 87 }); // valid
 * scores.validate({ alice: 95, bob: -1 }); // invalid (negative)
 * ```
 *
 * @example
 * ```ts
 * // Restrict keys to a specific set of literals with .equals()
 * const locales = record(
 *   string().matches(/^[a-z]{2}(-[A-Z]{2})?$/),
 *   string().nonempty()
 * );
 * // accepts: { en: 'Hello', fr: 'Bonjour' }
 * // rejects: { 123: 'oops' }  ← key doesn't match pattern
 * ```
 *
 * @see {@link record}
 */
export class RecordSchemaBuilder<
    TKeySchema extends StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any>,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TResult = TExplicitType extends undefined
        ? Record<InferType<TKeySchema>, InferType<TValueSchema>>
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #keySchema!: TKeySchema;
    #valueSchema!: TValueSchema;

    /**
     * @hidden
     */
    public static create(props: RecordSchemaBuilderCreateProps<any, any, any>) {
        return new RecordSchemaBuilder({
            type: 'record',
            ...props
        } as any);
    }

    protected constructor(
        props: RecordSchemaBuilderCreateProps<
            TKeySchema,
            TValueSchema,
            TRequired
        >
    ) {
        super(props as any);

        if (props.keySchema instanceof SchemaBuilder) {
            this.#keySchema = props.keySchema as TKeySchema;
        }
        if (props.valueSchema instanceof SchemaBuilder) {
            this.#valueSchema = props.valueSchema as TValueSchema;
        }
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        true,
        T,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        TRequired,
        undefined,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(
        props: RecordSchemaBuilderCreateProps<TKeySchema, TValueSchema, TReq>
    ): this {
        return RecordSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: import('./SchemaBuilder.js').ValidationErrorMessageProvider
    ): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        true,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        false,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        true,
        TExplicitType,
        true,
        TExtensions
    > &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        TRequired,
        TExplicitType,
        false,
        TExtensions
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): RecordSchemaBuilder<
        TKeySchema,
        TValueSchema,
        TRequired,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * Returns an introspection object describing the record schema.
     */
    public introspect() {
        return {
            ...super.introspect(),
            /**
             * The schema every key must satisfy (a `StringSchemaBuilder`).
             */
            keySchema: this.#keySchema,
            /**
             * The schema every value must satisfy.
             */
            valueSchema: this.#valueSchema
        };
    }

    // -----------------------------------------------------------------------
    // Validation helpers
    // -----------------------------------------------------------------------

    #buildNestedErrors(
        keyResults: Map<string, ValidationResult<any>>
    ): Record<string, ValidationResult<InferType<TValueSchema>>> {
        const out: Record<string, ValidationResult<any>> = {};
        for (const [k, v] of keyResults) {
            out[k] = v;
        }
        return out;
    }

    /**
     * Core sync validation. Returns `{ valid, object, errors, getNestedErrors }`.
     */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): RecordSchemaValidationResult<TResult, TValueSchema> {
        // Fast path: skip pre-validation when no preprocessors/validators.
        if (this.canSkipPreValidation && !context?.doNotStopOnFirstError) {
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (!this.isRequired) {
                    const self = this;
                    const emptyNested = {} as Record<
                        string,
                        ValidationResult<InferType<TValueSchema>>
                    >;
                    return {
                        valid: true,
                        object,
                        getNestedErrors: () => emptyNested
                    } as any;
                } else {
                    return this.#validateFull(object, context);
                }
            }

            if (
                typeof object !== 'object' ||
                Array.isArray(object) ||
                object === null
            ) {
                return this.#validateFull(object, context);
            }

            // Validate every entry inline.
            const result: Record<string, any> = {};
            for (const key of Object.keys(object as any)) {
                const keyResult = this.#keySchema.validate(key);
                if (!keyResult.valid) {
                    const emptyNested = {} as Record<
                        string,
                        ValidationResult<InferType<TValueSchema>>
                    >;
                    return {
                        valid: false,
                        errors:
                            keyResult.errors && keyResult.errors.length > 0
                                ? [keyResult.errors[0]]
                                : [
                                      {
                                          message: `key "${key}" is invalid`
                                      }
                                  ],
                        getNestedErrors: () => emptyNested
                    } as any;
                }

                const valueResult = this.#valueSchema.validate(
                    (object as any)[key]
                );
                if (!valueResult.valid) {
                    const emptyNested = {} as Record<
                        string,
                        ValidationResult<InferType<TValueSchema>>
                    >;
                    return {
                        valid: false,
                        errors:
                            valueResult.errors && valueResult.errors.length > 0
                                ? [valueResult.errors[0]]
                                : [
                                      {
                                          message: `value for key "${key}" is invalid`
                                      }
                                  ],
                        getNestedErrors: () => emptyNested
                    } as any;
                }

                result[key] = valueResult.object;
            }

            const emptyNested = {} as Record<
                string,
                ValidationResult<InferType<TValueSchema>>
            >;
            return {
                valid: true,
                object: result as TResult,
                getNestedErrors: () => emptyNested
            } as any;
        }

        return this.#validateFull(object, context);
    }

    /**
     * Full validation path — processes preprocessors, validators, and collects
     * all per-entry results.
     */
    #validateFull(
        object: TResult,
        context?: ValidationContext
    ): RecordSchemaValidationResult<TResult, TValueSchema> {
        const superResult = this.preValidateSync(object, context);
        const { valid, errors } = superResult;

        const nestedKeyResults = new Map<
            string,
            ValidationResult<InferType<TValueSchema>>
        >();
        const getNestedErrors = () => this.#buildNestedErrors(nestedKeyResults);

        if (!valid) {
            return { valid, errors, getNestedErrors } as any;
        }

        const objToValidate = superResult.transaction!.object
            .validatedObject as any;

        if (
            (typeof objToValidate === 'undefined' || objToValidate === null) &&
            !this.isRequired
        ) {
            return {
                valid: true,
                object: objToValidate,
                getNestedErrors
            } as any;
        }

        if (
            typeof objToValidate !== 'object' ||
            Array.isArray(objToValidate) ||
            objToValidate === null
        ) {
            return {
                valid: false,
                errors: [{ message: 'object expected' }],
                getNestedErrors
            } as any;
        }

        const keys = Object.keys(objToValidate);
        const doNotStop = context?.doNotStopOnFirstError ?? false;
        let allValid = true;
        const result: Record<string, any> = {};
        const allErrors: import('./SchemaBuilder.js').ValidationError[] = [];

        for (const key of keys) {
            const keyResult = this.#keySchema.validate(key);
            if (!keyResult.valid) {
                allValid = false;
                const keyErrors =
                    keyResult.errors && keyResult.errors.length > 0
                        ? keyResult.errors
                        : [{ message: `key "${key}" is invalid` }];

                // Store in nested errors for the value slot too
                nestedKeyResults.set(key, {
                    valid: false,
                    errors: keyErrors
                });

                allErrors.push(...keyErrors);
                if (!doNotStop) break;
                continue;
            }

            const valueResult = this.#valueSchema.validate(
                objToValidate[key],
                doNotStop ? { doNotStopOnFirstError: true } : undefined
            );

            nestedKeyResults.set(key, valueResult as any);

            if (!valueResult.valid) {
                allValid = false;
                const valueErrors =
                    valueResult.errors && valueResult.errors.length > 0
                        ? valueResult.errors
                        : [{ message: `value for key "${key}" is invalid` }];
                allErrors.push(...valueErrors);
                if (!doNotStop) break;
            } else {
                result[key] = valueResult.object;
            }
        }

        if (!allValid) {
            return {
                valid: false,
                errors: doNotStop ? allErrors : [allErrors[0]],
                getNestedErrors
            } as any;
        }

        return {
            valid: true,
            object: result as TResult,
            getNestedErrors
        } as any;
    }

    /**
     * Performs async validation of the record schema.
     *
     * Supports async preprocessors, validators, and error message providers.
     *
     * @param object - the value to validate
     * @param context - optional `ValidationContext` settings
     */
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<RecordSchemaValidationResult<TResult, TValueSchema>> {
        const superResult = await this.preValidateAsync(object, context);
        const { valid, errors } = superResult;

        const nestedKeyResults = new Map<
            string,
            ValidationResult<InferType<TValueSchema>>
        >();
        const getNestedErrors = () => this.#buildNestedErrors(nestedKeyResults);

        if (!valid) {
            return { valid, errors, getNestedErrors } as any;
        }

        const objToValidate = superResult.transaction!.object
            .validatedObject as any;

        if (
            (typeof objToValidate === 'undefined' || objToValidate === null) &&
            !this.isRequired
        ) {
            return {
                valid: true,
                object: objToValidate,
                getNestedErrors
            } as any;
        }

        if (
            typeof objToValidate !== 'object' ||
            Array.isArray(objToValidate) ||
            objToValidate === null
        ) {
            return {
                valid: false,
                errors: [{ message: 'object expected' }],
                getNestedErrors
            } as any;
        }

        const keys = Object.keys(objToValidate);
        const doNotStop = context?.doNotStopOnFirstError ?? false;
        let allValid = true;
        const result: Record<string, any> = {};
        const allErrors: import('./SchemaBuilder.js').ValidationError[] = [];

        for (const key of keys) {
            const keyResult = await this.#keySchema.validateAsync(key);
            if (!keyResult.valid) {
                allValid = false;
                const keyErrors =
                    keyResult.errors && keyResult.errors.length > 0
                        ? keyResult.errors
                        : [{ message: `key "${key}" is invalid` }];

                nestedKeyResults.set(key, { valid: false, errors: keyErrors });
                allErrors.push(...keyErrors);
                if (!doNotStop) break;
                continue;
            }

            const valueResult = await this.#valueSchema.validateAsync(
                objToValidate[key],
                doNotStop ? { doNotStopOnFirstError: true } : undefined
            );

            nestedKeyResults.set(key, valueResult as any);

            if (!valueResult.valid) {
                allValid = false;
                const valueErrors =
                    valueResult.errors && valueResult.errors.length > 0
                        ? valueResult.errors
                        : [{ message: `value for key "${key}" is invalid` }];
                allErrors.push(...valueErrors);
                if (!doNotStop) break;
            } else {
                result[key] = valueResult.object;
            }
        }

        if (!allValid) {
            return {
                valid: false,
                errors: doNotStop ? allErrors : [allErrors[0]],
                getNestedErrors
            } as any;
        }

        return {
            valid: true,
            object: result as TResult,
            getNestedErrors
        } as any;
    }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Creates a schema for objects with dynamic string keys, where every key
 * must satisfy `keySchema` and every value must satisfy `valueSchema`.
 *
 * The inferred TypeScript type is `Record<K, V>` where `K` is derived from
 * `keySchema` and `V` from `valueSchema`.
 *
 * @param keySchema  - a `StringSchemaBuilder` that each key must satisfy
 * @param valueSchema - a `SchemaBuilder` that each value must satisfy
 *
 * @example
 * ```ts
 * import { record, string, number } from '@cleverbrush/schema';
 *
 * // Look-up table: string keys → number scores
 * const scores = record(string(), number().min(0).max(100));
 * // InferType<typeof scores> → Record<string, number>
 *
 * scores.validate({ alice: 95, bob: 87 }); // { valid: true }
 * scores.validate({ alice: 95, bob: -1 }); // { valid: false }
 * ```
 *
 * @example
 * ```ts
 * // i18n bundle: locale code keys → non-empty strings
 * const bundle = record(
 *   string().matches(/^[a-z]{2}(-[A-Z]{2})?$/),
 *   string().nonempty()
 * );
 *
 * bundle.validate({ en: 'Hello', 'fr-FR': 'Bonjour' }); // valid
 * bundle.validate({ en: '' });                            // invalid (empty value)
 * bundle.validate({ '123': 'hi' });                      // invalid (bad key)
 * ```
 *
 * @example
 * ```ts
 * // Optional record with a factory default
 * const cache = record(string(), number())
 *   .optional()
 *   .default(() => ({}));
 * ```
 *
 * @example
 * ```ts
 * // Nested record — values are objects
 * import { record, string, object, number } from '@cleverbrush/schema';
 *
 * const userMap = record(
 *   string(),
 *   object({ name: string(), age: number() })
 * );
 * ```
 */
export function record<
    TKeySchema extends StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any>
>(
    keySchema: TKeySchema,
    valueSchema: TValueSchema
): RecordSchemaBuilder<TKeySchema, TValueSchema> {
    return RecordSchemaBuilder.create({
        type: 'record',
        keySchema,
        valueSchema
    } as any) as any;
}
