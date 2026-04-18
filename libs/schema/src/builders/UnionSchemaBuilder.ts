import type {
    ObjectSchemaBuilder,
    ObjectSchemaValidationResult
} from './ObjectSchemaBuilder.js';
import {
    type BRAND,
    createHybridErrorArray,
    type InferType,
    type NestedValidationResult,
    type PropertyDescriptor,
    SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    type ValidationContext,
    type ValidationErrorMessageProvider,
    type ValidationResult
} from './SchemaBuilder.js';

type UnionSchemaBuilderCreateProps<
    T extends readonly SchemaBuilder<any, any, any, any, any>[],
    R extends boolean = true
> = Partial<ReturnType<UnionSchemaBuilder<T, R>['introspect']>>;

/**
 * Mapped tuple type that converts a tuple of SchemaBuilder options into
 * a tuple of their corresponding validation results.
 * Union schema options get `UnionSchemaValidationResult` with recursive
 * `getNestedErrors` navigation; object schema options get
 * `ObjectSchemaValidationResult`; other types get `ValidationResult`.
 */
export type OptionValidationResults<
    TOptions extends readonly SchemaBuilder<any, any, any, any, any>[]
> = {
    [K in keyof TOptions]: TOptions[K] extends UnionSchemaBuilder<
        infer UOptions extends readonly SchemaBuilder<
            any,
            any,
            any,
            any,
            any
        >[],
        any,
        any
    >
        ? UnionSchemaValidationResult<InferType<TOptions[K]>, UOptions>
        : TOptions[K] extends ObjectSchemaBuilder<any, any, any, any>
          ? ObjectSchemaValidationResult<InferType<TOptions[K]>, TOptions[K]>
          : ValidationResult<InferType<TOptions[K]>>;
};

/**
 * Validation result type returned by `UnionSchemaBuilder.validate()`.
 * Extends `ValidationResult` with:
 * - `getNestedErrors` for root-level union errors and per-branch validation results
 */
export type UnionSchemaValidationResult<
    T,
    TOptions extends readonly SchemaBuilder<any, any, any, any, any>[]
> = ValidationResult<T> & {
    /**
     * Returns root-level union validation errors combined with
     * per-branch validation results.
     * The returned value has both `NestedValidationResult` properties
     * (`errors`, `isValid`, `descriptor`, `seenValue`) and tuple-indexed
     * branch results (`[0]`, `[1]`, etc.).
     */
    getNestedErrors(): OptionValidationResults<TOptions> &
        NestedValidationResult<any, any, any>;
};

type SchemaArrayToUnion<
    TArr extends readonly SchemaBuilder<any, any, any, any, any>[]
> = TArr['length'] extends 1
    ? InferType<TArr[0]>
    : TArr extends readonly [
            infer TFirst extends SchemaBuilder<any, any, any, any, any>,
            ...infer TRest extends SchemaBuilder<any, any, any, any, any>[]
        ]
      ? InferType<TFirst> | SchemaArrayToUnion<[...TRest]>
      : never;

type TakeBeforeIndex<
    TArr extends readonly SchemaBuilder<any, any, any, any, any>[],
    TIndex extends number
> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any, any, any, any>[],
    infer _ extends SchemaBuilder<any, any, any, any, any>
]
    ? TRest['length'] extends TIndex
        ? TRest
        : TakeBeforeIndex<TRest, TIndex>
    : never;

type TakeAfterIndex<
    TArr extends readonly SchemaBuilder<any, any, any, any, any>[],
    TIndex extends number,
    TAcc extends readonly SchemaBuilder<any, any, any, any, any>[] = []
> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any, any, any, any>[],
    infer TLast extends SchemaBuilder<any, any, any, any, any>
]
    ? TRest['length'] extends TIndex
        ? TAcc
        : TakeAfterIndex<TRest, TIndex, [TLast, ...TAcc]>
    : never;

type TakeExceptIndex<
    TArr extends readonly SchemaBuilder<any, any, any, any, any>[],
    TIndex extends number
> = [...TakeBeforeIndex<TArr, TIndex>, ...TakeAfterIndex<TArr, TIndex>];

/**
 * Union schema builder class. Allows to create schemas
 * containing alternatives. E.g. string | number | Date.
 * Use it when you want to define a schema for a value
 * that can be of different types. The type of the value
 * will be determined by the first schema that succeeds
 * validation. Any schema type can be supplied as variant.
 * Which means that you are not limited to primitive types and
 * can construct complex types as well, e.g. object | array.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link union | union()} function instead.
 *
 * @example
 * ```ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = schema.validate('foo');
 * // result.valid === true
 * // result.object === 'foo'
 * ```
 *
 * @example
 * ```ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = schema.validate('baz');
 * // result.valid === false
 * ```
 *
 * @example
 * ```ts
 * const schema = union(string('yes')).or(string('no')).or(number(0)).or(number(1));
 * // equals to 'yes' | 'no' | 0 | 1 in TS
 * const result = schema.validate('yes');
 * // result.valid === true
 * // result.object === 'yes'
 *
 * const result2 = schema.validate(0);
 * // result2.valid === true
 * // result2.object === 0
 *
 * const result3 = schema.validate('baz');
 * // result3.valid === false
 *
 * const result4 = schema.validate(2);
 * // result4.valid === false
 * ```
 *
 * @see {@link union}
 */
export class UnionSchemaBuilder<
    TOptions extends readonly SchemaBuilder<any, any, any, any, any>[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    TExplicitType = undefined,
    THasDefault extends boolean = false,
    TExtensions = {}
> extends SchemaBuilder<
    TExplicitType extends undefined
        ? SchemaArrayToUnion<TOptions>
        : TExplicitType,
    TRequired,
    TNullable,
    THasDefault,
    TExtensions
> {
    #options!: TOptions;
    #discriminatorKey: string | null = null;
    #discriminatorMap: Map<
        string | number,
        SchemaBuilder<any, any, any, any, any>
    > | null = null;

    /**
     * @hidden
     */
    public static create(props: UnionSchemaBuilderCreateProps<any>) {
        return new UnionSchemaBuilder({
            type: 'union',
            ...props
        });
    }

    protected constructor(
        props: UnionSchemaBuilderCreateProps<TOptions, TRequired>
    ) {
        super(props as any);

        if (Array.isArray(props.options)) {
            this.#options = props.options;
            this.#detectDiscriminator();
        }
    }

    /**
     * Attempts to detect a discriminator property shared by all union options.
     * If all options are object schemas with a common required string/number
     * property that uses `equalsTo` with unique literal values, builds a Map
     * for O(1) dispatch.
     */
    #detectDiscriminator() {
        const options = this.#options;
        if (!options || options.length < 2) return;

        // All options must be object schemas
        const introspected: Array<{
            type: string;
            isRequired: boolean;
            properties?: Record<string, SchemaBuilder<any, any, any, any, any>>;
            [k: string]: any;
        }> = [];
        for (const option of options) {
            const info = option.introspect();
            if (info.type !== 'object') return;
            introspected.push(info);
        }

        // Find common property keys
        const firstProps = introspected[0].properties;
        if (!firstProps) return;

        for (const key of Object.keys(firstProps)) {
            const map = new Map<
                string | number,
                SchemaBuilder<any, any, any, any, any>
            >();
            let isDiscriminator = true;

            for (let i = 0; i < introspected.length; i++) {
                const props = introspected[i].properties;
                if (!props || !(key in props)) {
                    isDiscriminator = false;
                    break;
                }

                const propSchema = props[key];
                const propInfo = propSchema.introspect();

                // Must be a required string or number with equalsTo
                if (propInfo.isRequired !== true) {
                    isDiscriminator = false;
                    break;
                }

                const equalsTo = (propInfo as any).equalsTo;
                if (equalsTo === undefined || equalsTo === null) {
                    isDiscriminator = false;
                    break;
                }

                if (
                    typeof equalsTo !== 'string' &&
                    typeof equalsTo !== 'number'
                ) {
                    isDiscriminator = false;
                    break;
                }

                // Check for duplicate discriminator values
                if (map.has(equalsTo)) {
                    isDiscriminator = false;
                    break;
                }

                map.set(equalsTo, options[i]);
            }

            if (isDiscriminator && map.size === options.length) {
                this.#discriminatorKey = key;
                this.#discriminatorMap = map;
                return;
            }
        }
    }

    public introspect() {
        return {
            ...super.introspect(),
            /**
             * Array of schemas participating in the union.
             */
            options: this.#options,
            /**
             * When the union is a discriminated union (all branches are objects
             * sharing a required property with unique literal values), this is
             * the name of that property. `undefined` otherwise.
             */
            discriminatorPropertyName: this.#discriminatorKey ?? undefined
        };
    }

    /**
     * Null is a legitimate JavaScript value that a union option (e.g.
     * `NullSchemaBuilder`) may accept. Override the base-class behaviour so
     * that a required union does **not** reject `null` during pre-validation;
     * instead, each option gets the opportunity to validate it.
     * @override
     */
    protected override get isNullRequiredViolation(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    public hasType<T>(
        _notUsed?: T
    ): UnionSchemaBuilder<
        TOptions,
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
    public clearHasType(): UnionSchemaBuilder<
        TOptions,
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

    #createValidationSetup(
        object: any,
        superResult: ReturnType<UnionSchemaBuilder<any>['preValidateSync']>
    ) {
        const {
            valid,
            transaction: preValidationTransaction,
            context: prevalidationContext,
            errors
        } = superResult;

        // Create a self-referencing property descriptor for the union root
        const selfDescriptor: PropertyDescriptor<any, any, any> = {
            [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
                setValue: () => false,
                getValue: (obj: any) => ({
                    success: true,
                    value: obj
                }),
                getSchema: () => this,
                parent: undefined,
                propertyName: undefined,
                toJsonPointer: () => ''
            }
        };

        // Root error state
        const rootErrors: string[] = [];

        const optionResults = createHybridErrorArray(
            [] as any[],
            () => object,
            () => rootErrors,
            () => selfDescriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
        );

        const getNestedErrors = (() => optionResults) as any;

        if (!valid) {
            rootErrors.push(
                ...(errors || []).map((e: any) => e.message || String(e))
            );
            return {
                needsOptionValidation: false as const,
                result: { valid, errors, getNestedErrors } as any
            };
        }

        const {
            object: { validatedObject: objToValidate }
        } = preValidationTransaction!;

        if (
            (typeof objToValidate === 'undefined' && !this.isRequired) ||
            (objToValidate === null && (!this.isRequired || this.isNullable))
        ) {
            return {
                needsOptionValidation: false as const,
                result: {
                    valid: true,
                    object: objToValidate,
                    getNestedErrors
                } as any
            };
        }

        return {
            needsOptionValidation: true as const,
            objToValidate,
            prevalidationContext,
            preValidationTransaction: preValidationTransaction!,
            getNestedErrors,
            optionResults,
            rootErrors
        };
    }

    #processOptionResult(
        optionResult: any,
        index: number,
        optionResults: any,
        preValidationTransaction: any,
        state: {
            objToValidate: any;
            minErrorsCount: number;
            resultingErrors: any[];
        },
        getNestedErrors: any
    ): any | null {
        optionResults[index] = optionResult;

        if (optionResult.valid) {
            return {
                valid: true,
                object: optionResult.object as any,
                getNestedErrors
            };
        }

        const optErrors = optionResult.errors;
        if (
            Array.isArray(optErrors) &&
            optErrors.length > 0 &&
            optErrors.length < state.minErrorsCount
        ) {
            state.resultingErrors = optErrors as any;
            state.minErrorsCount = optErrors.length;
        }

        state.objToValidate =
            preValidationTransaction.rollback().validatedObject;
        return null;
    }

    /**
     * Performs synchronous validation of the union schema over `object`. {@inheritDoc SchemaBuilder.validate}
     */
    public validate(
        object: TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        context?: ValidationContext
    ): UnionSchemaValidationResult<
        TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        TOptions
    > {
        return super.validate(object, context) as any;
    }

    /**
     * Performs async validation of the union schema over `object`. {@inheritDoc SchemaBuilder.validateAsync}
     */
    public async validateAsync(
        object: TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        context?: ValidationContext
    ): Promise<
        UnionSchemaValidationResult<
            TExplicitType extends undefined
                ? SchemaArrayToUnion<TOptions>
                : TExplicitType,
            TOptions
        >
    > {
        return super.validateAsync(object, context) as any;
    }

    /**
     * Performs synchronous validation of the union schema over `object`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional `ValidationContext` settings.
     */
    protected _validate(
        object: TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        context?: ValidationContext
    ): UnionSchemaValidationResult<
        TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        TOptions
    > {
        // Fast path: skip preValidateSync + createValidationSetup when
        // there are no preprocessors/validators and context is default.
        if (
            this.canSkipPreValidation &&
            !context?.doNotStopOnFirstError &&
            !context?.rootPropertyDescriptor
        ) {
            // Required / optional check.
            // `undefined` is the canonical "missing value" signal — handle it
            // exactly as before (default, optional valid, required error).
            // `null` is a legitimate JavaScript value: for optional unions it is
            // valid without consulting options (original behaviour); for required
            // unions we fall through to option-checking so that a
            // NullSchemaBuilder option can accept it.
            if (typeof object === 'undefined') {
                if (this.hasDefault) {
                    object = this.resolveDefaultValue();
                } else if (!this.isRequired) {
                    return this.#fastResult(
                        true,
                        object,
                        undefined,
                        object,
                        context
                    );
                } else {
                    return this.#fastResult(
                        false,
                        undefined,
                        [
                            {
                                message: this.getValidationErrorMessageSync(
                                    this.requiredErrorMessage,
                                    object as any
                                )
                            }
                        ],
                        object,
                        context
                    );
                }
            } else if (
                object === null &&
                (!this.isRequired || this.isNullable)
            ) {
                // Optional union: null is valid without checking options.
                return this.#fastResult(
                    true,
                    object,
                    undefined,
                    object,
                    context
                );
            }
            // null + required union: fall through to option checking below.

            // Discriminated union: O(1) lookup, no setup overhead
            if (this.#discriminatorKey && this.#discriminatorMap) {
                if (typeof object === 'object' && object !== null) {
                    const discriminatorValue = (object as any)[
                        this.#discriminatorKey
                    ];
                    const matchedSchema =
                        this.#discriminatorMap.get(discriminatorValue);
                    if (matchedSchema) {
                        const optionResult = matchedSchema.validate(
                            object as any
                        );
                        return this.#fastResult(
                            optionResult.valid,
                            optionResult.valid
                                ? optionResult.object
                                : undefined,
                            optionResult.valid
                                ? undefined
                                : optionResult.errors,
                            object,
                            context
                        );
                    }
                    // Discriminator value not in map — no option matches
                    return this.#fastResult(
                        false,
                        undefined,
                        [
                            {
                                message:
                                    "value doesn't match any option in union schema"
                            }
                        ],
                        object,
                        context
                    );
                }
            }

            // Non-discriminated union: try options sequentially, no transaction overhead
            if (!this.#discriminatorKey) {
                const options = this.#options;
                let minErrorsCount = Number.MAX_SAFE_INTEGER;
                let resultingErrors: any[] = [];

                for (let i = 0; i < options.length; i++) {
                    const optionResult = options[i].validate(object as any);
                    if (optionResult.valid) {
                        return this.#fastResult(
                            true,
                            optionResult.object,
                            undefined,
                            object,
                            context
                        );
                    }

                    const optErrors = optionResult.errors;
                    if (
                        Array.isArray(optErrors) &&
                        optErrors.length > 0 &&
                        optErrors.length < minErrorsCount
                    ) {
                        resultingErrors = optErrors as any;
                        minErrorsCount = optErrors.length;
                    }
                }

                return this.#fastResult(
                    false,
                    undefined,
                    resultingErrors,
                    object,
                    context
                );
            }
        }

        return this.#validateFull(object, context) as any;
    }

    /**
     * Build a fast-path result with a lazy `getNestedErrors` that
     * defers to the full validation only when actually called.
     */
    #fastResult(
        valid: boolean,
        obj: any,
        errors: any[] | undefined,
        originalObject: any,
        context: ValidationContext | undefined
    ): any {
        const self = this;
        if (valid) {
            return {
                valid: true,
                object: obj,
                getNestedErrors() {
                    return self
                        .#validateFull(originalObject, context)
                        .getNestedErrors();
                }
            };
        }
        return {
            valid: false,
            errors,
            getNestedErrors() {
                return self
                    .#validateFull(originalObject, context)
                    .getNestedErrors();
            }
        };
    }

    #validateFull(
        object: any,
        context?: ValidationContext
    ): UnionSchemaValidationResult<any, any> {
        const setup = this.#createValidationSetup(
            object,
            this.preValidateSync(object, context)
        );

        if (!setup.needsOptionValidation) return setup.result;

        const {
            prevalidationContext,
            preValidationTransaction,
            getNestedErrors,
            optionResults,
            rootErrors
        } = setup;

        // Fast path: discriminated union with O(1) lookup
        if (this.#discriminatorKey && this.#discriminatorMap) {
            const obj = setup.objToValidate;
            if (typeof obj === 'object' && obj !== null) {
                const discriminatorValue = obj[this.#discriminatorKey];
                const matchedSchema =
                    this.#discriminatorMap.get(discriminatorValue);
                if (matchedSchema) {
                    const optionResult = matchedSchema.validate(obj, {
                        ...prevalidationContext,
                        currentPropertyDescriptor: undefined,
                        rootPropertyDescriptor: undefined
                    } as any);
                    if (optionResult.valid) {
                        return {
                            valid: true,
                            object: optionResult.object as any,
                            getNestedErrors
                        };
                    }
                }
            }
        }

        const state = {
            objToValidate: setup.objToValidate,
            minErrorsCount: Number.MAX_SAFE_INTEGER,
            resultingErrors: [] as any[]
        };

        for (let i = 0; i < this.#options.length; i++) {
            const optionResult = this.#options[i].validate(
                state.objToValidate,
                {
                    ...prevalidationContext,
                    currentPropertyDescriptor: undefined,
                    rootPropertyDescriptor: undefined
                } as any
            );

            const earlyReturn = this.#processOptionResult(
                optionResult,
                i,
                optionResults,
                preValidationTransaction,
                state,
                getNestedErrors
            );
            if (earlyReturn) return earlyReturn;
        }

        rootErrors.push("value doesn't match any option in union schema");

        return {
            valid: false,
            errors: state.resultingErrors,
            getNestedErrors
        };
    }

    /**
     * Performs async validation of the union schema over `object`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional `ValidationContext` settings.
     */
    protected async _validateAsync(
        object: TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType,
        context?: ValidationContext
    ): Promise<
        UnionSchemaValidationResult<
            TExplicitType extends undefined
                ? SchemaArrayToUnion<TOptions>
                : TExplicitType,
            TOptions
        >
    > {
        const setup = this.#createValidationSetup(
            object,
            await super.preValidateAsync(object, context)
        );

        if (!setup.needsOptionValidation) return setup.result;

        const {
            prevalidationContext,
            preValidationTransaction,
            getNestedErrors,
            optionResults,
            rootErrors
        } = setup;

        // Fast path: discriminated union with O(1) lookup
        if (this.#discriminatorKey && this.#discriminatorMap) {
            const obj = setup.objToValidate;
            if (typeof obj === 'object' && obj !== null) {
                const discriminatorValue = obj[this.#discriminatorKey];
                const matchedSchema =
                    this.#discriminatorMap.get(discriminatorValue);
                if (matchedSchema) {
                    const optionResult = await matchedSchema.validateAsync(
                        obj,
                        {
                            ...prevalidationContext,
                            currentPropertyDescriptor: undefined,
                            rootPropertyDescriptor: undefined
                        } as any
                    );
                    if (optionResult.valid) {
                        return {
                            valid: true,
                            object: optionResult.object as any,
                            getNestedErrors
                        };
                    }
                }
            }
        }

        const state = {
            objToValidate: setup.objToValidate,
            minErrorsCount: Number.MAX_SAFE_INTEGER,
            resultingErrors: [] as any[]
        };

        for (let i = 0; i < this.#options.length; i++) {
            const optionResult = await this.#options[i].validateAsync(
                state.objToValidate,
                {
                    ...prevalidationContext,
                    currentPropertyDescriptor: undefined,
                    rootPropertyDescriptor: undefined
                } as any
            );

            const earlyReturn = this.#processOptionResult(
                optionResult,
                i,
                optionResults,
                preValidationTransaction,
                state,
                getNestedErrors
            );
            if (earlyReturn) return earlyReturn;
        }

        rootErrors.push("value doesn't match any option in union schema");

        return {
            valid: false,
            errors: state.resultingErrors,
            getNestedErrors
        };
    }

    protected createFromProps<
        T extends readonly SchemaBuilder<any, any, any, any, any>[],
        TReq extends boolean
    >(props: UnionSchemaBuilderCreateProps<T, TReq>): this {
        return UnionSchemaBuilder.create(props as any) as any;
    }

    /**
     * @hidden
     */
    public required(
        errorMessage?: ValidationErrorMessageProvider
    ): UnionSchemaBuilder<
        TOptions,
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
    public optional(): UnionSchemaBuilder<
        TOptions,
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
        value:
            | (TExplicitType extends undefined
                  ? SchemaArrayToUnion<TOptions>
                  : TExplicitType)
            | (() => TExplicitType extends undefined
                  ? SchemaArrayToUnion<TOptions>
                  : TExplicitType)
    ): UnionSchemaBuilder<
        TOptions,
        true,
        TNullable,
        TExplicitType,
        true,
        TExtensions
    > &
        TExtensions {
        return super.default(value as any) as any;
    }

    /**
     * @hidden
     */
    public clearDefault(): UnionSchemaBuilder<
        TOptions,
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
    ): UnionSchemaBuilder<
        TOptions,
        TRequired,
        TNullable,
        (TExplicitType extends undefined
            ? SchemaArrayToUnion<TOptions>
            : TExplicitType) & { readonly [K in BRAND]: TBrand },
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.brand(_name);
    }

    /**
     * @hidden
     */
    public readonly(): UnionSchemaBuilder<
        TOptions,
        TRequired,
        TNullable,
        Readonly<
            TExplicitType extends undefined
                ? SchemaArrayToUnion<TOptions>
                : TExplicitType
        >,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        return super.readonly();
    }

    /**
     * Adds a new schema option described by `schema`.
     * schema must be an instance of `SchemaBuilder` class ancestor.
     * @param schema schema to be added as an option.
     */
    public or<T extends SchemaBuilder<any, any, any, any, any>>(
        schema: T
    ): UnionSchemaBuilder<
        [...TOptions, T],
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }
        return this.createFromProps({
            ...this.introspect(),
            options: [...this.#options, schema]
        } as any) as any;
    }

    /**
     * Removes option by its `index`. If `index` is out of bounds,
     * an error is thrown.
     * @param index index of the option, starting from `0`.
     */
    public removeOption<T extends number>(
        index: T
    ): UnionSchemaBuilder<
        TakeExceptIndex<TOptions, T>,
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (
            typeof index !== 'number' ||
            index < 0 ||
            index > this.#options.length
        ) {
            throw new Error('index must be >= 0 and <= count of the options');
        }
        return this.createFromProps({
            ...this.introspect(),
            options: this.#options.filter((_v, i) => i !== index)
        } as any) as any;
    }

    /**
     * Removes first option from the union schema.
     */
    public removeFirstOption(): TOptions extends [
        infer _,
        ...infer TRest extends SchemaBuilder<any, any, any, any, any>[]
    ]
        ? UnionSchemaBuilder<
              TRest,
              TRequired,
              TNullable,
              TExplicitType,
              THasDefault,
              TExtensions
          > &
              TExtensions
        : never {
        return this.removeOption(0) as any;
    }

    /**
     * Removes all options and replaces them by single `schema` option.
     * Equivalent to `union(schema)` function, but could be useful in some cases.
     * @param schema schema to be added as a single option to the new schema.
     */
    public reset<T extends SchemaBuilder<any, any, any, any, any>>(
        schema: T
    ): UnionSchemaBuilder<
        [T],
        TRequired,
        TNullable,
        TExplicitType,
        THasDefault,
        TExtensions
    > &
        TExtensions {
        if (!(schema instanceof SchemaBuilder)) {
            throw new Error(
                'schema must be an instance of the SchemaBuilder class'
            );
        }
        return this.createFromProps({
            ...this.introspect(),
            options: [schema]
        } as any) as any;
    }

    /**
     * @hidden
     */
    public nullable(): UnionSchemaBuilder<
        TOptions,
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
    public notNullable(): UnionSchemaBuilder<
        TOptions,
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
 * Creates a union schema.
 * @param schema required and will be considered as a first option for the union schema.
 */
export const union = <T extends SchemaBuilder<any, any, any, any, any>>(
    schema: T
) =>
    UnionSchemaBuilder.create({
        isRequired: true,
        options: [schema]
    }) as UnionSchemaBuilder<[T]>;
