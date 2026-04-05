import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type FunctionSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<FunctionSchemaBuilder<R>['introspect']>
>;

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
    TResult = TExplicitType extends undefined
        ? (...args: any[]) => any
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
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
    }

    /**
     * @hidden
     */
    public hasType<T>(
        _notUsed?: T
    ): FunctionSchemaBuilder<true, TNullable, T, THasDefault, TExtensions> &
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
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
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
        TExtensions
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
    ): FunctionSchemaBuilder<
        true,
        TNullable,
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
    public clearDefault(): FunctionSchemaBuilder<
        TRequired,
        TNullable,
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
    ): FunctionSchemaBuilder<
        TRequired,
        TNullable,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
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
        TExtensions
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
        TExtensions
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * @hidden
     */
    public notNullable(): FunctionSchemaBuilder<
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions
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
