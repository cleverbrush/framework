import {
    type BRAND,
    type InferType,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type PromiseSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<PromiseSchemaBuilder<R>['introspect']>
>;

/**
 * Schema builder for promise-like values. Validates that a value is a
 * thenable (for example, an actual `Promise` or any object with a `then`
 * function) and optionally carries a typed resolved-value schema so that
 * the inferred TypeScript type is `Promise<T>` instead of `Promise<any>`.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link promise | promise()} function instead.
 *
 * @example Basic validation
 * ```ts
 * const schema = promise();
 * const result = schema.validate(Promise.resolve(42));
 * // result.valid === true
 * ```
 *
 * @example Optional promise schema
 * ```ts
 * const schema = promise().optional();
 * const result = schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * ```
 *
 * @example Typed resolved value
 * ```ts
 * import { promise, string, InferType } from '@cleverbrush/schema';
 *
 * const schema = promise(string());
 *
 * type PromiseResult = InferType<typeof schema>;
 * // → Promise<string>
 *
 * // Introspect at runtime
 * const info = schema.introspect();
 * // info.resolvedType → StringSchemaBuilder
 * ```
 *
 * @see {@link promise}
 */
export class PromiseSchemaBuilder<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TResolvedTypeSchema extends
        | SchemaBuilder<any, any, any, any, any>
        | undefined = undefined,
    TResult = TExplicitType extends undefined
        ? TResolvedTypeSchema extends SchemaBuilder<any, any, any, any, any>
            ? Promise<InferType<TResolvedTypeSchema>>
            : Promise<any>
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #resolvedType?: SchemaBuilder<any, any, any, any, any>;

    /**
     * @hidden
     */
    public static create(props: PromiseSchemaBuilderCreateProps<any>) {
        return new PromiseSchemaBuilder({
            type: 'promise',
            ...props
        });
    }

    protected constructor(props: PromiseSchemaBuilderCreateProps<TRequired>) {
        super(props as any);

        if (props.resolvedType instanceof SchemaBuilder) {
            this.#resolvedType = props.resolvedType;
        }
    }

    /**
     * @hidden
     */
    public hasType<T>(
        _notUsed?: T
    ): PromiseSchemaBuilder<
        true,
        TNullable,
        T,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): PromiseSchemaBuilder<
        TRequired,
        TNullable,
        undefined,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
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
     * the following field is included:
     *
     * - `resolvedType` — the {@link SchemaBuilder} set via {@link hasResolvedType},
     *   or `undefined` when no resolved-type schema has been configured.
     *
     * @example
     * ```ts
     * const schema = promise(string());
     *
     * const info = schema.introspect();
     * // info.resolvedType instanceof StringSchemaBuilder
     * ```
     */
    public introspect() {
        return {
            ...super.introspect(),
            /** Resolved-value schema set via {@link hasResolvedType}, or `undefined` if not set. */
            resolvedType: this.#resolvedType
        };
    }

    #buildResult(
        superResult: ReturnType<PromiseSchemaBuilder['preValidateSync']>
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

        if (
            objToValidate == null ||
            typeof (objToValidate as any).then !== 'function'
        ) {
            return {
                valid: false,
                errors: [
                    {
                        message: `expected a Promise, but saw ${objToValidate === null ? 'null' : typeof objToValidate}`
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
        props: PromiseSchemaBuilderCreateProps<TReq>
    ): this {
        return PromiseSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): PromiseSchemaBuilder<
        true,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): PromiseSchemaBuilder<
        false,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): PromiseSchemaBuilder<
        true,
        TNullable,
        TExplicitType,
        true,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): PromiseSchemaBuilder<
        TRequired,
        TNullable,
        TExplicitType,
        false,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.clearDefault() as any;
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): PromiseSchemaBuilder<
        TRequired,
        TNullable,
        TResult & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * Marks the inferred type as `Readonly<Promise<T>>`. Sets the
     * `isReadonly` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    public readonly(): PromiseSchemaBuilder<
        TRequired,
        TNullable,
        Readonly<TResult>,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.readonly();
    }

    /**
     * @hidden
     */
    public nullable(): PromiseSchemaBuilder<
        TRequired,
        true,
        TExplicitType,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.nullable() as any;
    }

    /**
     * @hidden
     */
    public notNullable(): PromiseSchemaBuilder<
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions,
        TResolvedTypeSchema
    > &
        TExtensions {
        return super.notNullable() as any;
    }

    /**
     * Sets the schema for the resolved value of the `Promise`.
     *
     * The inferred TypeScript type becomes `Promise<T>` where `T` is the type
     * produced by `schema`. The schema is accessible at runtime via
     * `introspect().resolvedType`.
     *
     * @param schema - The schema describing the resolved value of the promise.
     *
     * @example
     * ```ts
     * const schema = promise().hasResolvedType(string());
     *
     * type Resolved = InferType<typeof schema>;
     * // → Promise<string>
     *
     * schema.introspect().resolvedType; // StringSchemaBuilder
     * ```
     */
    public hasResolvedType<
        TSchema extends SchemaBuilder<any, any, any, any, any>
    >(
        schema: TSchema
    ): PromiseSchemaBuilder<
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions,
        TSchema
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect(),
            resolvedType: schema
        } as any) as any;
    }
}

/**
 * Creates a `promise` schema that validates the value is a JavaScript `Promise`.
 *
 * The returned builder is immutable and fully chainable. Pass an optional
 * schema to {@link promise} to annotate the type of the resolved value —
 * the inferred TypeScript type becomes `Promise<T>`.
 *
 * Alternatively, call {@link PromiseSchemaBuilder.hasResolvedType} on the
 * returned builder to set or replace the resolved-value schema at any point
 * in the chain.
 *
 * @param resolvedTypeSchema - Optional schema describing the resolved value of
 *   the promise. When provided, `InferType<typeof schema>` becomes
 *   `Promise<InferType<typeof resolvedTypeSchema>>`.
 *
 * @returns A new {@link PromiseSchemaBuilder} with `isRequired` set to `true`.
 *
 * @example
 * ```ts
 * import { promise, string, number, InferType } from '@cleverbrush/schema';
 *
 * // Untyped — accepts any Promise
 * const anyPromise = promise();
 * type AnyPromise = InferType<typeof anyPromise>; // Promise<any>
 *
 * anyPromise.validate(Promise.resolve(42));  // { valid: true }
 * anyPromise.validate('not a promise' as any); // { valid: false }
 *
 * // Typed resolved value
 * const stringPromise = promise(string());
 * type StringPromise = InferType<typeof stringPromise>; // Promise<string>
 *
 * // Optional promise
 * const optPromise = promise(number()).optional();
 * type OptPromise = InferType<typeof optPromise>; // Promise<number> | undefined
 * ```
 *
 * @see {@link PromiseSchemaBuilder}
 */
export function promise(): PromiseSchemaBuilder<true>;
export function promise<TSchema extends SchemaBuilder<any, any, any, any, any>>(
    resolvedTypeSchema: TSchema
): PromiseSchemaBuilder<true, false, undefined, false, {}, TSchema>;
export function promise<TSchema extends SchemaBuilder<any, any, any, any, any>>(
    resolvedTypeSchema?: TSchema
): PromiseSchemaBuilder<true> {
    return PromiseSchemaBuilder.create({
        isRequired: true,
        resolvedType: resolvedTypeSchema
    }) as PromiseSchemaBuilder<true>;
}
