import { transaction } from '../utils/transaction.js';
import {
    Preprocessor,
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
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
    #max?: Date;
    #equalsTo?: Date;
    #ensureIsInFuture = false;
    #ensureIsInPast = false;
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

        if (props.max instanceof Date) {
            this.#max = props.max;
        }

        if (typeof props.ensureIsInFuture === 'boolean') {
            this.#ensureIsInFuture = props.ensureIsInFuture;
        }

        if (typeof props.ensureIsInPast === 'boolean') {
            this.#ensureIsInPast = props.ensureIsInPast;
        }

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
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Min valid value (if defined).
             */
            min: this.#min,
            /**
             * Max valid value (if defined).
             */
            max: this.#max,
            /**
             * Make sure that date is in future. `false` by default.
             */
            ensureIsInFuture: this.#ensureIsInFuture,
            /**
             * Make sure that date is in past. `false` by default.
             */
            ensureIsInPast: this.#ensureIsInPast,
            /**
             * If set, restrict date to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,
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
                        message: `is expected to be equal to ${this.#equalsTo}`,
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
                        message: 'is expected to be in future',
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
                        message: 'is expected to be in past',
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
                            message: `expected to be at least ${this.#min}`,
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
                            message: `expected to be no more than or equal to ${
                                this.#max
                            }`,
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
    public equals<T extends Date>(value: T) {
        if (!(value instanceof Date)) throw new Error('Date expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value
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
    public isInFuture(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInFuture: true
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
    public isInPast(): DateSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsInPast: true
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
    public min(minValue: Date): DateSchemaBuilder<TResult, TRequired> {
        if (!(minValue instanceof Date))
            throw new Error('minValue must be a Date');
        return this.createFromProps({
            ...this.introspect(),
            min: minValue
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
    public max(maxValue: Date): DateSchemaBuilder<TResult, TRequired> {
        if (!(maxValue instanceof Date))
            throw new Error('maxValue must be a Date');
        return this.createFromProps({
            ...this.introspect(),
            max: maxValue
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
