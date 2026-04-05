import { PropertyValidationResult } from './PropertyValidationResult.js';
import {
    type BRAND,
    type InferType,
    type NestedValidationResult,
    type PreValidationResult,
    type PropertyDescriptor,
    type PropertyDescriptorInner,
    type PropertyDescriptorTree,
    type PropertySetterOptions,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    type ValidationContext,
    type ValidationError,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

const MUST_BE_AN_OBJECT_ERROR_MESSSAGE = 'must be an object';

/**
 * A callback function to select properties from the schema.
 * Normally it's provided by the user to select property descriptors
 * from the schema for the further usage. e.g. to select source and destination
 * properties for object mappings
 */
export type SchemaPropertySelector<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any>,
    TPropertySchema extends SchemaBuilder<any, any, any>,
    TAssignableTo = any,
    TParentPropertyDescriptor = undefined
> = (
    l: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>
) => PropertyDescriptor<TSchema, TPropertySchema, TParentPropertyDescriptor>;

type ObjectSchemaBuilderProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = ReturnType<ObjectSchemaBuilder<T, TRequired>['introspect']>;

type ObjectSchemaBuilderCreateProps<
    T extends Record<string, SchemaBuilder> = {},
    TRequired extends boolean = true
> = Partial<ObjectSchemaBuilderProps<T, TRequired>>;

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type RespectPropsOptionality<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = {
    [K in RequiredProps<T>]: InferType<T[K]>;
} & {
    [K in NotRequiredProps<T>]?: InferType<T[K]>;
};

type RespectPropsOptionalityForInput<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = {
    [K in RequiredInputProps<T>]: InferType<T[K]>;
} & {
    [K in NotRequiredInputProps<T>]?: InferType<T[K]>;
};

type MakeChildrenRequired<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = {
    [K in keyof T]: ReturnType<T[K]['required']>;
};

type MakeChildrenOptional<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = {
    [K in keyof T]: ReturnType<T[K]['optional']>;
};

/**
 * Recursively maps each property to its optional form, descending into
 * nested `ObjectSchemaBuilder` schemas.  All other schema types (arrays,
 * unions, primitives) are only made optional at the top level.
 */
type DeepMakeChildrenOptional<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = {
    [K in keyof T]: T[K] extends ObjectSchemaBuilder<
        // biome-ignore lint/correctness/noUnusedVariables: used in extensions
        infer P extends Record<string, SchemaBuilder<any, any, any>>,
        any,
        any,
        any,
        any
    >
        ? ReturnType<ReturnType<T[K]['deepPartial']>['optional']>
        : ReturnType<T[K]['optional']>;
};

type MakeChildOptional<
    T extends Record<any, SchemaBuilder<any, any, any>>,
    TProp extends keyof T
> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['optional']> : T[K];
};

type MakeChildRequired<
    T extends Record<any, SchemaBuilder<any, any, any>>,
    TProp extends keyof T
> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['required']> : T[K];
};

type ModifyPropSchema<
    T extends Record<any, SchemaBuilder<any, any, any>>,
    TProp extends keyof T,
    TSchema extends SchemaBuilder<any, any, any>
> = {
    [K in keyof T]: K extends TProp ? TSchema : T[K];
};

export type ObjectSchemaValidationResult<
    T,
    TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any>,
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any> = TRootSchema
> = Omit<ValidationResult<T>, 'errors'> & {
    /**
     * A flat list of validation errors.
     *
     * @deprecated Use {@link ObjectSchemaValidationResult.getErrorsFor | getErrorsFor()} instead for
     * per-property error inspection with type-safe property selectors. The `errors` array on
     * `ObjectSchemaBuilder` validation results will be removed in a future major version.
     */
    errors?: ValidationError[];
    /**
     * Returns a nested validation error for the property selected by the `selector` function.
     * This is the **recommended** way to inspect validation errors — it provides type-safe,
     * per-property error details including `isValid`, `errors`, and `seenValue`.
     *
     * Prefer this over the deprecated `errors` array.
     *
     * @param selector a callback function to select property from the schema.
     */
    getErrorsFor<TPropertySchema, TParentPropertyDescriptor>(
        selector?: (
            properties: PropertyDescriptorTree<TSchema, TRootSchema>
        ) => PropertyDescriptor<
            TRootSchema,
            TPropertySchema,
            TParentPropertyDescriptor
        >
    ): TPropertySchema extends ObjectSchemaBuilder<any, any, any, any, any>
        ? PropertyValidationResult<
              TPropertySchema,
              TRootSchema,
              TParentPropertyDescriptor
          >
        : NestedValidationResult<
              TPropertySchema,
              TRootSchema,
              TParentPropertyDescriptor
          >;
};

/**
 * Object schema builder class. Similar to the `object` type
 * in JS. Allows to define a schema for `object` value.
 * Should be used to validate objects with specific properties.
 * Properties should be defined as their own schema builders.
 * You can use any `SchemaBuilder` e.g. `string()`, `number()`,
 * `boolean()`, `array()`, `object()`, etc. to define properties.
 * Which means that you can define nested objects and arrays of
 * any complexity.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link object | object()} function instead.
 *
 * @example
 * ```ts
 * const schema = object({
 *    name: string(),
 *    age: number()
 * });
 *
 * const result = schema.validate({
 *   name: 'John',
 *   age: 30
 * });
 *
 * // result.valid === true
 * // result.object === { name: 'John', age: 30 }
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 *   name: string(),
 *   age: number().optional()
 * });
 *
 * const result = schema.validate({
 *  name: 'John'
 * });
 * // result.valid === true
 * // result.object === { name: 'John' }
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 *  name: string(),
 *  age: number();
 * });
 * const result = schema.validate({
 *  name: 'John'
 * });
 *
 * // result.valid === false
 * // result.errors is deprecated — use result.getErrorsFor() instead
 * // result.getErrorsFor((p) => p.age).errors // ["is expected to have property 'age'"]
 * ```
 *
 * @example
 * ```ts
 * const schema = object({
 * name: string(),
 * address: object({
 *     city: string(),
 *     country: string()
 *   })
 * });
 * const result = schema.validate({
 * name: 'John',
 * address: {
 *    city: 'New York',
 *    country: 'USA'
 *  }
 * });
 * // result.valid === true
 * // result.object === {
 * //   name: 'John',
 * //   address: {
 * //     city: 'New York',
 * //     country: 'USA'
 * //   }
 * // }
 * ```
 * @see {@link object}
 */
export class ObjectSchemaBuilder<
    TProperties extends Record<string, SchemaBuilder<any, any, any>> = {},
    TRequired extends boolean = true,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<
    undefined extends TExplicitType
        ? RespectPropsOptionality<TProperties>
        : TExplicitType,
    TRequired,
    THasDefault,
    TExtensions
> {
    #properties: TProperties = {} as any;
    #acceptUnknownProps = false;
    #propKeys: string[] = [];

    #propertyDescriptorTreeMap: PropertyDescriptorMap = new WeakMap() as any;

    /**
     * @hidden
     */
    public static create<
        P extends Record<string, SchemaBuilder>,
        R extends boolean
    >(props: ObjectSchemaBuilderCreateProps<P, R>) {
        return new ObjectSchemaBuilder({
            type: 'object',
            ...props
        } as any);
    }

    protected createFromProps<
        T extends Record<string, SchemaBuilder>,
        R extends boolean = true
    >(props: ObjectSchemaBuilderCreateProps<T, R>): this {
        return ObjectSchemaBuilder.create(props as any) as any;
    }

    protected constructor(props: ObjectSchemaBuilderCreateProps) {
        super(props as any);

        if (typeof props.properties === 'object' && props.properties) {
            this.#properties = props.properties as any;
            this.#propKeys = Object.keys(props.properties);
        }

        if (typeof props.acceptUnknownProps === 'boolean') {
            this.#acceptUnknownProps = props.acceptUnknownProps;
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Properties defined in schema
             */
            properties: { ...this.#properties },
            /**
             * If set to `true`, schema validation will not
             * return errors if object contains fields which
             * are not defined in the schema `properties`.
             * Set to `false` by default
             */
            acceptUnknownProps: this.#acceptUnknownProps
        };
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): ObjectSchemaBuilder<
        TProperties,
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
    public optional(): ObjectSchemaBuilder<
        TProperties,
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
        value:
            | (undefined extends TExplicitType
                  ? RespectPropsOptionality<TProperties>
                  : TExplicitType)
            | (() => undefined extends TExplicitType
                  ? RespectPropsOptionality<TProperties>
                  : TExplicitType)
    ): ObjectSchemaBuilder<
        TProperties,
        true,
        TExplicitType,
        true,
        TExtensions
    > &
        TExtensions {
        return super.default(value as any) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): ObjectSchemaBuilder<
        TProperties,
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
    ): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        (undefined extends TExplicitType
            ? RespectPropsOptionality<TProperties>
            : TExplicitType) & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * Marks the inferred type as `Readonly<T>` — all top-level properties
     * become `readonly` at the type level. Validation behaviour is unchanged.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    public readonly(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        Readonly<
            undefined extends TExplicitType
                ? RespectPropsOptionality<TProperties>
                : TExplicitType
        >,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }

    #applyPropertyDescriptors(
        result: PreValidationResult<any, { validatedObject: any }>
    ): void {
        if (
            !ObjectSchemaBuilder.isValidPropertyDescriptor(
                result?.context?.rootPropertyDescriptor as any
            )
        ) {
            (result.context.rootPropertyDescriptor as any) =
                ObjectSchemaBuilder.getPropertiesFor(this as any);
        }

        if (
            !ObjectSchemaBuilder.isValidPropertyDescriptor(
                result.context.currentPropertyDescriptor as any
            )
        ) {
            result.context.currentPropertyDescriptor =
                result.context.rootPropertyDescriptor;
        }

        if (
            !result.context.rootValidationObject &&
            result.transaction?.object?.validatedObject
        ) {
            result.context.rootValidationObject =
                result.transaction.object.validatedObject;
        }
    }

    protected preValidateSync(
        object: any,
        context?: ValidationContext<this>
    ): PreValidationResult<
        InferType<
            SchemaBuilder<
                undefined extends TExplicitType
                    ? Id<RespectPropsOptionality<TProperties>>
                    : TExplicitType,
                TRequired
            >
        >,
        { validatedObject: any }
    > {
        const result = super.preValidateSync(object, context);
        this.#applyPropertyDescriptors(result);
        return result;
    }

    protected async preValidateAsync(
        object: any,
        context?: ValidationContext<this>
    ): Promise<
        PreValidationResult<
            InferType<
                SchemaBuilder<
                    undefined extends TExplicitType
                        ? Id<RespectPropsOptionality<TProperties>>
                        : TExplicitType,
                    TRequired
                >
            >,
            { validatedObject: any }
        >
    > {
        const result = await super.preValidateAsync(object, context);
        this.#applyPropertyDescriptors(result);
        return result;
    }

    /**
     * Shared pre-property-validation setup for both `validate` and
     * `validateAsync`.  Handles destructuring the prevalidated result,
     * building the `addErrorFor` / `getErrorsFor` closures, and all early
     * returns that happen before per-property validation.
     */
    #setupValidation(
        prevalidatedResult: PreValidationResult<any, { validatedObject: any }>
    ) {
        const {
            valid,
            context: prevalidationContext,
            transaction: validationTransaction,
            errors: preValidationErrors
        } = prevalidatedResult;

        const propertyDescriptorToErrorMap = new WeakMap<
            PropertyDescriptor<any, any, any>,
            PropertyValidationResult<any, any>
        >() as any;

        const { doNotStopOnFirstError, rootValidationObject } =
            prevalidationContext;

        const rootPropertyDescriptor: PropertyDescriptor<any, any, undefined> =
            prevalidationContext.rootPropertyDescriptor as any;

        const currentPropertyDescriptor: PropertyDescriptor<any, any, unknown> =
            prevalidationContext.currentPropertyDescriptor as any;

        const addErrorFor = (
            propertyDescriptor: PropertyDescriptor<any, any, any>,
            message: string,
            parentPropertyDescriptor?: PropertyDescriptor<any, any, any>
        ) => {
            if (
                !ObjectSchemaBuilder.isValidPropertyDescriptor(
                    propertyDescriptor
                )
            ) {
                throw new Error('invalid property descriptor');
            }

            let validationError: PropertyValidationResult<any, any> =
                propertyDescriptorToErrorMap.has(propertyDescriptor)
                    ? propertyDescriptorToErrorMap.get(propertyDescriptor)
                    : (null as any);

            if (!validationError) {
                validationError = new PropertyValidationResult(
                    propertyDescriptor as any,
                    rootValidationObject
                );

                propertyDescriptorToErrorMap.set(
                    propertyDescriptor,
                    validationError
                );
            }

            validationError.addError(message);

            if (
                parentPropertyDescriptor &&
                ObjectSchemaBuilder.isValidPropertyDescriptor(
                    parentPropertyDescriptor
                )
            ) {
                let parentValidationError: PropertyValidationResult<any, any> =
                    propertyDescriptorToErrorMap.has(parentPropertyDescriptor)
                        ? propertyDescriptorToErrorMap.get(
                              parentPropertyDescriptor
                          )
                        : (null as any);

                if (!parentValidationError) {
                    parentValidationError = new PropertyValidationResult(
                        parentPropertyDescriptor as any,
                        rootValidationObject
                    );
                    propertyDescriptorToErrorMap.set(
                        parentPropertyDescriptor,
                        parentValidationError
                    );
                }

                parentValidationError.addChildError(validationError);
            }
        };

        const getErrorsFor = (<
            TPropertySchema extends SchemaBuilder<any, any, any>
        >(
            selector?: (
                properties: PropertyDescriptorTree<any>
            ) => PropertyDescriptor<any, TPropertySchema, any>
        ): PropertyValidationResult<any, any> => {
            const descriptor: PropertyDescriptor<any, any, any> =
                typeof selector === 'function'
                    ? selector(currentPropertyDescriptor as any)
                    : currentPropertyDescriptor;

            if (
                !ObjectSchemaBuilder.isValidPropertyDescriptor(
                    descriptor as any
                )
            ) {
                throw new Error('invalid property descriptor');
            }

            if (!propertyDescriptorToErrorMap.has(descriptor)) {
                propertyDescriptorToErrorMap.set(
                    descriptor,
                    new PropertyValidationResult(
                        descriptor as any,
                        rootValidationObject
                    )
                );
            }

            return propertyDescriptorToErrorMap.get(descriptor);
        }) as any;

        const errors = prevalidatedResult.errors || [];

        if (!valid && !doNotStopOnFirstError && preValidationErrors) {
            if (
                ObjectSchemaBuilder.isValidPropertyDescriptor(
                    currentPropertyDescriptor
                )
            ) {
                for (const error of preValidationErrors) {
                    addErrorFor(currentPropertyDescriptor, error.message);
                }
            }

            return {
                earlyReturn: true as const,
                result: {
                    valid,
                    errors: preValidationErrors,
                    getErrorsFor
                }
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = validationTransaction!;

        if (
            !this.isRequired &&
            (typeof objToValidate === 'undefined' || objToValidate === null)
        ) {
            return {
                earlyReturn: true as const,
                result: {
                    valid: true,
                    object: validationTransaction!.commit().validatedObject,
                    getErrorsFor
                }
            };
        }

        if (typeof objToValidate !== 'object') {
            errors.push({
                message: MUST_BE_AN_OBJECT_ERROR_MESSSAGE
            });
            addErrorFor(
                currentPropertyDescriptor,
                MUST_BE_AN_OBJECT_ERROR_MESSSAGE
            );

            if (!doNotStopOnFirstError) {
                if (validationTransaction) {
                    validationTransaction.rollback();
                }
                return {
                    earlyReturn: true as const,
                    result: {
                        valid: false,
                        errors: [errors[0]],
                        getErrorsFor
                    }
                };
            }
        }

        const propKeys = this.#propKeys;
        const objKeys = Object.keys(objToValidate as Object);

        if (propKeys.length === 0) {
            if (objKeys.length === 0) {
                if (doNotStopOnFirstError && errors.length > 0) {
                    return {
                        earlyReturn: true as const,
                        result: {
                            valid: false,
                            errors,
                            getErrorsFor
                        }
                    };
                }
                if (validationTransaction) {
                    validationTransaction.commit().validatedObject;
                }
                return {
                    earlyReturn: true as const,
                    result: {
                        valid: true,
                        object: {} as any,
                        getErrorsFor
                    }
                };
            }

            if (!this.#acceptUnknownProps) {
                for (let i = 0; i < objKeys.length; i++) {
                    const message = `unknown property '${objKeys[i]}'`;
                    errors.push({
                        message
                    });
                    if (!doNotStopOnFirstError) {
                        break;
                    }
                }
                if (validationTransaction) {
                    validationTransaction.rollback();
                }
                return {
                    earlyReturn: true as const,
                    result: {
                        valid: false,
                        errors: doNotStopOnFirstError ? errors : [errors[0]],
                        getErrorsFor
                    }
                };
            }

            if (validationTransaction) {
                validationTransaction.commit();
            }
            return {
                earlyReturn: true as const,
                result: {
                    valid: true,
                    object: { ...objToValidate } as any,
                    getErrorsFor
                }
            };
        }

        return {
            earlyReturn: false as const,
            errors,
            objToValidate,
            propKeys,
            objKeys,
            addErrorFor,
            getErrorsFor,
            doNotStopOnFirstError: !!doNotStopOnFirstError,
            rootPropertyDescriptor,
            currentPropertyDescriptor,
            validationTransaction: validationTransaction!
        };
    }

    /**
     * Shared post-property-validation processing for both `validate` and
     * `validateAsync`.  Handles unknown-property checks, error aggregation,
     * commit/rollback, and the final result construction.
     */
    #processResults(
        setup: {
            errors: any[];
            objToValidate: any;
            propKeys: string[];
            objKeys: string[];
            addErrorFor: (
                propertyDescriptor: PropertyDescriptor<any, any, any>,
                message: string,
                parentPropertyDescriptor?: PropertyDescriptor<any, any, any>
            ) => void;
            getErrorsFor: any;
            doNotStopOnFirstError: boolean;
            rootPropertyDescriptor: any;
            currentPropertyDescriptor: any;
            validationTransaction: any;
        },
        validationResults: { key: string; result: ValidationResult<any> }[]
    ): ObjectSchemaValidationResult<any, any> {
        const {
            objToValidate,
            objKeys,
            addErrorFor,
            getErrorsFor,
            doNotStopOnFirstError,
            currentPropertyDescriptor,
            validationTransaction
        } = setup;

        const errors = setup.errors;

        let hasInvalid = false;
        for (const { result } of validationResults) {
            if (!result.valid) {
                hasInvalid = true;
                if (Array.isArray(result.errors)) {
                    for (const error of result.errors) {
                        errors.push(error);
                    }
                }
            }
        }

        for (let i = 0; i < objKeys.length; i++) {
            const key = objKeys[i];
            if (!(key in this.#properties) && !this.#acceptUnknownProps) {
                const message = `unknown property '${key}'`;
                errors.push({
                    message
                });
                addErrorFor(currentPropertyDescriptor, message);
                if (!doNotStopOnFirstError) {
                    if (validationTransaction) {
                        validationTransaction.rollback();
                    }
                    return {
                        valid: false,
                        errors: [errors[0]],
                        getErrorsFor
                    };
                }
            }
        }

        if (!hasInvalid && errors.length === 0) {
            const resultObject: Record<string, any> = {};
            for (const { key, result } of validationResults) {
                resultObject[key] = result.object;
            }
            if (this.#acceptUnknownProps) {
                for (const key of objKeys) {
                    if (!(key in this.#properties)) {
                        resultObject[key] = objToValidate[key];
                    }
                }
            }
            return {
                valid: true,
                object: resultObject,
                getErrorsFor
            };
        }

        for (const { key, result } of validationResults) {
            if (!result.valid) {
                const descriptor = (currentPropertyDescriptor as any)[key];
                if (
                    typeof (result as any).getErrorsFor === 'function' &&
                    ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)
                ) {
                    ObjectSchemaBuilder.#propagateNestedErrors(
                        result as any,
                        descriptor,
                        addErrorFor
                    );
                } else if (Array.isArray(result.errors)) {
                    if (
                        ObjectSchemaBuilder.isValidPropertyDescriptor(
                            descriptor
                        )
                    ) {
                        for (const error of result.errors) {
                            addErrorFor(descriptor, error.message);
                        }
                    }
                }
            }
        }

        validationTransaction!.rollback();

        return {
            valid: false,
            errors: doNotStopOnFirstError
                ? errors
                : errors[0]
                  ? [errors[0]]
                  : [],
            getErrorsFor
        };
    }

    /**
     * Performs synchronous validation of object schema over the `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     *
     * The returned result includes a `getErrorsFor()` method for type-safe,
     * per-property error inspection.
     *
     * @param object The object to validate against this schema.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
        object: undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionalityForInput<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        context?: ValidationContext<this>
    ): ObjectSchemaValidationResult<
        undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionality<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        this
    > {
        return super.validate(object, context) as any;
    }

    /**
     * @param object The object to validate against this schema.
     * @param context Optional `ValidationContext` settings.
     */
    public async validateAsync(
        object: undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionalityForInput<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        context?: ValidationContext<this>
    ): Promise<
        ObjectSchemaValidationResult<
            undefined extends TExplicitType
                ? InferType<
                      SchemaBuilder<
                          undefined extends TExplicitType
                              ? Id<RespectPropsOptionality<TProperties>>
                              : TExplicitType,
                          TRequired
                      >
                  >
                : TExplicitType,
            this
        >
    > {
        return super.validateAsync(object, context) as any;
    }

    /**
     * Performs synchronous validation of object schema over the `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     *
     * The returned result includes a `getErrorsFor()` method for type-safe,
     * per-property error inspection.
     *
     * @param object The object to validate against this schema.
     * @param context Optional `ValidationContext` settings.
     */
    protected _validate(
        object: undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionalityForInput<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        context?: ValidationContext<this>
    ): ObjectSchemaValidationResult<
        undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionality<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        this
    > {
        // Fast path: skip preValidateSync + setupValidation when no preprocessors/validators
        if (
            this.canSkipPreValidation &&
            !context?.doNotStopOnFirstError &&
            !context?.rootPropertyDescriptor
        ) {
            // Required / optional check
            if (typeof object === 'undefined' || object === null) {
                if (typeof object === 'undefined' && this.hasDefault) {
                    object = this.resolveDefaultValue() as typeof object;
                } else if (!this.isRequired) {
                    const self = this;
                    return {
                        valid: true,
                        object: object,
                        getErrorsFor(selector?: any) {
                            return self
                                .#validateFull(object, context)
                                .getErrorsFor(selector);
                        }
                    } as any;
                } else {
                    const self = this;
                    return {
                        valid: false,
                        errors: [
                            {
                                message: this.getValidationErrorMessageSync(
                                    this.requiredErrorMessage,
                                    object as any
                                )
                            }
                        ],
                        getErrorsFor(selector?: any) {
                            return self
                                .#validateFull(object, context)
                                .getErrorsFor(selector);
                        }
                    } as any;
                }
            } else if (typeof object === 'object') {
                const propKeys = this.#propKeys;

                // Check for unknown properties
                if (!this.#acceptUnknownProps) {
                    const objKeys = Object.keys(object as Record<string, any>);
                    for (let i = 0; i < objKeys.length; i++) {
                        if (!(objKeys[i] in this.#properties)) {
                            const self = this;
                            return {
                                valid: false,
                                errors: [
                                    {
                                        message: `unknown property '${objKeys[i]}'`
                                    }
                                ],
                                getErrorsFor(selector?: any) {
                                    return self
                                        .#validateFull(object, context)
                                        .getErrorsFor(selector);
                                }
                            } as any;
                        }
                    }
                }

                // Validate all properties inline — no path passed to children
                const resultObject: Record<string, any> = {};
                for (let i = 0; i < propKeys.length; i++) {
                    const key = propKeys[i];
                    const result = this.#properties[key].validate(
                        (object as any)[key]
                    );
                    if (!result.valid) {
                        const self = this;
                        return {
                            valid: false,
                            errors:
                                result.errors && result.errors.length > 0
                                    ? [result.errors[0]]
                                    : [],
                            getErrorsFor(selector?: any) {
                                return self
                                    .#validateFull(object, context)
                                    .getErrorsFor(selector);
                            }
                        } as any;
                    }
                    resultObject[key] = result.object;
                }

                // Copy unknown props if accepted
                if (this.#acceptUnknownProps) {
                    const objKeys = Object.keys(object as Record<string, any>);
                    for (let i = 0; i < objKeys.length; i++) {
                        if (!(objKeys[i] in this.#properties)) {
                            resultObject[objKeys[i]] = (object as any)[
                                objKeys[i]
                            ];
                        }
                    }
                }

                // Lazy getErrorsFor — only builds descriptors if called
                const self = this;
                return {
                    valid: true,
                    object: resultObject,
                    getErrorsFor(selector?: any) {
                        return self
                            .#validateFull(object, context)
                            .getErrorsFor(selector);
                    }
                } as any;
            }
        }

        return this.#validateFull(object, context) as any;
    }

    /**
     * Full validation path with complete error handling and property descriptors.
     */
    #validateFull(
        object: any,
        context?: ValidationContext<this>
    ): ObjectSchemaValidationResult<any, any> {
        const setup = this.#setupValidation(
            this.preValidateSync(object, context)
        );
        if (setup.earlyReturn) return setup.result as any;

        const {
            propKeys,
            objToValidate,
            doNotStopOnFirstError,
            rootPropertyDescriptor,
            currentPropertyDescriptor
        } = setup;

        const validationResults: {
            key: string;
            result: ValidationResult<any>;
        }[] = [];
        for (const key of propKeys) {
            const result = this.#properties[key].validate(objToValidate[key], {
                ...context,
                rootPropertyDescriptor: rootPropertyDescriptor as any,
                currentPropertyDescriptor: (currentPropertyDescriptor as any)[
                    key
                ]
            });
            validationResults.push({ key, result });
            if (!result.valid && !doNotStopOnFirstError) break;
        }

        return this.#processResults(setup, validationResults) as any;
    }

    /**
     * Performs async validation of object schema over the `object`.
     * Supports async preprocessors, validators, and error message providers.
     *
     * @param object The object to validate against this schema.
     * @param context Optional `ValidationContext` settings.
     */
    protected async _validateAsync(
        object: undefined extends TExplicitType
            ? InferType<
                  SchemaBuilder<
                      undefined extends TExplicitType
                          ? Id<RespectPropsOptionalityForInput<TProperties>>
                          : TExplicitType,
                      TRequired
                  >
              >
            : TExplicitType,
        context?: ValidationContext<this>
    ): Promise<
        ObjectSchemaValidationResult<
            undefined extends TExplicitType
                ? InferType<
                      SchemaBuilder<
                          undefined extends TExplicitType
                              ? Id<RespectPropsOptionality<TProperties>>
                              : TExplicitType,
                          TRequired
                      >
                  >
                : TExplicitType,
            this
        >
    > {
        const setup = this.#setupValidation(
            await this.preValidateAsync(object, context)
        );
        if (setup.earlyReturn) return setup.result as any;

        const {
            propKeys,
            objToValidate,
            doNotStopOnFirstError,
            rootPropertyDescriptor,
            currentPropertyDescriptor
        } = setup;

        const validationResults: {
            key: string;
            result: ValidationResult<any>;
        }[] = [];

        if (doNotStopOnFirstError) {
            const results = await Promise.all(
                propKeys.map(async key => {
                    const result = await this.#properties[key].validateAsync(
                        objToValidate[key],
                        {
                            ...context,
                            rootPropertyDescriptor:
                                rootPropertyDescriptor as any,
                            currentPropertyDescriptor: (
                                currentPropertyDescriptor as any
                            )[key]
                        }
                    );
                    return { key, result };
                })
            );
            validationResults.push(...results);
        } else {
            for (const key of propKeys) {
                const result = await this.#properties[key].validateAsync(
                    objToValidate[key],
                    {
                        ...context,
                        rootPropertyDescriptor: rootPropertyDescriptor as any,
                        currentPropertyDescriptor: (
                            currentPropertyDescriptor as any
                        )[key]
                    }
                );
                validationResults.push({ key, result });
                if (!result.valid) break;
            }
        }

        return this.#processResults(setup, validationResults) as any;
    }

    /**
     * Fields not defined in `properties` will not be validated
     * and will be passed through the validation.
     */
    public acceptUnknownProps(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            acceptUnknownProps: true
        } as any) as any;
    }

    /**
     * Fields not defined in `properties` will be considered
     * as schema violation. This is the default behavior.
     */
    public notAcceptUnknownProps(): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            acceptUnknownProps: false
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): ObjectSchemaBuilder<
        TProperties,
        TRequired,
        T,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): ObjectSchemaBuilder<
        TProperties,
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

    /**
     * Adds a new property to the object schema. The new property
     * will be validated according to the provided schema.
     * @param propName name of the new property
     * @param schema schema builder of the new property
     */
    public addProp<
        TType extends SchemaBuilder<any, any, any>,
        TName extends string
    >(
        propName: TName,
        schema: TType
    ): ObjectSchemaBuilder<
        TProperties & {
            [k in TName]: TType;
        },
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (typeof propName !== 'string' || !propName) {
            throw new Error('propName must be a non empty string');
        }
        if (propName in this.#properties) {
            throw new Error(`Property ${propName} already exists`);
        }
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }

        return this.createFromProps({
            ...this.introspect(),
            properties: {
                ...this.introspect().properties,
                [propName]: schema
            }
        } as any) as any;
    }

    /**
     * @hidden
     * @deprecated this is for internal use, do not use if you are
     * not sure you need it.
     *
     * TODO: This is used to avoid `&` in resulting types. For example,
     * when you have a schema like `object({prop1: string()})` and then use `addProp({prop2: string()})` method,
     * the resulting type without `optimize` will be something like `{prop1: string} & {prop2: string}`. Which
     * is not we would like to have. Instead we want to have `{prop1: string, prop2: string}`. This is what
     * `optimize` method does. However it is not always possible to do this optimization without losing
     * JSDoc comments, which is sucks. For example, I had to disable optimization for UnionSchemas, because
     * comments were lost. Hopefully it will be fixed in the future by Typescript team or somebody will
     * find a workaround/fix and create a pull request.
     */
    public optimize(): SchemaBuilder<
        undefined extends TExplicitType
            ? Id<RespectPropsOptionality<TProperties>>
            : TExplicitType,
        TRequired,
        THasDefault,
        TExtensions
    > {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Adds new properties to the object schema. The same as `.addProp()` but
     * allows to add multiple properties with one call. The new properties
     * will be validated according to the provided schemas.
     * @param props a key/schema object map.
     */
    public addProps<
        TProps extends Record<string, SchemaBuilder<any, any, any>>
    >(
        props: TProps
    ): ObjectSchemaBuilder<
        TProperties & TProps,
        TRequired,
        undefined,
        THasDefault,
        TExtensions
    > &
        TExtensions;

    /**
     * Adds all properties from the `schema` object schema to the current schema.
     * @param schema an instance of `ObjectSchemaBuilder`
     */
    public addProps<K extends ObjectSchemaBuilder<any, any, any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<infer TProp, infer _, infer __>
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProp> & TProp,
              TRequired,
              TExplicitType,
              THasDefault,
              TExtensions
          > &
              TExtensions
        : never;

    public addProps(props: any) {
        if (props instanceof ObjectSchemaBuilder) {
            return this.addProps(props.introspect().properties);
        }

        if (typeof props !== 'object') {
            throw new Error('props should be an object');
        }
        if (props === null) {
            throw new Error('props should not be null');
        }

        const newProps = { ...this.#properties } as any;

        for (const key in props) {
            if (key in this.#properties) {
                throw new Error(`property '${key}' already exists`);
            }

            if (!(props[key] instanceof SchemaBuilder)) {
                throw new Error(`${key} is not a SchemaBuilder`);
            }

            newProps[key] = props[key] as any;
        }

        return this.createFromProps({
            ...this.introspect(),
            properties: newProps
        } as any) as any;
    }

    /**
     * Omits properties listed in `properties` from the schema.
     * Consider `Omit<Type, 'prop1'|'prop2'...>` as a good illustration
     * from the TS world.
     * @param properties - array of property names (strings) to remove from the schema.
     */
    public omit<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<
        Omit<TProperties, K>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions;
    /**
     * Removes `propName` from the list of properties.
     * @param propName property name to remove. Schema should contain
     * this property. An error will be thrown otherwise.
     */
    public omit<TProperty extends keyof TProperties>(
        propName: TProperty
    ): ObjectSchemaBuilder<
        Omit<TProperties, TProperty>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions;
    /**
     * Removes all properties of `schema` from the current schema.
     * `Omit<TSchema, keyof TAnotherSchema>` as a good illustration
     * from the TS world.
     * @param schema schema builder to take properties from.
     */
    public omit<T>(
        schema: T
    ): T extends ObjectSchemaBuilder<
        infer TProps,
        infer TRequired,
        infer TExplicitType
    >
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps>,
              TRequired,
              TExplicitType,
              THasDefault,
              TExtensions
          > &
              TExtensions
        : never;

    public omit(propNameOrArrayOrPropsOrBuilder: any): any {
        if (typeof propNameOrArrayOrPropsOrBuilder === 'string') {
            // remove one field
            const propName =
                propNameOrArrayOrPropsOrBuilder as keyof TProperties;

            if (!propName || !(propName in this.#properties)) {
                throw new Error(
                    `property ${propName.toString()} does not exists in the schema`
                );
            }

            return this.createFromProps({
                ...this.introspect(),
                properties: (() => {
                    const result = { ...this.#properties };
                    delete result[propName];
                    return result;
                })()
            } as any);
        } else if (Array.isArray(propNameOrArrayOrPropsOrBuilder)) {
            const propsArray = propNameOrArrayOrPropsOrBuilder as Array<
                keyof TProperties
            >;

            const distinctKeys = new Map<keyof TProperties, true>();
            propsArray.forEach(key => {
                if (typeof key !== 'string' || !key) {
                    throw new Error('property name must be a string');
                }

                if (!(key in this.#properties)) {
                    throw new Error(
                        `property ${key.toString()} does not exists in the schema`
                    );
                }

                distinctKeys.set(key.toString(), true);
            });

            if (distinctKeys.size === 0) {
                throw new Error('please provide at least one property to omit');
            }

            const props = {
                ...this.introspect()
            };

            for (const key of distinctKeys.keys()) {
                delete props.properties[key];
            }

            return this.createFromProps(props as any);
        } else if (
            propNameOrArrayOrPropsOrBuilder instanceof ObjectSchemaBuilder
        ) {
            const propsToOmit = {
                ...propNameOrArrayOrPropsOrBuilder.introspect().properties
            };

            const props = {
                ...this.introspect()
            };

            for (const key in propsToOmit) {
                if (key in props.properties) {
                    delete props.properties[key];
                }
            }

            return this.createFromProps(props as any);
        }

        throw new Error('this parameter type is not supported');
    }

    /**
     * Adds all properties from `schema` to the current schema.
     * `TSchema & TAnotherSchema` is a good example of the similar concept
     * in the TS type system.
     * @param schema an object schema to take properties from
     */
    public intersect<T extends ObjectSchemaBuilder<any, any, any, any, any>>(
        schema: T
    ): T extends ObjectSchemaBuilder<infer TProps, infer _, infer TExplType>
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof TProps> & TProps,
              TRequired,
              TExplType,
              THasDefault,
              TExtensions
          > &
              TExtensions
        : never {
        if (!(schema instanceof ObjectSchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the ObjectSchemaBuilder class'
            );
        }

        const remoteProps = schema.introspect().properties;

        const localProps = this.introspect();

        const newProps = Object.keys(localProps.properties).reduce(
            (acc, curr) => {
                acc[curr] =
                    curr in remoteProps
                        ? remoteProps[curr]
                        : localProps.properties[curr];
                return acc;
            },
            {} as Record<string, any>
        );

        return this.createFromProps({
            ...this.introspect(),
            properties: newProps
        } as any) as any;
    }

    /**
     * Marks all properties in the current schema as optional.
     * It is the same as call `.optional('propname')` where `propname` is the name
     * of every property in the schema.
     */
    public partial(): ObjectSchemaBuilder<
        MakeChildrenOptional<TProperties>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions;
    /**
     * Marks all properties from `properties` as optional in the schema.
     * @param properties list of property names (string) to make optional
     */
    public partial<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<
        Omit<TProperties, K> & Pick<MakeChildrenOptional<TProperties>, K>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions;
    /**
     * Marks property `propName` as optional in the schema.
     * @param propName the name of the property (string).
     */
    public partial<TProperty extends keyof TProperties>(
        propName: TProperty
    ): ObjectSchemaBuilder<
        Omit<TProperties, TProperty> &
            Pick<MakeChildrenOptional<TProperties>, TProperty>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions;

    public partial(propNameOrArray?: any): any {
        if (
            typeof propNameOrArray === 'undefined' ||
            propNameOrArray === null
        ) {
            return this.createFromProps({
                ...this.introspect(),
                properties: Object.keys(this.#properties).reduce(
                    (acc, key) => {
                        acc[key] = this.#properties[key].optional();
                        return acc;
                    },
                    {} as Record<string, any>
                )
            } as any);
        }

        if (Array.isArray(propNameOrArray)) {
            const propsArray = propNameOrArray as (keyof TProperties)[];
            if (propsArray.length === 0) {
                throw new Error('properties cannot be empty');
            }

            const newProps = {
                ...this.introspect()
            } as any;

            propsArray.forEach(key => {
                if (typeof key !== 'string') {
                    throw new Error(
                        'each propery in property list must be as string value'
                    );
                }
                if (!(key in newProps.properties)) {
                    throw new Error(
                        `property ${key as string} does not exists`
                    );
                }

                newProps.properties[key as keyof TProperties] =
                    newProps.properties[key].optional();
            });

            return this.createFromProps(newProps);
        }

        if (typeof propNameOrArray === 'string') {
            return this.modifyPropSchema(
                propNameOrArray as keyof TProperties,
                schema => schema.optional()
            );
        }

        throw new Error('expecting string or string[] parameter');
    }

    /**
     * Recursively marks all properties — and all properties of nested
     * `object()` schemas — as optional.  Useful for PATCH API bodies
     * and partial form state where every field at every level is optional.
     *
     * Only nested `ObjectSchemaBuilder` schemas are recursed into.
     * Other schema types (arrays, unions, primitives, lazy) are made
     * optional at the top level but their internals are not modified.
     *
     * @example
     * ```ts
     * const Address = object({
     *   street: string(),
     *   city:   string()
     * });
     *
     * const User = object({
     *   name:    string(),
     *   address: Address
     * });
     *
     * const PatchUser = User.deepPartial();
     * // PatchUser infers as:
     * // { name?: string; address?: { street?: string; city?: string } }
     *
     * PatchUser.validate({ address: { city: 'Paris' } }); // valid
     * PatchUser.validate({});                              // valid
     * ```
     *
     * @example
     * ```ts
     * // Three-level nesting
     * const schema = object({
     *   a: object({
     *     b: object({ c: string() })
     *   })
     * }).deepPartial();
     *
     * schema.validate({});               // valid
     * schema.validate({ a: {} });        // valid
     * schema.validate({ a: { b: {} } }); // valid
     * ```
     *
     * @example
     * ```ts
     * // PATCH API body
     * const CreateBody = object({
     *   profile: object({ displayName: string(), bio: string() }),
     *   settings: object({ theme: string(), language: string() })
     * });
     *
     * const PatchBody = CreateBody.deepPartial();
     * // All fields are optional at every level —
     * // send only what you want to update.
     * ```
     *
     * @see {@link partial} for shallow-only property optionality.
     */
    public deepPartial(): ObjectSchemaBuilder<
        DeepMakeChildrenOptional<TProperties>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        const newProps: Record<string, SchemaBuilder<any, any, any>> = {};
        for (const key of Object.keys(this.#properties)) {
            const prop = this.#properties[key];
            if (prop instanceof ObjectSchemaBuilder) {
                newProps[key] = (prop as ObjectSchemaBuilder<any, any, any>)
                    .deepPartial()
                    .optional();
            } else {
                newProps[key] = prop.optional();
            }
        }
        return this.createFromProps({
            ...this.introspect(),
            properties: newProps
        } as any) as any;
    }

    /**
     * Returns a new schema containing only properties listed in
     * `properties` array.
     * @param properties array of property names (strings)
     */
    public pick<K extends keyof TProperties>(
        properties: K[]
    ): ObjectSchemaBuilder<
        Pick<TProperties, K>,
        TRequired,
        undefined,
        THasDefault,
        TExtensions
    > &
        TExtensions;
    /**
     * Returns new schema based on the current schema. This new schema
     * will consists only from properties which names are taken from the
     * `schema` object schema.
     * @param schema schema to take property names list from
     */
    public pick<K extends ObjectSchemaBuilder<any, any, any, any, any>>(
        schema: K
    ): K extends ObjectSchemaBuilder<infer TProps, infer _, infer __>
        ? ObjectSchemaBuilder<
              Omit<TProperties, keyof Omit<TProperties, keyof TProps>>,
              TRequired,
              undefined,
              THasDefault,
              TExtensions
          > &
              TExtensions
        : never;

    /**
     * Returns a new schema consisting of only one property
     * (taken from the `property` property name). If the property
     * does not exists in the current schema, an error will be thrown.
     * @param property the name of the property (string).
     */
    public pick<K extends keyof TProperties>(
        property: K
    ): ObjectSchemaBuilder<
        Pick<TProperties, K>,
        TRequired,
        undefined,
        THasDefault,
        TExtensions
    > &
        TExtensions;

    public pick(properties: any): any {
        if (typeof properties === 'string') {
            const property = properties as string;

            if (!property) {
                throw new Error('property cannot be empty');
            }

            if (!(property in this.#properties)) {
                throw new Error(`property ${property} does not exists`);
            }

            return this.createFromProps({
                ...this.introspect(),
                properties: {
                    [property]: this.#properties[property]
                }
            } as any);
        }

        if (Array.isArray(properties)) {
            if (properties.length === 0) {
                throw new Error('properties must be a non empty erray');
            }
            const newProperties = properties.reduce((acc, curr) => {
                if (typeof curr !== 'string' || !curr) {
                    throw new Error(
                        'each property name must be a non empty string'
                    );
                }
                if (!(curr in this.#properties)) {
                    throw new Error(`property ${curr} does not exists`);
                }

                acc[curr] = this.#properties[curr];
                return acc;
            }, {});

            return this.createFromProps({
                ...this.introspect(),
                properties: newProperties
            } as any);
        }

        if (properties instanceof ObjectSchemaBuilder) {
            const externalSchema = properties as ObjectSchemaBuilder;

            const props = Object.keys(
                externalSchema.introspect().properties
            ).filter(p => typeof this.#properties[p] !== 'undefined');
            if (props.length === 0) {
                throw new Error(
                    'there are no common properties in provided schemas'
                );
            }
            return this.pick(props as any as keyof TProperties);
        }

        throw new Error('string, array or ObjectSchemaBuilder is expected');
    }

    /**
     * Modify schema for `propName` and return a new schema.
     * Could be useful if you want to leave all schema intact, but
     * change a type of one property.
     * @param propName name of the property (string)
     * @param callback callback function returning a new schema fo the `propName`. As a first parameter
     * you will receive an old schema for `propName`.
     * @returns
     */
    public modifyPropSchema<
        K extends keyof TProperties,
        R extends SchemaBuilder<any, any, any>
    >(
        propName: K,
        callback: (builder: TProperties[K]) => R
    ): ObjectSchemaBuilder<
        ModifyPropSchema<TProperties, K, R>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (typeof propName !== 'string' || !propName) {
            throw new Error('propName must be a non empty string');
        }

        if (!(propName in this.#properties)) {
            throw new Error(
                `property ${propName} does not exists in the schema`
            );
        }

        if (typeof callback !== 'function') {
            throw new Error('callback must be a function');
        }

        const callbackResult = callback(this.#properties[propName]);
        if (!(callbackResult instanceof SchemaBuilder)) {
            throw new Error('callback must return a SchemaBuilder object');
        }

        const props = {
            ...this.introspect()
        } as any;

        props.properties = {
            ...props.properties,
            [propName]: callbackResult
        };

        return this.createFromProps(props) as any;
    }

    /**
     * An alias for `.partial(prop: string)`
     * @param prop name of the property
     */
    public makePropOptional<K extends keyof TProperties>(
        prop: K
    ): ObjectSchemaBuilder<
        MakeChildOptional<TProperties, K>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.modifyPropSchema(prop, builder =>
            builder.optional()
        ) as any;
    }

    /**
     * Marks `prop` as required property.
     * If `prop` does not exists in the current schema,
     * an error will be thrown.
     * @param prop name of the property
     */
    public makePropRequired<K extends keyof TProperties>(
        prop: K
    ): ObjectSchemaBuilder<
        MakeChildRequired<TProperties, K>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.modifyPropSchema(prop, builder =>
            builder.required()
        ) as any;
    }

    /**
     * `Partial<T>` would be a good example of the
     * same operation in the TS world.
     */
    public makeAllPropsOptional(): ObjectSchemaBuilder<
        MakeChildrenOptional<TProperties>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            properties: Object.keys(this.#properties).reduce(
                (acc, curr) => {
                    acc[curr] = this.#properties[curr].optional();
                    return acc;
                },
                {} as Record<string, any>
            )
        } as any) as any;
    }

    /**
     * `Required<T>` would be a good example of the
     * same operation in the TS world.
     */
    public makeAllPropsRequired(): ObjectSchemaBuilder<
        MakeChildrenRequired<TProperties>,
        TRequired,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            properties: Object.keys(this.#properties).reduce(
                (acc, curr) => {
                    acc[curr] = this.#properties[curr].required();
                    return acc;
                },
                {} as Record<string, any>
            )
        } as any) as any;
    }

    static #getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(
        schema: TSchema,
        /* this is to make possibility to traverse the tree and select properties */
        selector?: (arg1: any, arg2: any) => any,
        /* parent object to have a possibility to get link to itself */
        parentSelector?: any,
        /* used to pass the needed property name if `parentSelector` is provided. */
        currentName?: string,
        parentDescriptor?: PropertyDescriptorInner<any, any, any>
    ): PropertyDescriptorTree<TSchema> {
        const introspected = schema.introspect();
        if (!introspected.properties) {
            return {} as any;
        }

        const propsNames = Object.keys(introspected.properties);

        if (propsNames.length === 0) {
            return {} as any;
        }

        if (typeof selector !== 'function') {
            selector = o => o;
        }
        const result = createPropertyDescriptorFor(
            (obj, createMissingStructure) =>
                (parentSelector || selector)(obj, createMissingStructure),
            currentName,
            schema,
            parentDescriptor
        );

        for (const propName of propsNames) {
            const propSchema = introspected.properties[propName];
            if (propSchema instanceof ObjectSchemaBuilder) {
                (result as any)[propName] = (
                    ObjectSchemaBuilder.#getPropertiesFor as any
                )(
                    propSchema,
                    (tree: any, createMissingStructure: any) => {
                        const selectorResult = selector(
                            tree,
                            createMissingStructure
                        );
                        if (selectorResult) {
                            if (
                                createMissingStructure &&
                                !selectorResult[propName]
                            ) {
                                selectorResult[propName] = {};
                            }
                            return selectorResult[propName];
                        }
                        return null;
                    },
                    selector,
                    propName,
                    result[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                );
            } else {
                (result as any)[propName] = createPropertyDescriptorFor(
                    selector,
                    propName,
                    propSchema,
                    result[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                );
            }
        }

        return result as any;
    }

    public static getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(schema: TSchema): PropertyDescriptorTree<TSchema, TSchema> {
        if (!(schema instanceof ObjectSchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the ObjectSchemaBuilder class'
            );
        }

        if (schema.#propertyDescriptorTreeMap.has(schema)) {
            return schema.#propertyDescriptorTreeMap.get(schema) as any;
        }

        const result = ObjectSchemaBuilder.#getPropertiesFor(schema);
        schema.#propertyDescriptorTreeMap.set(schema, result);

        return result;
    }

    public static isValidPropertyDescriptor(
        descriptor: PropertyDescriptor<any, any, any>
    ) {
        return (
            typeof descriptor === 'object' &&
            descriptor !== null &&
            typeof descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] === 'object'
        );
    }

    static #propagateNestedErrors(
        result: any,
        descriptor: any,
        addErrorFor: (
            descriptor: any,
            message: string,
            parentDescriptor?: any
        ) => void
    ): void {
        const schema =
            ObjectSchemaBuilder.#getSchemaForPropertyDescriptor(descriptor);
        const properties = (schema.introspect() as any).properties;
        if (!properties) return;

        for (const nestedPropertyName in properties) {
            const nestedPropertyDescriptor = descriptor[nestedPropertyName];
            const nestedValidationError = result.getErrorsFor(
                () => nestedPropertyDescriptor
            );
            if (!nestedValidationError.isValid) {
                for (const validationError of nestedValidationError.errors) {
                    addErrorFor(
                        nestedPropertyDescriptor,
                        validationError,
                        descriptor
                    );
                }
            }
            // Recurse into nested object schemas
            const nestedSchema = properties[nestedPropertyName];
            if (
                nestedSchema instanceof ObjectSchemaBuilder &&
                typeof result.getErrorsFor === 'function' &&
                ObjectSchemaBuilder.isValidPropertyDescriptor(
                    nestedPropertyDescriptor
                )
            ) {
                ObjectSchemaBuilder.#propagateNestedErrors(
                    result,
                    nestedPropertyDescriptor,
                    addErrorFor
                );
            }
        }
    }

    static #getSchemaForPropertyDescriptor(
        descriptor: PropertyDescriptor<any, any, any>
    ): SchemaBuilder<any, any, any> {
        if (!ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)) {
            throw new Error('descriptor is not a valid property descriptor');
        }

        return descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].getSchema();
    }
}

export interface Object {
    /**
     * Defines a schema for empty object `{}`
     */
    (): ObjectSchemaBuilder<{}, true>;
    /**
     * Defines an object schema, properties definitions are takens from `props`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(
        props: TProps
    ): ObjectSchemaBuilder<TProps, true>;
    /**
     * Defines an object schema, properties definitions are takens from `props`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(
        props?: TProps
    ): ObjectSchemaBuilder<TProps, true>;
    /**
     * Returns a tree of property descriptors for the given `schema`.
     * The structure of the tree is the same as the structure of the `schema`.
     * Which gives you an opportunity to access property descriptors for each
     * property in the schema in a useful and type-safe way.
     * @param schema
     */
    getPropertiesFor<
        TProperties extends Record<string, SchemaBuilder<any, any, any>> = {},
        TRequired extends boolean = true,
        TExplicitType = undefined,
        TSchema extends ObjectSchemaBuilder<
            any,
            any,
            any
        > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
    >(schema: TSchema): PropertyDescriptorTree<TSchema, TSchema>;

    /**
     * Verifies if the given `descriptor` is a valid property descriptor.
     * @param descriptor a property descriptor to check
     */
    isValidPropertyDescriptor(
        descriptor: PropertyDescriptor<any, any, any>
    ): boolean;
}

const object = (props => {
    return ObjectSchemaBuilder.create({
        isRequired: true,
        properties: props
    }) as any;
}) as Object;

type PropertyDescriptorMap = Map<
    ObjectSchemaBuilder<any, any, any, any, any>,
    PropertyDescriptorMap | PropertyDescriptorTree<any, any>
>;

const createPropertyDescriptorFor = (
    selector: (arg0: any, arg1: boolean) => any,
    propertyName?: string,
    schema?: SchemaBuilder<any, any, any>,
    parent?: PropertyDescriptorInner<any, any, any>
) => ({
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        setValue: (
            obj: any,
            newValue: any,
            options?: PropertySetterOptions
        ) => {
            const selectorResult = selector(
                obj,
                !!options?.createMissingStructure
            );
            if (!selectorResult) return false;

            if (typeof propertyName === 'string') {
                selectorResult[propertyName] = newValue;
            }

            return true;
        },
        getValue: (obj: any) => {
            const selectorResult = selector(obj, false);
            if (!selectorResult)
                return {
                    success: false
                };

            if (typeof propertyName !== 'string') {
                return {
                    success: true,
                    value: selectorResult
                };
            }

            if (Object.hasOwn(selectorResult, propertyName)) {
                return {
                    success: true,
                    value: selectorResult[propertyName]
                };
            }

            return {
                success: false
            };
        },

        getSchema: () => schema,
        parent
    }
});

(object as any).getPropertiesFor = <
    TProperties extends Record<string, SchemaBuilder<any, any, any>> = {},
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any
    > = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
>(
    schema: ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>
): PropertyDescriptorTree<TSchema, TSchema> =>
    ObjectSchemaBuilder.getPropertiesFor(schema) as any;

(object as any).isValidPropertyDescriptor =
    ObjectSchemaBuilder.isValidPropertyDescriptor;

export { object };

type RequiredProps<T extends Record<string, SchemaBuilder<any, any, any>>> =
    keyof {
        [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, any>
            ? TReq extends true
                ? k
                : never
            : never]: T[k];
    };

type NotRequiredProps<T extends Record<string, SchemaBuilder<any, any, any>>> =
    keyof {
        [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, any>
            ? TReq extends true
                ? never
                : k
            : never]: T[k];
    };

type RequiredInputProps<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, infer THasDef>
        ? TReq extends true
            ? THasDef extends true
                ? never
                : k
            : never
        : never]: T[k];
};

type NotRequiredInputProps<
    T extends Record<string, SchemaBuilder<any, any, any>>
> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, infer THasDef>
        ? TReq extends true
            ? THasDef extends true
                ? k
                : never
            : k
        : never]: T[k];
};
