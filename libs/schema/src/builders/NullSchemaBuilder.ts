import {
    type BRAND,
    SchemaBuilder,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type NullSchemaBuilderCreateProps<R extends boolean = true> = Partial<
    ReturnType<NullSchemaBuilder<R>['introspect']>
>;

/**
 * Schema builder for `null` values. Validates that the input is exactly `null`.
 *
 * When required (the default), only `null` is accepted. When optional (via
 * `.optional()`), both `null` and `undefined` are accepted; any other value
 * is rejected.
 *
 * This builder is useful when you need to represent an explicitly-null field
 * in a typed schema, for example in discriminated-union branches or when
 * modelling a JSON payload that may carry a JSON `null` value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link nul | nul()} function instead.
 *
 * @example
 * ```ts
 * import { nul } from '@cleverbrush/schema';
 *
 * const schema = nul();
 *
 * schema.validate(null);       // { valid: true,  object: null }
 * schema.validate(undefined);  // { valid: false }
 * schema.validate(0);          // { valid: false }
 * schema.validate('');         // { valid: false }
 * ```
 *
 * @example
 * ```ts
 * // Optional — accepts null or undefined
 * const schema = nul().optional();
 *
 * schema.validate(null);       // { valid: true, object: null }
 * schema.validate(undefined);  // { valid: true, object: undefined }
 * schema.validate(false);      // { valid: false }
 * ```
 *
 * @example
 * ```ts
 * // Use inside a union to model a nullable string field
 * import { union, string, nul, InferType } from '@cleverbrush/schema';
 *
 * const NullableString = union(string()).or(nul());
 * type NullableString = InferType<typeof NullableString>;
 * // string | null
 *
 * NullableString.validate('hello');  // valid
 * NullableString.validate(null);     // valid
 * NullableString.validate(42);       // invalid
 * ```
 *
 * @see {@link nul}
 */
export class NullSchemaBuilder<
    TRequired extends boolean = true,
    TExplicitType = undefined,
    TExtensions = {}
> extends SchemaBuilder<null, TRequired, TExtensions> {
    /**
     * @hidden
     */
    public static create(props: NullSchemaBuilderCreateProps<any>) {
        return new NullSchemaBuilder({
            type: 'null',
            ...props
        });
    }

    protected constructor(props: NullSchemaBuilderCreateProps<TRequired>) {
        super(props as any);
    }

    /**
     * @hidden
     */
    public hasType<T>(
        _notUsed?: T
    ): NullSchemaBuilder<true, T, TExtensions> & TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    /**
     * @hidden
     */
    public clearHasType(): NullSchemaBuilder<
        TRequired,
        undefined,
        TExtensions
    > &
        TExtensions {
        return this.createFromProps({
            ...this.introspect()
        } as any) as any;
    }

    // The SchemaBuilder base-class preValidateSync/preValidateAsync treats
    // null as an invalid value for required schemas, which would prevent null
    // from ever passing validation here. We therefore bypass preValidateSync
    // entirely and implement the full (and simple) validation inline.
    #buildResult(object: any, path: string): ValidationResult<null> {
        if (object === null) return { valid: true, object: null };

        if (object === undefined && !this.isRequired) {
            return { valid: true, object: undefined as any };
        }

        return {
            valid: false,
            errors: [{ message: 'must be null', path }]
        };
    }

    /**
     * Performs synchronous validation of the schema over `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public validate(
        object: null,
        context?: ValidationContext
    ): ValidationResult<null> {
        return this.#buildResult(object, context?.path ?? '$');
    }

    /**
     * Performs async validation of the schema over `object`.
     * @param context Optional `ValidationContext` settings.
     */
    public async validateAsync(
        object: null,
        context?: ValidationContext
    ): Promise<ValidationResult<null>> {
        return this.#buildResult(object, context?.path ?? '$');
    }

    protected createFromProps<TReq extends boolean>(
        props: NullSchemaBuilderCreateProps<TReq>
    ): this {
        return NullSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): NullSchemaBuilder<true, TExplicitType, TExtensions> & TExtensions {
        return super.required(errorMessage);
    }

    /**
     * @hidden
     */
    public optional(): NullSchemaBuilder<false, TExplicitType, TExtensions> &
        TExtensions {
        return super.optional();
    }

    /**
     * @hidden
     */
    public brand<TBrand extends string | symbol>(
        _name?: TBrand
    ): NullSchemaBuilder<
        TRequired,
        null & { readonly [K in BRAND]: TBrand },
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }
}

/**
 * Creates a schema that validates the value is exactly `null`.
 *
 * By default the schema is **required** — only `null` is accepted.
 * Call `.optional()` to also allow `undefined`.
 *
 * @example
 * ```ts
 * import { nul } from '@cleverbrush/schema';
 *
 * nul().validate(null);       // { valid: true,  object: null }
 * nul().validate(undefined);  // { valid: false }
 * nul().validate(0);          // { valid: false }
 * ```
 *
 * @example
 * ```ts
 * nul().optional().validate(null);       // { valid: true, object: null }
 * nul().optional().validate(undefined);  // { valid: true, object: undefined }
 * nul().optional().validate(false);      // { valid: false }
 * ```
 *
 * @example
 * ```ts
 * // Nullable field in an object schema
 * import { object, string, nul, union, InferType } from '@cleverbrush/schema';
 *
 * const Schema = object({
 *   name:    string(),
 *   deleted: union(nul()).or(string()),   // null | string
 * });
 *
 * type T = InferType<typeof Schema>;
 * // { name: string; deleted: null | string }
 * ```
 */
export const nul = () =>
    NullSchemaBuilder.create({
        isRequired: true
    }) as NullSchemaBuilder<true>;
