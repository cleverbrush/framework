// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-playground-declarations.js
//
// Maps Monaco virtual-FS paths to .d.ts content from libs/schema/dist.

export const schemaDeclarations: Record<string, string> = {
    "file:///node_modules/@cleverbrush/schema/builders/AnySchemaBuilder.d.ts": `import { type BRAND, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type AnySchemaBuilderCreateProps<R extends boolean = true> = Partial<ReturnType<AnySchemaBuilder<R>['introspect']>>;
/**
 * Any schema builder class. Similar to the \`any\` type
 * in TypeScript. Allows to define a schema for \`any\` value.
 * Use it when you don't know the type of the value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use \`any()\` function instead.
 *
 * @example
 * \`\`\`ts
 * const schema = any();
 * const result = schema.validate(123);
 * // result.valid === true
 * // result.object === 123
 * \`\`\`
 */
export declare class AnySchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TResult = TExplicitType extends undefined ? any : TExplicitType> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: AnySchemaBuilderCreateProps<any>): AnySchemaBuilder<true, undefined, false, {}, any>;
    protected constructor(props: AnySchemaBuilderCreateProps<TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): AnySchemaBuilder<true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): AnySchemaBuilder<TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: AnySchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): AnySchemaBuilder<true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): AnySchemaBuilder<false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): AnySchemaBuilder<true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): AnySchemaBuilder<TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): AnySchemaBuilder<TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<T>\`. Sets the \`isReadonly\`
     * introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): AnySchemaBuilder<TRequired, Readonly<TResult>, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a \`any\` schema.
 * @example
 * \`\`\`
 *  const anyObject = any();
 *
 * // null - invalid
 * // undefined - invalid
 * // string - valid
 * // {} - valid
 * // Date -valid
 * // { someProp: 123 } - valid
 * // etc
 * \`\`\`
 * @example
 * \`\`\`
 *  const anyObject = any().optional();
 *  // null - valid
 *  // undefined - valid
 *  // string - valid
 *  // {} - valid
 *  // Date -valid
 *  // { someProp: 123 } - valid
 * \`\`\`
 */
export declare const any: () => AnySchemaBuilder<true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/ArraySchemaBuilder.d.ts": `import type { ObjectSchemaBuilder, ObjectSchemaValidationResult } from './ObjectSchemaBuilder.js';
import { type BRAND, type InferType, type NestedValidationResult, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
import type { UnionSchemaBuilder, UnionSchemaValidationResult } from './UnionSchemaBuilder.js';
/**
 * Maps an element schema type to the appropriate validation result type.
 * Union schema elements get \`UnionSchemaValidationResult\`,
 * Object schema elements get \`ObjectSchemaValidationResult\`,
 * other types get \`ValidationResult\`.
 */
export type ElementValidationResult<TElementSchema extends SchemaBuilder<any, any, any>> = TElementSchema extends UnionSchemaBuilder<infer UOptions extends readonly SchemaBuilder<any, any, any>[], any, any> ? UnionSchemaValidationResult<InferType<TElementSchema>, UOptions> : TElementSchema extends ObjectSchemaBuilder<any, any, any, any, any> ? ObjectSchemaValidationResult<InferType<TElementSchema>, TElementSchema> : ValidationResult<InferType<TElementSchema>>;
/**
 * Validation result type returned by \`ArraySchemaBuilder.validate()\`.
 * Extends \`ValidationResult\` with \`getNestedErrors\` for root-level array
 * errors and per-element validation results.
 */
export type ArraySchemaValidationResult<TResult, TElementSchema extends SchemaBuilder<any, any, any>> = ValidationResult<TResult> & {
    /**
     * Returns root-level array validation errors combined with
     * per-element validation results.
     * The returned value has both \`NestedValidationResult\` properties
     * (\`errors\`, \`isValid\`, \`descriptor\`, \`seenValue\`) and indexed
     * element results (\`[0]\`, \`[1]\`, etc.).
     */
    getNestedErrors(): Array<ElementValidationResult<TElementSchema>> & NestedValidationResult<any, any, any>;
};
type ArraySchemaBuilderCreateProps<TElementSchema extends SchemaBuilder<any, any, any>, R extends boolean = true> = Partial<ReturnType<ArraySchemaBuilder<TElementSchema, R>['introspect']>>;
/**
 * Similar to the \`Array\` type in TypeScript. It can be used to validate arrays of any type.
 * It can also be used to validate arrays of specific type.
 * For example, if you want to validate an array of numbers,
 * you can use \`array(number())\` to create a schema builder.
 * If you want to validate an array of users, you can use
 * \`array().of(object({ name: string(), age: number() }))\` to create a schema builder.
 * If you want to validate an array of numbers or strings,
 * you can use \`array(union(number()).or(string()))\`.
 *
 * Also you can limit the length of the array by using \`minLength\`
 * and \`maxLength\` methods.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link array | array()} function instead.
 * @see {@link array}
 */
export declare class ArraySchemaBuilder<TElementSchema extends SchemaBuilder<any, any, any>, TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TResult = TExplicitType extends undefined ? TElementSchema extends undefined ? Array<any> : TElementSchema extends SchemaBuilder<infer T1, infer T2> ? Array<InferType<SchemaBuilder<T1, T2>>> : never : TExplicitType> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: ArraySchemaBuilderCreateProps<any, any>): ArraySchemaBuilder<SchemaBuilder<any, any, any, {}>, true, undefined, false, {}, any[]>;
    protected constructor(props: ArraySchemaBuilderCreateProps<TElementSchema, TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): ArraySchemaBuilder<TElementSchema, true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): ArraySchemaBuilder<TElementSchema, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`. {@inheritDoc SchemaBuilder.validate}
     */
    validate(object: TResult, context?: ValidationContext): ArraySchemaValidationResult<TResult, TElementSchema>;
    /**
     * Performs asynchronous validation of the schema over \`object\`. {@inheritDoc SchemaBuilder.validateAsync}
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ArraySchemaValidationResult<TResult, TElementSchema>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ArraySchemaValidationResult<TResult, TElementSchema>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ArraySchemaValidationResult<TResult, TElementSchema>>;
    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(props: ArraySchemaBuilderCreateProps<TElementSchema, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): ArraySchemaBuilder<TElementSchema, true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): ArraySchemaBuilder<TElementSchema, false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): ArraySchemaBuilder<TElementSchema, true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): ArraySchemaBuilder<TElementSchema, TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`ReadonlyArray<T>\` — disables \`push\`,
     * \`pop\`, and other mutating methods at the type level. Validation
     * behaviour is unchanged.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): ArraySchemaBuilder<TElementSchema, TRequired, ReadonlyArray<TElementSchema extends SchemaBuilder<infer T1, infer T2> ? InferType<SchemaBuilder<T1, T2>> : any>, THasDefault, TExtensions> & TExtensions;
    introspect(): {
        /**
         * Schema of array item (if defined)
         */
        elementSchema: TElementSchema | undefined;
        /**
         * Min length of a valid array
         */
        minLength: number | undefined;
        /**
         * Min length validation error message provider.
         * If not provided, default error message provider is used.
         */
        minLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, false, {}, TExplicitType extends undefined ? TElementSchema extends undefined ? any[] : TElementSchema extends SchemaBuilder<infer T1, infer T2 extends boolean, false, {}> ? (T2 extends true ? T1 : T1 | undefined)[] : never : TExplicitType>>;
        /**
         * Max length of a valid array
         */
        maxLength: number | undefined;
        /**
         * Max length validation error message provider.
         * If not provided, default error message provider is used.
         */
        maxLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, false, {}, TExplicitType extends undefined ? TElementSchema extends undefined ? any[] : TElementSchema extends SchemaBuilder<infer T1, infer T2 extends boolean, false, {}> ? (T2 extends true ? T1 : T1 | undefined)[] : never : TExplicitType>>;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * Set a schema that every array item has to satisfy. If it is not set,
     * Item of any type is allowed.
     * @param schema Schema that every array item has to satisfy
     */
    of<TSchema extends SchemaBuilder<any, any, any>>(schema: TSchema): ArraySchemaBuilder<TSchema, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Clears the element schema set by \`of()\`. After this call,
     * array items of any type will be accepted.
     */
    clearOf(): ArraySchemaBuilder<any, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Set minimal length of the valid array value for schema.
     */
    minLength<T extends number>(length: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>>): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear minimal length of the valid array value for schema.
     */
    clearMinLength(): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Set max length of the valid array value for schema.
     */
    maxLength<T extends number>(length: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>>): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear max length of the valid array value for schema.
     */
    clearMaxLength(): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a \`Array\` schema.
 *
 * @example
 * \`\`\`typescript
 *  const schema = array().minLength(2).maxLength(5).of(string());
 *  // [] - invalid
 *  // ['a', 'b'] - valid
 *  // ['a', 'b', 'c', 'd', 'e', 'f'] - invalid
 *  // ['a', 'b', 'c', 'd', 'e'] - valid
 *  // ['a', 'b', 'c', 'd', 1] - invalid
 *  // ['a', 'b', null] - invalid
 *  // null - invalid
 *  // undefined - invalid
 * \`\`\`
 */
export declare const array: <TElementSchema extends SchemaBuilder<any, any, any>>(elementSchema?: TElementSchema) => ArraySchemaBuilder<TElementSchema, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/BooleanSchemaBuilder.d.ts": `import { type BRAND, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type BooleanSchemaBuilderCreateProps<R extends boolean = true> = Partial<ReturnType<BooleanSchemaBuilder<R>['introspect']>>;
/**
 * Similar to \`boolean\` type in TypeScript.
 * Allows to define a schema for a boolean value. It can be required or optional.
 * It can be restricted to be equal to a certain value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link boolean | boolean()} function instead.
 *
 * @example \`\`\`ts
 * const schema = boolean().equals(true);
 * const result = schema.validate(true);
 * // result.valid === true
 * // result.object === true
 * \`\`\`
 * @example \`\`\`ts
 * const schema = boolean().equals(false);
 * const result = schema.validate(true);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be equal to 'false''
 * \`\`\`
 * @example \`\`\`ts
 * const schema = boolean().equals(true).optional();
 * const result = schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * \`\`\`
 *
 * @see {@link boolean}
 */
export declare class BooleanSchemaBuilder<TResult = boolean, TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TFinalResult = TExplicitType extends undefined ? TResult : TExplicitType> extends SchemaBuilder<TFinalResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: BooleanSchemaBuilderCreateProps<any>): BooleanSchemaBuilder<boolean, any, undefined, false, {}, boolean>;
    protected constructor(props: BooleanSchemaBuilderCreateProps<TRequired>);
    introspect(): {
        /**
         * If set, restrict object to be equal to a certain value.
         */
        equalsTo: boolean | undefined;
        /**
         * Equals to validation error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<BooleanSchemaBuilder<TResult, TRequired, undefined, false, {}, TResult>>;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TFinalResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TFinalResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TFinalResult | (() => TFinalResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TFinalResult | (() => TFinalResult) | undefined;
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): BooleanSchemaBuilder<TResult, true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): BooleanSchemaBuilder<TResult, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: BooleanSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): BooleanSchemaBuilder<TResult, true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): BooleanSchemaBuilder<TResult, false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TFinalResult | (() => TFinalResult)): BooleanSchemaBuilder<TResult, true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): BooleanSchemaBuilder<TResult, TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): BooleanSchemaBuilder<TResult, TRequired, TFinalResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<boolean>\`. Since booleans are
     * already immutable this is an identity operation, but it sets the
     * \`isReadonly\` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): BooleanSchemaBuilder<TResult, TRequired, Readonly<TFinalResult>, THasDefault, TExtensions> & TExtensions;
    /**
     * Restricts object to be equal to \`value\`.
     */
    equals<T extends boolean>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<BooleanSchemaBuilder<TResult, TRequired>>): BooleanSchemaBuilder<T, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Removes a \`value\` defined by \`equals()\` call.
     */
    clearEquals(): BooleanSchemaBuilder<boolean, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a \`boolean\` schema.
 */
export declare const boolean: () => BooleanSchemaBuilder<boolean, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/DateSchemaBuilder.d.ts": `import { type BRAND, type PreprocessorEntry, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult, type ValidatorEntry } from './SchemaBuilder.js';
type DateSchemaBuilderCreateProps<T = Date, R extends boolean = true> = Partial<ReturnType<DateSchemaBuilder<T, R, any>['introspect']>>;
/**
 * Allows to create Date schema. It can be required or optional.
 * It can be restricted to be: equal to a certain value, in future, in past, in a certain range.
 * Supports parsing from JSON string and UNIX epoch (using preprocessors).
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link date | date()} function instead.
 *
 * @example \`\`\`ts
 * const date = new Date(2020, 0, 2);
 * const schema = date().min(new Date(2020, 0, 1));
 * const result = schema.validate(date);
 * // result.valid === true
 * // result.object === date
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = date();
 * const result = schema.validate('2020-01-01');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be a date'
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = date().parseFromJson();
 * const result = schema.validate('2020-01-01T00:00:00.000Z');
 * // result.valid === true
 * // result.object is equal to corresponding Date object
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = date().parseFromEpoch();
 * const result = schema.validate(1577836800000);
 * // result.valid === true
 * // result.object is equal to corresponding Date object
 * \`\`\`
 *
 * @see {@link date}
 */
export declare class DateSchemaBuilder<TResult = Date, TRequired extends boolean = true, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: DateSchemaBuilderCreateProps): DateSchemaBuilder<Date, true, false, {}>;
    protected constructor(props: DateSchemaBuilderCreateProps);
    introspect(): {
        /**
         * Min valid value (if defined).
         */
        min: Date | undefined;
        /**
         * Min value validation error message provider.
         * If not provided, default error message will be used.
         */
        minValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Max valid value (if defined).
         */
        max: Date | undefined;
        /**
         * Max value validation error message provider.
         * If not provided, default error message will be used.
         */
        maxValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Make sure that date is in future. \`false\` by default.
         */
        ensureIsInFuture: boolean;
        /**
         * Ensure in future validation error message provider.
         * If not provided, default error message will be used.
         */
        ensureIsInFutureValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Make sure that date is in past. \`false\` by default.
         */
        ensureIsInPast: boolean;
        /**
         * Ensure in past validation error message provider.
         * If not provided, default error message will be used.
         */
        ensureIsInPastValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict date to be equal to a certain value.
         */
        equalsTo: Date | undefined;
        /**
         * Equals to validation error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, schema will try to parse date from the UNIX epoch (number).
         * \`false\` by default.
         */
        parseFromEpoch: boolean;
        /**
         * If set, schema will try to parse date from JSON string.
         * \`false\` by default.
         */
        parseFromJson: boolean;
        /**
         * Array of preprocessor functions
         */
        preprocessors: PreprocessorEntry<TResult>[];
        /**
         * Array of validator functions
         */
        validators: ValidatorEntry<TResult>[];
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): DateSchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): DateSchemaBuilder<Date, TRequired, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of Date schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of Date schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * @hidden
     */
    protected createFromProps<T, TReq extends boolean>(props: DateSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * Restricts Date to be equal to \`value\`.
     */
    equals<T extends Date>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<T, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clears \`equals()\` call.
     */
    clearEquals(): DateSchemaBuilder<Date, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): DateSchemaBuilder<TResult, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): DateSchemaBuilder<TResult, false, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): DateSchemaBuilder<TResult, true, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): DateSchemaBuilder<TResult, TRequired, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): DateSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<Date>\` — prevents mutation of
     * Date methods like \`setFullYear()\` at the type level. Validation
     * behaviour is unchanged.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): DateSchemaBuilder<Readonly<TResult>, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Accept only dates in the future.
     */
    isInFuture(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`isInFuture()\` call.
     */
    clearIsInFuture(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Accept only dates in the past.
     */
    isInPast(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`isInPast()\` call.
     */
    clearIsInPast(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Set minimal valid Date value for schema.
     */
    min(minValue: Date, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`min()\` call.
     */
    clearMin(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Set maximal valid Date value for schema.
     */
    max(maxValue: Date, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`max()\` call.
     */
    clearMax(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Accepts JSON string as a valid Date.
     * String must be in ISO format and will be parsed using \`JSON.parse()\`.
     */
    acceptJsonString(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`acceptJsonString()\` call.
     */
    doNotAcceptJsonString(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Accepts epoch number as a valid Date.
     * Epoch number will be parsed using \`new Date(epoch)\`.
     */
    acceptEpoch(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`acceptEpoch()\` call.
     */
    doNotAcceptEpoch(): DateSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a Date schema.
 */
export declare const date: () => DateSchemaBuilder<Date, true, false, {}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/FunctionSchemaBuilder.d.ts": `import { type BRAND, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type FunctionSchemaBuilderCreateProps<R extends boolean = true> = Partial<ReturnType<FunctionSchemaBuilder<R>['introspect']>>;
/**
 * Schema builder for functions. Allows to define a schema for a function.
 * It can be: required or optional.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link func | func()} function instead.
 *
 * @example
 * \`\`\`ts
 * const schema = func();
 * const result = schema.validate(() => {});
 * // result.valid === true
 * // result.object === () => {}
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * const schema = func().optional();
 * const result = schema.validate(undefined);
 * // result.valid === true
 * // result.object === undefined
 * \`\`\`
 *
 * @see {@link func}
 */
export declare class FunctionSchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TResult = TExplicitType extends undefined ? (...args: any[]) => any : TExplicitType> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: FunctionSchemaBuilderCreateProps<any>): FunctionSchemaBuilder<true, undefined, false, {}, (...args: any[]) => any>;
    protected constructor(props: FunctionSchemaBuilderCreateProps<TRequired>);
    /**
     * @hidden
     */
    hasType<T>(_notUsed?: T): FunctionSchemaBuilder<true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearHasType(): FunctionSchemaBuilder<TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: FunctionSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): FunctionSchemaBuilder<true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): FunctionSchemaBuilder<false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): FunctionSchemaBuilder<true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): FunctionSchemaBuilder<TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): FunctionSchemaBuilder<TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<Function>\`. Sets the
     * \`isReadonly\` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): FunctionSchemaBuilder<TRequired, Readonly<TResult>, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a \`function\` schema.
 * @returns {@link FunctionSchemaBuilder}
 */
export declare const func: () => FunctionSchemaBuilder<true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/LazySchemaBuilder.d.ts": `import { type BRAND, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type LazySchemaBuilderCreateProps<R extends boolean = true> = Partial<ReturnType<LazySchemaBuilder<any, R>['introspect']>>;
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
 * \`\`\`ts
 * type TreeNode = { value: number; children: TreeNode[] };
 *
 * const treeNode: SchemaBuilder<TreeNode, true> = object({
 *     value: number(),
 *     children: array(lazy(() => treeNode))
 * });
 *
 * treeNode.validate({ value: 1, children: [{ value: 2, children: [] }] });
 * // { valid: true, object: { value: 1, children: [{ value: 2, children: [] }] } }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * type Comment = { text: string; replies: Comment[] };
 *
 * const commentSchema: SchemaBuilder<Comment, true> = object({
 *     text: string(),
 *     replies: array(lazy(() => commentSchema))
 * });
 * \`\`\`
 */
export declare class LazySchemaBuilder<TResult = any, TRequired extends boolean = true, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: LazySchemaBuilderCreateProps<any>): LazySchemaBuilder<any, true, false, {}>;
    protected constructor(props: LazySchemaBuilderCreateProps<TRequired>);
    /**
     * Resolves the lazy schema by calling the getter (once; result is cached).
     * After the first call subsequent calls return the cached schema instance.
     */
    resolve(): SchemaBuilder<TResult, any, any>;
    /**
     * @inheritdoc
     */
    introspect(): {
        /**
         * The getter function that returns the lazily-resolved schema.
         * Call {@link LazySchemaBuilder.resolve} to obtain the schema instance.
         */
        getter: () => SchemaBuilder<TResult, any, any>;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: LazySchemaBuilderCreateProps<TReq>): this;
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): LazySchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): LazySchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): LazySchemaBuilder<TResult, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): LazySchemaBuilder<TResult, false, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): LazySchemaBuilder<TResult, true, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): LazySchemaBuilder<TResult, TRequired, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): LazySchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    readonly(): LazySchemaBuilder<Readonly<TResult>, TRequired, THasDefault, TExtensions> & TExtensions;
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
 * \`\`\`ts
 * // Tree structure
 * type TreeNode = { value: number; children: TreeNode[] };
 *
 * const treeNode: SchemaBuilder<TreeNode, true> = object({
 *     value: number(),
 *     children: array(lazy(() => treeNode))
 * });
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Optional recursive field (submenu)
 * type MenuItem = { label: string; submenu?: MenuItem[] };
 *
 * const menuItem: SchemaBuilder<MenuItem, true> = object({
 *     label: string(),
 *     submenu: array(lazy(() => menuItem)).optional()
 * });
 * \`\`\`
 */
export declare function lazy<TResult>(getter: () => SchemaBuilder<TResult, any, any>): LazySchemaBuilder<TResult, true, false, {}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/NullSchemaBuilder.d.ts": `import { type BRAND, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type NullSchemaBuilderCreateProps<R extends boolean = true> = Partial<ReturnType<NullSchemaBuilder<R>['introspect']>>;
/**
 * Schema builder for \`null\` values. Validates that the input is exactly \`null\`.
 *
 * When required (the default), only \`null\` is accepted. When optional (via
 * \`.optional()\`), both \`null\` and \`undefined\` are accepted; any other value
 * is rejected.
 *
 * This builder is useful when you need to represent an explicitly-null field
 * in a typed schema, for example in discriminated-union branches or when
 * modelling a JSON payload that may carry a JSON \`null\` value.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link nul | nul()} function instead.
 *
 * @example
 * \`\`\`ts
 * import { nul } from '@cleverbrush/schema';
 *
 * const schema = nul();
 *
 * schema.validate(null);       // { valid: true,  object: null }
 * schema.validate(undefined);  // { valid: false }
 * schema.validate(0);          // { valid: false }
 * schema.validate('');         // { valid: false }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Optional — accepts null or undefined
 * const schema = nul().optional();
 *
 * schema.validate(null);       // { valid: true, object: null }
 * schema.validate(undefined);  // { valid: true, object: undefined }
 * schema.validate(false);      // { valid: false }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
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
 * \`\`\`
 *
 * @see {@link nul}
 */
export declare class NullSchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<null, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: NullSchemaBuilderCreateProps<any>): NullSchemaBuilder<true, undefined, false, {}>;
    protected constructor(props: NullSchemaBuilderCreateProps<TRequired>);
    /**
     * @hidden
     */
    hasType<T>(_notUsed?: T): NullSchemaBuilder<true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearHasType(): NullSchemaBuilder<TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: null, context?: ValidationContext): ValidationResult<null>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: null, context?: ValidationContext): Promise<ValidationResult<null>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: null, _context?: ValidationContext): ValidationResult<null>;
    /**
     * Performs async validation of the schema over \`object\`.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: null, _context?: ValidationContext): Promise<ValidationResult<null>>;
    protected createFromProps<TReq extends boolean>(props: NullSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): NullSchemaBuilder<true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): NullSchemaBuilder<false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: null | (() => null)): NullSchemaBuilder<true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): NullSchemaBuilder<TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): NullSchemaBuilder<TRequired, null & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<null>\`. Since \`null\` is already
     * immutable this is an identity operation, but it sets the \`isReadonly\`
     * introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): NullSchemaBuilder<TRequired, Readonly<null>, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a schema that validates the value is exactly \`null\`.
 *
 * By default the schema is **required** — only \`null\` is accepted.
 * Call \`.optional()\` to also allow \`undefined\`.
 *
 * @example
 * \`\`\`ts
 * import { nul } from '@cleverbrush/schema';
 *
 * nul().validate(null);       // { valid: true,  object: null }
 * nul().validate(undefined);  // { valid: false }
 * nul().validate(0);          // { valid: false }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * nul().optional().validate(null);       // { valid: true, object: null }
 * nul().optional().validate(undefined);  // { valid: true, object: undefined }
 * nul().optional().validate(false);      // { valid: false }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
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
 * \`\`\`
 */
export declare const nul: () => NullSchemaBuilder<true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/NumberSchemaBuilder.d.ts": `import { type BRAND, type PreprocessorEntry, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult, type ValidatorEntry } from './SchemaBuilder.js';
type NumberSchemaBuilderCreateProps<T = number, R extends boolean = true> = Partial<ReturnType<NumberSchemaBuilder<T, R, any>['introspect']>>;
/**
 * Number schema builder class. Allows to create Number schemas.
 * Can be required or optional, can be restricted to be equal to a certain value,
 * can be restricted to be in a certain range, can be restricted to be integer.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link number | number()} function instead.
 *
 * @example \`\`\`ts
 * const schema = number().equals(42);
 * const result = schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * \`\`\`
 * @example \`\`\`ts
 * const schema = number();
 * const result = schema.validate('42');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be a number'
 * \`\`\`
 * @example \`\`\`ts
 * const schema = number().min(0).max(100);
 * const result = schema.validate(42);
 * // result.valid === true
 * // result.object === 42
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = number().min(0).max(100);
 * const result = schema.validate(142.5);
 * // result.valid === false
 * // result.errors[0].message === 'is expected to be less than or equal to 100'
 * \`\`\`
 *
 * @see {@link number}
 */
export declare class NumberSchemaBuilder<TResult = number, TRequired extends boolean = true, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: NumberSchemaBuilderCreateProps): NumberSchemaBuilder<number, true, false, {}>;
    protected constructor(props: NumberSchemaBuilderCreateProps);
    introspect(): {
        /**
         * Min valid value (if defined).
         */
        min: number | undefined;
        /**
         * Min valid value error message provider.
         * If not provided, default error message will be used.
         */
        minValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Max valid value (if defined).
         */
        max: number | undefined;
        /**
         * Max valid value error message provider.
         * If not provided, default error message will be used.
         */
        maxValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Make sure that object is not \`NaN\`. \`true\` by default.
         */
        ensureNotNaN: boolean;
        /**
         * EnsureNotNaN error message provider.
         * If not provided, default error message will be used.
         */
        ensureNotNaNErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Make sure that object is not different kinds of \`infinity\`. \`true\` by default.
         */
        ensureIsFinite: boolean;
        /**
         * EnsureIsFinite error message provider.
         */
        ensureIsFiniteErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict object to be equal to a certain value.
         */
        equalsTo: number | undefined;
        /**
         * EqualsTo error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Allow only integer values (floating point values will be rejected
         * as invalid)
         */
        isInteger: boolean;
        /**
         * EnsureIsInteger error message provider.
         */
        ensureIsIntegerErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Array of preprocessor functions
         */
        preprocessors: PreprocessorEntry<TResult>[];
        /**
         * Array of validator functions
         */
        validators: ValidatorEntry<TResult>[];
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): NumberSchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): NumberSchemaBuilder<number, TRequired, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of number schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of number schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<T, TReq extends boolean>(props: NumberSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * Restricts number to be equal to \`value\`.
     */
    equals<T extends number>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<T, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`equals()\` call.
     */
    clearEquals(): NumberSchemaBuilder<number, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @deprecated Use {@link clearIsInteger} instead.
     * Float values will be considered as valid after this call.
     */
    isFloat(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`isInteger()\` call.
     */
    clearIsInteger(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Only integer values will be considered as valid after this call.
     */
    isInteger(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): NumberSchemaBuilder<TResult, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): NumberSchemaBuilder<TResult, false, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): NumberSchemaBuilder<TResult, true, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): NumberSchemaBuilder<TResult, TRequired, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): NumberSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<number>\`. Since numbers are
     * already immutable this is an identity operation, but it sets the
     * \`isReadonly\` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): NumberSchemaBuilder<Readonly<TResult>, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Do not accept NaN value
     */
    notNaN(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Consider NaN value as valid
     */
    canBeNaN(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Do not accept \`Infinity\`.
     */
    isFinite(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Consider \`Infinity\` as valid.
     */
    canBeInfinite(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Restrict number to be at least \`minValue\`.
     */
    min(minValue: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`min()\` call.
     */
    clearMin(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Restrict number to be no more than \`maxValue\`.
     */
    max(maxValue: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Clear \`max()\` call.
     */
    clearMax(): NumberSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a number schema restricted to \`equals\` value.
 * @param equals string value
 */
export declare function number<T extends number>(equals: T): NumberSchemaBuilder<T, true>;
/**
 * Creates a number schema.
 */
export declare function number(): NumberSchemaBuilder<number, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/ObjectSchemaBuilder.d.ts": `import { PropertyValidationResult } from './PropertyValidationResult.js';
import { type BRAND, type InferType, type NestedValidationResult, type PreValidationResult, type PropertyDescriptor, type PropertyDescriptorTree, SchemaBuilder, type ValidationContext, type ValidationError, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
/**
 * A callback function to select properties from the schema.
 * Normally it's provided by the user to select property descriptors
 * from the schema for the further usage. e.g. to select source and destination
 * properties for object mappings
 */
export type SchemaPropertySelector<TSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TPropertySchema extends SchemaBuilder<any, any, any>, TAssignableTo = any, TParentPropertyDescriptor = undefined> = (l: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>) => PropertyDescriptor<TSchema, TPropertySchema, TParentPropertyDescriptor>;
type ObjectSchemaBuilderProps<T extends Record<string, SchemaBuilder> = {}, TRequired extends boolean = true> = ReturnType<ObjectSchemaBuilder<T, TRequired>['introspect']>;
type ObjectSchemaBuilderCreateProps<T extends Record<string, SchemaBuilder> = {}, TRequired extends boolean = true> = Partial<ObjectSchemaBuilderProps<T, TRequired>>;
type Id<T> = T extends infer U ? {
    [K in keyof U]: U[K];
} : never;
export type RespectPropsOptionality<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in RequiredProps<T>]: InferType<T[K]>;
} & {
    [K in NotRequiredProps<T>]?: InferType<T[K]>;
};
type RespectPropsOptionalityForInput<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in RequiredInputProps<T>]: InferType<T[K]>;
} & {
    [K in NotRequiredInputProps<T>]?: InferType<T[K]>;
};
type MakeChildrenRequired<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['required']>;
};
type MakeChildrenOptional<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['optional']>;
};
/**
 * Recursively maps each property to its optional form, descending into
 * nested \`ObjectSchemaBuilder\` schemas.  All other schema types (arrays,
 * unions, primitives) are only made optional at the top level.
 */
type DeepMakeChildrenOptional<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in keyof T]: T[K] extends ObjectSchemaBuilder<infer P extends Record<string, SchemaBuilder<any, any, any>>, any, any, any, any> ? ReturnType<ReturnType<T[K]['deepPartial']>['optional']> : ReturnType<T[K]['optional']>;
};
type MakeChildOptional<T extends Record<any, SchemaBuilder<any, any, any>>, TProp extends keyof T> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['optional']> : T[K];
};
type MakeChildRequired<T extends Record<any, SchemaBuilder<any, any, any>>, TProp extends keyof T> = {
    [K in keyof T]: K extends TProp ? ReturnType<T[K]['required']> : T[K];
};
type ModifyPropSchema<T extends Record<any, SchemaBuilder<any, any, any>>, TProp extends keyof T, TSchema extends SchemaBuilder<any, any, any>> = {
    [K in keyof T]: K extends TProp ? TSchema : T[K];
};
export type ObjectSchemaValidationResult<T, TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TSchema extends ObjectSchemaBuilder<any, any, any, any, any> = TRootSchema> = Omit<ValidationResult<T>, 'errors'> & {
    /**
     * A flat list of validation errors.
     *
     * @deprecated Use {@link ObjectSchemaValidationResult.getErrorsFor | getErrorsFor()} instead for
     * per-property error inspection with type-safe property selectors. The \`errors\` array on
     * \`ObjectSchemaBuilder\` validation results will be removed in a future major version.
     */
    errors?: ValidationError[];
    /**
     * Returns a nested validation error for the property selected by the \`selector\` function.
     * This is the **recommended** way to inspect validation errors — it provides type-safe,
     * per-property error details including \`isValid\`, \`errors\`, and \`seenValue\`.
     *
     * Prefer this over the deprecated \`errors\` array.
     *
     * @param selector a callback function to select property from the schema.
     */
    getErrorsFor<TPropertySchema, TParentPropertyDescriptor>(selector?: (properties: PropertyDescriptorTree<TSchema, TRootSchema>) => PropertyDescriptor<TRootSchema, TPropertySchema, TParentPropertyDescriptor>): TPropertySchema extends ObjectSchemaBuilder<any, any, any, any, any> ? PropertyValidationResult<TPropertySchema, TRootSchema, TParentPropertyDescriptor> : NestedValidationResult<TPropertySchema, TRootSchema, TParentPropertyDescriptor>;
};
/**
 * Object schema builder class. Similar to the \`object\` type
 * in JS. Allows to define a schema for \`object\` value.
 * Should be used to validate objects with specific properties.
 * Properties should be defined as their own schema builders.
 * You can use any \`SchemaBuilder\` e.g. \`string()\`, \`number()\`,
 * \`boolean()\`, \`array()\`, \`object()\`, etc. to define properties.
 * Which means that you can define nested objects and arrays of
 * any complexity.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link object | object()} function instead.
 *
 * @example
 * \`\`\`ts
 * const schema = object({
 *    name: string(),
 *    age: number()
 * });
 *
 * const result = schema.validate({
 *   name: 'John',
 *   age: 30
 * });
 *
 * // result.valid === true
 * // result.object === { name: 'John', age: 30 }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * const schema = object({
 *   name: string(),
 *   age: number().optional()
 * });
 *
 * const result = schema.validate({
 *  name: 'John'
 * });
 * // result.valid === true
 * // result.object === { name: 'John' }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * const schema = object({
 *  name: string(),
 *  age: number();
 * });
 * const result = schema.validate({
 *  name: 'John'
 * });
 *
 * // result.valid === false
 * // result.errors is deprecated — use result.getErrorsFor() instead
 * // result.getErrorsFor((p) => p.age).errors // ["is expected to have property 'age'"]
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * const schema = object({
 * name: string(),
 * address: object({
 *     city: string(),
 *     country: string()
 *   })
 * });
 * const result = schema.validate({
 * name: 'John',
 * address: {
 *    city: 'New York',
 *    country: 'USA'
 *  }
 * });
 * // result.valid === true
 * // result.object === {
 * //   name: 'John',
 * //   address: {
 * //     city: 'New York',
 * //     country: 'USA'
 * //   }
 * // }
 * \`\`\`
 * @see {@link object}
 */
export declare class ObjectSchemaBuilder<TProperties extends Record<string, SchemaBuilder<any, any, any>> = {}, TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create<P extends Record<string, SchemaBuilder>, R extends boolean>(props: ObjectSchemaBuilderCreateProps<P, R>): ObjectSchemaBuilder<{}, true, undefined, false, {}>;
    protected createFromProps<T extends Record<string, SchemaBuilder>, R extends boolean = true>(props: ObjectSchemaBuilderCreateProps<T, R>): this;
    protected constructor(props: ObjectSchemaBuilderCreateProps);
    introspect(): {
        /**
         * Properties defined in schema
         */
        properties: TProperties;
        /**
         * If set to \`true\`, schema validation will not
         * return errors if object contains fields which
         * are not defined in the schema \`properties\`.
         * Set to \`false\` by default
         */
        acceptUnknownProps: boolean;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: (undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) | (() => undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: (undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) | (() => undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) | undefined;
    };
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): ObjectSchemaBuilder<TProperties, true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): ObjectSchemaBuilder<TProperties, false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: (undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) | (() => undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType)): ObjectSchemaBuilder<TProperties, true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): ObjectSchemaBuilder<TProperties, TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): ObjectSchemaBuilder<TProperties, TRequired, (undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<T>\` — all top-level properties
     * become \`readonly\` at the type level. Validation behaviour is unchanged.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): ObjectSchemaBuilder<TProperties, TRequired, Readonly<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType>, THasDefault, TExtensions> & TExtensions;
    protected preValidateSync(object: any, context?: ValidationContext<this>): PreValidationResult<InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>>, {
        validatedObject: any;
    }>;
    protected preValidateAsync(object: any, context?: ValidationContext<this>): Promise<PreValidationResult<InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>>, {
        validatedObject: any;
    }>>;
    /**
     * Performs synchronous validation of object schema over the \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     *
     * The returned result includes a \`getErrorsFor()\` method for type-safe,
     * per-property error inspection.
     *
     * @param object The object to validate against this schema.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionalityForInput<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>;
    /**
     * @param object The object to validate against this schema.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionalityForInput<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): Promise<ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>>;
    /**
     * Performs synchronous validation of object schema over the \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     *
     * The returned result includes a \`getErrorsFor()\` method for type-safe,
     * per-property error inspection.
     *
     * @param object The object to validate against this schema.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionalityForInput<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>;
    /**
     * Performs async validation of object schema over the \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     *
     * @param object The object to validate against this schema.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionalityForInput<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): Promise<ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>>;
    /**
     * Fields not defined in \`properties\` will not be validated
     * and will be passed through the validation.
     */
    acceptUnknownProps(): ObjectSchemaBuilder<TProperties, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Fields not defined in \`properties\` will be considered
     * as schema violation. This is the default behavior.
     */
    notAcceptUnknownProps(): ObjectSchemaBuilder<TProperties, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): ObjectSchemaBuilder<TProperties, TRequired, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): ObjectSchemaBuilder<TProperties, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Adds a new property to the object schema. The new property
     * will be validated according to the provided schema.
     * @param propName name of the new property
     * @param schema schema builder of the new property
     */
    addProp<TType extends SchemaBuilder<any, any, any>, TName extends string>(propName: TName, schema: TType): ObjectSchemaBuilder<TProperties & {
        [k in TName]: TType;
    }, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     * @deprecated this is for internal use, do not use if you are
     * not sure you need it.
     *
     * TODO: This is used to avoid \`&\` in resulting types. For example,
     * when you have a schema like \`object({prop1: string()})\` and then use \`addProp({prop2: string()})\` method,
     * the resulting type without \`optimize\` will be something like \`{prop1: string} & {prop2: string}\`. Which
     * is not we would like to have. Instead we want to have \`{prop1: string, prop2: string}\`. This is what
     * \`optimize\` method does. However it is not always possible to do this optimization without losing
     * JSDoc comments, which is sucks. For example, I had to disable optimization for UnionSchemas, because
     * comments were lost. Hopefully it will be fixed in the future by Typescript team or somebody will
     * find a workaround/fix and create a pull request.
     */
    optimize(): SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired, THasDefault, TExtensions>;
    /**
     * Adds new properties to the object schema. The same as \`.addProp()\` but
     * allows to add multiple properties with one call. The new properties
     * will be validated according to the provided schemas.
     * @param props a key/schema object map.
     */
    addProps<TProps extends Record<string, SchemaBuilder<any, any, any>>>(props: TProps): ObjectSchemaBuilder<TProperties & TProps, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Adds all properties from the \`schema\` object schema to the current schema.
     * @param schema an instance of \`ObjectSchemaBuilder\`
     */
    addProps<K extends ObjectSchemaBuilder<any, any, any, any, any>>(schema: K): K extends ObjectSchemaBuilder<infer TProp, infer _, infer __> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProp> & TProp, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions : never;
    /**
     * Omits properties listed in \`properties\` from the schema.
     * Consider \`Omit<Type, 'prop1'|'prop2'...>\` as a good illustration
     * from the TS world.
     * @param properties - array of property names (strings) to remove from the schema.
     */
    omit<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Omit<TProperties, K>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Removes \`propName\` from the list of properties.
     * @param propName property name to remove. Schema should contain
     * this property. An error will be thrown otherwise.
     */
    omit<TProperty extends keyof TProperties>(propName: TProperty): ObjectSchemaBuilder<Omit<TProperties, TProperty>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Removes all properties of \`schema\` from the current schema.
     * \`Omit<TSchema, keyof TAnotherSchema>\` as a good illustration
     * from the TS world.
     * @param schema schema builder to take properties from.
     */
    omit<T>(schema: T): T extends ObjectSchemaBuilder<infer TProps, infer TRequired, infer TExplicitType> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProps>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions : never;
    /**
     * Adds all properties from \`schema\` to the current schema.
     * \`TSchema & TAnotherSchema\` is a good example of the similar concept
     * in the TS type system.
     * @param schema an object schema to take properties from
     */
    intersect<T extends ObjectSchemaBuilder<any, any, any, any, any>>(schema: T): T extends ObjectSchemaBuilder<infer TProps, infer _, infer TExplType> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProps> & TProps, TRequired, TExplType, THasDefault, TExtensions> & TExtensions : never;
    /**
     * Marks all properties in the current schema as optional.
     * It is the same as call \`.optional('propname')\` where \`propname\` is the name
     * of every property in the schema.
     */
    partial(): ObjectSchemaBuilder<MakeChildrenOptional<TProperties>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks all properties from \`properties\` as optional in the schema.
     * @param properties list of property names (string) to make optional
     */
    partial<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Omit<TProperties, K> & Pick<MakeChildrenOptional<TProperties>, K>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks property \`propName\` as optional in the schema.
     * @param propName the name of the property (string).
     */
    partial<TProperty extends keyof TProperties>(propName: TProperty): ObjectSchemaBuilder<Omit<TProperties, TProperty> & Pick<MakeChildrenOptional<TProperties>, TProperty>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Recursively marks all properties — and all properties of nested
     * \`object()\` schemas — as optional.  Useful for PATCH API bodies
     * and partial form state where every field at every level is optional.
     *
     * Only nested \`ObjectSchemaBuilder\` schemas are recursed into.
     * Other schema types (arrays, unions, primitives, lazy) are made
     * optional at the top level but their internals are not modified.
     *
     * @example
     * \`\`\`ts
     * const Address = object({
     *   street: string(),
     *   city:   string()
     * });
     *
     * const User = object({
     *   name:    string(),
     *   address: Address
     * });
     *
     * const PatchUser = User.deepPartial();
     * // PatchUser infers as:
     * // { name?: string; address?: { street?: string; city?: string } }
     *
     * PatchUser.validate({ address: { city: 'Paris' } }); // valid
     * PatchUser.validate({});                              // valid
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // Three-level nesting
     * const schema = object({
     *   a: object({
     *     b: object({ c: string() })
     *   })
     * }).deepPartial();
     *
     * schema.validate({});               // valid
     * schema.validate({ a: {} });        // valid
     * schema.validate({ a: { b: {} } }); // valid
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // PATCH API body
     * const CreateBody = object({
     *   profile: object({ displayName: string(), bio: string() }),
     *   settings: object({ theme: string(), language: string() })
     * });
     *
     * const PatchBody = CreateBody.deepPartial();
     * // All fields are optional at every level —
     * // send only what you want to update.
     * \`\`\`
     *
     * @see {@link partial} for shallow-only property optionality.
     */
    deepPartial(): ObjectSchemaBuilder<DeepMakeChildrenOptional<TProperties>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Returns a new schema containing only properties listed in
     * \`properties\` array.
     * @param properties array of property names (strings)
     */
    pick<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Returns new schema based on the current schema. This new schema
     * will consists only from properties which names are taken from the
     * \`schema\` object schema.
     * @param schema schema to take property names list from
     */
    pick<K extends ObjectSchemaBuilder<any, any, any, any, any>>(schema: K): K extends ObjectSchemaBuilder<infer TProps, infer _, infer __> ? ObjectSchemaBuilder<Omit<TProperties, keyof Omit<TProperties, keyof TProps>>, TRequired, undefined, THasDefault, TExtensions> & TExtensions : never;
    /**
     * Returns a new schema consisting of only one property
     * (taken from the \`property\` property name). If the property
     * does not exists in the current schema, an error will be thrown.
     * @param property the name of the property (string).
     */
    pick<K extends keyof TProperties>(property: K): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Modify schema for \`propName\` and return a new schema.
     * Could be useful if you want to leave all schema intact, but
     * change a type of one property.
     * @param propName name of the property (string)
     * @param callback callback function returning a new schema fo the \`propName\`. As a first parameter
     * you will receive an old schema for \`propName\`.
     * @returns
     */
    modifyPropSchema<K extends keyof TProperties, R extends SchemaBuilder<any, any, any>>(propName: K, callback: (builder: TProperties[K]) => R): ObjectSchemaBuilder<ModifyPropSchema<TProperties, K, R>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * An alias for \`.partial(prop: string)\`
     * @param prop name of the property
     */
    makePropOptional<K extends keyof TProperties>(prop: K): ObjectSchemaBuilder<MakeChildOptional<TProperties, K>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks \`prop\` as required property.
     * If \`prop\` does not exists in the current schema,
     * an error will be thrown.
     * @param prop name of the property
     */
    makePropRequired<K extends keyof TProperties>(prop: K): ObjectSchemaBuilder<MakeChildRequired<TProperties, K>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * \`Partial<T>\` would be a good example of the
     * same operation in the TS world.
     */
    makeAllPropsOptional(): ObjectSchemaBuilder<MakeChildrenOptional<TProperties>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * \`Required<T>\` would be a good example of the
     * same operation in the TS world.
     */
    makeAllPropsRequired(): ObjectSchemaBuilder<MakeChildrenRequired<TProperties>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    static getPropertiesFor<TProperties extends Record<string, SchemaBuilder<any, any, any>> = {}, TRequired extends boolean = true, TExplicitType = undefined, TSchema extends ObjectSchemaBuilder<any, any, any> = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>>(schema: TSchema): PropertyDescriptorTree<TSchema, TSchema>;
    static isValidPropertyDescriptor(descriptor: PropertyDescriptor<any, any, any>): boolean;
}
export interface Object {
    /**
     * Defines a schema for empty object \`{}\`
     */
    (): ObjectSchemaBuilder<{}, true>;
    /**
     * Defines an object schema, properties definitions are takens from \`props\`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(props: TProps): ObjectSchemaBuilder<TProps, true>;
    /**
     * Defines an object schema, properties definitions are takens from \`props\`.
     * @param props key/schema object map for schema's properties.
     */
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(props?: TProps): ObjectSchemaBuilder<TProps, true>;
    /**
     * Returns a tree of property descriptors for the given \`schema\`.
     * The structure of the tree is the same as the structure of the \`schema\`.
     * Which gives you an opportunity to access property descriptors for each
     * property in the schema in a useful and type-safe way.
     * @param schema
     */
    getPropertiesFor<TProperties extends Record<string, SchemaBuilder<any, any, any>> = {}, TRequired extends boolean = true, TExplicitType = undefined, TSchema extends ObjectSchemaBuilder<any, any, any> = ObjectSchemaBuilder<TProperties, TRequired, TExplicitType>>(schema: TSchema): PropertyDescriptorTree<TSchema, TSchema>;
    /**
     * Verifies if the given \`descriptor\` is a valid property descriptor.
     * @param descriptor a property descriptor to check
     */
    isValidPropertyDescriptor(descriptor: PropertyDescriptor<any, any, any>): boolean;
}
declare const object: Object;
export { object };
type RequiredProps<T extends Record<string, SchemaBuilder<any, any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, any> ? TReq extends true ? k : never : never]: T[k];
};
type NotRequiredProps<T extends Record<string, SchemaBuilder<any, any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, any> ? TReq extends true ? never : k : never]: T[k];
};
type RequiredInputProps<T extends Record<string, SchemaBuilder<any, any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, infer THasDef> ? TReq extends true ? THasDef extends true ? never : k : never : never]: T[k];
};
type NotRequiredInputProps<T extends Record<string, SchemaBuilder<any, any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<any, infer TReq, infer THasDef> ? TReq extends true ? THasDef extends true ? k : never : k : never]: T[k];
};
`,
    "file:///node_modules/@cleverbrush/schema/builders/PropertyValidationResult.d.ts": `import { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
import { type InferType, type NestedValidationResult, type PropertyDescriptorInner, type PropertyDescriptorTree } from './SchemaBuilder.js';
/**
 * Mutable container for nested validation results associated with a specific
 * property descriptor. Implements {@link NestedValidationResult} and tracks
 * the seen value, accumulated error messages, and child results for
 * nested object properties.
 *
 * Used internally by \`ObjectSchemaBuilder\` during validation to build up
 * a tree of per-property validation results.
 */
export declare class PropertyValidationResult<TSchema extends ObjectSchemaBuilder<any, any, any, any, any> = ObjectSchemaBuilder<any, any, any, any, any>, TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any> = ObjectSchemaBuilder<any, any, any, any, any>, TParentPropertyDescriptor = any> implements NestedValidationResult<TSchema, TRootSchema, TParentPropertyDescriptor> {
    #private;
    /**
     * The value that was seen at the property location described by the descriptor.
     * Retrieves the value from the root object using the property descriptor's \`getValue\` method.
     * Returns \`undefined\` if the property is not found.
     */
    get seenValue(): InferType<TSchema> | undefined;
    /**
     * The list of validation error messages accumulated for this property.
     */
    get errors(): ReadonlyArray<string>;
    /**
     * Whether validation passed for this property and all of its children.
     * Returns \`true\` only when there are no errors and no child errors.
     */
    get isValid(): boolean;
    /**
     * Returns the list of child \`NestedValidationResult\` instances
     * representing validation results for nested properties.
     */
    getChildErrors(): ReadonlyArray<NestedValidationResult<any, any, any>>;
    /**
     * The inner property descriptor providing \`getValue\`, \`setValue\`, and \`getSchema\`
     * operations for the property this error relates to.
     */
    get descriptor(): PropertyDescriptorInner<TRootSchema, TSchema, TParentPropertyDescriptor>;
    /**
     * Creates a new \`PropertyValidationResult\`.
     *
     * @param descriptor - the property descriptor tree node this error is associated with;
     *   must be a valid descriptor (checked via \`ObjectSchemaBuilder.isValidPropertyDescriptor\`)
     * @param rootObjectValue - the root object being validated, used to resolve property values
     * @param errors - optional initial list of error message strings
     * @throws if \`descriptor\` is not a valid property descriptor
     */
    constructor(descriptor: PropertyDescriptorTree<TSchema, TRootSchema, any, TParentPropertyDescriptor>, rootObjectValue: InferType<TRootSchema> | undefined, errors?: string[]);
    /**
     * Appends a validation error message to this property's error list.
     * @param error - the error message string to add
     */
    addError(error: string): void;
    /**
     * Appends a child \`NestedValidationResult\` for a nested property.
     * @param childError - the child validation result to add
     */
    addChildError(childError: NestedValidationResult<any, any, any>): void;
}
`,
    "file:///node_modules/@cleverbrush/schema/builders/RecordSchemaBuilder.d.ts": `/**
 * Schema builder for objects with dynamic string keys, where every value
 * must satisfy the same value schema.
 *
 * Equivalent to TypeScript's \`Record<string, V>\` (or a more constrained key
 * set when using a string-literal key schema) and Zod's \`z.record()\`.
 *
 * Unlike \`ObjectSchemaBuilder\` — which validates objects with a **known,
 * fixed set of property names** — \`RecordSchemaBuilder\` validates objects
 * whose keys are not known at schema-definition time (look-up tables, i18n
 * bundles, caches, etc.).
 *
 * @module
 */
import { type BRAND, type InferType, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';
/**
 * Descriptor for a single key-value entry within a validated record.
 * Provides \`getValue\`, \`setValue\`, and \`getSchema\` operations for the entry.
 *
 * Returned as part of {@link RecordKeyValidationResult}.
 */
export type RecordKeyDescriptor<TRecord, TValueSchema extends SchemaBuilder<any, any, any>> = {
    /** The key within the record this descriptor refers to. */
    readonly key: string;
    /** Returns the value schema every record entry must satisfy. */
    getSchema(): TValueSchema;
    /**
     * Retrieves the value at \`key\` from the given record object.
     * Returns \`{ success: false }\` when the key is not present.
     */
    getValue(obj: TRecord): {
        value?: InferType<TValueSchema>;
        success: boolean;
    };
    /**
     * Sets the value at \`key\` on the given record object.
     * Returns \`false\` when \`obj\` is not a non-null object.
     */
    setValue(obj: TRecord, value: InferType<TValueSchema>): boolean;
};
/**
 * Validation result for a single key-value entry in a record.
 * Returned by {@link RecordSchemaValidationResult.getErrorsFor | getErrorsFor(key)}.
 */
export type RecordKeyValidationResult<TRecord, TValueSchema extends SchemaBuilder<any, any, any>> = {
    /** Validation error messages for this entry; empty array when valid. */
    readonly errors: ReadonlyArray<string>;
    /** \`true\` when there are no validation errors for this entry. */
    readonly isValid: boolean;
    /** The value that was seen at this key during validation. */
    readonly seenValue: InferType<TValueSchema> | undefined;
    /** Descriptor for reading/writing the value at this key. */
    readonly descriptor: RecordKeyDescriptor<TRecord, TValueSchema>;
};
/**
 * Root-level validation result for the record object itself.
 * Returned by {@link RecordSchemaValidationResult.getErrorsFor | getErrorsFor()} (no argument).
 */
export type RecordRootValidationResult<TResult> = {
    /** Root-level error messages (e.g. \`"object expected"\`); empty when valid. */
    readonly errors: ReadonlyArray<string>;
    /** \`true\` when there are no root-level errors. */
    readonly isValid: boolean;
    /** The value that was being validated. */
    readonly seenValue: TResult | undefined;
};
/**
 * Validation result type returned by \`RecordSchemaBuilder.validate()\`.
 *
 * Extends \`ValidationResult\` with:
 * - \`getNestedErrors()\` — a per-key map of \`ValidationResult\` objects.
 * - \`getErrorsFor()\` — root-level errors for the record container itself.
 * - \`getErrorsFor(key)\` — errors, seen value, and descriptor for a specific key.
 */
export type RecordSchemaValidationResult<TResult, TValueSchema extends SchemaBuilder<any, any, any>> = ValidationResult<TResult> & {
    /**
     * Returns per-key validation results as a plain object.
     *
     * Each key in the returned object corresponds to a key in the input that
     * **failed** validation (in \`doNotStopOnFirstError\` mode) or the single
     * first failing key (in the default stop-on-first-error mode). Keys that
     * passed are not included.
     *
     * @deprecated Prefer {@link getErrorsFor} for a richer per-entry result
     * that also includes a descriptor and \`seenValue\`.
     *
     * @example
     * \`\`\`ts
     * const schema = record(string(), number().positive());
     * const result = schema.validate(
     *   { a: 1, b: -2, c: 'oops' },
     *   { doNotStopOnFirstError: true }
     * );
     *
     * if (!result.valid) {
     *   const nested = result.getNestedErrors();
     *   console.log(nested['b']); // ValidationResult for key 'b'
     *   console.log(nested['c']); // ValidationResult for key 'c'
     * }
     * \`\`\`
     */
    getNestedErrors(): Record<string, ValidationResult<InferType<TValueSchema>>>;
    /**
     * Returns root-level errors for the record container itself
     * (e.g. \`"object expected"\` when a non-object value is passed,
     * or errors from custom validators added to the record schema).
     *
     * @example
     * \`\`\`ts
     * const schema = record(string(), number());
     * const root = schema.validate(42 as any).getErrorsFor();
     * // root.errors[0] === 'object expected'
     * // root.isValid === false
     * \`\`\`
     */
    getErrorsFor(): RecordRootValidationResult<TResult>;
    /**
     * Returns the validation result for the entry with the given key,
     * including error messages, the seen value, and a descriptor for
     * accessing and modifying the value at that key.
     *
     * If the key was not reached during validation (e.g. an earlier key
     * already failed in stop-on-first-error mode), an empty result with
     * \`isValid: true\` and no errors is returned.
     *
     * @param key - the key whose validation result to retrieve
     *
     * @example
     * \`\`\`ts
     * const schema = record(string(), number().min(0));
     * const result = schema.validate(
     *   { a: 5, b: -2 },
     *   { doNotStopOnFirstError: true }
     * );
     *
     * const bErrors = result.getErrorsFor('b');
     * // bErrors.isValid === false
     * // bErrors.errors[0] === 'the value must be >= 0'
     * // bErrors.seenValue === -2
     * // bErrors.descriptor.key === 'b'
     * // bErrors.descriptor.getSchema() === valueSchema
     * \`\`\`
     */
    getErrorsFor(key: string): RecordKeyValidationResult<TResult, TValueSchema>;
};
type RecordSchemaBuilderCreateProps<TKeySchema extends StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any>, R extends boolean = true> = Partial<ReturnType<RecordSchemaBuilder<TKeySchema, TValueSchema, R>['introspect']>>;
/**
 * Schema builder for objects with dynamic string keys.
 *
 * Every key in the validated object must be accepted by \`keySchema\` (a
 * \`StringSchemaBuilder\`) and every value must satisfy \`valueSchema\`.
 *
 * The inferred TypeScript type mirrors \`Record<K, V>\` where \`K\` is the
 * string type produced by \`keySchema\` and \`V\` is the type produced by
 * \`valueSchema\`.
 *
 * **NOTE** — this class is exported to allow extension by inheritance. Use
 * the {@link record | record()} factory function instead of instantiating it
 * directly.
 *
 * @example
 * \`\`\`ts
 * import { record, string, number } from '@cleverbrush/schema';
 *
 * // Basic: string keys, number values
 * const scores = record(string(), number().min(0));
 * // InferType<typeof scores> → Record<string, number>
 *
 * scores.validate({ alice: 95, bob: 87 }); // valid
 * scores.validate({ alice: 95, bob: -1 }); // invalid (negative)
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Restrict keys to a specific set of literals with .equals()
 * const locales = record(
 *   string().matches(/^[a-z]{2}(-[A-Z]{2})?$/),
 *   string().nonempty()
 * );
 * // accepts: { en: 'Hello', fr: 'Bonjour' }
 * // rejects: { 123: 'oops' }  ← key doesn't match pattern
 * \`\`\`
 *
 * @see {@link record}
 */
export declare class RecordSchemaBuilder<TKeySchema extends StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any>, TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TResult = TExplicitType extends undefined ? Record<InferType<TKeySchema>, InferType<TValueSchema>> : TExplicitType> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: RecordSchemaBuilderCreateProps<any, any, any>): RecordSchemaBuilder<StringSchemaBuilder<any, any, any, any>, SchemaBuilder<any, any, any, {}>, true, undefined, false, {}, Record<any, any>>;
    protected constructor(props: RecordSchemaBuilderCreateProps<TKeySchema, TValueSchema, TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): RecordSchemaBuilder<TKeySchema, TValueSchema, true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): RecordSchemaBuilder<TKeySchema, TValueSchema, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(props: RecordSchemaBuilderCreateProps<TKeySchema, TValueSchema, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): RecordSchemaBuilder<TKeySchema, TValueSchema, true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): RecordSchemaBuilder<TKeySchema, TValueSchema, false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): RecordSchemaBuilder<TKeySchema, TValueSchema, true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): RecordSchemaBuilder<TKeySchema, TValueSchema, TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): RecordSchemaBuilder<TKeySchema, TValueSchema, TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * Returns an introspection object describing the record schema.
     */
    introspect(): {
        /**
         * The schema every key must satisfy (a \`StringSchemaBuilder\`).
         */
        keySchema: TKeySchema;
        /**
         * The schema every value must satisfy.
         */
        valueSchema: TValueSchema;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * Core sync validation. {@inheritDoc SchemaBuilder.validate}
     */
    validate(object: TResult, context?: ValidationContext): RecordSchemaValidationResult<TResult, TValueSchema>;
    /**
     * Core async validation. {@inheritDoc SchemaBuilder.validateAsync}
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<RecordSchemaValidationResult<TResult, TValueSchema>>;
    /**
     * Core sync validation. Returns \`{ valid, object, errors, getNestedErrors, getErrorsFor }\`.
     */
    protected _validate(object: TResult, context?: ValidationContext): RecordSchemaValidationResult<TResult, TValueSchema>;
    /**
     * Performs async validation of the record schema.
     *
     * Supports async preprocessors, validators, and error message providers.
     *
     * @param object - the value to validate
     * @param context - optional \`ValidationContext\` settings
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<RecordSchemaValidationResult<TResult, TValueSchema>>;
}
/**
 * Creates a schema for objects with dynamic string keys, where every key
 * must satisfy \`keySchema\` and every value must satisfy \`valueSchema\`.
 *
 * The inferred TypeScript type is \`Record<K, V>\` where \`K\` is derived from
 * \`keySchema\` and \`V\` from \`valueSchema\`.
 *
 * @param keySchema  - a \`StringSchemaBuilder\` that each key must satisfy
 * @param valueSchema - a \`SchemaBuilder\` that each value must satisfy
 *
 * @example
 * \`\`\`ts
 * import { record, string, number } from '@cleverbrush/schema';
 *
 * // Look-up table: string keys → number scores
 * const scores = record(string(), number().min(0).max(100));
 * // InferType<typeof scores> → Record<string, number>
 *
 * scores.validate({ alice: 95, bob: 87 }); // { valid: true }
 * scores.validate({ alice: 95, bob: -1 }); // { valid: false }
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // i18n bundle: locale code keys → non-empty strings
 * const bundle = record(
 *   string().matches(/^[a-z]{2}(-[A-Z]{2})?$/),
 *   string().nonempty()
 * );
 *
 * bundle.validate({ en: 'Hello', 'fr-FR': 'Bonjour' }); // valid
 * bundle.validate({ en: '' });                            // invalid (empty value)
 * bundle.validate({ '123': 'hi' });                      // invalid (bad key)
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Optional record with a factory default
 * const cache = record(string(), number())
 *   .optional()
 *   .default(() => ({}));
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Nested record — values are objects
 * import { record, string, object, number } from '@cleverbrush/schema';
 *
 * const userMap = record(
 *   string(),
 *   object({ name: string(), age: number() })
 * );
 * \`\`\`
 */
export declare function record<TKeySchema extends StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any>>(keySchema: TKeySchema, valueSchema: TValueSchema): RecordSchemaBuilder<TKeySchema, TValueSchema>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/SchemaBuilder.d.ts": `import { type Transaction } from '../utils/transaction.js';
import type { ArraySchemaBuilder } from './ArraySchemaBuilder.js';
import type { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
/** @internal Symbol used as the key for the type brand on schema builders. */
declare const __type: unique symbol;
/** @internal */
export type SchemaTypeBrand = typeof __type;
/** @internal Symbol used as the key for the default-value brand on schema builders. */
declare const __hasDefault: unique symbol;
/** @internal */
export type HasDefaultBrand = typeof __hasDefault;
/** Symbol used as the key for branded/opaque types. */
declare const __brand: unique symbol;
/** Symbol used as the key for branded/opaque types. */
export type BRAND = typeof __brand;
/**
 * Intersects a base type with a phantom brand tag.
 * The brand exists only at the type level — zero runtime cost.
 *
 * @example
 * \`\`\`ts
 * type Email = Brand<string, 'Email'>;
 * type UserId = Brand<number, 'UserId'>;
 * \`\`\`
 */
export type Brand<T, TBrand extends string | symbol> = T & {
    readonly [K in BRAND]: TBrand;
};
/**
 * Infers the TypeScript type that a \`SchemaBuilder\` instance validates.
 * Takes into account type optimizations (via \`optimize()\`) and whether the schema is optional.
 *
 * @example
 * \`\`\`ts
 * const userSchema = object({ name: string(), age: number().optional() });
 * type User = InferType<typeof userSchema>;
 * // { name: string; age?: number }
 * \`\`\`
 */
export type InferType<T> = T extends {
    optimize: (...args: any[]) => {
        readonly [K in SchemaTypeBrand]: infer TOptimized;
    };
} ? TOptimized : T extends {
    readonly [K in SchemaTypeBrand]: infer TType;
} ? TType : T;
/**
 * Represents a single validation error with a human-readable error message.
 */
export type ValidationError = {
    message: string;
};
/**
 * Used to represent a validation result for nested
 * objects/properties. Contains a list of errors and
 * the value that caused them.
 */
export type NestedValidationResult<TSchema, TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TParentPropertyDescriptor> = {
    /**
     * Value that property had and which caused error or errors
     */
    seenValue?: InferType<TSchema>;
    /**
     * A list of errors, empty if object satisfies a schema
     */
    errors: ReadonlyArray<string>;
    /**
     * Whether validation passed for this property and all of its children.
     */
    isValid: boolean;
    get descriptor(): PropertyDescriptorInner<TRootSchema, TSchema, TParentPropertyDescriptor>;
};
/**
 * Utility type that makes a value \`T\` optional (i.e. \`T | undefined\`).
 * Used internally by {@link InferType} to represent optional schema fields.
 */
export type MakeOptional<T> = {
    prop?: T;
}['prop'];
/**
 * Type of the function that provides a validation error message for
 * the given \`seenValue\` and \`schema\`. Can be a string or a function
 * returning a string or a promise of a string.
 * Should be used to provide a custom validation error message.
 */
export type ValidationErrorMessageProvider<TSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = string | ((seenValue: InferType<TSchema>, schema: TSchema) => string | Promise<string>);
export type ValidationResult<T> = {
    /**
     * If \`true\` - object satisfies schema
     */
    valid: boolean;
    /**
     * Contains validated object. Can be different (if there are any preprocessors in the schema) from object
     * passed to the \`validate\` method of the \`SchemaBuilder\` class.
     */
    object?: T;
    errors?: ValidationError[];
};
/**
 * Error thrown by {@link SchemaBuilder.parse | parse()} and
 * {@link SchemaBuilder.parseAsync | parseAsync()} when validation fails.
 * Carries the full array of {@link ValidationError | validation errors}.
 */
export declare class SchemaValidationError extends Error {
    readonly errors: ValidationError[];
    constructor(errors: ValidationError[]);
}
/**
 * Internal result returned by the \`preValidate\` step of \`SchemaBuilder\`.
 * Contains the validation context, any early errors, and the transaction
 * wrapping the (possibly preprocessed) value.
 */
export type PreValidationResult<T, TTransactionType> = Omit<ValidationResult<T>, 'object'> & {
    context: ValidationContext;
    transaction?: Transaction<TTransactionType>;
    rootPropertyDescriptor?: PropertyDescriptor<any, any, undefined>;
};
type ValidatorResult<T> = Omit<ValidationResult<T>, 'object' | 'errors'> & {
    errors?: ValidationError[];
};
/**
 * A function that transforms the value before validation.
 * Preprocessors run in order before validators and can modify or replace the value.
 *
 * @param object - the current value to preprocess
 * @returns the transformed value, or a Promise resolving to it
 */
export type Preprocessor<T> = (object: T) => Promise<T> | T;
/**
 * A custom validation function that checks a value and returns a result
 * indicating whether the value is valid, along with optional error messages.
 *
 * @param object - the value to validate
 * @returns a result with \`valid\` boolean and optional \`errors\` array, or a Promise resolving to it
 */
export type Validator<T> = (object: T) => Promise<ValidatorResult<T>> | ValidatorResult<T>;
/**
 * Internal wrapper that pairs a preprocessor function with metadata
 * indicating whether it may mutate the value.
 */
export type PreprocessorEntry<T> = {
    fn: Preprocessor<T>;
    mutates: boolean;
};
/**
 * Internal wrapper that pairs a validator function with metadata
 * indicating whether it may mutate the value.
 */
export type ValidatorEntry<T> = {
    fn: Validator<T>;
    mutates: boolean;
};
/**
 * Configuration properties used to construct a \`SchemaBuilder\` instance.
 * Contains the schema type identifier, requirement flag, and lists of
 * preprocessors and validators.
 */
export type SchemaBuilderProps<T> = {
    type: string;
    isRequired?: boolean;
    isReadonly?: boolean;
    preprocessors: PreprocessorEntry<T>[];
    validators: ValidatorEntry<T>[];
    requiredValidationErrorMessageProvider?: ValidationErrorMessageProvider;
    extensions?: Record<string, unknown>;
    defaultValue?: T | (() => T);
    catchValue?: T | (() => T);
    hasCatch?: boolean;
    description?: string;
};
export type ValidationContext<TSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = {
    /**
     * Optional. By default validation will stop after the first validation error, in case if
     * you want to receive all validation erors, please set this flag to \`true\`.
     * You might need it to display validation errors.
     */
    doNotStopOnFirstError?: boolean;
    /**
     * Optional. If you define a \`rootPropertyDescriptor\` while validating an object,
     * it will report all validation errors with the path starting from the root property.
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    rootPropertyDescriptor?: TSchema extends ObjectSchemaBuilder<any, any, any, any> ? PropertyDescriptor<TSchema, TSchema, undefined> : never;
    /**
     * Optional. This is a property descriptor for the current object being validated.
     * This descriptor is descendant of the \`rootPropertyDescriptor\` and is used to provide
     * a path to the current object being validated in the root object.
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    currentPropertyDescriptor?: TSchema extends ObjectSchemaBuilder<any, any, any> ? PropertyDescriptor<TSchema, TSchema, unknown> : never;
    /**
     * Optional. Used along with \`rootPropertyDescriptor\` and \`currentPropertyDescriptor\` to provide
     * a root validation object, this object will be used to retrieve the value of properties
     * using the \`rootPropertyDescriptor\` because the \`rootPropertyDescriptor\` is a property descriptor
     * for the root object, and it needs the root object along with the whole structure to get the
     * value of the property.
     *
     * Normally it's used internally by the library for validation of nested objects and
     * should not be used directly (but who knows, maybe you will find a use case for it).
     */
    rootValidationObject?: InferType<TSchema>;
};
/**
 * A symbol to mark property descriptors in the schema.
 * Normally, you should not use it directly unless you want
 * to develop some advanced features or extend the library.
 * In normal conditions it's used internally by the library.
 */
export declare const SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR: unique symbol;
/**
 * Describes a property in a schema. And gives you
 * a possibility to access property value and set it.
 * suppose you have a schema like this:
 * \`\`\`ts
 * const schema = object({
 *  name: string(),
 *  address: object({
 *   city: string(),
 *   country: string()
 *  }),
 *  id: number()
 * });
 * \`\`\`
 * then you can get a property descriptor for the \`address.city\` property
 * like this:
 * \`\`\`ts
 * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
 * \`\`\`
 *
 * And then you can use it to get and set the value of this property having the object:
 * \`\`\`ts
 * const obj = {
 * name: 'Leo',
 * address: {
 *  city: 'Kozelsk',
 *  country: 'Russia'
 *  },
 *  id: 123
 * };
 *
 * const success = addressCityDescriptor.setValue(obj, 'Venyov');
 * // this returns you a boolean value indicating if the value was set successfully
 * \`\`\`
 */
export type PropertySetterOptions = {
    /**
     * If set to \`true\`, the method will create missing structure
     * in the object to set the value. For example, if you have a schema
     * and property descriptor like this:
     * \`\`\`ts
     * const schema = object({
     * address: object({
     * city: string(),
     * country: string()
     * }),
     * });
     * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
     * \`\`\`
     * And then you try to set a new value to the \`address.city\` property on the object
     * which does not have \`address\` property:
     * \`\`\`ts
     * const obj = {
     * name: 'Leo'
     * };
     * const success = addressCityDescriptor.setValue(obj, 'Venyov', { createMissingStructure: true });
     * // success === true
     * // obj === {
     * // name: 'Leo',
     * // address: {
     * // city: 'Venyov'
     * //  }
     * // }
     */
    createMissingStructure?: boolean;
};
/**
 * Extracts the inner property descriptor type from a \`PropertyDescriptor\`.
 * Returns \`undefined\` if \`T\` is not a valid \`PropertyDescriptor\`.
 */
export type PropertyDescriptorInnerFromPropertyDescriptor<T> = T extends PropertyDescriptor<infer TSchema, infer TPropertySchema, infer TParentPropertyDescriptor> ? PropertyDescriptorInner<TSchema, TPropertySchema, TParentPropertyDescriptor> : undefined;
export type PropertyDescriptorInner<TSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TPropertySchema, TParentPropertyDescriptor> = {
    /**
     * Sets a new value to the property. If the process was successful,
     * the method returns \`true\`, otherwise \`false\`.
     * It can return \`false\` if the property could not be set to the object
     * which can happen if the \`setValue\` method is called with an object
     * which does not comply with the schema.
     * for example, if you have a schema and property descriptopr like this:
     * \`\`\`ts
     * const schema = object({
     *  name: string(),
     *  address: object({
     *   city: string(),
     *   country: string()
     *  }),
     *  id: number()
     * });
     *
     * const addressCityDescriptor = object.getPropertiesFor(schema).address.city;
     * \`\`\`
     * And then you try to set a new value to the \`address.city\` property on the object
     * which does not have \`address\` property:
     * \`\`\`ts
     * const obj = {
     * name: 'Leo'
     * };
     *
     * const success = addressCityDescriptor.setValue(obj, 'Venyov');
     * // success === false
     * \`\`\`
     *
     * @param obj Object to set the value to
     * @param value a new value to set to the property
     * @param options additional optional parameters to control the process
     * @returns
     */
    setValue: (obj: InferType<TSchema>, value: InferType<TPropertySchema>, options?: PropertySetterOptions) => boolean;
    /**
     * Gets the value of the property from the object.
     * @param obj object to get the value from
     * @returns an object containing a \`value\` and \`success\` properties. \`value\` is the value of the property
     * if it was found in the object, \`success\` is a boolean value indicating if the property was found in the object.
     */
    getValue: (obj: InferType<TSchema>) => {
        value?: InferType<TPropertySchema>;
        success: boolean;
    };
    /**
     * Gets the schema for the property described by the property descriptor.
     * @returns a schema for the property
     */
    getSchema: () => TPropertySchema;
    parent: PropertyDescriptorInnerFromPropertyDescriptor<TParentPropertyDescriptor>;
};
/**
 * A wrapper object keyed by {@link SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR} that
 * holds a {@link PropertyDescriptorInner} for a particular property within
 * an object schema. Used to get/set property values on validated objects.
 */
export type PropertyDescriptor<TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TPropertySchema, TParentPropertyDescriptor> = {
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: PropertyDescriptorInner<TRootSchema, TPropertySchema, TParentPropertyDescriptor>;
};
/**
 * A tree of property descriptors for the schema.
 * Has a possibility to filter properties by the type (\`TAssignableTo\` type parameter).
 */
export type PropertyDescriptorTree<TSchema extends ObjectSchemaBuilder<any, any, any, any, any>, TRootSchema extends ObjectSchemaBuilder<any, any, any, any, any> = TSchema, TAssignableTo = any, TParentPropertyDescriptor = undefined> = PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor> & (TSchema extends ObjectSchemaBuilder<infer TProperties, any, any> ? {
    [K in keyof TProperties]: TProperties[K] extends ObjectSchemaBuilder<any, any, any> ? PropertyDescriptorTree<TProperties[K], TRootSchema, any, PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : TProperties[K] extends ArraySchemaBuilder<infer TArrayElement, any, any> ? TArrayElement extends ObjectSchemaBuilder<any, any, any, any, any> ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : InferType<TProperties[K]> extends TAssignableTo ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : never : InferType<TProperties[K]> extends TAssignableTo ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : never;
} : never);
/**
 * Creates an array augmented with non-enumerable NestedValidationResult
 * properties (\`seenValue\`, \`errors\`, \`isValid\`, \`descriptor\`).
 * Used by UnionSchemaBuilder and ArraySchemaBuilder to return hybrid
 * arrays from \`getErrorsFor()\`.
 */
export declare function createHybridErrorArray<T extends any[]>(items: T, seenValue: () => any, errors: () => ReadonlyArray<string>, descriptor: () => any): T;
/**
 * Base class for all schema builders. Provides basic functionality for schema building.
 *
 * **Note:** this class is not intended to be used directly, use one of the subclasses instead.
 * @typeparam TResult Type of the object that will be returned by \`validate()\` method.
 * @typeparam TRequired If \`true\`, object will be required. If \`false\`, object will be optional.
 */
export declare abstract class SchemaBuilder<TResult = any, TRequired extends boolean = true, THasDefault extends boolean = false, TExtensions = {}> {
    #private;
    /**
     * Type-level brand encoding the inferred type of this schema.
     * Not emitted at runtime — used only by {@link InferType}.
     * @internal
     */
    readonly [__type]: TRequired extends true ? TResult : MakeOptional<TResult>;
    /**
     * Type-level brand encoding whether this schema has a default value.
     * Not emitted at runtime — used by input type inference.
     * @internal
     */
    readonly [__hasDefault]: THasDefault;
    /**
     * Set type of schema explicitly. \`notUsed\` param is needed only for case when JS is used. E.g. when you
     * can't call method like \`schema.hasType<Date>()\`, so instead you can call \`schema.hasType(new Date())\`
     * with the same result.
     */
    abstract hasType<T>(notUsed?: T): any;
    /**
     * Clears type set by call to \`.hasType<T>()\`, default schema type inference will be used
     * for schema returned by this call.
     */
    abstract clearHasType(): any;
    /**
     * Protected method used to create a new instance of the Builder
     * defined by the \`props\` object. Should be used to instantiate new
     * builders to keep builder's immutability.
     * @param props arbitrary props object
     */
    protected abstract createFromProps(props: any): this;
    /**
     * The string identifier of the schema type (e.g. \`'string'\`, \`'number'\`, \`'object'\`).
     */
    protected get type(): string;
    /**
     * Sets the schema type identifier. Must be a non-empty string.
     */
    protected set type(value: string);
    /**
     * A list of preprocessors associated with
     * the Builder
     */
    protected get preprocessors(): PreprocessorEntry<TResult>[];
    /**
     * A list of validators associated with
     * the Builder
     */
    protected get validators(): ValidatorEntry<TResult>[];
    /**
     * Whether the schema requires a non-null/non-undefined value.
     */
    protected get isRequired(): TRequired;
    /**
     * Sets the requirement flag. Must be a boolean.
     */
    protected set isRequired(value: boolean);
    /**
     * The error message provider used for the "is required" error.
     * Exposed for fast-path validation in subclasses.
     */
    protected get requiredErrorMessage(): ValidationErrorMessageProvider;
    /**
     * Whether this schema has a default value configured via \`.default()\`.
     * Exposed for fast-path validation in subclasses.
     */
    protected get hasDefault(): boolean;
    /**
     * Whether this schema has a catch/fallback value configured via \`.catch()\`.
     */
    protected get hasCatch(): boolean;
    /**
     * Resolves the catch/fallback value. If the stored value is a factory function,
     * it is called to produce the value (useful for mutable fallbacks like \`() => []\`).
     */
    protected resolveCatchValue(): TResult;
    /**
     * Whether this schema is marked as readonly.
     * Type-level only — no runtime enforcement.
     */
    protected get isReadonly(): boolean;
    /**
     * Resolves the default value. If the stored default is a function,
     * it is called to produce the value (useful for mutable defaults).
     */
    protected resolveDefaultValue(): TResult;
    /**
     * Whether \`preValidateSync\` can be skipped entirely.
     * True when there are no preprocessors and no validators,
     * so the only work would be the required check and wrapping
     * in a noop transaction — which subclasses can do inline.
     */
    protected get canSkipPreValidation(): boolean;
    /**
     * Whether \`null\` should count as a required-constraint violation.
     *
     * By default \`null\` is treated the same as \`undefined\` for the purposes
     * of the required check — i.e. a required schema rejects both.
     * Subclasses that may legally receive \`null\` as a value (e.g.
     * \`UnionSchemaBuilder\` when a \`NullSchemaBuilder\` option is present)
     * can override this to \`false\` so that \`null\` bypasses the required
     * check and is passed directly to their option-validation logic.
     *
     * @protected
     */
    protected get isNullRequiredViolation(): boolean;
    /**
     * Synchronous version of {@link preValidateAsync}.
     * Throws at runtime if any preprocessor or validator returns a Promise.
     *
     * @param object - the value to pre-validate
     * @param context - optional validation context settings
     * @returns a \`PreValidationResult\` containing the preprocessed transaction, context, and any errors
     * @throws Error if a preprocessor or validator returns a Promise (use {@link preValidateAsync} instead)
     */
    protected preValidateSync(object: any, context?: ValidationContext): PreValidationResult<any, {
        validatedObject: any;
    }>;
    /**
     * Async version of pre-validation. Runs preprocessors, validators, and the
     * required/optional check on \`object\`. Supports async preprocessors,
     * validators, and error message providers.
     *
     * @param object - the value to pre-validate
     * @param context - optional validation context settings
     * @returns a \`PreValidationResult\` containing the preprocessed transaction, context, and any errors
     */
    protected preValidateAsync(object: any, context?: ValidationContext): Promise<PreValidationResult<any, {
        validatedObject: any;
    }>>;
    /**
     * @deprecated Use {@link preValidateAsync} instead. This alias will be removed in a future version.
     */
    protected preValidate(object: any, context?: ValidationContext): Promise<PreValidationResult<any, {
        validatedObject: any;
    }>>;
    /**
     * Generates a serializable object describing the defined schema
     */
    introspect(): {
        /**
         * String \`id\` of schema type, e.g. \`string', \`number\` or \`object\`.
         */
        type: string;
        /**
         * If set to \`false\`, schema will be optional (\`null\` or \`undefined\` values
         * will be considered as valid).
         */
        isRequired: boolean;
        /**
         * If set to \`true\`, the inferred type is marked as readonly.
         * Type-level only — no runtime enforcement.
         */
        isReadonly: boolean;
        /**
         * Array of preprocessor functions
         */
        preprocessors: readonly PreprocessorEntry<TResult>[];
        /**
         * Array of validator functions
         */
        validators: readonly ValidatorEntry<TResult>[];
        /**
         * Custom error message provider for the 'is required' validation error.
         */
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        /**
         * Extension metadata. Stores custom state set by schema extensions.
         */
        extensions: {
            [x: string]: unknown;
        };
        /**
         * Whether a default value (or factory) has been set on this schema.
         */
        hasDefault: boolean;
        /**
         * The default value or factory function.
         */
        defaultValue: TResult | (() => TResult) | undefined;
        /**
         * The human-readable description attached to this schema via \`.describe()\`,
         * or \`undefined\` if none was set.
         */
        description: string | undefined;
        /**
         * Whether a catch/fallback value has been set on this schema via \`.catch()\`.
         */
        hasCatch: boolean;
        /**
         * The catch/fallback value or factory function set via \`.catch()\`.
         */
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * Makes schema optional (consider \`null\` and \`undefined\` as valid objects for this schema)
     */
    optional(): any;
    /**
     * Sets a default value for this schema. When the input is \`undefined\`,
     * the default value is used instead. The default is still validated
     * against the schema's constraints.
     *
     * Accepts either a static value or a factory function (useful for
     * mutable defaults like \`() => new Date()\` or \`() => []\`).
     *
     * @example
     * \`\`\`ts
     * const schema = string().default('hello');
     * schema.validate(undefined); // { valid: true, object: 'hello' }
     * schema.validate('world');   // { valid: true, object: 'world' }
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // Factory function for mutable defaults
     * const schema = array(string()).default(() => []);
     * \`\`\`
     */
    default(value: TResult | (() => TResult)): any;
    /**
     * Sets a fallback value for this schema. When validation **fails** for any reason,
     * the fallback value is returned as a successful result instead of validation errors.
     *
     * This is useful for graceful degradation — for example, providing a safe default
     * when parsing untrusted input that might not conform to the schema.
     *
     * Accepts either a static value or a factory function. Factory functions are called
     * each time the fallback is needed (useful for mutable values like \`() => []\`).
     *
     * Unlike {@link default}, which only fires when the input is \`undefined\`, \`.catch()\`
     * fires on **any** validation failure — type mismatch, constraint violation, etc.
     *
     * When \`.catch()\` is set, {@link parse} and {@link parseAsync} will **never throw**.
     *
     * @param value - the fallback value, or a factory function producing the fallback
     *
     * @example
     * \`\`\`ts
     * const schema = string().catch('unknown');
     * schema.validate(42);        // { valid: true, object: 'unknown' }
     * schema.validate('hello');   // { valid: true, object: 'hello' }
     * schema.parse(42);           // 'unknown'  (no throw)
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // Factory function for mutable fallbacks
     * const schema = array(string()).catch(() => []);
     * schema.validate(null);  // { valid: true, object: [] }
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // Contrast with .default() — default fires only on undefined
     * const d = string().default('anon');
     * d.validate(undefined); // { valid: true, object: 'anon' }  ← fires
     * d.validate(42);        // { valid: false, errors: [...] }  ← does NOT fire
     *
     * const c = string().catch('anon');
     * c.validate(undefined); // { valid: true, object: 'anon' }  ← fires
     * c.validate(42);        // { valid: true, object: 'anon' }  ← also fires
     * \`\`\`
     */
    catch(value: TResult | (() => TResult)): this;
    /**
     * Removes the default value set by a previous call to \`.default()\`.
     */
    clearDefault(): any;
    /**
     * Attaches a human-readable description to this schema as runtime metadata.
     *
     * The description has no effect on validation — it is purely informational.
     * It is accessible via \`.introspect().description\` and is emitted as the
     * \`description\` field by \`toJsonSchema()\` from \`@cleverbrush/schema-json\`.
     *
     * Useful for documentation generation, form labels, and AI tool descriptions.
     *
     * @example
     * \`\`\`ts
     * const schema = object({
     *   name: string().describe('The user\\'s full name'),
     *   age:  number().optional().describe('Age in years'),
     * }).describe('A user object');
     *
     * schema.introspect().description; // 'A user object'
     * \`\`\`
     */
    describe(text: string): this;
    /**
     * Brands the schema with a phantom type tag, preventing structural mixing
     * of semantically different values at the type level. Zero runtime cost.
     *
     * The optional \`_name\` parameter is only needed when using plain JavaScript
     * (where generic type parameters are unavailable). In TypeScript, prefer
     * the generic form: \`schema.brand<'Email'>()\`.
     *
     * @example
     * \`\`\`ts
     * const Email = string().brand<'Email'>();
     * const Username = string().brand<'Username'>();
     * type Email = InferType<typeof Email>;     // string & { readonly [BRAND]: 'Email' }
     * type Username = InferType<typeof Username>; // string & { readonly [BRAND]: 'Username' }
     * \`\`\`
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): any;
    /**
     * Marks the inferred type as readonly. For objects, produces \`Readonly<T>\`.
     * For arrays, produces \`ReadonlyArray<T>\`. Primitives are unchanged.
     * Type-level only — no runtime enforcement.
     *
     * @example
     * \`\`\`ts
     * const schema = object({ name: string(), age: number() }).readonly();
     * type T = InferType<typeof schema>; // Readonly<{ name: string; age: number }>
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * const schema = array(string()).readonly();
     * type T = InferType<typeof schema>; // ReadonlyArray<string>
     * \`\`\`
     */
    readonly(): any;
    /**
     * Makes schema required (consider \`null\` and \`undefined\` as invalid objects for this schema)
     * @param errorMessage - optional custom error message or provider for the 'is required' validation error
     */
    required(errorMessage?: ValidationErrorMessageProvider): any;
    /**
     * Adds a \`preprocessor\` to a preprocessors list
     */
    addPreprocessor(preprocessor: Preprocessor<TResult>, options?: {
        mutates?: boolean;
    }): this;
    /**
     * Remove all preprocessors for this schema.
     */
    clearPreprocessors(): this;
    /**
     * Adds a \`validator\` to validators list.
     */
    addValidator(validator: Validator<TResult>, options?: {
        mutates?: boolean;
    }): this;
    /**
     * Remove all validators for this schema.
     */
    clearValidators(): this;
    /**
     * Perform synchronous schema validation on \`object\`.
     * Throws at runtime if any preprocessor, validator, or error message
     * provider returns a Promise — use {@link validateAsync} instead.
     * @internal Override this in subclasses. External callers use {@link validate}.
     */
    protected abstract _validate(object: any, context?: ValidationContext): ValidationResult<any>;
    /**
     * Perform asynchronous schema validation on \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @internal Override this in subclasses. External callers use {@link validateAsync}.
     */
    protected abstract _validateAsync(object: any, context?: ValidationContext): Promise<ValidationResult<any>>;
    /**
     * Perform synchronous schema validation on \`object\`.
     * Throws at runtime if any preprocessor, validator, or error message
     * provider returns a Promise — use {@link validateAsync} instead.
     *
     * If a fallback has been set via {@link catch}, a failed validation result
     * is replaced by a successful result built from the fallback value, preserving
     * the specialized result shape (e.g. \`getErrorsFor\` / \`getNestedErrors\` methods).
     */
    validate(
    /**
     * Object to validate
     */
    object: any, 
    /**
     * Optional \`ValidationContext\` settings
     */
    context?: ValidationContext): ValidationResult<any>;
    /**
     * Perform asynchronous schema validation on \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     *
     * If a fallback has been set via {@link catch}, a failed validation result
     * is replaced by a successful result built from the fallback value, preserving
     * the specialized result shape (e.g. \`getErrorsFor\` / \`getNestedErrors\` methods).
     */
    validateAsync(
    /**
     * Object to validate
     */
    object: any, 
    /**
     * Optional \`ValidationContext\` settings
     */
    context?: ValidationContext): Promise<ValidationResult<any>>;
    /**
     * Synchronously resolves a \`ValidationErrorMessageProvider\` to a string.
     * Throws if the provider function returns a Promise.
     *
     * @param provider - the error message provider (string or sync function)
     * @param seenValue - the value that caused the validation error
     * @returns the resolved error message string
     * @throws Error if the provider returns a Promise (use {@link getValidationErrorMessage} with {@link validateAsync})
     */
    protected getValidationErrorMessageSync(provider: ValidationErrorMessageProvider<any>, seenValue: TResult): string;
    /**
     * Resolves a \`ValidationErrorMessageProvider\` to a string error message.
     * Handles both string providers and function providers (sync or async).
     *
     * @param provider - the error message provider (string or function)
     * @param seenValue - the value that caused the validation error
     * @returns the resolved error message string
     */
    protected getValidationErrorMessage(provider: ValidationErrorMessageProvider<any>, seenValue: TResult): Promise<string>;
    /**
     * Ensures a \`ValidationErrorMessageProvider\` is valid.
     * If \`provider\` is \`undefined\`, falls back to \`defaultValue\`.
     * Function providers are bound to \`this\` for access to schema state.
     *
     * @param provider - the provider to validate, or \`undefined\`
     * @param defaultValue - fallback provider when \`provider\` is not supplied
     * @returns a valid \`ValidationErrorMessageProvider\`
     */
    protected assureValidationErrorMessageProvider(provider: ValidationErrorMessageProvider<any> | undefined, defaultValue: ValidationErrorMessageProvider<any>): ValidationErrorMessageProvider<any>;
    /**
     * Sets extension metadata by key. Returns a new schema instance with the
     * extension data stored. The data survives fluent chaining.
     * @internal Used by extension authors inside \`defineExtension()\` callbacks.
     */
    withExtension(key: string, value: unknown): this;
    /**
     * Retrieves extension metadata by key.
     * @internal Used by extension authors inside \`defineExtension()\` callbacks.
     */
    getExtension(key: string): unknown;
    /**
     * Synchronously validates the value and returns it if valid.
     * Throws a {@link SchemaValidationError} if validation fails.
     *
     * @param object - the value to parse
     * @param context - optional validation context
     * @returns the validated value
     * @throws SchemaValidationError if validation fails
     * @throws Error if the schema contains async preprocessors, validators, or error message providers
     */
    parse(object: any, context?: ValidationContext): TResult;
    /**
     * Asynchronously validates the value and returns it if valid.
     * Throws a {@link SchemaValidationError} if validation fails.
     *
     * @param object - the value to parse
     * @param context - optional validation context
     * @returns the validated value
     * @throws SchemaValidationError if validation fails
     */
    parseAsync(object: any, context?: ValidationContext): Promise<TResult>;
    /**
     * Alias for {@link validate}. Synchronously validates and returns a result object.
     * Provided for familiarity with the zod API.
     */
    safeParse(object: any, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Alias for {@link validateAsync}. Asynchronously validates and returns a result object.
     * Provided for familiarity with the zod API.
     */
    safeParseAsync(object: any, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected constructor(props: SchemaBuilderProps<TResult>);
}
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/StringSchemaBuilder.d.ts": `import { type BRAND, type PreprocessorEntry, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult, type ValidatorEntry } from './SchemaBuilder.js';
type StringSchemaBuilderCreateProps<T = string, R extends boolean = true> = Partial<ReturnType<StringSchemaBuilder<T, R>['introspect']>>;
/**
 * Allows to define a schema for a string. It can be: required or optional,
 * restricted to be equal to a certain value, restricted to have a certain
 * length, restricted to start with a certain value, restricted to end with
 * a certain value, restricted to match a certain regular expression.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link string | string()} function instead.
 *
 * @example \`\`\`ts
 * const schema = string().equals('hello');
 * const result = schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = string().equals('hello');
 * const result = schema.validate('world');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'hello'"
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = string().minLength(5);
 * const result = schema.validate('hello');
 * // result.valid === true
 * // result.object === 'hello'
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = string().minLength(5);
 * const result = schema.validate('hi');
 * // result.valid === false
 * // result.errors[0].message === 'is expected to have a length of at least 5'
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = string().minLength(2).maxLength(5);
 * const result = schema.validate('yes');
 * // result.valid === true
 * // result.object === 'yes'
 * \`\`\`
 *
 * @example \`\`\`ts
 * const schema = string('no');
 * const result = schema.validate('yes');
 * // result.valid === false
 * // result.errors[0].message === "is expected to be equal to 'no'"
 * \`\`\`
 *
 * @see {@link string}
 */
export declare class StringSchemaBuilder<TResult = string, TRequired extends boolean = true, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: StringSchemaBuilderCreateProps): StringSchemaBuilder<string, true, false, {}>;
    protected constructor(props: StringSchemaBuilderCreateProps);
    introspect(): {
        /**
         * Min length of the string (if defined).
         */
        minLength: number | undefined;
        /**
         * Min length validation error message provider.
         * If not provided, default error message will be used.
         */
        minLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Max length of the string (if defined).
         */
        maxLength: number | undefined;
        /**
         * Max length validation error message provider.
         * If not provided, default error message will be used.
         */
        maxLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict object to be equal to a certain value.
         */
        equalsTo: string | undefined;
        /**
         * Equals validation error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict string to start with a certain value.
         */
        startsWith: string | undefined;
        /**
         * Starts with validation error message provider.
         * If not provided, default error message will be used.
         */
        startsWithValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict string to end with a certain value.
         */
        endsWith: string | undefined;
        /**
         * Ends with validation error message provider.
         * If not provided, default error message will be used.
         */
        endsWithValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * If set, restrict string to match a certain regular expression.
         */
        matches: RegExp | undefined;
        /**
         * Matches validation error message provider.
         * If not provided, default error message will be used.
         */
        matchesValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, false, {}>>;
        /**
         * Array of preprocessor functions
         */
        preprocessors: PreprocessorEntry<TResult>[];
        /**
         * Array of validator functions
         */
        validators: ValidatorEntry<TResult>[];
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): StringSchemaBuilder<T, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): StringSchemaBuilder<string, TRequired, THasDefault, TExtensions> & TExtensions;
    /** {@inheritDoc SchemaBuilder.validate} */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /** {@inheritDoc SchemaBuilder.validateAsync} */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    /**
     * Performs synchronous validation of string schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of string schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<T, TReq extends boolean>(props: StringSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * Restricts string to be equal to \`value\`.
     */
    equals<T extends string>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<T, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancels \`equals()\` call.
     */
    clearEquals(): StringSchemaBuilder<string, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): StringSchemaBuilder<TResult, true, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): StringSchemaBuilder<TResult, false, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): StringSchemaBuilder<TResult, true, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): StringSchemaBuilder<TResult, TRequired, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): StringSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Marks the inferred type as \`Readonly<string>\`. Since strings are
     * already immutable this is an identity operation, but it sets the
     * \`isReadonly\` introspection flag for tooling consistency.
     *
     * @see {@link SchemaBuilder.readonly}
     */
    readonly(): StringSchemaBuilder<Readonly<TResult>, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Set minimal length of the valid value for schema.
     * @param length minimum string length
     */
    minLength(length: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`minLength()\` call.
     */
    clearMinLength(): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Set maximal length of the valid value for schema.
     * @param length maximum string length
     */
    maxLength(length: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancel \`maxLength()\` call.
     */
    clearMaxLength(): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Restricts string to start with \`val\`.
     */
    startsWith<T extends string>(val: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult extends string ? \`\${T}\${TResult}\` : TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancels \`startsWith()\` call.
     */
    clearStartsWith(): StringSchemaBuilder<string, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Restricts string to end with \`val\`.
     */
    endsWith<T extends string>(val: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult extends string ? \`\${TResult}\${T}\` : TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancels \`endsWith()\` call.
     */
    clearEndsWith(): StringSchemaBuilder<string, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Restricts string to match \`regexp\`.
     * @param regexp regular expression pattern to match against
     */
    matches(regexp: RegExp, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
    /**
     * Cancels \`matches()\` call.
     */
    clearMatches(): StringSchemaBuilder<TResult, TRequired, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a string schema restricted to be equal to \`equals\`.
 * @param equals string value the schema is restricted to
 */
export declare function string<T extends string>(equals: T): StringSchemaBuilder<T, true>;
/**
 * Creates a string schema restricted to be equal to \`equals\` with a custom error message.
 * @param equals string value the schema is restricted to
 */
export declare function string<T extends string>(equals: T, errorMessage: ValidationErrorMessageProvider<StringSchemaBuilder<T, true>>): StringSchemaBuilder<T, true>;
export declare function string(): StringSchemaBuilder<string, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/TupleSchemaBuilder.d.ts": `import type { ObjectSchemaBuilder, ObjectSchemaValidationResult } from './ObjectSchemaBuilder.js';
import { type BRAND, type InferType, type NestedValidationResult, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
import type { UnionSchemaBuilder, UnionSchemaValidationResult } from './UnionSchemaBuilder.js';
/**
 * Maps a tuple of schema builders to a tuple of their per-position
 * validation result types.
 * Union schema elements get \`UnionSchemaValidationResult\`,
 * object schema elements get \`ObjectSchemaValidationResult\`,
 * other types get \`ValidationResult\`.
 */
export type TupleElementValidationResults<TElements extends readonly SchemaBuilder<any, any, any>[]> = {
    [K in keyof TElements]: TElements[K] extends UnionSchemaBuilder<infer UOptions extends readonly SchemaBuilder<any, any, any>[], any, any> ? UnionSchemaValidationResult<InferType<TElements[K]>, UOptions> : TElements[K] extends ObjectSchemaBuilder<any, any, any, any, any> ? ObjectSchemaValidationResult<InferType<TElements[K]>, TElements[K]> : ValidationResult<InferType<TElements[K]>>;
};
/**
 * Validation result type returned by \`TupleSchemaBuilder.validate()\`.
 * Extends \`ValidationResult\` with \`getNestedErrors\` for root-level tuple
 * errors and per-position validation results.
 */
export type TupleSchemaValidationResult<TResult, TElements extends readonly SchemaBuilder<any, any, any>[]> = ValidationResult<TResult> & {
    /**
     * Returns root-level tuple validation errors combined with
     * per-position validation results.
     * The returned value has both \`NestedValidationResult\` properties
     * (\`errors\`, \`isValid\`, \`descriptor\`, \`seenValue\`) and indexed
     * position results (\`[0]\`, \`[1]\`, etc.).
     */
    getNestedErrors(): TupleElementValidationResults<TElements> & NestedValidationResult<any, any, any>;
};
type TupleSchemaBuilderCreateProps<TElements extends readonly SchemaBuilder<any, any, any>[], TRestSchema extends SchemaBuilder<any, any, any> | undefined = undefined, R extends boolean = true> = Partial<ReturnType<TupleSchemaBuilder<TElements, R, undefined, false, {}, TRestSchema>['introspect']>>;
/**
 * Fixed-length array schema builder with per-position type validation.
 * Similar to TypeScript's tuple types — each element at a specific array index
 * is validated against its own schema.
 *
 * Use it when you need to validate function arguments, CSV rows, coordinate
 * pairs, structured event payloads, or any other fixed-structure array.
 *
 * **NOTE** this class is exported only to give opportunity to extend it
 * by inheriting. It is not recommended to create an instance of this class
 * directly. Use {@link tuple | tuple()} function instead.
 *
 * @example
 * \`\`\`ts
 * const schema = tuple([string(), number(), boolean()]);
 * // Inferred TypeScript type: [string, number, boolean]
 *
 * schema.validate(['hello', 42, true]);
 * // result.valid === true
 * // result.object === ['hello', 42, true]
 *
 * schema.validate(['hello', 42]);
 * // result.valid === false  (too few elements)
 *
 * schema.validate(['hello', 'oops', true]);
 * // result.valid === false  (wrong type at position 1)
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Tuple with variadic rest elements
 * const schema = tuple([string(), number()]).rest(boolean());
 * // Inferred TypeScript type: [string, number, ...boolean[]]
 *
 * schema.validate(['hello', 42, true, false]);
 * // result.valid === true — any number of extra booleans allowed
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Nested tuple combining with object schemas
 * const point = tuple([number(), number()]);
 * const segment = tuple([point, point]);
 *
 * segment.validate([[0, 0], [10, 20]]);
 * // result.valid === true
 * \`\`\`
 *
 * @see {@link tuple}
 */
export declare class TupleSchemaBuilder<TElements extends readonly SchemaBuilder<any, any, any>[], TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}, TRestSchema extends SchemaBuilder<any, any, any> | undefined = undefined, TResult = TExplicitType extends undefined ? TRestSchema extends SchemaBuilder<any, any, any> ? [
    ...{
        [K in keyof TElements]: InferType<TElements[K]>;
    },
    ...Array<InferType<TRestSchema>>
] : {
    [K in keyof TElements]: InferType<TElements[K]>;
} : TExplicitType> extends SchemaBuilder<TResult, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: TupleSchemaBuilderCreateProps<any, any, any>): TupleSchemaBuilder<readonly SchemaBuilder<any, any, any, {}>[], true, undefined, false, {}, undefined, readonly any[]>;
    protected constructor(props: TupleSchemaBuilderCreateProps<TElements, TRestSchema, TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): TupleSchemaBuilder<TElements, true, T, THasDefault, TExtensions, TRestSchema> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): TupleSchemaBuilder<TElements, TRequired, undefined, THasDefault, TExtensions, TRestSchema> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`. {@inheritDoc SchemaBuilder.validate}
     */
    validate(object: TResult, context?: ValidationContext): TupleSchemaValidationResult<TResult, TElements>;
    /**
     * Performs asynchronous validation of the schema over \`object\`. {@inheritDoc SchemaBuilder.validateAsync}
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<TupleSchemaValidationResult<TResult, TElements>>;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TResult, context?: ValidationContext): TupleSchemaValidationResult<TResult, TElements>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TResult, context?: ValidationContext): Promise<TupleSchemaValidationResult<TResult, TElements>>;
    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(props: TupleSchemaBuilderCreateProps<TElements, TRestSchema, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): TupleSchemaBuilder<TElements, true, TExplicitType, THasDefault, TExtensions, TRestSchema> & TExtensions;
    /**
     * @hidden
     */
    optional(): TupleSchemaBuilder<TElements, false, TExplicitType, THasDefault, TExtensions, TRestSchema> & TExtensions;
    /**
     * @hidden
     */
    default(value: TResult | (() => TResult)): TupleSchemaBuilder<TElements, true, TExplicitType, true, TExtensions, TRestSchema> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): TupleSchemaBuilder<TElements, TRequired, TExplicitType, false, TExtensions, TRestSchema> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): TupleSchemaBuilder<TElements, TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions, TRestSchema> & TExtensions;
    introspect(): {
        /**
         * Per-position element schemas defining the fixed tuple structure.
         */
        elements: TElements;
        /**
         * Optional schema for elements beyond the fixed positions.
         * When set, additional elements are validated against this schema.
         * Mirrors TypeScript's rest element syntax: \`[string, number, ...boolean[]]\`.
         */
        restSchema: (TRestSchema & SchemaBuilder<any, any, any, {}>) | undefined;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: TResult | (() => TResult) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: TResult | (() => TResult) | undefined;
    };
    /**
     * Sets a schema that all elements beyond the fixed positions must satisfy.
     * Mirrors TypeScript's variadic tuple tail: \`[string, number, ...boolean[]]\`.
     *
     * When set, the tuple length must be at least equal to the number of fixed
     * elements, and any additional elements are validated against \`schema\`.
     * When not set, the tuple length must be exactly equal to the fixed count.
     *
     * @param schema Schema that extra array elements must satisfy.
     *
     * @example
     * \`\`\`ts
     * const schema = tuple([string(), number()]).rest(boolean());
     * // Inferred TypeScript type: [string, number, ...boolean[]]
     *
     * schema.validate(['hello', 42]);               // valid
     * schema.validate(['hello', 42, true]);          // valid
     * schema.validate(['hello', 42, true, false]);   // valid
     * schema.validate(['hello', 42, 'extra']);       // invalid — 'extra' not boolean
     * \`\`\`
     */
    rest<TSchema extends SchemaBuilder<any, any, any>>(schema: TSchema): TupleSchemaBuilder<TElements, TRequired, TExplicitType, THasDefault, TExtensions, TSchema> & TExtensions;
    /**
     * Removes the rest schema set by \`rest()\`. After this call, the tuple
     * length must be exactly equal to the number of fixed element schemas.
     */
    clearRest(): TupleSchemaBuilder<TElements, TRequired, TExplicitType, THasDefault, TExtensions, undefined> & TExtensions;
}
/**
 * Creates a fixed-length array schema (tuple) where each element at a
 * specific index is validated against its own schema.
 *
 * @param elements Array of per-position schemas. The length of this array
 *   determines the required tuple length (unless \`.rest()\` is used).
 *
 * @example
 * \`\`\`ts
 * import { tuple, string, number, boolean } from '@cleverbrush/schema';
 *
 * const schema = tuple([string(), number(), boolean()]);
 * // Inferred TypeScript type: [string, number, boolean]
 *
 * schema.validate(['hello', 42, true]);     // valid
 * schema.validate(['hello', 42]);           // invalid — too few elements
 * schema.validate(['hello', 'oops', true]); // invalid — wrong type at [1]
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // 2-D coordinate pair
 * const point = tuple([number(), number()]);
 * const result = point.validate([10.5, 20.3]);
 * // result.valid === true
 * // result.object === [10.5, 20.3]
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * // Optional tuple with default value
 * const schema = tuple([string(), number()])
 *     .optional()
 *     .default(() => ['', 0]);
 * \`\`\`
 */
export declare const tuple: <const TElements extends readonly SchemaBuilder<any, any, any>[]>(elements: [...TElements]) => TupleSchemaBuilder<TElements, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/UnionSchemaBuilder.d.ts": `import type { ObjectSchemaBuilder, ObjectSchemaValidationResult } from './ObjectSchemaBuilder.js';
import { type BRAND, type InferType, type NestedValidationResult, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult } from './SchemaBuilder.js';
type UnionSchemaBuilderCreateProps<T extends readonly SchemaBuilder<any, any, any>[], R extends boolean = true> = Partial<ReturnType<UnionSchemaBuilder<T, R>['introspect']>>;
/**
 * Mapped tuple type that converts a tuple of SchemaBuilder options into
 * a tuple of their corresponding validation results.
 * Union schema options get \`UnionSchemaValidationResult\` with recursive
 * \`getNestedErrors\` navigation; object schema options get
 * \`ObjectSchemaValidationResult\`; other types get \`ValidationResult\`.
 */
export type OptionValidationResults<TOptions extends readonly SchemaBuilder<any, any, any>[]> = {
    [K in keyof TOptions]: TOptions[K] extends UnionSchemaBuilder<infer UOptions extends readonly SchemaBuilder<any, any, any>[], any, any> ? UnionSchemaValidationResult<InferType<TOptions[K]>, UOptions> : TOptions[K] extends ObjectSchemaBuilder<any, any, any, any> ? ObjectSchemaValidationResult<InferType<TOptions[K]>, TOptions[K]> : ValidationResult<InferType<TOptions[K]>>;
};
/**
 * Validation result type returned by \`UnionSchemaBuilder.validate()\`.
 * Extends \`ValidationResult\` with:
 * - \`getNestedErrors\` for root-level union errors and per-branch validation results
 */
export type UnionSchemaValidationResult<T, TOptions extends readonly SchemaBuilder<any, any, any>[]> = ValidationResult<T> & {
    /**
     * Returns root-level union validation errors combined with
     * per-branch validation results.
     * The returned value has both \`NestedValidationResult\` properties
     * (\`errors\`, \`isValid\`, \`descriptor\`, \`seenValue\`) and tuple-indexed
     * branch results (\`[0]\`, \`[1]\`, etc.).
     */
    getNestedErrors(): OptionValidationResults<TOptions> & NestedValidationResult<any, any, any>;
};
type SchemaArrayToUnion<TArr extends readonly SchemaBuilder<any, any, any>[]> = TArr['length'] extends 1 ? InferType<TArr[0]> : TArr extends readonly [
    infer TFirst extends SchemaBuilder<any, any, any>,
    ...infer TRest extends SchemaBuilder<any, any, any>[]
] ? InferType<TFirst> | SchemaArrayToUnion<[...TRest]> : never;
type TakeBeforeIndex<TArr extends readonly SchemaBuilder<any, any, any>[], TIndex extends number> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any, any>[],
    infer _ extends SchemaBuilder<any, any, any>
] ? TRest['length'] extends TIndex ? TRest : TakeBeforeIndex<TRest, TIndex> : never;
type TakeAfterIndex<TArr extends readonly SchemaBuilder<any, any, any>[], TIndex extends number, TAcc extends readonly SchemaBuilder<any, any, any>[] = []> = TArr extends [
    ...infer TRest extends SchemaBuilder<any, any, any>[],
    infer TLast extends SchemaBuilder<any, any, any>
] ? TRest['length'] extends TIndex ? TAcc : TakeAfterIndex<TRest, TIndex, [TLast, ...TAcc]> : never;
type TakeExceptIndex<TArr extends readonly SchemaBuilder<any, any, any>[], TIndex extends number> = [...TakeBeforeIndex<TArr, TIndex>, ...TakeAfterIndex<TArr, TIndex>];
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
 * \`\`\`ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = schema.validate('foo');
 * // result.valid === true
 * // result.object === 'foo'
 * \`\`\`
 *
 * @example
 * \`\`\`ts
 * const schema = union(string('foo')).or(string('bar'));
 * const result = schema.validate('baz');
 * // result.valid === false
 * \`\`\`
 *
 * @example
 * \`\`\`ts
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
 * \`\`\`
 *
 * @see {@link union}
 */
export declare class UnionSchemaBuilder<TOptions extends readonly SchemaBuilder<any, any, any>[], TRequired extends boolean = true, TExplicitType = undefined, THasDefault extends boolean = false, TExtensions = {}> extends SchemaBuilder<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TRequired, THasDefault, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: UnionSchemaBuilderCreateProps<any>): UnionSchemaBuilder<any, true, undefined, false, {}>;
    protected constructor(props: UnionSchemaBuilderCreateProps<TOptions, TRequired>);
    introspect(): {
        /**
         * Array of schemas participating in the union.
         */
        options: TOptions;
        type: string;
        isRequired: boolean;
        isReadonly: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any, {}>>;
        extensions: {
            [x: string]: unknown;
        };
        hasDefault: boolean;
        defaultValue: (TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) | (() => TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) | undefined;
        description: string | undefined;
        hasCatch: boolean;
        catchValue: (TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) | (() => TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) | undefined;
    };
    /**
     * Null is a legitimate JavaScript value that a union option (e.g.
     * \`NullSchemaBuilder\`) may accept. Override the base-class behaviour so
     * that a required union does **not** reject \`null\` during pre-validation;
     * instead, each option gets the opportunity to validate it.
     * @override
     */
    protected get isNullRequiredViolation(): boolean;
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): UnionSchemaBuilder<TOptions, true, T, THasDefault, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): UnionSchemaBuilder<TOptions, TRequired, undefined, THasDefault, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the union schema over \`object\`. {@inheritDoc SchemaBuilder.validate}
     */
    validate(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>;
    /**
     * Performs async validation of the union schema over \`object\`. {@inheritDoc SchemaBuilder.validateAsync}
     */
    validateAsync(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): Promise<UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>>;
    /**
     * Performs synchronous validation of the union schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validate(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>;
    /**
     * Performs async validation of the union schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    protected _validateAsync(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): Promise<UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>>;
    protected createFromProps<T extends readonly SchemaBuilder<any, any, any>[], TReq extends boolean>(props: UnionSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): UnionSchemaBuilder<TOptions, true, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): UnionSchemaBuilder<TOptions, false, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    default(value: (TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) | (() => TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType)): UnionSchemaBuilder<TOptions, true, TExplicitType, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearDefault(): UnionSchemaBuilder<TOptions, TRequired, TExplicitType, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): UnionSchemaBuilder<TOptions, TRequired, (TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) & {
        readonly [K in BRAND]: TBrand;
    }, THasDefault, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    readonly(): UnionSchemaBuilder<TOptions, TRequired, Readonly<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType>, THasDefault, TExtensions> & TExtensions;
    /**
     * Adds a new schema option described by \`schema\`.
     * schema must be an instance of \`SchemaBuilder\` class ancestor.
     * @param schema schema to be added as an option.
     */
    or<T extends SchemaBuilder<any, any, any>>(schema: T): UnionSchemaBuilder<[
        ...TOptions,
        T
    ], TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Removes option by its \`index\`. If \`index\` is out of bounds,
     * an error is thrown.
     * @param index index of the option, starting from \`0\`.
     */
    removeOption<T extends number>(index: T): UnionSchemaBuilder<TakeExceptIndex<TOptions, T>, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
    /**
     * Removes first option from the union schema.
     */
    removeFirstOption(): TOptions extends [
        infer _,
        ...infer TRest extends SchemaBuilder<any, any, any>[]
    ] ? UnionSchemaBuilder<TRest, TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions : never;
    /**
     * Removes all options and replaces them by single \`schema\` option.
     * Equivalent to \`union(schema)\` function, but could be useful in some cases.
     * @param schema schema to be added as a single option to the new schema.
     */
    reset<T extends SchemaBuilder<any, any, any>>(schema: T): UnionSchemaBuilder<[
        T
    ], TRequired, TExplicitType, THasDefault, TExtensions> & TExtensions;
}
/**
 * Creates a union schema.
 * @param schema required and will be considered as a first option for the union schema.
 */
export declare const union: <T extends SchemaBuilder<any, any, any>>(schema: T) => UnionSchemaBuilder<[T]>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/core.d.ts": `export { AnySchemaBuilder, any } from './builders/AnySchemaBuilder.js';
export type { ArraySchemaValidationResult, ElementValidationResult } from './builders/ArraySchemaBuilder.js';
export { ArraySchemaBuilder, array } from './builders/ArraySchemaBuilder.js';
export { BooleanSchemaBuilder, boolean } from './builders/BooleanSchemaBuilder.js';
export { DateSchemaBuilder, date } from './builders/DateSchemaBuilder.js';
export { FunctionSchemaBuilder, func } from './builders/FunctionSchemaBuilder.js';
export { LazySchemaBuilder, lazy } from './builders/LazySchemaBuilder.js';
export { NullSchemaBuilder, nul } from './builders/NullSchemaBuilder.js';
export { NumberSchemaBuilder, number } from './builders/NumberSchemaBuilder.js';
export { ObjectSchemaBuilder, object, SchemaPropertySelector } from './builders/ObjectSchemaBuilder.js';
export type { RecordSchemaValidationResult } from './builders/RecordSchemaBuilder.js';
export { RecordSchemaBuilder, record } from './builders/RecordSchemaBuilder.js';
export type { PropertyDescriptor, PropertyDescriptorInner, PropertyDescriptorTree, PropertySetterOptions, ValidationErrorMessageProvider } from './builders/SchemaBuilder.js';
export { BRAND, Brand, InferType, MakeOptional, SchemaBuilder, SchemaValidationError, SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR, ValidationError, ValidationResult } from './builders/SchemaBuilder.js';
export { StringSchemaBuilder, string } from './builders/StringSchemaBuilder.js';
export type { TupleElementValidationResults, TupleSchemaValidationResult } from './builders/TupleSchemaBuilder.js';
export { TupleSchemaBuilder, tuple } from './builders/TupleSchemaBuilder.js';
export type { OptionValidationResults, UnionSchemaValidationResult } from './builders/UnionSchemaBuilder.js';
export { UnionSchemaBuilder, union } from './builders/UnionSchemaBuilder.js';
export type { CleanExtended, ExtensionConfig, ExtensionDescriptor, FixedMethods, HiddenExtensionMethods } from './extension.js';
export { defineExtension, withExtensions } from './extension.js';
`,
    "file:///node_modules/@cleverbrush/schema/extension.d.ts": `/**
 * @module extension
 *
 * The **extension system** for \`@cleverbrush/schema\` allows third-party and
 * first-party code to add custom methods to any schema builder type
 * (\`string\`, \`number\`, \`date\`, \`object\`, …) without modifying the core
 * library.
 *
 * ## Overview
 *
 * Extensions follow a two-step workflow:
 *
 * 1. **Define** an extension with {@link defineExtension} — declare which
 *    builder types it targets and what methods it adds.
 * 2. **Apply** one or more extensions with {@link withExtensions} — get back
 *    augmented factory functions (\`string()\`, \`number()\`, …) whose return
 *    types include the new methods.
 *
 * ## Ergonomic authoring
 *
 * Extension methods do **not** need to call \`withExtension()\` manually.
 * The system automatically attaches metadata using the method name as the
 * extension key and the method arguments as the value. This keeps extension
 * definitions concise:
 *
 * \`\`\`ts
 * const slugExt = defineExtension({
 *   string: {
 *     slug(this: StringSchemaBuilder) {
 *       return this.addValidator((val) => {
 *         const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val);
 *         return { valid, errors: valid ? [] : [{ message: 'must be a valid URL slug' }] };
 *       });
 *     }
 *   }
 * });
 * \`\`\`
 *
 * If you need **custom metadata** (e.g. a different key or a transformed
 * value), call \`this.withExtension(key, value)\` explicitly — the auto-infer
 * logic will detect the existing key and skip the automatic attachment.
 *
 * ## Stacking and composition
 *
 * Multiple extensions can target the same builder type. Pass them all to
 * \`withExtensions()\` and the methods are merged. A runtime error is thrown
 * if two extensions define the same method name on the same builder type.
 *
 * \`\`\`ts
 * const s = withExtensions(emailExt, slugExt, rangeExt);
 * const schema = s.string().email().slug(); // both methods available
 * \`\`\`
 *
 * ## Introspection
 *
 * Extension metadata is accessible via \`schema.introspect().extensions\`.
 * Each key corresponds to an extension method name and its value is whatever
 * was passed (or auto-inferred) as the extension data.
 *
 * @see {@link defineExtension} — define an extension
 * @see {@link withExtensions} — apply extensions to builder factories
 * @see {@link ExtensionConfig} — shape of the configuration object
 * @see {@link ExtensionDescriptor} — branded descriptor returned by \`defineExtension\`
 */
import { AnySchemaBuilder } from './builders/AnySchemaBuilder.js';
import { ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
import { BooleanSchemaBuilder } from './builders/BooleanSchemaBuilder.js';
import { DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
import { FunctionSchemaBuilder } from './builders/FunctionSchemaBuilder.js';
import { NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
import { ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import { RecordSchemaBuilder } from './builders/RecordSchemaBuilder.js';
import type { SchemaBuilder } from './builders/SchemaBuilder.js';
import { StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
import { TupleSchemaBuilder } from './builders/TupleSchemaBuilder.js';
import { UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
/**
 * Maps each builder type name to the corresponding generic builder class.
 *
 * Used internally to type-check extension method \`this\` bindings — for
 * example, an extension targeting \`"string"\` receives \`this: StringSchemaBuilder\`.
 *
 * @internal Not exported — used only by the extension type machinery.
 */
type BuilderMap = {
    string: StringSchemaBuilder<any, any, any, any>;
    number: NumberSchemaBuilder<any, any, any, any>;
    boolean: BooleanSchemaBuilder<any, any, any, any, any, any>;
    date: DateSchemaBuilder<any, any, any, any>;
    object: ObjectSchemaBuilder<any, any, any, any, any>;
    array: ArraySchemaBuilder<any, any, any, any, any, any>;
    tuple: TupleSchemaBuilder<any, any, any, any, any, any>;
    record: RecordSchemaBuilder<any, any, any, any, any, any>;
    union: UnionSchemaBuilder<any, any, any, any, any>;
    func: FunctionSchemaBuilder<any, any, any, any, any>;
    any: AnySchemaBuilder<any, any, any, any, any>;
};
type BuilderTypeName = keyof BuilderMap;
/**
 * Defines the shape of an extension configuration object passed to
 * {@link defineExtension}.
 *
 * Each key is a **builder type name** — one of \`"string"\`, \`"number"\`,
 * \`"boolean"\`, \`"date"\`, \`"object"\`, \`"array"\`, \`"union"\`, \`"func"\`, or
 * \`"any"\`. The value is a record of **method implementations** to add to
 * that builder type.
 *
 * Method implementations receive \`this\` bound to the target builder instance
 * (e.g. \`StringSchemaBuilder\` for the \`"string"\` key) and **must** return a
 * builder of the same type to support fluent chaining.
 *
 * @remarks
 * Extension methods that only add validators/preprocessors do not need to
 * call \`this.withExtension()\` — the system will auto-attach metadata using
 * the method name as the key and the arguments as the value. Call
 * \`this.withExtension(key, value)\` explicitly only when you need custom
 * metadata (e.g. a transformed value or a different key).
 *
 * @example
 * \`\`\`ts
 * // Minimal extension config — auto-inferred metadata
 * const config: ExtensionConfig = {
 *   string: {
 *     slug(this: StringSchemaBuilder) {
 *       return this.addValidator((v) => ({ valid: /^[a-z0-9-]+$/.test(v), errors: [] }));
 *     }
 *   },
 *   number: {
 *     port(this: NumberSchemaBuilder) {
 *       return this.isInteger().min(1).max(65535);
 *     }
 *   }
 * };
 * \`\`\`
 *
 * @see {@link defineExtension}
 */
export type ExtensionConfig = {
    [K in BuilderTypeName]?: Record<string, (this: BuilderMap[K], ...args: any[]) => any>;
};
/**
 * A branded descriptor returned by {@link defineExtension}.
 *
 * The descriptor captures the extension's method signatures at the **type
 * level** so that {@link withExtensions} can produce correctly-typed factory
 * functions. At runtime it holds the (possibly wrapped) configuration object.
 *
 * Extension descriptors are intentionally **opaque** — consumers should not
 * access \`config\` directly. Instead, pass descriptors to
 * {@link withExtensions} to obtain augmented builder factories.
 *
 * @typeParam T - The concrete {@link ExtensionConfig} shape. Inferred
 *   automatically by \`defineExtension\`; you rarely need to specify it.
 *
 * @example
 * \`\`\`ts
 * // The type is inferred — no need to annotate
 * const myExt: ExtensionDescriptor<{ string: { slug: ... } }> = defineExtension({ ... });
 * \`\`\`
 *
 * @see {@link defineExtension}
 * @see {@link withExtensions}
 */
export type ExtensionDescriptor<T extends ExtensionConfig = ExtensionConfig> = {
    readonly __brand: unique symbol;
    readonly config: T;
};
/** Extracts the method signatures an extension adds to a given builder type. */
type ExtractMethods<TExt extends ExtensionConfig, TType extends BuilderTypeName> = TExt[TType] extends Record<string, (...args: any[]) => any> ? TExt[TType] : {};
/** Merges the methods from multiple extensions for a given builder type. */
type MergeExtensionMethods<TExts extends readonly ExtensionDescriptor<any>[], TType extends BuilderTypeName> = TExts extends readonly [
    ExtensionDescriptor<infer TFirst>,
    ...infer TRest extends readonly ExtensionDescriptor<any>[]
] ? ExtractMethods<TFirst, TType> & MergeExtensionMethods<TRest, TType> : {};
/**
 * Intersected onto consumer-facing builder types to make \`withExtension\`
 * and \`getExtension\` uncallable (\`never\`). Using an intersection instead
 * of \`Omit\` preserves the class identity so extended builders remain
 * assignable to \`SchemaBuilder<any, any, any>\`.
 */
export type HiddenExtensionMethods = {
    /** @internal Extension-author only — use inside \`defineExtension()\`. */
    withExtension: never;
    /** @internal Extension-author only — use inside \`defineExtension()\`. */
    getExtension: never;
};
/**
 * Overrides extension method return types so they always return the full
 * extended builder type. This ensures extension methods preserve all other
 * extension methods through chaining (e.g. \`s.string().email().slug()\`).
 *
 * The self-reference (\`FixedMethods\` appears in its own mapped return
 * types) is resolved lazily by TypeScript because the recursion sits
 * inside a function-return position within a conditional mapped type.
 */
export type FixedMethods<TRawMethods, TBase> = {
    [K in keyof TRawMethods]: TRawMethods[K] extends (this: any, ...args: infer A) => any ? (...args: A) => TBase & FixedMethods<TRawMethods, TBase> & HiddenExtensionMethods : TRawMethods[K];
};
/**
 * Produces the consumer-facing type for an extended builder: the base
 * builder intersected with its fixed extension methods, with
 * \`withExtension\` / \`getExtension\` overridden to \`never\` so they
 * don't appear as callable in consumer code.
 */
export type CleanExtended<TBuilder, TExt> = TBuilder & FixedMethods<TExt, TBuilder> & HiddenExtensionMethods;
type ExtendedStringFactory<TExt> = {
    (): CleanExtended<StringSchemaBuilder<string, true, false, TExt>, TExt>;
    <T extends string>(equals: T): CleanExtended<StringSchemaBuilder<T, true, false, TExt>, TExt>;
};
type ExtendedNumberFactory<TExt> = {
    (): CleanExtended<NumberSchemaBuilder<number, true, false, TExt>, TExt>;
    <T extends number>(equals: T): CleanExtended<NumberSchemaBuilder<T, true, false, TExt>, TExt>;
};
type ExtendedBooleanFactory<TExt> = () => CleanExtended<BooleanSchemaBuilder<boolean, true, undefined, false, TExt>, TExt>;
type ExtendedDateFactory<TExt> = () => CleanExtended<DateSchemaBuilder<Date, true, false, TExt>, TExt>;
type ExtendedObjectFactory<TExt> = <P extends Record<string, SchemaBuilder<any, any, any>>>(properties?: P) => CleanExtended<ObjectSchemaBuilder<P, true, undefined, false, TExt>, TExt>;
type ExtendedArrayFactory<TExt> = <TElementSchema extends SchemaBuilder<any, any, any>>(elementSchema?: TElementSchema) => CleanExtended<ArraySchemaBuilder<TElementSchema, true, undefined, false, TExt>, TExt>;
type ExtendedUnionFactory<TExt> = <T extends SchemaBuilder<any, any, any>>(schema: T) => CleanExtended<UnionSchemaBuilder<[T], true, undefined, false, TExt>, TExt>;
type ExtendedFuncFactory<TExt> = () => CleanExtended<FunctionSchemaBuilder<true, undefined, false, TExt>, TExt>;
type ExtendedAnyFactory<TExt> = () => CleanExtended<AnySchemaBuilder<true, undefined, false, TExt>, TExt>;
type ExtendedTupleFactory<TExt> = <const TElements extends readonly SchemaBuilder<any, any, any>[]>(elements: [...TElements]) => CleanExtended<TupleSchemaBuilder<TElements, true, undefined, false, TExt>, TExt>;
type ExtendedRecordFactory<TExt> = <TKeySchema extends StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any>>(keySchema: TKeySchema, valueSchema: TValueSchema) => CleanExtended<RecordSchemaBuilder<TKeySchema, TValueSchema, true, undefined, false, TExt>, TExt>;
/**
 * The return type of {@link withExtensions}.
 *
 * Contains a factory function for every builder type (\`string\`, \`number\`,
 * \`boolean\`, \`date\`, \`object\`, \`array\`, \`union\`, \`func\`, \`any\`). Each
 * factory returns a builder whose type includes the methods contributed
 * by all provided extension descriptors.
 *
 * @typeParam TExts - Tuple of extension descriptors passed to \`withExtensions\`.
 *
 * @see {@link withExtensions}
 */
type WithExtensionsResult<TExts extends readonly ExtensionDescriptor<any>[]> = {
    string: ExtendedStringFactory<MergeExtensionMethods<TExts, 'string'>>;
    number: ExtendedNumberFactory<MergeExtensionMethods<TExts, 'number'>>;
    boolean: ExtendedBooleanFactory<MergeExtensionMethods<TExts, 'boolean'>>;
    date: ExtendedDateFactory<MergeExtensionMethods<TExts, 'date'>>;
    object: ExtendedObjectFactory<MergeExtensionMethods<TExts, 'object'>>;
    array: ExtendedArrayFactory<MergeExtensionMethods<TExts, 'array'>>;
    tuple: ExtendedTupleFactory<MergeExtensionMethods<TExts, 'tuple'>>;
    record: ExtendedRecordFactory<MergeExtensionMethods<TExts, 'record'>>;
    union: ExtendedUnionFactory<MergeExtensionMethods<TExts, 'union'>>;
    func: ExtendedFuncFactory<MergeExtensionMethods<TExts, 'func'>>;
    any: ExtendedAnyFactory<MergeExtensionMethods<TExts, 'any'>>;
};
/**
 * Defines an extension targeting one or more schema builder types.
 *
 * Each extension is a plain object keyed by builder type name (\`"string"\`,
 * \`"number"\`, \`"date"\`, …) whose values are method implementations.
 * Methods receive \`this\` bound to the builder instance and must return a
 * builder to support fluent chaining.
 *
 * ## Ergonomic metadata (auto-infer)
 *
 * Extension methods **do not** have to call \`this.withExtension()\`. The
 * system wraps each method and automatically attaches
 * \`withExtension(methodName, args)\` to the returned builder when the key
 * is not already present. This eliminates the most common source of
 * duplication in extension code.
 *
 * - **Zero-arg methods** → metadata value is \`true\`
 * - **Single-arg methods** → metadata value is the argument itself
 * - **Multi-arg methods** → metadata value is the arguments array
 *
 * If you need **custom metadata** (e.g. a different key, a transformed
 * value, or a structured object), call \`this.withExtension(key, value)\`
 * explicitly inside the method — the auto-infer logic detects the existing
 * key and skips automatic attachment.
 *
 * ## Validation
 *
 * \`defineExtension\` validates the configuration eagerly:
 * - Unknown builder type names throw immediately.
 * - {@link RESERVED_METHODS | Reserved method names} (e.g. \`validate\`,
 *   \`introspect\`) cannot be overridden.
 * - Non-function values in the method record are rejected.
 *
 * @param config - An {@link ExtensionConfig} object mapping builder type
 *   names to method records.
 * @returns A branded {@link ExtensionDescriptor} ready to pass to
 *   {@link withExtensions}.
 *
 * @example Simple extension (auto-inferred metadata)
 * \`\`\`ts
 * const slugExt = defineExtension({
 *   string: {
 *     slug(this: StringSchemaBuilder) {
 *       return this.addValidator((val) => {
 *         const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val);
 *         return { valid, errors: valid ? [] : [{ message: 'invalid slug' }] };
 *       });
 *     }
 *   }
 * });
 *
 * // Usage:
 * const s = withExtensions(slugExt);
 * const schema = s.string().slug();
 * schema.introspect().extensions.slug; // true
 * \`\`\`
 *
 * @example Extension with custom metadata
 * \`\`\`ts
 * const currencyExt = defineExtension({
 *   number: {
 *     currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
 *       const maxDec = opts?.maxDecimals ?? 2;
 *       return this.withExtension('currency', { maxDecimals: maxDec })
 *         .min(0)
 *         .addValidator((val) => {
 *           const decimals = (String(val).split('.')[1] ?? '').length;
 *           const valid = decimals <= maxDec;
 *           return { valid, errors: valid ? [] : [{ message: \`max \${maxDec} decimals\` }] };
 *         });
 *     }
 *   }
 * });
 * \`\`\`
 *
 * @example Multi-builder extension
 * \`\`\`ts
 * const myExt = defineExtension({
 *   string: {
 *     email(this: StringSchemaBuilder) { return this.addValidator(...); }
 *   },
 *   number: {
 *     port(this: NumberSchemaBuilder) { return this.isInteger().min(1).max(65535); }
 *   }
 * });
 * \`\`\`
 *
 * @throws {Error} If a builder type name is unknown.
 * @throws {Error} If a method name is reserved.
 * @throws {Error} If a method value is not a function.
 *
 * @see {@link withExtensions} — apply the defined extension
 * @see {@link ExtensionConfig} — configuration shape
 */
export declare function defineExtension<T extends ExtensionConfig>(config: T): ExtensionDescriptor<T>;
/**
 * Creates a set of schema factory functions with the provided extensions
 * applied.
 *
 * Each factory function (\`string()\`, \`number()\`, \`date()\`, …) returned by
 * \`withExtensions\` produces builder instances whose prototypes include the
 * extension methods. All built-in builder methods remain available and
 * fully chainable alongside the new ones.
 *
 * ## Stacking multiple extensions
 *
 * Pass any number of {@link ExtensionDescriptor}s — their methods are
 * merged per builder type. If two extensions define the **same** method
 * name on the same builder type, a runtime error is thrown to prevent
 * silent conflicts.
 *
 * ## Type safety
 *
 * The return type is fully inferred: TypeScript knows exactly which
 * extension methods are available on each builder factory. Extension
 * methods return the full extended builder type, so chaining like
 * \`s.string().email().slug().minLength(3)\` is fully typed.
 *
 * ## Builder types without extensions
 *
 * Builders that have no methods from any of the provided extensions
 * use the standard (unextended) factory, so there is zero overhead.
 *
 * @param extensions - One or more {@link ExtensionDescriptor}s created
 *   by {@link defineExtension}.
 * @returns An object with factory functions for all builder types
 *   (\`string\`, \`number\`, \`boolean\`, \`date\`, \`object\`, \`array\`, \`union\`,
 *   \`func\`, \`any\`), each returning augmented builders.
 *
 * @example Basic usage
 * \`\`\`ts
 * const s = withExtensions(emailExt, rangeExt);
 *
 * // string() now has .email()
 * const emailSchema = s.string().email().minLength(5);
 *
 * // number() now has .range()
 * const rangeSchema = s.number().range(0, 100);
 *
 * // builders without targeted extensions work as normal
 * const dateSchema = s.date();
 * \`\`\`
 *
 * @example Stacking extensions on the same builder
 * \`\`\`ts
 * const s = withExtensions(emailExt, slugExt, trimmedExt);
 * const schema = s.string().email().slug().trimmed();
 * \`\`\`
 *
 * @example Using extensions in object schemas
 * \`\`\`ts
 * const s = withExtensions(emailExt, portExt);
 * const ServerConfig = s.object({
 *   host: s.string().email(),
 *   port: s.number().port()
 * });
 * \`\`\`
 *
 * @throws {Error} If two extensions define the same method name on the
 *   same builder type.
 *
 * @see {@link defineExtension} — create extension descriptors
 * @see {@link ExtensionDescriptor}
 */
export declare function withExtensions<const TExts extends readonly ExtensionDescriptor<any>[]>(...extensions: TExts): WithExtensionsResult<TExts>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/extensions/array.d.ts": `/**
 * Built-in array extensions for \`@cleverbrush/schema\`.
 *
 * Provides common array validators: {@link arrayExtensions | nonempty}
 * and {@link arrayExtensions | unique}.
 *
 * These are pre-applied in the default \`@cleverbrush/schema\` import.
 * Import from \`@cleverbrush/schema/core\` to get bare builders without these extensions.
 *
 * @module
 */
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { SchemaBuilder, ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import type { NullableMethod, NullableReturn } from './nullable.js';
/** Return type shared by every method on {@link ArrayBuiltinExtensions}. */
type ArrayExtReturn<TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = ArraySchemaBuilder<TElementSchema, true, undefined, false, ArrayBuiltinExtensions<TElementSchema>> & ArrayBuiltinExtensions<TElementSchema> & NullableMethod<ArraySchemaBuilder<TElementSchema, true, undefined, false, ArrayBuiltinExtensions<TElementSchema>>> & HiddenExtensionMethods;
/**
 * Methods added to \`ArraySchemaBuilder\` by the built-in array extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * \`arrayExtensions\` so that JSDoc survives into the published \`.d.ts\`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the \`FixedMethods\` mapped type (conditional \`infer\` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface ArrayBuiltinExtensions<TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> {
    /**
     * Validates that the array contains at least one element.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the nonempty validator applied
     *
     * @example
     * \`\`\`ts
     * array().nonempty();
     * array().nonempty('At least one item required');
     * \`\`\`
     */
    nonempty(errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArrayExtReturn<TElementSchema>;
    /**
     * Validates that all elements in the array are unique.
     *
     * For primitive elements, uses strict equality. For objects, pass a \`keyFn\`
     * that extracts a comparison key from each element.
     *
     * @param keyFn - optional function to extract a comparison key from each element
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the unique validator applied
     *
     * @example
     * \`\`\`ts
     * array().unique();
     * array().unique((item) => item.id);
     * array().unique(undefined, 'No duplicates allowed');
     * \`\`\`
     */
    unique(keyFn?: (item: any) => unknown, errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArrayExtReturn<TElementSchema>;
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<ArraySchemaBuilder<TElementSchema, true, undefined, false, ArrayBuiltinExtensions<TElementSchema>>>;
}
/**
 * Extension descriptor that adds common array validators
 * to \`ArraySchemaBuilder\`.
 *
 * Included methods: \`nonempty\`, \`unique\`.
 *
 * @example
 * \`\`\`ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { arrayExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(arrayExtensions);
 * const schema = s.array().nonempty().unique();
 * \`\`\`
 */
export declare const arrayExtensions: import("../extension.js").ExtensionDescriptor<{
    array: {
        /**
         * Validates that the array contains at least one element.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the nonempty validator applied
         *
         * @example
         * \`\`\`ts
         * array().nonempty();
         * array().nonempty('At least one item required');
         * \`\`\`
         */
        nonempty(this: ArraySchemaBuilder<any>, errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArraySchemaBuilder<any, true, undefined, false, {}, any[] | unknown[]>;
        /**
         * Validates that all elements in the array are unique.
         *
         * For primitive elements, uses strict equality. For objects, pass a \`keyFn\`
         * that extracts a comparison key from each element.
         *
         * @param keyFn - optional function to extract a comparison key from each element
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the unique validator applied
         *
         * @example
         * \`\`\`ts
         * array().unique();
         * array().unique((item) => item.id);
         * array().unique(undefined, 'No duplicates allowed');
         * \`\`\`
         */
        unique(this: ArraySchemaBuilder<any>, keyFn?: (item: any) => unknown, errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArraySchemaBuilder<any, true, undefined, false, {}, any[] | unknown[]>;
    };
}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/extensions/index.d.ts": `/**
 * Pre‑wired extension pack for \`@cleverbrush/schema\`.
 *
 * Combines {@link stringExtensions}, {@link numberExtensions},
 * {@link arrayExtensions}, and {@link nullableExtension} via
 * \`withExtensions()\` and re‑exports the augmented factory functions.
 *
 * The default \`@cleverbrush/schema\` entry point re‑exports these
 * augmented factories so that \`email()\`, \`positive()\`, \`nonempty()\`,
 * \`.nullable()\`, etc. are available without any setup.
 *
 * @module
 */
import type { AnySchemaBuilder } from '../builders/AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from '../builders/BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from '../builders/DateSchemaBuilder.js';
import type { FunctionSchemaBuilder } from '../builders/FunctionSchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from '../builders/ObjectSchemaBuilder.js';
import type { RecordSchemaBuilder } from '../builders/RecordSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { TupleSchemaBuilder } from '../builders/TupleSchemaBuilder.js';
import type { UnionSchemaBuilder } from '../builders/UnionSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import type { ArrayBuiltinExtensions } from './array.js';
import type { AnyBuiltinExtensions, BooleanBuiltinExtensions, DateBuiltinExtensions, FuncBuiltinExtensions, ObjectBuiltinExtensions, RecordBuiltinExtensions, TupleBuiltinExtensions, UnionBuiltinExtensions } from './nullable.js';
import type { NumberBuiltinExtensions } from './number.js';
import type { StringBuiltinExtensions } from './string.js';
export { type ArrayBuiltinExtensions, arrayExtensions } from './array.js';
export { type AnyBuiltinExtensions, type BooleanBuiltinExtensions, type DateBuiltinExtensions, type FuncBuiltinExtensions, type NullableMethod, type NullableReturn, nullableExtension, type ObjectBuiltinExtensions, type RecordBuiltinExtensions, type TupleBuiltinExtensions, type UnionBuiltinExtensions } from './nullable.js';
export { type NumberBuiltinExtensions, numberExtensions } from './number.js';
export { type StringBuiltinExtensions, stringExtensions } from './string.js';
/** A \`StringSchemaBuilder\` with built-in extension methods. */
export type ExtendedString<T extends string = string> = StringSchemaBuilder<T, true, false, StringBuiltinExtensions<T>> & StringBuiltinExtensions<T> & HiddenExtensionMethods;
/** A \`NumberSchemaBuilder\` with built-in extension methods. */
export type ExtendedNumber<T extends number = number> = NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>> & NumberBuiltinExtensions<T> & HiddenExtensionMethods;
/** An \`ArraySchemaBuilder\` with built-in extension methods. */
export type ExtendedArray<TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = ArraySchemaBuilder<TElementSchema, true, undefined, false, ArrayBuiltinExtensions<TElementSchema>> & ArrayBuiltinExtensions<TElementSchema> & HiddenExtensionMethods;
/** A \`BooleanSchemaBuilder\` with built-in extension methods. */
export type ExtendedBoolean = BooleanSchemaBuilder<boolean, true, undefined, false, BooleanBuiltinExtensions> & BooleanBuiltinExtensions & HiddenExtensionMethods;
/** A \`DateSchemaBuilder\` with built-in extension methods. */
export type ExtendedDate = DateSchemaBuilder<Date, true, false, DateBuiltinExtensions> & DateBuiltinExtensions & HiddenExtensionMethods;
/** An \`ObjectSchemaBuilder\` with built-in extension methods. */
export type ExtendedObject<TProps extends Record<string, SchemaBuilder<any, any, any>> = {}> = ObjectSchemaBuilder<TProps, true, undefined, false, ObjectBuiltinExtensions<TProps>> & ObjectBuiltinExtensions<TProps> & HiddenExtensionMethods;
/** A \`UnionSchemaBuilder\` with built-in extension methods. */
export type ExtendedUnion<TOptions extends readonly SchemaBuilder<any, any, any>[]> = UnionSchemaBuilder<TOptions, true, undefined, false, UnionBuiltinExtensions> & UnionBuiltinExtensions & HiddenExtensionMethods;
/** A \`FunctionSchemaBuilder\` with built-in extension methods. */
export type ExtendedFunc = FunctionSchemaBuilder<true, undefined, false, FuncBuiltinExtensions> & FuncBuiltinExtensions & HiddenExtensionMethods;
/** An \`AnySchemaBuilder\` with built-in extension methods. */
export type ExtendedAny = AnySchemaBuilder<true, undefined, false, AnyBuiltinExtensions> & AnyBuiltinExtensions & HiddenExtensionMethods;
/** A \`TupleSchemaBuilder\` with built-in extension methods. */
export type ExtendedTuple<TElements extends readonly SchemaBuilder<any, any, any>[] = readonly SchemaBuilder<any, any, any>[]> = TupleSchemaBuilder<TElements, true, undefined, false, TupleBuiltinExtensions<TElements>> & TupleBuiltinExtensions<TElements> & HiddenExtensionMethods;
/** A \`RecordSchemaBuilder\` with built-in extension methods. */
export type ExtendedRecord<TKeySchema extends StringSchemaBuilder<any, any, any, any> = StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = RecordSchemaBuilder<TKeySchema, TValueSchema, true, undefined, false, RecordBuiltinExtensions<TKeySchema, TValueSchema>> & RecordBuiltinExtensions<TKeySchema, TValueSchema> & HiddenExtensionMethods;
export declare const string: {
    (): ExtendedString;
    <T extends string>(equals: T): ExtendedString<T>;
};
export declare const number: {
    (): ExtendedNumber;
    <T extends number>(equals: T): ExtendedNumber<T>;
};
export declare const array: <TElementSchema extends SchemaBuilder<any, any, any>>(elementSchema?: TElementSchema) => ExtendedArray<TElementSchema>;
export declare const boolean: () => ExtendedBoolean;
export declare const date: () => ExtendedDate;
export declare const object: {
    (): ExtendedObject<{}>;
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(props: TProps): ExtendedObject<TProps>;
    <TProps extends Record<string, SchemaBuilder<any, any, any>>>(props?: TProps): ExtendedObject<TProps>;
};
export declare const union: <TOptions extends SchemaBuilder<any, any, any>>(schema: TOptions) => ExtendedUnion<[TOptions]>;
export declare const func: () => ExtendedFunc;
export declare const any: () => ExtendedAny;
export declare const tuple: <const TElements extends readonly SchemaBuilder<any, any, any>[]>(elements: [...TElements]) => ExtendedTuple<TElements>;
export declare const record: <TKeySchema extends StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any>>(keySchema: TKeySchema, valueSchema: TValueSchema) => ExtendedRecord<TKeySchema, TValueSchema>;
`,
    "file:///node_modules/@cleverbrush/schema/extensions/nullable.d.ts": `/**
 * Built-in nullable extension for \`@cleverbrush/schema\`.
 *
 * Provides the \`.nullable()\` convenience method on every schema builder type.
 * It is a shorthand for \`union(schema).or(nul())\` that changes the inferred
 * type from \`T\` to \`T | null\`.
 *
 * This extension is pre-applied in the default \`@cleverbrush/schema\` import.
 * Import from \`@cleverbrush/schema/core\` to get bare builders without it.
 *
 * @module
 */
import type { AnySchemaBuilder } from '../builders/AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from '../builders/BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from '../builders/DateSchemaBuilder.js';
import type { FunctionSchemaBuilder } from '../builders/FunctionSchemaBuilder.js';
import { type NullSchemaBuilder } from '../builders/NullSchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from '../builders/ObjectSchemaBuilder.js';
import type { RecordSchemaBuilder } from '../builders/RecordSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { TupleSchemaBuilder } from '../builders/TupleSchemaBuilder.js';
import { type UnionSchemaBuilder } from '../builders/UnionSchemaBuilder.js';
/**
 * The return type produced by \`.nullable()\` on any schema builder \`TBuilder\`.
 *
 * Wraps the builder in a union with \`NullSchemaBuilder\`, giving the inferred
 * type \`InferType<TBuilder> | null\`.
 */
export type NullableReturn<TBuilder extends SchemaBuilder<any, any, any>> = UnionSchemaBuilder<[TBuilder, NullSchemaBuilder<true>]>;
/**
 * The \`.nullable()\` method added to every built-in schema builder.
 *
 * **WORKAROUND:** This interface duplicates the method signature from
 * \`nullableExtension\` so that JSDoc survives into the published \`.d.ts\`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the \`FixedMethods\` mapped type (conditional \`infer\` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
/** Methods threaded through \`TExtensions\` for \`BooleanSchemaBuilder\`. */
export interface BooleanBuiltinExtensions {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<BooleanSchemaBuilder<boolean, true, undefined, false, BooleanBuiltinExtensions>>;
}
/** Methods threaded through \`TExtensions\` for \`DateSchemaBuilder\`. */
export interface DateBuiltinExtensions {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<DateSchemaBuilder<Date, true, false, DateBuiltinExtensions>>;
}
/** Methods threaded through \`TExtensions\` for \`ObjectSchemaBuilder\`. */
export interface ObjectBuiltinExtensions<TProps extends Record<string, SchemaBuilder<any, any, any>> = {}> {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<ObjectSchemaBuilder<TProps, true, undefined, false, ObjectBuiltinExtensions<TProps>>>;
}
/** Methods threaded through \`TExtensions\` for \`UnionSchemaBuilder\`. */
export interface UnionBuiltinExtensions {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<SchemaBuilder<any, any, any>>;
}
/** Methods threaded through \`TExtensions\` for \`FunctionSchemaBuilder\`. */
export interface FuncBuiltinExtensions {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<FunctionSchemaBuilder<true, undefined, false, FuncBuiltinExtensions>>;
}
/** Methods threaded through \`TExtensions\` for \`AnySchemaBuilder\`. */
export interface AnyBuiltinExtensions {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<AnySchemaBuilder<true, undefined, false, AnyBuiltinExtensions>>;
}
/** Methods threaded through \`TExtensions\` for \`TupleSchemaBuilder\`. */
export interface TupleBuiltinExtensions<TElements extends readonly SchemaBuilder<any, any, any>[] = readonly SchemaBuilder<any, any, any>[]> {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<TupleSchemaBuilder<TElements, true, undefined, false, TupleBuiltinExtensions<TElements>>>;
}
/** Methods threaded through \`TExtensions\` for \`RecordSchemaBuilder\`. */
export interface RecordBuiltinExtensions<TKeySchema extends StringSchemaBuilder<any, any, any, any> = StringSchemaBuilder<any, any, any, any>, TValueSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> {
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<RecordSchemaBuilder<TKeySchema, TValueSchema, true, undefined, false, RecordBuiltinExtensions<TKeySchema, TValueSchema>>>;
}
export interface NullableMethod<TBuilder extends SchemaBuilder<any, any, any>> {
    /**
     * Makes this schema nullable by wrapping it in a union with \`null\`.
     *
     * Shorthand for \`union(schema).or(nul())\`.
     *
     * After calling \`.nullable()\`, the schema accepts the original type **or**
     * \`null\`. The inferred type changes from \`T\` to \`T | null\`. Builder-specific
     * methods (e.g. \`.email()\`, \`.positive()\`) are no longer available on the
     * result — call them before \`.nullable()\`.
     *
     * @returns a \`UnionSchemaBuilder\` that accepts the original type or \`null\`
     *
     * @example
     * \`\`\`ts
     * import { string, number, object, InferType } from '@cleverbrush/schema';
     *
     * // Any builder can be made nullable
     * const name = string().nullable();
     * type Name = InferType<typeof name>; // string | null
     *
     * const age  = number().nullable();
     * type Age  = InferType<typeof age>;  // number | null
     *
     * // Chain validators before .nullable()
     * const email = string().email().nullable();
     * email.validate('user@example.com'); // valid
     * email.validate(null);               // valid
     * email.validate('not-an-email');     // invalid
     *
     * // Useful for optional database columns that can be NULL
     * const UserSchema = object({
     *     name:     string().nonempty(),
     *     bio:      string().nullable(),   // bio can be null
     *     avatarId: number().nullable(),   // FK can be null
     * });
     * \`\`\`
     */
    nullable(): NullableReturn<TBuilder>;
}
/**
 * Extension descriptor that adds \`.nullable()\` to every built-in schema
 * builder type.
 *
 * Included on all nine builders: \`string\`, \`number\`, \`boolean\`, \`date\`,
 * \`object\`, \`array\`, \`union\`, \`func\`, and \`any\`.
 *
 * @example
 * \`\`\`ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { nullableExtension } from '@cleverbrush/schema';
 *
 * const { string: s } = withExtensions(nullableExtension);
 * const schema = s().nullable();
 * \`\`\`
 */
export declare const nullableExtension: import("../extension.js").ExtensionDescriptor<{
    string: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts \`string | null\`
         */
        nullable(this: StringSchemaBuilder): UnionSchemaBuilder<[StringSchemaBuilder<string, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[StringSchemaBuilder<string, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    number: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts \`number | null\`
         */
        nullable(this: NumberSchemaBuilder): UnionSchemaBuilder<[NumberSchemaBuilder<number, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[NumberSchemaBuilder<number, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    boolean: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts \`boolean | null\`
         */
        nullable(this: BooleanSchemaBuilder): UnionSchemaBuilder<[BooleanSchemaBuilder<boolean, true, undefined, false, {}, boolean>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[BooleanSchemaBuilder<boolean, true, undefined, false, {}, boolean>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    date: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts \`Date | null\`
         */
        nullable(this: DateSchemaBuilder): UnionSchemaBuilder<[DateSchemaBuilder<Date, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[DateSchemaBuilder<Date, true, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    object: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts the object type or \`null\`
         */
        nullable(this: ObjectSchemaBuilder): UnionSchemaBuilder<[ObjectSchemaBuilder<{}, true, undefined, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[ObjectSchemaBuilder<{}, true, undefined, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    array: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts the array type or \`null\`
         */
        nullable(this: ArraySchemaBuilder<any>): UnionSchemaBuilder<[ArraySchemaBuilder<any, true, undefined, false, {}, any[] | unknown[]>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[ArraySchemaBuilder<any, true, undefined, false, {}, any[] | unknown[]>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    union: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that includes \`null\` as an option
         */
        nullable(this: UnionSchemaBuilder<any>): UnionSchemaBuilder<[UnionSchemaBuilder<any, true, undefined, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[UnionSchemaBuilder<any, true, undefined, false, {}>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    func: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts a function or \`null\`
         */
        nullable(this: FunctionSchemaBuilder): UnionSchemaBuilder<[FunctionSchemaBuilder<true, undefined, false, {}, (...args: any[]) => any>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[FunctionSchemaBuilder<true, undefined, false, {}, (...args: any[]) => any>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    any: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts any value or \`null\`
         */
        nullable(this: AnySchemaBuilder): UnionSchemaBuilder<[AnySchemaBuilder<true, undefined, false, {}, any>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[AnySchemaBuilder<true, undefined, false, {}, any>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    tuple: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts the tuple type or \`null\`
         */
        nullable(this: TupleSchemaBuilder<any>): UnionSchemaBuilder<[TupleSchemaBuilder<any, true, undefined, false, {}, undefined, any[]>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[TupleSchemaBuilder<any, true, undefined, false, {}, undefined, any[]>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
    record: {
        /**
         * Makes this schema nullable — shorthand for \`union(schema).or(nul())\`.
         *
         * @returns a \`UnionSchemaBuilder\` that accepts the record type or \`null\`
         */
        nullable(this: RecordSchemaBuilder<any, any>): UnionSchemaBuilder<[RecordSchemaBuilder<any, any, true, undefined, false, {}, Record<any, any>>, NullSchemaBuilder<true, undefined, false, {}>], true, undefined, false, {}> | UnionSchemaBuilder<[RecordSchemaBuilder<any, any, true, undefined, false, {}, Record<any, any>>, NullSchemaBuilder<true, undefined, false, {}>], false, undefined, false, {}>;
    };
}>;
`,
    "file:///node_modules/@cleverbrush/schema/extensions/number.d.ts": `/**
 * Built-in number extensions for \`@cleverbrush/schema\`.
 *
 * Provides common number validators: {@link numberExtensions | positive},
 * {@link numberExtensions | negative}, {@link numberExtensions | finite},
 * and {@link numberExtensions | multipleOf}.
 *
 * These are pre-applied in the default \`@cleverbrush/schema\` import.
 * Import from \`@cleverbrush/schema/core\` to get bare builders without these extensions.
 *
 * @module
 */
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import type { NullableMethod, NullableReturn } from './nullable.js';
/** Return type shared by every method on {@link NumberBuiltinExtensions}. */
type NumberExtReturn<T extends number = number> = NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>> & NumberBuiltinExtensions<T> & NullableMethod<NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>>> & HiddenExtensionMethods;
/**
 * Methods added to \`NumberSchemaBuilder\` by the built-in number extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * \`numberExtensions\` so that JSDoc survives into the published \`.d.ts\`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the \`FixedMethods\` mapped type (conditional \`infer\` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface NumberBuiltinExtensions<T extends number = number> {
    /**
     * Validates that the number is strictly greater than zero.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the positive validator applied
     *
     * @example
     * \`\`\`ts
     * number().positive();
     * number().positive('Must be greater than zero');
     * \`\`\`
     */
    positive(errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberExtReturn<T>;
    /**
     * Validates that the number is strictly less than zero.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the negative validator applied
     *
     * @example
     * \`\`\`ts
     * number().negative();
     * number().negative('Must be below zero');
     * \`\`\`
     */
    negative(errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberExtReturn<T>;
    /**
     * Validates that the number is finite (rejects \`Infinity\` and \`-Infinity\`).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the finite validator applied
     *
     * @example
     * \`\`\`ts
     * number().finite();
     * number().finite('No infinities allowed');
     * \`\`\`
     */
    finite(errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberExtReturn<T>;
    /**
     * Validates that the number is an exact multiple of \`n\`.
     *
     * Uses a relative tolerance of \`1e-10\` for float-safe comparison.
     *
     * @param n - the divisor to check against
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the multipleOf validator applied
     *
     * @example
     * \`\`\`ts
     * number().multipleOf(5);
     * number().multipleOf(0.1, 'Must be a multiple of 0.1');
     * \`\`\`
     */
    multipleOf(n: number, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberExtReturn<T>;
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<NumberSchemaBuilder<T, true, false, NumberBuiltinExtensions<T>>>;
}
/**
 * Extension descriptor that adds common number validators
 * to \`NumberSchemaBuilder\`.
 *
 * Included methods: \`positive\`, \`negative\`, \`finite\`, \`multipleOf\`.
 *
 * @example
 * \`\`\`ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { numberExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(numberExtensions);
 * const schema = s.number().positive().multipleOf(5);
 * \`\`\`
 */
export declare const numberExtensions: import("../extension.js").ExtensionDescriptor<{
    number: {
        /**
         * Validates that the number is strictly greater than zero.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the positive validator applied
         *
         * @example
         * \`\`\`ts
         * number().positive();
         * number().positive('Must be greater than zero');
         * \`\`\`
         */
        positive(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, false, {}>;
        /**
         * Validates that the number is strictly less than zero.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the negative validator applied
         *
         * @example
         * \`\`\`ts
         * number().negative();
         * number().negative('Must be below zero');
         * \`\`\`
         */
        negative(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, false, {}>;
        /**
         * Validates that the number is finite (rejects \`Infinity\` and \`-Infinity\`).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the finite validator applied
         *
         * @example
         * \`\`\`ts
         * number().finite();
         * number().finite('No infinities allowed');
         * \`\`\`
         */
        finite(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, false, {}>;
        /**
         * Validates that the number is an exact multiple of \`n\`.
         *
         * Uses a relative tolerance of \`1e-10\` for float-safe comparison.
         *
         * @param n - the divisor to check against
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the multipleOf validator applied
         *
         * @example
         * \`\`\`ts
         * number().multipleOf(5);
         * number().multipleOf(0.1, 'Must be a multiple of 0.1');
         * \`\`\`
         */
        multipleOf(this: NumberSchemaBuilder, n: number, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, false, {}>;
    };
}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/extensions/string.d.ts": `/**
 * Built-in string extensions for \`@cleverbrush/schema\`.
 *
 * Provides common string validators and preprocessors: {@link stringExtensions | email},
 * {@link stringExtensions | url}, {@link stringExtensions | uuid},
 * {@link stringExtensions | ip}, {@link stringExtensions | trim},
 * {@link stringExtensions | toLowerCase}, and {@link stringExtensions | nonempty}.
 *
 * These are pre-applied in the default \`@cleverbrush/schema\` import.
 * Import from \`@cleverbrush/schema/core\` to get bare builders without these extensions.
 *
 * @module
 */
import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import type { NullableMethod, NullableReturn } from './nullable.js';
/** Return type shared by every method on {@link StringBuiltinExtensions}. */
type StringExtReturn<T extends string = string> = StringSchemaBuilder<T, true, false, StringBuiltinExtensions<T>> & StringBuiltinExtensions<T> & NullableMethod<StringSchemaBuilder<T, true, false, StringBuiltinExtensions<T>>> & HiddenExtensionMethods;
/**
 * Methods added to \`StringSchemaBuilder\` by the built-in string extension pack.
 *
 * **WORKAROUND:** This interface duplicates the method signatures from
 * \`stringExtensions\` so that JSDoc survives into the published \`.d.ts\`
 * files. TypeScript strips JSDoc when method signatures are reconstructed
 * through the \`FixedMethods\` mapped type (conditional \`infer\` loses
 * comments). Remove this interface once TypeScript preserves JSDoc
 * through mapped types / conditional type inference.
 *
 * @see https://github.com/microsoft/TypeScript/issues/50715
 */
export interface StringBuiltinExtensions<T extends string = string> {
    /**
     * Validates that the string is a well-formed email address.
     *
     * Uses the pattern \`^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$\` for validation.
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the email validator applied
     *
     * @example
     * \`\`\`ts
     * string().email();
     * string().email('Please enter a valid email');
     * string().email((val) => \`"\${val}" is not a valid email\`);
     * \`\`\`
     */
    email(errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    /**
     * Validates that the string is a well-formed URL.
     *
     * By default only \`http\` and \`https\` protocols are accepted.
     * Pass \`opts.protocols\` to restrict or expand the allowed set.
     *
     * @param opts - optional configuration
     * @param opts.protocols - allowed URL protocols (default: \`['http', 'https']\`)
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the URL validator applied
     *
     * @example
     * \`\`\`ts
     * string().url();
     * string().url({ protocols: ['https'] });
     * string().url('Must be a valid URL');
     * string().url({ protocols: ['https'] }, 'Must be a valid URL');
     * \`\`\`
     */
    url(errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    url(opts?: {
        protocols?: string[];
    }, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    /**
     * Validates that the string is a valid UUID (versions 1–5).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the UUID validator applied
     *
     * @example
     * \`\`\`ts
     * string().uuid();
     * string().uuid('Invalid identifier');
     * \`\`\`
     */
    uuid(errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    /**
     * Validates that the string is a valid IP address (IPv4 or IPv6).
     *
     * Pass \`opts.version\` to restrict validation to a specific IP version.
     *
     * @param opts - optional configuration
     * @param opts.version - restrict to \`'v4'\` or \`'v6'\` (default: accept both)
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the IP validator applied
     *
     * @example
     * \`\`\`ts
     * string().ip();
     * string().ip({ version: 'v4' });
     * string().ip(undefined, 'Bad IP address');
     * \`\`\`
     */
    ip(opts?: {
        version?: 'v4' | 'v6';
    }, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    /**
     * Preprocessor that trims leading and trailing whitespace before validation.
     *
     * @returns a new schema builder with the trim preprocessor applied
     *
     * @example
     * \`\`\`ts
     * string().trim().minLength(1); // '  hi  ' → 'hi'
     * \`\`\`
     */
    trim(): StringExtReturn<T>;
    /**
     * Preprocessor that converts the string to lowercase before validation.
     *
     * @returns a new schema builder with the toLowerCase preprocessor applied
     *
     * @example
     * \`\`\`ts
     * string().toLowerCase(); // 'HELLO' → 'hello'
     * \`\`\`
     */
    toLowerCase(): StringExtReturn<T>;
    /**
     * Validates that the string is not empty (length > 0).
     *
     * @param errorMessage - custom error message or function to generate one
     * @returns a new schema builder with the nonempty validator applied
     *
     * @example
     * \`\`\`ts
     * string().nonempty();
     * string().nonempty('Name is required');
     * \`\`\`
     */
    nonempty(errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringExtReturn<T>;
    /** Makes this schema nullable — shorthand for \`union(schema).or(nul())\`. */
    nullable(): NullableReturn<StringSchemaBuilder<T, true, false, StringBuiltinExtensions<T>>>;
}
/**
 * Extension descriptor that adds common string validators and preprocessors
 * to \`StringSchemaBuilder\`.
 *
 * Included methods: \`email\`, \`url\`, \`uuid\`, \`ip\`, \`trim\`, \`toLowerCase\`, \`nonempty\`.
 *
 * @example
 * \`\`\`ts
 * import { withExtensions } from '@cleverbrush/schema/core';
 * import { stringExtensions } from '@cleverbrush/schema';
 *
 * const s = withExtensions(stringExtensions);
 * const schema = s.string().email().trim();
 * \`\`\`
 */
export declare const stringExtensions: import("../extension.js").ExtensionDescriptor<{
    string: {
        /**
         * Validates that the string is a well-formed email address.
         *
         * Uses the pattern \`^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$\` for validation.
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the email validator applied
         *
         * @example
         * \`\`\`ts
         * string().email();
         * string().email('Please enter a valid email');
         * string().email((val) => \`"\${val}" is not a valid email\`);
         * \`\`\`
         */
        email(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Validates that the string is a well-formed URL.
         *
         * By default only \`http\` and \`https\` protocols are accepted.
         * Pass \`opts.protocols\` to restrict or expand the allowed set.
         *
         * @param opts - optional configuration
         * @param opts.protocols - allowed URL protocols (default: \`['http', 'https']\`)
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the URL validator applied
         *
         * @example
         * \`\`\`ts
         * string().url();
         * string().url({ protocols: ['https'] });
         * string().url('Must be a valid URL');
         * string().url({ protocols: ['https'] }, 'Must be a valid URL');
         * \`\`\`
         */
        url(this: StringSchemaBuilder, optsOrError?: {
            protocols?: string[];
        } | ValidationErrorMessageProvider<StringSchemaBuilder>, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Validates that the string is a valid UUID (versions 1–5).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the UUID validator applied
         *
         * @example
         * \`\`\`ts
         * string().uuid();
         * string().uuid('Invalid identifier');
         * \`\`\`
         */
        uuid(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Validates that the string is a valid IP address (IPv4 or IPv6).
         *
         * Pass \`opts.version\` to restrict validation to a specific IP version.
         *
         * @param opts - optional configuration
         * @param opts.version - restrict to \`'v4'\` or \`'v6'\` (default: accept both)
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the IP validator applied
         *
         * @example
         * \`\`\`ts
         * string().ip();
         * string().ip({ version: 'v4' });
         * string().ip(undefined, 'Bad IP address');
         * \`\`\`
         */
        ip(this: StringSchemaBuilder, opts?: {
            version?: "v4" | "v6";
        }, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Preprocessor that trims leading and trailing whitespace before validation.
         *
         * @returns a new schema builder with the trim preprocessor applied
         *
         * @example
         * \`\`\`ts
         * string().trim().minLength(1); // '  hi  ' → 'hi'
         * \`\`\`
         */
        trim(this: StringSchemaBuilder): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Preprocessor that converts the string to lowercase before validation.
         *
         * @returns a new schema builder with the toLowerCase preprocessor applied
         *
         * @example
         * \`\`\`ts
         * string().toLowerCase(); // 'HELLO' → 'hello'
         * \`\`\`
         */
        toLowerCase(this: StringSchemaBuilder): StringSchemaBuilder<string, true, false, {}>;
        /**
         * Validates that the string is not empty (length > 0).
         *
         * @param errorMessage - custom error message or function to generate one
         * @returns a new schema builder with the nonempty validator applied
         *
         * @example
         * \`\`\`ts
         * string().nonempty();
         * string().nonempty('Name is required');
         * \`\`\`
         */
        nonempty(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, false, {}>;
    };
}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/extensions/util.d.ts": `import type { ValidationErrorMessageProvider } from '../builders/SchemaBuilder.js';
/** Validation result returned by validators on failure. */
interface ValidationFailure {
    valid: false;
    errors: {
        message: string;
    }[];
}
/**
 * Builds a synchronous validation-failure result, resolving the user-supplied
 * error-message provider (or falling back to \`defaultMsg\`).
 *
 * @param provider - custom error message provider (string, sync function, or \`undefined\`)
 * @param defaultMsg - fallback message used when \`provider\` is \`undefined\`
 * @param value - the value that failed validation
 * @param schema - the schema builder instance
 * @returns a \`{ valid: false, errors: [{ message }] }\` object
 */
export declare function validationFail(provider: ValidationErrorMessageProvider<any> | undefined, defaultMsg: string, value: unknown, schema: unknown): ValidationFailure;
/**
 * Synchronously resolves a {@link ValidationErrorMessageProvider} to a concrete error message string.
 * Returns the default message when no custom provider is supplied.
 * Throws if the provider function returns a Promise.
 *
 * @param provider - custom error message provider (string, sync function, or \`undefined\`)
 * @param defaultMsg - fallback message used when \`provider\` is \`undefined\`
 * @param value - the value that failed validation (passed to function providers)
 * @param schema - the schema builder instance (passed to function providers)
 * @returns the resolved error message string
 * @throws Error if the provider returns a Promise
 */
export declare function resolveErrorMessage(provider: ValidationErrorMessageProvider<any> | undefined, defaultMsg: string, value: unknown, schema: unknown): string;
/**
 * Asynchronously resolves a {@link ValidationErrorMessageProvider} to a concrete error message string.
 * Returns the default message when no custom provider is supplied.
 * Supports async provider functions.
 *
 * @param provider - custom error message provider (string, function, or \`undefined\`)
 * @param defaultMsg - fallback message used when \`provider\` is \`undefined\`
 * @param value - the value that failed validation (passed to function providers)
 * @param schema - the schema builder instance (passed to function providers)
 * @returns the resolved error message string
 */
export declare function resolveErrorMessageAsync(provider: ValidationErrorMessageProvider<any> | undefined, defaultMsg: string, value: unknown, schema: unknown): Promise<string>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/index.d.ts": `export { LazySchemaBuilder, lazy } from './builders/LazySchemaBuilder.js';
export type { RecordSchemaValidationResult } from './builders/RecordSchemaBuilder.js';
export { RecordSchemaBuilder } from './builders/RecordSchemaBuilder.js';
export type { TupleElementValidationResults, TupleSchemaValidationResult } from './builders/TupleSchemaBuilder.js';
export { TupleSchemaBuilder } from './builders/TupleSchemaBuilder.js';
export * from './core.js';
export { type AnyBuiltinExtensions, type ArrayBuiltinExtensions, any, array, arrayExtensions, type BooleanBuiltinExtensions, boolean, type DateBuiltinExtensions, date, type ExtendedAny, type ExtendedArray, type ExtendedBoolean, type ExtendedDate, type ExtendedFunc, type ExtendedNumber, type ExtendedObject, type ExtendedRecord, type ExtendedString, type ExtendedTuple, type ExtendedUnion, type FuncBuiltinExtensions, func, type NullableMethod, type NullableReturn, type NumberBuiltinExtensions, nullableExtension, number, numberExtensions, type ObjectBuiltinExtensions, object, type RecordBuiltinExtensions, record, type StringBuiltinExtensions, string, stringExtensions, type TupleBuiltinExtensions, tuple, type UnionBuiltinExtensions, union } from './extensions/index.js';
`,
    "file:///node_modules/@cleverbrush/schema/utils/transaction.d.ts": `/**
 * Options for customizing transaction behavior.
 */
export type TransactionOptions = {
    /**
     * An optional callback returning boolean. Called for every
     * nested object's property (recursively) which is not
     * null \`Object\`. Using this function you can define if \`child\`
     * should be wrapped with transaction. It is useful for
     * some cases like Error, Map, etc. when you want to preserve a link,
     * instead of creation of the new transaction.
     * By default it's filtering all instances inheriting from Error and RegExp
     * If \`true\` is returned from this function \`child\` will not be wrapped with
     * nested transaction object.
     */
    shouldNotWrapWithTransaction?: (child: any) => boolean;
};
/**
 * A transaction wrapper around an object. Provides copy-on-write semantics:
 * modifications to \`object\` are isolated from the original until \`commit()\` is called.
 * Use \`rollback()\` to discard changes, and \`isDirty()\` to check for pending modifications.
 */
export type Transaction<T> = {
    /**
     * Transaction object you can modify (equals to \`initial\` right after the call).
     * All changes to \`object\` will not be reflected to \`initial\` until \`commit\`
     * is called.
     */
    object: T;
    /**
     * Commits transaction, all changes to \`object\` will be reflected to \`initial\`
     * after the call of this function.
     */
    commit: () => T;
    /**
     * Rollbacks transaction moving it to the initial state (\`object\` will be equal to \`initial\`
     * after the call of this function).
     */
    rollback: () => T;
    /**
     * Returns \`true\` if there are any changes to \`object\` which make it different from \`initial\`.
     */
    isDirty: () => boolean;
};
/**
 * Starts a transaction over the \`initial\` object. The returned \`object\` is a
 * proxy (for plain objects) or a shallow copy (for arrays) that tracks mutations
 * without modifying \`initial\`. Call \`commit()\` to apply or \`rollback()\` to discard changes.
 *
 * @param initial - the object or array to wrap in a transaction
 * @param options - optional configuration to control which nested values are wrapped
 * @returns a {@link Transaction} with \`object\`, \`commit\`, \`rollback\`, and \`isDirty\` members
 */
export declare const transaction: <T extends {}>(initial: T, options?: TransactionOptions) => Transaction<T>;
/**
 * Creates a lightweight no-op transaction that wraps the \`initial\` value
 * without any Proxy or copy-on-write overhead.  \`commit()\` and \`rollback()\`
 * simply return the original object, and \`isDirty()\` is always \`false\`.
 *
 * Use this when no preprocessors or validators are defined — there is no
 * risk of mutation, so the full transaction machinery can be skipped.
 */
export declare const noopTransaction: <T extends {}>(initial: T) => Transaction<T>;
/**
 * Checks if \`obj\` is an instance of a transaction.
 * @param obj object to check if it's a transaction
 * @returns \`true\` if \`obj\` is a transaction, \`false\` otherwise
 */
export declare const isTransaction: (obj: any) => any;
`,
};
