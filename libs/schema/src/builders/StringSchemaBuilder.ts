import {
    Preprocessor,
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
    Validator
} from './SchemaBuilder.js';

type StringSchemaBuilderCreateProps<
    T = string,
    R extends boolean = true
> = Partial<ReturnType<StringSchemaBuilder<T, R>['introspect']>>;

/**
 * Allows to define a schema for a string. It can be: required or optional,
 * restricted to be equal to a certain value, restricted to have a certain
 * length.
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
    #maxLength?: number;
    #equalsTo?: string;

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

        if (typeof props.maxLength === 'number') {
            this.#maxLength = props.maxLength;
        }

        if (
            typeof props.equalsTo === 'string' ||
            typeof props.equalsTo === 'undefined'
        ) {
            this.#equalsTo = props.equalsTo;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Min length of the string (if defined).
             */
            minLength: this.#minLength,
            /**
             * Max length of the string (if defined).
             */
            maxLength: this.#maxLength,
            /**
             * If set, restrict object to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,
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
                        message: `is expected to be equal to ${this.#equalsTo}`,
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
                            message: `expected to has at least ${
                                this.#minLength
                            } characters length`,
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
                            message: `must not exceed ${
                                this.#maxLength
                            } characters`,
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
        props: StringSchemaBuilderCreateProps<T, TReq>
    ): this {
        return StringSchemaBuilder.create(props as any) as any;
    }

    /**
     * Restricts object to be equal to `value`.
     */
    public equals<T extends string>(value: T) {
        if (typeof value !== 'string') throw new Error('string expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value
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
    public minLength(length: number): StringSchemaBuilder<TResult, TRequired> {
        if (typeof length !== 'number')
            throw new Error('length must be a number');
        return this.createFromProps({
            ...this.introspect(),
            minLength: length
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
    public maxLength(length: number): StringSchemaBuilder<TResult, TRequired> {
        if (typeof length !== 'number')
            throw new Error('length must be a number');
        return this.createFromProps({
            ...this.introspect(),
            maxLength: length
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
