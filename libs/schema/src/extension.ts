/**
 * @module extension
 *
 * The **extension system** for `@cleverbrush/schema` allows third-party and
 * first-party code to add custom methods to any schema builder type
 * (`string`, `number`, `date`, `object`, …) without modifying the core
 * library.
 *
 * ## Overview
 *
 * Extensions follow a two-step workflow:
 *
 * 1. **Define** an extension with {@link defineExtension} — declare which
 *    builder types it targets and what methods it adds.
 * 2. **Apply** one or more extensions with {@link withExtensions} — get back
 *    augmented factory functions (`string()`, `number()`, …) whose return
 *    types include the new methods.
 *
 * ## Ergonomic authoring
 *
 * Extension methods do **not** need to call `withExtension()` manually.
 * The system automatically attaches metadata using the method name as the
 * extension key and the method arguments as the value. This keeps extension
 * definitions concise:
 *
 * ```ts
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
 * ```
 *
 * If you need **custom metadata** (e.g. a different key or a transformed
 * value), call `this.withExtension(key, value)` explicitly — the auto-infer
 * logic will detect the existing key and skip the automatic attachment.
 *
 * ## Stacking and composition
 *
 * Multiple extensions can target the same builder type. Pass them all to
 * `withExtensions()` and the methods are merged. A runtime error is thrown
 * if two extensions define the same method name on the same builder type.
 *
 * ```ts
 * const s = withExtensions(emailExt, slugExt, rangeExt);
 * const schema = s.string().email().slug(); // both methods available
 * ```
 *
 * ## Introspection
 *
 * Extension metadata is accessible via `schema.introspect().extensions`.
 * Each key corresponds to an extension method name and its value is whatever
 * was passed (or auto-inferred) as the extension data.
 *
 * @see {@link defineExtension} — define an extension
 * @see {@link withExtensions} — apply extensions to builder factories
 * @see {@link ExtensionConfig} — shape of the configuration object
 * @see {@link ExtensionDescriptor} — branded descriptor returned by `defineExtension`
 */
import { AnySchemaBuilder, any } from './builders/AnySchemaBuilder.js';
import { ArraySchemaBuilder, array } from './builders/ArraySchemaBuilder.js';
import {
    BooleanSchemaBuilder,
    boolean
} from './builders/BooleanSchemaBuilder.js';
import { DateSchemaBuilder, date } from './builders/DateSchemaBuilder.js';
import {
    FunctionSchemaBuilder,
    func
} from './builders/FunctionSchemaBuilder.js';
import { NumberSchemaBuilder, number } from './builders/NumberSchemaBuilder.js';
import { ObjectSchemaBuilder, object } from './builders/ObjectSchemaBuilder.js';
import { RecordSchemaBuilder, record } from './builders/RecordSchemaBuilder.js';
import type { SchemaBuilder } from './builders/SchemaBuilder.js';
import { StringSchemaBuilder, string } from './builders/StringSchemaBuilder.js';
import { TupleSchemaBuilder, tuple } from './builders/TupleSchemaBuilder.js';
import { UnionSchemaBuilder, union } from './builders/UnionSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Builder type name mapping
// ---------------------------------------------------------------------------

/**
 * Maps each builder type name to the corresponding generic builder class.
 *
 * Used internally to type-check extension method `this` bindings — for
 * example, an extension targeting `"string"` receives `this: StringSchemaBuilder`.
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

// Runtime mapping from type name to the actual class constructor
const builderClasses: Record<BuilderTypeName, typeof SchemaBuilder> = {
    string: StringSchemaBuilder as any,
    number: NumberSchemaBuilder as any,
    boolean: BooleanSchemaBuilder as any,
    date: DateSchemaBuilder as any,
    object: ObjectSchemaBuilder as any,
    array: ArraySchemaBuilder as any,
    tuple: TupleSchemaBuilder as any,
    record: RecordSchemaBuilder as any,
    union: UnionSchemaBuilder as any,
    func: FunctionSchemaBuilder as any,
    any: AnySchemaBuilder as any
};

// Runtime mapping from type name to factory function
const builderFactories: Record<BuilderTypeName, (...args: any[]) => any> = {
    string,
    number,
    boolean,
    date,
    object,
    array,
    tuple,
    record,
    union,
    func,
    any
};

// ---------------------------------------------------------------------------
// Extension configuration types
// ---------------------------------------------------------------------------

/**
 * Defines the shape of an extension configuration object passed to
 * {@link defineExtension}.
 *
 * Each key is a **builder type name** — one of `"string"`, `"number"`,
 * `"boolean"`, `"date"`, `"object"`, `"array"`, `"union"`, `"func"`, or
 * `"any"`. The value is a record of **method implementations** to add to
 * that builder type.
 *
 * Method implementations receive `this` bound to the target builder instance
 * (e.g. `StringSchemaBuilder` for the `"string"` key) and **must** return a
 * builder of the same type to support fluent chaining.
 *
 * @remarks
 * Extension methods that only add validators/preprocessors do not need to
 * call `this.withExtension()` — the system will auto-attach metadata using
 * the method name as the key and the arguments as the value. Call
 * `this.withExtension(key, value)` explicitly only when you need custom
 * metadata (e.g. a transformed value or a different key).
 *
 * @example
 * ```ts
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
 * ```
 *
 * @see {@link defineExtension}
 */
export type ExtensionConfig = {
    [K in BuilderTypeName]?: Record<
        string,
        (this: BuilderMap[K], ...args: any[]) => any
    >;
};

/**
 * A branded descriptor returned by {@link defineExtension}.
 *
 * The descriptor captures the extension's method signatures at the **type
 * level** so that {@link withExtensions} can produce correctly-typed factory
 * functions. At runtime it holds the (possibly wrapped) configuration object.
 *
 * Extension descriptors are intentionally **opaque** — consumers should not
 * access `config` directly. Instead, pass descriptors to
 * {@link withExtensions} to obtain augmented builder factories.
 *
 * @typeParam T - The concrete {@link ExtensionConfig} shape. Inferred
 *   automatically by `defineExtension`; you rarely need to specify it.
 *
 * @example
 * ```ts
 * // The type is inferred — no need to annotate
 * const myExt: ExtensionDescriptor<{ string: { slug: ... } }> = defineExtension({ ... });
 * ```
 *
 * @see {@link defineExtension}
 * @see {@link withExtensions}
 */
export type ExtensionDescriptor<T extends ExtensionConfig = ExtensionConfig> = {
    readonly __brand: unique symbol;
    readonly config: T;
};

// ---------------------------------------------------------------------------
// Type-level extraction of extension methods per builder type
// ---------------------------------------------------------------------------

/** Extracts the method signatures an extension adds to a given builder type. */
type ExtractMethods<
    TExt extends ExtensionConfig,
    TType extends BuilderTypeName
> =
    TExt[TType] extends Record<string, (...args: any[]) => any>
        ? TExt[TType]
        : {};

/** Merges the methods from multiple extensions for a given builder type. */
type MergeExtensionMethods<
    TExts extends readonly ExtensionDescriptor<any>[],
    TType extends BuilderTypeName
> = TExts extends readonly [
    ExtensionDescriptor<infer TFirst>,
    ...infer TRest extends readonly ExtensionDescriptor<any>[]
]
    ? ExtractMethods<TFirst, TType> & MergeExtensionMethods<TRest, TType>
    : {};

// ---------------------------------------------------------------------------
// Return types for withExtensions()
// ---------------------------------------------------------------------------

/**
 * Intersected onto consumer-facing builder types to make `withExtension`
 * and `getExtension` uncallable (`never`). Using an intersection instead
 * of `Omit` preserves the class identity so extended builders remain
 * assignable to `SchemaBuilder<any, any, any>`.
 */
export type HiddenExtensionMethods = {
    /** @internal Extension-author only — use inside `defineExtension()`. */
    withExtension: never;
    /** @internal Extension-author only — use inside `defineExtension()`. */
    getExtension: never;
};

/**
 * Overrides extension method return types so they always return the full
 * extended builder type. This ensures extension methods preserve all other
 * extension methods through chaining (e.g. `s.string().email().slug()`).
 *
 * The self-reference (`FixedMethods` appears in its own mapped return
 * types) is resolved lazily by TypeScript because the recursion sits
 * inside a function-return position within a conditional mapped type.
 */
export type FixedMethods<TRawMethods, TBase> = {
    [K in keyof TRawMethods]: TRawMethods[K] extends (
        this: any,
        ...args: infer A
    ) => any
        ? (
              ...args: A
          ) => TBase & FixedMethods<TRawMethods, TBase> & HiddenExtensionMethods
        : TRawMethods[K];
};

/**
 * Produces the consumer-facing type for an extended builder: the base
 * builder intersected with its fixed extension methods, with
 * `withExtension` / `getExtension` overridden to `never` so they
 * don't appear as callable in consumer code.
 */
export type CleanExtended<TBuilder, TExt> = TBuilder &
    FixedMethods<TExt, TBuilder> &
    HiddenExtensionMethods;

// -- Factory types that return builders with corrected extension methods ------

type ExtendedStringFactory<TExt> = {
    (): CleanExtended<StringSchemaBuilder<string, true, false, TExt>, TExt>;
    <T extends string>(
        equals: T
    ): CleanExtended<StringSchemaBuilder<T, true, false, TExt>, TExt>;
};

type ExtendedNumberFactory<TExt> = {
    (): CleanExtended<NumberSchemaBuilder<number, true, false, TExt>, TExt>;
    <T extends number>(
        equals: T
    ): CleanExtended<NumberSchemaBuilder<T, true, false, TExt>, TExt>;
};

type ExtendedBooleanFactory<TExt> = () => CleanExtended<
    BooleanSchemaBuilder<boolean, true, undefined, false, TExt>,
    TExt
>;

type ExtendedDateFactory<TExt> = () => CleanExtended<
    DateSchemaBuilder<Date, true, false, TExt>,
    TExt
>;

type ExtendedObjectFactory<TExt> = <
    P extends Record<string, SchemaBuilder<any, any, any>>
>(
    properties?: P
) => CleanExtended<ObjectSchemaBuilder<P, true, undefined, false, TExt>, TExt>;

type ExtendedArrayFactory<TExt> = <
    TElementSchema extends SchemaBuilder<any, any, any>
>(
    elementSchema?: TElementSchema
) => CleanExtended<
    ArraySchemaBuilder<TElementSchema, true, undefined, false, TExt>,
    TExt
>;

type ExtendedUnionFactory<TExt> = <T extends SchemaBuilder<any, any, any>>(
    schema: T
) => CleanExtended<UnionSchemaBuilder<[T], true, undefined, false, TExt>, TExt>;

type ExtendedFuncFactory<TExt> = () => CleanExtended<
    FunctionSchemaBuilder<true, undefined, false, TExt>,
    TExt
>;

type ExtendedAnyFactory<TExt> = () => CleanExtended<
    AnySchemaBuilder<true, undefined, false, TExt>,
    TExt
>;

type ExtendedTupleFactory<TExt> = <
    const TElements extends readonly SchemaBuilder<any, any, any>[]
>(
    elements: [...TElements]
) => CleanExtended<
    TupleSchemaBuilder<TElements, true, undefined, false, TExt>,
    TExt
>;

type ExtendedRecordFactory<TExt> = <
    TKeySchema extends StringSchemaBuilder<any, any, any, any>,
    TValueSchema extends SchemaBuilder<any, any, any>
>(
    keySchema: TKeySchema,
    valueSchema: TValueSchema
) => CleanExtended<
    RecordSchemaBuilder<TKeySchema, TValueSchema, true, undefined, false, TExt>,
    TExt
>;

/**
 * The return type of {@link withExtensions}.
 *
 * Contains a factory function for every builder type (`string`, `number`,
 * `boolean`, `date`, `object`, `array`, `union`, `func`, `any`). Each
 * factory returns a builder whose type includes the methods contributed
 * by all provided extension descriptors.
 *
 * @typeParam TExts - Tuple of extension descriptors passed to `withExtensions`.
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

// ---------------------------------------------------------------------------
// Reserved method names — cannot be overridden by extensions
// ---------------------------------------------------------------------------

/**
 * Method names on `SchemaBuilder` that extensions are **not** allowed to
 * override. An error is thrown at definition time if an extension tries
 * to use any of these names.
 *
 * @internal
 */
const RESERVED_METHODS = new Set([
    'validate',
    'validateAsync',
    'parse',
    'parseAsync',
    'safeParse',
    'safeParseAsync',
    'introspect',
    'optional',
    'required',
    'addPreprocessor',
    'clearPreprocessors',
    'addValidator',
    'clearValidators',
    'hasType',
    'clearHasType',
    'createFromProps',
    'preValidate',
    'preValidateSync',
    'preValidateAsync',
    'getValidationErrorMessage',
    'getValidationErrorMessageSync',
    'assureValidationErrorMessageProvider',
    'withExtension',
    'getExtension'
]);

// ---------------------------------------------------------------------------
// defineExtension()
// ---------------------------------------------------------------------------

/**
 * Defines an extension targeting one or more schema builder types.
 *
 * Each extension is a plain object keyed by builder type name (`"string"`,
 * `"number"`, `"date"`, …) whose values are method implementations.
 * Methods receive `this` bound to the builder instance and must return a
 * builder to support fluent chaining.
 *
 * ## Ergonomic metadata (auto-infer)
 *
 * Extension methods **do not** have to call `this.withExtension()`. The
 * system wraps each method and automatically attaches
 * `withExtension(methodName, args)` to the returned builder when the key
 * is not already present. This eliminates the most common source of
 * duplication in extension code.
 *
 * - **Zero-arg methods** → metadata value is `true`
 * - **Single-arg methods** → metadata value is the argument itself
 * - **Multi-arg methods** → metadata value is the arguments array
 *
 * If you need **custom metadata** (e.g. a different key, a transformed
 * value, or a structured object), call `this.withExtension(key, value)`
 * explicitly inside the method — the auto-infer logic detects the existing
 * key and skips automatic attachment.
 *
 * ## Validation
 *
 * `defineExtension` validates the configuration eagerly:
 * - Unknown builder type names throw immediately.
 * - {@link RESERVED_METHODS | Reserved method names} (e.g. `validate`,
 *   `introspect`) cannot be overridden.
 * - Non-function values in the method record are rejected.
 *
 * @param config - An {@link ExtensionConfig} object mapping builder type
 *   names to method records.
 * @returns A branded {@link ExtensionDescriptor} ready to pass to
 *   {@link withExtensions}.
 *
 * @example Simple extension (auto-inferred metadata)
 * ```ts
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
 * ```
 *
 * @example Extension with custom metadata
 * ```ts
 * const currencyExt = defineExtension({
 *   number: {
 *     currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
 *       const maxDec = opts?.maxDecimals ?? 2;
 *       return this.withExtension('currency', { maxDecimals: maxDec })
 *         .min(0)
 *         .addValidator((val) => {
 *           const decimals = (String(val).split('.')[1] ?? '').length;
 *           const valid = decimals <= maxDec;
 *           return { valid, errors: valid ? [] : [{ message: `max ${maxDec} decimals` }] };
 *         });
 *     }
 *   }
 * });
 * ```
 *
 * @example Multi-builder extension
 * ```ts
 * const myExt = defineExtension({
 *   string: {
 *     email(this: StringSchemaBuilder) { return this.addValidator(...); }
 *   },
 *   number: {
 *     port(this: NumberSchemaBuilder) { return this.isInteger().min(1).max(65535); }
 *   }
 * });
 * ```
 *
 * @throws {Error} If a builder type name is unknown.
 * @throws {Error} If a method name is reserved.
 * @throws {Error} If a method value is not a function.
 *
 * @see {@link withExtensions} — apply the defined extension
 * @see {@link ExtensionConfig} — configuration shape
 */
export function defineExtension<T extends ExtensionConfig>(
    config: T
): ExtensionDescriptor<T> {
    // Validate at definition time and wrap methods for auto-infer extension key
    const wrappedConfig: any = {};
    for (const builderName of Object.keys(config) as BuilderTypeName[]) {
        if (!(builderName in builderClasses)) {
            throw new Error(
                `Unknown builder type "${builderName}". Valid types: ${Object.keys(builderClasses).join(', ')}`
            );
        }

        const methods = config[builderName];
        if (!methods || typeof methods !== 'object') {
            throw new Error(
                `Extension config for "${builderName}" must be an object of methods`
            );
        }

        wrappedConfig[builderName] = {};
        for (const methodName of Object.keys(methods)) {
            if (RESERVED_METHODS.has(methodName)) {
                throw new Error(
                    `Cannot override reserved method "${methodName}" on "${builderName}"`
                );
            }
            const origMethod = methods[methodName];
            if (typeof origMethod !== 'function') {
                throw new Error(
                    `Extension method "${builderName}.${methodName}" must be a function`
                );
            }
            // Wrap the method to auto-infer extension key if not already set
            wrappedConfig[builderName][methodName] = function (
                this: any,
                ...args: any[]
            ) {
                const result = (origMethod as any).apply(this, args);
                // If result is a builder and does not have the extension key, auto-apply withExtension
                if (
                    result &&
                    typeof result === 'object' &&
                    typeof result.withExtension === 'function' &&
                    // Only auto-apply if the extension key is not already present
                    (typeof result.getExtension !== 'function' ||
                        result.getExtension(methodName) === undefined)
                ) {
                    // Only auto-apply if the original method did not call withExtension
                    return result.withExtension(
                        methodName,
                        args.length === 1
                            ? args[0]
                            : args.length === 0
                              ? true
                              : args
                    );
                }
                return result;
            };
        }
    }

    return { config: wrappedConfig } as ExtensionDescriptor<T>;
}

// ---------------------------------------------------------------------------
// withExtensions()
// ---------------------------------------------------------------------------

/**
 * Creates a set of schema factory functions with the provided extensions
 * applied.
 *
 * Each factory function (`string()`, `number()`, `date()`, …) returned by
 * `withExtensions` produces builder instances whose prototypes include the
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
 * `s.string().email().slug().minLength(3)` is fully typed.
 *
 * ## Builder types without extensions
 *
 * Builders that have no methods from any of the provided extensions
 * use the standard (unextended) factory, so there is zero overhead.
 *
 * @param extensions - One or more {@link ExtensionDescriptor}s created
 *   by {@link defineExtension}.
 * @returns An object with factory functions for all builder types
 *   (`string`, `number`, `boolean`, `date`, `object`, `array`, `union`,
 *   `func`, `any`), each returning augmented builders.
 *
 * @example Basic usage
 * ```ts
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
 * ```
 *
 * @example Stacking extensions on the same builder
 * ```ts
 * const s = withExtensions(emailExt, slugExt, trimmedExt);
 * const schema = s.string().email().slug().trimmed();
 * ```
 *
 * @example Using extensions in object schemas
 * ```ts
 * const s = withExtensions(emailExt, portExt);
 * const ServerConfig = s.object({
 *   host: s.string().email(),
 *   port: s.number().port()
 * });
 * ```
 *
 * @throws {Error} If two extensions define the same method name on the
 *   same builder type.
 *
 * @see {@link defineExtension} — create extension descriptors
 * @see {@link ExtensionDescriptor}
 */
export function withExtensions<
    const TExts extends readonly ExtensionDescriptor<any>[]
>(...extensions: TExts): WithExtensionsResult<TExts> {
    // Collect all methods per builder type and check for collisions
    const methodsByBuilder = new Map<BuilderTypeName, Map<string, Function>>();

    for (const ext of extensions) {
        for (const builderName of Object.keys(
            ext.config
        ) as BuilderTypeName[]) {
            if (!methodsByBuilder.has(builderName)) {
                methodsByBuilder.set(builderName, new Map());
            }
            const methods = methodsByBuilder.get(builderName)!;
            const extMethods = ext.config[builderName]!;

            for (const methodName of Object.keys(extMethods)) {
                if (methods.has(methodName)) {
                    throw new Error(
                        `Extension method collision: "${methodName}" is defined by multiple extensions for "${builderName}"`
                    );
                }
                methods.set(methodName, extMethods[methodName]);
            }
        }
    }

    // For each builder type, create a dynamic subclass if there are extension methods
    const factories: Record<string, (...args: any[]) => any> = {};

    for (const builderName of Object.keys(
        builderClasses
    ) as BuilderTypeName[]) {
        const methods = methodsByBuilder.get(builderName);

        if (!methods || methods.size === 0) {
            // No extensions for this builder type — use the standard factory
            factories[builderName] = builderFactories[builderName];
            continue;
        }

        const BaseClass = builderClasses[builderName] as any;

        // Create a dynamic subclass
        const ExtendedClass = class extends BaseClass {
            // biome-ignore lint/complexity/noUselessConstructor: required
            constructor(...args: any[]) {
                super(...args);
            }

            static create(props: any) {
                return new ExtendedClass({
                    ...props
                });
            }

            protected createFromProps(props: any): any {
                return ExtendedClass.create(props);
            }
        };

        // Add extension methods to the subclass prototype
        for (const [methodName, methodFn] of methods) {
            Object.defineProperty(ExtendedClass.prototype, methodName, {
                value: methodFn,
                writable: true,
                configurable: true,
                enumerable: false
            });
        }

        // Create a factory that uses the extended class
        factories[builderName] = (...args: any[]) => {
            // Delegate to the original factory to get an initialized instance,
            // then upgrade its prototype so it gains the extension methods.
            // Note: Object.setPrototypeOf can cause V8 hidden-class deoptimization
            // on the mutated object, but avoids the double allocation and
            // introspect() round-trip of the previous approach.
            const original = builderFactories[builderName](...args);
            Object.setPrototypeOf(original, ExtendedClass.prototype);
            return original;
        };
    }

    return factories as WithExtensionsResult<TExts>;
}
