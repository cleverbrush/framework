import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type AnySchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<AnySchemaBuilder<R>['introspect']>
>;

/**
 * Any schema builder class. Similar to the `any` type
 * in TypeScript. Allows to define a schema for `any` value.
 * Use it when you don't know the type of the value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use `any()` function instead.
 *
 * @example
 * ```ts
 * const schema = any();
 * const result = schema.validate(123);
 * // result.valid === true
 * // result.object === 123
 * ```
 */
export class AnySchemaBuilder<
    TRequired extends boolean = true,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TResult = TExplicitType extends undefined ? any : TExplicitType
> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    /**
     * @hidden
     */
    public static create(props: AnySchemaBuilderCreateProps<any>) {
        return new AnySchemaBuilder({
            type: 'any',
            ...props
        });
    }

    protected constructor(props: AnySchemaBuilderCreateProps<TRequired>) {
        super(props as any);
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): AnySchemaBuilder<true, T, THasDefault, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): AnySchemaBuilder<
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

    #buildResult(
        superResult: ReturnType<AnySchemaBuilder['preValidateSync']>
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

        return { valid: true, object: objToValidate };
    }

    /**
     * Performs synchronous validation of the schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
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
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        return this.#buildResult(await super.preValidateAsync(object, context));
    }

    protected createFromProps<TReq extends boolean>(
        props: AnySchemaBuilderCreateProps<TReq>
    ): this {
        return AnySchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): AnySchemaBuilder<true, TExplicitType, THasDefault, TExtensions> &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): AnySchemaBuilder<
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
    ): AnySchemaBuilder<true, TExplicitType, true, TExtensions> & TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): AnySchemaBuilder<
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
    ): AnySchemaBuilder<
        TRequired,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }
}

/**
 * Creates a `any` schema.
 * @example
 * ```
 *  const anyObject = any();
 *
 * // null - invalid
 * // undefined - invalid
 * // string - valid
 * // {} - valid
 * // Date -valid
 * // { someProp: 123 } - valid
 * // etc
 * ```
 * @example
 * ```
 *  const anyObject = any().optional();
 *  // null - valid
 *  // undefined - valid
 *  // string - valid
 *  // {} - valid
 *  // Date -valid
 *  // { someProp: 123 } - valid
 * ```
 */
export const any = () =>
    AnySchemaBuilder.create({
        isRequired: true
    }) as AnySchemaBuilder<true>;
