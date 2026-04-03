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
export declare class AnySchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}, TResult = TExplicitType extends undefined ? any : TExplicitType> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: AnySchemaBuilderCreateProps<any>): AnySchemaBuilder<true, undefined, {}, any>;
    protected constructor(props: AnySchemaBuilderCreateProps<TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): AnySchemaBuilder<true, T, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): AnySchemaBuilder<TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: AnySchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): AnySchemaBuilder<true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): AnySchemaBuilder<false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): AnySchemaBuilder<TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
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
export type ElementValidationResult<TElementSchema extends SchemaBuilder<any, any, any>> = TElementSchema extends UnionSchemaBuilder<infer UOptions extends readonly SchemaBuilder<any, any, any>[], any, any> ? UnionSchemaValidationResult<InferType<TElementSchema>, UOptions> : TElementSchema extends ObjectSchemaBuilder<any, any, any, any> ? ObjectSchemaValidationResult<InferType<TElementSchema>, TElementSchema> : ValidationResult<InferType<TElementSchema>>;
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
export declare class ArraySchemaBuilder<TElementSchema extends SchemaBuilder<any, any, any>, TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}, TResult = TExplicitType extends undefined ? TElementSchema extends undefined ? Array<any> : TElementSchema extends SchemaBuilder<infer T1, infer T2> ? Array<InferType<SchemaBuilder<T1, T2>>> : never : TExplicitType> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: ArraySchemaBuilderCreateProps<any, any>): ArraySchemaBuilder<SchemaBuilder<any, any, any>, true, undefined, {}, any[]>;
    protected constructor(props: ArraySchemaBuilderCreateProps<TElementSchema, TRequired>);
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): ArraySchemaBuilder<TElementSchema, true, T, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): ArraySchemaBuilder<TElementSchema, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ArraySchemaValidationResult<TResult, TElementSchema>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ArraySchemaValidationResult<TResult, TElementSchema>>;
    /**
     * @hidden
     */
    protected createFromProps<TReq extends boolean>(props: ArraySchemaBuilderCreateProps<TElementSchema, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): ArraySchemaBuilder<TElementSchema, true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): ArraySchemaBuilder<TElementSchema, false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): ArraySchemaBuilder<TElementSchema, TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
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
        minLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, {}, TExplicitType extends undefined ? TElementSchema extends undefined ? any[] : TElementSchema extends SchemaBuilder<infer T1, infer T2 extends boolean, {}> ? (T2 extends true ? T1 : T1 | undefined)[] : never : TExplicitType>>;
        /**
         * Max length of a valid array
         */
        maxLength: number | undefined;
        /**
         * Max length validation error message provider.
         * If not provided, default error message provider is used.
         */
        maxLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, {}, TExplicitType extends undefined ? TElementSchema extends undefined ? any[] : TElementSchema extends SchemaBuilder<infer T1, infer T2 extends boolean, {}> ? (T2 extends true ? T1 : T1 | undefined)[] : never : TExplicitType>>;
        type: string;
        isRequired: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * Set a schema that every array item has to satisfy. If it is not set,
     * Item of any type is allowed.
     * @param schema Schema that every array item has to satisfy
     */
    of<TSchema extends SchemaBuilder<any, any, any>>(schema: TSchema): ArraySchemaBuilder<TSchema, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Clears the element schema set by \`of()\`. After this call,
     * array items of any type will be accepted.
     */
    clearOf(): ArraySchemaBuilder<any, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Set minimal length of the valid array value for schema.
     */
    minLength<T extends number>(length: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>>): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Clear minimal length of the valid array value for schema.
     */
    clearMinLength(): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Set max length of the valid array value for schema.
     */
    maxLength<T extends number>(length: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType>>): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Clear max length of the valid array value for schema.
     */
    clearMaxLength(): ArraySchemaBuilder<TElementSchema, TRequired, TExplicitType, TExtensions> & TExtensions;
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
export declare class BooleanSchemaBuilder<TResult = boolean, TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}, TFinalResult = TExplicitType extends undefined ? TResult : TExplicitType> extends SchemaBuilder<TFinalResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: BooleanSchemaBuilderCreateProps<any>): BooleanSchemaBuilder<boolean, any, undefined, {}, boolean>;
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
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<BooleanSchemaBuilder<TResult, TRequired, undefined, {}, TResult>>;
        type: string;
        isRequired: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TFinalResult>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TFinalResult>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): BooleanSchemaBuilder<TResult, true, T, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): BooleanSchemaBuilder<TResult, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: BooleanSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): BooleanSchemaBuilder<TResult, true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): BooleanSchemaBuilder<TResult, false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): BooleanSchemaBuilder<TResult, TRequired, TFinalResult & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
    /**
     * Restricts object to be equal to \`value\`.
     */
    equals<T extends boolean>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<BooleanSchemaBuilder<TResult, TRequired>>): BooleanSchemaBuilder<T, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Removes a \`value\` defined by \`equals()\` call.
     */
    clearEquals(): BooleanSchemaBuilder<boolean, TRequired, TExplicitType, TExtensions> & TExtensions;
}
/**
 * Creates a \`boolean\` schema.
 */
export declare const boolean: () => BooleanSchemaBuilder<boolean, true>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/builders/DateSchemaBuilder.d.ts": `import { type BRAND, type PreprocessorEntry, SchemaBuilder, type ValidationContext, type ValidationErrorMessageProvider, type ValidationResult, type ValidatorEntry } from './SchemaBuilder.js';
type DateSchemaBuilderCreateProps<T = Date, R extends boolean = true> = Partial<ReturnType<DateSchemaBuilder<T, R>['introspect']>>;
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
export declare class DateSchemaBuilder<TResult = Date, TRequired extends boolean = true, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: DateSchemaBuilderCreateProps): DateSchemaBuilder<Date, true, {}>;
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
        minValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Max valid value (if defined).
         */
        max: Date | undefined;
        /**
         * Max value validation error message provider.
         * If not provided, default error message will be used.
         */
        maxValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Make sure that date is in future. \`false\` by default.
         */
        ensureIsInFuture: boolean;
        /**
         * Ensure in future validation error message provider.
         * If not provided, default error message will be used.
         */
        ensureIsInFutureValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Make sure that date is in past. \`false\` by default.
         */
        ensureIsInPast: boolean;
        /**
         * Ensure in past validation error message provider.
         * If not provided, default error message will be used.
         */
        ensureIsInPastValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict date to be equal to a certain value.
         */
        equalsTo: Date | undefined;
        /**
         * Equals to validation error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired, {}>>;
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
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): DateSchemaBuilder<T, true, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): DateSchemaBuilder<Date, TRequired, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of Date schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of Date schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
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
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<T, TRequired, TExtensions> & TExtensions;
    /**
     * Clears \`equals()\` call.
     */
    clearEquals(): DateSchemaBuilder<Date, TRequired, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): DateSchemaBuilder<TResult, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): DateSchemaBuilder<TResult, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): DateSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, TExtensions> & TExtensions;
    /**
     * Accept only dates in the future.
     */
    isInFuture(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`isInFuture()\` call.
     */
    clearIsInFuture(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Accept only dates in the past.
     */
    isInPast(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`isInPast()\` call.
     */
    clearIsInPast(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Set minimal valid Date value for schema.
     */
    min(minValue: Date, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`min()\` call.
     */
    clearMin(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Set maximal valid Date value for schema.
     */
    max(maxValue: Date, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<DateSchemaBuilder<TResult, TRequired>>): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`max()\` call.
     */
    clearMax(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Accepts JSON string as a valid Date.
     * String must be in ISO format and will be parsed using \`JSON.parse()\`.
     */
    acceptJsonString(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`acceptJsonString()\` call.
     */
    doNotAcceptJsonString(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Accepts epoch number as a valid Date.
     * Epoch number will be parsed using \`new Date(epoch)\`.
     */
    acceptEpoch(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`acceptEpoch()\` call.
     */
    doNotAcceptEpoch(): DateSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
}
/**
 * Creates a Date schema.
 */
export declare const date: () => DateSchemaBuilder<Date, true, {}>;
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
export declare class FunctionSchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}, TResult = TExplicitType extends undefined ? (...args: any[]) => any : TExplicitType> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: FunctionSchemaBuilderCreateProps<any>): FunctionSchemaBuilder<true, undefined, {}, (...args: any[]) => any>;
    protected constructor(props: FunctionSchemaBuilderCreateProps<TRequired>);
    /**
     * @hidden
     */
    hasType<T>(_notUsed?: T): FunctionSchemaBuilder<true, T, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearHasType(): FunctionSchemaBuilder<TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of the schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<TReq extends boolean>(props: FunctionSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): FunctionSchemaBuilder<true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): FunctionSchemaBuilder<false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): FunctionSchemaBuilder<TRequired, TResult & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
}
/**
 * Creates a \`function\` schema.
 * @returns {@link FunctionSchemaBuilder}
 */
export declare const func: () => FunctionSchemaBuilder<true>;
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
export declare class NullSchemaBuilder<TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}> extends SchemaBuilder<null, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: NullSchemaBuilderCreateProps<any>): NullSchemaBuilder<true, undefined, {}>;
    protected constructor(props: NullSchemaBuilderCreateProps<TRequired>);
    /**
     * @hidden
     */
    hasType<T>(_notUsed?: T): NullSchemaBuilder<true, T, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    clearHasType(): NullSchemaBuilder<TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the schema over \`object\`.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: null, _context?: ValidationContext): ValidationResult<null>;
    /**
     * Performs async validation of the schema over \`object\`.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: null, _context?: ValidationContext): Promise<ValidationResult<null>>;
    protected createFromProps<TReq extends boolean>(props: NullSchemaBuilderCreateProps<TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): NullSchemaBuilder<true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): NullSchemaBuilder<false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): NullSchemaBuilder<TRequired, null & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
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
type NumberSchemaBuilderCreateProps<T = number, R extends boolean = true> = Partial<ReturnType<NumberSchemaBuilder<T, R>['introspect']>>;
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
export declare class NumberSchemaBuilder<TResult = number, TRequired extends boolean = true, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: NumberSchemaBuilderCreateProps): NumberSchemaBuilder<number, true, {}>;
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
        minValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Max valid value (if defined).
         */
        max: number | undefined;
        /**
         * Max valid value error message provider.
         * If not provided, default error message will be used.
         */
        maxValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Make sure that object is not \`NaN\`. \`true\` by default.
         */
        ensureNotNaN: boolean;
        /**
         * EnsureNotNaN error message provider.
         * If not provided, default error message will be used.
         */
        ensureNotNaNErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Make sure that object is not different kinds of \`infinity\`. \`true\` by default.
         */
        ensureIsFinite: boolean;
        /**
         * EnsureIsFinite error message provider.
         */
        ensureIsFiniteErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict object to be equal to a certain value.
         */
        equalsTo: number | undefined;
        /**
         * EqualsTo error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Allow only integer values (floating point values will be rejected
         * as invalid)
         */
        isInteger: boolean;
        /**
         * EnsureIsInteger error message provider.
         */
        ensureIsIntegerErrorMessageProvider: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired, {}>>;
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
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): NumberSchemaBuilder<T, true, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): NumberSchemaBuilder<number, TRequired, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of number schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of number schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<T, TReq extends boolean>(props: NumberSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * Restricts number to be equal to \`value\`.
     */
    equals<T extends number>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<T, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`equals()\` call.
     */
    clearEquals(): NumberSchemaBuilder<number, TRequired, TExtensions> & TExtensions;
    /**
     * @deprecated Use {@link clearIsInteger} instead.
     * Float values will be considered as valid after this call.
     */
    isFloat(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`isInteger()\` call.
     */
    clearIsInteger(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Only integer values will be considered as valid after this call.
     */
    isInteger(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): NumberSchemaBuilder<TResult, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): NumberSchemaBuilder<TResult, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): NumberSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, TExtensions> & TExtensions;
    /**
     * Do not accept NaN value
     */
    notNaN(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Consider NaN value as valid
     */
    canBeNaN(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Do not accept \`Infinity\`.
     */
    isFinite(
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Consider \`Infinity\` as valid.
     */
    canBeInfinite(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Restrict number to be at least \`minValue\`.
     */
    min(minValue: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`min()\` call.
     */
    clearMin(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Restrict number to be no more than \`maxValue\`.
     */
    max(maxValue: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder<TResult, TRequired>>): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Clear \`max()\` call.
     */
    clearMax(): NumberSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
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
export type SchemaPropertySelector<TSchema extends ObjectSchemaBuilder<any, any, any, any>, TPropertySchema extends SchemaBuilder<any, any, any>, TAssignableTo = any, TParentPropertyDescriptor = undefined> = (l: PropertyDescriptorTree<TSchema, TSchema, TAssignableTo>) => PropertyDescriptor<TSchema, TPropertySchema, TParentPropertyDescriptor>;
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
type MakeChildrenRequired<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['required']>;
};
type MakeChildrenOptional<T extends Record<string, SchemaBuilder<any, any, any>>> = {
    [K in keyof T]: ReturnType<T[K]['optional']>;
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
export type ObjectSchemaValidationResult<T, TRootSchema extends ObjectSchemaBuilder<any, any, any, any>, TSchema extends ObjectSchemaBuilder<any, any, any, any> = TRootSchema> = Omit<ValidationResult<T>, 'errors'> & {
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
    getErrorsFor<TPropertySchema, TParentPropertyDescriptor>(selector?: (properties: PropertyDescriptorTree<TSchema, TRootSchema>) => PropertyDescriptor<TRootSchema, TPropertySchema, TParentPropertyDescriptor>): TPropertySchema extends ObjectSchemaBuilder<any, any, any, any> ? PropertyValidationResult<TPropertySchema, TRootSchema, TParentPropertyDescriptor> : NestedValidationResult<TPropertySchema, TRootSchema, TParentPropertyDescriptor>;
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
export declare class ObjectSchemaBuilder<TProperties extends Record<string, SchemaBuilder<any, any, any>> = {}, TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}> extends SchemaBuilder<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create<P extends Record<string, SchemaBuilder>, R extends boolean>(props: ObjectSchemaBuilderCreateProps<P, R>): ObjectSchemaBuilder<{}, true, undefined, {}>;
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
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): ObjectSchemaBuilder<TProperties, true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): ObjectSchemaBuilder<TProperties, false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): ObjectSchemaBuilder<TProperties, TRequired, (undefined extends TExplicitType ? RespectPropsOptionality<TProperties> : TExplicitType) & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
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
    validate(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>;
    /**
     * Performs async validation of object schema over the \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     *
     * @param object The object to validate against this schema.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, context?: ValidationContext<this>): Promise<ObjectSchemaValidationResult<undefined extends TExplicitType ? InferType<SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired>> : TExplicitType, this>>;
    /**
     * Fields not defined in \`properties\` will not be validated
     * and will be passed through the validation.
     */
    acceptUnknownProps(): ObjectSchemaBuilder<TProperties, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Fields not defined in \`properties\` will be considered
     * as schema violation. This is the default behavior.
     */
    notAcceptUnknownProps(): ObjectSchemaBuilder<TProperties, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): ObjectSchemaBuilder<TProperties, TRequired, T, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): ObjectSchemaBuilder<TProperties, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Adds a new property to the object schema. The new property
     * will be validated according to the provided schema.
     * @param propName name of the new property
     * @param schema schema builder of the new property
     */
    addProp<TType extends SchemaBuilder<any, any, any>, TName extends string>(propName: TName, schema: TType): ObjectSchemaBuilder<TProperties & {
        [k in TName]: TType;
    }, TRequired, TExplicitType, TExtensions> & TExtensions;
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
    optimize(): SchemaBuilder<undefined extends TExplicitType ? Id<RespectPropsOptionality<TProperties>> : TExplicitType, TRequired, TExtensions>;
    /**
     * Adds new properties to the object schema. The same as \`.addProp()\` but
     * allows to add multiple properties with one call. The new properties
     * will be validated according to the provided schemas.
     * @param props a key/schema object map.
     */
    addProps<TProps extends Record<string, SchemaBuilder<any, any, any>>>(props: TProps): ObjectSchemaBuilder<TProperties & TProps, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Adds all properties from the \`schema\` object schema to the current schema.
     * @param schema an instance of \`ObjectSchemaBuilder\`
     */
    addProps<K extends ObjectSchemaBuilder<any, any, any, any>>(schema: K): K extends ObjectSchemaBuilder<infer TProp, infer _, infer __> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProp> & TProp, TRequired, TExplicitType, TExtensions> & TExtensions : never;
    /**
     * Omits properties listed in \`properties\` from the schema.
     * Consider \`Omit<Type, 'prop1'|'prop2'...>\` as a good illustration
     * from the TS world.
     * @param properties - array of property names (strings) to remove from the schema.
     */
    omit<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Omit<TProperties, K>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Removes \`propName\` from the list of properties.
     * @param propName property name to remove. Schema should contain
     * this property. An error will be thrown otherwise.
     */
    omit<TProperty extends keyof TProperties>(propName: TProperty): ObjectSchemaBuilder<Omit<TProperties, TProperty>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Removes all properties of \`schema\` from the current schema.
     * \`Omit<TSchema, keyof TAnotherSchema>\` as a good illustration
     * from the TS world.
     * @param schema schema builder to take properties from.
     */
    omit<T>(schema: T): T extends ObjectSchemaBuilder<infer TProps, infer TRequired, infer TExplicitType> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProps>, TRequired, TExplicitType, TExtensions> & TExtensions : never;
    /**
     * Adds all properties from \`schema\` to the current schema.
     * \`TSchema & TAnotherSchema\` is a good example of the similar concept
     * in the TS type system.
     * @param schema an object schema to take properties from
     */
    intersect<T extends ObjectSchemaBuilder<any, any, any, any>>(schema: T): T extends ObjectSchemaBuilder<infer TProps, infer _, infer TExplType> ? ObjectSchemaBuilder<Omit<TProperties, keyof TProps> & TProps, TRequired, TExplType, TExtensions> & TExtensions : never;
    /**
     * Marks all properties in the current schema as optional.
     * It is the same as call \`.optional('propname')\` where \`propname\` is the name
     * of every property in the schema.
     */
    partial(): ObjectSchemaBuilder<MakeChildrenOptional<TProperties>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Marks all properties from \`properties\` as optional in the schema.
     * @param properties list of property names (string) to make optional
     */
    partial<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Omit<TProperties, K> & Pick<MakeChildrenOptional<TProperties>, K>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Marks property \`propName\` as optional in the schema.
     * @param propName the name of the property (string).
     */
    partial<TProperty extends keyof TProperties>(propName: TProperty): ObjectSchemaBuilder<Omit<TProperties, TProperty> & Pick<MakeChildrenOptional<TProperties>, TProperty>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Returns a new schema containing only properties listed in
     * \`properties\` array.
     * @param properties array of property names (strings)
     */
    pick<K extends keyof TProperties>(properties: K[]): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Returns new schema based on the current schema. This new schema
     * will consists only from properties which names are taken from the
     * \`schema\` object schema.
     * @param schema schema to take property names list from
     */
    pick<K extends ObjectSchemaBuilder<any, any, any, any>>(schema: K): K extends ObjectSchemaBuilder<infer TProps, infer _, infer __> ? ObjectSchemaBuilder<Omit<TProperties, keyof Omit<TProperties, keyof TProps>>, TRequired, undefined, TExtensions> & TExtensions : never;
    /**
     * Returns a new schema consisting of only one property
     * (taken from the \`property\` property name). If the property
     * does not exists in the current schema, an error will be thrown.
     * @param property the name of the property (string).
     */
    pick<K extends keyof TProperties>(property: K): ObjectSchemaBuilder<Pick<TProperties, K>, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Modify schema for \`propName\` and return a new schema.
     * Could be useful if you want to leave all schema intact, but
     * change a type of one property.
     * @param propName name of the property (string)
     * @param callback callback function returning a new schema fo the \`propName\`. As a first parameter
     * you will receive an old schema for \`propName\`.
     * @returns
     */
    modifyPropSchema<K extends keyof TProperties, R extends SchemaBuilder<any, any, any>>(propName: K, callback: (builder: TProperties[K]) => R): ObjectSchemaBuilder<ModifyPropSchema<TProperties, K, R>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * An alias for \`.partial(prop: string)\`
     * @param prop name of the property
     */
    makePropOptional<K extends keyof TProperties>(prop: K): ObjectSchemaBuilder<MakeChildOptional<TProperties, K>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Marks \`prop\` as required property.
     * If \`prop\` does not exists in the current schema,
     * an error will be thrown.
     * @param prop name of the property
     */
    makePropRequired<K extends keyof TProperties>(prop: K): ObjectSchemaBuilder<MakeChildRequired<TProperties, K>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * \`Partial<T>\` would be a good example of the
     * same operation in the TS world.
     */
    makeAllPropsOptional(): ObjectSchemaBuilder<MakeChildrenOptional<TProperties>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * \`Required<T>\` would be a good example of the
     * same operation in the TS world.
     */
    makeAllPropsRequired(): ObjectSchemaBuilder<MakeChildrenRequired<TProperties>, TRequired, TExplicitType, TExtensions> & TExtensions;
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
    [k in keyof T as T[k] extends SchemaBuilder<infer _, infer TReq> ? TReq extends true ? k : never : never]: T[k];
};
type NotRequiredProps<T extends Record<string, SchemaBuilder<any, any, any>>> = keyof {
    [k in keyof T as T[k] extends SchemaBuilder<infer _, infer TReq> ? TReq extends true ? never : k : never]: T[k];
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
export declare class PropertyValidationResult<TSchema extends ObjectSchemaBuilder<any, any, any, any> = ObjectSchemaBuilder<any, any, any, any>, TRootSchema extends ObjectSchemaBuilder<any, any, any, any> = ObjectSchemaBuilder<any, any, any, any>, TParentPropertyDescriptor = any> implements NestedValidationResult<TSchema, TRootSchema, TParentPropertyDescriptor> {
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
    "file:///node_modules/@cleverbrush/schema/builders/SchemaBuilder.d.ts": `import { type Transaction } from '../utils/transaction.js';
import type { ArraySchemaBuilder } from './ArraySchemaBuilder.js';
import type { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
/** @internal Symbol used as the key for the type brand on schema builders. */
declare const __type: unique symbol;
/** @internal */
export type SchemaTypeBrand = typeof __type;
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
export type NestedValidationResult<TSchema, TRootSchema extends ObjectSchemaBuilder<any, any, any, any>, TParentPropertyDescriptor> = {
    /**
     * Value that property had and which caused error or errors
     */
    seenValue?: InferType<TSchema>;
    /**
     * A list of errors, empty if object satisfies a schema
     */
    errors: ReadonlyArray<string>;
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
    preprocessors: PreprocessorEntry<T>[];
    validators: ValidatorEntry<T>[];
    requiredValidationErrorMessageProvider?: ValidationErrorMessageProvider;
    extensions?: Record<string, unknown>;
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
export type PropertyDescriptorInner<TSchema extends ObjectSchemaBuilder<any, any, any, any>, TPropertySchema, TParentPropertyDescriptor> = {
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
export type PropertyDescriptor<TRootSchema extends ObjectSchemaBuilder<any, any, any, any>, TPropertySchema, TParentPropertyDescriptor> = {
    [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: PropertyDescriptorInner<TRootSchema, TPropertySchema, TParentPropertyDescriptor>;
};
/**
 * A tree of property descriptors for the schema.
 * Has a possibility to filter properties by the type (\`TAssignableTo\` type parameter).
 */
export type PropertyDescriptorTree<TSchema extends ObjectSchemaBuilder<any, any, any, any>, TRootSchema extends ObjectSchemaBuilder<any, any, any, any> = TSchema, TAssignableTo = any, TParentPropertyDescriptor = undefined> = PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor> & (TSchema extends ObjectSchemaBuilder<infer TProperties, any, any> ? {
    [K in keyof TProperties]: TProperties[K] extends ObjectSchemaBuilder<any, any, any> ? PropertyDescriptorTree<TProperties[K], TRootSchema, any, PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : TProperties[K] extends ArraySchemaBuilder<infer TArrayElement, any, any> ? TArrayElement extends ObjectSchemaBuilder<any, any, any, any> ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : InferType<TProperties[K]> extends TAssignableTo ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : never : InferType<TProperties[K]> extends TAssignableTo ? PropertyDescriptor<TRootSchema, TProperties[K], PropertyDescriptor<TRootSchema, TSchema, TParentPropertyDescriptor>> : never;
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
export declare abstract class SchemaBuilder<TResult = any, TRequired extends boolean = true, TExtensions = {}> {
    #private;
    /**
     * Type-level brand encoding the inferred type of this schema.
     * Not emitted at runtime — used only by {@link InferType}.
     * @internal
     */
    readonly [__type]: TRequired extends true ? TResult : MakeOptional<TResult>;
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
     * Whether \`preValidateSync\` can be skipped entirely.
     * True when there are no preprocessors and no validators,
     * so the only work would be the required check and wrapping
     * in a noop transaction — which subclasses can do inline.
     */
    protected get canSkipPreValidation(): boolean;
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
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        /**
         * Extension metadata. Stores custom state set by schema extensions.
         */
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * Makes schema optional (consider \`null\` and \`undefined\` as valid objects for this schema)
     */
    optional(): any;
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
     */
    abstract validate(
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
     */
    abstract validateAsync(
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
export declare class StringSchemaBuilder<TResult = string, TRequired extends boolean = true, TExtensions = {}> extends SchemaBuilder<TResult, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: StringSchemaBuilderCreateProps): StringSchemaBuilder<string, true, {}>;
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
        minLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * Max length of the string (if defined).
         */
        maxLength: number | undefined;
        /**
         * Max length validation error message provider.
         * If not provided, default error message will be used.
         */
        maxLengthValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict object to be equal to a certain value.
         */
        equalsTo: string | undefined;
        /**
         * Equals validation error message provider.
         * If not provided, default error message will be used.
         */
        equalsToValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict string to start with a certain value.
         */
        startsWith: string | undefined;
        /**
         * Starts with validation error message provider.
         * If not provided, default error message will be used.
         */
        startsWithValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict string to end with a certain value.
         */
        endsWith: string | undefined;
        /**
         * Ends with validation error message provider.
         * If not provided, default error message will be used.
         */
        endsWithValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
        /**
         * If set, restrict string to match a certain regular expression.
         */
        matches: RegExp | undefined;
        /**
         * Matches validation error message provider.
         * If not provided, default error message will be used.
         */
        matchesValidationErrorMessageProvider: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired, {}>>;
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
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): StringSchemaBuilder<T, true, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): StringSchemaBuilder<string, TRequired, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of string schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TResult, context?: ValidationContext): ValidationResult<TResult>;
    /**
     * Performs async validation of string schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TResult, context?: ValidationContext): Promise<ValidationResult<TResult>>;
    protected createFromProps<T, TReq extends boolean>(props: StringSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * Restricts string to be equal to \`value\`.
     */
    equals<T extends string>(value: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<T, TRequired, TExtensions> & TExtensions;
    /**
     * Cancels \`equals()\` call.
     */
    clearEquals(): StringSchemaBuilder<string, TRequired, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): StringSchemaBuilder<TResult, true, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): StringSchemaBuilder<TResult, false, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): StringSchemaBuilder<TResult & {
        readonly [K in BRAND]: TBrand;
    }, TRequired, TExtensions> & TExtensions;
    /**
     * Set minimal length of the valid value for schema.
     * @param length minimum string length
     */
    minLength(length: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`minLength()\` call.
     */
    clearMinLength(): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Set maximal length of the valid value for schema.
     * @param length maximum string length
     */
    maxLength(length: number, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancel \`maxLength()\` call.
     */
    clearMaxLength(): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Restricts string to start with \`val\`.
     */
    startsWith<T extends string>(val: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult extends string ? \`\${T}\${TResult}\` : TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancels \`startsWith()\` call.
     */
    clearStartsWith(): StringSchemaBuilder<string, TRequired, TExtensions> & TExtensions;
    /**
     * Restricts string to end with \`val\`.
     */
    endsWith<T extends string>(val: T, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult extends string ? \`\${TResult}\${T}\` : TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancels \`endsWith()\` call.
     */
    clearEndsWith(): StringSchemaBuilder<string, TRequired, TExtensions> & TExtensions;
    /**
     * Restricts string to match \`regexp\`.
     * @param regexp regular expression pattern to match against
     */
    matches(regexp: RegExp, 
    /**
     * Custom error message provider.
     */
    errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder<TResult, TRequired>>): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
    /**
     * Cancels \`matches()\` call.
     */
    clearMatches(): StringSchemaBuilder<TResult, TRequired, TExtensions> & TExtensions;
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
export declare class UnionSchemaBuilder<TOptions extends readonly SchemaBuilder<any, any, any>[], TRequired extends boolean = true, TExplicitType = undefined, TExtensions = {}> extends SchemaBuilder<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TRequired, TExtensions> {
    #private;
    /**
     * @hidden
     */
    static create(props: UnionSchemaBuilderCreateProps<any>): UnionSchemaBuilder<any, true, undefined, {}>;
    protected constructor(props: UnionSchemaBuilderCreateProps<TOptions, TRequired>);
    introspect(): {
        /**
         * Array of schemas participating in the union.
         */
        options: TOptions;
        type: string;
        isRequired: boolean;
        preprocessors: readonly import("./SchemaBuilder.js").PreprocessorEntry<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType>[];
        validators: readonly import("./SchemaBuilder.js").ValidatorEntry<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType>[];
        requiredValidationErrorMessageProvider: ValidationErrorMessageProvider<SchemaBuilder<any, any, any>>;
        extensions: {
            [x: string]: unknown;
        };
    };
    /**
     * @inheritdoc
     */
    hasType<T>(_notUsed?: T): UnionSchemaBuilder<TOptions, true, T, TExtensions> & TExtensions;
    /**
     * @inheritdoc
     */
    clearHasType(): UnionSchemaBuilder<TOptions, TRequired, undefined, TExtensions> & TExtensions;
    /**
     * Performs synchronous validation of the union schema over \`object\`.
     * Throws if any preprocessor, validator, or error message provider returns a Promise.
     * @param context Optional \`ValidationContext\` settings.
     */
    validate(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>;
    /**
     * Performs async validation of the union schema over \`object\`.
     * Supports async preprocessors, validators, and error message providers.
     * @param context Optional \`ValidationContext\` settings.
     */
    validateAsync(object: TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, context?: ValidationContext): Promise<UnionSchemaValidationResult<TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType, TOptions>>;
    protected createFromProps<T extends readonly SchemaBuilder<any, any, any>[], TReq extends boolean>(props: UnionSchemaBuilderCreateProps<T, TReq>): this;
    /**
     * @hidden
     */
    required(errorMessage?: ValidationErrorMessageProvider): UnionSchemaBuilder<TOptions, true, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    optional(): UnionSchemaBuilder<TOptions, false, TExplicitType, TExtensions> & TExtensions;
    /**
     * @hidden
     */
    brand<TBrand extends string | symbol>(_name?: TBrand): UnionSchemaBuilder<TOptions, TRequired, (TExplicitType extends undefined ? SchemaArrayToUnion<TOptions> : TExplicitType) & {
        readonly [K in BRAND]: TBrand;
    }, TExtensions> & TExtensions;
    /**
     * Adds a new schema option described by \`schema\`.
     * schema must be an instance of \`SchemaBuilder\` class ancestor.
     * @param schema schema to be added as an option.
     */
    or<T extends SchemaBuilder<any, any, any>>(schema: T): UnionSchemaBuilder<[
        ...TOptions,
        T
    ], TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Removes option by its \`index\`. If \`index\` is out of bounds,
     * an error is thrown.
     * @param index index of the option, starting from \`0\`.
     */
    removeOption<T extends number>(index: T): UnionSchemaBuilder<TakeExceptIndex<TOptions, T>, TRequired, TExplicitType, TExtensions> & TExtensions;
    /**
     * Removes first option from the union schema.
     */
    removeFirstOption(): TOptions extends [
        infer _,
        ...infer TRest extends SchemaBuilder<any, any, any>[]
    ] ? UnionSchemaBuilder<TRest, TRequired, TExplicitType, TExtensions> & TExtensions : never;
    /**
     * Removes all options and replaces them by single \`schema\` option.
     * Equivalent to \`union(schema)\` function, but could be useful in some cases.
     * @param schema schema to be added as a single option to the new schema.
     */
    reset<T extends SchemaBuilder<any, any, any>>(schema: T): UnionSchemaBuilder<[T], TRequired, TExplicitType, TExtensions> & TExtensions;
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
export { NullSchemaBuilder, nul } from './builders/NullSchemaBuilder.js';
export { NumberSchemaBuilder, number } from './builders/NumberSchemaBuilder.js';
export { ObjectSchemaBuilder, object, SchemaPropertySelector } from './builders/ObjectSchemaBuilder.js';
export type { PropertyDescriptor, PropertyDescriptorInner, PropertyDescriptorTree, PropertySetterOptions, ValidationErrorMessageProvider } from './builders/SchemaBuilder.js';
export { BRAND, Brand, InferType, MakeOptional, SchemaBuilder, SchemaValidationError, SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR, ValidationError, ValidationResult } from './builders/SchemaBuilder.js';
export { StringSchemaBuilder, string } from './builders/StringSchemaBuilder.js';
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
import type { SchemaBuilder } from './builders/SchemaBuilder.js';
import { StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
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
    string: StringSchemaBuilder<any, any, any>;
    number: NumberSchemaBuilder<any, any, any>;
    boolean: BooleanSchemaBuilder<any, any, any, any, any>;
    date: DateSchemaBuilder<any, any, any>;
    object: ObjectSchemaBuilder<any, any, any, any>;
    array: ArraySchemaBuilder<any, any, any, any, any>;
    union: UnionSchemaBuilder<any, any, any, any>;
    func: FunctionSchemaBuilder<any, any, any, any>;
    any: AnySchemaBuilder<any, any, any, any>;
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
    (): CleanExtended<StringSchemaBuilder<string, true, TExt>, TExt>;
    <T extends string>(equals: T): CleanExtended<StringSchemaBuilder<T, true, TExt>, TExt>;
};
type ExtendedNumberFactory<TExt> = {
    (): CleanExtended<NumberSchemaBuilder<number, true, TExt>, TExt>;
    <T extends number>(equals: T): CleanExtended<NumberSchemaBuilder<T, true, TExt>, TExt>;
};
type ExtendedBooleanFactory<TExt> = () => CleanExtended<BooleanSchemaBuilder<boolean, true, undefined, TExt>, TExt>;
type ExtendedDateFactory<TExt> = () => CleanExtended<DateSchemaBuilder<Date, true, TExt>, TExt>;
type ExtendedObjectFactory<TExt> = <P extends Record<string, SchemaBuilder<any, any, any>>>(properties?: P) => CleanExtended<ObjectSchemaBuilder<P, true, undefined, TExt>, TExt>;
type ExtendedArrayFactory<TExt> = <TElementSchema extends SchemaBuilder<any, any, any>>(elementSchema?: TElementSchema) => CleanExtended<ArraySchemaBuilder<TElementSchema, true, undefined, TExt>, TExt>;
type ExtendedUnionFactory<TExt> = <T extends SchemaBuilder<any, any, any>>(schema: T) => CleanExtended<UnionSchemaBuilder<[T], true, undefined, TExt>, TExt>;
type ExtendedFuncFactory<TExt> = () => CleanExtended<FunctionSchemaBuilder<true, undefined, TExt>, TExt>;
type ExtendedAnyFactory<TExt> = () => CleanExtended<AnySchemaBuilder<true, undefined, TExt>, TExt>;
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
/** Return type shared by every method on {@link ArrayBuiltinExtensions}. */
type ArrayExtReturn<TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = ArraySchemaBuilder<TElementSchema, true, undefined, ArrayBuiltinExtensions<TElementSchema>> & ArrayBuiltinExtensions<TElementSchema> & HiddenExtensionMethods;
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
        nonempty(this: ArraySchemaBuilder<any>, errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArraySchemaBuilder<any, true, undefined, {}, any[] | unknown[]>;
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
        unique(this: ArraySchemaBuilder<any>, keyFn?: (item: any) => unknown, errorMessage?: ValidationErrorMessageProvider<ArraySchemaBuilder<any>>): ArraySchemaBuilder<any, true, undefined, {}, any[] | unknown[]>;
    };
}>;
export {};
`,
    "file:///node_modules/@cleverbrush/schema/extensions/index.d.ts": `/**
 * Pre‑wired extension pack for \`@cleverbrush/schema\`.
 *
 * Combines {@link stringExtensions}, {@link numberExtensions}, and
 * {@link arrayExtensions} via \`withExtensions()\` and re‑exports the
 * augmented factory functions.
 *
 * The default \`@cleverbrush/schema\` entry point re‑exports these
 * augmented factories so that \`email()\`, \`positive()\`, \`nonempty()\`,
 * etc. are available without any setup.
 *
 * @module
 */
import type { ArraySchemaBuilder } from '../builders/ArraySchemaBuilder.js';
import type { NumberSchemaBuilder } from '../builders/NumberSchemaBuilder.js';
import type { SchemaBuilder } from '../builders/SchemaBuilder.js';
import type { StringSchemaBuilder } from '../builders/StringSchemaBuilder.js';
import type { HiddenExtensionMethods } from '../extension.js';
import type { ArrayBuiltinExtensions } from './array.js';
import type { NumberBuiltinExtensions } from './number.js';
import type { StringBuiltinExtensions } from './string.js';
export { type ArrayBuiltinExtensions, arrayExtensions } from './array.js';
export { type NumberBuiltinExtensions, numberExtensions } from './number.js';
export { type StringBuiltinExtensions, stringExtensions } from './string.js';
/** A \`StringSchemaBuilder\` with built-in extension methods. */
export type ExtendedString<T extends string = string> = StringSchemaBuilder<T, true, StringBuiltinExtensions<T>> & StringBuiltinExtensions<T> & HiddenExtensionMethods;
/** A \`NumberSchemaBuilder\` with built-in extension methods. */
export type ExtendedNumber<T extends number = number> = NumberSchemaBuilder<T, true, NumberBuiltinExtensions<T>> & NumberBuiltinExtensions<T> & HiddenExtensionMethods;
/** An \`ArraySchemaBuilder\` with built-in extension methods. */
export type ExtendedArray<TElementSchema extends SchemaBuilder<any, any, any> = SchemaBuilder<any, any, any>> = ArraySchemaBuilder<TElementSchema, true, undefined, ArrayBuiltinExtensions<TElementSchema>> & ArrayBuiltinExtensions<TElementSchema> & HiddenExtensionMethods;
export declare const string: {
    (): ExtendedString;
    <T extends string>(equals: T): ExtendedString<T>;
};
export declare const number: {
    (): ExtendedNumber;
    <T extends number>(equals: T): ExtendedNumber<T>;
};
export declare const array: <TElementSchema extends SchemaBuilder<any, any, any>>(elementSchema?: TElementSchema) => ExtendedArray<TElementSchema>;
export declare const boolean: () => import("../extension.js").CleanExtended<import("../core.js").BooleanSchemaBuilder<boolean, true, undefined, {}, boolean>, {}>;
export declare const date: () => import("../extension.js").CleanExtended<import("../core.js").DateSchemaBuilder<Date, true, {}>, {}>;
export declare const object: <P extends Record<string, SchemaBuilder<any, any, any>>>(properties?: P | undefined) => import("../extension.js").CleanExtended<import("../core.js").ObjectSchemaBuilder<P, true, undefined, {}>, {}>;
export declare const union: <T extends SchemaBuilder<any, any, any>>(schema: T) => import("../extension.js").CleanExtended<import("../core.js").UnionSchemaBuilder<[T], true, undefined, {}>, {}>;
export declare const func: () => import("../extension.js").CleanExtended<import("../core.js").FunctionSchemaBuilder<true, undefined, {}, (...args: any[]) => any>, {}>;
export declare const any: () => import("../extension.js").CleanExtended<import("../core.js").AnySchemaBuilder<true, undefined, {}, any>, {}>;
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
/** Return type shared by every method on {@link NumberBuiltinExtensions}. */
type NumberExtReturn<T extends number = number> = NumberSchemaBuilder<T, true, NumberBuiltinExtensions<T>> & NumberBuiltinExtensions<T> & HiddenExtensionMethods;
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
        positive(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, {}>;
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
        negative(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, {}>;
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
        finite(this: NumberSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, {}>;
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
        multipleOf(this: NumberSchemaBuilder, n: number, errorMessage?: ValidationErrorMessageProvider<NumberSchemaBuilder>): NumberSchemaBuilder<number, true, {}>;
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
/** Return type shared by every method on {@link StringBuiltinExtensions}. */
type StringExtReturn<T extends string = string> = StringSchemaBuilder<T, true, StringBuiltinExtensions<T>> & StringBuiltinExtensions<T> & HiddenExtensionMethods;
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
        email(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, {}>;
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
        } | ValidationErrorMessageProvider<StringSchemaBuilder>, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, {}>;
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
        uuid(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, {}>;
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
        }, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, {}>;
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
        trim(this: StringSchemaBuilder): StringSchemaBuilder<string, true, {}>;
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
        toLowerCase(this: StringSchemaBuilder): StringSchemaBuilder<string, true, {}>;
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
        nonempty(this: StringSchemaBuilder, errorMessage?: ValidationErrorMessageProvider<StringSchemaBuilder>): StringSchemaBuilder<string, true, {}>;
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
    "file:///node_modules/@cleverbrush/schema/index.d.ts": `export * from './core.js';
export { type ArrayBuiltinExtensions, any, array, arrayExtensions, boolean, date, type ExtendedArray, type ExtendedNumber, type ExtendedString, func, type NumberBuiltinExtensions, number, numberExtensions, object, type StringBuiltinExtensions, string, stringExtensions, union } from './extensions/index.js';
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
