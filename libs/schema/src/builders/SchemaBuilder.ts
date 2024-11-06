import { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
import { Transaction, transaction } from '../utils/transaction.js';

export type InferType<T> =
    T extends SchemaBuilder<infer TResult, infer TRequired>
        ? T extends {
              optimize: (
                  ...args: any[]
              ) => SchemaBuilder<
                  infer TOptimizedType,
                  infer TOptimizedRequired
              >;
          }
            ? TOptimizedRequired extends true
                ? TOptimizedType
                : MakeOptional<TOptimizedType>
            : TRequired extends true
              ? TResult
              : MakeOptional<TResult>
        : T;

export type ValidationError = { path: string; message: string };

/**
 * Used to represent a validation error for nested
 * objects/properties. Contains a list of errors and
 * the value that caused them.
 */
export type NestedValidationError<
    TSchema,
    TRootSchema extends ObjectSchemaBuilder<any, any>,
    TParentPropertyDescriptor
> = {
    /**
     * Value that property had and which caused error or errors
     */
    seenValue?: InferType<TSchema>;
    /**
     * A list of errors, empty if object satisfies a schema
     */
    errors: ReadonlyArray<string>;

    get descriptor(): PropertyDescriptorInner<
        TRootSchema,
        TSchema,
        TParentPropertyDescriptor
    >;
};

export type MakeOptional<T> = { prop?: T }['prop'];

/**
 * Type of the function that provides a validation error message for
 * the given `seenValue` and `schema`. Can be a string or a function
 * returning a string or a promise of a string.
 * Should be used to provide a custom validation error message.
 */
export type ValidationErrorMessageProvider<
    TSchema extends SchemaBuilder<any, any> = SchemaBuilder<any, any>
> =
    | string
    | ((
          seenValue: InferType<TSchema>,
          schema: TSchema
      ) => string | Promise<string>);

export type ValidationResult<T> = {
    /**
     * If `true` - object satisfies schema
     */
    valid: boolean;
    /**
     * Contains validated object. Can be different (if there are any preprocessors in the schema) from object
     * passed to the `validate` method of the `SchemaBuilder` class.
     */
    object?: T;
    errors?: ValidationError[];
};

export type PreValidationResult<T, TTransactionType> = Omit<
    ValidationResult<T>,
    'object'
> & {
    context: ValidationContext;
    transaction?: Transaction<TTransactionType>;
    rootPropertyDescriptor?: PropertyDescriptor<any, any, undefined>;
};

type ValidatorResult<T> = Omit<ValidationResult<T>, 'object' | 'errors'> & {
    errors?: Omit<ValidationError, 'path'>[];
};

export type Preprocessor<T> = (object: T) => Promise<T> | T;
export type Validator<T> = (
    object: T
) => Promise<ValidatorResult<T>> | ValidatorResult<T>;

export type SchemaBuilderProps<T> = {
    type: string;
    isRequired?: boolean;
    preprocessors: Preprocessor<T>[];
    validators: Validator<T>[];
};

export type ValidationContext<
    TSchema extends SchemaBuilder<any, any> = SchemaBuilder<any, any>
> = {
    /**
     * Path of the field. **Optional**, used to display correct error path in the {@link ValidationError}
     */
    path?: string;

    /**
     * Optional. By default validation will stop after the first validation error, in case if
     * you want to receive all validation erors, please set this flag to `true`.
     * You might need it to display validation errors.
     */
    doNotStopOnFirstError?: boolean;

    /**
     * Optional. If you define a `rootPropertyDescriptor` while validating an object,
     * it will report all validation errors with the path starting from the root property.
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    rootPropertyDescriptor?: TSchema extends ObjectSchemaBuilder<any, any, any>
        ? PropertyDescriptor<TSchema, TSchema, undefined>
        : never;

    /**
     * Optional. This is a property descriptor for the current object being validated.
     * This descriptor is descendant of the `rootPropertyDescriptor` and is used to provide
     * a path to the current object being validated in the root object.
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    currentPropertyDescriptor?: TSchema extends ObjectSchemaBuilder<
        any,
        any,
        any
    >
        ? PropertyDescriptor<TSchema, TSchema, unknown>
        : never;

    /**
     * Optional. Used along with `rootPropertyDescriptor` and `currentPropertyDescriptor` to provide
     * a root validation object, this object will be used to retrieve the value of properties
     * using the `rootPropertyDescriptor` because the `rootPropertyDescriptor` is a property descriptor
     * for the root object, and it needs the root object along with the whole structure to get the
     * value of the property.
     *
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    rootValidationObject?: InferType<TSchema>;
};

/**
 * A symbol to mark property descriptors in the schema.
 * Normally, you should not use it directly unless you want
 * to develop some advanced features or extend the library.
 * In normal conditions it's used internally by the library.
 */
export const SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR = Symbol();

/**
 * Describes a property in a schema. And gives you
 * a possibility to access property value and set it.
 * suppose you have a schema like this:
 * ```ts
 * const schema = object({
 *  name: string(),
 *  address: object({
 *   city: string(),
 *   country: string()
 *  }),
 *  id: number()
 * });
 * ```
 * then you can get a property descriptor for the `address.city` property
 * like this:
 * ```ts
 * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
 * ```
 *
 * And then you can use it to get and set the value of this property having the object:
 * ```ts
 * const obj = {
 * name: 'Leo',
 * address: {
 *  city: 'Kozelsk',
 *  country: 'Russia'
 *  },
 *  id: 123
 * };
 *
 * const success = addressCityDescriptor.setValue(obj, 'Venyov');
 * // this returns you a boolean value indicating if the value was set successfully
 * ```
 */

export type PropertySetterOptions = {
    /**
     * If set to `true`, the method will create missing structure
     * in the object to set the value. For example, if you have a schema
     * and property descriptor like this:
     * ```ts
     * const schema = object({
     * address: object({
     * city: string(),
     * country: string()
     * }),
     * });
     * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
     * ```
     * And then you try to set a new value to the `address.city` property on the object
     * which does not have `address` property:
     * ```ts
     * const obj = {
     * name: 'Leo'
     * };
     * const success = addressCityDescriptor.setValue(obj, 'Venyov', { createMissingStructure: true });
     * // success === true
     * // obj === {
     * // name: 'Leo',
     * // address: {
     * // city: 'Venyov'
     * //  }
     * // }
     */
    createMissingStructure?: boolean;
};

export type PropertyDescriptorInnerFromPropertyDescriptor<T> =
    T extends PropertyDescriptor<
        infer TSchema,
        infer TPropertySchema,
        infer TParentPropertyDescriptor
    >
        ? PropertyDescriptorInner<
              TSchema,
              TPropertySchema,
              TParentPropertyDescriptor
          >
        : undefined;

export type PropertyDescriptorInner<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertySchema,
    TParentPropertyDescriptor
> = {
    /**
     * Sets a new value to the property. If the process was successful,
     * the method returns `true`, otherwise `false`.
     * It can return `false` if the property could not be set to the object
     * which can happen if the `setValue` method is called with an object
     * which does not comply with the schema.
     * for example, if you have a schema and property descriptopr like this:
     * ```ts
     * const schema = object({
     *  name: string(),
     *  address: object({
     *   city: string(),
     *   country: string()
     *  }),
     *  id: number()
     * });
     *
     * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
     * ```
     * And then you try to set a new value to the `address.city` property on the object
     * which does not have `address` property:
     * ```ts
     * const obj = {
     * name: 'Leo'
     * };
     *
     * const success = addressCityDescriptor.setValue(obj, 'Venyov');
     * // success === false
     * ```
     *
     * @param obj Object to set the value to
     * @param value a new value to set to the property
     * @param options additional optional parameters to control the process
     * @returns
     */
    setValue: (
        obj: InferType<TSchema>,
        value: InferType<TPropertySchema>,
        options?: PropertySetterOptions
    ) => boolean;
    /**
     * Gets the value of the property from the object.
     * @param obj object to get the value from
     * @returns an object containing a `value` and `success` properties. `value` is the value of the property
     * if it was found in the object, `success` is a boolean value indicating if the property was found in the object.
     */
    getValue: (obj: InferType<TSchema>) => {
        value?: InferType<TPropertySchema>;
        success: boolean;
    };

    /**
     * Gets the schema for the property described by the property descriptor.
     * @returns a schema for the property
     */
    getSchema: () => TPropertySchema;

    parent: PropertyDescriptorInnerFromPropertyDescriptor<TParentPropertyDescriptor>;
    // extends PropertyDescriptor<
    //     any,
    //     any,
    //     any
    // >
    //     ? TParentPropertyDescriptor
    //     : never;
};

export type PropertyDescriptor<
    TRootSchema extends ObjectSchemaBuilder<any, any, any>,
    TPropertySchema,
    TParentPropertyDescriptor
> = {
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: PropertyDescriptorInner<
        TRootSchema,
        TPropertySchema,
        TParentPropertyDescriptor
    >;
};

/**
 * A tree of property descriptors for the schema.
 * Has a possibility to filter properties by the type (`TAssignableTo` type parameter).
 */
export type PropertyDescriptorTree<
    TSchema extends ObjectSchemaBuilder<any, any, any>,
    TRootSchema extends ObjectSchemaBuilder<any, any, any> = TSchema,
    TAssignableTo = any,
    TParentPropertyDescriptor = undefined
> = PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor> &
    (TSchema extends ObjectSchemaBuilder<infer TProperties, any, any>
        ? {
              [K in keyof TProperties]: TProperties[K] extends ObjectSchemaBuilder<
                  any,
                  any,
                  any
              >
                  ? PropertyDescriptorTree<
                        TProperties[K],
                        TRootSchema,
                        any,
                        PropertyDescriptor<
                            TRootSchema,
                            TSchema,
                            TParentPropertyDescriptor
                        >
                    >
                  : InferType<TProperties[K]> extends TAssignableTo
                    ? PropertyDescriptor<
                          TRootSchema,
                          TProperties[K],
                          PropertyDescriptor<
                              TRootSchema,
                              TSchema,
                              TParentPropertyDescriptor
                          >
                      >
                    : never;
          }
        : never);

/**
 * Base class for all schema builders. Provides basic functionality for schema building.
 *
 * **Note:** this class is not intended to be used directly, use one of the subclasses instead.
 * @typeparam TResult Type of the object that will be returned by `validate()` method.
 * @typeparam TRequired If `true`, object will be required. If `false`, object will be optional.
 */
export abstract class SchemaBuilder<
    TResult = any,
    TRequired extends boolean = true
> {
    #isRequired = true;
    #preprocessors: Preprocessor<TResult>[] = [];
    #validators: Validator<TResult>[] = [];
    #type = 'base';

    /**
     * Set type of schema explicitly. `notUsed` param is needed only for cas when JS is used. E.g. when you
     * can't call method like `schema.hasType<Date>()`, so instead you can call `schema.hasType(new Date())`
     * with the same result.
     */
    public abstract hasType<T>(notUsed?: T);

    /**
     * Clears type set by call to `.hasType<T>()`, default schema type inference will be used
     * for schema retuned by this call.
     */
    public abstract clearHasType();

    /**
     * Protected method used to create an new instance of the Builder
     * defined by the `props` object. Should be used to instanticate new
     * builders to keep builder's immutability.
     * @param props arbitrary props object
     */
    protected abstract createFromProps(props): this;

    protected get type() {
        return this.#type;
    }

    protected set type(value: string) {
        if (typeof value !== 'string' || !value)
            throw new Error('value should be non empty string');
        this.#type = value;
    }

    /**
     * A list of preprocessors associated with
     * the Builder
     */
    protected get preprocessors() {
        return this.#preprocessors;
    }

    /**
     * A list of validators associated with
     * the Builder
     */
    protected get validators() {
        return this.#validators;
    }

    protected get isRequired(): TRequired {
        return this.#isRequired as TRequired;
    }

    protected set isRequired(value: boolean) {
        if (typeof value !== 'boolean')
            throw new Error('should be a boolean value');
        this.#isRequired = value as any;
    }

    protected async preValidate(
        /**
         * Object to validate
         */
        object: any,
        context?: ValidationContext
    ): Promise<PreValidationResult<any, { validatedObject: any }>> {
        const { doNotStopOnFirstError } = context || {
            doNotStopOnFirstError: false
        };

        let path = '$';

        if (typeof context?.path === 'string' && context.path)
            path = context.path;

        const resultingContext: ValidationContext = {
            path,
            doNotStopOnFirstError
        };

        let preprocessingTransaction = transaction({
            validatedObject: object
        });

        let preprocessedObject =
            preprocessingTransaction.object.validatedObject;

        let errors: ValidationError[] = [];

        if (Array.isArray(this.preprocessors)) {
            let currentPrepropIndex = 0;
            for (const preprocessor of this.preprocessors) {
                try {
                    preprocessingTransaction = transaction({
                        validatedObject: await Promise.resolve(
                            preprocessor(preprocessedObject)
                        )
                    });
                    preprocessedObject =
                        preprocessingTransaction.object.validatedObject;
                } catch (err) {
                    errors.push({
                        message: `Preprocessor #${currentPrepropIndex}${
                            preprocessor.name ? ` (${preprocessor.name})` : ''
                        } thrown an error: ${(err as Error).message}`,
                        path: `${path}($preprocessors[${currentPrepropIndex}])`
                    });
                    if (!doNotStopOnFirstError) {
                        preprocessingTransaction.rollback();
                        return {
                            valid: false,
                            errors: [errors[0]].filter((e) => e),
                            context: resultingContext
                        };
                    }
                } finally {
                    currentPrepropIndex++;
                }
            }
        }

        if (Array.isArray(this.validators)) {
            let currentValidatorIndex = 0;
            for (const validator of this.validators) {
                try {
                    const { valid, errors: validatorErrors } =
                        await Promise.resolve(validator(preprocessedObject));
                    if (!valid) {
                        errors = [
                            ...errors,
                            ...(Array.isArray(validatorErrors) &&
                            validatorErrors.length
                                ? validatorErrors.map((err) => ({
                                      message: err.message,
                                      path: `${path}($validators[${currentValidatorIndex}])`
                                  }))
                                : [
                                      {
                                          message: `Validator #${currentValidatorIndex}${
                                              validator.name
                                                  ? ` (${validator.name})`
                                                  : ''
                                          } didn't pass.`,
                                          path: `${path}($validators[${currentValidatorIndex}])`
                                      }
                                  ])
                        ];
                        if (!doNotStopOnFirstError) {
                            preprocessingTransaction.rollback();
                            return {
                                valid: false,
                                errors: [errors[0]].filter((e) => e),
                                context: resultingContext
                            };
                        }
                    }
                } catch (err) {
                    errors.push({
                        message: `Validator #${currentValidatorIndex}${
                            validator.name ? ` (${validator.name})` : ''
                        } thrown an error: ${(err as Error).message}`,
                        path: `${path}($validators[${currentValidatorIndex}])`
                    });
                    if (!doNotStopOnFirstError) {
                        preprocessingTransaction.rollback();
                        return {
                            valid: false,
                            errors: [errors[0]].filter((e) => e),
                            context: resultingContext
                        };
                    }
                } finally {
                    currentValidatorIndex++;
                }
            }
        }

        if (
            this.isRequired &&
            (typeof preprocessedObject === 'undefined' ||
                preprocessedObject === null)
        ) {
            errors.push({
                message: 'is required',
                path
            });
            if (!doNotStopOnFirstError) {
                preprocessingTransaction.rollback();
                return {
                    valid: false,
                    errors: [errors[0]],
                    context: resultingContext
                };
            }
        }

        if (errors.length > 0) {
            return {
                valid: false,
                errors: errors
                    .filter((e) => e)
                    .filter((e, i) => (doNotStopOnFirstError ? true : i === 0)),
                context: resultingContext,
                transaction: preprocessingTransaction
            };
        }

        return {
            valid: true,
            context: resultingContext,
            transaction: preprocessingTransaction
        };
    }

    /**
     * Generates a serializable object describing the defined schema
     */
    public introspect() {
        return {
            /**
             * String `id` of schema type, e.g. `string', `number` or `object`.
             */
            type: this.type,
            /**
             * If set to `false`, schema will be optional (`null` or `undefined` values
             * will be considered as valid).
             */
            isRequired: this.#isRequired,
            /**
             * Array of preprocessor functions
             */
            preprocessors: [
                ...this.preprocessors
            ] as readonly Preprocessor<TResult>[],
            /**
             * Array of validator functions
             */
            validators: [...this.validators] as readonly Validator<TResult>[]
        };
    }

    /**
     * Makes schema optional (consider `null` and `undefined` as valid objects for this schema)
     */
    public optional() {
        return this.createFromProps({
            ...this.introspect(),
            isRequired: false
        }) as any;
    }

    /**
     * Makes schema required (consider `null` and `undefined` as invalid objects for this schema)
     */
    public required() {
        return this.createFromProps({
            ...this.introspect(),
            isRequired: true
        }) as any;
    }

    /**
     * Adds a `preprocessor` to a preprocessors list
     */
    public addPreprocessor(preprocessor: Preprocessor<TResult>): this {
        if (typeof preprocessor !== 'function') {
            throw new Error('preprocessor must be a function');
        }
        return this.createFromProps({
            ...this.introspect(),
            preprocessors: [...this.preprocessors, preprocessor]
        });
    }

    /**
     * Remove all preprocessors for this schema.
     */
    public clearPreprocessors(): this {
        return this.createFromProps({
            ...this.introspect(),
            preprocessors: []
        });
    }

    /**
     * Adds a `validator` to validators list.
     */
    public addValidator(validator: Validator<TResult>): this {
        if (typeof validator !== 'function') {
            throw new Error('validator must be a function');
        }
        return this.createFromProps({
            ...this.introspect(),
            validators: [...this.validators, validator]
        });
    }

    /**
     * Remove all validators for this schema.
     */
    public clearValidators(): this {
        return this.createFromProps({
            ...this.introspect(),
            validators: []
        });
    }

    /**
     * Perform schema validation on `object`.
     */
    public abstract validate(
        /**
         * Object to validate
         */
        object: any,
        /**
         * Optional `ValidationContext` settings
         */
        context?: ValidationContext
    ): Promise<ValidationResult<any>>;

    protected async getValidationErrorMessage(
        provider: ValidationErrorMessageProvider,
        seenValue: TResult
    ): Promise<string> {
        if (typeof provider === 'string') {
            return provider;
        }

        if (typeof provider === 'function') {
            return provider(seenValue, this);
        }

        throw new Error(
            'Invalid error message provider must be a string or a function returning a string or a promise of a string'
        );
    }

    protected assureValidationErrorMessageProvider(
        provider: ValidationErrorMessageProvider | undefined,
        defaultValue: ValidationErrorMessageProvider
    ): ValidationErrorMessageProvider<any> {
        if (typeof provider === 'string') {
            return provider;
        }
        if (typeof provider === 'function') {
            return provider.bind(this);
        }

        if (typeof defaultValue === 'function') {
            return defaultValue.bind(this);
        }

        return defaultValue;
    }

    protected constructor(props: SchemaBuilderProps<TResult>) {
        const { type, preprocessors, validators, isRequired } = props;
        this.type = type;
        if (typeof isRequired === 'boolean') this.isRequired = isRequired;
        if (Array.isArray(preprocessors)) {
            this.#preprocessors = [...preprocessors];
        }

        if (Array.isArray(validators)) {
            this.#validators = [...validators];
        }
    }
}
