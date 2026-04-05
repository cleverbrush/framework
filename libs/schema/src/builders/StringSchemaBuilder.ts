import {
    type BRAND,
    type PreprocessorEntry,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult,
    type ValidatorEntry
} from './SchemaBuilder.js';

type StringSchemaBuilderCreateProps<
    T = string,
    R extends boolean = true
> = Partial<ReturnType<StringSchemaBuilder<T, R>['introspect']>>;

/**
 * Allows to define a schema for a string. It can be: required or optional,
 * restricted to be equal to a certain value, restricted to have a certain
 * length, restricted to start with a certain value, restricted to end with
 * a certain value, restricted to match a certain regular expression.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link string | string()} function instead.
 *
 * @example ```ts
 * const schema = string().equals('hello');
 * const result = schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * ```
 *
 * @example ```ts
 * const schema = string().equals('hello');
 * const result = schema.validate('world');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'hello'"
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(5);
 * const result = schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(5);
 * const result = schema.validate('hi');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to have a length of at least 5'
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(2).maxLength(5);
 * const result = schema.validate('yes');
 * // result.valid === true
 * // result.object === 'yes'
 * ```
 *
 * @example ```ts
 * const schema = string('no');
 * const result = schema.validate('yes');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'no'"
 * ```
 *
 * @see {@link string}
 */
export class StringSchemaBuilder<
    TResult = string,
    TRequired extends boolean = true,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #minLength?: number;
    #defaultMinLengthErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder) {
        return `is expected to have a length of at least ${this.#minLength} characters`;
    };
    #minLengthErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultMinLengthErrorMessageProvider;

    #maxLength?: number;
    #defaultMaxLengthErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder) {
        return `is expected to have a length of no more than ${this.#maxLength} characters`;
    };
    #maxLengthErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultMaxLengthErrorMessageProvider;

    #equalsTo?: string;
    #defaultEqualsToErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder, seenValue?: TResult) {
        return `is expected to be equal to "${this.#equalsTo}" but saw "${seenValue}"`;
    };
    #equalsToErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultEqualsToErrorMessageProvider;

    #startsWith?: string;
    #defaultStartsWithErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder) {
        return `is expected to start with "${this.#startsWith}"`;
    };
    #startsWithErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultStartsWithErrorMessageProvider;

    #endsWith?: string;
    #defaultEndsWithErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder) {
        return `is expected to end with "${this.#endsWith}"`;
    };
    #endsWithErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultEndsWithErrorMessageProvider;

    #matches?: RegExp;
    #defaultMatchesErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = function (this: StringSchemaBuilder) {
        return `is expected to match the pattern ${this.#matches}`;
    };
    #matchesErrorMessageProvider: ValidationErrorMessageProvider<
        StringSchemaBuilder<TResult, TRequired>
    > = this.#defaultMatchesErrorMessageProvider;

    /**
     * @hidden
     */
    public static create(props: StringSchemaBuilderCreateProps) {
        return new StringSchemaBuilder({
            type: 'string',
            ...props
        });
    }

    protected constructor(props: StringSchemaBuilderCreateProps) {
        super(props as any);

        if (typeof props.minLength === 'number') {
            this.#minLength = props.minLength;
        }

        this.#minLengthErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.minLengthValidationErrorMessageProvider,
                this.#defaultMinLengthErrorMessageProvider
            );

        if (typeof props.maxLength === 'number') {
            this.#maxLength = props.maxLength;
        }

        this.#maxLengthErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.maxLengthValidationErrorMessageProvider,
                this.#defaultMaxLengthErrorMessageProvider
            );

        if (
            typeof props.equalsTo === 'string' ||
            typeof props.equalsTo === 'undefined'
        ) {
            this.#equalsTo = props.equalsTo;
        }

        this.#equalsToErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.equalsToValidationErrorMessageProvider,
                this.#defaultEqualsToErrorMessageProvider
            );

        if (
            typeof props.startsWith === 'string' &&
            props.startsWith.length > 0
        ) {
            this.#startsWith = props.startsWith;
        }

        this.#startsWithErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.startsWithValidationErrorMessageProvider,
                this.#defaultStartsWithErrorMessageProvider
            );

        if (typeof props.endsWith === 'string' && props.endsWith.length > 0) {
            this.#endsWith = props.endsWith;
        }

        this.#endsWithErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.endsWithValidationErrorMessageProvider,
                this.#defaultEndsWithErrorMessageProvider
            );

        if (props.matches instanceof RegExp) {
            this.#matches = props.matches;
        }

        this.#matchesErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.matchesValidationErrorMessageProvider,
                this.#defaultMatchesErrorMessageProvider
            );
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Min length of the string (if defined).
             */
            minLength: this.#minLength,

            /**
             * Min length validation error message provider.
             * If not provided, default error message will be used.
             */
            minLengthValidationErrorMessageProvider:
                this.#minLengthErrorMessageProvider,

            /**
             * Max length of the string (if defined).
             */
            maxLength: this.#maxLength,

            /**
             * Max length validation error message provider.
             * If not provided, default error message will be used.
             */
            maxLengthValidationErrorMessageProvider:
                this.#maxLengthErrorMessageProvider,

            /**
             * If set, restrict object to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,

            /**
             * Equals validation error message provider.
             * If not provided, default error message will be used.
             */
            equalsToValidationErrorMessageProvider:
                this.#equalsToErrorMessageProvider,

            /**
             * If set, restrict string to start with a certain value.
             */
            startsWith: this.#startsWith,

            /**
             * Starts with validation error message provider.
             * If not provided, default error message will be used.
             */
            startsWithValidationErrorMessageProvider:
                this.#startsWithErrorMessageProvider,

            /**
             * If set, restrict string to end with a certain value.
             */
            endsWith: this.#endsWith,

            /**
             * Ends with validation error message provider.
             * If not provided, default error message will be used.
             */
            endsWithValidationErrorMessageProvider:
                this.#endsWithErrorMessageProvider,

            /**
             * If set, restrict string to match a certain regular expression.
             */
            matches: this.#matches,

            /**
             * Matches validation error message provider.
             * If not provided, default error message will be used.
             */
            matchesValidationErrorMessageProvider:
                this.#matchesErrorMessageProvider,

            /**
             * Array of preprocessor functions
             */
            preprocessors: this.preprocessors as PreprocessorEntry<TResult>[],

            /**
             * Array of validator functions
             */
            validators: this.validators as ValidatorEntry<TResult>[]
        };
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): StringSchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): StringSchemaBuilder<
        string,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    #getConstraintViolation(
        objToValidate: any
    ): { message: string } | { provider: any } | null {
        if (typeof objToValidate !== 'string') {
            return {
                message: `expected type string, but saw ${typeof objToValidate}`
            };
        }

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate !== this.#equalsTo
        ) {
            return { provider: this.#equalsToErrorMessageProvider };
        }

        if (
            typeof this.#startsWith === 'string' &&
            this.#startsWith.length > 0 &&
            !objToValidate.startsWith(this.#startsWith)
        ) {
            return { provider: this.#startsWithErrorMessageProvider };
        }

        if (
            typeof this.#endsWith === 'string' &&
            this.#endsWith.length > 0 &&
            !objToValidate.endsWith(this.#endsWith)
        ) {
            return { provider: this.#endsWithErrorMessageProvider };
        }

        if (typeof this.#minLength !== 'undefined') {
            if (objToValidate.length < this.#minLength)
                return { provider: this.#minLengthErrorMessageProvider };
        }

        if (typeof this.#maxLength !== 'undefined') {
            if (objToValidate.length > this.#maxLength)
                return { provider: this.#maxLengthErrorMessageProvider };
        }

        if (this.#matches instanceof RegExp) {
            if (!this.#matches.test(objToValidate)) {
                return { provider: this.#matchesErrorMessageProvider };
            }
        }

        return null;
    }

    #buildResult(
        superResult: ReturnType<StringSchemaBuilder['preValidateSync']>
    ):
        | { done: true; result: ValidationResult<TResult> }
        | {
              done: false;
              provider: any;
              objToValidate: any;
          } {
        const {
            valid,
            transaction: preValidationTransaction,
            errors
        } = superResult;

        if (!valid) {
            return { done: true, result: { valid, errors } };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' || objToValidate === null) &&
            this.isRequired === false
        ) {
            return {
                done: true,
                result: { valid: true, object: objToValidate }
            };
        }

        const violation = this.#getConstraintViolation(objToValidate);

        if (!violation) {
            return {
                done: true,
                result: { valid: true, object: objToValidate as TResult }
            };
        }

        if ('message' in violation) {
            return {
                done: true,
                result: {
                    valid: false,
                    errors: [{ message: violation.message }]
                }
            };
        }

        return {
            done: false,
            provider: violation.provider,
            objToValidate
        };
    }

    /** {@inheritDoc SchemaBuilder.validate} */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        return super.validate(object, context) as ValidationResult<TResult>;
    }

    /** {@inheritDoc SchemaBuilder.validateAsync} */
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return super.validateAsync(object, context) as Promise<
            ValidationResult<TResult>
        >;
    }

    /**
     * Performs synchronous validation of string schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    protected _validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        // Fast path: no preprocessors or custom validators — skip preValidateSync entirely
        if (this.canSkipPreValidation) {
            // Required / optional check
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (!this.isRequired) {
                    return { valid: true, object: object };
                } else {
                    return {
                        valid: false,
                        errors: [
                            {
                                message: this.getValidationErrorMessageSync(
                                    this.requiredErrorMessage,
                                    object
                                )
                            }
                        ]
                    };
                }
            }

            const violation = this.#getConstraintViolation(object);

            if (!violation) {
                return { valid: true, object: object as TResult };
            }

            if ('message' in violation) {
                return {
                    valid: false,
                    errors: [{ message: violation.message }]
                };
            }

            return {
                valid: false,
                errors: [
                    {
                        message: this.getValidationErrorMessageSync(
                            violation.provider,
                            object as TResult
                        )
                    }
                ]
            };
        }

        const r = this.#buildResult(this.preValidateSync(object, context));
        if (r.done) return r.result;
        return {
            valid: false,
            errors: [
                {
                    message: this.getValidationErrorMessageSync(
                        r.provider,
                        r.objToValidate as TResult
                    )
                }
            ]
        };
    }

    /**
     * Performs async validation of string schema over `object`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional `ValidationContext` settings.
     */
    protected async _validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const r = this.#buildResult(
            await super.preValidateAsync(object, context)
        );
        if (r.done) return r.result;
        return {
            valid: false,
            errors: [
                {
                    message: await this.getValidationErrorMessage(
                        r.provider,
                        r.objToValidate as TResult
                    )
                }
            ]
        };
    }

    protected createFromProps<T, TReq extends boolean>(
        props: StringSchemaBuilderCreateProps<T, TReq>
    ): this {
        return StringSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts string to be equal to `value`.
     */
    public equals<T extends string>(
        value: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ) {
        if (typeof value !== 'string') throw new Error('string expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value,
            equalsToValidationErrorMessageProvider: errorMessage
        }) as any as StringSchemaBuilder<
            T,
            TRequired,
            THasDefault,
            TExtensions
        > &
            TExtensions;
    }

    /**
     * Cancels `equals()` call.
     */
    public clearEquals(): StringSchemaBuilder<
        string,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): StringSchemaBuilder<TResult, true, THasDefault, TExtensions> &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): StringSchemaBuilder<
        TResult,
        false,
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
    ): StringSchemaBuilder<TResult, true, true, TExtensions> & TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): StringSchemaBuilder<
        TResult,
        TRequired,
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
    ): StringSchemaBuilder<
        TResult & { readonly [K in BRAND]: TBrand },
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * Marks the inferred type as `Readonly<string>`. Since strings are
     * already immutable this is an identity operation, but it sets the
     * `isReadonly` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    public readonly(): StringSchemaBuilder<
        Readonly<TResult>,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }

    /**
     * Set minimal length of the valid value for schema.
     * @param length minimum string length
     */
    public minLength(
        length: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> &
        TExtensions {
        if (typeof length !== 'number')
            throw new Error('length must be a number');
        return this.createFromProps({
            ...this.introspect(),
            minLength: length,
            minLengthValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Cancel `minLength()` call.
     */
    public clearMinLength(): StringSchemaBuilder<
        TResult,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const schema = this.introspect();
        delete schema.minLength;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Set maximal length of the valid value for schema.
     * @param length maximum string length
     */
    public maxLength(
        length: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> &
        TExtensions {
        if (typeof length !== 'number')
            throw new Error('length must be a number');
        return this.createFromProps({
            ...this.introspect(),
            maxLength: length,
            maxLengthValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Cancel `maxLength()` call.
     */
    public clearMaxLength(): StringSchemaBuilder<
        TResult,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const schema = this.introspect();
        delete schema.maxLength;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Restricts string to start with `val`.
     */
    public startsWith<T extends string>(
        val: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<
        TResult extends string ? `${T}${TResult}` : TResult,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (typeof val !== 'string' || !val)
            throw new Error('non empty string expected');
        return this.createFromProps({
            ...this.introspect(),
            startsWith: val,
            startsWithValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Cancels `startsWith()` call.
     */
    public clearStartsWith(): StringSchemaBuilder<
        string,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const schema = this.introspect();
        delete schema.startsWith;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Restricts string to end with `val`.
     */
    public endsWith<T extends string>(
        val: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<
        TResult extends string ? `${TResult}${T}` : TResult,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (typeof val !== 'string' || !val)
            throw new Error('non empty string expected');
        return this.createFromProps({
            ...this.introspect(),
            endsWith: val,
            endsWithValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Cancels `endsWith()` call.
     */
    public clearEndsWith(): StringSchemaBuilder<
        string,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const schema = this.introspect();
        delete schema.endsWith;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Restricts string to match `regexp`.
     * @param regexp regular expression pattern to match against
     */
    public matches(
        regexp: RegExp,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> &
        TExtensions {
        if (!(regexp instanceof RegExp)) throw new Error('regexp expected');
        return this.createFromProps({
            ...this.introspect(),
            matches: regexp,
            matchesValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Cancels `matches()` call.
     */
    public clearMatches(): StringSchemaBuilder<
        TResult,
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const schema = this.introspect();
        delete schema.matches;
        return this.createFromProps({
            ...schema
        }) as any;
    }
}

/**
 * Creates a string schema restricted to be equal to `equals`.
 * @param equals string value the schema is restricted to
 */
export function string<T extends string>(
    equals: T
): StringSchemaBuilder<T, true>;

/**
 * Creates a string schema restricted to be equal to `equals` with a custom error message.
 * @param equals string value the schema is restricted to
 */
export function string<T extends string>(
    equals: T,
    errorMessage: ValidationErrorMessageProvider<StringSchemaBuilder<T, true>>
): StringSchemaBuilder<T, true>;

export function string(): StringSchemaBuilder<string, true>;

/**
 * Creates a string schema.
 */
export function string(
    equals?: string,
    errorMessage?: ValidationErrorMessageProvider<
        StringSchemaBuilder<string, true>
    >
) {
    if (typeof equals === 'string') {
        return StringSchemaBuilder.create({
            isRequired: true,
            equalsTo: equals,
            equalsToValidationErrorMessageProvider: errorMessage
        });
    }
    return StringSchemaBuilder.create({
        isRequired: true
    });
}
