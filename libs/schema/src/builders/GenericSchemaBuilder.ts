import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type GenericSchemaBuilderCreateProps<TRequired extends boolean = true> =
    Partial<ReturnType<GenericSchemaBuilder<any, TRequired>['introspect']>>;

/**
 * Schema builder that wraps a generic template function, enabling reusable
 * parameterized schemas. Call {@link GenericSchemaBuilder.apply | `.apply()`}
 * with concrete schema arguments to obtain a fully typed concrete schema
 * builder whose TypeScript type is inferred from the template function's
 * generic signature.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link generic | generic()} function instead.
 *
 * @example Single type parameter
 * ```ts
 * import { generic, object, array, number, string, InferType } from '@cleverbrush/schema';
 *
 * const PaginatedList = generic(
 *   <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
 *     object({
 *       items: array(itemSchema),
 *       total: number(),
 *       page:  number(),
 *     })
 * );
 *
 * const userSchema = object({ name: string(), age: number() });
 * const PaginatedUsers = PaginatedList.apply(userSchema);
 *
 * type PaginatedUsersType = InferType<typeof PaginatedUsers>;
 * // → { items: { name: string; age: number }[]; total: number; page: number }
 * ```
 *
 * @example Multiple type parameters
 * ```ts
 * const Result = generic(
 *   <T extends SchemaBuilder<any, any, any, any, any>,
 *    E extends SchemaBuilder<any, any, any, any, any>>(
 *     valueSchema: T,
 *     errorSchema: E
 *   ) =>
 *     object({
 *       ok:    boolean(),
 *       value: valueSchema.optional(),
 *       error: errorSchema.optional(),
 *     })
 * );
 *
 * const StringResult = Result.apply(string(), number());
 * // InferType → { ok: boolean; value?: string; error?: number }
 * ```
 *
 * @example With default arguments (enables direct `.validate()` on the template)
 * ```ts
 * const AnyList = generic(
 *   [any()],   // default args — one per template parameter
 *   <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
 *     object({ items: array(itemSchema), total: number() })
 * );
 *
 * // Validate directly using defaults:
 * AnyList.validate({ items: [1, 'two', true], total: 3 }); // valid
 *
 * // Or apply concrete schemas first:
 * AnyList.apply(string()).validate({ items: ['a', 'b'], total: 2 }); // valid
 * ```
 *
 * @see {@link generic}
 *
 * @typeParam TFn - The generic template function type. Its return type
 *   determines `TResult` (the validated value type) when no explicit type
 *   override has been applied via `.hasType<T>()`.
 * @typeParam TRequired - `true` when the schema is required (default),
 *   `false` after calling `.optional()`. Governs whether `undefined` is a
 *   valid value.
 * @typeParam TNullable - `true` after calling `.nullable()`. Governs whether
 *   `null` is a valid value.
 * @typeParam TExplicitType - Type override set via `.hasType<T>()`. When
 *   `undefined` (the default), `TResult` is derived from `TFn`'s return type.
 * @typeParam THasDefault - `true` after calling `.default(value)`. Governs
 *   whether `InferType` emits `T` instead of `T | undefined` for optional
 *   schemas with a default.
 * @typeParam TExtensions - Object type carrying extension methods added via
 *   `withExtensions()`. Defaults to `{}`.
 * @typeParam TResult - The inferred result type: `TExplicitType` when set,
 *   otherwise the value type inferred from `ReturnType<TFn>`.
 */
export class GenericSchemaBuilder<
    TFn extends (...args: any[]) => SchemaBuilder<any, any, any, any, any>,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TResult = TExplicitType extends undefined
        ? ReturnType<TFn> extends SchemaBuilder<infer R, any, any, any, any>
            ? R
            : any
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #templateFn?: (...args: any[]) => SchemaBuilder<any, any, any, any, any>;
    #defaults?: readonly any[];
    #cachedDefaultSchema?: SchemaBuilder<any, any, any, any, any>;

    /**
     * Applies the template function with concrete schema arguments, returning
     * a fully typed concrete schema builder. TypeScript infers the result type
     * from the template function's own generic signature.
     *
     * The returned builder is independent of this `GenericSchemaBuilder` and
     * can be used like any other schema: `.validate()`, `.optional()`, etc.
     *
     * @example
     * ```ts
     * const Wrapper = generic(
     *   <T extends SchemaBuilder<any, any, any, any, any>>(schema: T) =>
     *     object({ data: schema })
     * );
     *
     * const s = Wrapper.apply(string());
     * // InferType<typeof s> → { data: string }
     * s.validate({ data: 'hello' }); // { valid: true }
     * ```
     */
    // Set to the actual function in the constructor; declared here for TypeScript.
    public declare readonly apply: TFn;

    /**
     * @hidden
     */
    public static create(props: GenericSchemaBuilderCreateProps<any>) {
        return new GenericSchemaBuilder({
            type: 'generic',
            ...props
        });
    }

    protected constructor(props: GenericSchemaBuilderCreateProps<TRequired>) {
        super(props as any);
        this.#templateFn = (props as any).templateFn;
        this.#defaults = (props as any).defaults;

        // Own property: typed as TFn so generic inference works at call sites.
        (this as any).apply = (...args: any[]) => {
            if (!this.#templateFn) {
                throw new Error(
                    'GenericSchemaBuilder: no template function defined'
                );
            }
            return this.#templateFn(...args);
        };
    }

    /**
     * Returns an object describing the current schema configuration.
     *
     * In addition to the base fields exposed by {@link SchemaBuilder.introspect},
     * the following fields are included:
     *
     * - `templateFn` — the template function passed to {@link generic}.
     * - `defaults` — the default argument list passed to the two-argument
     *   form of {@link generic}, or `undefined` when no defaults were provided.
     *
     * @example
     * ```ts
     * const schema = generic([string()], <T>(s: T) => object({ data: s }));
     *
     * const info = schema.introspect();
     * // info.type         → 'generic'
     * // info.templateFn   → [Function]
     * // info.defaults     → [StringSchemaBuilder]
     * ```
     */
    public introspect() {
        return {
            ...super.introspect(),
            /** Template function passed to {@link generic}. */
            templateFn: this.#templateFn,
            /** Default positional arguments for the template function, or `undefined`. */
            defaults: this.#defaults
        };
    }

    #getOrCreateDefaultSchema():
        | SchemaBuilder<any, any, any, any, any>
        | undefined {
        if (!this.#templateFn || !this.#defaults) {
            return undefined;
        }
        if (!this.#cachedDefaultSchema) {
            this.#cachedDefaultSchema = this.#templateFn(...this.#defaults);
        }
        return this.#cachedDefaultSchema;
    }

    #buildResult(
        superResult: ReturnType<
            GenericSchemaBuilder<TFn, TRequired>['preValidateSync']
        >,
        context?: ValidationContext
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
            return { valid: true, object: objToValidate };
        }

        const defaultSchema = this.#getOrCreateDefaultSchema();
        if (!defaultSchema) {
            return {
                valid: false,
                errors: [
                    {
                        message:
                            'This is a generic schema template. Call .apply() with concrete schemas to get a validatable schema, or provide default arguments to generic().'
                    }
                ]
            };
        }

        return defaultSchema.validate(
            objToValidate,
            context
        ) as ValidationResult<TResult>;
    }

    async #buildAsyncResult(
        superResult: Awaited<
            ReturnType<GenericSchemaBuilder<TFn, TRequired>['preValidateAsync']>
        >,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
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
            return { valid: true, object: objToValidate };
        }

        const defaultSchema = this.#getOrCreateDefaultSchema();
        if (!defaultSchema) {
            return {
                valid: false,
                errors: [
                    {
                        message:
                            'This is a generic schema template. Call .apply() with concrete schemas to get a validatable schema, or provide default arguments to generic().'
                    }
                ]
            };
        }

        return (await defaultSchema.validateAsync(
            objToValidate,
            context
        )) as ValidationResult<TResult>;
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
        return this.#buildResult(
            this.preValidateSync(object, context),
            context
        );
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
        return this.#buildAsyncResult(
            await super.preValidateAsync(object, context),
            context
        );
    }

    protected createFromProps<TReq extends boolean>(
        props: GenericSchemaBuilderCreateProps<TReq>
    ): this {
        return GenericSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public hasType<T>(
        _notUsed?: T
    ): GenericSchemaBuilder<TFn, true, TNullable, T, THasDefault, TExtensions> &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): GenericSchemaBuilder<
        TFn,
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

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): GenericSchemaBuilder<
        TFn,
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
    public optional(): GenericSchemaBuilder<
        TFn,
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
    public nullable(): GenericSchemaBuilder<
        TFn,
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
    public notNullable(): GenericSchemaBuilder<
        TFn,
        TRequired,
        false,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.notNullable() as any;
    }

    /**
     * @hidden
     */
    public default(
        value: TResult | (() => TResult)
    ): GenericSchemaBuilder<
        TFn,
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
    public clearDefault(): GenericSchemaBuilder<
        TFn,
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
    ): GenericSchemaBuilder<
        TFn,
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
     * @hidden
     */
    public readonly(): GenericSchemaBuilder<
        TFn,
        TRequired,
        TNullable,
        Readonly<TResult>,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }
}

/**
 * Creates a generic schema template — a reusable, parameterized schema factory
 * whose TypeScript type is inferred from the template function's generic
 * signature.
 *
 * Call {@link GenericSchemaBuilder.apply | `.apply()`} on the returned builder
 * to instantiate the template with concrete schema arguments and receive a
 * fully typed concrete schema.
 *
 * There are two overloads:
 *
 * 1. **`generic(templateFn)`** — Provide only the template function. The
 *    template must be called via `.apply()` before validation.
 * 2. **`generic(defaults, templateFn)`** — Provide positional default arguments
 *    followed by the template function. The template can be validated directly
 *    using those defaults (without calling `.apply()` first).
 *
 * @param templateFn - A (generic) function that accepts schema arguments and
 *   returns a concrete schema. TypeScript infers the result type from this
 *   function's generic signature when `.apply()` is called.
 *
 * @returns A new {@link GenericSchemaBuilder} with `isRequired` set to `true`.
 *
 * @example Single type parameter
 * ```ts
 * import { generic, object, array, number, string, any, InferType } from '@cleverbrush/schema';
 *
 * const PaginatedList = generic(
 *   <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
 *     object({ items: array(itemSchema), total: number(), page: number() })
 * );
 *
 * const UserList = PaginatedList.apply(object({ name: string() }));
 * type UserListType = InferType<typeof UserList>;
 * // → { items: { name: string }[]; total: number; page: number }
 *
 * UserList.validate({ items: [{ name: 'Alice' }], total: 1, page: 1 }); // valid
 * ```
 *
 * @example Multiple type parameters
 * ```ts
 * const Result = generic(
 *   <T extends SchemaBuilder<any, any, any, any, any>,
 *    E extends SchemaBuilder<any, any, any, any, any>>(
 *     valueSchema: T,
 *     errorSchema: E
 *   ) =>
 *     union(
 *       object({ ok: boolean().equalsTo(true),  value: valueSchema }),
 *       object({ ok: boolean().equalsTo(false), error: errorSchema })
 *     )
 * );
 *
 * const StringResult = Result.apply(string(), number());
 * ```
 *
 * @example With defaults (enables direct validation on the template)
 * ```ts
 * const AnyList = generic(
 *   [any()],   // default args — positional, one per template parameter
 *   <T extends SchemaBuilder<any, any, any, any, any>>(itemSchema: T) =>
 *     object({ items: array(itemSchema), total: number() })
 * );
 *
 * // Validate directly — uses the default any() schema:
 * AnyList.validate({ items: [1, 'two'], total: 2 }); // valid
 *
 * // Or apply concrete schemas first:
 * AnyList.apply(string()).validate({ items: ['x'], total: 1 }); // valid
 * ```
 *
 * @see {@link GenericSchemaBuilder}
 */
export function generic<
    TFn extends (...args: any[]) => SchemaBuilder<any, any, any, any, any>
>(
    templateFn: TFn
): GenericSchemaBuilder<TFn, true, false, undefined, false, {}>;
export function generic<
    TFn extends (...args: any[]) => SchemaBuilder<any, any, any, any, any>
>(
    defaults: readonly any[],
    templateFn: TFn
): GenericSchemaBuilder<TFn, true, false, undefined, false, {}>;
export function generic<
    TFn extends (...args: any[]) => SchemaBuilder<any, any, any, any, any>
>(
    fnOrDefaults: TFn | readonly any[],
    templateFn?: TFn
): GenericSchemaBuilder<TFn, true, false, undefined, false, {}> {
    const fn = templateFn !== undefined ? templateFn : (fnOrDefaults as TFn);
    const defaults =
        templateFn !== undefined ? (fnOrDefaults as readonly any[]) : undefined;
    return GenericSchemaBuilder.create({
        isRequired: true,
        templateFn: fn,
        defaults
    }) as any;
}
