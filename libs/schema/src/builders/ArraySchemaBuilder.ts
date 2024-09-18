import {
    SchemaBuilder,
    ValidationContext,
    ValidationErrorMessageProvider,
    ValidationResult,
    InferType
} from './SchemaBuilder.js';

type ArraySchemaBuilderCreateProps<
    TElementSchema extends SchemaBuilder<any, any>,
    R extends boolean = true
> = Partial<ReturnType<ArraySchemaBuilder<TElementSchema, R>['introspect']>>;

/**
 * Similar to the `Array` type in TypeScript. It can be used to validate arrays of any type.
 * It can also be used to validate arrays of specific type.
 * For example, if you want to validate an array of numbers,
 * you can use `array(number())` to create a schema builder.
 * If you want to validate an array of users, you can use
 * `array().of(object({ name: string(), age: number() }))` to create a schema builder.
 * If you want to validate an array of numbers or strings,
 * you can use `array(union(number()).or(string()))`.
 *
 * Also you can limit the length of the array by using `minLength`
 * and `maxLength` methods.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link array | array()} function instead.
 * @see {@link array}
 */
export class ArraySchemaBuilder<
    TElementSchema extends SchemaBuilder<any, any>,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined
        ? TElementSchema extends undefined
            ? Array<any>
            : TElementSchema extends SchemaBuilder<infer T1, infer T2>
              ? Array<InferType<SchemaBuilder<T1, T2>>>
              : never
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    #minLength?: number;
    #defaultMinLengthErrorMessageProvider: ValidationErrorMessageProvider<
        ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
    > = function (this: ArraySchemaBuilder<any, any, any>) {
        return `is expected to have no less than ${this.#minLength} elements`;
    };
    #minLengthErrorMessageProvider: ValidationErrorMessageProvider<
        ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
    > = this.#defaultMinLengthErrorMessageProvider;

    #maxLength?: number;
    #defaultMaxLengthErrorMessageProvider: ValidationErrorMessageProvider<
        ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
    > = function (this: ArraySchemaBuilder<any, any, any>) {
        return `is expected to have no more than ${this.#maxLength} elements`;
    };
    #maxLengthErrorMessageProvider: ValidationErrorMessageProvider<
        ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
    > = this.#defaultMaxLengthErrorMessageProvider;

    #elementSchema?: TElementSchema;

    /**
     * @hidden
     */
    public static create(props: ArraySchemaBuilderCreateProps<any, any>) {
        return new ArraySchemaBuilder({
            type: 'array',
            ...props
        } as any);
    }

    private constructor(
        props: ArraySchemaBuilderCreateProps<TElementSchema, TRequired>
    ) {
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

        if (props.elementSchema instanceof SchemaBuilder) {
            this.#elementSchema = props.elementSchema;
        }
    }

    /**
     * @hidden
     */
    public hasType<T>(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        notUsed?: T
    ): ArraySchemaBuilder<TElementSchema, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        undefined
    > {
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
            errors,
            transaction: preValidationTransaction
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

        if (!Array.isArray(objToValidate)) {
            return {
                valid: false,
                errors: [{ message: 'array expected', path: path as string }]
            };
        }

        if (
            typeof this.#maxLength === 'number' &&
            objToValidate.length > this.#maxLength
        ) {
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

        if (
            typeof this.#minLength === 'number' &&
            objToValidate.length < this.#minLength
        ) {
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

        if (
            objToValidate.length > 0 &&
            this.#elementSchema instanceof SchemaBuilder
        ) {
            if (prevalidationContext.doNotStopOnFirstError) {
                const results = await Promise.all(
                    objToValidate.map((o) =>
                        this.#elementSchema?.validate(o, prevalidationContext)
                    )
                );

                let valid = true;

                for (let i = 0; i < results.length; i++) {
                    if (!results[i]?.valid) {
                        valid = false;
                    }
                }

                return Object.assign(
                    {
                        valid
                    },
                    valid
                        ? {}
                        : {
                              errors: results
                                  .map((r) => r?.errors)
                                  .filter((r) => r)
                                  .map((e) =>
                                      e?.map((r, index) => ({
                                          ...r,
                                          path: `${r.path}[${index}]`
                                      }))
                                  )
                                  .flat() as any
                          },
                    valid
                        ? {
                              object: results.map((r) => r?.object)
                          }
                        : {}
                ) as any;
            } else {
                for (let i = 0; i < objToValidate.length; i++) {
                    const {
                        valid,
                        errors,
                        object: validatedItem
                    } = await this.#elementSchema.validate(objToValidate[i], {
                        ...prevalidationContext,
                        path: `${path}[${i}]`
                    });
                    if (valid) {
                        objToValidate[i] = validatedItem;
                    } else {
                        return {
                            valid: false,
                            errors:
                                Array.isArray(errors) && errors.length > 0
                                    ? [errors[0]]
                                    : []
                        };
                    }
                }
            }
        }

        return {
            valid: true,
            object: objToValidate as TResult
        };
    }

    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(
        props: ArraySchemaBuilderCreateProps<TElementSchema, TReq>
    ): this {
        return ArraySchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(): ArraySchemaBuilder<TElementSchema, true, TExplicitType> {
        return super.required();
    }

    /**
     * @hidden
     */
    public optional(): ArraySchemaBuilder<
        TElementSchema,
        false,
        TExplicitType
    > {
        return super.optional();
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Schema of array item (if defined)
             */
            elementSchema: this.#elementSchema,
            /**
             * Min length of a valid array
             */
            minLength: this.#minLength,

            /**
             * Min length validation error message provider.
             * If not provided, default error message provider is used.
             */
            minLengthValidationErrorMessageProvider:
                this.#minLengthErrorMessageProvider,

            /**
             * Max length of a valid array
             */
            maxLength: this.#maxLength,

            /**
             * Max length validation error message provider.
             * If not provided, default error message provider is used.
             */
            maxLengthValidationErrorMessageProvider:
                this.#maxLengthErrorMessageProvider
        };
    }

    /**
     * Set a schema that every array item has to satisfy. If it is not set,
     * Item of any type is allowed.
     * @param schema Schema that every array item has to satisfy
     */
    public of<TSchema extends SchemaBuilder<any, any>>(
        schema: TSchema
    ): ArraySchemaBuilder<TSchema, TRequired, TExplicitType> {
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            elementSchema: schema
        } as any) as any;
    }

    public clearOf(): ArraySchemaBuilder<any, TRequired, TExplicitType> {
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            elementSchema: undefined
        } as any) as any;
    }

    /**
     * Set minimal length of the valid array value for schema.
     */
    public minLength<T extends number>(
        length: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
        >
    ): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType> {
        if (typeof length !== 'number' || length < 0)
            throw new Error('length is expected to be a number which is >= 0');
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            minLength: length,
            minLengthValidationErrorMessageProvider: errorMessage
        } as any) as any;
    }

    /**
     * Clear minimal length of the valid array value for schema.
     */
    public clearMinLength(): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TExplicitType
    > {
        const schema = this.introspect();
        delete schema.minLength;
        return this.createFromProps({
            ...schema
        } as any) as any;
    }

    /**
     * Set max length of the valid array value for schema.
     */
    public maxLength<T extends number>(
        length: T,
        /**
         * Custom error message provider.
         */
        errorMessage?: ValidationErrorMessageProvider<
            ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>
        >
    ): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType> {
        if (typeof length !== 'number' || length < 0)
            throw new Error('length is expected to be a number which is >= 0');
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            maxLength: length,
            maxLengthValidationErrorMessageProvider: errorMessage
        } as any) as any;
    }

    /**
     * Clear max length of the valid array value for schema.
     */
    public clearMaxLength(): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TExplicitType
    > {
        const schema = this.introspect();
        delete schema.maxLength;
        return this.createFromProps({
            ...schema
        } as any) as any;
    }
}

/**
 * Creates a `Array` schema.
 *
 * @example
 * ```typescript
 *  const schema = array().minLength(2).maxLength(5).of(string());
 *  // [] - invalid
 *  // ['a', 'b'] - valid
 *  // ['a', 'b', 'c', 'd', 'e', 'f'] - invalid
 *  // ['a', 'b', 'c', 'd', 'e'] - valid
 *  // ['a', 'b', 'c', 'd', 1] - invalid
 *  // ['a', 'b', null] - invalid
 *  // null - invalid
 *  // undefined - invalid
 * ```
 */
export const array = <TElementSchema extends SchemaBuilder<any, any>>(
    elementSchema?: TElementSchema
) =>
    ArraySchemaBuilder.create({
        isRequired: true,
        elementSchema
    }) as ArraySchemaBuilder<TElementSchema, true>;
