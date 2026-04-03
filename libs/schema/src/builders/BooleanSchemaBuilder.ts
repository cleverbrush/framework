import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
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
 * const result = schema.validate(true);
 * // result.valid === true
 * // result.object === true
 * ```
 * @example ```ts
 * const schema = boolean().equals(false);
 * const result = schema.validate(true);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be equal to 'false''
 * ```
 * @example ```ts
 * const schema = boolean().equals(true).optional();
 * const result = schema.validate(undefined);
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
    TExtensions = {},
    TFinalResult = TExplicitType extends undefined ? TResult : TExplicitType
> extends SchemaBuilder<TFinalResult, TRequired, TExtensions> {
    #equalsTo?: boolean;
    #defaultEqualsToErrorMessageProvider: ValidationErrorMessageProvider<
        BooleanSchemaBuilder<TResult, TRequired>
    > = function (this: BooleanSchemaBuilder) {
        return `is expected to be equal ${this.#equalsTo}`;
    };
    #equalsToErrorMessageProvider: ValidationErrorMessageProvider<
        BooleanSchemaBuilder<TResult, TRequired>
    > = this.#defaultEqualsToErrorMessageProvider;

    /**
     * @hidden
     */
    public static create(props: BooleanSchemaBuilderCreateProps<any>) {
        return new BooleanSchemaBuilder({
            type: 'boolean',
            ...props
        });
    }

    protected constructor(props: BooleanSchemaBuilderCreateProps<TRequired>) {
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

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): BooleanSchemaBuilder<TResult, true, T, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): BooleanSchemaBuilder<
        TResult,
        TRequired,
        undefined,
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
        if (typeof objToValidate !== 'boolean') {
            return { message: 'expected to be boolean' };
        }

        if (
            typeof this.#equalsTo !== 'undefined' &&
            objToValidate !== this.#equalsTo
        ) {
            return { provider: this.#equalsToErrorMessageProvider };
        }

        return null;
    }

    #buildResult(
        superResult: ReturnType<BooleanSchemaBuilder['preValidateSync']>
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

    /**
     * Performs synchronous validation of the schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        // Fast path: no preprocessors or custom validators
        if (this.canSkipPreValidation) {
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue() as typeof object;
                } else if (!this.isRequired) {
                    return { valid: true, object: object };
                } else {
                    return {
                        valid: false,
                        errors: [
                            {
                                message: this.getValidationErrorMessageSync(
                                    this.requiredErrorMessage,
                                    object as TFinalResult
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
                            object as unknown as TFinalResult
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
                        r.objToValidate as TFinalResult
                    )
                }
            ]
        };
    }

    /**
     * Performs async validation of the schema over `object`.
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
                        r.objToValidate as TFinalResult
                    )
                }
            ]
        };
    }

    protected createFromProps<TReq extends boolean>(
        props: BooleanSchemaBuilderCreateProps<TReq>
    ): this {
        return BooleanSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): BooleanSchemaBuilder<TResult, true, TExplicitType, TExtensions> &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): BooleanSchemaBuilder<
        TResult,
        false,
        TExplicitType,
        TExtensions
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TFinalResult | (() => TFinalResult)
    ): BooleanSchemaBuilder<TResult, true, TExplicitType, TExtensions> &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): BooleanSchemaBuilder<
        TResult,
        TRequired,
        TFinalResult & { readonly [K in BRAND]: TBrand },
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
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
        } as any) as any as BooleanSchemaBuilder<
            T,
            TRequired,
            TExplicitType,
            TExtensions
        > &
            TExtensions;
    }

    /**
     * Removes a `value` defined by `equals()` call.
     */
    public clearEquals(): BooleanSchemaBuilder<
        boolean,
        TRequired,
        TExplicitType,
        TExtensions
    > &
        TExtensions {
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
