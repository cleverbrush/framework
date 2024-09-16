import { transaction } from '../utils/transaction.js';
import {
    Preprocessor,
    SchemaBuilder,
    ValidationContext,
    ValidationErrorMessageProvider,
    ValidationResult,
    Validator
} from './SchemaBuilder.js';

type DateSchemaBuilderCreateProps<T = Date, R extends boolean = true> = Partial<
    ReturnType<DateSchemaBuilder<T, R>['introspect']>
>;

const parseFromJsonPreprocessor = (value) => {
    if (typeof value === 'undefined') return value;
    if (typeof value === 'string') {
        const time = Date.parse(value);
        if (Number.isNaN(time)) return value;
        return new Date(time);
    }
    return value;
};

const parseFromEpochPreprocessor = (value) => {
    if (typeof value === 'undefined') return value;
    if (typeof value === 'number') {
        const time = new Date(value);
        if (Number.isNaN(time.getTime())) return value;
        return time;
    }
    return value;
};

/**
 * Allows to create Date schema. It can be required or optional.
 * It can be restricted to be: equal to a certain value, in future, in past, in a certain range.
 * Supports parsing from JSON string and UNIX epoch (using preprocessors).
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link date | date()} function instead.
 *
 * @example ```ts
 * const date = new Date(2020, 0, 2);
 * const schema = date().min(new Date(2020, 0, 1));
 * const result = await schema.validate(date);
 * // result.valid === true
 * // result.object === date
 * ```
 *
 * @example ```ts
 * const schema = date();
 * const result = await schema.validate('2020-01-01');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be a date'
 * ```
 *
 * @example ```ts
 * const schema = date().parseFromJson();
 * const result = await schema.validate('2020-01-01T00:00:00.000Z');
 * // result.valid === true
 * // result.object is equal to corresponding Date object
 * ```
 *
 * @example ```ts
 * const schema = date().parseFromEpoch();
 * const result = await schema.validate(1577836800000);
 * // result.valid === true
 * // result.object is equal to corresponding Date object
 * ```
 *
 * @see {@link date}
 */
export class DateSchemaBuilder<
    TResult = Date,
    TRequired extends boolean = true
> extends SchemaBuilder<TResult, TRequired> {
    #min?: Date;
    #defaultMinErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = function (this: DateSchemaBuilder) {
        return `is expected to be after ${this.#min} (${this.#min?.getTime()})`;
    };
    #minErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = this.#defaultMinErrorMessageProvider;

    #max?: Date;
    #defaultMaxErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = function (this: DateSchemaBuilder) {
        return `is expected to be before ${this.#max} (${this.#max?.getTime()})`;
    };
    #maxErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = this.#defaultMaxErrorMessageProvider;

    #equalsTo?: Date;
    #defaultEqualsToErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = function (this: DateSchemaBuilder) {
        return `is expected to be equal ${this.#equalsTo} (${this.#equalsTo?.getTime()})`;
    };
    #equalsToErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = this.#defaultEqualsToErrorMessageProvider;

    #ensureIsInFuture = false;
    #defaultEnsureIsInFutureErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = function (this: DateSchemaBuilder) {
        return 'is expected to be in future';
    };
    #ensureIsInFutureErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = this.#defaultEnsureIsInFutureErrorMessageProvider;

    #ensureIsInPast = false;
    #defaultEnsureIsInPastErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = function (this: DateSchemaBuilder) {
        return 'is expected to be in past';
    };
    #ensureIsInPastErrorMessageProvider: ValidationErrorMessageProvider<
        DateSchemaBuilder<TResult, TRequired>
    > = this.#defaultEnsureIsInPastErrorMessageProvider;

    #parseFromJson = false;
    #parseFromEpoch = false;

    public static create(props: DateSchemaBuilderCreateProps) {
        return new DateSchemaBuilder({
            type: 'date',
            ...props
        });
    }

    private constructor(props: DateSchemaBuilderCreateProps) {
        super(props as any);

        if (props.min instanceof Date) {
            this.#min = props.min;
        }

        this.#minErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.minValidationErrorMessageProvider,
                this.#defaultMinErrorMessageProvider
            );

        if (props.max instanceof Date) {
            this.#max = props.max;
        }

        this.#maxErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.maxValidationErrorMessageProvider,
                this.#defaultMaxErrorMessageProvider
            );

        if (typeof props.ensureIsInFuture === 'boolean') {
            this.#ensureIsInFuture = props.ensureIsInFuture;
        }

        this.#ensureIsInFutureErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.ensureIsInFutureValidationErrorMessageProvider,
                this.#defaultEnsureIsInFutureErrorMessageProvider
            );

        if (typeof props.ensureIsInPast === 'boolean') {
            this.#ensureIsInPast = props.ensureIsInPast;
        }

        this.#ensureIsInPastErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.ensureIsInPastValidationErrorMessageProvider,
                this.#defaultEnsureIsInPastErrorMessageProvider
            );

        if (typeof props.parseFromJson === 'boolean') {
            this.#parseFromJson = props.parseFromJson;
        }

        if (typeof props.parseFromEpoch === 'boolean') {
            this.#parseFromEpoch = props.parseFromEpoch;
        }

        if (
            props.equalsTo instanceof Date ||
            typeof props.equalsTo === 'undefined'
        ) {
            this.#equalsTo = props.equalsTo;
        }

        this.#equalsToErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.equalsToValidationErrorMessageProvider,
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
             * Min value validation error message provider.
             * If not provided, default error message will be used.
             */
            minValidationErrorMessageProvider: this.#minErrorMessageProvider,

            /**
             * Max valid value (if defined).
             */
            max: this.#max,

            /**
             * Max value validation error message provider.
             * If not provided, default error message will be used.
             */
            maxValidationErrorMessageProvider: this.#maxErrorMessageProvider,

            /**
             * Make sure that date is in future. `false` by default.
             */
            ensureIsInFuture: this.#ensureIsInFuture,

            /**
             * Ensure in future validation error message provider.
             * If not provided, default error message will be used.
             */
            ensureIsInFutureValidationErrorMessageProvider:
                this.#ensureIsInFutureErrorMessageProvider,

            /**
             * Make sure that date is in past. `false` by default.
             */
            ensureIsInPast: this.#ensureIsInPast,

            /**
             * Ensure in past validation error message provider.
             * If not provided, default error message will be used.
             */
            ensureIsInPastValidationErrorMessageProvider:
                this.#ensureIsInPastErrorMessageProvider,

            /**
             * If set, restrict date to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,

            /**
             * Equals to validation error message provider.
             * If not provided, default error message will be used.
             */
            equalsToValidationErrorMessageProvider:
                this.#equalsToErrorMessageProvider,

            /**
             * If set, schema will try to parse date from the UNIX epoch (number).
             * `false` by default.
             */
            parseFromEpoch: this.#parseFromEpoch,
            /**
             * If set, schema will try to parse date from JSON string.
             * `false` by default.
             */
            parseFromJson: this.#parseFromJson,
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
    public hasType<T>(notUsed?: T): DateSchemaBuilder<T, true> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): DateSchemaBuilder<Date, TRequired> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of Date schema over `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await super.preValidate(object, context);

        const { valid, context: prevalidationContext, errors } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return {
                valid,
                errors
            };
        }

        let { transaction: preValidationTransaction } = superResult;

        let {
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

        if (this.#parseFromJson) {
            preValidationTransaction = transaction({
                validatedObject: parseFromJsonPreprocessor(objToValidate)
            });
            objToValidate = preValidationTransaction.object.validatedObject;
        }

        if (this.#parseFromEpoch) {
            preValidationTransaction = transaction({
                validatedObject: parseFromEpochPreprocessor(objToValidate)
            });
            objToValidate = preValidationTransaction.object.validatedObject;
        }

        if (!(objToValidate instanceof Date))
            return {
                valid: false,
                errors: [
                    {
                        message: `expected instance of Date, but saw ${typeof objToValidate}`,
                        path: path as string
                    }
                ]
            };

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate.getTime() !== this.#equalsTo.getTime()
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

        if (this.#ensureIsInFuture && objToValidate <= new Date()) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#ensureIsInFutureErrorMessageProvider,
                            objToValidate as TResult
                        ),
                        path: path as string
                    }
                ]
            };
        }

        if (this.#ensureIsInPast && objToValidate >= new Date()) {
            return {
                valid: false,
                errors: [
                    {
                        message: await this.getValidationErrorMessage(
                            this.#ensureIsInPastErrorMessageProvider,
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
            object: preValidationTransaction!.commit()
                .validatedObject as TResult
        };
    }

    /**
     * @hidden
     */
    protected createFromProps<T, TReq extends boolean>(
        props: DateSchemaBuilderCreateProps<T, TReq>
    ): this {
        return DateSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts Date to be equal to `value`.
     */
    public equals<T extends Date>(
        value: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            DateSchemaBuilder<TResult, TRequired>
        >
    ): DateSchemaBuilder<T, TRequired> {
        if (!(value instanceof Date)) throw new Error('Date expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value,
            equalsToValidationErrorMessageProvider: errorMessage
        }) as any as DateSchemaBuilder<T, TRequired>;
    }

    /**
     * Clears `equals()` call.
     */
    public clearEquals(): DateSchemaBuilder<Date, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * @hidden
     */
    public required(): DateSchemaBuilder<TResult, true> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): DateSchemaBuilder<TResult, false> {
        return super.optional();
    }

    /**
     * Accept only dates in the future.
     */
    public isInFuture(
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            DateSchemaBuilder<TResult, TRequired>
        >
    ): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInFuture: true,
            ensureIsInFutureValidationErrorMessageProvider: errorMessage
        });
    }

    /**
     * Cancel `isInFuture()` call.
     */
    public clearIsInFuture(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInFuture: false
        });
    }

    /**
     * Accept only dates in the past.
     */
    public isInPast(
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            DateSchemaBuilder<TResult, TRequired>
        >
    ): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInPast: true,
            ensureIsInPastValidationErrorMessageProvider: errorMessage
        });
    }

    /**
     * Cancel `isInPast()` call.
     */
    public clearIsInPast(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInPast: false
        });
    }

    /**
     * Set minimal valid Date value for schema.
     */
    public min(
        minValue: Date,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            DateSchemaBuilder<TResult, TRequired>
        >
    ): DateSchemaBuilder<TResult, TRequired> {
        if (!(minValue instanceof Date))
            throw new Error('minValue must be a Date');
        return this.createFromProps({
            ...this.introspect(),
            min: minValue,
            minValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Clear `min()` call.
     */
    public clearMin(): DateSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.min;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Set maximal valid Date value for schema.
     */
    public max(
        maxValue: Date,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            DateSchemaBuilder<TResult, TRequired>
        >
    ): DateSchemaBuilder<TResult, TRequired> {
        if (!(maxValue instanceof Date))
            throw new Error('maxValue must be a Date');
        return this.createFromProps({
            ...this.introspect(),
            max: maxValue,
            maxValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /**
     * Clear `max()` call.
     */
    public clearMax(): DateSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.max;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Accepts JSON string as a valid Date.
     * String must be in ISO format and will be parsed using `JSON.parse()`.
     */
    public acceptJsonString(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            parseFromJson: true
        });
    }

    /**
     * Cancel `acceptJsonString()` call.
     */
    public doNotAcceptJsonString(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            parseFromJson: false
        });
    }

    /**
     * Accepts epoch number as a valid Date.
     * Epoch number will be parsed using `new Date(epoch)`.
     */
    public acceptEpoch(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            parseFromEpoch: true
        });
    }

    /**
     * Cancel `acceptEpoch()` call.
     */
    public doNotAcceptEpoch(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            parseFromEpoch: false
        });
    }
}

/**
 * Creates a Date schema.
 */
export const date = () =>
    DateSchemaBuilder.create({
        isRequired: true
    });
