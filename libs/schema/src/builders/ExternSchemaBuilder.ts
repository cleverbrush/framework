import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
    type BRAND,
    SchemaBuilder,
    SYMBOL_HAS_PROPERTIES,
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
 * Extracts the first path segment from a Standard Schema issue path entry
 * as a string.
 */
function firstPathSegmentStr(
    segment: PropertyKey | StandardSchemaV1.PathSegment
): string {
    return typeof segment === 'object' && segment !== null && 'key' in segment
        ? String(segment.key)
        : String(segment);
}

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
    return path.map(firstPathSegmentStr).join('.');
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
 * When used inside an `object()` schema, the property descriptor tree is
 * built dynamically (via Proxy) from the external schema's output type,
 * so `getErrorsFor(t => t.order.id)` works without any additional
 * configuration.
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
     * Always `true` for extern schemas — enables Proxy-based property
     * descriptor trees and nested error propagation in
     * `ObjectSchemaBuilder`.
     */
    readonly [SYMBOL_HAS_PROPERTIES] = true;

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

    /**
     * Builds a `getErrorsFor` function that maps Standard Schema issue
     * paths to per-property error lists via the Proxy-based property
     * descriptor tree.
     *
     * The function groups issues by their first path segment, then builds
     * a WeakMap from each Proxy-created child descriptor to its property
     * name so that `getErrorsFor(() => descriptor)` can look up errors.
     */
    #buildGetErrorsFor(
        issues: ReadonlyArray<StandardSchemaV1.Issue>,
        context?: ValidationContext
    ): {
        fn: (selector?: Function) => { isValid: boolean; errors: string[] };
        errorPropertyNames: string[];
    } {
        const errorsByProperty = new Map<string, string[]>();
        const errorPropertyNames: string[] = [];

        for (const issue of issues) {
            if (issue.path && issue.path.length > 0) {
                const firstName = firstPathSegmentStr(issue.path[0]);

                const restPath = issue.path.slice(1);
                const message =
                    restPath.length > 0
                        ? `${formatIssuePath(restPath)}: ${issue.message}`
                        : issue.message;

                if (!errorsByProperty.has(firstName)) {
                    errorsByProperty.set(firstName, []);
                    errorPropertyNames.push(firstName);
                }
                errorsByProperty.get(firstName)!.push(message);
            }
        }

        // Build reverse map: access each error property on the Proxy
        // descriptor to create (and cache) the child, then map it back
        // to the property name.
        const descriptorToName = new WeakMap<object, string>();
        const currentPropertyDescriptor = context?.currentPropertyDescriptor;
        if (currentPropertyDescriptor) {
            for (const name of errorPropertyNames) {
                const desc = (currentPropertyDescriptor as any)[name];
                if (desc && typeof desc === 'object') {
                    descriptorToName.set(desc, name);
                }
            }
        }

        const fn = (selector?: Function) => {
            let descriptor: any;
            if (typeof selector === 'function') {
                descriptor = selector(currentPropertyDescriptor);
            } else {
                descriptor = currentPropertyDescriptor;
            }

            if (!descriptor || typeof descriptor !== 'object') {
                return { isValid: true, errors: [] };
            }

            const propName = descriptorToName.get(descriptor);
            const errors = propName ? errorsByProperty.get(propName) || [] : [];

            return {
                isValid: errors.length === 0,
                errors
            };
        };

        return { fn, errorPropertyNames };
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
            const { fn } = this.#buildGetErrorsFor([], context);
            return {
                valid: true,
                object: result.value as TResult,
                getErrorsFor: fn
            } as any;
        }

        const { fn, errorPropertyNames } = this.#buildGetErrorsFor(
            result.issues,
            context
        );
        return {
            valid: false,
            errors: this.#mapIssues(result.issues),
            getErrorsFor: fn,
            __externErrorPropertyNames: errorPropertyNames
        } as any;
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
            const { fn } = this.#buildGetErrorsFor([], context);
            return {
                valid: true,
                object: result.value as TResult,
                getErrorsFor: fn
            } as any;
        }

        const { fn, errorPropertyNames } = this.#buildGetErrorsFor(
            result.issues,
            context
        );
        return {
            valid: false,
            errors: this.#mapIssues(result.issues),
            getErrorsFor: fn,
            __externErrorPropertyNames: errorPropertyNames
        } as any;
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
