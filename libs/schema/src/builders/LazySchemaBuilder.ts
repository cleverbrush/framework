import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type LazySchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<LazySchemaBuilder<any, R>['introspect']>
>;

/**
 * Lazy schema builder class. Allows defining recursive/self-referential schemas
 * by wrapping a getter function that returns the target schema. The getter is
 * called once on first validation and the result is cached.
 *
 * This is the primary mechanism for building recursive data structures such as
 * tree nodes, nested menus, and threaded comments.
 *
 * **NOTE** TypeScript cannot infer recursive types automatically, so you must
 * provide an explicit type annotation on the variable holding the schema:
 *
 * @example
 * ```ts
 * type TreeNode = { value: number; children: TreeNode[] };
 *
 * const treeNode: SchemaBuilder<TreeNode, true> = object({
 *     value: number(),
 *     children: array(lazy(() => treeNode))
 * });
 *
 * treeNode.validate({ value: 1, children: [{ value: 2, children: [] }] });
 * // { valid: true, object: { value: 1, children: [{ value: 2, children: [] }] } }
 * ```
 *
 * @example
 * ```ts
 * type Comment = { text: string; replies: Comment[] };
 *
 * const commentSchema: SchemaBuilder<Comment, true> = object({
 *     text: string(),
 *     replies: array(lazy(() => commentSchema))
 * });
 * ```
 */
export class LazySchemaBuilder<
    TResult = any,
    TRequired extends boolean = true,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #getter: () => SchemaBuilder<TResult, any, any>;
    #resolvedSchema: SchemaBuilder<TResult, any, any> | null = null;

    /**
     * @hidden
     */
    public static create(props: LazySchemaBuilderCreateProps<any>) {
        return new LazySchemaBuilder({
            type: 'lazy',
            ...props
        });
    }

    protected constructor(props: LazySchemaBuilderCreateProps<TRequired>) {
        super(props as any);
        if (typeof (props as any).getter !== 'function') {
            throw new Error('LazySchemaBuilder: getter must be a function');
        }
        this.#getter = (props as any).getter;
    }

    /**
     * Resolves the lazy schema by calling the getter (once; result is cached).
     * After the first call subsequent calls return the cached schema instance.
     */
    public resolve(): SchemaBuilder<TResult, any, any> {
        if (this.#resolvedSchema === null) {
            this.#resolvedSchema = this.#getter();
        }
        return this.#resolvedSchema;
    }

    /**
     * @inheritdoc
     */
    public introspect() {
        return {
            ...super.introspect(),
            /**
             * The getter function that returns the lazily-resolved schema.
             * Call {@link LazySchemaBuilder.resolve} to obtain the schema instance.
             */
            getter: this.#getter
        };
    }

    #buildResult(
        superResult: ReturnType<LazySchemaBuilder['preValidateSync']>,
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

        // Value is null/undefined and the schema is optional — skip delegation.
        if (objToValidate == null) {
            return { valid: true, object: objToValidate };
        }

        return this.resolve().validate(
            objToValidate,
            context
        ) as ValidationResult<TResult>;
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
    public async validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await super.preValidateAsync(object, context);

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

        if (objToValidate == null) {
            return { valid: true, object: objToValidate };
        }

        return this.resolve().validateAsync(objToValidate, context) as Promise<
            ValidationResult<TResult>
        >;
    }

    protected createFromProps<TReq extends boolean>(
        props: LazySchemaBuilderCreateProps<TReq>
    ): this {
        return LazySchemaBuilder.create(props as any) as any;
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): LazySchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): LazySchemaBuilder<
        TResult,
        TRequired,
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
    ): LazySchemaBuilder<TResult, true, THasDefault, TExtensions> &
        TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): LazySchemaBuilder<
        TResult,
        false,
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
    ): LazySchemaBuilder<TResult, true, true, TExtensions> & TExtensions {
        return super.default(value) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): LazySchemaBuilder<
        TResult,
        TRequired,
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
    ): LazySchemaBuilder<
        TResult & { readonly [K in BRAND]: TBrand },
        TRequired,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }
}

/**
 * Creates a lazy schema that defers the schema definition until first validation.
 * Use this to define recursive/self-referential schemas.
 *
 * The getter function is called **once** on first use and the result is cached.
 * You **must** provide an explicit TypeScript type annotation on the variable
 * holding the outer schema — TypeScript cannot infer recursive types automatically.
 *
 * @param getter - A function that returns the schema to use for validation.
 *
 * @example
 * ```ts
 * // Tree structure
 * type TreeNode = { value: number; children: TreeNode[] };
 *
 * const treeNode: SchemaBuilder<TreeNode, true> = object({
 *     value: number(),
 *     children: array(lazy(() => treeNode))
 * });
 * ```
 *
 * @example
 * ```ts
 * // Optional recursive field (submenu)
 * type MenuItem = { label: string; submenu?: MenuItem[] };
 *
 * const menuItem: SchemaBuilder<MenuItem, true> = object({
 *     label: string(),
 *     submenu: array(lazy(() => menuItem)).optional()
 * });
 * ```
 */
export function lazy<TResult>(
    getter: () => SchemaBuilder<TResult, any, any>
): LazySchemaBuilder<TResult, true, false, {}> {
    return LazySchemaBuilder.create({
        type: 'lazy',
        isRequired: true,
        preprocessors: [],
        validators: [],
        getter
    } as any);
}
