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
 * Maps a tuple of schema builders to a tuple of their per-position
 * validation result types.
 * Union schema elements get `UnionSchemaValidationResult`,
 * object schema elements get `ObjectSchemaValidationResult`,
 * other types get `ValidationResult`.
 */
export type TupleElementValidationResults<
    TElements extends readonly SchemaBuilder<any, any, any, any, any>[]
> = {
    [K in keyof TElements]: TElements[K] extends UnionSchemaBuilder<
        infer UOptions extends readonly SchemaBuilder<
            any,
            any,
            any,
            any,
            any
        >[],
        any,
        any
    >
        ? UnionSchemaValidationResult<InferType<TElements[K]>, UOptions>
        : TElements[K] extends ObjectSchemaBuilder<any, any, any, any, any>
          ? ObjectSchemaValidationResult<InferType<TElements[K]>, TElements[K]>
          : ValidationResult<InferType<TElements[K]>>;
};

/**
 * Validation result type returned by `TupleSchemaBuilder.validate()`.
 * Extends `ValidationResult` with `getNestedErrors` for root-level tuple
 * errors and per-position validation results.
 */
export type TupleSchemaValidationResult<
    TResult,
    TElements extends readonly SchemaBuilder<any, any, any, any, any>[]
> = ValidationResult<TResult> & {
    /**
     * Returns root-level tuple validation errors combined with
     * per-position validation results.
     * The returned value has both `NestedValidationResult` properties
     * (`errors`, `isValid`, `descriptor`, `seenValue`) and indexed
     * position results (`[0]`, `[1]`, etc.).
     */
    getNestedErrors(): TupleElementValidationResults<TElements> &
        NestedValidationResult<any, any, any>;
};

type TupleSchemaBuilderCreateProps<
    TElements extends readonly SchemaBuilder<any, any, any, any, any>[],
    TRestSchema extends
        | SchemaBuilder<any, any, any, any, any>
        | undefined = undefined,
    R extends boolean = true,
    N extends boolean = false
> = Partial<
    ReturnType<
        TupleSchemaBuilder<
            TElements,
            R,
            N,
            undefined,
            false,
            {},
            TRestSchema
        >['introspect']
    >
>;

/**
 * Fixed-length array schema builder with per-position type validation.
 * Similar to TypeScript's tuple types — each element at a specific array index
 * is validated against its own schema.
 *
 * Use it when you need to validate function arguments, CSV rows, coordinate
 * pairs, structured event payloads, or any other fixed-structure array.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link tuple | tuple()} function instead.
 *
 * @example
 * ```ts
 * const schema = tuple([string(), number(), boolean()]);
 * // Inferred TypeScript type: [string, number, boolean]
 *
 * schema.validate(['hello', 42, true]);
 * // result.valid === true
 * // result.object === ['hello', 42, true]
 *
 * schema.validate(['hello', 42]);
 * // result.valid === false  (too few elements)
 *
 * schema.validate(['hello', 'oops', true]);
 * // result.valid === false  (wrong type at position 1)
 * ```
 *
 * @example
 * ```ts
 * // Tuple with variadic rest elements
 * const schema = tuple([string(), number()]).rest(boolean());
 * // Inferred TypeScript type: [string, number, ...boolean[]]
 *
 * schema.validate(['hello', 42, true, false]);
 * // result.valid === true — any number of extra booleans allowed
 * ```
 *
 * @example
 * ```ts
 * // Nested tuple combining with object schemas
 * const point = tuple([number(), number()]);
 * const segment = tuple([point, point]);
 *
 * segment.validate([[0, 0], [10, 20]]);
 * // result.valid === true
 * ```
 *
 * @see {@link tuple}
 */
export class TupleSchemaBuilder<
    TElements extends readonly SchemaBuilder<any, any, any, any, any>[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TRestSchema extends
        | SchemaBuilder<any, any, any, any, any>
        | undefined = undefined,
    TResult = TExplicitType extends undefined
        ? TRestSchema extends SchemaBuilder<any, any, any, any, any>
            ? [
                  ...{ [K in keyof TElements]: InferType<TElements[K]> },
                  ...Array<InferType<TRestSchema>>
              ]
            : { [K in keyof TElements]: InferType<TElements[K]> }
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #elements!: TElements;
    #restSchema:
        | (TRestSchema & SchemaBuilder<any, any, any, any, any>)
        | undefined;

    /**
     * @hidden
     */
    public static create(
        props: TupleSchemaBuilderCreateProps<any, any, any, any>
    ) {
        return new TupleSchemaBuilder({
            type: 'tuple',
            ...props
        } as any);
    }

    protected constructor(
        props: TupleSchemaBuilderCreateProps<
            TElements,
            TRestSchema,
            TRequired,
            TNullable
        >
    ) {
        super(props as any);

        if (Array.isArray(props.elements)) {
            this.#elements = props.elements as TElements;
        } else {
            this.#elements = [] as unknown as TElements;
        }

        if (props.restSchema instanceof SchemaBuilder) {
            this.#restSchema = props.restSchema as any;
        }
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): TupleSchemaBuilder<
        TElements,
        true,
        TNullable,
        T,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): TupleSchemaBuilder<
        TElements,
        TRequired,
        TNullable,
        undefined,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    #getLengthError(arr: any[]): string | null {
        if (arr.length < this.#elements.length) {
            const n = this.#elements.length;
            return `expected a tuple with at least ${n} element${n === 1 ? '' : 's'}, got ${arr.length}`;
        }
        if (
            !(this.#restSchema instanceof SchemaBuilder) &&
            arr.length !== this.#elements.length
        ) {
            const n = this.#elements.length;
            return `expected a tuple of exactly ${n} element${n === 1 ? '' : 's'}, got ${arr.length}`;
        }
        return null;
    }

    #createValidationSetup(
        object: TResult,
        superResult: ReturnType<TupleSchemaBuilder<any, any>['preValidateSync']>
    ) {
        const {
            valid,
            context: prevalidationContext,
            errors,
            transaction: preValidationTransaction
        } = superResult;

        const selfDescriptor: PropertyDescriptor<any, any, any> = {
            [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
                setValue: () => false,
                getValue: (obj: any) => ({
                    success: true,
                    value: obj
                }),
                getSchema: () => this,
                parent: undefined,
                propertyName: undefined,
                toJsonPointer: () => ''
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
                } as TupleSchemaValidationResult<TResult, TElements>
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' && !this.isRequired) ||
            (objToValidate === null && (!this.isRequired || this.isNullable))
        ) {
            return {
                needsElementValidation: false as const,
                result: {
                    valid: true,
                    object: objToValidate,
                    getNestedErrors
                } as TupleSchemaValidationResult<TResult, TElements>
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
                } as TupleSchemaValidationResult<TResult, TElements>
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
     * Performs synchronous validation of the schema over `object`. {@inheritDoc SchemaBuilder.validate}
     */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): TupleSchemaValidationResult<TResult, TElements> {
        return super.validate(object, context) as TupleSchemaValidationResult<
            TResult,
            TElements
        >;
    }

    /**
     * Performs asynchronous validation of the schema over `object`. {@inheritDoc SchemaBuilder.validateAsync}
     */
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<TupleSchemaValidationResult<TResult, TElements>> {
        return super.validateAsync(object, context) as Promise<
            TupleSchemaValidationResult<TResult, TElements>
        >;
    }

    /**
     * Performs synchronous validation of the schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    protected _validate(
        object: TResult,
        context?: ValidationContext
    ): TupleSchemaValidationResult<TResult, TElements> {
        // Fast path: no preprocessors/validators, stop-on-first-error mode
        if (this.canSkipPreValidation && !context?.doNotStopOnFirstError) {
            // Handle undefined / null
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (
                    !this.isRequired ||
                    (object === null && this.isNullable)
                ) {
                    const self = this;
                    return {
                        valid: true,
                        object,
                        getNestedErrors() {
                            return self
                                .#validateTupleFull(object, context)
                                .getNestedErrors();
                        }
                    } as any;
                } else {
                    return this.#validateTupleFull(object, context);
                }
            }

            if (!Array.isArray(object)) {
                return this.#validateTupleFull(object, context);
            }

            const lengthError = this.#getLengthError(object as any[]);
            if (lengthError) {
                const self = this;
                return {
                    valid: false,
                    errors: [{ message: lengthError }],
                    getNestedErrors() {
                        return self
                            .#validateTupleFull(object, context)
                            .getNestedErrors();
                    }
                } as any;
            }

            const resultArray = new Array((object as any[]).length);

            for (let i = 0; i < this.#elements.length; i++) {
                const result = this.#elements[i].validate((object as any)[i]);
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
                                .#validateTupleFull(object, context)
                                .getNestedErrors();
                        }
                    } as any;
                }
                resultArray[i] = result.object;
            }

            if (this.#restSchema instanceof SchemaBuilder) {
                for (
                    let i = this.#elements.length;
                    i < (object as any[]).length;
                    i++
                ) {
                    const result = this.#restSchema.validate(
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
                                    .#validateTupleFull(object, context)
                                    .getNestedErrors();
                            }
                        } as any;
                    }
                    resultArray[i] = result.object;
                }
            }

            const self = this;
            return {
                valid: true,
                object: resultArray as TResult,
                getNestedErrors() {
                    return self
                        .#validateTupleFull(object, context)
                        .getNestedErrors();
                }
            } as any;
        }

        return this.#validateTupleFull(object, context);
    }

    /**
     * Full validation path with complete setup, error handling, and nested
     * error support.
     */
    #validateTupleFull(
        object: TResult,
        context?: ValidationContext
    ): TupleSchemaValidationResult<TResult, TElements> {
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

        const lengthError = this.#getLengthError(objToValidate);
        if (lengthError) {
            rootErrors.push(lengthError);
            return {
                valid: false,
                errors: [{ message: lengthError }],
                getNestedErrors
            };
        }

        const totalLength =
            this.#restSchema instanceof SchemaBuilder
                ? objToValidate.length
                : this.#elements.length;

        if (prevalidationContext.doNotStopOnFirstError) {
            const results: any[] = new Array(totalLength);

            for (let i = 0; i < this.#elements.length; i++) {
                results[i] = this.#elements[i].validate(objToValidate[i], {
                    ...prevalidationContext
                });
            }

            if (this.#restSchema instanceof SchemaBuilder) {
                for (
                    let i = this.#elements.length;
                    i < objToValidate.length;
                    i++
                ) {
                    results[i] = this.#restSchema.validate(objToValidate[i], {
                        ...prevalidationContext
                    });
                }
            }

            return this.#assembleDoNotStopResults(
                results,
                elementResults,
                getNestedErrors
            );
        } else {
            const resultArray = new Array(totalLength);

            for (let i = 0; i < this.#elements.length; i++) {
                const result = this.#elements[i].validate(objToValidate[i], {
                    ...prevalidationContext
                });
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

            if (this.#restSchema instanceof SchemaBuilder) {
                for (
                    let i = this.#elements.length;
                    i < objToValidate.length;
                    i++
                ) {
                    const result = this.#restSchema.validate(objToValidate[i], {
                        ...prevalidationContext
                    });
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
            }

            return {
                valid: true,
                object: resultArray as TResult,
                getNestedErrors
            };
        }
    }

    /**
     * Performs async validation of the schema over `object`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional `ValidationContext` settings.
     */
    protected async _validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<TupleSchemaValidationResult<TResult, TElements>> {
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

        const lengthError = this.#getLengthError(objToValidate);
        if (lengthError) {
            rootErrors.push(lengthError);
            return {
                valid: false,
                errors: [{ message: lengthError }],
                getNestedErrors
            };
        }

        const totalLength =
            this.#restSchema instanceof SchemaBuilder
                ? objToValidate.length
                : this.#elements.length;

        if (prevalidationContext.doNotStopOnFirstError) {
            const promises: Promise<any>[] = new Array(totalLength);

            for (let i = 0; i < this.#elements.length; i++) {
                promises[i] = this.#elements[i].validateAsync(
                    objToValidate[i],
                    { ...prevalidationContext }
                );
            }

            if (this.#restSchema instanceof SchemaBuilder) {
                for (
                    let i = this.#elements.length;
                    i < objToValidate.length;
                    i++
                ) {
                    promises[i] = this.#restSchema.validateAsync(
                        objToValidate[i],
                        { ...prevalidationContext }
                    );
                }
            }

            const results = await Promise.all(promises);
            return this.#assembleDoNotStopResults(
                results,
                elementResults,
                getNestedErrors
            );
        } else {
            const resultArray = new Array(totalLength);

            for (let i = 0; i < this.#elements.length; i++) {
                const result = await this.#elements[i].validateAsync(
                    objToValidate[i],
                    { ...prevalidationContext }
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

            if (this.#restSchema instanceof SchemaBuilder) {
                for (
                    let i = this.#elements.length;
                    i < objToValidate.length;
                    i++
                ) {
                    const result = await this.#restSchema.validateAsync(
                        objToValidate[i],
                        { ...prevalidationContext }
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
            }

            return {
                valid: true,
                object: resultArray as TResult,
                getNestedErrors
            };
        }
    }

    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(
        props: TupleSchemaBuilderCreateProps<TElements, TRestSchema, TReq>
    ): this {
        return TupleSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): TupleSchemaBuilder<
        TElements,
        true,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): TupleSchemaBuilder<
        TElements,
        false,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): TupleSchemaBuilder<
        TElements,
        true,
        TNullable,
        TExplicitType,
        true,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): TupleSchemaBuilder<
        TElements,
        TRequired,
        TNullable,
        TExplicitType,
        false,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): TupleSchemaBuilder<
        TElements,
        TRequired,
        TNullable,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.brand(_name);
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Per-position element schemas defining the fixed tuple structure.
             */
            elements: this.#elements,
            /**
             * Optional schema for elements beyond the fixed positions.
             * When set, additional elements are validated against this schema.
             * Mirrors TypeScript's rest element syntax: `[string, number, ...boolean[]]`.
             */
            restSchema: this.#restSchema
        };
    }

    /**
     * Sets a schema that all elements beyond the fixed positions must satisfy.
     * Mirrors TypeScript's variadic tuple tail: `[string, number, ...boolean[]]`.
     *
     * When set, the tuple length must be at least equal to the number of fixed
     * elements, and any additional elements are validated against `schema`.
     * When not set, the tuple length must be exactly equal to the fixed count.
     *
     * @param schema Schema that extra array elements must satisfy.
     *
     * @example
     * ```ts
     * const schema = tuple([string(), number()]).rest(boolean());
     * // Inferred TypeScript type: [string, number, ...boolean[]]
     *
     * schema.validate(['hello', 42]);               // valid
     * schema.validate(['hello', 42, true]);          // valid
     * schema.validate(['hello', 42, true, false]);   // valid
     * schema.validate(['hello', 42, 'extra']);       // invalid — 'extra' not boolean
     * ```
     */
    public rest<TSchema extends SchemaBuilder<any, any, any, any, any>>(
        schema: TSchema
    ): TupleSchemaBuilder<
        TElements,
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TSchema
    > &
        TExtensions {
        return TupleSchemaBuilder.create({
            ...this.introspect(),
            restSchema: schema
        } as any) as any;
    }

    /**
     * Removes the rest schema set by `rest()`. After this call, the tuple
     * length must be exactly equal to the number of fixed element schemas.
     */
    public clearRest(): TupleSchemaBuilder<
        TElements,
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        undefined
    > &
        TExtensions {
        return TupleSchemaBuilder.create({
            ...this.introspect(),
            restSchema: undefined
        } as any) as any;
    }

    /**
     * @hidden
     */
    public nullable(): TupleSchemaBuilder<
        TElements,
        TRequired,
        true,
        TExplicitType,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * @hidden
     */
    public notNullable(): TupleSchemaBuilder<
        TElements,
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions,
        TRestSchema
    > &
        TExtensions {
        return super.notNullable() as any;
    }
}

/**
 * Creates a fixed-length array schema (tuple) where each element at a
 * specific index is validated against its own schema.
 *
 * @param elements Array of per-position schemas. The length of this array
 *   determines the required tuple length (unless `.rest()` is used).
 *
 * @example
 * ```ts
 * import { tuple, string, number, boolean } from '@cleverbrush/schema';
 *
 * const schema = tuple([string(), number(), boolean()]);
 * // Inferred TypeScript type: [string, number, boolean]
 *
 * schema.validate(['hello', 42, true]);     // valid
 * schema.validate(['hello', 42]);           // invalid — too few elements
 * schema.validate(['hello', 'oops', true]); // invalid — wrong type at [1]
 * ```
 *
 * @example
 * ```ts
 * // 2-D coordinate pair
 * const point = tuple([number(), number()]);
 * const result = point.validate([10.5, 20.3]);
 * // result.valid === true
 * // result.object === [10.5, 20.3]
 * ```
 *
 * @example
 * ```ts
 * // Optional tuple with default value
 * const schema = tuple([string(), number()])
 *     .optional()
 *     .default(() => ['', 0]);
 * ```
 */
export const tuple = <
    const TElements extends readonly SchemaBuilder<any, any, any, any, any>[]
>(
    elements: [...TElements]
) =>
    TupleSchemaBuilder.create({
        isRequired: true,
        elements
    }) as unknown as TupleSchemaBuilder<TElements, true>;
