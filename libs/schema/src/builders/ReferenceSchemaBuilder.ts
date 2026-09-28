import {
    type BRAND,
    type InferType,
    SchemaBuilder,
    type SchemaBuilderProps,
    SYMBOL_HAS_PROPERTIES,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type AnySchema = SchemaBuilder<any, any, any, any, any>;
type ReferenceValue<
    TSchema,
    TRequired extends boolean,
    TNullable extends boolean,
    TExplicitType
> =
    | (TRequired extends true
          ? Exclude<
                TExplicitType extends undefined
                    ? InferType<TSchema>
                    : TExplicitType,
                undefined
            >
          :
                | (TExplicitType extends undefined
                      ? InferType<TSchema>
                      : TExplicitType)
                | undefined)
    | (TNullable extends true ? null : never);
type ReferenceProps = Partial<SchemaBuilderProps<any>> & {
    targetSchema: AnySchema;
    presence?: boolean;
    nullability?: boolean;
};

/**
 * Immutable use-site wrapper around one named schema. Create it with schemaRef.
 * Local modifiers never clone or mutate the target definition.
 * @typeParam TSchema - Referenced schema.
 * @typeParam TRequired - Whether a value is required at this use site.
 * @typeParam TNullable - Whether null is allowed at this use site.
 * @typeParam THasDefault - Whether the wrapper supplies a default.
 * @typeParam TExplicitType - Optional static type override.
 */
export class ReferenceSchemaBuilder<
    TSchema extends AnySchema,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasDefault extends boolean = false,
    TExplicitType = undefined
> extends SchemaBuilder<
    ReferenceValue<TSchema, TRequired, TNullable, TExplicitType>,
    TRequired,
    TNullable,
    THasDefault
> {
    readonly #reference: ReferenceProps;
    /** @internal Enables nested property descriptors for referenced objects. */
    readonly [SYMBOL_HAS_PROPERTIES] = true;

    /** @internal Use schemaRef rather than constructing a reference directly. */
    constructor(props: ReferenceProps) {
        super({
            preprocessors: [],
            validators: [],
            ...props,
            type: 'reference'
        });
        this.#reference = props;
    }

    /** Describes the target and local modifiers without changing the target. */
    public introspect() {
        return {
            ...super.introspect(),
            targetSchema: this.#reference.targetSchema as TSchema,
            presence: this.#reference.presence,
            nullability: this.#reference.nullability,
            properties: (this.#reference.targetSchema.introspect() as any)
                .properties
        };
    }

    /** @internal Reconstructs an immutable wrapper around the same target. */
    protected createFromProps(props: ReferenceProps): this {
        return new ReferenceSchemaBuilder(props) as this;
    }

    /** Validates through the target and retains the inferred result type. */
    public validate(
        value: unknown,
        context?: ValidationContext
    ): ValidationResult<
        ReferenceValue<TSchema, TRequired, TNullable, TExplicitType>
    > {
        return super.validate(value, context);
    }

    /** Async validation with the same inference and fallback behavior. */
    public validateAsync(
        value: unknown,
        context?: ValidationContext
    ): Promise<
        ValidationResult<
            ReferenceValue<TSchema, TRequired, TNullable, TExplicitType>
        >
    > {
        return super.validateAsync(value, context);
    }

    #props(): ReferenceProps {
        return {
            ...this.#reference,
            ...this.introspect(),
            preprocessors: [...this.preprocessors],
            validators: [...this.validators]
        };
    }

    #early(value: unknown): ValidationResult<any> | undefined {
        if (value === undefined && this.hasDefault) return undefined;
        if (value === undefined && this.#reference.presence !== undefined) {
            return this.#reference.presence
                ? { valid: false, errors: [{ message: 'is required' }] }
                : { valid: true, object: undefined };
        }
        if (value === null && this.#reference.nullability !== undefined) {
            return this.#reference.nullability
                ? { valid: true, object: null }
                : { valid: false, errors: [{ message: 'must not be null' }] };
        }
        return undefined;
    }

    #checkNull(result: ValidationResult<any>): ValidationResult<any> {
        if (
            result.valid &&
            result.object === null &&
            this.#reference.nullability === false
        )
            return { valid: false, errors: [{ message: 'must not be null' }] };
        return result;
    }

    /** @internal Delegates validation while applying local presence and validators. */
    protected _validate(
        value: unknown,
        context?: ValidationContext
    ): ValidationResult<any> {
        const early = this.#early(value);
        if (early) {
            if (!early.valid && value === undefined)
                early.errors = [
                    {
                        message: this.getValidationErrorMessageSync(
                            this.requiredErrorMessage,
                            value as any
                        )
                    }
                ];
            return early;
        }
        const result = this.#checkNull(
            this.#reference.targetSchema.validate(
                value === undefined && this.hasDefault
                    ? this.resolveDefaultValue()
                    : value,
                context
            )
        );
        if (!result.valid) return result;
        const prepared = this.preValidateSync(result.object, context);
        if (!prepared.valid) return { valid: false, errors: prepared.errors };
        if (this.preprocessors.length === 0) return result;
        const preparedValue = prepared.transaction!.object.validatedObject;
        return this.#checkNull(
            this.#early(preparedValue) ??
                this.#reference.targetSchema.validate(preparedValue, context)
        );
    }

    /** @internal Async counterpart, including target validators and local callbacks. */
    protected async _validateAsync(
        value: unknown,
        context?: ValidationContext
    ): Promise<ValidationResult<any>> {
        const early = this.#early(value);
        if (early) {
            if (!early.valid && value === undefined)
                early.errors = [
                    {
                        message: await this.getValidationErrorMessage(
                            this.requiredErrorMessage,
                            value as any
                        )
                    }
                ];
            return early;
        }
        const result = this.#checkNull(
            await this.#reference.targetSchema.validateAsync(
                value === undefined && this.hasDefault
                    ? this.resolveDefaultValue()
                    : value,
                context
            )
        );
        if (!result.valid) return result;
        const prepared = await this.preValidateAsync(result.object, context);
        if (!prepared.valid) return { valid: false, errors: prepared.errors };
        if (this.preprocessors.length === 0) return result;
        const preparedValue = prepared.transaction!.object.validatedObject;
        return this.#checkNull(
            this.#early(preparedValue) ??
                (await this.#reference.targetSchema.validateAsync(
                    preparedValue,
                    context
                ))
        );
    }

    /** Overrides the static type only; target validation remains unchanged. */
    public hasType<T>(
        _notUsed?: T
    ): ReferenceSchemaBuilder<TSchema, TRequired, TNullable, THasDefault, T> {
        return this.createFromProps(this.#props()) as any;
    }

    /** Restores inference from the referenced schema. */
    public clearHasType(): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        TNullable,
        THasDefault
    > {
        return this.createFromProps(this.#props()) as any;
    }

    /** Rejects omitted values at this use site, unless a local default exists. */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): ReferenceSchemaBuilder<
        TSchema,
        true,
        TNullable,
        THasDefault,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.#props(),
            isRequired: true,
            presence: true,
            requiredValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /** Allows omission without invoking the target, unless a local default exists. */
    public optional(): ReferenceSchemaBuilder<
        TSchema,
        false,
        TNullable,
        THasDefault,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.#props(),
            isRequired: false,
            presence: false
        }) as any;
    }

    /** Allows null independently of omission at this use site. */
    public nullable(): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        true,
        THasDefault,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.#props(),
            isNullable: true,
            nullability: true
        }) as any;
    }

    /** Rejects null without modifying the target definition. */
    public notNullable(): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        false,
        THasDefault,
        Exclude<
            TExplicitType extends undefined
                ? InferType<TSchema>
                : TExplicitType,
            null
        >
    > {
        return this.createFromProps({
            ...this.#props(),
            isNullable: false,
            nullability: false
        }) as any;
    }

    /** Supplies a local default for omission, validated by the target. */
    public default(
        value: InferType<TSchema> | (() => InferType<TSchema>)
    ): ReferenceSchemaBuilder<TSchema, true, TNullable, true, TExplicitType> {
        return this.createFromProps({
            ...this.#props(),
            defaultValue: value,
            isRequired: true
        }) as any;
    }

    /** Removes the local default; target defaults are unchanged. */
    public clearDefault(): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        TNullable,
        false,
        TExplicitType
    > {
        return this.createFromProps({
            ...this.#props(),
            defaultValue: undefined
        }) as any;
    }

    /** Brands the inferred type without changing runtime validation. */
    public brand<B extends string | symbol>(
        _name?: B
    ): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        TNullable,
        THasDefault,
        (TExplicitType extends undefined
            ? InferType<TSchema>
            : TExplicitType) & { readonly [K in BRAND]: B }
    > {
        return super.brand(_name);
    }

    /** Makes the inferred type readonly without freezing runtime values. */
    public readonly(): ReferenceSchemaBuilder<
        TSchema,
        TRequired,
        TNullable,
        THasDefault,
        Readonly<
            TExplicitType extends undefined ? InferType<TSchema> : TExplicitType
        >
    > {
        return super.readonly();
    }
}

/**
 * References one named definition with independent use-site annotations.
 * @param schema - A reused schema constant with a nonempty schemaName.
 * @returns An immutable reference wrapper; the target is neither cloned nor mutated.
 * @throws Error if the target has no name.
 * @example
 * const User = object({ name: string() }).schemaName('User');
 * const previous = schemaRef(User).nullable().optional().describe('Previous user');
 */
export function schemaRef<TSchema extends AnySchema>(
    schema: TSchema
): ReferenceSchemaBuilder<
    TSchema,
    undefined extends InferType<TSchema> ? false : true,
    null extends InferType<TSchema> ? true : false
> {
    const info = schema.introspect();
    if (!info.schemaName?.trim())
        throw new Error('schemaRef requires a named schema.');
    return new ReferenceSchemaBuilder({
        targetSchema: schema,
        isRequired: info.isRequired,
        isNullable: info.isNullable
    });
}
