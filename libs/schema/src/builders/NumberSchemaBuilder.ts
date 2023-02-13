import {
    Preprocessor,
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
    Validator
} from './SchemaBuilder.js';

type NumberSchemaBuilderCreateProps<
    T = number,
    R extends boolean = true
> = Partial<ReturnType<NumberSchemaBuilder<T, R>['introspect']>>;

export class NumberSchemaBuilder<
    TResult = number,
    TRequired extends boolean = true
> extends SchemaBuilder<TResult, TRequired> {
    #min?: number;
    #max?: number;
    #equalsTo?: number;
    #ensureNotNaN = true;
    #ensureIsFinite = true;
    #isInteger = true;

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

        if (typeof props.max === 'number') {
            this.#max = props.max;
        }

        if (typeof props.ensureNotNaN === 'boolean') {
            this.#ensureNotNaN = props.ensureNotNaN;
        }

        if (typeof props.ensureIsFinite === 'boolean') {
            this.#ensureIsFinite = props.ensureIsFinite;
        }

        if (typeof props.isInteger === 'boolean') {
            this.#isInteger = props.isInteger;
        }

        if (
            typeof props.equalsTo === 'number' ||
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
             * Make sure that object is not `NaN`. `true` by default.
             */
            ensureNotNaN: this.#ensureNotNaN,
            /**
             * Make sure that object is not different kinds of `infinity`. `true` by default.
             */
            ensureIsFinite: this.#ensureIsFinite,
            /**
             * If set, restrict object to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,
            /**
             * Allow only integer values (floating point values will be rejected
             * as invalid)
             */
            isInteger: this.#isInteger,
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

    public hasType<T>(notUsed?: T): NumberSchemaBuilder<T, true> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

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
            object: objToValidate,
            context: prevalidationContext
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return superResult;
        }

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
                        message: `is expected to be equal to ${this.#equalsTo}`,
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
                        message: 'is not expected to be NaN',
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
                        message: 'is expected to be a finite number',
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
                        message: `is expected to be integer`,
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
                            message: `expected to be no more than ${this.#max}`,
                            path: path as string
                        }
                    ]
                };
        }

        return {
            valid: true,
            object: objToValidate as TResult
        };
    }

    protected createFromProps<T, TReq extends boolean>(
        props: NumberSchemaBuilderCreateProps<T, TReq>
    ): this {
        return NumberSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts object to be equal to `value`.
     */
    public equals<T extends number, R = NumberSchemaBuilder<T, TRequired>>(
        value: T
    ): R {
        if (typeof value !== 'number') throw new Error('number expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value
        }) as any;
    }

    /**
     * Removes a `value` defeined by `equals()` call.
     */
    public clearEquals(): NumberSchemaBuilder<number, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    /**
     * Floating point number will be considered as valid after this call.
     */
    public isFloat(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: false
        }) as any;
    }

    /**
     * Only integer values will be considered as valid after this call.
     */
    public isInteger(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            isInteger: true
        }) as any;
    }

    public required(): NumberSchemaBuilder<TResult, true> {
        return super.required();
    }

    public optional(): NumberSchemaBuilder<TResult, false> {
        return super.optional();
    }

    /**
     * Do not accept NaN value
     */
    public notNaN(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: true
        });
    }

    /**
     * Consider NaN value as valid
     */
    public canBeNaN(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureNotNaN: false
        });
    }

    /**
     * Do not accept `Infinity`.
     */
    public isFinite(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: true
        });
    }

    /**
     * Consider `Infinity` as valid value.
     */
    public canBeInfinite(): NumberSchemaBuilder<TResult, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            ensureIsFinite: false
        });
    }

    /**
     * Set minimal valid value for schema.
     */
    public min(minValue: number): NumberSchemaBuilder<TResult, TRequired> {
        if (typeof minValue !== 'number')
            throw new Error('minValue must be a number');
        return this.createFromProps({
            ...this.introspect(),
            min: minValue
        }) as any;
    }

    /**
     * Clear minimal valid value for schema.
     */
    public clearMin(): NumberSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.min;
        return this.createFromProps({
            ...schema
        }) as any;
    }

    /**
     * Set maximal valid value for schema.
     */
    public max(maxValue: number): NumberSchemaBuilder<TResult, TRequired> {
        if (typeof maxValue !== 'number')
            throw new Error('maxValue must be a number');
        return this.createFromProps({
            ...this.introspect(),
            max: maxValue
        }) as any;
    }

    /**
     * Clear maximal valid value for schema.
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
 * Creates a number schema.
 */
export const number = () =>
    NumberSchemaBuilder.create({
        isRequired: true
    });
