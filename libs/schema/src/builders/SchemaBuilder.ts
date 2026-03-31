import { type Transaction, transaction } from '../utils/transaction.js';
import type { ArraySchemaBuilder } from './ArraySchemaBuilder.js';
import type { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';

/** @internal Symbol used as the key for the type brand on schema builders. */
declare const __type: unique symbol;
/** @internal */
export type SchemaTypeBrand = typeof __type;

/** Symbol used as the key for branded/opaque types. */
declare const __brand: unique symbol;
/** Symbol used as the key for branded/opaque types. */
export type BRAND = typeof __brand;

/**
 * Intersects a base type with a phantom brand tag.
 * The brand exists only at the type level — zero runtime cost.
 *
 * @example
 * ```ts
 * type Email = Brand<string, 'Email'>;
 * type UserId = Brand<number, 'UserId'>;
 * ```
 */
export type Brand<T, TBrand extends string | symbol> = T & {
    readonly [K in BRAND]: TBrand;
};

/**
 * Infers the TypeScript type that a `SchemaBuilder` instance validates.
 * Takes into account type optimizations (via `optimize()`) and whether the schema is optional.
 *
 * @example
 * ```ts
 * const userSchema = object({ name: string(), age: number().optional() });
 * type User = InferType<typeof userSchema>;
 * // { name: string; age?: number }
 * ```
 */
export type InferType<T> = T extends {
    optimize: (...args: any[]) => {
        readonly [K in SchemaTypeBrand]: infer TOptimized;
    };
}
    ? TOptimized
    : T extends { readonly [K in SchemaTypeBrand]: infer TType }
      ? TType
      : T;

/**
 * Represents a single validation error with the path to the invalid field
 * and a human-readable error message.
 */
export type ValidationError = { path: string; message: string };

/**
 * Used to represent a validation result for nested
 * objects/properties. Contains a list of errors and
 * the value that caused them.
 */
export type NestedValidationResult<
    TSchema,
    TRootSchema extends ObjectSchemaBuilder<any, any, any, any>,
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

/**
 * Utility type that makes a value `T` optional (i.e. `T | undefined`).
 * Used internally by {@link InferType} to represent optional schema fields.
 */
export type MakeOptional<T> = { prop?: T }['prop'];

/**
 * Type of the function that provides a validation error message for
 * the given `seenValue` and `schema`. Can be a string or a function
 * returning a string or a promise of a string.
 * Should be used to provide a custom validation error message.
 */
export type ValidationErrorMessageProvider<
    TSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>
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

/**
 * Error thrown by {@link SchemaBuilder.parse | parse()} and
 * {@link SchemaBuilder.parseAsync | parseAsync()} when validation fails.
 * Carries the full array of {@link ValidationError | validation errors}.
 */
export class SchemaValidationError extends Error {
    public readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        const message =
            errors.length > 0
                ? errors.map((e) => `${e.path}: ${e.message}`).join('; ')
                : 'Validation failed';
        super(message);
        this.name = 'SchemaValidationError';
        this.errors = errors;
    }
}

/**
 * Internal result returned by the `preValidate` step of `SchemaBuilder`.
 * Contains the validation context, any early errors, and the transaction
 * wrapping the (possibly preprocessed) value.
 */
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

/**
 * A function that transforms the value before validation.
 * Preprocessors run in order before validators and can modify or replace the value.
 *
 * @param object - the current value to preprocess
 * @returns the transformed value, or a Promise resolving to it
 */
export type Preprocessor<T> = (object: T) => Promise<T> | T;

/**
 * A custom validation function that checks a value and returns a result
 * indicating whether the value is valid, along with optional error messages.
 *
 * @param object - the value to validate
 * @returns a result with `valid` boolean and optional `errors` array, or a Promise resolving to it
 */
export type Validator<T> = (
    object: T
) => Promise<ValidatorResult<T>> | ValidatorResult<T>;

/**
 * Configuration properties used to construct a `SchemaBuilder` instance.
 * Contains the schema type identifier, requirement flag, and lists of
 * preprocessors and validators.
 */
export type SchemaBuilderProps<T> = {
    type: string;
    isRequired?: boolean;
    preprocessors: Preprocessor<T>[];
    validators: Validator<T>[];
    requiredValidationErrorMessageProvider?: ValidationErrorMessageProvider;
    extensions?: Record<string, unknown>;
};

export type ValidationContext<
    TSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>
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
    rootPropertyDescriptor?: TSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any
    >
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

/**
 * Extracts the inner property descriptor type from a `PropertyDescriptor`.
 * Returns `undefined` if `T` is not a valid `PropertyDescriptor`.
 */
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
    TSchema extends ObjectSchemaBuilder<any, any, any, any>,
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

/**
 * A wrapper object keyed by {@link SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR} that
 * holds a {@link PropertyDescriptorInner} for a particular property within
 * an object schema. Used to get/set property values on validated objects.
 */
export type PropertyDescriptor<
    TRootSchema extends ObjectSchemaBuilder<any, any, any, any>,
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
    TSchema extends ObjectSchemaBuilder<any, any, any, any>,
    TRootSchema extends ObjectSchemaBuilder<any, any, any, any> = TSchema,
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
                  : TProperties[K] extends ArraySchemaBuilder<
                          infer TArrayElement,
                          any,
                          any
                      >
                    ? TArrayElement extends ObjectSchemaBuilder<
                          any,
                          any,
                          any,
                          any
                      >
                        ? PropertyDescriptor<
                              TRootSchema,
                              TProperties[K],
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
                          : never
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
 * Creates an array augmented with non-enumerable NestedValidationResult
 * properties (`seenValue`, `errors`, `isValid`, `descriptor`).
 * Used by UnionSchemaBuilder and ArraySchemaBuilder to return hybrid
 * arrays from `getErrorsFor()`.
 */
export function createHybridErrorArray<T extends any[]>(
    items: T,
    seenValue: () => any,
    errors: () => ReadonlyArray<string>,
    descriptor: () => any
): T {
    Object.defineProperties(items, {
        seenValue: {
            get: seenValue,
            enumerable: false
        },
        errors: {
            get: errors,
            enumerable: false
        },
        isValid: {
            get: () => errors().length === 0,
            enumerable: false
        },
        descriptor: {
            get: descriptor,
            enumerable: false
        }
    });
    return items;
}

/**
 * Base class for all schema builders. Provides basic functionality for schema building.
 *
 * **Note:** this class is not intended to be used directly, use one of the subclasses instead.
 * @typeparam TResult Type of the object that will be returned by `validate()` method.
 * @typeparam TRequired If `true`, object will be required. If `false`, object will be optional.
 */
export abstract class SchemaBuilder<
    TResult = any,
    TRequired extends boolean = true,
    // biome-ignore lint/correctness/noUnusedVariables: used in extensions
    TExtensions = {}
> {
    #isRequired = true;
    #preprocessors: Preprocessor<TResult>[] = [];
    #validators: Validator<TResult>[] = [];
    #extensions: Record<string, unknown> = {};
    #type = 'base';
    #defaultRequiredErrorMessageProvider: ValidationErrorMessageProvider =
        'is required';
    #requiredErrorMessageProvider: ValidationErrorMessageProvider =
        'is required';

    /**
     * Type-level brand encoding the inferred type of this schema.
     * Not emitted at runtime — used only by {@link InferType}.
     * @internal
     */
    declare readonly [__type]: TRequired extends true
        ? TResult
        : MakeOptional<TResult>;

    /**
     * Set type of schema explicitly. `notUsed` param is needed only for case when JS is used. E.g. when you
     * can't call method like `schema.hasType<Date>()`, so instead you can call `schema.hasType(new Date())`
     * with the same result.
     */
    public abstract hasType<T>(notUsed?: T): any;

    /**
     * Clears type set by call to `.hasType<T>()`, default schema type inference will be used
     * for schema returned by this call.
     */
    public abstract clearHasType(): any;

    /**
     * Protected method used to create a new instance of the Builder
     * defined by the `props` object. Should be used to instantiate new
     * builders to keep builder's immutability.
     * @param props arbitrary props object
     */
    protected abstract createFromProps(props: any): this;

    /**
     * The string identifier of the schema type (e.g. `'string'`, `'number'`, `'object'`).
     */
    protected get type() {
        return this.#type;
    }

    /**
     * Sets the schema type identifier. Must be a non-empty string.
     */
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

    /**
     * Whether the schema requires a non-null/non-undefined value.
     */
    protected get isRequired(): TRequired {
        return this.#isRequired as TRequired;
    }

    /**
     * Sets the requirement flag. Must be a boolean.
     */
    protected set isRequired(value: boolean) {
        if (typeof value !== 'boolean')
            throw new Error('should be a boolean value');
        this.#isRequired = value as any;
    }

    /**
     * Shared setup for both {@link preValidateSync} and {@link preValidateAsync}.
     * Builds the validation context, creates the initial transaction, and
     * returns mutable state for the caller to drive.
     */
    #initPreValidation(object: any, context?: ValidationContext) {
        const doNotStopOnFirstError = context?.doNotStopOnFirstError ?? false;

        const path =
            typeof context?.path === 'string' && context.path
                ? context.path
                : '$';

        const resultingContext: ValidationContext = {
            path,
            doNotStopOnFirstError,
            rootPropertyDescriptor: context?.rootPropertyDescriptor,
            currentPropertyDescriptor: context?.currentPropertyDescriptor
        };

        return {
            path,
            doNotStopOnFirstError,
            resultingContext,
            transaction: transaction({ validatedObject: object }),
            errors: [] as ValidationError[]
        };
    }

    /**
     * Builds the failed early-return result used when
     * `doNotStopOnFirstError` is false.
     */
    #earlyFailResult(
        errors: ValidationError[],
        resultingContext: ValidationContext
    ): PreValidationResult<any, { validatedObject: any }> {
        return {
            valid: false,
            errors: [errors[0]].filter((e) => e),
            context: resultingContext
        };
    }

    /**
     * Builds the error entries for a validator that reported `valid: false`.
     */
    #validatorFailureErrors(
        index: number,
        name: string | undefined,
        validatorErrors: Omit<ValidationError, 'path'>[] | undefined,
        path: string
    ): ValidationError[] {
        if (Array.isArray(validatorErrors) && validatorErrors.length) {
            return validatorErrors.map((err) => ({
                message: err.message,
                path: `${path}($validators[${index}])`
            }));
        }
        return [
            {
                message: `Validator #${index}${
                    name ? ` (${name})` : ''
                } didn't pass.`,
                path: `${path}($validators[${index}])`
            }
        ];
    }

    /**
     * Assembles the final {@link PreValidationResult} after all preprocessors,
     * validators, and the required check have run.
     */
    #buildPreValidationResult(
        errors: ValidationError[],
        doNotStopOnFirstError: boolean,
        resultingContext: ValidationContext,
        trans: Transaction<{ validatedObject: any }>
    ): PreValidationResult<any, { validatedObject: any }> {
        if (errors.length > 0) {
            return {
                valid: false,
                errors: errors
                    .filter((e) => e)
                    .filter((_e, i) =>
                        doNotStopOnFirstError ? true : i === 0
                    ),
                context: resultingContext,
                transaction: trans
            };
        }

        return {
            valid: true,
            context: resultingContext,
            transaction: trans
        };
    }

    /**
     * Synchronous version of {@link preValidateAsync}.
     * Throws at runtime if any preprocessor or validator returns a Promise.
     *
     * @param object - the value to pre-validate
     * @param context - optional validation context settings
     * @returns a `PreValidationResult` containing the preprocessed transaction, context, and any errors
     * @throws Error if a preprocessor or validator returns a Promise (use {@link preValidateAsync} instead)
     */
    protected preValidateSync(
        object: any,
        context?: ValidationContext
    ): PreValidationResult<any, { validatedObject: any }> {
        const state = this.#initPreValidation(object, context);
        const { path, doNotStopOnFirstError, resultingContext, errors } = state;
        let preprocessingTransaction = state.transaction;
        let preprocessedObject =
            preprocessingTransaction.object.validatedObject;

        if (Array.isArray(this.preprocessors)) {
            let currentPrepropIndex = 0;
            for (const preprocessor of this.preprocessors) {
                try {
                    const result = preprocessor(preprocessedObject);
                    if (result instanceof Promise) {
                        throw new Error(
                            `Preprocessor #${currentPrepropIndex}${preprocessor.name ? ` (${preprocessor.name})` : ''} returned a Promise. Use validateAsync() for schemas with async preprocessors.`
                        );
                    }
                    preprocessingTransaction = transaction({
                        validatedObject: result
                    });
                    preprocessedObject =
                        preprocessingTransaction.object.validatedObject;
                } catch (err) {
                    if (
                        (err as Error).message?.includes('Use validateAsync()')
                    ) {
                        throw err;
                    }
                    errors.push({
                        message: `Preprocessor #${currentPrepropIndex}${
                            preprocessor.name ? ` (${preprocessor.name})` : ''
                        } thrown an error: ${(err as Error).message}`,
                        path: `${path}($preprocessors[${currentPrepropIndex}])`
                    });
                    if (!doNotStopOnFirstError) {
                        preprocessingTransaction.rollback();
                        return this.#earlyFailResult(errors, resultingContext);
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
                    const validatorResult = validator(preprocessedObject);
                    if (validatorResult instanceof Promise) {
                        throw new Error(
                            `Validator #${currentValidatorIndex}${validator.name ? ` (${validator.name})` : ''} returned a Promise. Use validateAsync() for schemas with async validators.`
                        );
                    }
                    const { valid, errors: validatorErrors } = validatorResult;
                    if (!valid) {
                        errors.push(
                            ...this.#validatorFailureErrors(
                                currentValidatorIndex,
                                validator.name,
                                validatorErrors,
                                path
                            )
                        );
                        if (!doNotStopOnFirstError) {
                            preprocessingTransaction.rollback();
                            return this.#earlyFailResult(
                                errors,
                                resultingContext
                            );
                        }
                    }
                } catch (err) {
                    if (
                        (err as Error).message?.includes('Use validateAsync()')
                    ) {
                        throw err;
                    }
                    errors.push({
                        message: `Validator #${currentValidatorIndex}${
                            validator.name ? ` (${validator.name})` : ''
                        } thrown an error: ${(err as Error).message}`,
                        path: `${path}($validators[${currentValidatorIndex}])`
                    });
                    if (!doNotStopOnFirstError) {
                        preprocessingTransaction.rollback();
                        return this.#earlyFailResult(errors, resultingContext);
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
                message: this.getValidationErrorMessageSync(
                    this.#requiredErrorMessageProvider,
                    preprocessedObject
                ),
                path
            });
            if (!doNotStopOnFirstError) {
                preprocessingTransaction.rollback();
                return this.#earlyFailResult(errors, resultingContext);
            }
        }

        return this.#buildPreValidationResult(
            errors,
            doNotStopOnFirstError,
            resultingContext,
            preprocessingTransaction
        );
    }

    /**
     * Async version of pre-validation. Runs preprocessors, validators, and the
     * required/optional check on `object`. Supports async preprocessors,
     * validators, and error message providers.
     *
     * @param object - the value to pre-validate
     * @param context - optional validation context settings
     * @returns a `PreValidationResult` containing the preprocessed transaction, context, and any errors
     */
    protected async preValidateAsync(
        object: any,
        context?: ValidationContext
    ): Promise<PreValidationResult<any, { validatedObject: any }>> {
        const state = this.#initPreValidation(object, context);
        const { path, doNotStopOnFirstError, resultingContext, errors } = state;
        let preprocessingTransaction = state.transaction;
        let preprocessedObject =
            preprocessingTransaction.object.validatedObject;

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
                        return this.#earlyFailResult(errors, resultingContext);
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
                        errors.push(
                            ...this.#validatorFailureErrors(
                                currentValidatorIndex,
                                validator.name,
                                validatorErrors,
                                path
                            )
                        );
                        if (!doNotStopOnFirstError) {
                            preprocessingTransaction.rollback();
                            return this.#earlyFailResult(
                                errors,
                                resultingContext
                            );
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
                        return this.#earlyFailResult(errors, resultingContext);
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
                message: await this.getValidationErrorMessage(
                    this.#requiredErrorMessageProvider,
                    preprocessedObject
                ),
                path
            });
            if (!doNotStopOnFirstError) {
                preprocessingTransaction.rollback();
                return this.#earlyFailResult(errors, resultingContext);
            }
        }

        return this.#buildPreValidationResult(
            errors,
            doNotStopOnFirstError,
            resultingContext,
            preprocessingTransaction
        );
    }

    /**
     * @deprecated Use {@link preValidateAsync} instead. This alias will be removed in a future version.
     */
    protected preValidate(
        object: any,
        context?: ValidationContext
    ): Promise<PreValidationResult<any, { validatedObject: any }>> {
        return this.preValidateAsync(object, context);
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
            validators: [...this.validators] as readonly Validator<TResult>[],
            /**
             * Custom error message provider for the 'is required' validation error.
             */
            requiredValidationErrorMessageProvider:
                this.#requiredErrorMessageProvider,
            /**
             * Extension metadata. Stores custom state set by schema extensions.
             */
            extensions: { ...this.#extensions }
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
     * Brands the schema with a phantom type tag, preventing structural mixing
     * of semantically different values at the type level. Zero runtime cost.
     *
     * The optional `_name` parameter is only needed when using plain JavaScript
     * (where generic type parameters are unavailable). In TypeScript, prefer
     * the generic form: `schema.brand<'Email'>()`.
     *
     * @example
     * ```ts
     * const Email = string().brand<'Email'>();
     * const Username = string().brand<'Username'>();
     * type Email = InferType<typeof Email>;     // string & { readonly [BRAND]: 'Email' }
     * type Username = InferType<typeof Username>; // string & { readonly [BRAND]: 'Username' }
     * ```
     */
    public brand<TBrand extends string | symbol>(_name?: TBrand) {
        return this.createFromProps({
            ...this.introspect()
        }) as any;
    }

    /**
     * Makes schema required (consider `null` and `undefined` as invalid objects for this schema)
     * @param errorMessage - optional custom error message or provider for the 'is required' validation error
     */
    public required(errorMessage?: ValidationErrorMessageProvider) {
        return this.createFromProps({
            ...this.introspect(),
            isRequired: true,
            ...(errorMessage !== undefined
                ? {
                      requiredValidationErrorMessageProvider:
                          this.assureValidationErrorMessageProvider(
                              errorMessage,
                              this.#defaultRequiredErrorMessageProvider
                          )
                  }
                : {})
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
     * Perform synchronous schema validation on `object`.
     * Throws at runtime if any preprocessor, validator, or error message
     * provider returns a Promise — use {@link validateAsync} instead.
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
    ): ValidationResult<any>;

    /**
     * Perform asynchronous schema validation on `object`.
     * Supports async preprocessors, validators, and error message providers.
     */
    public abstract validateAsync(
        /**
         * Object to validate
         */
        object: any,
        /**
         * Optional `ValidationContext` settings
         */
        context?: ValidationContext
    ): Promise<ValidationResult<any>>;

    /**
     * Synchronously resolves a `ValidationErrorMessageProvider` to a string.
     * Throws if the provider function returns a Promise.
     *
     * @param provider - the error message provider (string or sync function)
     * @param seenValue - the value that caused the validation error
     * @returns the resolved error message string
     * @throws Error if the provider returns a Promise (use {@link getValidationErrorMessage} with {@link validateAsync})
     */
    protected getValidationErrorMessageSync(
        provider: ValidationErrorMessageProvider<any>,
        seenValue: TResult
    ): string {
        if (typeof provider === 'string') {
            return provider;
        }

        if (typeof provider === 'function') {
            const result = provider(seenValue, this);
            if (result instanceof Promise) {
                throw new Error(
                    'Async error message providers require validateAsync(). Use a string or sync function instead.'
                );
            }
            return result;
        }

        throw new Error(
            'Invalid error message provider must be a string or a function returning a string'
        );
    }

    /**
     * Resolves a `ValidationErrorMessageProvider` to a string error message.
     * Handles both string providers and function providers (sync or async).
     *
     * @param provider - the error message provider (string or function)
     * @param seenValue - the value that caused the validation error
     * @returns the resolved error message string
     */
    protected async getValidationErrorMessage(
        provider: ValidationErrorMessageProvider<any>,
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

    /**
     * Ensures a `ValidationErrorMessageProvider` is valid.
     * If `provider` is `undefined`, falls back to `defaultValue`.
     * Function providers are bound to `this` for access to schema state.
     *
     * @param provider - the provider to validate, or `undefined`
     * @param defaultValue - fallback provider when `provider` is not supplied
     * @returns a valid `ValidationErrorMessageProvider`
     */
    protected assureValidationErrorMessageProvider(
        provider: ValidationErrorMessageProvider<any> | undefined,
        defaultValue: ValidationErrorMessageProvider<any>
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

    /**
     * Sets extension metadata by key. Returns a new schema instance with the
     * extension data stored. The data survives fluent chaining.
     * @internal Used by extension authors inside `defineExtension()` callbacks.
     */
    public withExtension(key: string, value: unknown): this {
        return this.createFromProps({
            ...this.introspect(),
            extensions: {
                ...this.#extensions,
                [key]: value
            }
        });
    }

    /**
     * Retrieves extension metadata by key.
     * @internal Used by extension authors inside `defineExtension()` callbacks.
     */
    public getExtension(key: string): unknown {
        return this.#extensions[key];
    }

    /**
     * Synchronously validates the value and returns it if valid.
     * Throws a {@link SchemaValidationError} if validation fails.
     *
     * @param object - the value to parse
     * @param context - optional validation context
     * @returns the validated value
     * @throws SchemaValidationError if validation fails
     * @throws Error if the schema contains async preprocessors, validators, or error message providers
     */
    public parse(object: any, context?: ValidationContext): TResult {
        const result = this.validate(object, context);
        if (!result.valid) {
            throw new SchemaValidationError(result.errors || []);
        }
        return result.object as TResult;
    }

    /**
     * Asynchronously validates the value and returns it if valid.
     * Throws a {@link SchemaValidationError} if validation fails.
     *
     * @param object - the value to parse
     * @param context - optional validation context
     * @returns the validated value
     * @throws SchemaValidationError if validation fails
     */
    public async parseAsync(
        object: any,
        context?: ValidationContext
    ): Promise<TResult> {
        const result = await this.validateAsync(object, context);
        if (!result.valid) {
            throw new SchemaValidationError(result.errors || []);
        }
        return result.object as TResult;
    }

    /**
     * Alias for {@link validate}. Synchronously validates and returns a result object.
     * Provided for familiarity with the zod API.
     */
    public safeParse(
        object: any,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        return this.validate(object, context) as ValidationResult<TResult>;
    }

    /**
     * Alias for {@link validateAsync}. Asynchronously validates and returns a result object.
     * Provided for familiarity with the zod API.
     */
    public safeParseAsync(
        object: any,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return this.validateAsync(object, context) as Promise<
            ValidationResult<TResult>
        >;
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

        if (typeof props.extensions === 'object' && props.extensions) {
            this.#extensions = { ...props.extensions };
        }

        this.#requiredErrorMessageProvider =
            this.assureValidationErrorMessageProvider(
                props.requiredValidationErrorMessageProvider,
                this.#defaultRequiredErrorMessageProvider
            );
    }
}
