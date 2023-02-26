import {
    SchemaBuilder,
    ValidationResult,
    ValidationContext,
    InferType
} from './SchemaBuilder.js';

type ArraySchemaBuilderCreateProps<
    TItemSchema extends SchemaBuilder<any, any>,
    R extends boolean = true
> = Partial<ReturnType<ArraySchemaBuilder<TItemSchema, R>['introspect']>>;

/**
 * Array schema builder class.
 */
export class ArraySchemaBuilder<
    TItemSchema extends SchemaBuilder<any, any>,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined
        ? TItemSchema extends undefined
            ? Array<any>
            : TItemSchema extends SchemaBuilder<infer T1, infer T2>
            ? Array<InferType<SchemaBuilder<T1, T2>>>
            : never
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired> {
    #minLength?: number;
    #maxLength?: number;
    #itemSchema?: TItemSchema;

    public static create(props: ArraySchemaBuilderCreateProps<any, any>) {
        return new ArraySchemaBuilder({
            type: 'array',
            ...props
        } as any);
    }

    private constructor(
        props: ArraySchemaBuilderCreateProps<TItemSchema, TRequired>
    ) {
        super(props as any);

        if (typeof props.minLength === 'number') {
            this.#minLength = props.minLength;
        }

        if (typeof props.maxLength === 'number') {
            this.#maxLength = props.maxLength;
        }

        if (props.itemSchema instanceof SchemaBuilder) {
            this.#itemSchema = props.itemSchema;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public hasType<T>(notUsed?: T): ArraySchemaBuilder<TItemSchema, true, T> {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    public clearHasType(): ArraySchemaBuilder<
        TItemSchema,
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
                        message: `cannot contain more than ${
                            this.#maxLength
                        } elements`,
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
                        message: `cannot contain less than ${
                            this.#minLength
                        } elements`,
                        path: path as string
                    }
                ]
            };
        }

        if (
            objToValidate.length > 0 &&
            this.#itemSchema instanceof SchemaBuilder
        ) {
            if (prevalidationContext.doNotStopOnFirstError) {
                const results = await Promise.all(
                    objToValidate.map((o) =>
                        this.#itemSchema?.validate(o, prevalidationContext)
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
                    } = await this.#itemSchema.validate(objToValidate[i], {
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

    protected createFromProps<TReq extends boolean>(
        props: ArraySchemaBuilderCreateProps<TItemSchema, TReq>
    ): this {
        return ArraySchemaBuilder.create(props as any) as any;
    }

    public required(): ArraySchemaBuilder<TItemSchema, true, TExplicitType> {
        return super.required();
    }

    public optional(): ArraySchemaBuilder<TItemSchema, false, TExplicitType> {
        return super.optional();
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Schema of array item (if defined)
             */
            itemSchema: this.#itemSchema,
            /**
             * Min length of a valid array
             */
            minLength: this.#minLength,
            /**
             * Max length of a valid array
             */
            maxLength: this.#maxLength
        };
    }

    public setItemSchema<TSchema extends SchemaBuilder<any, any>>(
        schema: TSchema
    ): ArraySchemaBuilder<TSchema, TRequired, TExplicitType> {
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            itemSchema: schema
        } as any) as any;
    }

    public clearItemSchema(): ArraySchemaBuilder<
        any,
        TRequired,
        TExplicitType
    > {
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            itemSchema: undefined
        } as any) as any;
    }

    /**
     * Set minimal length of the valid array value for schema.
     */
    public minLength<T extends number>(
        length: T
    ): ArraySchemaBuilder<TItemSchema, TRequired, TExplicitType> {
        if (typeof length !== 'number' || length < 0)
            throw new Error('length is expected to be a number which is >= 0');
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            minLength: length
        } as any) as any;
    }

    /**
     * Clear minimal length of the valid array value for schema.
     */
    public clearMinLength(): ArraySchemaBuilder<
        TItemSchema,
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
        length: T
    ): ArraySchemaBuilder<TItemSchema, TRequired, TExplicitType> {
        if (typeof length !== 'number' || length < 0)
            throw new Error('length is expected to be a number which is >= 0');
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            maxLength: length
        } as any) as any;
    }

    /**
     * Clear max length of the valid array value for schema.
     */
    public clearMaxLength(): ArraySchemaBuilder<
        TItemSchema,
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
 */
export const array = () =>
    ArraySchemaBuilder.create({
        isRequired: true
    }) as ArraySchemaBuilder<any, true>;
