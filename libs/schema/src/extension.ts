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
import type { SchemaBuilder } from './builders/SchemaBuilder.js';
import { StringSchemaBuilder, string } from './builders/StringSchemaBuilder.js';
import { UnionSchemaBuilder, union } from './builders/UnionSchemaBuilder.js';

// ---------------------------------------------------------------------------
// Builder type name mapping
// ---------------------------------------------------------------------------

/** Maps builder type names to their builder classes. */
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

// Runtime mapping from type name to the actual class constructor
const builderClasses: Record<BuilderTypeName, typeof SchemaBuilder> = {
    string: StringSchemaBuilder as any,
    number: NumberSchemaBuilder as any,
    boolean: BooleanSchemaBuilder as any,
    date: DateSchemaBuilder as any,
    object: ObjectSchemaBuilder as any,
    array: ArraySchemaBuilder as any,
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
    union,
    func,
    any
};

// ---------------------------------------------------------------------------
// Extension configuration types
// ---------------------------------------------------------------------------

/**
 * Defines the shape of an extension configuration. Each key is a builder type
 * name (e.g. `"string"`, `"number"`) and the value is a record of method
 * implementations to add to that builder type.
 *
 * Method implementations receive `this` bound to the builder instance and must
 * return a builder of the same type (to support fluent chaining).
 */
export type ExtensionConfig = {
    [K in BuilderTypeName]?: Record<
        string,
        (this: BuilderMap[K], ...args: any[]) => any
    >;
};

/**
 * A branded descriptor returned by `defineExtension()`. Captures the extension
 * method signatures at the type level for later use by `withExtensions()`.
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
type HiddenExtensionMethods = {
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
type FixedMethods<TRawMethods, TBase> = {
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
type CleanExtended<TBuilder, TExt> = TBuilder &
    FixedMethods<TExt, TBuilder> &
    HiddenExtensionMethods;

// -- Factory types that return builders with corrected extension methods ------

type ExtendedStringFactory<TExt> = {
    (): CleanExtended<StringSchemaBuilder<string, true, TExt>, TExt>;
    <T extends string>(
        equals: T
    ): CleanExtended<StringSchemaBuilder<T, true, TExt>, TExt>;
};

type ExtendedNumberFactory<TExt> = {
    (): CleanExtended<NumberSchemaBuilder<number, true, TExt>, TExt>;
    <T extends number>(
        equals: T
    ): CleanExtended<NumberSchemaBuilder<T, true, TExt>, TExt>;
};

type ExtendedBooleanFactory<TExt> = () => CleanExtended<
    BooleanSchemaBuilder<boolean, true, undefined, TExt>,
    TExt
>;

type ExtendedDateFactory<TExt> = () => CleanExtended<
    DateSchemaBuilder<Date, true, TExt>,
    TExt
>;

type ExtendedObjectFactory<TExt> = <
    P extends Record<string, SchemaBuilder<any, any, any>>
>(
    properties?: P
) => CleanExtended<ObjectSchemaBuilder<P, true, undefined, TExt>, TExt>;

type ExtendedArrayFactory<TExt> = <
    TElementSchema extends SchemaBuilder<any, any, any>
>(
    elementSchema?: TElementSchema
) => CleanExtended<
    ArraySchemaBuilder<TElementSchema, true, undefined, TExt>,
    TExt
>;

type ExtendedUnionFactory<TExt> = <T extends SchemaBuilder<any, any, any>>(
    schema: T
) => CleanExtended<UnionSchemaBuilder<[T], true, undefined, TExt>, TExt>;

type ExtendedFuncFactory<TExt> = () => CleanExtended<
    FunctionSchemaBuilder<true, undefined, TExt>,
    TExt
>;

type ExtendedAnyFactory<TExt> = () => CleanExtended<
    AnySchemaBuilder<true, undefined, TExt>,
    TExt
>;

/** The return type of `withExtensions()` with properly merged extension types. */
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

// ---------------------------------------------------------------------------
// Reserved method names — cannot be overridden by extensions
// ---------------------------------------------------------------------------

const RESERVED_METHODS = new Set([
    'validate',
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
    'getValidationErrorMessage',
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
 * @example
 * ```ts
 * const emailExt = defineExtension({
 *   string: {
 *     email(this: StringSchemaBuilder, opts?: { domains?: string[] }) {
 *       return this
 *         .withExtension('email', opts)
 *         .addValidator((val) => {
 *           const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string);
 *           return { valid, errors: valid ? [] : [{ message: 'invalid email' }] };
 *         });
 *     }
 *   }
 * });
 * ```
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
                const result = origMethod.apply(this, args);
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
 * applied. Each factory returns builder instances that include the extension
 * methods. Multiple extensions can be stacked — their methods are merged.
 *
 * @example
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
