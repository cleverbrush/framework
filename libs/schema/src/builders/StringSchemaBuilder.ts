import {
    Preprocessor,
    SchemaBuilder,
    ValidationContext,
    ValidationErrorMessageProvider,
    ValidationResult,
    Validator
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
 * const result = await schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * ```
 *
 * @example ```ts
 * const schema = string().equals('hello');
 * const result = await schema.validate('world');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'hello'"
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(5);
 * const result = await schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(5);
 * const result = await schema.validate('hi');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to have a length of at least 5'
 * ```
 *
 * @example ```ts
 * const schema = string().minLength(2).maxLength(5);
 * const result = await schema.validate('yes');
 * // result.valid === true
 * // result.object === 'yes'
 * ```
 *
 * @example ```ts
 * const schema = string('no');
 * const result = await schema.validate('yes');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'no'"
 * ```
 *
 * @see {@link string}
 */
export class StringSchemaBuilder<
    TResult = string,
    TRequired extends boolean = true
> extends SchemaBuilder<TResult, TRequired> {
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

    public static create(props: StringSchemaBuilderCreateProps) {
        return new StringSchemaBuilder({
            type: 'string',
            ...props
        });
    }

    private constructor(props: StringSchemaBuilderCreateProps) {
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
            preprocessors: this.preprocessors as Preprocessor<TResult>[],

            /**
             * Array of validator functions
             */
            validators: this.validators as Validator<TResult>[]
        };
    }

    /**
     * @hidden
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): StringSchemaBuilder<T, true> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): StringSchemaBuilder<string, TRequired> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of string schema over `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await super.preValidate(object, context);

        const {
            valid,
            context: prevalidationContext,
            transaction: preValidationTransaction,
            errors
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return {
                valid,
                errors
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' || objToValidate === null) &&
            this.isRequired === false
        ) {
            return {
                valid: true,
                object: objToValidate
            };
        }
        if (typeof objToValidate !== 'string')
            return {
                valid: false,
                errors: [
                    {
                        message: `expected type string, but saw ${typeof objToValidate}`,
                        path: path as string
                    }
                ]
            };

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate !== this.#equalsTo
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#equalsToErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (
            typeof this.#startsWith === 'string' &&
            this.#startsWith.length > 0 &&
            !objToValidate.startsWith(this.#startsWith)
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#startsWithErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (
            typeof this.#endsWith === 'string' &&
            this.#endsWith.length > 0 &&
            !objToValidate.endsWith(this.#endsWith)
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#endsWithErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (typeof this.#minLength !== 'undefined') {
            if (objToValidate.length < this.#minLength)
                return {
                    valid: false,
                    errors: [
                        {
                            message: await this.getValidationErrorMessage(
                                this.#minLengthErrorMessageProvider,
                                objToValidate as TResult
                            ),
                            path: path as string
                        }
                    ]
                };
        }

        if (typeof this.#maxLength !== 'undefined') {
            if (objToValidate.length > this.#maxLength)
                return {
                    valid: false,
                    errors: [
                        {
                            message: await this.getValidationErrorMessage(
                                this.#maxLengthErrorMessageProvider,
                                objToValidate as TResult
                            ),
                            path: path as string
                        }
                    ]
                };
        }

        if (this.#matches instanceof RegExp) {
            if (!this.#matches.test(objToValidate)) {
                return {
                    valid: false,
                    errors: [
                        {
                            message: await this.getValidationErrorMessage(
                                this.#matchesErrorMessageProvider,
                                objToValidate as TResult
                            ),
                            path: path as string
                        }
                    ]
                };
            }
        }

        return {
            valid: true,
            object: objToValidate as TResult
        };
    }

    protected createFromProps<T, TReq extends boolean>(
        props: StringSchemaBuilderCreateProps<T, TReq>
    ): this {
        return StringSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts object to be equal to `value`.
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
        }) as any as StringSchemaBuilder<T, TRequired>;
    }

    /**
     * Cancels `equals()` call.
     */
    public clearEquals(): StringSchemaBuilder<string, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * @hidden
     */
    public required(): StringSchemaBuilder<TResult, true> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): StringSchemaBuilder<TResult, false> {
        return super.optional();
    }

    /**
     * Set minimal length of the valid value for schema.
     * @param {number} length
     */
    public minLength(
        length: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired> {
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
    public clearMinLength(): StringSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.minLength;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Set maximal length of the valid value for schema.
     * @length {number} length
     */
    public maxLength(
        length: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired> {
        if (typeof length !== 'number')
            throw new Error('length must be a number');
        return this.createFromProps({
            ...this.introspect(),
            maxLength: length,
            maxLengthValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * cancel `maxLength()` call.
     */
    public clearMaxLength(): StringSchemaBuilder<TResult, TRequired> {
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
        TRequired
    > {
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
    public clearStartsWith(): StringSchemaBuilder<string, TRequired> {
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
        TRequired
    > {
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
    public clearEndsWith(): StringSchemaBuilder<string, TRequired> {
        const schema = this.introspect();
        delete schema.endsWith;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Restricts string to match `regexp`.
     */
    public matches(
        regexp: RegExp,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            StringSchemaBuilder<TResult, TRequired>
        >
    ): StringSchemaBuilder<TResult, TRequired> {
        if (!(regexp instanceof RegExp)) throw new Error('regexp expected');
        return this.createFromProps({
            ...this.introspect(),
            matches: regexp,
            matchesValidationErrorMessageProvider: errorMessage
        });
    }

    /**
     * Cancels `matches()` call.
     */
    public clearMatches(): StringSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.matches;
        return this.createFromProps({
            ...schema
        });
    }
}

/**
 * Creates a string schema restricted to be equal to `equals`.
 * @param equals number value
 */
export function string<T extends string>(
    equals: T
): StringSchemaBuilder<T, true>;

export function string(): StringSchemaBuilder<string, true>;

/**
 * Creates a string schema.
 */
export function string(equals?: string) {
    if (typeof equals === 'string') {
        return StringSchemaBuilder.create({
            isRequired: true,
            equalsTo: equals
        });
    }
    return StringSchemaBuilder.create({
        isRequired: true
    });
}
