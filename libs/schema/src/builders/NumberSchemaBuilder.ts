import {
    Preprocessor,
    SchemaBuilder,
    ValidationContext,
    ValidationErrorMessageProvider,
    ValidationResult,
    Validator
} from './SchemaBuilder.js';

type NumberSchemaBuilderCreateProps<
    T = number,
    R extends boolean = true
> = Partial<ReturnType<NumberSchemaBuilder<T, R>['introspect']>>;

/**
 * Number schema builder class. Allows to create Number schemas.
 * Can be required or optional, can be restricted to be equal to a certain value,
 * can be restricted to be in a certain range, can be restricted to be integer.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link number | number()} function instead.
 *
 * @example ```ts
 * const schema = number().equals(42);
 * const result = await schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * ```
 * @example ```ts
 * const schema = number();
 * const result = await schema.validate('42');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be a number'
 * ```
 * @example ```ts
 * const schema = number().min(0).max(100);
 * const result = await schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * ```
 *
 * @example ```ts
 * const schema = number().min(0).max(100);
 * const result = await schema.validate(142.5);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be less than or equal to 100'
 * ```
 *
 * @see {@link number}
 */
export class NumberSchemaBuilder<
    TResult = number,
    TRequired extends boolean = true
> extends SchemaBuilder<TResult, TRequired> {
    #min?: number;
    #defaultMinErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return `expected to be at least ${this.#min}`;
    } as any;
    #minErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultMinErrorMessageProvider;

    #max?: number;
    #defaultMaxErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return `expected to be no more than or equal to ${this.#max}`;
    };
    #maxErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultMaxErrorMessageProvider;

    #equalsTo?: number;
    #defaultEqualsToErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return `expected to be equal to ${this.#equalsTo}`;
    };
    #equalsToErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultEqualsToErrorMessageProvider;

    #ensureNotNaN = true;
    #defaultEnsureNotNaNErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return 'is not expected to be NaN';
    };
    #ensureNotNaNErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultEnsureNotNaNErrorMessageProvider;

    #ensureIsFinite = true;
    #defaultEnsureIsFiniteErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return 'is expected to be a finite number';
    };
    #ensureIsFiniteErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultEnsureIsFiniteErrorMessageProvider;

    #isInteger = true;
    #defaultEnsureIsIntegerErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = function (this: NumberSchemaBuilder) {
        return 'is expected to be an integer';
    };
    #ensureIsIntegerErrorMessageProvider: ValidationErrorMessageProvider<
        NumberSchemaBuilder<TResult, TRequired>
    > = this.#defaultEnsureIsIntegerErrorMessageProvider;

    public static create(props: NumberSchemaBuilderCreateProps) {
        return new NumberSchemaBuilder({
            type: 'number',
            ...props
        });
    }

    private constructor(props: NumberSchemaBuilderCreateProps) {
        super(props as any);

        if (typeof props.min === 'number') {
            this.#min = props.min;
        }

        this.#minErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.minValidationErrorMessageProvider as any,
                this.#defaultMinErrorMessageProvider
            );

        if (typeof props.max === 'number') {
            this.#max = props.max;
        }

        this.#maxErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.maxValidationErrorMessageProvider as any,
                this.#defaultMaxErrorMessageProvider
            );

        if (typeof props.ensureNotNaN === 'boolean') {
            this.#ensureNotNaN = props.ensureNotNaN;
        }

        this.#ensureNotNaNErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.ensureNotNaNErrorMessageProvider as any,
                this.#defaultEnsureNotNaNErrorMessageProvider
            );

        if (typeof props.ensureIsFinite === 'boolean') {
            this.#ensureIsFinite = props.ensureIsFinite;
        }

        this.#ensureIsFiniteErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.ensureIsFiniteErrorMessageProvider as any,
                this.#defaultEnsureIsFiniteErrorMessageProvider
            );

        if (typeof props.isInteger === 'boolean') {
            this.#isInteger = props.isInteger;
        }

        this.#ensureIsIntegerErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.ensureIsIntegerErrorMessageProvider as any,
                this.#defaultEnsureIsIntegerErrorMessageProvider
            );

        if (
            typeof props.equalsTo === 'number' ||
            typeof props.equalsTo === 'undefined'
        ) {
            this.#equalsTo = props.equalsTo;
        }

        this.#equalsToErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.equalsToValidationErrorMessageProvider as any,
                this.#defaultEqualsToErrorMessageProvider
            );
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Min valid value (if defined).
             */
            min: this.#min,
            /**
             * Min valid value error message provider.
             * If not provided, default error message will be used.
             */
            minValidationErrorMessageProvider: this.#minErrorMessageProvider,

            /**
             * Max valid value (if defined).
             */
            max: this.#max,
            /**
             * Max valid value error message provider.
             * If not provided, default error message will be used.
             */
            maxValidationErrorMessageProvider: this.#maxErrorMessageProvider,

            /**
             * Make sure that object is not `NaN`. `true` by default.
             */
            ensureNotNaN: this.#ensureNotNaN,
            /**
             * EnsureNotNaN error message provider.
             * If not provided, default error message will be used.
             */
            ensureNotNaNErrorMessageProvider:
                this.#ensureNotNaNErrorMessageProvider,

            /**
             * Make sure that object is not different kinds of `infinity`. `true` by default.
             */
            ensureIsFinite: this.#ensureIsFinite,
            /**
             * EnsureIsFinite error message provider.
             */
            ensureIsFiniteErrorMessageProvider:
                this.#ensureIsFiniteErrorMessageProvider,

            /**
             * If set, restrict object to be equal to a certain value.
             */

            equalsTo: this.#equalsTo,
            /**
             * EqualsTo error message provider.
             * If not provided, default error message will be used.
             */
            equalsToValidationErrorMessageProvider:
                this.#equalsToErrorMessageProvider,

            /**
             * Allow only integer values (floating point values will be rejected
             * as invalid)
             */
            isInteger: this.#isInteger,
            /**
             * EnsureIsInteger error message provider.
             */
            ensureIsIntegerErrorMessageProvider:
                this.#ensureIsIntegerErrorMessageProvider,

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
    public hasType<T>(notUsed?: T): NumberSchemaBuilder<T, true> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): NumberSchemaBuilder<number, TRequired> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of number schema over `object`.
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
        if (typeof objToValidate !== 'number')
            return {
                valid: false,
                errors: [
                    {
                        message: `expected type number, but saw ${typeof objToValidate}`,
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

        if (this.#ensureNotNaN && Number.isNaN(objToValidate)) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#ensureNotNaNErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (
            this.#ensureIsFinite &&
            !Number.isFinite(objToValidate) &&
            this.#ensureNotNaN &&
            !Number.isNaN(objToValidate)
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#ensureIsFiniteErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (
            this.#isInteger &&
            !Number.isNaN(objToValidate) &&
            Number.isFinite(objToValidate) &&
            !Number.isInteger(objToValidate)
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#ensureIsIntegerErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (typeof this.#min !== 'undefined') {
            if (objToValidate < this.#min)
                return {
                    valid: false,
                    errors: [
                        {
                            message: await this.getValidationErrorMessage(
                                this.#minErrorMessageProvider,
                                objToValidate as TResult
                            ),
                            path: path as string
                        }
                    ]
                };
        }

        if (typeof this.#max !== 'undefined') {
            if (objToValidate > this.#max)
                return {
                    valid: false,
                    errors: [
                        {
                            message: await this.getValidationErrorMessage(
                                this.#maxErrorMessageProvider,
                                objToValidate as TResult
                            ),
                            path: path as string
                        }
                    ]
                };
        }

        return {
            valid: true,
            object: preValidationTransaction!.commit().validatedObject
        };
    }

    protected createFromProps<T, TReq extends boolean>(
        props: NumberSchemaBuilderCreateProps<T, TReq>
    ): this {
        return NumberSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts number to be equal to `value`.
     */
    public equals<T extends number>(
        value: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ) {
        if (typeof value !== 'number') throw new Error('number expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value,
            equalsToValidationErrorMessageProvider: errorMessage
        }) as any as NumberSchemaBuilder<T, TRequired>;
    }

    /**
     * Clear `equals()` call.
     */
    public clearEquals(): NumberSchemaBuilder<number, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * @deprecated Use {@link clearIsInteger} instead.
     * Float values will be considered as valid after this call.
     */
    public isFloat(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: false,
            ensureIsIntegerErrorMessageProvider:
                this.#defaultEnsureIsIntegerErrorMessageProvider
        }) as any;
    }

    /**
     * Clear `isInteger()` call.
     */
    public clearIsInteger(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: false,
            ensureIsIntegerErrorMessageProvider:
                this.#defaultEnsureIsIntegerErrorMessageProvider
        }) as any;
    }

    /**
     * Only integer values will be considered as valid after this call.
     */
    public isInteger(
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: true,
            ensureIsIntegerErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * @hidden
     */
    public required(): NumberSchemaBuilder<TResult, true> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): NumberSchemaBuilder<TResult, false> {
        return super.optional();
    }

    /**
     * Do not accept NaN value
     */
    public notNaN(
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: true,
            ensureNotNaNErrorMessageProvider: errorMessage
        });
    }

    /**
     * Consider NaN value as valid
     */
    public canBeNaN(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: false,
            ensureNotNaNErrorMessageProvider:
                this.#defaultEnsureNotNaNErrorMessageProvider
        });
    }

    /**
     * Do not accept `Infinity`.
     */
    public isFinite(
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: true,
            ensureIsFiniteErrorMessageProvider: errorMessage
        });
    }

    /**
     * Consider `Infinity` as valid.
     */
    public canBeInfinite(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: false,
            ensureIsFiniteErrorMessageProvider:
                this.#defaultEnsureIsFiniteErrorMessageProvider
        });
    }

    /**
     * Restrict number to be at least `minValue`.
     */
    public min(
        minValue: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ): NumberSchemaBuilder<TResult, TRequired> {
        if (typeof minValue !== 'number')
            throw new Error('minValue must be a number');
        return this.createFromProps({
            ...this.introspect(),
            min: minValue,
            minValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Clear `min()` call.
     */
    public clearMin(): NumberSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.min;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Restrict number to be no more than `maxValue`.
     */
    public max(
        maxValue: number,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            NumberSchemaBuilder<TResult, TRequired>
        >
    ): NumberSchemaBuilder<TResult, TRequired> {
        if (typeof maxValue !== 'number')
            throw new Error('maxValue must be a number');
        return this.createFromProps({
            ...this.introspect(),
            max: maxValue,
            maxValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Clear `max()` call.
     */
    public clearMax(): NumberSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.max;
        return this.createFromProps({
            ...schema
        }) as any;
    }
}

/**
 * Creates a number schema restricted to `equals` value.
 * @param equals string value
 */
export function number<T extends number>(
    equals: T
): NumberSchemaBuilder<T, true>;

/**
 * Creates a number schema.
 */
export function number(): NumberSchemaBuilder<number, true>;

/**
 * Creates a number schema.
 */
export function number(equals?: number) {
    if (typeof equals === 'number') {
        return NumberSchemaBuilder.create({
            isRequired: true,
            equalsTo: equals
        });
    }
    return NumberSchemaBuilder.create({
        isRequired: true
    });
}
