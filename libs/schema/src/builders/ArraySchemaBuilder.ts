import type {
    ObjectSchemaBuilder,
    ObjectSchemaValidationResult
} from './ObjectSchemaBuilder.js';
import {
    type BRAND,
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
    THasDefault extends boolean = false,
    TExtensions = {},
    TResult = TExplicitType extends undefined
        ? TElementSchema extends undefined
            ? Array<any>
            : TElementSchema extends SchemaBuilder<infer T1, infer T2>
              ? Array<InferType<SchemaBuilder<T1, T2>>>
              : never
        : TExplicitType
> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
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
    ): ArraySchemaBuilder<TElementSchema, true, T, THasDefault, TExtensions> & TExtensions {
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
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    #createValidationSetup(
        object: TResult,
        superResult: ReturnType<ArraySchemaBuilder<any, any>['preValidateSync']>
    ) {
        const {
            valid,
            context: prevalidationContext,
            errors,
            transaction: preValidationTransaction
        } = superResult;

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
                needsElementValidation: false as const,
                result: {
                    valid,
                    errors,
                    getNestedErrors
                } as ArraySchemaValidationResult<TResult, TElementSchema>
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
                needsElementValidation: false as const,
                result: {
                    valid: true,
                    object: objToValidate,
                    getNestedErrors
                } as ArraySchemaValidationResult<TResult, TElementSchema>
            };
        }

        if (!Array.isArray(objToValidate)) {
            rootErrors.push('array expected');
            return {
                needsElementValidation: false as const,
                result: {
                    valid: false,
                    errors: [{ message: 'array expected' }],
                    getNestedErrors
                } as ArraySchemaValidationResult<TResult, TElementSchema>
            };
        }

        return {
            needsElementValidation: true as const,
            objToValidate,
            prevalidationContext,
            getNestedErrors,
            elementResults,
            rootErrors
        };
    }

    #getLengthViolation(objToValidate: any[]): { provider: any } | null {
        if (
            typeof this.#maxLength === 'number' &&
            objToValidate.length > this.#maxLength
        ) {
            return { provider: this.#maxLengthErrorMessageProvider };
        }

        if (
            typeof this.#minLength === 'number' &&
            objToValidate.length < this.#minLength
        ) {
            return { provider: this.#minLengthErrorMessageProvider };
        }

        return null;
    }

    #assembleDoNotStopResults(
        results: any[],
        elementResults: any,
        getNestedErrors: any
    ) {
        let allValid = true;

        for (let i = 0; i < results.length; i++) {
            if (!results[i]?.valid) {
                allValid = false;
            }
            elementResults[i] = results[i] as any;
        }

        return Object.assign(
            {
                valid: allValid,
                getNestedErrors
            },
            allValid
                ? {}
                : {
                      errors: results
                          .map(r => r?.errors)
                          .filter(r => r)
                          .flatMap(e =>
                              e?.map((r: any) => ({
                                  ...r
                              }))
                          ) as any
                  },
            allValid
                ? {
                      object: results.map(r => r?.object)
                  }
                : {}
        ) as any;
    }

    /**
     * Performs synchronous validation of the schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): ArraySchemaValidationResult<TResult, TElementSchema> {
        // Fast path: no preprocessors/validators, default error mode, has element schema
        if (
            this.canSkipPreValidation &&
            !context?.doNotStopOnFirstError &&
            this.#elementSchema instanceof SchemaBuilder
        ) {
            // Required / optional check
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (!this.isRequired) {
                    const self = this;
                    return {
                        valid: true,
                        object: object,
                        getNestedErrors() {
                            return self
                                .#validateArrayFull(object, context)
                                .getNestedErrors();
                        }
                    } as any;
                } else {
                    return this.#validateArrayFull(object, context);
                }
            }

            if (!Array.isArray(object)) {
                return this.#validateArrayFull(object, context);
            }

            // Length constraints
            if (this.#getLengthViolation(object as any)) {
                return this.#validateArrayFull(object, context);
            }

            // Validate elements inline — no path passed to children
            const len = (object as any).length;
            if (len > 0) {
                const resultArray = new Array(len);
                for (let i = 0; i < len; i++) {
                    const result = this.#elementSchema.validate(
                        (object as any)[i]
                    );
                    if (!result.valid) {
                        const self = this;
                        return {
                            valid: false,
                            errors:
                                result.errors && result.errors.length > 0
                                    ? [result.errors[0]]
                                    : [],
                            getNestedErrors() {
                                return self
                                    .#validateArrayFull(object, context)
                                    .getNestedErrors();
                            }
                        } as any;
                    }
                    resultArray[i] = result.object;
                }

                // Lazy getNestedErrors
                const self = this;
                return {
                    valid: true,
                    object: resultArray as TResult,
                    getNestedErrors() {
                        return self
                            .#validateArrayFull(object, context)
                            .getNestedErrors();
                    }
                } as any;
            }

            const self = this;
            return {
                valid: true,
                object: object as TResult,
                getNestedErrors() {
                    return self
                        .#validateArrayFull(object, context)
                        .getNestedErrors();
                }
            } as any;
        }

        return this.#validateArrayFull(object, context);
    }

    /**
     * Full validation path with complete setup, error handling, and nested error support.
     */
    #validateArrayFull(
        object: TResult,
        context?: ValidationContext
    ): ArraySchemaValidationResult<TResult, TElementSchema> {
        const setup = this.#createValidationSetup(
            object,
            this.preValidateSync(object, context)
        );

        if (!setup.needsElementValidation) return setup.result;

        const {
            objToValidate,
            prevalidationContext,
            getNestedErrors,
            elementResults,
            rootErrors
        } = setup;

        const lengthViolation = this.#getLengthViolation(objToValidate);
        if (lengthViolation) {
            const msg = this.getValidationErrorMessageSync(
                lengthViolation.provider,
                objToValidate as TResult
            );
            rootErrors.push(msg);
            return {
                valid: false,
                errors: [{ message: msg }],
                getNestedErrors
            };
        }

        if (
            objToValidate.length > 0 &&
            this.#elementSchema instanceof SchemaBuilder
        ) {
            if (prevalidationContext.doNotStopOnFirstError) {
                const results: any[] = [];

                for (let i = 0; i < objToValidate.length; i++) {
                    results.push(
                        this.#elementSchema.validate(objToValidate[i], {
                            ...prevalidationContext
                        })
                    );
                }

                return this.#assembleDoNotStopResults(
                    results,
                    elementResults,
                    getNestedErrors
                );
            } else {
                const resultArray = new Array(objToValidate.length);
                for (let i = 0; i < objToValidate.length; i++) {
                    const result = this.#elementSchema.validate(
                        objToValidate[i],
                        {
                            ...prevalidationContext
                        }
                    );
                    elementResults[i] = result as any;
                    if (result.valid) {
                        resultArray[i] = result.object;
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

                return {
                    valid: true,
                    object: resultArray as TResult,
                    getNestedErrors
                };
            }
        }

        return {
            valid: true,
            object: objToValidate as TResult,
            getNestedErrors
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
    ): Promise<ArraySchemaValidationResult<TResult, TElementSchema>> {
        const setup = this.#createValidationSetup(
            object,
            await super.preValidateAsync(object, context)
        );

        if (!setup.needsElementValidation) return setup.result;

        const {
            objToValidate,
            prevalidationContext,
            getNestedErrors,
            elementResults,
            rootErrors
        } = setup;

        const lengthViolation = this.#getLengthViolation(objToValidate);
        if (lengthViolation) {
            const msg = await this.getValidationErrorMessage(
                lengthViolation.provider,
                objToValidate as TResult
            );
            rootErrors.push(msg);
            return {
                valid: false,
                errors: [{ message: msg }],
                getNestedErrors
            };
        }

        if (
            objToValidate.length > 0 &&
            this.#elementSchema instanceof SchemaBuilder
        ) {
            if (prevalidationContext.doNotStopOnFirstError) {
                const results = await Promise.all(
                    objToValidate.map(o =>
                        this.#elementSchema?.validateAsync(
                            o,
                            prevalidationContext
                        )
                    )
                );

                return this.#assembleDoNotStopResults(
                    results,
                    elementResults,
                    getNestedErrors
                );
            } else {
                const resultArray = new Array(objToValidate.length);
                for (let i = 0; i < objToValidate.length; i++) {
                    const result = await this.#elementSchema.validateAsync(
                        objToValidate[i],
                        {
                            ...prevalidationContext
                        }
                    );
                    elementResults[i] = result as any;
                    if (result.valid) {
                        resultArray[i] = result.object;
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

                return {
                    valid: true,
                    object: resultArray as TResult,
                    getNestedErrors
                };
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
        THasDefault,
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
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): ArraySchemaBuilder<
        TElementSchema,
        true,
        TExplicitType,
        true,
        TExtensions
    > &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TExplicitType,
        false,
        TExtensions
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): ArraySchemaBuilder<
        TElementSchema,
        TRequired,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
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
    ): ArraySchemaBuilder<TSchema, TRequired, TExplicitType, THasDefault, TExtensions> &
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
        THasDefault,
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
        THasDefault,
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
        THasDefault,
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
        THasDefault,
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
        THasDefault,
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
