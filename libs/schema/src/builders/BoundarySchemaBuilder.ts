import {
    type BRAND,
    type InferInput,
    type InferOutput,
    SchemaBuilder,
    type SchemaBuilderProps,
    SYMBOL_HAS_PROPERTIES,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type AnySchema = SchemaBuilder<any, any, any, any, any, any>;
type BoundaryOutput<
    TOutputSchema,
    TRequired extends boolean,
    TNullable extends boolean,
    TExplicitType
> =
    | (TRequired extends true
          ? Exclude<
                TExplicitType extends undefined
                    ? InferOutput<TOutputSchema>
                    : TExplicitType,
                undefined
            >
          :
                | (TExplicitType extends undefined
                      ? InferOutput<TOutputSchema>
                      : TExplicitType)
                | undefined)
    | (TNullable extends true ? null : never);

type BoundaryProps = Partial<SchemaBuilderProps<any>> & {
    type: 'reference' | 'decode';
    inputSchema: AnySchema;
    outputSchema: AnySchema;
    converter?: (value: any) => any;
    presence?: boolean;
    nullability?: boolean;
};

/**
 * Immutable schema boundary returned by {@link schemaRef} and {@link decode}.
 * Use the factories rather than constructing this class. Local modifiers never
 * mutate the input/output schemas or their named definitions.
 * @typeParam TInputSchema - Schema validating values before conversion.
 * @typeParam TOutputSchema - Schema validating converted values.
 * @typeParam TRequired - Whether the output includes undefined.
 * @typeParam TNullable - Whether null is allowed by a use-site modifier.
 * @typeParam THasDefault - Whether the wrapper supplies an output default.
 * @typeParam TExplicitType - Optional static output override.
 * @typeParam TInput - Declared input, including use-site presence modifiers.
 */
export class BoundarySchemaBuilder<
    TInputSchema extends AnySchema,
    TOutputSchema extends AnySchema,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasDefault extends boolean = false,
    TExplicitType = undefined,
    TInput = InferInput<TInputSchema>
> extends SchemaBuilder<
    BoundaryOutput<TOutputSchema, TRequired, TNullable, TExplicitType>,
    TRequired,
    TNullable,
    THasDefault,
    {},
    InferInput<TInputSchema>,
    TInput | (THasDefault extends true ? undefined : never)
> {
    readonly #boundary: BoundaryProps;
    /** @internal Enables nested property descriptors without subclassing objects. */
    readonly [SYMBOL_HAS_PROPERTIES] = true;

    /** @internal Factory configuration is exposed for immutable reconstruction. */
    constructor(props: BoundaryProps) {
        super({ preprocessors: [], validators: [], ...props });
        this.#boundary = props;
    }

    /** Describes both sides without evaluating the converter. */
    public introspect() {
        return {
            ...super.introspect(),
            inputSchema: this.#boundary.inputSchema as TInputSchema,
            outputSchema: this.#boundary.outputSchema as TOutputSchema,
            converter: this.#boundary.converter,
            presence: this.#boundary.presence,
            nullability: this.#boundary.nullability,
            // Object consumers can preserve real descriptor schemas through refs.
            properties:
                this.type === 'reference'
                    ? (this.#boundary.outputSchema.introspect() as any)
                          .properties
                    : undefined
        };
    }

    /** @internal Rebuilds the wrapper while retaining the same target instances. */
    protected createFromProps(props: BoundaryProps): this {
        return new BoundarySchemaBuilder(props) as this;
    }

    #early(value: unknown): ValidationResult<any> | undefined {
        if (value === undefined && this.hasDefault) return undefined;
        if (value === undefined && this.#boundary.presence !== undefined) {
            return this.#boundary.presence
                ? { valid: false, errors: [{ message: 'is required' }] }
                : { valid: true, object: undefined };
        }
        if (value === null && this.#boundary.nullability !== undefined) {
            return this.#boundary.nullability
                ? { valid: true, object: null }
                : { valid: false, errors: [{ message: 'must not be null' }] };
        }
        return undefined;
    }

    #converterFailure(error: unknown): ValidationResult<any> {
        return {
            valid: false,
            errors: [
                {
                    message: `Decoder failed: ${error instanceof Error ? error.message : String(error)}`
                }
            ]
        };
    }

    #stageFailure(
        result: ValidationResult<any>,
        schema: AnySchema
    ): ValidationResult<any> {
        return Object.assign(result, { __boundaryErrorSchema: schema });
    }

    /** Validates unknown input; an output fallback is never decoded a second time. */
    public validate(
        value: unknown,
        context?: ValidationContext
    ): ValidationResult<
        BoundaryOutput<TOutputSchema, TRequired, TNullable, TExplicitType>
    > {
        const result = this._validate(value, context);
        if (result.valid || !this.hasCatch) return result;
        const fallback = this.resolveCatchValue();
        const checked = this.#boundary.outputSchema.validate(fallback, context);
        return checked.valid ? checked : { valid: true, object: fallback };
    }

    /** Async validation with the same output-fallback and error semantics as validate. */
    public async validateAsync(
        value: unknown,
        context?: ValidationContext
    ): Promise<
        ValidationResult<
            BoundaryOutput<TOutputSchema, TRequired, TNullable, TExplicitType>
        >
    > {
        const result = await this._validateAsync(value, context);
        if (result.valid || !this.hasCatch) return result;
        const fallback = this.resolveCatchValue();
        const checked = await this.#boundary.outputSchema.validateAsync(
            fallback,
            context
        );
        return checked.valid ? checked : { valid: true, object: fallback };
    }

    /** @internal Validates input, converts once, and validates output. */
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
        const usesDefault = value === undefined && this.hasDefault;
        const input = usesDefault
            ? { valid: true, object: this.resolveDefaultValue() }
            : this.#boundary.inputSchema.validate(value, context);
        if (!input.valid)
            return this.#stageFailure(input, this.#boundary.inputSchema);
        let converted = input.object;
        if (!usesDefault && this.#boundary.converter) {
            try {
                converted = this.#boundary.converter(converted);
            } catch (error) {
                return this.#converterFailure(error);
            }
            if (converted != null && typeof converted.then === 'function') {
                throw new Error(
                    'Decoder returned a Promise. Use validateAsync() or parseAsync().'
                );
            }
        }
        const output =
            this.type === 'reference' && !usesDefault
                ? input
                : this.#boundary.outputSchema.validate(converted, context);
        if (!output.valid)
            return this.#stageFailure(output, this.#boundary.outputSchema);
        if (output.object === null && this.#boundary.nullability === false) {
            return { valid: false, errors: [{ message: 'must not be null' }] };
        }
        const prepared = this.preValidateSync(output.object, context);
        if (!prepared.valid) return { valid: false, errors: prepared.errors };
        const preparedValue = prepared.transaction!.object.validatedObject;
        if (this.preprocessors.length === 0) return output;
        return this.#boundary.outputSchema.validate(preparedValue, context);
    }

    /** @internal Async counterpart; converter rejections are validation failures. */
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
        const usesDefault = value === undefined && this.hasDefault;
        const input = usesDefault
            ? { valid: true, object: this.resolveDefaultValue() }
            : await this.#boundary.inputSchema.validateAsync(value, context);
        if (!input.valid)
            return this.#stageFailure(input, this.#boundary.inputSchema);
        let converted = input.object;
        if (!usesDefault && this.#boundary.converter) {
            try {
                converted = await this.#boundary.converter(converted);
            } catch (error) {
                return this.#converterFailure(error);
            }
        }
        const output =
            this.type === 'reference' && !usesDefault
                ? input
                : await this.#boundary.outputSchema.validateAsync(
                      converted,
                      context
                  );
        if (!output.valid)
            return this.#stageFailure(output, this.#boundary.outputSchema);
        if (output.object === null && this.#boundary.nullability === false) {
            return { valid: false, errors: [{ message: 'must not be null' }] };
        }
        const prepared = await this.preValidateAsync(output.object, context);
        if (!prepared.valid) return { valid: false, errors: prepared.errors };
        const preparedValue = prepared.transaction!.object.validatedObject;
        if (this.preprocessors.length === 0) return output;
        return this.#boundary.outputSchema.validateAsync(
            preparedValue,
            context
        );
    }

    /** Overrides only the static output type; runtime validation is unchanged. */
    public hasType<T>(
        _notUsed?: T
    ): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        TNullable,
        THasDefault,
        T,
        TInput
    > {
        return this.createFromProps(this.#props()) as any;
    }

    /** Restores output inference from the output schema. */
    public clearHasType(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        TNullable,
        THasDefault,
        undefined,
        TInput
    > {
        return this.createFromProps(this.#props()) as any;
    }

    #props(): BoundaryProps {
        return {
            ...this.#boundary,
            ...this.introspect(),
            type: this.#boundary.type,
            preprocessors: [...this.preprocessors],
            validators: [...this.validators]
        };
    }

    /** Rejects missing input at this use site. */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        true,
        TNullable,
        THasDefault,
        TExplicitType,
        Exclude<TInput, undefined>
    > {
        return this.createFromProps({
            ...this.#props(),
            isRequired: true,
            presence: true,
            requiredValidationErrorMessageProvider: errorMessage
        }) as any;
    }

    /** Allows omitted input at this use site, without invoking the boundary. */
    public optional(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        false,
        TNullable,
        THasDefault,
        TExplicitType,
        TInput | undefined
    > {
        return this.createFromProps({
            ...this.#props(),
            isRequired: false,
            presence: false
        }) as any;
    }

    /** Allows null at this use site, independently of optionality. */
    public nullable(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        true,
        THasDefault,
        TExplicitType,
        TInput | null
    > {
        return this.createFromProps({
            ...this.#props(),
            isNullable: true,
            nullability: true
        }) as any;
    }

    /** Rejects null at this use site without changing the referenced definition. */
    public notNullable(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        false,
        THasDefault,
        Exclude<
            TExplicitType extends undefined
                ? InferOutput<TOutputSchema>
                : TExplicitType,
            null
        >,
        Exclude<TInput, null>
    > {
        return this.createFromProps({
            ...this.#props(),
            isNullable: false,
            nullability: false
        }) as any;
    }

    /** Supplies an output default for missing input; validates it without decoding. */
    public default(
        value: InferOutput<TOutputSchema> | (() => InferOutput<TOutputSchema>)
    ): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        true,
        TNullable,
        true,
        TExplicitType,
        TInput
    > {
        return this.createFromProps({
            ...this.#props(),
            defaultValue: value,
            isRequired: true
        }) as any;
    }

    /** Removes the use-site default; defaults on the target are unchanged. */
    public clearDefault(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        TNullable,
        false,
        TExplicitType,
        TInput
    > {
        return this.createFromProps({
            ...this.#props(),
            defaultValue: undefined
        }) as any;
    }

    /** Brands the output type only; it does not alter runtime validation. */
    public brand<B extends string | symbol>(
        _name?: B
    ): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        TNullable,
        THasDefault,
        (TExplicitType extends undefined
            ? InferOutput<TOutputSchema>
            : TExplicitType) & {
            readonly [K in BRAND]: B;
        },
        TInput
    > {
        return super.brand(_name);
    }

    /** Makes the output type readonly without freezing runtime values. */
    public readonly(): BoundarySchemaBuilder<
        TInputSchema,
        TOutputSchema,
        TRequired,
        TNullable,
        THasDefault,
        Readonly<
            TExplicitType extends undefined
                ? InferOutput<TOutputSchema>
                : TExplicitType
        >,
        TInput
    > {
        return super.readonly();
    }
}

type RequiredOf<S> = undefined extends InferOutput<S> ? false : true;
type NullableOf<S> = null extends InferOutput<S> ? true : false;

/**
 * References one named definition with independent use-site annotations.
 * @param schema - A reused schema constant with a nonempty schemaName.
 * @returns An immutable reference wrapper; the named target is not cloned.
 * @throws Error if the target has no name.
 * @example
 * const User = object({ name: string() }).schemaName('User');
 * const previous = schemaRef(User).nullable().optional().describe('Previous user');
 */
export function schemaRef<S extends AnySchema>(
    schema: S
): BoundarySchemaBuilder<S, S, RequiredOf<S>, NullableOf<S>> {
    const info = schema.introspect();
    if (!info.schemaName?.trim())
        throw new Error('schemaRef requires a named schema.');
    return new BoundarySchemaBuilder({
        type: 'reference',
        inputSchema: schema,
        outputSchema: schema,
        isRequired: info.isRequired,
        isNullable: info.isNullable
    });
}

/**
 * Composes input validation, an explicit conversion, and output validation.
 * @param inputSchema - Validates external input before the converter runs.
 * @param outputSchema - Validates the converted result.
 * @param converter - Receives validated input; may return a Promise.
 * @returns A schema with distinct inferred input/output types.
 * @remarks Converter exceptions become validation failures. Async converters
 * require parseAsync/validateAsync. JSON Schema documents declared shapes only,
 * not arbitrary conversion logic. This is not a bidirectional codec.
 * @example
 * const PageSize = decode(string(), number().isInteger().min(1), Number);
 * PageSize.parse('12'); // 12
 */
export function decode<
    TInputSchema extends AnySchema,
    TOutputSchema extends AnySchema
>(
    inputSchema: TInputSchema,
    outputSchema: TOutputSchema,
    converter: (
        input: InferOutput<TInputSchema>
    ) => InferInput<TOutputSchema> | Promise<InferInput<TOutputSchema>>
): BoundarySchemaBuilder<
    TInputSchema,
    TOutputSchema,
    RequiredOf<TOutputSchema>,
    NullableOf<TOutputSchema>
> {
    const info = outputSchema.introspect();
    return new BoundarySchemaBuilder({
        type: 'decode',
        inputSchema,
        outputSchema,
        converter,
        isRequired: info.isRequired,
        isNullable: info.isNullable
    });
}
