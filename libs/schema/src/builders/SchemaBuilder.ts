import { Transaction, transaction } from '../utils/transaction.js';

export type InferType<T> = T extends SchemaBuilder<
    infer TResult,
    infer TRequired
>
    ? T extends {
          optimize: (
              ...args: any[]
          ) => SchemaBuilder<infer TOptimizedType, infer TOptimizedRequired>;
      }
        ? TOptimizedRequired extends true
            ? TOptimizedType
            : MakeOptional<TOptimizedType>
        : TRequired extends true
        ? TResult
        : MakeOptional<TResult>
    : T;

export type ValidationError = { path: string; message: string };
export type MakeOptional<T> = { prop?: T }['prop'];

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

export type ValidationContext = {
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
};

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
