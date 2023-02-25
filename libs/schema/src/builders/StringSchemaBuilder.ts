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
 * String schema builder class. Allows to create String schemas.
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

    public hasType<T>(notUsed?: T): StringSchemaBuilder<T, true> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

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
            object: objToValidate,
            context: prevalidationContext,
            errors
        } = superResult;

        const { path } = prevalidationContext;

        if (!valid) {
            return {
                valid,
                errors
            };
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
     * Removes a `value` defeined by `equals()` call.
     */
    public clearEquals(): StringSchemaBuilder<string, TRequired> {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        }) as any;
    }

    public required(): StringSchemaBuilder<TResult, true> {
        return super.required();
    }

    public optional(): StringSchemaBuilder<TResult, false> {
        return super.optional();
    }

    /**
     * Set minimal length of the valid value for schema.
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
     * Clear minimal length of the valid value for schema.
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
     * Clear maximal length of the valid value for schema.
     */
    public clearMaxLength(): StringSchemaBuilder<TResult, TRequired> {
        const schema = this.introspect();
        delete schema.maxLength;
        return this.createFromProps({
            ...schema
        }) as any;
    }
}

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
