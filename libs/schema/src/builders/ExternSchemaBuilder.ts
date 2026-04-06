import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type ExternSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<ExternSchemaBuilder<any, R>['introspect']>
> & {
    standardSchema: StandardSchemaV1;
};

/**
 * Formats a Standard Schema issue path into a dotted string.
 *
 * Standard Schema paths may contain bare `PropertyKey` values (string, number,
 * symbol) or `PathSegment` objects with a `.key` property.
 *
 * @example
 * ```
 * formatIssuePath(['address', 'city'])  // → 'address.city'
 * formatIssuePath([{ key: 'items' }, 0]) // → 'items.0'
 * ```
 */
function formatIssuePath(
    path: ReadonlyArray<PropertyKey | StandardSchemaV1.PathSegment>
): string {
    return path
        .map(segment =>
            typeof segment === 'object' && segment !== null && 'key' in segment
                ? String(segment.key)
                : String(segment)
        )
        .join('.');
}

/**
 * Schema builder that wraps an external
 * [Standard Schema v1](https://standardschema.dev/) compatible schema
 * (e.g. Zod, Valibot, ArkType) into a `@cleverbrush/schema` builder.
 *
 * This enables cross-library schema composition — you can use a Zod schema
 * as a property inside a `@cleverbrush/schema` object schema, and the
 * inferred TypeScript type will be correct.
 *
 * Validation is delegated entirely to the external schema's
 * `['~standard'].validate()` method. Standard Schema issues are mapped to
 * `@cleverbrush/schema` `ValidationError` objects, with any issue paths
 * formatted as dotted prefixes (e.g. `"address.city: must be a string"`).
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use the {@link extern | extern()} factory function instead.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { object, date, extern, InferType } from '@cleverbrush/schema';
 *
 * const zodUser = z.object({ first: z.string(), last: z.string() });
 *
 * const order = object({
 *   user: extern(zodUser),
 *   date: date(),
 * });
 *
 * type Order = InferType<typeof order>;
 * // { user: { first: string; last: string }; date: Date }
 * ```
 *
 * @see {@link extern}
 */
export class ExternSchemaBuilder<
    TStandardSchema extends StandardSchemaV1 = StandardSchemaV1,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {},
    TResult = TExplicitType extends undefined
        ? StandardSchemaV1.InferOutput<TStandardSchema>
        : TExplicitType
> extends SchemaBuilder<
    TResult,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #standardSchema: TStandardSchema;

    /**
     * @hidden
     */
    public static create(props: ExternSchemaBuilderCreateProps<any>) {
        return new ExternSchemaBuilder({
            type: 'extern',
            ...props
        });
    }

    protected constructor(props: ExternSchemaBuilderCreateProps<TRequired>) {
        super(props as any);
        this.#standardSchema = props.standardSchema as TStandardSchema;
    }

    /**
     * Returns the wrapped Standard Schema instance.
     */
    public get standardSchema(): TStandardSchema {
        return this.#standardSchema;
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): ExternSchemaBuilder<
        TStandardSchema,
        true,
        TNullable,
        T,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @inheritdoc
     */
    public clearHasType(): ExternSchemaBuilder<
        TStandardSchema,
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
     * Maps a Standard Schema failure result into the library's
     * `ValidationError[]` format.
     */
    #mapIssues(
        issues: ReadonlyArray<StandardSchemaV1.Issue>
    ): { message: string }[] {
        return issues.map(issue => ({
            message:
                issue.path && issue.path.length > 0
                    ? `${formatIssuePath(issue.path)}: ${issue.message}`
                    : issue.message
        }));
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
     * Performs synchronous validation by delegating to the external
     * Standard Schema's `validate()` method.
     *
     * If the external schema returns a `Promise` (async validation),
     * this method throws — use {@link validateAsync} instead.
     */
    protected _validate(
        object: TResult,
        context?: ValidationContext
    ): ValidationResult<TResult> {
        const superResult = this.preValidateSync(object, context);

        if (!superResult.valid) {
            return { valid: false, errors: superResult.errors };
        }

        const { transaction: preValidationTransaction } = superResult;

        const objToValidate = preValidationTransaction!.object.validatedObject;

        // When the value is null/undefined and preValidation accepted it
        // (optional or nullable), return early without calling the external
        // schema — it would likely reject these sentinel values.
        if (objToValidate === undefined || objToValidate === null) {
            return { valid: true, object: objToValidate };
        }

        const result =
            this.#standardSchema['~standard'].validate(objToValidate);

        if (result instanceof Promise) {
            throw new Error(
                'The external Standard Schema returned a Promise from validate(). ' +
                    'Use validateAsync() for schemas with async validation.'
            );
        }

        if ('value' in result) {
            return { valid: true, object: result.value as TResult };
        }

        return {
            valid: false,
            errors: this.#mapIssues(result.issues)
        };
    }

    /**
     * Performs async validation by delegating to the external
     * Standard Schema's `validate()` method. Supports external schemas
     * that return a `Promise` from their `validate()`.
     */
    protected async _validateAsync(
        object: TResult,
        context?: ValidationContext
    ): Promise<ValidationResult<TResult>> {
        const superResult = await this.preValidateAsync(object, context);

        if (!superResult.valid) {
            return { valid: false, errors: superResult.errors };
        }

        const { transaction: preValidationTransaction } = superResult;

        const objToValidate = preValidationTransaction!.object.validatedObject;

        if (objToValidate === undefined || objToValidate === null) {
            return { valid: true, object: objToValidate };
        }

        const result =
            await this.#standardSchema['~standard'].validate(objToValidate);

        if ('value' in result) {
            return { valid: true, object: result.value as TResult };
        }

        return {
            valid: false,
            errors: this.#mapIssues(result.issues)
        };
    }

    protected createFromProps<TReq extends boolean>(
        props: ExternSchemaBuilderCreateProps<TReq>
    ): this {
        return ExternSchemaBuilder.create(props as any) as any;
    }

    /**
     * Returns a snapshot of the builder's internal state.
     * Includes the wrapped `standardSchema` reference.
     */
    public introspect() {
        return {
            ...super.introspect(),
            standardSchema: this.#standardSchema
        };
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): ExternSchemaBuilder<
        TStandardSchema,
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
    public optional(): ExternSchemaBuilder<
        TStandardSchema,
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
    ): ExternSchemaBuilder<
        TStandardSchema,
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
    public clearDefault(): ExternSchemaBuilder<
        TStandardSchema,
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
    ): ExternSchemaBuilder<
        TStandardSchema,
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
     * Marks the inferred type as `Readonly<T>`. Sets the `isReadonly`
     * introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    public readonly(): ExternSchemaBuilder<
        TStandardSchema,
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
    public nullable(): ExternSchemaBuilder<
        TStandardSchema,
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
    public notNullable(): ExternSchemaBuilder<
        TStandardSchema,
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
 * Wraps an external [Standard Schema v1](https://standardschema.dev/)
 * compatible schema into a `@cleverbrush/schema` builder.
 *
 * This enables cross-library schema composition — use schemas from Zod,
 * Valibot, ArkType, or any Standard Schema v1 compliant library as
 * properties inside `@cleverbrush/schema` object schemas with full type
 * inference.
 *
 * @param standardSchema - A Standard Schema v1 compliant schema instance
 *   (any object that exposes a `['~standard']` property with `version: 1`
 *   and a `validate` function).
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { object, date, extern, InferType } from '@cleverbrush/schema';
 *
 * const zodUser = z.object({ first: z.string(), last: z.string() });
 *
 * const order = object({
 *   user: extern(zodUser),
 *   date: date(),
 * });
 *
 * type Order = InferType<typeof order>;
 * // { user: { first: string; last: string }; date: Date }
 *
 * order.validate({
 *   user: { first: 'Alice', last: 'Smith' },
 *   date: new Date(),
 * }); // { valid: true, object: { user: …, date: … } }
 * ```
 *
 * @example
 * ```ts
 * // Optional external schema
 * const schema = extern(zodUser).optional();
 * schema.validate(undefined); // valid
 * ```
 *
 * @example
 * ```ts
 * // Inside an array
 * import { array, extern } from '@cleverbrush/schema';
 * const users = array(extern(zodUser));
 * ```
 */
export const extern = <T extends StandardSchemaV1>(standardSchema: T) =>
    ExternSchemaBuilder.create({
        isRequired: true,
        standardSchema
    }) as ExternSchemaBuilder<T, true>;
