// import { transaction } from '../utils/transaction.js';

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
export type MakeRequired<T> = NonNullable<T>;
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

export type PreValidationResult<T> = ValidationResult<T> & {
    context: ValidationContext;
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

export abstract class SchemaBuilder<
    TResult = any,
    TRequired extends boolean = true
> {
    #isRequired = true;
    #preprocessors: Preprocessor<TResult>[] = [];
    #validators: Validator<TResult>[] = [];
    #type = 'base';

    public abstract hasType<T>(notUsed?: T);
    public abstract clearHasType();
    protected abstract createFromProps(props): this;

    protected get type() {
        return this.#type;
    }

    protected set type(value: string) {
        if (typeof value !== 'string' || !value)
            throw new Error('value should be non empty string');
        this.#type = value;
    }

    protected get preprocessors() {
        return this.#preprocessors;
    }

    protected get validators() {
        return this.#validators;
    }

    public introspect() {
        return {
            type: this.type,
            isRequired: this.#isRequired,
            preprocessors: [
                ...this.preprocessors
            ] as readonly Preprocessor<TResult>[],
            validators: [...this.validators] as readonly Validator<TResult>[]
        };
    }

    public optional() {
        return this.createFromProps({
            ...this.introspect(),
            isRequired: false
        }) as any;
    }

    public required() {
        return this.createFromProps({
            ...this.introspect(),
            isRequired: true
        }) as any;
    }

    protected get isRequired(): TRequired {
        return this.#isRequired as TRequired;
    }

    protected set isRequired(value: boolean) {
        if (typeof value !== 'boolean')
            throw new Error('should be a boolean value');
        this.#isRequired = value as any;
    }

    public addPreprocessor(preprocessor: Preprocessor<TResult>): this {
        if (typeof preprocessor !== 'function') {
            throw new Error('preprocessor must be a function');
        }
        return this.createFromProps({
            ...this.introspect(),
            preprocessors: [...this.preprocessors, preprocessor]
        });
    }

    public clearPreprocessors(): this {
        return this.createFromProps({
            ...this.introspect(),
            preprocessors: []
        });
    }

    public addValidator(validator: Validator<TResult>): this {
        if (typeof validator !== 'function') {
            throw new Error('validator must be a function');
        }
        return this.createFromProps({
            ...this.introspect(),
            validators: [...this.validators, validator]
        });
    }

    public clearValidators(): this {
        return this.createFromProps({
            ...this.introspect(),
            validators: []
        });
    }

    public abstract validate(
        /**
         * Object to validate
         */
        object: any,
        context?: ValidationContext
    ): Promise<ValidationResult<any>>;

    protected async preValidate(
        /**
         * Object to validate
         */
        object: any,
        context?: ValidationContext
    ): Promise<PreValidationResult<any>> {
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

        let preprocessedObject = object;

        let errors: ValidationError[] = [];

        if (Array.isArray(this.preprocessors)) {
            let currentPrepropIndex = 0;
            for (const preprocessor of this.preprocessors) {
                try {
                    preprocessedObject = await Promise.resolve(
                        preprocessor(preprocessedObject)
                    );
                } catch (err) {
                    errors.push({
                        message: `Preprocessor #${currentPrepropIndex}${
                            preprocessor.name ? ` (${preprocessor.name})` : ''
                        } thrown an error: ${(err as Error).message}`,
                        path: `${path}($preprocessors[${currentPrepropIndex}])`
                    });
                    if (!doNotStopOnFirstError) {
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
                context: resultingContext
            };
        }

        return {
            valid: true,
            context: resultingContext,
            object: preprocessedObject
        };
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
