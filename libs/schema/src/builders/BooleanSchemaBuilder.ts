import {
    SchemaBuilder,
    ValidationContext,
    ValidationErrorMessageProvider,
    ValidationResult
} from './SchemaBuilder.js';

type BooleanSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<BooleanSchemaBuilder<R>['introspect']>
>;

/**
 * Similar to `boolean` type in TypeScript.
 * Allows to define a schema for a boolean value. It can be required or optional.
 * It can be restricted to be equal to a certain value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link boolean | boolean()} function instead.
 *
 * @example ```ts
 * const schema = boolean().equals(true);
 * const result = await schema.validate(true);
 * // result.valid === true
 * // result.object === true
 * ```
 * @example ```ts
 * const schema = boolean().equals(false);
 * const result = await schema.validate(true);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be equal to 'false''
 * ```
 * @example ```ts
 * const schema = boolean().equals(true).optional();
 * const result = await schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @see {@link boolean}
 */
export class BooleanSchemaBuilder<
    TResult = boolean,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TFinalResult = TExplicitType extends undefined ? TResult : TExplicitType
> extends SchemaBuilder<TFinalResult, TRequired> {
    #equalsTo?: boolean;
    #defaultEqualsToErrorMessageProvider: ValidationErrorMessageProvider<
        BooleanSchemaBuilder<TResult, TRequired>
    > = function (this: BooleanSchemaBuilder) {
        return `is expected to be equal ${this.#equalsTo}`;
    };
    #equalsToErrorMessageProvider: ValidationErrorMessageProvider<
        BooleanSchemaBuilder<TResult, TRequired>
    > = this.#defaultEqualsToErrorMessageProvider;

    public static create(props: BooleanSchemaBuilderCreateProps<any>) {
        return new BooleanSchemaBuilder({
            type: 'boolean',
            ...props
        });
    }

    private constructor(props: BooleanSchemaBuilderCreateProps<TRequired>) {
        super(props as any);

        if (
            typeof props.equalsTo === 'boolean' ||
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
             * If set, restrict object to be equal to a certain value.
             */
            equalsTo: this.#equalsTo,
            /**
             * Equals to validation error message provider.
             * If not provided, default error message will be used.
             */
            equalsToValidationErrorMessageProvider:
                this.#equalsToErrorMessageProvider
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): BooleanSchemaBuilder<TResult, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    public clearHasType(): BooleanSchemaBuilder<TResult, TRequired, undefined> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validion of the schema over `object`. Basically runs
     * validators, preprocessors and checks for required (if schema is not optional).
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
            return { valid, errors };
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

        if (typeof objToValidate !== 'boolean') {
            return {
                valid: false,
                errors: [
                    {
                        message: 'expected to be boolean',
                        path: path as string
                    }
                ]
            };
        }

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
                            objToValidate as TFinalResult
                        ),
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

    protected createFromProps<TReq extends boolean>(
        props: BooleanSchemaBuilderCreateProps<TReq>
    ): this {
        return BooleanSchemaBuilder.create(props as any) as any;
    }

    public required(): BooleanSchemaBuilder<TResult, true, TExplicitType> {
        return super.required();
    }

    public optional(): BooleanSchemaBuilder<TResult, false, TExplicitType> {
        return super.optional();
    }

    /**
     * Restricts object to be equal to `value`.
     */
    public equals<T extends boolean>(
        value: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            BooleanSchemaBuilder<TResult, TRequired>
        >
    ) {
        if (typeof value !== 'boolean') throw new Error('boolean expected');
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: value,
            equalsToValidationErrorMessageProvider: errorMessage
        } as any) as any as BooleanSchemaBuilder<T, TRequired, TExplicitType>;
    }

    /**
     * Removes a `value` defeined by `equals()` call.
     */
    public clearEquals(): BooleanSchemaBuilder<
        boolean,
        TRequired,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.introspect(),
            equalsTo: undefined
        } as any) as any;
    }
}

/**
 * Creates a `boolean` schema.
 */
export const boolean = () =>
    BooleanSchemaBuilder.create({
        isRequired: true
    }) as BooleanSchemaBuilder<boolean, true>;
