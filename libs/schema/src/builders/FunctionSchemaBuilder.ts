import {
    type BRAND,
    type InferType,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type FunctionSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<FunctionSchemaBuilder<R>['introspect']>
>;

type InferParameters<
    TParams extends SchemaBuilder<any, any, any, any, any>[]
> = {
    [K in keyof TParams]: InferType<TParams[K]>;
};

/**
 * Schema builder for functions. Allows to define a schema for a function.
 * It can be: required or optional.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link func | func()} function instead.
 *
 * @example
 * ```ts
 * const schema = func();
 * const result = schema.validate(() => {});
 * // result.valid === true
 * // result.object === () => {}
 * ```
 *
 * @example
 * ```ts
 * const schema = func().optional();
 * const result = schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @see {@link func}
 */
export class FunctionSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TParameters extends SchemaBuilder<any, any, any, any, any>[] = [],
    TReturnTypeSchema extends
        | SchemaBuilder<any, any, any, any, any>
        | undefined = undefined,
    TResult = TExplicitType extends undefined
        ? (
              ...args: InferParameters<TParameters>
          ) => TReturnTypeSchema extends SchemaBuilder<any, any, any, any, any>
              ? InferType<TReturnTypeSchema>
              : any
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #parameters: SchemaBuilder<any, any, any, any, any>[] = [];
    #returnType?: SchemaBuilder<any, any, any, any, any>;

    /**
     * @hidden
     */
    public static create(props: FunctionSchemaBuilderCreateProps<any>) {
        return new FunctionSchemaBuilder({
            type: 'function',
            ...props
        });
    }

    protected constructor(props: FunctionSchemaBuilderCreateProps<TRequired>) {
        super(props as any);

        if (Array.isArray(props.parameters)) {
            this.#parameters = props.parameters.filter(
                (p) => p instanceof SchemaBuilder
            );
        }

        if (props.returnType instanceof SchemaBuilder) {
            this.#returnType = props.returnType;
        }
    }

    /**
     * @hidden
     */
    public hasType<T>(
        _notUsed?: T
    ): FunctionSchemaBuilder<
        true,
        TNullable,
        T,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * Returns an object describing the schema configuration.
     */
    public introspect() {
        return {
            ...super.introspect(),
            /**
             * List of parameter schemas added via `addParameter()`
             */
            parameters: [...this.#parameters],
            /**
             * Return type schema set via `hasReturnType()`, or `undefined` if not set
             */
            returnType: this.#returnType
        };
    }

    #buildResult(
        superResult: ReturnType<FunctionSchemaBuilder['preValidateSync']>
    ): ValidationResult<TResult> {
        const {
            valid,
            transaction: preValidationTransaction,
            errors
        } = superResult;

        if (!valid) {
            return { valid, errors };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' && !this.isRequired) ||
            (objToValidate === null && (!this.isRequired || this.isNullable))
        ) {
            return {
                valid: true,
                object: objToValidate
            };
        }

        if (typeof objToValidate !== 'function') {
            return {
                valid: false,
                errors: [
                    {
                        message: `expected type function, but saw ${typeof objToValidate}`
                    }
                ]
            };
        }

        return {
            valid: true,
            object: objToValidate
        };
    }

    /** {@inheritDoc SchemaBuilder.validate} */
    public validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        return super.validate(object, context) as ValidationResult<TResult>;
    }

    /** {@inheritDoc SchemaBuilder.validateAsync} */
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return super.validateAsync(object, context) as Promise<
            ValidationResult<TResult>
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
    ): ValidationResult<TResult> {
        return this.#buildResult(this.preValidateSync(object, context));
    }

    /**
     * Performs async validation of the schema over `object`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional `ValidationContext` settings.
     */
    protected async _validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return this.#buildResult(await super.preValidateAsync(object, context));
    }

    protected createFromProps<TReq extends boolean>(
        props: FunctionSchemaBuilderCreateProps<TReq>
    ): this {
        return FunctionSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): FunctionSchemaBuilder<
        true,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): FunctionSchemaBuilder<
        false,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): FunctionSchemaBuilder<
        true,
        TNullable,
        TExplicitType,
        true,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        TExplicitType,
        false,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * Marks the inferred type as `Readonly<Function>`. Sets the
     * `isReadonly` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    public readonly(): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        Readonly<TResult>,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.readonly();
    }

    /**
     * @hidden
     */
    public nullable(): FunctionSchemaBuilder<
        TRequired,
        true,
        TExplicitType,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * Adds a parameter schema to the function schema.
     * Each call appends the given schema to the list of parameter schemas.
     * The accumulated list is available via `introspect().parameters`.
     * The inferred function type is updated to include the parameter type.
     *
     * @param schema The schema describing the parameter.
     */
    public addParameter<
        TSchema extends SchemaBuilder<any, any, any, any, any>
    >(
        schema: TSchema
    ): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        [...TParameters, TSchema],
        TReturnTypeSchema
    > &
        TExtensions {
        return FunctionSchemaBuilder.create({
            ...this.introspect(),
            parameters: [...this.#parameters, schema]
        } as any) as any;
    }

    /**
     * Sets the return type schema for the function schema.
     * The schema is available via `introspect().returnType`.
     * The inferred function type is updated to reflect the return type.
     *
     * @param schema The schema describing the return type.
     */
    public hasReturnType<
        TSchema extends SchemaBuilder<any, any, any, any, any>
    >(
        schema: TSchema
    ): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TParameters,
        TSchema
    > &
        TExtensions {
        return FunctionSchemaBuilder.create({
            ...this.introspect(),
            returnType: schema
        } as any) as any;
    }

    /**
     * @hidden
     */
    public notNullable(): FunctionSchemaBuilder<
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions,
        TParameters,
        TReturnTypeSchema
    > &
        TExtensions {
        return super.notNullable() as any;
    }
}

/**
 * Creates a `function` schema.
 * @returns {@link FunctionSchemaBuilder}
 */
export const func = () =>
    FunctionSchemaBuilder.create({
        isRequired: true
    }) as FunctionSchemaBuilder<true>;

