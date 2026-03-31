import {
    type BRAND,
    type Preprocessor,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult,
    type Validator
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
 * const result = schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * ```
 * @example ```ts
 * const schema = number();
 * const result = schema.validate('42');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be a number'
 * ```
 * @example ```ts
 * const schema = number().min(0).max(100);
 * const result = schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * ```
 *
 * @example ```ts
 * const schema = number().min(0).max(100);
 * const result = schema.validate(142.5);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be less than or equal to 100'
 * ```
 *
 * @see {@link number}
 */
export class NumberSchemaBuilder<
    TResult = number,
    TRequired extends boolean = true,
    TExtensions = {}
> extends SchemaBuilder<TResult, TRequired, TExtensions> {
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

    /**
     * @hidden
     */
    public static create(props: NumberSchemaBuilderCreateProps) {
        return new NumberSchemaBuilder({
            type: 'number',
            ...props
        });
    }

    protected constructor(props: NumberSchemaBuilderCreateProps) {
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
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): NumberSchemaBuilder<T, true, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): NumberSchemaBuilder<number, TRequired, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    #getConstraintViolation(
        objToValidate: any
    ): { message: string } | { provider: any } | null {
        if (typeof objToValidate !== 'number') {
            return {
                message: `expected type number, but saw ${typeof objToValidate}`
            };
        }

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate !== this.#equalsTo
        ) {
            return { provider: this.#equalsToErrorMessageProvider };
        }

        if (this.#ensureNotNaN && Number.isNaN(objToValidate)) {
            return { provider: this.#ensureNotNaNErrorMessageProvider };
        }

        if (
            this.#ensureIsFinite &&
            !Number.isFinite(objToValidate) &&
            this.#ensureNotNaN &&
            !Number.isNaN(objToValidate)
        ) {
            return { provider: this.#ensureIsFiniteErrorMessageProvider };
        }

        if (
            this.#isInteger &&
            !Number.isNaN(objToValidate) &&
            Number.isFinite(objToValidate) &&
            !Number.isInteger(objToValidate)
        ) {
            return { provider: this.#ensureIsIntegerErrorMessageProvider };
        }

        if (typeof this.#min !== 'undefined') {
            if (objToValidate < this.#min)
                return { provider: this.#minErrorMessageProvider };
        }

        if (typeof this.#max !== 'undefined') {
            if (objToValidate > this.#max)
                return { provider: this.#maxErrorMessageProvider };
        }

        return null;
    }

    #buildResult(
        superResult: ReturnType<NumberSchemaBuilder['preValidateSync']>
    ):
        | { done: true; result: ValidationResult<TResult> }
        | {
              done: false;
              provider: any;
              objToValidate: any;
              path: string;
          } {
        const {
            valid,
            context: prevalidationContext,
            transaction: preValidationTransaction,
            errors
        } = superResult;

        const { path } = prevalidationContext;

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
                result: {
                    valid: true,
                    object: preValidationTransaction!.commit().validatedObject
                }
            };
        }

        if ('message' in violation) {
            return {
                done: true,
                result: {
                    valid: false,
                    errors: [
                        { message: violation.message, path: path as string }
                    ]
                }
            };
        }

        return {
            done: false,
            provider: violation.provider,
            objToValidate,
            path: path as string
        };
    }

    /**
     * Performs synchronous validation of number schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        const r = this.#buildResult(this.preValidateSync(object, context));
        if (r.done) return r.result;
        return {
            valid: false,
            errors: [
                {
                    message: this.getValidationErrorMessageSync(
                        r.provider,
                        r.objToValidate as TResult
                    ),
                    path: r.path
                }
            ]
        };
    }

    /**
     * Performs async validation of number schema over `object`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional `ValidationContext` settings.
     */
    public async validateAsync(
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
                    ),
                    path: r.path
                }
            ]
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
        }) as any as NumberSchemaBuilder<T, TRequired, TExtensions> &
            TExtensions;
    }

    /**
     * Clear `equals()` call.
     */
    public clearEquals(): NumberSchemaBuilder<number, TRequired, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * @deprecated Use {@link clearIsInteger} instead.
     * Float values will be considered as valid after this call.
     */
    public isFloat(): NumberSchemaBuilder<TResult, TRequired, TExtensions> &
        TExtensions {
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
    public clearIsInteger(): NumberSchemaBuilder<
        TResult,
        TRequired,
        TExtensions
    > &
        TExtensions {
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
    ): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: true,
            ensureIsIntegerErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): NumberSchemaBuilder<TResult, true, TExtensions> & TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): NumberSchemaBuilder<TResult, false, TExtensions> &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): NumberSchemaBuilder<
        TResult & { readonly [K in BRAND]: TBrand },
        TRequired,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
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
    ): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: true,
            ensureNotNaNErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Consider NaN value as valid
     */
    public canBeNaN(): NumberSchemaBuilder<TResult, TRequired, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: false,
            ensureNotNaNErrorMessageProvider:
                this.#defaultEnsureNotNaNErrorMessageProvider
        }) as any;
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
    ): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: true,
            ensureIsFiniteErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Consider `Infinity` as valid.
     */
    public canBeInfinite(): NumberSchemaBuilder<
        TResult,
        TRequired,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: false,
            ensureIsFiniteErrorMessageProvider:
                this.#defaultEnsureIsFiniteErrorMessageProvider
        }) as any;
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
    ): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions {
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
    public clearMin(): NumberSchemaBuilder<TResult, TRequired, TExtensions> &
        TExtensions {
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
    ): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions {
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
    public clearMax(): NumberSchemaBuilder<TResult, TRequired, TExtensions> &
        TExtensions {
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
