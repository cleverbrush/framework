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

type InferParameters<TParams extends SchemaBuilder<any, any, any, any, any>[]> =
    {
        [K in keyof TParams]: InferType<TParams[K]>;
    };

/**
 * Schema builder for functions. Allows to define a schema for a function.
 * It can be required or optional, and may carry typed parameter and return-type
 * schemas so that the inferred TypeScript function signature is fully typed.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link func | func()} function instead.
 *
 * @example Basic validation
 * ```ts
 * const schema = func();
 * const result = schema.validate(() => {});
 * // result.valid === true
 * // result.object === () => {}
 * ```
 *
 * @example Optional function schema
 * ```ts
 * const schema = func().optional();
 * const result = schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @example Typed parameters and return type
 * ```ts
 * import { func, string, number, InferType } from '@cleverbrush/schema';
 *
 * const greet = func()
 *     .addParameter(string())           // first param: string
 *     .addParameter(number().optional()) // second param: number | undefined
 *     .hasReturnType(string());          // return type: string
 *
 * type Greet = InferType<typeof greet>;
 * // → (param0: string, param1: number | undefined) => string
 *
 * // Introspect at runtime
 * const info = greet.introspect();
 * // info.parameters  → [StringSchemaBuilder, NumberSchemaBuilder]
 * // info.returnType  → StringSchemaBuilder
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
              ...args: TParameters extends []
                  ? any[]
                  : InferParameters<TParameters>
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
                p => p instanceof SchemaBuilder
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
     * Returns an object describing the current schema configuration.
     *
     * In addition to the base fields exposed by {@link SchemaBuilder.introspect},
     * the following fields are included:
     *
     * - `parameters` — an array of {@link SchemaBuilder} instances accumulated via
     *   {@link addParameter}. Each element describes one positional parameter of the
     *   function in the order they were added.
     * - `returnType` — the {@link SchemaBuilder} set via {@link hasReturnType}, or
     *   `undefined` when no return-type schema has been configured.
     *
     * @example
     * ```ts
     * const schema = func()
     *     .addParameter(string())
     *     .addParameter(number())
     *     .hasReturnType(boolean());
     *
     * const info = schema.introspect();
     * // info.parameters.length === 2
     * // info.returnType instanceof BooleanSchemaBuilder
     * ```
     */
    public introspect() {
        return {
            ...super.introspect(),
            /** List of parameter schemas added via {@link addParameter}. */
            parameters: [...this.#parameters],
            /** Return type schema set via {@link hasReturnType}, or `undefined` if not set. */
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
     * Appends a positional parameter schema to the function schema.
     *
     * Each call extends the inferred function signature by one parameter.
     * The full list of parameter schemas is available at runtime via
     * `introspect().parameters`.
     *
     * Parameter order matches the call order — the first `addParameter()` call
     * defines the type of the first argument, the second call defines the second
     * argument, and so on.
     *
     * @param schema - The schema describing the parameter. Pass an optional schema
     *   (e.g. `string().optional()`) to make the corresponding argument optional.
     *
     * @example
     * ```ts
     * const fn = func()
     *     .addParameter(string())          // (a: string, ...) => any
     *     .addParameter(number().optional()) // (..., b?: number) => any
     *     .addParameter(boolean());        // (..., c: boolean) => any
     *
     * type Fn = InferType<typeof fn>;
     * // → (a: string, b: number | undefined, c: boolean) => any
     * ```
     */
    public addParameter<TSchema extends SchemaBuilder<any, any, any, any, any>>(
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
     *
     * Replaces any previously set return type. The inferred function signature
     * gains a concrete return type instead of `any`. The schema is accessible at
     * runtime via `introspect().returnType`.
     *
     * @param schema - The schema describing the return type of the function.
     *
     * @example
     * ```ts
     * const fn = func()
     *     .addParameter(string())
     *     .hasReturnType(number());
     *
     * type Fn = InferType<typeof fn>;
     * // → (param0: string) => number
     *
     * fn.introspect().returnType; // NumberSchemaBuilder
     * ```
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
 * Creates a `function` schema that validates the value is a JavaScript function.
 *
 * The returned builder is immutable and fully chainable. Use
 * {@link FunctionSchemaBuilder.addParameter} to annotate the expected parameter
 * types and {@link FunctionSchemaBuilder.hasReturnType} to annotate the return
 * type — the inferred TypeScript function signature is updated automatically.
 *
 * @returns A new {@link FunctionSchemaBuilder} with `isRequired` set to `true`.
 *
 * @example
 * ```ts
 * import { func, string, number, InferType } from '@cleverbrush/schema';
 *
 * const schema = func()
 *     .addParameter(string())
 *     .addParameter(number().optional())
 *     .hasReturnType(string());
 *
 * type Fn = InferType<typeof schema>;
 * // → (param0: string, param1?: number) => string
 *
 * schema.validate(() => 'hello');  // { valid: true }
 * schema.validate('not a fn');     // { valid: false }
 * ```
 *
 * @see {@link FunctionSchemaBuilder}
 */
export const func = () =>
    FunctionSchemaBuilder.create({
        isRequired: true
    }) as FunctionSchemaBuilder<true>;
