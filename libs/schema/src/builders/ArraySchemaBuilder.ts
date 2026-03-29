import type {
    ObjectSchemaBuilder,
    ObjectSchemaValidationResult
} from './ObjectSchemaBuilder.js';
import {
    createHybridErrorArray,
    type InferType,
    type NestedValidationResult,
    type PropertyDescriptor,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

import type {
    UnionSchemaBuilder,
    UnionSchemaValidationResult
} from './UnionSchemaBuilder.js';

/**
 * Maps an element schema type to the appropriate validation result type.
 * Union schema elements get `UnionSchemaValidationResult`,
 * Object schema elements get `ObjectSchemaValidationResult`,
 * other types get `ValidationResult`.
 */
export type ElementValidationResult<
    TElementSchema extends SchemaBuilder<any, any, any>
> =
    TElementSchema extends UnionSchemaBuilder<
        infer UOptions extends readonly SchemaBuilder<any, any, any>[],
        any,
        any
    >
        ? UnionSchemaValidationResult<InferType<TElementSchema>, UOptions>
        : TElementSchema extends ObjectSchemaBuilder<any, any, any, any>
          ? ObjectSchemaValidationResult<
                InferType<TElementSchema>,
                TElementSchema
            >
          : ValidationResult<InferType<TElementSchema>>;

/**
 * Validation result type returned by `ArraySchemaBuilder.validate()`.
 * Extends `ValidationResult` with `getNestedErrors` for root-level array
 * errors and per-element validation results.
 */
export type ArraySchemaValidationResult<
    TResult,
    TElementSchema extends SchemaBuilder<any, any, any>
> = ValidationResult<TResult> & {
    /**
     * Returns root-level array validation errors combined with
     * per-element validation results.
     * The returned value has both `NestedValidationResult` properties
     * (`errors`, `isValid`, `descriptor`, `seenValue`) and indexed
     * element results (`[0]`, `[1]`, etc.).
     */
    getNestedErrors(): Array<ElementValidationResult<TElementSchema>> &
        NestedValidationResult<any, any, any>;
};

type ArraySchemaBuilderCreateProps<
    TElementSchema extends SchemaBuilder<any, any, any>,
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
    TElementSchema extends SchemaBuilder<any, any, any>,
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TResult = TExplicitType extends undefined
        ? TElementSchema extends undefined
            ? Array<any>
            : TElementSchema extends SchemaBuilder<infer T1, infer T2>
              ? Array<InferType<SchemaBuilder<T1, T2>>>
              : never
        : TExplicitType,
    TExtensions = {}
> extends SchemaBuilder<TResult, TRequired, TExtensions> {
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

    protected constructor(
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
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): ArraySchemaBuilder<TElementSchema, true, T, undefined, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        undefined,
        undefined,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Performs validation of the schema over `object`. Basically runs
     * validators, preprocessors and checks for required (if schema is not optional).
     * @param context Optional `ValidationContext` settings.
     */
    public async validate(
        object: TResult,
        context?: ValidationContext
    ): Promise<ArraySchemaValidationResult<TResult, TElementSchema>> {
        const superResult = await super.preValidate(object, context);

        const {
            valid,
            context: prevalidationContext,
            errors,
            transaction: preValidationTransaction
        } = superResult;
        const { path } = prevalidationContext;

        // Self-referencing property descriptor for the array root
        const selfDescriptor: PropertyDescriptor<any, any, any> = {
            [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
                setValue: () => false,
                getValue: (obj: any) => ({
                    success: true,
                    value: obj
                }),
                getSchema: () => this,
                parent: undefined
            }
        };

        const rootErrors: string[] = [];

        const elementResults = createHybridErrorArray(
            [] as any[],
            () => object,
            () => rootErrors,
            () => selfDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
        );

        const getNestedErrors = (() => elementResults) as any;

        if (!valid) {
            rootErrors.push(
                ...(errors || []).map((e: any) => e.message || String(e))
            );
            return {
                valid,
                errors,
                getNestedErrors
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
                object: objToValidate,
                getNestedErrors
            };
        }

        if (!Array.isArray(objToValidate)) {
            rootErrors.push('array expected');
            return {
                valid: false,
                errors: [{ message: 'array expected', path: path as string }],
                getNestedErrors
            };
        }

        if (
            typeof this.#maxLength === 'number' &&
            objToValidate.length > this.#maxLength
        ) {
            const msg = await this.getValidationErrorMessage(
                this.#maxLengthErrorMessageProvider,
                objToValidate as TResult
            );
            rootErrors.push(msg);
            return {
                valid: false,
                errors: [
                    {
                        message: msg,
                        path: path as string
                    }
                ],
                getNestedErrors
            };
        }

        if (
            typeof this.#minLength === 'number' &&
            objToValidate.length < this.#minLength
        ) {
            const msg = await this.getValidationErrorMessage(
                this.#minLengthErrorMessageProvider,
                objToValidate as TResult
            );
            rootErrors.push(msg);
            return {
                valid: false,
                errors: [
                    {
                        message: msg,
                        path: path as string
                    }
                ],
                getNestedErrors
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
                    elementResults[i] = results[i] as any;
                }

                return Object.assign(
                    {
                        valid,
                        getNestedErrors
                    },
                    valid
                        ? {}
                        : {
                              errors: results
                                  .map((r) => r?.errors)
                                  .filter((r) => r)
                                  .flatMap((e) =>
                                      e?.map((r, index) => ({
                                          ...r,
                                          path: `${r.path}[${index}]`
                                      }))
                                  ) as any
                          },
                    valid
                        ? {
                              object: results.map((r) => r?.object)
                          }
                        : {}
                ) as any;
            } else {
                for (let i = 0; i < objToValidate.length; i++) {
                    const result = await this.#elementSchema.validate(
                        objToValidate[i],
                        {
                            ...prevalidationContext,
                            path: `${path}[${i}]`
                        }
                    );
                    elementResults[i] = result as any;
                    if (result.valid) {
                        objToValidate[i] = result.object;
                    } else {
                        return {
                            valid: false,
                            errors:
                                Array.isArray(result.errors) &&
                                result.errors.length > 0
                                    ? [result.errors[0]]
                                    : [],
                            getNestedErrors
                        };
                    }
                }
            }
        }

        return {
            valid: true,
            object: objToValidate as TResult,
            getNestedErrors
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
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): ArraySchemaBuilder<
        TElementSchema,
        true,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): ArraySchemaBuilder<
        TElementSchema,
        false,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
    public of<TSchema extends SchemaBuilder<any, any, any>>(
        schema: TSchema
    ): ArraySchemaBuilder<
        TSchema,
        TRequired,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
        return ArraySchemaBuilder.create({
            ...this.introspect(),
            elementSchema: schema
        } as any) as any;
    }

    /**
     * Clears the element schema set by `of()`. After this call,
     * array items of any type will be accepted.
     */
    public clearOf(): ArraySchemaBuilder<
        any,
        TRequired,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
    ): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
    ): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
        TExplicitType,
        undefined,
        TExtensions
    > &
        TExtensions {
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
export const array = <TElementSchema extends SchemaBuilder<any, any, any>>(
    elementSchema?: TElementSchema
) =>
    ArraySchemaBuilder.create({
        isRequired: true,
        elementSchema
    }) as unknown as ArraySchemaBuilder<TElementSchema, true>;
