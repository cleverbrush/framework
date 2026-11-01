// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-zod-declarations.js
//
// Maps Monaco virtual-FS paths to .d.ts content from node_modules/zod.

export const zodDeclarations: Record<string, string> = {
    'file:///node_modules/zod/compile.d.ts': `export {};
`,
    'file:///node_modules/zod/index.d.ts': `import * as z from "./v4/classic/external.js";
export * from "./v4/classic/external.js";
export { z, z as default };
`,
    'file:///node_modules/zod/v4/classic/checks.d.ts': `export { _lt as lt, _lte as lte, _gt as gt, _gte as gte, _positive as positive, _negative as negative, _nonpositive as nonpositive, _nonnegative as nonnegative, _multipleOf as multipleOf, _maxSize as maxSize, _minSize as minSize, _size as size, _maxLength as maxLength, _minLength as minLength, _length as length, _regex as regex, _lowercase as lowercase, _uppercase as uppercase, _includes as includes, _startsWith as startsWith, _endsWith as endsWith, _property as property, _properties as properties, _mime as mime, _overwrite as overwrite, _normalize as normalize, _trim as trim, _toLowerCase as toLowerCase, _toUpperCase as toUpperCase, _slugify as slugify, type $RefinementCtx as RefinementCtx, } from "../core/index.js";
`,
    'file:///node_modules/zod/v4/classic/coerce.d.ts': `import * as core from "../core/index.js";
import * as schemas from "./schemas.js";
export interface ZodCoercedString<T = unknown> extends schemas._ZodString<core.$ZodStringInternals<T>> {
}
export declare function string<T = unknown>(params?: string | core.$ZodStringParams): ZodCoercedString<T>;
export interface ZodCoercedNumber<T = unknown> extends schemas._ZodNumber<core.$ZodNumberInternals<T>> {
}
export declare function number<T = unknown>(params?: string | core.$ZodNumberParams): ZodCoercedNumber<T>;
export interface ZodCoercedBoolean<T = unknown> extends schemas._ZodBoolean<core.$ZodBooleanInternals<T>> {
}
export declare function boolean<T = unknown>(params?: string | core.$ZodBooleanParams): ZodCoercedBoolean<T>;
export interface ZodCoercedBigInt<T = unknown> extends schemas._ZodBigInt<core.$ZodBigIntInternals<T>> {
}
export declare function bigint<T = unknown>(params?: string | core.$ZodBigIntParams): ZodCoercedBigInt<T>;
export interface ZodCoercedDate<T = unknown> extends schemas._ZodDate<core.$ZodDateInternals<T>> {
}
export declare function date<T = unknown>(params?: string | core.$ZodDateParams): ZodCoercedDate<T>;
`,
    'file:///node_modules/zod/v4/classic/compat.d.ts': `import * as core from "../core/index.js";
import type { ZodType } from "./schemas.js";
/** @deprecated Use \`z.output<T>\` instead. */
export type TypeOf<T> = core.output<T>;
/** @deprecated Use \`z.output<T>\` instead. */
export type Infer<T> = core.output<T>;
/** @deprecated Use \`z.core.$ZodTypes\` instead */
export type ZodFirstPartySchemaTypes = core.$ZodTypes;
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
export declare const ZodIssueCode: {
    readonly invalid_type: "invalid_type";
    readonly too_big: "too_big";
    readonly too_small: "too_small";
    readonly invalid_format: "invalid_format";
    readonly not_multiple_of: "not_multiple_of";
    readonly unrecognized_keys: "unrecognized_keys";
    readonly invalid_union: "invalid_union";
    readonly invalid_key: "invalid_key";
    readonly invalid_element: "invalid_element";
    readonly invalid_value: "invalid_value";
    readonly custom: "custom";
};
/** @deprecated Use \`z.core.$ZodFlattenedError<z.output<T>>\` instead; it takes an inferred type, not a schema. */
export type inferFlattenedErrors<T extends core.$ZodType, U = string> = core.$ZodFlattenedError<core.output<T>, U>;
/** @deprecated Use \`z.core.$ZodFormattedError<z.output<T>>\` instead; it takes an inferred type, not a schema. */
export type inferFormattedError<T extends core.$ZodType<any, any>, U = string> = core.$ZodFormattedError<core.output<T>, U>;
/** Use \`z.$brand\` instead */
export type BRAND<T extends string | number | symbol = string | number | symbol> = {
    [core.$brand]: {
        [k in T]: true;
    };
};
export { $brand, config } from "../core/index.js";
/** @deprecated Use \`z.config(params)\` instead. */
export declare function setErrorMap(map: core.$ZodErrorMap): void;
/** @deprecated Use \`z.config()\` instead. */
export declare function getErrorMap(): core.$ZodErrorMap<core.$ZodIssue> | undefined;
/** @deprecated Use z.ZodType (without generics) instead. */
export type ZodTypeAny<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** @deprecated Use \`z.ZodType\` */
export type ZodSchema<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** @deprecated Use \`z.ZodType\` */
export type Schema<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** Included for Zod 3 compatibility */
export type ZodRawShape = core.$ZodShape;
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
export declare enum ZodFirstPartyTypeKind {
}
`,
    'file:///node_modules/zod/v4/classic/deep-partial.d.ts': `import type * as core from "../core/index.js";
import * as schemas from "./schemas.js";
/** Distributes \`.partial()\` through every object in a schema type, preserving the wrappers around them. */
export type DeepPartial<T extends core.SomeType> = T extends schemas.ZodObject<infer Shape, infer Config> ? schemas.ZodObject<{
    -readonly [K in keyof Shape]: schemas.ZodOptional<DeepPartial<Shape[K]>>;
}, Config> : T extends schemas.ZodDiscriminatedUnion<infer Options, any> ? schemas.ZodUnion<{
    -readonly [I in keyof Options]: Options[I] extends core.SomeType ? DeepPartial<Options[I]> : Options[I];
}> : T extends schemas.ZodUnion<infer Options> ? schemas.ZodUnion<{
    -readonly [I in keyof Options]: Options[I] extends core.SomeType ? DeepPartial<Options[I]> : Options[I];
}> : T extends schemas.ZodArray<infer El> ? schemas.ZodArray<DeepPartial<El>> : T extends schemas.ZodTuple<infer Items, infer Rest> ? schemas.ZodTuple<{
    -readonly [K in keyof Items]: Items[K] extends core.SomeType ? DeepPartial<Items[K]> : Items[K];
}, Rest extends core.SomeType ? DeepPartial<Rest> : Rest> : T extends schemas.ZodIntersection<infer A, infer B> ? schemas.ZodIntersection<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodRecord<infer K, infer V> ? schemas.ZodRecord<K, DeepPartial<V>> : T extends schemas.ZodMap<infer K, infer V> ? schemas.ZodMap<K, DeepPartial<V>> : T extends schemas.ZodSet<infer El> ? schemas.ZodSet<DeepPartial<El>> : T extends schemas.ZodOptional<infer Inner> ? schemas.ZodOptional<DeepPartial<Inner>> : T extends schemas.ZodNullable<infer Inner> ? schemas.ZodNullable<DeepPartial<Inner>> : T extends schemas.ZodDefault<infer Inner> ? schemas.ZodDefault<DeepPartial<Inner>> : T extends schemas.ZodPrefault<infer Inner> ? schemas.ZodPrefault<DeepPartial<Inner>> : T extends schemas.ZodNonOptional<infer Inner> ? schemas.ZodNonOptional<DeepPartial<Inner>> : T extends schemas.ZodCatch<infer Inner> ? schemas.ZodCatch<DeepPartial<Inner>> : T extends schemas.ZodReadonly<infer Inner> ? schemas.ZodReadonly<DeepPartial<Inner>> : T extends schemas.ZodSuccess<infer Inner> ? schemas.ZodSuccess<DeepPartial<Inner>> : T extends schemas.ZodPromise<infer Inner> ? schemas.ZodPromise<DeepPartial<Inner>> : T extends schemas.ZodCodec<infer A, infer B> ? schemas.ZodCodec<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodPreprocess<infer B> ? schemas.ZodPreprocess<DeepPartial<B>> : T extends schemas.ZodPipe<infer A, infer B> ? schemas.ZodPipe<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodLazy<infer Inner> ? schemas.ZodLazy<DeepPartial<Inner>> : T;
/** Returns a copy of the schema with every nested object's properties made optional. */
export declare function deepPartial<T extends core.SomeType>(schema: T): DeepPartial<T>;
`,
    'file:///node_modules/zod/v4/classic/errors.d.ts': `import * as core from "../core/index.js";
import { $ZodError } from "../core/index.js";
/** @deprecated Use \`z.core.$ZodIssue\` from \`@zod/core\` instead, especially if you are building a library on top of Zod. */
export type ZodIssue = core.$ZodIssue;
/** An Error-like class used to store Zod validation issues.  */
export interface ZodError<T = unknown> extends $ZodError<T> {
    /** @deprecated Use the \`z.treeifyError(err)\` function instead. */
    format(): core.$ZodFormattedError<T>;
    format<U>(mapper: (issue: core.$ZodIssue) => U): core.$ZodFormattedError<T, U>;
    /** @deprecated Use the \`z.treeifyError(err)\` function instead. */
    flatten(): core.$ZodFlattenedError<T>;
    flatten<U>(mapper: (issue: core.$ZodIssue) => U): core.$ZodFlattenedError<T, U>;
    /** @deprecated Push directly to \`.issues\` instead. */
    addIssue(issue: core.$ZodIssue): void;
    /** @deprecated Push directly to \`.issues\` instead. */
    addIssues(issues: core.$ZodIssue[]): void;
    /** @deprecated Check \`err.issues.length === 0\` instead. */
    isEmpty: boolean;
}
export declare const ZodError: core.$constructor<ZodError>;
export declare const ZodRealError: core.$constructor<ZodError>;
/** @deprecated Use \`z.core.$ZodFlattenedError\` instead. */
export type ZodFlattenedError<T, U = string> = core.$ZodFlattenedError<T, U>;
/** @deprecated Use \`z.core.$ZodFormattedError\` instead. */
export type ZodFormattedError<T, U = string> = core.$ZodFormattedError<T, U>;
/** @deprecated Use \`z.core.$ZodErrorMap\` instead. */
export type ZodErrorMap<T extends core.$ZodIssueBase = core.$ZodIssue> = core.$ZodErrorMap<T>;
/** @deprecated Use \`z.core.$ZodRawIssue\` instead. */
export type IssueData = core.$ZodRawIssue;
`,
    'file:///node_modules/zod/v4/classic/external.d.ts': `export * as core from "../core/index.js";
export * from "./schemas.js";
export * from "./checks.js";
export * from "./errors.js";
export * from "./parse.js";
export * from "./compat.js";
export type { infer } from "../core/index.js";
export type { JSONType } from "../core/util.js";
export type { CompileOptions } from "../core/index.js";
export { globalRegistry, type GlobalMeta, registry, config, memoizer, $output, $input, $brand, clone, regexes, treeifyError, prettifyError, formatError, flattenError, TimePrecision, util, NEVER, INVALID, toZod, compile, withParser, ZodCompileAsyncError, ZodCompileUnsupportedError, getDiscriminatedOption, } from "../core/index.js";
export { toJSONSchema } from "../core/json-schema-processors.js";
export { fromJSONSchema } from "./from-json-schema.js";
export { deepPartial } from "./deep-partial.js";
export { input, output } from "./in-out.js";
export * as locales from "../locales/index.js";
export { ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration } from "./iso.js";
export * as iso from "./iso.js";
export type { ZodCoercedString, ZodCoercedNumber, ZodCoercedBigInt, ZodCoercedBoolean, ZodCoercedDate, } from "./coerce.js";
export * as coerce from "./coerce.js";
`,
    'file:///node_modules/zod/v4/classic/from-json-schema.d.ts': `import type * as JSONSchema from "../core/json-schema.js";
import { type $ZodRegistry } from "../core/registries.js";
import type { ZodType } from "./schemas.js";
type JSONSchemaVersion = "draft-2020-12" | "draft-7" | "draft-4" | "openapi-3.0";
interface FromJSONSchemaParams {
    defaultTarget?: JSONSchemaVersion;
    registry?: $ZodRegistry<any>;
}
/**
 * Converts a JSON Schema to a Zod schema. This function should be considered semi-experimental. It's behavior is liable to change. */
export declare function fromJSONSchema(schema: JSONSchema.JSONSchema | boolean, params?: FromJSONSchemaParams): ZodType;
export {};
`,
    'file:///node_modules/zod/v4/classic/in-out.d.ts': `import type * as core from "../core/index.js";
import * as schemas from "./schemas.js";
export type input<T> = core.input<T>;
export type output<T> = core.output<T>;
/** Returns a copy of the schema with every pipe replaced by its input side. A codec's checks are dropped: they constrain the decoded value the input side never produces. */
export declare function input<T extends core.$ZodType>(schema: T): schemas.ZodType<core.input<T>, core.input<T>>;
/** Returns a copy of the schema with every pipe replaced by its output side, carrying over the pipe's own checks. */
export declare function output<T extends core.$ZodType>(schema: T): schemas.ZodType<core.output<T>, core.output<T>>;
`,
    'file:///node_modules/zod/v4/classic/index.d.ts': `import * as z from "./external.js";
export * from "./external.js";
export { z, z as default };
`,
    'file:///node_modules/zod/v4/classic/iso.d.ts': `import * as core from "../core/index.js";
import { ZodISODate, ZodISODateTime, ZodISODuration, ZodISOTime } from "./schemas.js";
export { ZodISODate, ZodISODateTime, ZodISODuration, ZodISOTime } from "./schemas.js";
export declare function datetime(params?: string | core.$ZodISODateTimeParams): ZodISODateTime;
export declare function date(params?: string | core.$ZodISODateParams): ZodISODate;
export declare function time(params?: string | core.$ZodISOTimeParams): ZodISOTime;
export declare function duration(params?: string | core.$ZodISODurationParams): ZodISODuration;
`,
    'file:///node_modules/zod/v4/classic/parse.d.ts': `import * as core from "../core/index.js";
import { type ZodError } from "./errors.js";
export type ZodSafeParseResult<T> = ZodSafeParseSuccess<T> | ZodSafeParseError<T>;
export type ZodSafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
export type ZodSafeParseError<T> = {
    success: false;
    data?: never;
    error: ZodError<T>;
};
export declare const parse: <T extends core.$ZodType>(schema: T, value: unknown, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => core.output<T>;
export declare const parseAsync: <T extends core.$ZodType>(schema: T, value: unknown, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => Promise<core.output<T>>;
export declare const safeParse: <T extends core.$ZodType>(schema: T, value: unknown, _ctx?: core.ParseContext<core.$ZodIssue>) => ZodSafeParseResult<core.output<T>>;
export declare const safeParseAsync: <T extends core.$ZodType>(schema: T, value: unknown, _ctx?: core.ParseContext<core.$ZodIssue>) => Promise<ZodSafeParseResult<core.output<T>>>;
export { validate, validateAsync } from "../core/index.js";
export declare const encode: <T extends core.$ZodType>(schema: T, value: core.output<T>, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => core.input<T>;
export declare const decode: <T extends core.$ZodType>(schema: T, value: core.input<T>, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => core.output<T>;
export declare const encodeAsync: <T extends core.$ZodType>(schema: T, value: core.output<T>, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => Promise<core.input<T>>;
export declare const decodeAsync: <T extends core.$ZodType>(schema: T, value: core.input<T>, _ctx?: core.ParseContext<core.$ZodIssue>, _params?: {
    callee?: core.util.AnyFunc;
    Err?: core.$ZodErrorClass;
}) => Promise<core.output<T>>;
export declare const safeEncode: <T extends core.$ZodType>(schema: T, value: core.output<T>, _ctx?: core.ParseContext<core.$ZodIssue>) => ZodSafeParseResult<core.input<T>>;
export declare const safeDecode: <T extends core.$ZodType>(schema: T, value: core.input<T>, _ctx?: core.ParseContext<core.$ZodIssue>) => ZodSafeParseResult<core.output<T>>;
export declare const safeEncodeAsync: <T extends core.$ZodType>(schema: T, value: core.output<T>, _ctx?: core.ParseContext<core.$ZodIssue>) => Promise<ZodSafeParseResult<core.input<T>>>;
export declare const safeDecodeAsync: <T extends core.$ZodType>(schema: T, value: core.input<T>, _ctx?: core.ParseContext<core.$ZodIssue>) => Promise<ZodSafeParseResult<core.output<T>>>;
`,
    'file:///node_modules/zod/v4/classic/schemas.d.ts': `import type { $ZodBigIntFormats } from "../core/checks.js";
import * as core from "../core/index.js";
import { util, type $ZodNumberFormats } from "../core/index.js";
import type { StandardSchemaWithJSONProps } from "../core/standard-schema.js";
import * as parse from "./parse.js";
export type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<core.input<T>, core.output<T>>;
export interface ZodType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
    def: Internals["def"];
    type: Internals["def"]["type"];
    /** @deprecated Use \`.def\` instead. */
    _def: Internals["def"];
    /** @deprecated Use \`z.output<typeof schema>\` instead. */
    _output: Internals["output"];
    /** @deprecated Use \`z.input<typeof schema>\` instead. */
    _input: Internals["input"];
    "~standard": ZodStandardSchemaWithJSON<this>;
    /** Converts this schema to a JSON Schema representation. */
    toJSONSchema(params?: core.ToJSONSchemaParams): core.ZodStandardJSONSchemaPayload<this>;
    check(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    with(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends core.$ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [core.$replace<R["_meta"], this>?] : [core.$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : core.$ZodBranded<this, T, Dir>;
    parse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): core.output<this>;
    safeParse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.output<this>>;
    parseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<core.output<this>>;
    safeParseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.output<this>>>;
    spa: (data: unknown, params?: core.ParseContext<core.$ZodIssue>) => Promise<parse.ZodSafeParseResult<core.output<this>>>;
    validate(data: unknown, params?: core.ParseContext<core.$ZodIssue>): data is core.input<this>;
    validateAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<boolean>;
    encode(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): core.input<this>;
    decode(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): core.output<this>;
    encodeAsync(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<core.input<this>>;
    decodeAsync(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<core.output<this>>;
    safeEncode(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.input<this>>;
    safeDecode(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): parse.ZodSafeParseResult<core.output<this>>;
    safeEncodeAsync(data: core.output<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.input<this>>>;
    safeDecodeAsync(data: core.input<this>, params?: core.ParseContext<core.$ZodIssue>): Promise<parse.ZodSafeParseResult<core.output<this>>>;
    refine<Ch extends (arg: core.output<this>) => unknown | Promise<unknown>>(check: Ch, params?: string | core.$ZodCustomParams): Ch extends (arg: any) => arg is infer R ? this & ZodType<R, core.input<this>> : this;
    superRefine(refinement: (arg: core.output<this>, ctx: core.$RefinementCtx<core.output<this>>) => void | Promise<void>, params?: core.$ZodSuperRefineParams): this;
    overwrite(fn: (x: core.output<this>) => core.output<this>): this;
    optional(): ZodOptional<this>;
    exactOptional(): ZodExactOptional<this>;
    nonoptional(params?: string | core.$ZodNonOptionalParams): ZodNonOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    default(def: util.NoUndefined<core.output<this>>): ZodDefault<this>;
    default(def: () => util.NoUndefined<core.output<this>>): ZodDefault<this>;
    prefault(def: () => core.input<this>): ZodPrefault<this>;
    prefault(def: core.input<this>): ZodPrefault<this>;
    array(): ZodArray<this>;
    or<T extends core.SomeType>(option: T): ZodUnion<[this, T]>;
    and<T extends core.SomeType>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: core.output<this>, ctx: core.$RefinementCtx<core.output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, core.output<this>>>;
    catch(def: core.output<this>): ZodCatch<this>;
    catch(def: (ctx: core.$ZodCatchCtx) => core.output<this>): ZodCatch<this>;
    pipe<T extends core.$ZodType<any, core.output<this>>>(target: T | core.$ZodType<any, core.output<this>>): ZodPipe<this, T>;
    readonly(): ZodReadonly<this>;
    /** Returns a new instance that has been registered in \`z.globalRegistry\` with the specified description */
    describe(description: string): this;
    description?: string;
    /** Returns the metadata associated with this instance in \`z.globalRegistry\` */
    meta(): core.$replace<core.GlobalMeta, this> | undefined;
    /** Returns a new instance that has been registered in \`z.globalRegistry\` with the specified metadata */
    meta(data: core.$replace<core.GlobalMeta, this>): this;
    /** @deprecated Try safe-parsing \`undefined\` (this is what \`isOptional\` does internally):
     *
     * \`\`\`ts
     * const schema = z.string().optional();
     * const isOptional = schema.safeParse(undefined).success; // true
     * \`\`\`
     */
    isOptional(): boolean;
    /**
     * @deprecated Try safe-parsing \`null\` (this is what \`isNullable\` does internally):
     *
     * \`\`\`ts
     * const schema = z.string().nullable();
     * const isNullable = schema.safeParse(null).success; // true
     * \`\`\`
     */
    isNullable(): boolean;
    apply<T, TArgs extends unknown[] = []>(fn: (schema: this, ...args: TArgs) => T, ...args: TArgs): T;
}
export interface _ZodType<out Internals extends core.$ZodTypeInternals = core.$ZodTypeInternals> extends ZodType<any, any, Internals> {
}
export declare const ZodType: core.$constructor<ZodType>;
export interface _ZodString<T extends core.$ZodStringInternals<unknown> = core.$ZodStringInternals<unknown>> extends _ZodType<T> {
    format: string | null;
    minLength: number | null;
    maxLength: number | null;
    regex(regex: RegExp, params?: string | core.$ZodCheckRegexParams): this;
    includes(value: string, params?: string | core.$ZodCheckIncludesParams): this;
    startsWith(value: string, params?: string | core.$ZodCheckStartsWithParams): this;
    endsWith(value: string, params?: string | core.$ZodCheckEndsWithParams): this;
    min(minLength: number, params?: string | core.$ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | core.$ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | core.$ZodCheckLengthEqualsParams): this;
    nonempty(params?: string | core.$ZodCheckMinLengthParams): this;
    lowercase(params?: string | core.$ZodCheckLowerCaseParams): this;
    uppercase(params?: string | core.$ZodCheckUpperCaseParams): this;
    trim(): this;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): this;
    toLowerCase(): this;
    toUpperCase(): this;
    slugify(): this;
}
/** @internal */
export declare const _ZodString: core.$constructor<_ZodString>;
export interface ZodString extends _ZodString<core.$ZodStringInternals<string>> {
    /** @deprecated Use \`z.email()\` instead. */
    email(params?: string | core.$ZodCheckEmailParams): this;
    /** @deprecated Use \`z.url()\` instead. */
    url(params?: string | core.$ZodCheckURLParams): this;
    /** @deprecated Use \`z.jwt()\` instead. */
    jwt(params?: string | core.$ZodCheckJWTParams): this;
    /** @deprecated Use \`z.emoji()\` instead. */
    emoji(params?: string | core.$ZodCheckEmojiParams): this;
    /** @deprecated Use \`z.guid()\` instead. */
    guid(params?: string | core.$ZodCheckGUIDParams): this;
    /** @deprecated Use \`z.uuid()\` instead. */
    uuid(params?: string | core.$ZodCheckUUIDParams): this;
    /** @deprecated Use \`z.uuid()\` instead. */
    uuidv4(params?: string | core.$ZodCheckUUIDParams): this;
    /** @deprecated Use \`z.uuid()\` instead. */
    uuidv6(params?: string | core.$ZodCheckUUIDParams): this;
    /** @deprecated Use \`z.uuid()\` instead. */
    uuidv7(params?: string | core.$ZodCheckUUIDParams): this;
    /** @deprecated Use \`z.nanoid()\` instead. */
    nanoid(params?: string | core.$ZodCheckNanoIDParams): this;
    /** @deprecated Use \`z.guid()\` instead. */
    guid(params?: string | core.$ZodCheckGUIDParams): this;
    /**
     * @deprecated CUID v1 is deprecated by its authors due to information leakage
     * (timestamps embedded in the id). Use \`z.cuid2()\` instead.
     * See https://github.com/paralleldrive/cuid.
     */
    cuid(params?: string | core.$ZodCheckCUIDParams): this;
    /** @deprecated Use \`z.cuid2()\` instead. */
    cuid2(params?: string | core.$ZodCheckCUID2Params): this;
    /** @deprecated Use \`z.ulid()\` instead. */
    ulid(params?: string | core.$ZodCheckULIDParams): this;
    /** @deprecated Use \`z.base64()\` instead. */
    base64(params?: string | core.$ZodCheckBase64Params): this;
    /** @deprecated Use \`z.base64url()\` instead. */
    base64url(params?: string | core.$ZodCheckBase64URLParams): this;
    /** @deprecated Use \`z.xid()\` instead. */
    xid(params?: string | core.$ZodCheckXIDParams): this;
    /** @deprecated Use \`z.ksuid()\` instead. */
    ksuid(params?: string | core.$ZodCheckKSUIDParams): this;
    /** @deprecated Use \`z.ipv4()\` instead. */
    ipv4(params?: string | core.$ZodCheckIPv4Params): this;
    /** @deprecated Use \`z.ipv6()\` instead. */
    ipv6(params?: string | core.$ZodCheckIPv6Params): this;
    /** @deprecated Use \`z.cidrv4()\` instead. */
    cidrv4(params?: string | core.$ZodCheckCIDRv4Params): this;
    /** @deprecated Use \`z.cidrv6()\` instead. */
    cidrv6(params?: string | core.$ZodCheckCIDRv6Params): this;
    /** @deprecated Use \`z.e164()\` instead. */
    e164(params?: string | core.$ZodCheckE164Params): this;
    /** @deprecated Use \`z.iso.datetime()\` instead. */
    datetime(params?: string | core.$ZodCheckISODateTimeParams): this;
    /** @deprecated Use \`z.iso.date()\` instead. */
    date(params?: string | core.$ZodCheckISODateParams): this;
    /** @deprecated Use \`z.iso.time()\` instead. */
    time(params?: string | core.$ZodCheckISOTimeParams): this;
    /** @deprecated Use \`z.iso.duration()\` instead. */
    duration(params?: string | core.$ZodCheckISODurationParams): this;
}
export declare const ZodString: core.$constructor<ZodString>;
export declare function string(params?: string | core.$ZodStringParams): ZodString;
export declare function string<T extends string>(params?: string | core.$ZodStringParams): core.$ZodType<T, T>;
export interface ZodStringFormat<Format extends string = string> extends _ZodString<core.$ZodStringFormatInternals<Format>> {
}
export declare const ZodStringFormat: core.$constructor<ZodStringFormat>;
export interface ZodISODateTime extends ZodStringFormat {
    _zod: core.$ZodISODateTimeInternals;
}
export declare const ZodISODateTime: core.$constructor<ZodISODateTime>;
export interface ZodISODate extends ZodStringFormat {
    _zod: core.$ZodISODateInternals;
}
export declare const ZodISODate: core.$constructor<ZodISODate>;
export interface ZodISOTime extends ZodStringFormat {
    _zod: core.$ZodISOTimeInternals;
}
export declare const ZodISOTime: core.$constructor<ZodISOTime>;
export interface ZodISODuration extends ZodStringFormat {
    _zod: core.$ZodISODurationInternals;
}
export declare const ZodISODuration: core.$constructor<ZodISODuration>;
export interface ZodEmail extends ZodStringFormat<"email"> {
    _zod: core.$ZodEmailInternals;
}
export declare const ZodEmail: core.$constructor<ZodEmail>;
export declare function email(params?: string | core.$ZodEmailParams): ZodEmail;
export interface ZodGUID extends ZodStringFormat<"guid"> {
    _zod: core.$ZodGUIDInternals;
}
export declare const ZodGUID: core.$constructor<ZodGUID>;
export declare function guid(params?: string | core.$ZodGUIDParams): ZodGUID;
export interface ZodUUID extends ZodStringFormat<"uuid"> {
    _zod: core.$ZodUUIDInternals;
}
export declare const ZodUUID: core.$constructor<ZodUUID>;
export declare function uuid(params?: string | core.$ZodUUIDParams): ZodUUID;
export declare function uuidv4(params?: string | core.$ZodUUIDv4Params): ZodUUID;
export declare function uuidv6(params?: string | core.$ZodUUIDv6Params): ZodUUID;
export declare function uuidv7(params?: string | core.$ZodUUIDv7Params): ZodUUID;
export interface ZodURL extends ZodStringFormat<"url"> {
    _zod: core.$ZodURLInternals;
}
export declare const ZodURL: core.$constructor<ZodURL>;
export declare function url(params?: string | core.$ZodURLParams): ZodURL;
export declare function httpUrl(params?: string | Omit<core.$ZodURLParams, "protocol" | "hostname">): ZodURL;
export interface ZodEmoji extends ZodStringFormat<"emoji"> {
    _zod: core.$ZodEmojiInternals;
}
export declare const ZodEmoji: core.$constructor<ZodEmoji>;
export declare function emoji(params?: string | core.$ZodEmojiParams): ZodEmoji;
export interface ZodNanoID extends ZodStringFormat<"nanoid"> {
    _zod: core.$ZodNanoIDInternals;
}
export declare const ZodNanoID: core.$constructor<ZodNanoID>;
export declare function nanoid(params?: string | core.$ZodNanoIDParams): ZodNanoID;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export interface ZodCUID extends ZodStringFormat<"cuid"> {
    _zod: core.$ZodCUIDInternals;
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare const ZodCUID: core.$constructor<ZodCUID>;
/**
 * Validates a CUID v1 string.
 *
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2 | \`z.cuid2()\`} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare function cuid(params?: string | core.$ZodCUIDParams): ZodCUID;
export interface ZodCUID2 extends ZodStringFormat<"cuid2"> {
    _zod: core.$ZodCUID2Internals;
}
export declare const ZodCUID2: core.$constructor<ZodCUID2>;
export declare function cuid2(params?: string | core.$ZodCUID2Params): ZodCUID2;
export interface ZodULID extends ZodStringFormat<"ulid"> {
    _zod: core.$ZodULIDInternals;
}
export declare const ZodULID: core.$constructor<ZodULID>;
export declare function ulid(params?: string | core.$ZodULIDParams): ZodULID;
export interface ZodXID extends ZodStringFormat<"xid"> {
    _zod: core.$ZodXIDInternals;
}
export declare const ZodXID: core.$constructor<ZodXID>;
export declare function xid(params?: string | core.$ZodXIDParams): ZodXID;
export interface ZodKSUID extends ZodStringFormat<"ksuid"> {
    _zod: core.$ZodKSUIDInternals;
}
export declare const ZodKSUID: core.$constructor<ZodKSUID>;
export declare function ksuid(params?: string | core.$ZodKSUIDParams): ZodKSUID;
export interface ZodIPv4 extends ZodStringFormat<"ipv4"> {
    _zod: core.$ZodIPv4Internals;
}
export declare const ZodIPv4: core.$constructor<ZodIPv4>;
export declare function ipv4(params?: string | core.$ZodIPv4Params): ZodIPv4;
export interface ZodMAC extends ZodStringFormat<"mac"> {
    _zod: core.$ZodMACInternals;
}
export declare const ZodMAC: core.$constructor<ZodMAC>;
export declare function mac(params?: string | core.$ZodMACParams): ZodMAC;
export interface ZodIPv6 extends ZodStringFormat<"ipv6"> {
    _zod: core.$ZodIPv6Internals;
}
export declare const ZodIPv6: core.$constructor<ZodIPv6>;
export declare function ipv6(params?: string | core.$ZodIPv6Params): ZodIPv6;
export interface ZodCIDRv4 extends ZodStringFormat<"cidrv4"> {
    _zod: core.$ZodCIDRv4Internals;
}
export declare const ZodCIDRv4: core.$constructor<ZodCIDRv4>;
export declare function cidrv4(params?: string | core.$ZodCIDRv4Params): ZodCIDRv4;
export interface ZodCIDRv6 extends ZodStringFormat<"cidrv6"> {
    _zod: core.$ZodCIDRv6Internals;
}
export declare const ZodCIDRv6: core.$constructor<ZodCIDRv6>;
export declare function cidrv6(params?: string | core.$ZodCIDRv6Params): ZodCIDRv6;
export interface ZodBase64 extends ZodStringFormat<"base64"> {
    _zod: core.$ZodBase64Internals;
}
export declare const ZodBase64: core.$constructor<ZodBase64>;
export declare function base64(params?: string | core.$ZodBase64Params): ZodBase64;
export interface ZodBase64URL extends ZodStringFormat<"base64url"> {
    _zod: core.$ZodBase64URLInternals;
}
export declare const ZodBase64URL: core.$constructor<ZodBase64URL>;
export declare function base64url(params?: string | core.$ZodBase64URLParams): ZodBase64URL;
export interface ZodE164 extends ZodStringFormat<"e164"> {
    _zod: core.$ZodE164Internals;
}
export declare const ZodE164: core.$constructor<ZodE164>;
export declare function e164(params?: string | core.$ZodE164Params): ZodE164;
export interface ZodCreditCard extends ZodStringFormat<"credit_card"> {
    _zod: core.$ZodCreditCardInternals;
}
export declare const ZodCreditCard: core.$constructor<ZodCreditCard>;
export declare function creditCard(params?: string | core.$ZodCreditCardParams): ZodCreditCard;
export interface ZodIBAN extends ZodStringFormat<"iban"> {
    _zod: core.$ZodIBANInternals;
}
export declare const ZodIBAN: core.$constructor<ZodIBAN>;
export declare function iban(params?: string | core.$ZodIBANParams): ZodIBAN;
export interface ZodJWT extends ZodStringFormat<"jwt"> {
    _zod: core.$ZodJWTInternals;
}
export declare const ZodJWT: core.$constructor<ZodJWT>;
export declare function jwt(params?: string | core.$ZodJWTParams): ZodJWT;
export interface ZodCustomStringFormat<Format extends string = string> extends ZodStringFormat<Format>, core.$ZodCustomStringFormat<Format> {
    _zod: core.$ZodCustomStringFormatInternals<Format>;
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodCustomStringFormat: core.$constructor<ZodCustomStringFormat>;
export declare function stringFormat<Format extends string>(format: Format, fnOrRegex: ((arg: string) => util.MaybeAsync<unknown>) | RegExp, _params?: string | core.$ZodStringFormatParams): ZodCustomStringFormat<Format>;
export declare function hostname(_params?: string | core.$ZodStringFormatParams): ZodCustomStringFormat<"hostname">;
export declare function hex(_params?: string | core.$ZodStringFormatParams): ZodCustomStringFormat<"hex">;
export declare function currencyCode(_params?: string | core.$ZodStringFormatParams): ZodCustomStringFormat<"currency_code">;
export declare function hash<Alg extends util.HashAlgorithm, Enc extends util.HashEncoding = "hex">(alg: Alg, params?: {
    enc?: Enc;
} & core.$ZodStringFormatParams): ZodCustomStringFormat<\`\${Alg}_\${Enc}\`>;
export interface _ZodNumber<Internals extends core.$ZodNumberInternals = core.$ZodNumberInternals> extends _ZodType<Internals> {
    gt(value: number, params?: string | core.$ZodCheckGreaterThanParams): this;
    /** Identical to .min() */
    gte(value: number, params?: string | core.$ZodCheckGreaterThanParams): this;
    min(value: number, params?: string | core.$ZodCheckGreaterThanParams): this;
    lt(value: number, params?: string | core.$ZodCheckLessThanParams): this;
    /** Identical to .max() */
    lte(value: number, params?: string | core.$ZodCheckLessThanParams): this;
    max(value: number, params?: string | core.$ZodCheckLessThanParams): this;
    /** Consider \`z.int()\` instead. This API is considered *legacy*; it will never be removed but a better alternative exists. */
    int(params?: string | core.$ZodCheckNumberFormatParams): this;
    /** @deprecated This is now identical to \`.int()\`. Only numbers in the safe integer range are accepted. */
    safe(params?: string | core.$ZodCheckNumberFormatParams): this;
    positive(params?: string | core.$ZodCheckGreaterThanParams): this;
    nonnegative(params?: string | core.$ZodCheckGreaterThanParams): this;
    negative(params?: string | core.$ZodCheckLessThanParams): this;
    nonpositive(params?: string | core.$ZodCheckLessThanParams): this;
    multipleOf(value: number, params?: string | core.$ZodCheckMultipleOfParams): this;
    /** @deprecated Use \`.multipleOf()\` instead. */
    step(value: number, params?: string | core.$ZodCheckMultipleOfParams): this;
    /** @deprecated In v4 and later, z.number() does not allow infinite values by default. This is a no-op. */
    finite(params?: unknown): this;
    minValue: number | null;
    maxValue: number | null;
    /** @deprecated Check the \`format\` property instead.  */
    isInt: boolean;
    /** @deprecated Number schemas no longer accept infinite values, so this always returns \`true\`. */
    isFinite: boolean;
    format: string | null;
}
export interface ZodNumber extends _ZodNumber<core.$ZodNumberInternals<number>> {
}
export declare const ZodNumber: core.$constructor<ZodNumber>;
export declare function number(params?: string | core.$ZodNumberParams): ZodNumber;
export interface ZodNumberFormat<Format extends $ZodNumberFormats = $ZodNumberFormats> extends ZodNumber {
    _zod: core.$ZodNumberFormatInternals<Format>;
}
export declare const ZodNumberFormat: core.$constructor<ZodNumberFormat>;
export interface ZodInt extends ZodNumberFormat<"safeint"> {
}
export declare function int(params?: string | core.$ZodCheckNumberFormatParams): ZodInt;
export interface ZodFloat32 extends ZodNumberFormat<"float32"> {
}
export declare function float32(params?: string | core.$ZodCheckNumberFormatParams): ZodFloat32;
export interface ZodFloat64 extends ZodNumberFormat<"float64"> {
}
export declare function float64(params?: string | core.$ZodCheckNumberFormatParams): ZodFloat64;
export interface ZodInt32 extends ZodNumberFormat<"int32"> {
}
export declare function int32(params?: string | core.$ZodCheckNumberFormatParams): ZodInt32;
export interface ZodUInt32 extends ZodNumberFormat<"uint32"> {
}
export declare function uint32(params?: string | core.$ZodCheckNumberFormatParams): ZodUInt32;
export interface _ZodBoolean<T extends core.$ZodBooleanInternals = core.$ZodBooleanInternals> extends _ZodType<T> {
}
export interface ZodBoolean extends _ZodBoolean<core.$ZodBooleanInternals<boolean>> {
}
export declare const ZodBoolean: core.$constructor<ZodBoolean>;
export declare function boolean(params?: string | core.$ZodBooleanParams): ZodBoolean;
export interface _ZodBigInt<T extends core.$ZodBigIntInternals = core.$ZodBigIntInternals> extends _ZodType<T> {
    gte(value: bigint, params?: string | core.$ZodCheckGreaterThanParams): this;
    /** Alias of \`.gte()\` */
    min(value: bigint, params?: string | core.$ZodCheckGreaterThanParams): this;
    gt(value: bigint, params?: string | core.$ZodCheckGreaterThanParams): this;
    /** Alias of \`.lte()\` */
    lte(value: bigint, params?: string | core.$ZodCheckLessThanParams): this;
    max(value: bigint, params?: string | core.$ZodCheckLessThanParams): this;
    lt(value: bigint, params?: string | core.$ZodCheckLessThanParams): this;
    positive(params?: string | core.$ZodCheckGreaterThanParams): this;
    negative(params?: string | core.$ZodCheckLessThanParams): this;
    nonpositive(params?: string | core.$ZodCheckLessThanParams): this;
    nonnegative(params?: string | core.$ZodCheckGreaterThanParams): this;
    multipleOf(value: bigint, params?: string | core.$ZodCheckMultipleOfParams): this;
    minValue: bigint | null;
    maxValue: bigint | null;
    format: string | null;
}
export interface ZodBigInt extends _ZodBigInt<core.$ZodBigIntInternals<bigint>> {
}
export declare const ZodBigInt: core.$constructor<ZodBigInt>;
export declare function bigint(params?: string | core.$ZodBigIntParams): ZodBigInt;
export interface ZodBigIntFormat<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends ZodBigInt {
    _zod: core.$ZodBigIntFormatInternals<Format>;
}
export declare const ZodBigIntFormat: core.$constructor<ZodBigIntFormat>;
export interface ZodInt64 extends ZodBigIntFormat<"int64"> {
}
export declare function int64(params?: string | core.$ZodBigIntFormatParams): ZodInt64;
export interface ZodUInt64 extends ZodBigIntFormat<"uint64"> {
}
export declare function uint64(params?: string | core.$ZodBigIntFormatParams): ZodUInt64;
export interface ZodSymbol extends _ZodType<core.$ZodSymbolInternals> {
}
export declare const ZodSymbol: core.$constructor<ZodSymbol>;
export declare function symbol(params?: string | core.$ZodSymbolParams): ZodSymbol;
export interface ZodUndefined extends _ZodType<core.$ZodUndefinedInternals> {
}
export declare const ZodUndefined: core.$constructor<ZodUndefined>;
declare function _undefined(params?: string | core.$ZodUndefinedParams): ZodUndefined;
export { _undefined as undefined };
export interface ZodNull extends _ZodType<core.$ZodNullInternals> {
}
export declare const ZodNull: core.$constructor<ZodNull>;
declare function _null(params?: string | core.$ZodNullParams): ZodNull;
export { _null as null };
export interface ZodAny extends _ZodType<core.$ZodAnyInternals> {
}
export declare const ZodAny: core.$constructor<ZodAny>;
export declare function any(): ZodAny;
export interface ZodUnknown extends _ZodType<core.$ZodUnknownInternals> {
}
export declare const ZodUnknown: core.$constructor<ZodUnknown>;
export declare function unknown(): ZodUnknown;
export interface ZodNever extends _ZodType<core.$ZodNeverInternals> {
}
export declare const ZodNever: core.$constructor<ZodNever>;
export declare function never(params?: string | core.$ZodNeverParams): ZodNever;
export interface ZodVoid extends _ZodType<core.$ZodVoidInternals> {
}
export declare const ZodVoid: core.$constructor<ZodVoid>;
declare function _void(params?: string | core.$ZodVoidParams): ZodVoid;
export { _void as void };
export interface _ZodDate<T extends core.$ZodDateInternals = core.$ZodDateInternals> extends _ZodType<T> {
    min(value: number | Date, params?: string | core.$ZodCheckGreaterThanParams): this;
    max(value: number | Date, params?: string | core.$ZodCheckLessThanParams): this;
    /** @deprecated Not recommended. */
    minDate: Date | null;
    /** @deprecated Not recommended. */
    maxDate: Date | null;
}
export interface ZodDate extends _ZodDate<core.$ZodDateInternals<Date>> {
}
export declare const ZodDate: core.$constructor<ZodDate>;
export declare function date(params?: string | core.$ZodDateParams): ZodDate;
export interface ZodArray<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodArrayInternals<T>>, core.$ZodArray<T> {
    element: T;
    min(minLength: number, params?: string | core.$ZodCheckMinLengthParams): this;
    nonempty(params?: string | core.$ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | core.$ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | core.$ZodCheckLengthEqualsParams): this;
    unwrap(): T;
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodArray: core.$constructor<ZodArray>;
export declare function array<T extends core.SomeType>(element: T, params?: string | core.$ZodArrayParams): ZodArray<T>;
export declare function keyof<T extends ZodObject>(schema: T): ZodEnum<util.KeysEnum<T["_zod"]["output"]>>;
export type SafeExtendShape<Base extends core.$ZodShape, Ext extends core.$ZodLooseShape> = {
    [K in keyof Ext]: K extends keyof Base ? core.output<Ext[K]> extends core.output<Base[K]> ? core.input<Ext[K]> extends core.input<Base[K]> ? Ext[K] : never : never : Ext[K];
};
export interface ZodObject<
/** @ts-ignore Cast variance */
out Shape extends core.$ZodShape = core.$ZodLooseShape, out Config extends core.$ZodObjectConfig = core.$strip> extends _ZodType<core.$ZodObjectInternals<Shape, Config>>, core.$ZodObject<Shape, Config> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    shape: Shape;
    keyof(): ZodEnum<util.ToEnum<keyof Shape & string>>;
    /** Define a schema to validate all unrecognized keys. This overrides the existing strict/loose behavior. */
    catchall<T extends core.SomeType>(schema: T): ZodObject<Shape, core.$catchall<T>>;
    /** @deprecated Use \`z.looseObject()\` or \`.loose()\` instead. */
    passthrough(): ZodObject<Shape, core.$loose>;
    /** Consider \`z.looseObject(A.shape)\` instead */
    loose(): ZodObject<Shape, core.$loose>;
    /** Consider \`z.strictObject(A.shape)\` instead */
    strict(): ZodObject<Shape, core.$strict>;
    /** This is the default behavior. This method call is likely unnecessary. */
    strip(): ZodObject<Shape, core.$strip>;
    extend<U extends core.$ZodLooseShape>(shape: U): ZodObject<util.Extend<Shape, util.Writeable<U>>, Config>;
    safeExtend<U extends core.$ZodLooseShape>(shape: SafeExtendShape<Shape, U> & Partial<Record<keyof Shape, core.SomeType>>): ZodObject<util.Extend<Shape, util.Writeable<U>>, Config>;
    /**
     * @deprecated Use [\`A.extend(B.shape)\`](https://zod.dev/api?id=extend) instead.
     */
    merge<U extends ZodObject>(other: U): ZodObject<util.Extend<Shape, U["shape"]>, U["_zod"]["config"]>;
    pick<M extends util.Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<util.Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    omit<M extends util.Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<util.Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    partial(): ZodObject<{
        -readonly [k in keyof Shape]: ZodOptional<Shape[k]>;
    }, Config>;
    partial<M extends util.Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        -readonly [k in keyof Shape]: k extends keyof M ? ZodOptional<Shape[k]> : Shape[k];
    }, Config>;
    exactPartial(): ZodObject<{
        -readonly [k in keyof Shape]: ZodExactOptional<Shape[k]>;
    }, Config>;
    exactPartial<M extends util.Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        -readonly [k in keyof Shape]: k extends keyof M ? ZodExactOptional<Shape[k]> : Shape[k];
    }, Config>;
    required(): ZodObject<{
        -readonly [k in keyof Shape]: ZodNonOptional<Shape[k]>;
    }, Config>;
    required<M extends util.Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        -readonly [k in keyof Shape]: k extends keyof M ? ZodNonOptional<Shape[k]> : Shape[k];
    }, Config>;
}
export declare const ZodObject: core.$constructor<ZodObject>;
export declare function object<T extends core.$ZodLooseShape = Partial<Record<never, core.SomeType>>>(shape?: T, params?: string | core.$ZodObjectParams): ZodObject<util.Writeable<T>, core.$strip>;
export declare function strictObject<T extends core.$ZodLooseShape>(shape: T, params?: string | core.$ZodObjectParams): ZodObject<util.Writeable<T>, core.$strict>;
export declare function looseObject<T extends core.$ZodLooseShape>(shape: T, params?: string | core.$ZodObjectParams): ZodObject<util.Writeable<T>, core.$loose>;
export interface ZodUnion<T extends readonly core.SomeType[] = readonly core.$ZodType[]> extends _ZodType<core.$ZodUnionInternals<T>>, core.$ZodUnion<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    options: T;
}
export declare const ZodUnion: core.$constructor<ZodUnion>;
export declare function union<const T extends readonly core.SomeType[]>(options: T, params?: string | core.$ZodUnionParams): ZodUnion<T>;
export interface ZodXor<T extends readonly core.SomeType[] = readonly core.$ZodType[]> extends _ZodType<core.$ZodXorInternals<T>>, core.$ZodXor<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    options: T;
}
export declare const ZodXor: core.$constructor<ZodXor>;
/** Creates an exclusive union (XOR) where exactly one option must match.
 * Unlike regular unions that succeed when any option matches, xor fails if
 * zero or more than one option matches the input. */
export declare function xor<const T extends readonly core.SomeType[]>(options: T, params?: string | core.$ZodXorParams): ZodXor<T>;
export interface ZodDiscriminatedUnion<Options extends readonly core.SomeType[] = readonly core.$ZodType[], Disc extends string = string> extends ZodUnion<Options>, core.$ZodDiscriminatedUnion<Options, Disc> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _zod: core.$ZodDiscriminatedUnionInternals<Options, Disc>;
    def: core.$ZodDiscriminatedUnionDef<Options, Disc>;
}
export declare const ZodDiscriminatedUnion: core.$constructor<ZodDiscriminatedUnion>;
export declare function discriminatedUnion<Types extends readonly [core.$ZodTypeDiscriminable, ...core.$ZodTypeDiscriminable[]], Disc extends string>(discriminator: Disc, options: Types, params?: string | core.$ZodDiscriminatedUnionParams): ZodDiscriminatedUnion<Types, Disc>;
export interface ZodIntersection<A extends core.SomeType = core.$ZodType, B extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodIntersectionInternals<A, B>>, core.$ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodIntersection: core.$constructor<ZodIntersection>;
export declare function intersection<T extends core.SomeType, U extends core.SomeType>(left: T, right: U): ZodIntersection<T, U>;
export interface ZodTuple<T extends util.TupleItems = readonly core.$ZodType[], Rest extends core.SomeType | null = core.$ZodType | null> extends _ZodType<core.$ZodTupleInternals<T, Rest>>, core.$ZodTuple<T, Rest> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    rest<Rest extends core.SomeType = core.$ZodType>(rest: Rest): ZodTuple<T, Rest>;
    partial(): ZodTuple<{
        -readonly [k in keyof T]: ZodOptional<T[k]>;
    }, Rest>;
}
export declare const ZodTuple: core.$constructor<ZodTuple>;
export declare function tuple<T extends readonly [core.SomeType, ...core.SomeType[]]>(items: T, params?: string | core.$ZodTupleParams): ZodTuple<T, null>;
export declare function tuple<T extends readonly [core.SomeType, ...core.SomeType[]], Rest extends core.SomeType>(items: T, rest: Rest, params?: string | core.$ZodTupleParams): ZodTuple<T, Rest>;
export declare function tuple(items: [], params?: string | core.$ZodTupleParams): ZodTuple<[], null>;
export interface ZodRecord<Key extends core.$ZodRecordKey = core.$ZodRecordKey, Value extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodRecordInternals<Key, Value>>, core.$ZodRecord<Key, Value> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    keyType: Key;
    valueType: Value;
}
export declare const ZodRecord: core.$constructor<ZodRecord>;
export declare function record<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
export declare function partialRecord<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key & core.$partial, Value>;
export declare function looseRecord<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
export interface ZodMap<Key extends core.SomeType = core.$ZodType, Value extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodMapInternals<Key, Value>>, core.$ZodMap<Key, Value> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    keyType: Key;
    valueType: Value;
    min(minSize: number, params?: string | core.$ZodCheckMinSizeParams): this;
    nonempty(params?: string | core.$ZodCheckMinSizeParams): this;
    max(maxSize: number, params?: string | core.$ZodCheckMaxSizeParams): this;
    size(size: number, params?: string | core.$ZodCheckSizeEqualsParams): this;
}
export declare const ZodMap: core.$constructor<ZodMap>;
export declare function map<Key extends core.SomeType, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodMapParams): ZodMap<Key, Value>;
export interface ZodSet<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodSetInternals<T>>, core.$ZodSet<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    min(minSize: number, params?: string | core.$ZodCheckMinSizeParams): this;
    nonempty(params?: string | core.$ZodCheckMinSizeParams): this;
    max(maxSize: number, params?: string | core.$ZodCheckMaxSizeParams): this;
    size(size: number, params?: string | core.$ZodCheckSizeEqualsParams): this;
}
export declare const ZodSet: core.$constructor<ZodSet>;
export declare function set<Value extends core.SomeType>(valueType: Value, params?: string | core.$ZodSetParams): ZodSet<Value>;
export interface ZodEnum<
/** @ts-ignore Cast variance */
out T extends util.EnumLike = util.EnumLike> extends _ZodType<core.$ZodEnumInternals<T>>, core.$ZodEnum<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    enum: T;
    options: Array<T[keyof T]>;
    extract<const U extends readonly (keyof T)[]>(values: U, params?: string | core.$ZodEnumParams): ZodEnum<util.Flatten<Pick<T, U[number]>>>;
    exclude<const U extends readonly (keyof T)[]>(values: U, params?: string | core.$ZodEnumParams): ZodEnum<util.Flatten<Omit<T, U[number]>>>;
}
export declare const ZodEnum: core.$constructor<ZodEnum>;
declare function _enum<const T extends readonly string[]>(values: T, params?: string | core.$ZodEnumParams): ZodEnum<util.ToEnum<T[number]>>;
declare function _enum<const T extends util.EnumLike>(entries: T, params?: string | core.$ZodEnumParams): ZodEnum<T>;
export { _enum as enum };
/** @deprecated This API has been merged into \`z.enum()\`. Use \`z.enum()\` instead.
 *
 * \`\`\`ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * \`\`\`
 */
export declare function nativeEnum<T extends util.EnumLike>(entries: T, params?: string | core.$ZodEnumParams): ZodEnum<T>;
export interface ZodLiteral<T extends util.Literal = util.Literal> extends _ZodType<core.$ZodLiteralInternals<T>>, core.$ZodLiteral<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    values: Set<T>;
    /** @legacy Use \`.values\` instead. Accessing this property will throw an error if the literal accepts multiple values. */
    value: T;
}
export declare const ZodLiteral: core.$constructor<ZodLiteral>;
export declare function literal<const T extends ReadonlyArray<util.Literal>>(value: T, params?: string | core.$ZodLiteralParams): ZodLiteral<T[number]>;
export declare function literal<const T extends util.Literal>(value: T, params?: string | core.$ZodLiteralParams): ZodLiteral<T>;
export interface ZodFile extends _ZodType<core.$ZodFileInternals>, core.$ZodFile {
    "~standard": ZodStandardSchemaWithJSON<this>;
    min(size: number, params?: string | core.$ZodCheckMinSizeParams): this;
    max(size: number, params?: string | core.$ZodCheckMaxSizeParams): this;
    mime(types: util.MimeTypes | Array<util.MimeTypes>, params?: string | core.$ZodCheckMimeTypeParams): this;
}
export declare const ZodFile: core.$constructor<ZodFile>;
export declare function file(params?: string | core.$ZodFileParams): ZodFile;
export interface ZodTransform<O = unknown, I = unknown> extends _ZodType<core.$ZodTransformInternals<O, I>>, core.$ZodTransform<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodTransform: core.$constructor<ZodTransform>;
export declare function transform<I = unknown, O = I>(fn: (input: I, ctx: core.$RefinementCtx) => O): ZodTransform<Awaited<O>, I>;
export interface ZodOptional<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodOptionalInternals<T>>, core.$ZodOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodOptional: core.$constructor<ZodOptional>;
export declare function optional<T extends core.SomeType>(innerType: T): ZodOptional<T>;
export interface ZodExactOptional<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodExactOptionalInternals<T>>, core.$ZodExactOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodExactOptional: core.$constructor<ZodExactOptional>;
export declare function exactOptional<T extends core.SomeType>(innerType: T): ZodExactOptional<T>;
export interface ZodNullable<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodNullableInternals<T>>, core.$ZodNullable<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodNullable: core.$constructor<ZodNullable>;
export declare function nullable<T extends core.SomeType>(innerType: T): ZodNullable<T>;
export declare function nullish<T extends core.SomeType>(innerType: T): ZodOptional<ZodNullable<T>>;
export interface ZodDefault<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodDefaultInternals<T>>, core.$ZodDefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use \`.unwrap()\` instead. */
    removeDefault(): T;
}
export declare const ZodDefault: core.$constructor<ZodDefault>;
export declare function _default<T extends core.SomeType>(innerType: T, defaultValue: util.NoUndefined<core.output<T>> | (() => util.NoUndefined<core.output<T>>)): ZodDefault<T>;
export interface ZodPrefault<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodPrefaultInternals<T>>, core.$ZodPrefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodPrefault: core.$constructor<ZodPrefault>;
export declare function prefault<T extends core.SomeType>(innerType: T, defaultValue: core.input<T> | (() => core.input<T>)): ZodPrefault<T>;
export interface ZodNonOptional<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodNonOptionalInternals<T>>, core.$ZodNonOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodNonOptional: core.$constructor<ZodNonOptional>;
export declare function nonoptional<T extends core.SomeType>(innerType: T, params?: string | core.$ZodNonOptionalParams): ZodNonOptional<T>;
export interface ZodSuccess<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodSuccessInternals<T>>, core.$ZodSuccess<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodSuccess: core.$constructor<ZodSuccess>;
export declare function success<T extends core.SomeType>(innerType: T): ZodSuccess<T>;
export interface ZodCatch<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodCatchInternals<T>>, core.$ZodCatch<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use \`.unwrap()\` instead. */
    removeCatch(): T;
}
export declare const ZodCatch: core.$constructor<ZodCatch>;
declare function _catch<T extends core.SomeType>(innerType: T, catchValue: core.output<T> | ((ctx: core.$ZodCatchCtx) => core.output<T>)): ZodCatch<T>;
export { _catch as catch };
export interface ZodNaN extends _ZodType<core.$ZodNaNInternals>, core.$ZodNaN {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodNaN: core.$constructor<ZodNaN>;
export declare function nan(params?: string | core.$ZodNaNParams): ZodNaN;
export interface ZodPipe<A extends core.SomeType = core.$ZodType, B extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodPipeInternals<A, B>>, core.$ZodPipe<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    in: A;
    out: B;
}
export declare const ZodPipe: core.$constructor<ZodPipe>;
export declare function pipe<const A extends core.SomeType, B extends core.$ZodType<unknown, core.output<A>> = core.$ZodType<unknown, core.output<A>>>(in_: A, out: B | core.$ZodType<unknown, core.output<A>>): ZodPipe<A, B>;
export interface ZodCodec<A extends core.SomeType = core.$ZodType, B extends core.SomeType = core.$ZodType> extends ZodPipe<A, B>, core.$ZodCodec<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _zod: core.$ZodCodecInternals<A, B>;
    def: core.$ZodCodecDef<A, B>;
}
export declare const ZodCodec: core.$constructor<ZodCodec>;
export declare function codec<const A extends core.SomeType, B extends core.SomeType = core.$ZodType>(in_: A, out: B, params: {
    decode: (value: core.output<A>, payload: core.ParsePayload<core.output<A>>) => core.util.MaybeAsync<core.input<B>>;
    encode: (value: core.input<B>, payload: core.ParsePayload<core.input<B>>) => core.util.MaybeAsync<core.output<A>>;
}): ZodCodec<A, B>;
export declare function invertCodec<A extends core.SomeType, B extends core.SomeType>(codec: ZodCodec<A, B>): ZodCodec<B, A>;
export interface ZodPreprocess<B extends core.SomeType = core.$ZodType, I = unknown> extends ZodPipe<core.$ZodTransform<unknown, I>, B>, core.$ZodPreprocess<B, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _zod: core.$ZodPreprocessInternals<B, I>;
    def: core.$ZodPreprocessDef<B, I>;
}
export declare const ZodPreprocess: core.$constructor<ZodPreprocess>;
export interface ZodReadonly<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodReadonlyInternals<T>>, core.$ZodReadonly<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodReadonly: core.$constructor<ZodReadonly>;
export declare function readonly<T extends core.SomeType>(innerType: T): ZodReadonly<T>;
export interface ZodTemplateLiteral<Template extends string = string> extends _ZodType<core.$ZodTemplateLiteralInternals<Template>>, core.$ZodTemplateLiteral<Template> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodTemplateLiteral: core.$constructor<ZodTemplateLiteral>;
export declare function templateLiteral<const Parts extends core.$ZodTemplateLiteralPart[]>(parts: Parts, params?: string | core.$ZodTemplateLiteralParams): ZodTemplateLiteral<core.$PartsToTemplateLiteral<Parts>>;
export interface ZodLazy<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodLazyInternals<T>>, core.$ZodLazy<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodLazy: core.$constructor<ZodLazy>;
export declare function lazy<T extends core.SomeType>(getter: () => T): ZodLazy<T>;
export interface ZodPromise<T extends core.SomeType = core.$ZodType> extends _ZodType<core.$ZodPromiseInternals<T>>, core.$ZodPromise<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
export declare const ZodPromise: core.$constructor<ZodPromise>;
export declare function promise<T extends core.SomeType>(innerType: T): ZodPromise<T>;
export interface ZodFunction<Args extends core.$ZodFunctionIn = core.$ZodFunctionIn, Returns extends core.$ZodFunctionOut = core.$ZodFunctionOut> extends _ZodType<core.$ZodFunctionInternals<Args, Returns>>, core.$ZodFunction<Args, Returns> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _def: core.$ZodFunctionDef<Args, Returns>;
    _input: core.$InferInnerFunctionType<Args, Returns>;
    _output: core.$InferOuterFunctionType<Args, Returns>;
    input<const Items extends util.TupleItems, const Rest extends core.$ZodFunctionOut = core.$ZodFunctionOut>(args: Items, rest?: Rest): ZodFunction<core.$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends core.$ZodFunctionIn>(args: NewArgs): ZodFunction<NewArgs, Returns>;
    input(...args: any[]): ZodFunction<any, Returns>;
    output<NewReturns extends core.$ZodType>(output: NewReturns): ZodFunction<Args, NewReturns>;
}
export declare const ZodFunction: core.$constructor<ZodFunction>;
export declare function _function(): ZodFunction;
export declare function _function<const In extends ReadonlyArray<core.$ZodType>>(params: {
    input: In;
}): ZodFunction<ZodTuple<In, null>, core.$ZodFunctionOut>;
export declare function _function<const In extends ReadonlyArray<core.$ZodType>, const Out extends core.$ZodFunctionOut = core.$ZodFunctionOut>(params: {
    input: In;
    output: Out;
}): ZodFunction<ZodTuple<In, null>, Out>;
export declare function _function<const In extends core.$ZodFunctionIn = core.$ZodFunctionIn>(params: {
    input: In;
}): ZodFunction<In, core.$ZodFunctionOut>;
export declare function _function<const Out extends core.$ZodFunctionOut = core.$ZodFunctionOut>(params: {
    output: Out;
}): ZodFunction<core.$ZodFunctionIn, Out>;
export declare function _function<In extends core.$ZodFunctionIn = core.$ZodFunctionIn, Out extends core.$ZodType = core.$ZodType>(params?: {
    input: In;
    output: Out;
}): ZodFunction<In, Out>;
export { _function as function };
export interface ZodCustom<O = unknown, I = unknown> extends _ZodType<core.$ZodCustomInternals<O, I>>, core.$ZodCustom<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
export declare const ZodCustom: core.$constructor<ZodCustom>;
export declare function check<O = unknown>(fn: core.CheckFn<O>): core.$ZodCheck<O>;
export declare function custom<O>(fn?: (data: unknown) => unknown, _params?: string | core.$ZodCustomParams | undefined): ZodCustom<O, O>;
export declare function refine<T>(fn: (arg: NoInfer<T>) => util.MaybeAsync<unknown>, _params?: string | core.$ZodCustomParams): core.$ZodCheck<T>;
export declare function superRefine<T>(fn: (arg: T, payload: core.$RefinementCtx<T>) => void | Promise<void>, params?: core.$ZodSuperRefineParams): core.$ZodCheck<T>;
export declare const describe: typeof core.describe;
export declare const meta: typeof core.meta;
type ZodInstanceOfParams = core.Params<ZodCustom, core.$ZodIssueCustom, "type" | "check" | "checks" | "fn" | "abort" | "error" | "params" | "path">;
export interface ZodInstanceOf<T = unknown> extends ZodCustom<T, T> {
    properties<Shape extends {
        [k in keyof T as T[k] extends Function ? never : k]?: core.$ZodType<unknown, T[k]>;
    }>(shape: Shape, params?: string | core.$ZodCheckPropertiesParams): ZodInstanceOf<T & core.$InferObjectInput<Shape, {}>>;
}
export declare const ZodInstanceOf: core.$constructor<ZodInstanceOf>;
declare function _instanceof<T extends typeof util.Class>(cls: T, params?: ZodInstanceOfParams): ZodInstanceOf<InstanceType<T>>;
export { _instanceof as instanceof };
export declare const stringbool: (_params?: string | core.$ZodStringBoolParams) => ZodCodec<ZodString, ZodBoolean>;
type _ZodJSONSchema = ZodUnion<[
    ZodString,
    ZodNumber,
    ZodBoolean,
    ZodNull,
    ZodArray<ZodJSONSchema>,
    ZodRecord<ZodString, ZodJSONSchema>
]>;
type _ZodJSONSchemaInternals = _ZodJSONSchema["_zod"];
export interface ZodJSONSchemaInternals extends _ZodJSONSchemaInternals {
    output: util.JSONType;
    input: util.JSONType;
}
export interface ZodJSONSchema extends _ZodJSONSchema {
    _zod: ZodJSONSchemaInternals;
}
export declare function json(params?: string | core.$ZodCustomParams): ZodJSONSchema;
export declare function preprocess<A, U extends core.SomeType, B = unknown>(fn: (arg: B, ctx: core.$RefinementCtx) => A, schema: U): ZodPreprocess<U, B>;
`,
    'file:///node_modules/zod/v4/core/api.d.ts': `import * as checks from "./checks.js";
import type * as core from "./core.js";
import type * as errors from "./errors.js";
import * as registries from "./registries.js";
import * as schemas from "./schemas.js";
import * as util from "./util.js";
export type Params<T extends schemas.$ZodType | checks.$ZodCheck, IssueTypes extends errors.$ZodIssueBase, OmitKeys extends keyof T["_zod"]["def"] = never> = util.Flatten<Partial<util.EmptyToNever<Omit<T["_zod"]["def"], OmitKeys> & ([IssueTypes] extends [never] ? {} : {
    error?: string | errors.$ZodErrorMap<IssueTypes> | undefined;
    /** @deprecated This parameter is deprecated. Use \`error\` instead. */
    message?: string | undefined;
})>>>;
export type TypeParams<T extends schemas.$ZodType = schemas.$ZodType & {
    _isst: never;
}, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error"> = never> = Params<T, NonNullable<T["_zod"]["isst"]>, "type" | "checks" | "error" | AlsoOmit>;
export type CheckParams<T extends checks.$ZodCheck = checks.$ZodCheck, // & { _issc: never },
AlsoOmit extends Exclude<keyof T["_zod"]["def"], "check" | "error"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "check" | "error" | AlsoOmit>;
export type StringFormatParams<T extends schemas.$ZodStringFormat = schemas.$ZodStringFormat, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T, NonNullable<T["_zod"]["isst"] | T["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
export type CheckStringFormatParams<T extends schemas.$ZodStringFormat = schemas.$ZodStringFormat, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
export type CheckTypeParams<T extends schemas.$ZodType & checks.$ZodCheck = schemas.$ZodType & checks.$ZodCheck, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error" | "check"> = never> = Params<T, NonNullable<T["_zod"]["isst"] | T["_zod"]["issc"]>, "type" | "checks" | "error" | "check" | AlsoOmit>;
export type $ZodStringParams = TypeParams<schemas.$ZodString<string>, "coerce"> & {
    checks?: readonly checks.$ZodCheck<string>[];
};
export declare function _string<T extends schemas.$ZodString>(Class: util.SchemaClass<T>, params?: string | $ZodStringParams): T;
export declare function _coercedString<T extends schemas.$ZodString>(Class: util.SchemaClass<T>, params?: string | $ZodStringParams): T;
export type $ZodStringFormatParams = CheckTypeParams<schemas.$ZodStringFormat, "format" | "coerce" | "when" | "pattern">;
export type $ZodCheckStringFormatParams = CheckParams<checks.$ZodCheckStringFormat, "format">;
export type $ZodEmailParams = StringFormatParams<schemas.$ZodEmail, "when">;
export type $ZodCheckEmailParams = CheckStringFormatParams<schemas.$ZodEmail, "when">;
export declare function _email<T extends schemas.$ZodEmail>(Class: util.SchemaClass<T>, params?: string | $ZodEmailParams | $ZodCheckEmailParams): T;
export type $ZodGUIDParams = StringFormatParams<schemas.$ZodGUID, "pattern" | "when">;
export type $ZodCheckGUIDParams = CheckStringFormatParams<schemas.$ZodGUID, "pattern" | "when">;
export declare function _guid<T extends schemas.$ZodGUID>(Class: util.SchemaClass<T>, params?: string | $ZodGUIDParams | $ZodCheckGUIDParams): T;
export type $ZodUUIDParams = StringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export type $ZodCheckUUIDParams = CheckStringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export declare function _uuid<T extends schemas.$ZodUUID>(Class: util.SchemaClass<T>, params?: string | $ZodUUIDParams | $ZodCheckUUIDParams): T;
export type $ZodUUIDv4Params = StringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export type $ZodCheckUUIDv4Params = CheckStringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export declare function _uuidv4<T extends schemas.$ZodUUID>(Class: util.SchemaClass<T>, params?: string | $ZodUUIDv4Params | $ZodCheckUUIDv4Params): T;
export type $ZodUUIDv6Params = StringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export type $ZodCheckUUIDv6Params = CheckStringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export declare function _uuidv6<T extends schemas.$ZodUUID>(Class: util.SchemaClass<T>, params?: string | $ZodUUIDv6Params | $ZodCheckUUIDv6Params): T;
export type $ZodUUIDv7Params = StringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export type $ZodCheckUUIDv7Params = CheckStringFormatParams<schemas.$ZodUUID, "pattern" | "when">;
export declare function _uuidv7<T extends schemas.$ZodUUID>(Class: util.SchemaClass<T>, params?: string | $ZodUUIDv7Params | $ZodCheckUUIDv7Params): T;
export type $ZodURLParams = StringFormatParams<schemas.$ZodURL, "when">;
export type $ZodCheckURLParams = CheckStringFormatParams<schemas.$ZodURL, "when">;
export declare function _url<T extends schemas.$ZodURL>(Class: util.SchemaClass<T>, params?: string | $ZodURLParams | $ZodCheckURLParams): T;
export type $ZodEmojiParams = StringFormatParams<schemas.$ZodEmoji, "when">;
export type $ZodCheckEmojiParams = CheckStringFormatParams<schemas.$ZodEmoji, "when">;
export declare function _emoji<T extends schemas.$ZodEmoji>(Class: util.SchemaClass<T>, params?: string | $ZodEmojiParams | $ZodCheckEmojiParams): T;
export type $ZodNanoIDParams = StringFormatParams<schemas.$ZodNanoID, "when" | "pattern">;
export type $ZodCheckNanoIDParams = CheckStringFormatParams<schemas.$ZodNanoID, "when" | "pattern">;
export declare function _nanoid<T extends schemas.$ZodNanoID>(Class: util.SchemaClass<T>, params?: string | $ZodNanoIDParams | $ZodCheckNanoIDParams): T;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link _cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export type $ZodCUIDParams = StringFormatParams<schemas.$ZodCUID, "when">;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link _cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export type $ZodCheckCUIDParams = CheckStringFormatParams<schemas.$ZodCUID, "when">;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link _cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare function _cuid<T extends schemas.$ZodCUID>(Class: util.SchemaClass<T>, params?: string | $ZodCUIDParams | $ZodCheckCUIDParams): T;
export type $ZodCUID2Params = StringFormatParams<schemas.$ZodCUID2, "when">;
export type $ZodCheckCUID2Params = CheckStringFormatParams<schemas.$ZodCUID2, "when">;
export declare function _cuid2<T extends schemas.$ZodCUID2>(Class: util.SchemaClass<T>, params?: string | $ZodCUID2Params | $ZodCheckCUID2Params): T;
export type $ZodULIDParams = StringFormatParams<schemas.$ZodULID, "when">;
export type $ZodCheckULIDParams = CheckStringFormatParams<schemas.$ZodULID, "when">;
export declare function _ulid<T extends schemas.$ZodULID>(Class: util.SchemaClass<T>, params?: string | $ZodULIDParams | $ZodCheckULIDParams): T;
export type $ZodXIDParams = StringFormatParams<schemas.$ZodXID, "when">;
export type $ZodCheckXIDParams = CheckStringFormatParams<schemas.$ZodXID, "when">;
export declare function _xid<T extends schemas.$ZodXID>(Class: util.SchemaClass<T>, params?: string | $ZodXIDParams | $ZodCheckXIDParams): T;
export type $ZodKSUIDParams = StringFormatParams<schemas.$ZodKSUID, "when">;
export type $ZodCheckKSUIDParams = CheckStringFormatParams<schemas.$ZodKSUID, "when">;
export declare function _ksuid<T extends schemas.$ZodKSUID>(Class: util.SchemaClass<T>, params?: string | $ZodKSUIDParams | $ZodCheckKSUIDParams): T;
export type $ZodIPv4Params = StringFormatParams<schemas.$ZodIPv4, "pattern" | "when" | "version">;
export type $ZodCheckIPv4Params = CheckStringFormatParams<schemas.$ZodIPv4, "pattern" | "when" | "version">;
export declare function _ipv4<T extends schemas.$ZodIPv4>(Class: util.SchemaClass<T>, params?: string | $ZodIPv4Params | $ZodCheckIPv4Params): T;
export type $ZodIPv6Params = StringFormatParams<schemas.$ZodIPv6, "pattern" | "when" | "version">;
export type $ZodCheckIPv6Params = CheckStringFormatParams<schemas.$ZodIPv6, "pattern" | "when" | "version">;
export declare function _ipv6<T extends schemas.$ZodIPv6>(Class: util.SchemaClass<T>, params?: string | $ZodIPv6Params | $ZodCheckIPv6Params): T;
export type $ZodMACParams = StringFormatParams<schemas.$ZodMAC, "pattern" | "when">;
export type $ZodCheckMACParams = CheckStringFormatParams<schemas.$ZodMAC, "pattern" | "when">;
export declare function _mac<T extends schemas.$ZodMAC>(Class: util.SchemaClass<T>, params?: string | $ZodMACParams | $ZodCheckMACParams): T;
export type $ZodCIDRv4Params = StringFormatParams<schemas.$ZodCIDRv4, "pattern" | "when">;
export type $ZodCheckCIDRv4Params = CheckStringFormatParams<schemas.$ZodCIDRv4, "pattern" | "when">;
export declare function _cidrv4<T extends schemas.$ZodCIDRv4>(Class: util.SchemaClass<T>, params?: string | $ZodCIDRv4Params | $ZodCheckCIDRv4Params): T;
export type $ZodCIDRv6Params = StringFormatParams<schemas.$ZodCIDRv6, "pattern" | "when">;
export type $ZodCheckCIDRv6Params = CheckStringFormatParams<schemas.$ZodCIDRv6, "pattern" | "when">;
export declare function _cidrv6<T extends schemas.$ZodCIDRv6>(Class: util.SchemaClass<T>, params?: string | $ZodCIDRv6Params | $ZodCheckCIDRv6Params): T;
export type $ZodBase64Params = StringFormatParams<schemas.$ZodBase64, "pattern" | "when">;
export type $ZodCheckBase64Params = CheckStringFormatParams<schemas.$ZodBase64, "pattern" | "when">;
export declare function _base64<T extends schemas.$ZodBase64>(Class: util.SchemaClass<T>, params?: string | $ZodBase64Params | $ZodCheckBase64Params): T;
export type $ZodBase64URLParams = StringFormatParams<schemas.$ZodBase64URL, "pattern" | "when">;
export type $ZodCheckBase64URLParams = CheckStringFormatParams<schemas.$ZodBase64URL, "pattern" | "when">;
export declare function _base64url<T extends schemas.$ZodBase64URL>(Class: util.SchemaClass<T>, params?: string | $ZodBase64URLParams | $ZodCheckBase64URLParams): T;
export type $ZodE164Params = StringFormatParams<schemas.$ZodE164, "when">;
export type $ZodCheckE164Params = CheckStringFormatParams<schemas.$ZodE164, "when">;
export declare function _e164<T extends schemas.$ZodE164>(Class: util.SchemaClass<T>, params?: string | $ZodE164Params | $ZodCheckE164Params): T;
export type $ZodCreditCardParams = StringFormatParams<schemas.$ZodCreditCard, "pattern" | "when">;
export type $ZodCheckCreditCardParams = CheckStringFormatParams<schemas.$ZodCreditCard, "pattern" | "when">;
export declare function _creditCard<T extends schemas.$ZodCreditCard>(Class: util.SchemaClass<T>, params?: string | $ZodCreditCardParams | $ZodCheckCreditCardParams): T;
export type $ZodIBANParams = StringFormatParams<schemas.$ZodIBAN, "pattern" | "when">;
export type $ZodCheckIBANParams = CheckStringFormatParams<schemas.$ZodIBAN, "pattern" | "when">;
export declare function _iban<T extends schemas.$ZodIBAN>(Class: util.SchemaClass<T>, params?: string | $ZodIBANParams | $ZodCheckIBANParams): T;
export type $ZodJWTParams = StringFormatParams<schemas.$ZodJWT, "pattern" | "when">;
export type $ZodCheckJWTParams = CheckStringFormatParams<schemas.$ZodJWT, "pattern" | "when">;
export declare function _jwt<T extends schemas.$ZodJWT>(Class: util.SchemaClass<T>, params?: string | $ZodJWTParams | $ZodCheckJWTParams): T;
export declare const TimePrecision: {
    readonly Any: null;
    readonly Minute: -1;
    readonly Second: 0;
    readonly Millisecond: 3;
    readonly Microsecond: 6;
};
export type $ZodISODateTimeParams = StringFormatParams<schemas.$ZodISODateTime, "pattern" | "when">;
export type $ZodCheckISODateTimeParams = CheckStringFormatParams<schemas.$ZodISODateTime, "pattern" | "when">;
export declare function _isoDateTime<T extends schemas.$ZodISODateTime>(Class: util.SchemaClass<T>, params?: string | $ZodISODateTimeParams | $ZodCheckISODateTimeParams): T;
export type $ZodISODateParams = StringFormatParams<schemas.$ZodISODate, "pattern" | "when">;
export type $ZodCheckISODateParams = CheckStringFormatParams<schemas.$ZodISODate, "pattern" | "when">;
export declare function _isoDate<T extends schemas.$ZodISODate>(Class: util.SchemaClass<T>, params?: string | $ZodISODateParams | $ZodCheckISODateParams): T;
export type $ZodISOTimeParams = StringFormatParams<schemas.$ZodISOTime, "pattern" | "when">;
export type $ZodCheckISOTimeParams = CheckStringFormatParams<schemas.$ZodISOTime, "pattern" | "when">;
export declare function _isoTime<T extends schemas.$ZodISOTime>(Class: util.SchemaClass<T>, params?: string | $ZodISOTimeParams | $ZodCheckISOTimeParams): T;
export type $ZodISODurationParams = StringFormatParams<schemas.$ZodISODuration, "when">;
export type $ZodCheckISODurationParams = CheckStringFormatParams<schemas.$ZodISODuration, "when">;
export declare function _isoDuration<T extends schemas.$ZodISODuration>(Class: util.SchemaClass<T>, params?: string | $ZodISODurationParams | $ZodCheckISODurationParams): T;
export type $ZodNumberParams = TypeParams<schemas.$ZodNumber<number>, "coerce"> & {
    checks?: readonly checks.$ZodCheck<number>[];
};
export type $ZodNumberFormatParams = CheckTypeParams<schemas.$ZodNumberFormat, "format" | "coerce">;
export type $ZodCheckNumberFormatParams = CheckParams<checks.$ZodCheckNumberFormat, "format" | "when">;
export declare function _number<T extends schemas.$ZodNumber>(Class: util.SchemaClass<T>, params?: string | $ZodNumberParams): T;
export declare function _coercedNumber<T extends schemas.$ZodNumber>(Class: util.SchemaClass<T>, params?: string | $ZodNumberParams): T;
export declare function _int<T extends schemas.$ZodNumberFormat>(Class: util.SchemaClass<T>, params?: string | $ZodCheckNumberFormatParams): T;
export declare function _float32<T extends schemas.$ZodNumberFormat>(Class: util.SchemaClass<T>, params?: string | $ZodCheckNumberFormatParams): T;
export declare function _float64<T extends schemas.$ZodNumberFormat>(Class: util.SchemaClass<T>, params?: string | $ZodCheckNumberFormatParams): T;
export declare function _int32<T extends schemas.$ZodNumberFormat>(Class: util.SchemaClass<T>, params?: string | $ZodCheckNumberFormatParams): T;
export declare function _uint32<T extends schemas.$ZodNumberFormat>(Class: util.SchemaClass<T>, params?: string | $ZodCheckNumberFormatParams): T;
export type $ZodBooleanParams = TypeParams<schemas.$ZodBoolean<boolean>, "coerce">;
export declare function _boolean<T extends schemas.$ZodBoolean>(Class: util.SchemaClass<T>, params?: string | $ZodBooleanParams): T;
export declare function _coercedBoolean<T extends schemas.$ZodBoolean>(Class: util.SchemaClass<T>, params?: string | $ZodBooleanParams): T;
export type $ZodBigIntParams = TypeParams<schemas.$ZodBigInt<bigint>>;
export type $ZodBigIntFormatParams = CheckTypeParams<schemas.$ZodBigIntFormat, "format" | "coerce">;
export type $ZodCheckBigIntFormatParams = CheckParams<checks.$ZodCheckBigIntFormat, "format" | "when">;
export declare function _bigint<T extends schemas.$ZodBigInt>(Class: util.SchemaClass<T>, params?: string | $ZodBigIntParams): T;
export declare function _coercedBigint<T extends schemas.$ZodBigInt>(Class: util.SchemaClass<T>, params?: string | $ZodBigIntParams): T;
export declare function _int64<T extends schemas.$ZodBigIntFormat>(Class: util.SchemaClass<T>, params?: string | $ZodBigIntFormatParams): T;
export declare function _uint64<T extends schemas.$ZodBigIntFormat>(Class: util.SchemaClass<T>, params?: string | $ZodBigIntFormatParams): T;
export type $ZodSymbolParams = TypeParams<schemas.$ZodSymbol>;
export declare function _symbol<T extends schemas.$ZodSymbol>(Class: util.SchemaClass<T>, params?: string | $ZodSymbolParams): T;
export type $ZodUndefinedParams = TypeParams<schemas.$ZodUndefined>;
export declare function _undefined<T extends schemas.$ZodUndefined>(Class: util.SchemaClass<T>, params?: string | $ZodUndefinedParams): T;
export type $ZodNullParams = TypeParams<schemas.$ZodNull>;
export declare function _null<T extends schemas.$ZodNull>(Class: util.SchemaClass<T>, params?: string | $ZodNullParams): T;
export type $ZodAnyParams = TypeParams<schemas.$ZodAny>;
export declare function _any<T extends schemas.$ZodAny>(Class: util.SchemaClass<T>): T;
export type $ZodUnknownParams = TypeParams<schemas.$ZodUnknown>;
export declare function _unknown<T extends schemas.$ZodUnknown>(Class: util.SchemaClass<T>): T;
export type $ZodNeverParams = TypeParams<schemas.$ZodNever>;
export declare function _never<T extends schemas.$ZodNever>(Class: util.SchemaClass<T>, params?: string | $ZodNeverParams): T;
export type $ZodVoidParams = TypeParams<schemas.$ZodVoid>;
export declare function _void<T extends schemas.$ZodVoid>(Class: util.SchemaClass<T>, params?: string | $ZodVoidParams): T;
export type $ZodDateParams = TypeParams<schemas.$ZodDate, "coerce">;
export declare function _date<T extends schemas.$ZodDate>(Class: util.SchemaClass<T>, params?: string | $ZodDateParams): T;
export declare function _coercedDate<T extends schemas.$ZodDate>(Class: util.SchemaClass<T>, params?: string | $ZodDateParams): T;
export type $ZodNaNParams = TypeParams<schemas.$ZodNaN>;
export declare function _nan<T extends schemas.$ZodNaN>(Class: util.SchemaClass<T>, params?: string | $ZodNaNParams): T;
export type $ZodCheckLessThanParams = CheckParams<checks.$ZodCheckLessThan, "inclusive" | "value" | "when">;
export declare function _lt(value: util.Numeric, params?: string | $ZodCheckLessThanParams): checks.$ZodCheckLessThan<util.Numeric>;
export declare function _lte(value: util.Numeric, params?: string | $ZodCheckLessThanParams): checks.$ZodCheckLessThan<util.Numeric>;
export {
/** @deprecated Use \`z.lte()\` instead. */
_lte as _max, };
export type $ZodCheckGreaterThanParams = CheckParams<checks.$ZodCheckGreaterThan, "inclusive" | "value" | "when">;
export declare function _gt(value: util.Numeric, params?: string | $ZodCheckGreaterThanParams): checks.$ZodCheckGreaterThan;
export declare function _gte(value: util.Numeric, params?: string | $ZodCheckGreaterThanParams): checks.$ZodCheckGreaterThan;
export {
/** @deprecated Use \`z.gte()\` instead. */
_gte as _min, };
export declare function _positive(params?: string | $ZodCheckGreaterThanParams): checks.$ZodCheckGreaterThan;
export declare function _negative(params?: string | $ZodCheckLessThanParams): checks.$ZodCheckLessThan;
export declare function _nonpositive(params?: string | $ZodCheckLessThanParams): checks.$ZodCheckLessThan;
export declare function _nonnegative(params?: string | $ZodCheckGreaterThanParams): checks.$ZodCheckGreaterThan;
export type $ZodCheckMultipleOfParams = CheckParams<checks.$ZodCheckMultipleOf, "value" | "when">;
export declare function _multipleOf(value: number | bigint, params?: string | $ZodCheckMultipleOfParams): checks.$ZodCheckMultipleOf;
export type $ZodCheckMaxSizeParams = CheckParams<checks.$ZodCheckMaxSize, "maximum" | "when">;
export declare function _maxSize(maximum: number, params?: string | $ZodCheckMaxSizeParams): checks.$ZodCheckMaxSize<util.HasSize>;
export type $ZodCheckMinSizeParams = CheckParams<checks.$ZodCheckMinSize, "minimum" | "when">;
export declare function _minSize(minimum: number, params?: string | $ZodCheckMinSizeParams): checks.$ZodCheckMinSize<util.HasSize>;
export type $ZodCheckSizeEqualsParams = CheckParams<checks.$ZodCheckSizeEquals, "size" | "when">;
export declare function _size(size: number, params?: string | $ZodCheckSizeEqualsParams): checks.$ZodCheckSizeEquals<util.HasSize>;
export type $ZodCheckMaxLengthParams = CheckParams<checks.$ZodCheckMaxLength, "maximum" | "when">;
export declare function _maxLength(maximum: number, params?: string | $ZodCheckMaxLengthParams): checks.$ZodCheckMaxLength<util.HasLength>;
export type $ZodCheckMinLengthParams = CheckParams<checks.$ZodCheckMinLength, "minimum" | "when">;
export declare function _minLength(minimum: number, params?: string | $ZodCheckMinLengthParams): checks.$ZodCheckMinLength<util.HasLength>;
export type $ZodCheckLengthEqualsParams = CheckParams<checks.$ZodCheckLengthEquals, "length" | "when">;
export declare function _length(length: number, params?: string | $ZodCheckLengthEqualsParams): checks.$ZodCheckLengthEquals<util.HasLength>;
export type $ZodCheckRegexParams = CheckParams<checks.$ZodCheckRegex, "format" | "pattern" | "when">;
export declare function _regex(pattern: RegExp, params?: string | $ZodCheckRegexParams): checks.$ZodCheckRegex;
export type $ZodCheckLowerCaseParams = CheckParams<checks.$ZodCheckLowerCase, "format" | "when">;
export declare function _lowercase(params?: string | $ZodCheckLowerCaseParams): checks.$ZodCheckLowerCase;
export type $ZodCheckUpperCaseParams = CheckParams<checks.$ZodCheckUpperCase, "format" | "when">;
export declare function _uppercase(params?: string | $ZodCheckUpperCaseParams): checks.$ZodCheckUpperCase;
export type $ZodCheckIncludesParams = CheckParams<checks.$ZodCheckIncludes, "includes" | "format" | "when" | "pattern">;
export declare function _includes(includes: string, params?: string | $ZodCheckIncludesParams): checks.$ZodCheckIncludes;
export type $ZodCheckStartsWithParams = CheckParams<checks.$ZodCheckStartsWith, "prefix" | "format" | "when" | "pattern">;
export declare function _startsWith(prefix: string, params?: string | $ZodCheckStartsWithParams): checks.$ZodCheckStartsWith;
export type $ZodCheckEndsWithParams = CheckParams<checks.$ZodCheckEndsWith, "suffix" | "format" | "pattern" | "when">;
export declare function _endsWith(suffix: string, params?: string | $ZodCheckEndsWithParams): checks.$ZodCheckEndsWith;
export type $ZodCheckPropertyParams = CheckParams<checks.$ZodCheckProperty, "property" | "schema" | "when">;
export declare function _property<K extends string, T extends schemas.$ZodType>(property: K, schema: T, params?: string | $ZodCheckPropertyParams): checks.$ZodCheckProperty<{
    [k in K]: util.Widen<core.input<T>>;
}>;
export type $ZodCheckPropertiesParams = CheckParams<checks.$ZodCheckProperties, "shape" | "when">;
export declare function _properties<Shape extends schemas.$ZodShape>(shape: Shape, params?: string | $ZodCheckPropertiesParams): checks.$ZodCheckProperties<Shape>;
export type $ZodCheckMimeTypeParams = CheckParams<checks.$ZodCheckMimeType, "mime" | "when">;
export declare function _mime(types: util.MimeTypes[], params?: string | $ZodCheckMimeTypeParams): checks.$ZodCheckMimeType;
export declare function _overwrite<T>(tx: (input: T) => T): checks.$ZodCheckOverwrite<T>;
export declare function _normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): checks.$ZodCheckOverwrite<string>;
export declare function _trim(): checks.$ZodCheckOverwrite<string>;
export declare function _toLowerCase(): checks.$ZodCheckOverwrite<string>;
export declare function _toUpperCase(): checks.$ZodCheckOverwrite<string>;
export declare function _slugify(): checks.$ZodCheckOverwrite<string>;
export type $ZodArrayParams = TypeParams<schemas.$ZodArray, "element">;
export declare function _array<T extends schemas.$ZodType>(Class: util.SchemaClass<schemas.$ZodArray>, element: T, params?: string | $ZodArrayParams): schemas.$ZodArray<T>;
export type $ZodObjectParams = TypeParams<schemas.$ZodObject, "shape" | "catchall">;
export type $ZodUnionParams = TypeParams<schemas.$ZodUnion, "options">;
export declare function _union<const T extends readonly schemas.$ZodObject[]>(Class: util.SchemaClass<schemas.$ZodUnion>, options: T, params?: string | $ZodUnionParams): schemas.$ZodUnion<T>;
export type $ZodXorParams = TypeParams<schemas.$ZodXor, "options">;
export declare function _xor<const T extends readonly schemas.$ZodObject[]>(Class: util.SchemaClass<schemas.$ZodXor>, options: T, params?: string | $ZodXorParams): schemas.$ZodXor<T>;
export interface $ZodTypeDiscriminableInternals<_Disc extends string = string> extends schemas._$ZodTypeInternals {
    propValues: util.PropValues;
}
export interface $ZodTypeDiscriminable<_Disc extends string = string> extends schemas.SomeType {
    _zod: $ZodTypeDiscriminableInternals;
}
export type $ZodDiscriminatedUnionParams = TypeParams<schemas.$ZodDiscriminatedUnion, "options" | "discriminator">;
export declare function _discriminatedUnion<Types extends [$ZodTypeDiscriminable, ...$ZodTypeDiscriminable[]], Disc extends string>(Class: util.SchemaClass<schemas.$ZodDiscriminatedUnion>, discriminator: Disc, options: Types, params?: string | $ZodDiscriminatedUnionParams): schemas.$ZodDiscriminatedUnion<Types, Disc>;
export type $ZodIntersectionParams = TypeParams<schemas.$ZodIntersection, "left" | "right">;
export declare function _intersection<T extends schemas.$ZodObject, U extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodIntersection>, left: T, right: U): schemas.$ZodIntersection<T, U>;
export type $ZodTupleParams = TypeParams<schemas.$ZodTuple, "items" | "rest">;
export declare function _tuple<T extends readonly [schemas.$ZodType, ...schemas.$ZodType[]]>(Class: util.SchemaClass<schemas.$ZodTuple>, items: T, params?: string | $ZodTupleParams): schemas.$ZodTuple<T, null>;
export declare function _tuple<T extends readonly [schemas.$ZodType, ...schemas.$ZodType[]], Rest extends schemas.$ZodType>(Class: util.SchemaClass<schemas.$ZodTuple>, items: T, rest: Rest, params?: string | $ZodTupleParams): schemas.$ZodTuple<T, Rest>;
export type $ZodRecordParams = TypeParams<schemas.$ZodRecord, "keyType" | "valueType" | "partial">;
export declare function _record<Key extends schemas.$ZodRecordKey, Value extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodRecord>, keyType: Key, valueType: Value, params?: string | $ZodRecordParams): schemas.$ZodRecord<Key, Value>;
export type $ZodMapParams = TypeParams<schemas.$ZodMap, "keyType" | "valueType">;
export declare function _map<Key extends schemas.$ZodObject, Value extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodMap>, keyType: Key, valueType: Value, params?: string | $ZodMapParams): schemas.$ZodMap<Key, Value>;
export type $ZodSetParams = TypeParams<schemas.$ZodSet, "valueType">;
export declare function _set<Value extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodSet>, valueType: Value, params?: string | $ZodSetParams): schemas.$ZodSet<Value>;
export type $ZodEnumParams = TypeParams<schemas.$ZodEnum, "entries">;
export declare function _enum<const T extends string[]>(Class: util.SchemaClass<schemas.$ZodEnum>, values: T, params?: string | $ZodEnumParams): schemas.$ZodEnum<util.ToEnum<T[number]>>;
export declare function _enum<T extends util.EnumLike>(Class: util.SchemaClass<schemas.$ZodEnum>, entries: T, params?: string | $ZodEnumParams): schemas.$ZodEnum<T>;
/** @deprecated This API has been merged into \`z.enum()\`. Use \`z.enum()\` instead.
 *
 * \`\`\`ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * \`\`\`
 */
export declare function _nativeEnum<T extends util.EnumLike>(Class: util.SchemaClass<schemas.$ZodEnum>, entries: T, params?: string | $ZodEnumParams): schemas.$ZodEnum<T>;
export type $ZodLiteralParams = TypeParams<schemas.$ZodLiteral, "values">;
export declare function _literal<const T extends Array<util.Literal>>(Class: util.SchemaClass<schemas.$ZodLiteral>, value: T, params?: string | $ZodLiteralParams): schemas.$ZodLiteral<T[number]>;
export declare function _literal<const T extends util.Literal>(Class: util.SchemaClass<schemas.$ZodLiteral>, value: T, params?: string | $ZodLiteralParams): schemas.$ZodLiteral<T>;
export type $ZodFileParams = TypeParams<schemas.$ZodFile>;
export declare function _file(Class: util.SchemaClass<schemas.$ZodFile>, params?: string | $ZodFileParams): schemas.$ZodFile;
export type $ZodTransformParams = TypeParams<schemas.$ZodTransform, "transform">;
export declare function _transform<I = unknown, O = I>(Class: util.SchemaClass<schemas.$ZodTransform>, fn: (input: I, ctx?: schemas.ParsePayload) => O): schemas.$ZodTransform<Awaited<O>, I>;
export type $ZodOptionalParams = TypeParams<schemas.$ZodOptional, "innerType">;
export declare function _optional<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodOptional>, innerType: T): schemas.$ZodOptional<T>;
export type $ZodNullableParams = TypeParams<schemas.$ZodNullable, "innerType">;
export declare function _nullable<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodNullable>, innerType: T): schemas.$ZodNullable<T>;
export type $ZodDefaultParams = TypeParams<schemas.$ZodDefault, "innerType" | "defaultValue">;
export declare function _default<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodDefault>, innerType: T, defaultValue: util.NoUndefined<core.output<T>> | (() => util.NoUndefined<core.output<T>>)): schemas.$ZodDefault<T>;
export type $ZodNonOptionalParams = TypeParams<schemas.$ZodNonOptional, "innerType">;
export declare function _nonoptional<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodNonOptional>, innerType: T, params?: string | $ZodNonOptionalParams): schemas.$ZodNonOptional<T>;
export type $ZodSuccessParams = TypeParams<schemas.$ZodSuccess, "innerType">;
export declare function _success<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodSuccess>, innerType: T): schemas.$ZodSuccess<T>;
export type $ZodCatchParams = TypeParams<schemas.$ZodCatch, "innerType" | "catchValue">;
export declare function _catch<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodCatch>, innerType: T, catchValue: core.output<T> | ((ctx: schemas.$ZodCatchCtx) => core.output<T>)): schemas.$ZodCatch<T>;
export type $ZodPipeParams = TypeParams<schemas.$ZodPipe, "in" | "out">;
export declare function _pipe<const A extends schemas.$ZodType, B extends schemas.$ZodType<unknown, core.output<A>> = schemas.$ZodType<unknown, core.output<A>>>(Class: util.SchemaClass<schemas.$ZodPipe>, in_: A, out: B | schemas.$ZodType<unknown, core.output<A>>): schemas.$ZodPipe<A, B>;
export type $ZodReadonlyParams = TypeParams<schemas.$ZodReadonly, "innerType">;
export declare function _readonly<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodReadonly>, innerType: T): schemas.$ZodReadonly<T>;
export type $ZodTemplateLiteralParams = TypeParams<schemas.$ZodTemplateLiteral, "parts">;
export declare function _templateLiteral<const Parts extends schemas.$ZodTemplateLiteralPart[]>(Class: util.SchemaClass<schemas.$ZodTemplateLiteral>, parts: Parts, params?: string | $ZodTemplateLiteralParams): schemas.$ZodTemplateLiteral<schemas.$PartsToTemplateLiteral<Parts>>;
export type $ZodLazyParams = TypeParams<schemas.$ZodLazy, "getter">;
export declare function _lazy<T extends schemas.$ZodType>(Class: util.SchemaClass<schemas.$ZodLazy>, getter: () => T): schemas.$ZodLazy<T>;
export type $ZodPromiseParams = TypeParams<schemas.$ZodPromise, "innerType">;
export declare function _promise<T extends schemas.$ZodObject>(Class: util.SchemaClass<schemas.$ZodPromise>, innerType: T): schemas.$ZodPromise<T>;
export type $ZodCustomParams = CheckTypeParams<schemas.$ZodCustom, "fn">;
export declare function _custom<O = unknown, I = O>(Class: util.SchemaClass<schemas.$ZodCustom>, fn: (data: O) => unknown, _params: string | $ZodCustomParams | undefined): schemas.$ZodCustom<O, I>;
export declare function _refine<O = unknown, I = O>(Class: util.SchemaClass<schemas.$ZodCustom>, fn: (data: O) => unknown, _params: string | $ZodCustomParams | undefined): schemas.$ZodCustom<O, I>;
export type $ZodSuperRefineIssue<T extends errors.$ZodIssueBase = errors.$ZodIssue> = T extends any ? RawIssue<T> : never;
type RawIssue<T extends errors.$ZodIssueBase> = T extends any ? util.Flatten<util.MakePartial<T, "message" | "path"> & {
    /** The schema or check that originated this issue. */
    readonly inst?: schemas.$ZodType | checks.$ZodCheck;
    /** If \`true\`, Zod will execute subsequent checks/refinements instead of immediately aborting */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
export interface $RefinementCtx<T = unknown> extends schemas.ParsePayload<T> {
    addIssue(arg: string | $ZodSuperRefineIssue): void;
}
export interface $ZodSuperRefineParams {
    /** If provided, the refinement runs only when this returns \`true\`. By default, it is skipped if prior parsing produced aborting issues. */
    when?: ((payload: schemas.ParsePayload) => boolean) | undefined;
}
export declare function _superRefine<T>(fn: (arg: T, payload: $RefinementCtx<T>) => void | Promise<void>, params?: $ZodSuperRefineParams): checks.$ZodCheck<T>;
export declare function _check<O = unknown>(fn: schemas.CheckFn<O>, params?: string | $ZodCustomParams): checks.$ZodCheck<O>;
export declare function describe<T>(description: string): checks.$ZodCheck<T>;
export declare function meta<T>(metadata: registries.GlobalMeta): checks.$ZodCheck<T>;
export interface $ZodStringBoolParams extends TypeParams {
    truthy?: string[];
    falsy?: string[];
    /**
     * Options: \`"sensitive"\`, \`"insensitive"\`
     *
     * @default \`"insensitive"\`
     */
    case?: "sensitive" | "insensitive" | undefined;
}
export declare function _stringbool(Classes: {
    Codec?: typeof schemas.$ZodCodec;
    Boolean?: typeof schemas.$ZodBoolean;
    String?: typeof schemas.$ZodString;
}, _params?: string | $ZodStringBoolParams): schemas.$ZodCodec<schemas.$ZodString, schemas.$ZodBoolean>;
export declare function _stringFormat<Format extends string>(Class: typeof schemas.$ZodCustomStringFormat, format: Format, fnOrRegex: ((arg: string) => util.MaybeAsync<unknown>) | RegExp, _params?: string | $ZodStringFormatParams): schemas.$ZodCustomStringFormat<Format>;
`,
    'file:///node_modules/zod/v4/core/checks.d.ts': `import * as core from "./core.js";
import type * as errors from "./errors.js";
import type * as schemas from "./schemas.js";
import * as util from "./util.js";
export interface $ZodCheckDef {
    check: string;
    error?: errors.$ZodErrorMap<never> | undefined;
    /** If true, no later checks will be executed if this check fails. Default \`false\`. */
    abort?: boolean | undefined;
    /** If provided, the check runs only when this returns \`true\`. By default, it is skipped if prior parsing produced aborting issues. */
    when?: ((payload: schemas.ParsePayload) => boolean) | undefined;
}
export interface $ZodCheckInternals<T> {
    def: $ZodCheckDef;
    /** The set of issues this check might throw. */
    issc?: errors.$ZodIssueBase;
    check(payload: schemas.ParsePayload<T>): util.MaybeAsync<void>;
    onattach: ((schema: schemas.$ZodType) => void)[];
}
export interface $ZodCheck<in T = never> {
    _zod: $ZodCheckInternals<T>;
}
export declare const $ZodCheck: core.$constructor<$ZodCheck<any>>;
export interface $ZodCheckLessThanDef extends $ZodCheckDef {
    check: "less_than";
    value: util.Numeric;
    inclusive: boolean;
}
export interface $ZodCheckLessThanInternals<T extends util.Numeric = util.Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckLessThanDef;
    issc: errors.$ZodIssueTooBig<T>;
}
export interface $ZodCheckLessThan<T extends util.Numeric = util.Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckLessThanInternals<T>;
}
export declare const $ZodCheckLessThan: core.$constructor<$ZodCheckLessThan>;
export interface $ZodCheckGreaterThanDef extends $ZodCheckDef {
    check: "greater_than";
    value: util.Numeric;
    inclusive: boolean;
}
export interface $ZodCheckGreaterThanInternals<T extends util.Numeric = util.Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckGreaterThanDef;
    issc: errors.$ZodIssueTooSmall<T>;
}
export interface $ZodCheckGreaterThan<T extends util.Numeric = util.Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckGreaterThanInternals<T>;
}
export declare const $ZodCheckGreaterThan: core.$constructor<$ZodCheckGreaterThan>;
export interface $ZodCheckMultipleOfDef<T extends number | bigint = number | bigint> extends $ZodCheckDef {
    check: "multiple_of";
    value: T;
}
export interface $ZodCheckMultipleOfInternals<T extends number | bigint = number | bigint> extends $ZodCheckInternals<T> {
    def: $ZodCheckMultipleOfDef<T>;
    issc: errors.$ZodIssueNotMultipleOf;
}
export interface $ZodCheckMultipleOf<T extends number | bigint = number | bigint> extends $ZodCheck<T> {
    _zod: $ZodCheckMultipleOfInternals<T>;
}
export declare const $ZodCheckMultipleOf: core.$constructor<$ZodCheckMultipleOf<number | bigint>>;
export type $ZodNumberFormats = "int32" | "uint32" | "float32" | "float64" | "safeint";
export interface $ZodCheckNumberFormatDef<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodCheckDef {
    check: "number_format";
    format: Format;
}
export interface $ZodCheckNumberFormatInternals<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodCheckInternals<number> {
    def: $ZodCheckNumberFormatDef<Format>;
    issc: errors.$ZodIssueInvalidType | errors.$ZodIssueTooBig<"number"> | errors.$ZodIssueTooSmall<"number">;
}
export interface $ZodCheckNumberFormat<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodCheck<number> {
    _zod: $ZodCheckNumberFormatInternals<Format>;
}
export declare const $ZodCheckNumberFormat: core.$constructor<$ZodCheckNumberFormat>;
export type $ZodBigIntFormats = "int64" | "uint64";
export interface $ZodCheckBigIntFormatDef<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodCheckDef {
    check: "bigint_format";
    format: Format;
}
export interface $ZodCheckBigIntFormatInternals<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodCheckInternals<bigint> {
    def: $ZodCheckBigIntFormatDef<Format>;
    issc: errors.$ZodIssueTooBig<"bigint"> | errors.$ZodIssueTooSmall<"bigint">;
}
export interface $ZodCheckBigIntFormat<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodCheck<bigint> {
    _zod: $ZodCheckBigIntFormatInternals<Format>;
}
export declare const $ZodCheckBigIntFormat: core.$constructor<$ZodCheckBigIntFormat>;
export interface $ZodCheckMaxSizeDef extends $ZodCheckDef {
    check: "max_size";
    maximum: number;
}
export interface $ZodCheckMaxSizeInternals<T extends util.HasSize = util.HasSize> extends $ZodCheckInternals<T> {
    def: $ZodCheckMaxSizeDef;
    issc: errors.$ZodIssueTooBig<T>;
}
export interface $ZodCheckMaxSize<T extends util.HasSize = util.HasSize> extends $ZodCheck<T> {
    _zod: $ZodCheckMaxSizeInternals<T>;
}
export declare const $ZodCheckMaxSize: core.$constructor<$ZodCheckMaxSize>;
export interface $ZodCheckMinSizeDef extends $ZodCheckDef {
    check: "min_size";
    minimum: number;
}
export interface $ZodCheckMinSizeInternals<T extends util.HasSize = util.HasSize> extends $ZodCheckInternals<T> {
    def: $ZodCheckMinSizeDef;
    issc: errors.$ZodIssueTooSmall<T>;
}
export interface $ZodCheckMinSize<T extends util.HasSize = util.HasSize> extends $ZodCheck<T> {
    _zod: $ZodCheckMinSizeInternals<T>;
}
export declare const $ZodCheckMinSize: core.$constructor<$ZodCheckMinSize>;
export interface $ZodCheckSizeEqualsDef extends $ZodCheckDef {
    check: "size_equals";
    size: number;
}
export interface $ZodCheckSizeEqualsInternals<T extends util.HasSize = util.HasSize> extends $ZodCheckInternals<T> {
    def: $ZodCheckSizeEqualsDef;
    issc: errors.$ZodIssueTooBig<T> | errors.$ZodIssueTooSmall<T>;
}
export interface $ZodCheckSizeEquals<T extends util.HasSize = util.HasSize> extends $ZodCheck<T> {
    _zod: $ZodCheckSizeEqualsInternals<T>;
}
export declare const $ZodCheckSizeEquals: core.$constructor<$ZodCheckSizeEquals>;
export interface $ZodCheckMaxLengthDef extends $ZodCheckDef {
    check: "max_length";
    maximum: number;
}
export interface $ZodCheckMaxLengthInternals<T extends util.HasLength = util.HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMaxLengthDef;
    issc: errors.$ZodIssueTooBig<T>;
}
export interface $ZodCheckMaxLength<T extends util.HasLength = util.HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMaxLengthInternals<T>;
}
export declare const $ZodCheckMaxLength: core.$constructor<$ZodCheckMaxLength>;
export interface $ZodCheckMinLengthDef extends $ZodCheckDef {
    check: "min_length";
    minimum: number;
}
export interface $ZodCheckMinLengthInternals<T extends util.HasLength = util.HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMinLengthDef;
    issc: errors.$ZodIssueTooSmall<T>;
}
export interface $ZodCheckMinLength<T extends util.HasLength = util.HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMinLengthInternals<T>;
}
export declare const $ZodCheckMinLength: core.$constructor<$ZodCheckMinLength>;
export interface $ZodCheckLengthEqualsDef extends $ZodCheckDef {
    check: "length_equals";
    length: number;
}
export interface $ZodCheckLengthEqualsInternals<T extends util.HasLength = util.HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckLengthEqualsDef;
    issc: errors.$ZodIssueTooBig<T> | errors.$ZodIssueTooSmall<T>;
}
export interface $ZodCheckLengthEquals<T extends util.HasLength = util.HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckLengthEqualsInternals<T>;
}
export declare const $ZodCheckLengthEquals: core.$constructor<$ZodCheckLengthEquals>;
export type $ZodStringFormats = "email" | "url" | "emoji" | "uuid" | "guid" | "nanoid" | "cuid" | "cuid2" | "ulid" | "xid" | "ksuid" | "datetime" | "date" | "time" | "duration" | "ipv4" | "ipv6" | "cidrv4" | "cidrv6" | "base64" | "base64url" | "json_string" | "e164" | "credit_card" | "iban" | "lowercase" | "uppercase" | "regex" | "jwt" | "starts_with" | "ends_with" | "includes";
export interface $ZodCheckStringFormatDef<Format extends string = string> extends $ZodCheckDef {
    check: "string_format";
    format: Format;
    pattern?: RegExp | undefined;
}
export interface $ZodCheckStringFormatInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStringFormatDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckStringFormat extends $ZodCheck<string> {
    _zod: $ZodCheckStringFormatInternals;
}
export declare const $ZodCheckStringFormat: core.$constructor<$ZodCheckStringFormat>;
export interface $ZodCheckRegexDef extends $ZodCheckStringFormatDef {
    format: "regex";
    pattern: RegExp;
}
export interface $ZodCheckRegexInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckRegexDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckRegex extends $ZodCheck<string> {
    _zod: $ZodCheckRegexInternals;
}
export declare const $ZodCheckRegex: core.$constructor<$ZodCheckRegex>;
export interface $ZodCheckLowerCaseDef extends $ZodCheckStringFormatDef<"lowercase"> {
}
export interface $ZodCheckLowerCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckLowerCaseDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckLowerCase extends $ZodCheck<string> {
    _zod: $ZodCheckLowerCaseInternals;
}
export declare const $ZodCheckLowerCase: core.$constructor<$ZodCheckLowerCase>;
export interface $ZodCheckUpperCaseDef extends $ZodCheckStringFormatDef<"uppercase"> {
}
export interface $ZodCheckUpperCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckUpperCaseDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckUpperCase extends $ZodCheck<string> {
    _zod: $ZodCheckUpperCaseInternals;
}
export declare const $ZodCheckUpperCase: core.$constructor<$ZodCheckUpperCase>;
export interface $ZodCheckIncludesDef extends $ZodCheckStringFormatDef<"includes"> {
    includes: string;
    position?: number | undefined;
}
export interface $ZodCheckIncludesInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckIncludesDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckIncludes extends $ZodCheck<string> {
    _zod: $ZodCheckIncludesInternals;
}
export declare const $ZodCheckIncludes: core.$constructor<$ZodCheckIncludes>;
export interface $ZodCheckStartsWithDef extends $ZodCheckStringFormatDef<"starts_with"> {
    prefix: string;
}
export interface $ZodCheckStartsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStartsWithDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckStartsWith extends $ZodCheck<string> {
    _zod: $ZodCheckStartsWithInternals;
}
export declare const $ZodCheckStartsWith: core.$constructor<$ZodCheckStartsWith>;
export interface $ZodCheckEndsWithDef extends $ZodCheckStringFormatDef<"ends_with"> {
    suffix: string;
}
export interface $ZodCheckEndsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckEndsWithDef;
    issc: errors.$ZodIssueInvalidStringFormat;
}
export interface $ZodCheckEndsWith extends $ZodCheckInternals<string> {
    _zod: $ZodCheckEndsWithInternals;
}
export declare const $ZodCheckEndsWith: core.$constructor<$ZodCheckEndsWith>;
export interface $ZodCheckPropertyDef extends $ZodCheckDef {
    check: "property";
    property: string;
    schema: schemas.$ZodType;
}
export interface $ZodCheckPropertyInternals<T extends object = object> extends $ZodCheckInternals<T> {
    def: $ZodCheckPropertyDef;
    issc: errors.$ZodIssue;
}
export interface $ZodCheckProperty<T extends object = object> extends $ZodCheck<T> {
    _zod: $ZodCheckPropertyInternals<T>;
}
export declare const $ZodCheckProperty: core.$constructor<$ZodCheckProperty>;
export interface $ZodCheckPropertiesDef<Shape extends schemas.$ZodShape = schemas.$ZodShape> extends $ZodCheckDef {
    check: "properties";
    shape: Shape;
}
export type $ZodCheckPropertiesInput<Shape extends schemas.$ZodShape = schemas.$ZodShape> = {
    -readonly [k in keyof Shape]: util.Widen<core.input<Shape[k]>>;
};
export interface $ZodCheckPropertiesInternals<Shape extends schemas.$ZodShape = schemas.$ZodShape> extends $ZodCheckInternals<$ZodCheckPropertiesInput<Shape>> {
    def: $ZodCheckPropertiesDef<Shape>;
    issc: errors.$ZodIssue;
}
export interface $ZodCheckProperties<Shape extends schemas.$ZodShape = schemas.$ZodShape> extends $ZodCheck<$ZodCheckPropertiesInput<Shape>> {
    _zod: $ZodCheckPropertiesInternals<Shape>;
    [Symbol.iterator](): Iterator<this>;
}
export declare const $ZodCheckProperties: core.$constructor<$ZodCheckProperties>;
export interface $ZodCheckMimeTypeDef extends $ZodCheckDef {
    check: "mime_type";
    mime: util.MimeTypes[];
}
export interface $ZodCheckMimeTypeInternals<T extends schemas.File = schemas.File> extends $ZodCheckInternals<T> {
    def: $ZodCheckMimeTypeDef;
    issc: errors.$ZodIssueInvalidValue;
}
export interface $ZodCheckMimeType<T extends schemas.File = schemas.File> extends $ZodCheck<T> {
    _zod: $ZodCheckMimeTypeInternals<T>;
}
export declare const $ZodCheckMimeType: core.$constructor<$ZodCheckMimeType>;
export interface $ZodCheckOverwriteDef<T = unknown> extends $ZodCheckDef {
    check: "overwrite";
    tx(value: T): T;
}
export interface $ZodCheckOverwriteInternals<T = unknown> extends $ZodCheckInternals<T> {
    def: $ZodCheckOverwriteDef<T>;
    issc: never;
}
export interface $ZodCheckOverwrite<T = unknown> extends $ZodCheck<T> {
    _zod: $ZodCheckOverwriteInternals<T>;
}
export declare const $ZodCheckOverwrite: core.$constructor<$ZodCheckOverwrite>;
export type $ZodChecks = $ZodCheckLessThan | $ZodCheckGreaterThan | $ZodCheckMultipleOf | $ZodCheckNumberFormat | $ZodCheckBigIntFormat | $ZodCheckMaxSize | $ZodCheckMinSize | $ZodCheckSizeEquals | $ZodCheckMaxLength | $ZodCheckMinLength | $ZodCheckLengthEquals | $ZodCheckStringFormat | $ZodCheckProperty | $ZodCheckMimeType | $ZodCheckOverwrite;
export type $ZodStringFormatChecks = $ZodCheckRegex | $ZodCheckLowerCase | $ZodCheckUpperCase | $ZodCheckIncludes | $ZodCheckStartsWith | $ZodCheckEndsWith | schemas.$ZodStringFormatTypes;
`,
    'file:///node_modules/zod/v4/core/compile.d.ts': `import type * as core from "./core.js";
import type { SomeType } from "./schemas.js";
/** @internal Sentinel the compiled fast path returns when validation fails. */
export declare const INVALID: unique symbol;
/** @internal */
export type INVALID = typeof INVALID;
interface CompileFnOptions {
    debug?: boolean | undefined;
    /** Emit a validator instead of a parser: skip building the output value where nothing reads it. */
    assertOnly?: boolean | undefined;
}
type CompiledFn<T> = ((input: unknown) => T | INVALID) & {
    code?: string | undefined;
    /** False when this function's INVALID does not strictly mean "the runtime would reject". */
    definite?: boolean | undefined;
};
/** Raised when the schema contains async refinements or transforms. Surfaces only under \`compile(schema, { strict: true })\`. */
export declare class ZodCompileAsyncError extends Error {
    constructor(message?: string);
}
/**
 * Raised when the schema contains a feature whose semantics the fast path
 * can't fully model. Both the shim in \`zod/compile\` and the default
 * \`compile()\` fall back to the runtime parser for that schema; only
 * \`compile(schema, { strict: true })\` lets it surface.
 */
export declare class ZodCompileUnsupportedError extends Error {
    /** Whether a container may absorb this refusal by running the child through the runtime (see \`compileChild\`). False when running only that node on the runtime is not equivalent to running the whole parse there — a runtime island gets no parse context, so a node that *consumes* issues rather than propagating them would finalize them against the wrong error map and still succeed. */
    readonly islandable: boolean;
    constructor(feature: string, islandable?: boolean);
}
export interface CompileOptions {
    /** Throw the refusal instead of returning the schema uncompiled. */
    strict?: boolean | undefined;
}
/**
 * AOT-compile a Zod schema. Returns a clone whose \`_zod.run\` calls a generated
 * fast path first and falls back to the original runtime parser on failure.
 *
 * - Forward direction only. Backward (encode), async, and \`skipChecks\` paths
 *   bypass the fast path and use the runtime directly.
 * - Never throws. A schema the fast path can't model is returned unchanged and
 *   keeps using the runtime parser. Pass \`{ strict: true }\` to get the refusal
 *   as a thrown \`ZodCompileUnsupportedError\` / \`ZodCompileAsyncError\` instead.
 * - The original schema is unchanged. The clone shares children by reference.
 */
export declare function compile<T extends SomeType>(schema: T, options?: CompileOptions): T;
/**
 * Install an already-generated parser as a schema's fast path. Returns a clone; the original is
 * unchanged.
 *
 * The parser takes the input and returns the parsed value, or \`INVALID\` to hand the parse to the
 * runtime. It must be synchronous and forward-direction, and it must build fresh output rather than
 * return its input — Zod cannot check either, and a wrong *success* is returned to the caller as-is.
 *
 * \`compile()\` is the ordinary entry point. This is for a build-time or native compiler that produces
 * a parser where \`new Function\` is unavailable.
 */
export declare function withParser<T extends SomeType>(schema: T, parser: (input: unknown) => core.output<T> | INVALID): T;
/**
 * @internal Generate the standalone compiled function: a parser by default, a validator under
 * \`assertOnly\`. Returns the parsed value, \`true\` where nothing reads the output, or \`INVALID\`. Consumers use \`compile()\`.
 */
export declare function compileFn<T extends SomeType>(schema: T, options?: CompileFnOptions): CompiledFn<core.output<T>>;
export {};
`,
    'file:///node_modules/zod/v4/core/core.d.ts': `import type * as errors from "./errors.js";
import type * as schemas from "./schemas.js";
import type { Class, ProtoOf } from "./util.js";
type ZodTrait = {
    _zod: {
        def: any;
        [k: string]: any;
    };
};
export interface $constructor<T extends ZodTrait, D = T["_zod"]["def"]> {
    new (def: D): T;
    init(inst: T, def: D): asserts inst is T;
}
export interface $constructorParams {
    Parent?: typeof Class;
}
/** A special constant with type \`never\` */
export declare const NEVER: never;
export declare function $constructor<T extends ZodTrait, D = T["_zod"]["def"]>(name: string, initializer: (inst: T, def: D) => void,
/** This trait's members, installed once on every prototype that composes it. They cannot be declared in the initializer above: that runs per instance, and the prototype is shared. */
proto?: ProtoOf<T>, params?: $constructorParams): $constructor<T, D>;
export declare const $brand: unique symbol;
export type $brand<T extends string | number | symbol = string | number | symbol> = {
    [$brand]: {
        [k in T]: true;
    };
};
export type $ZodBranded<T extends schemas.SomeType, Brand extends string | number | symbol, Dir extends "in" | "out" | "inout" = "out"> = T & (Dir extends "inout" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
        output: output<T> & $brand<Brand>;
    };
} : Dir extends "in" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
    };
} : {
    _zod: {
        output: output<T> & $brand<Brand>;
    };
});
export type $ZodNarrow<T extends schemas.SomeType, Out> = T & {
    _zod: {
        output: Out;
    };
};
export declare class $ZodAsyncError extends Error {
    constructor();
}
export declare class $ZodEncodeError extends Error {
    constructor(name: string);
}
export type input<T> = T extends {
    _zod: {
        input: any;
    };
} ? T["_zod"]["input"] : unknown;
export type output<T> = T extends {
    _zod: {
        output: any;
    };
} ? T["_zod"]["output"] : unknown;
export type { output as infer };
export interface $ZodConfig {
    /** Custom error map. Overrides \`config().localeError\`. */
    customError?: errors.$ZodErrorMap | undefined;
    /** Localized error map. Lowest priority. */
    localeError?: errors.$ZodErrorMap | undefined;
    /** Disable JIT schema compilation. Useful in environments that disallow \`eval\`. */
    jitless?: boolean | undefined;
    /** Enables parsing input that contains reference cycles. Read when a schema is constructed. */
    memoizer?: schemas.$ZodMemoizer | undefined;
    /**
     * Internal: post-processor invoked on every freshly-constructed schema
     * instance, after init and deferred fns run. Set by \`import "zod/compile"\`
     * to install AOT compilation. Not part of the public API.
     * @internal
     */
    postProcessor?: ((inst: any) => void) | undefined;
}
export declare const globalConfig: $ZodConfig;
export declare function config(newConfig?: Partial<$ZodConfig>): $ZodConfig;
`,
    'file:///node_modules/zod/v4/core/doc.d.ts': `type ModeWriter = (doc: Doc, modes: {
    execution: "sync" | "async";
}) => void;
export declare class Doc {
    args: string[];
    /** Bindings the compiled function closes over, by name. */
    closed: Record<string, unknown>;
    content: string[];
    indent: number;
    constructor(args?: string[], closed?: Record<string, unknown>);
    indented(fn: (doc: Doc) => void): void;
    write(fn: ModeWriter): void;
    write(line: string): void;
    compile(): any;
}
export {};
`,
    'file:///node_modules/zod/v4/core/errors.d.ts': `import type { $ZodCheck, $ZodStringFormats } from "./checks.js";
import { $constructor } from "./core.js";
import type { $ZodType } from "./schemas.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import * as util from "./util.js";
export interface $ZodIssueBase {
    readonly code?: string;
    readonly input?: unknown;
    readonly path: PropertyKey[];
    readonly message: string;
}
export type $ZodInvalidTypeExpected = "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "undefined" | "null" | "never" | "void" | "date" | "array" | "object" | "tuple" | "record" | "map" | "set" | "file" | "nonoptional" | "nan" | "function" | (string & {});
export interface $ZodIssueInvalidType<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_type";
    readonly expected: $ZodInvalidTypeExpected;
    readonly input?: Input;
}
export interface $ZodIssueTooBig<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_big";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly maximum: number | bigint;
    readonly inclusive?: boolean;
    readonly exact?: boolean;
    readonly input?: Input;
}
export interface $ZodIssueTooSmall<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_small";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly minimum: number | bigint;
    /** True if the allowable range includes the minimum */
    readonly inclusive?: boolean;
    /** True if the allowed value is fixed (e.g.\` z.length(5)\`), not a range (\`z.minLength(5)\`) */
    readonly exact?: boolean;
    readonly input?: Input;
}
export interface $ZodIssueInvalidStringFormat extends $ZodIssueBase {
    readonly code: "invalid_format";
    readonly format: $ZodStringFormats | (string & {});
    readonly pattern?: string;
    readonly input?: string;
}
export interface $ZodIssueNotMultipleOf<Input extends number | bigint = number | bigint> extends $ZodIssueBase {
    readonly code: "not_multiple_of";
    readonly divisor: number;
    readonly input?: Input;
}
export interface $ZodIssueUnrecognizedKeys extends $ZodIssueBase {
    readonly code: "unrecognized_keys";
    readonly keys: string[];
    readonly input?: Record<string, unknown>;
}
interface $ZodIssueInvalidUnionNoMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: $ZodIssue[][];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly options?: util.Primitive[];
    readonly inclusive?: true;
}
interface $ZodIssueInvalidUnionMultipleMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: [];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive: false;
    /** Indices of the options that matched */
    readonly matches: number[];
}
export type $ZodIssueInvalidUnion = $ZodIssueInvalidUnionNoMatch | $ZodIssueInvalidUnionMultipleMatch;
export interface $ZodIssueInvalidKey<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_key";
    readonly origin: "map" | "record";
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
export interface $ZodIssueInvalidElement<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_element";
    readonly origin: "map" | "set";
    readonly key: unknown;
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
export interface $ZodIssueInvalidValue<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_value";
    readonly values: util.Primitive[];
    readonly input?: Input;
}
export interface $ZodIssueCustom extends $ZodIssueBase {
    readonly code: "custom";
    readonly params?: Record<string, any> | undefined;
    readonly input?: unknown;
}
export interface $ZodIssueStringCommonFormats extends $ZodIssueInvalidStringFormat {
    format: Exclude<$ZodStringFormats, "regex" | "jwt" | "starts_with" | "ends_with" | "includes">;
}
export interface $ZodIssueStringInvalidRegex extends $ZodIssueInvalidStringFormat {
    format: "regex";
    pattern: string;
}
export interface $ZodIssueStringInvalidJWT extends $ZodIssueInvalidStringFormat {
    format: "jwt";
    algorithm?: string;
}
export interface $ZodIssueStringStartsWith extends $ZodIssueInvalidStringFormat {
    format: "starts_with";
    prefix: string;
}
export interface $ZodIssueStringEndsWith extends $ZodIssueInvalidStringFormat {
    format: "ends_with";
    suffix: string;
}
export interface $ZodIssueStringIncludes extends $ZodIssueInvalidStringFormat {
    format: "includes";
    includes: string;
}
export type $ZodStringFormatIssues = $ZodIssueStringCommonFormats | $ZodIssueStringInvalidRegex | $ZodIssueStringInvalidJWT | $ZodIssueStringStartsWith | $ZodIssueStringEndsWith | $ZodIssueStringIncludes;
export type $ZodIssue = $ZodIssueInvalidType | $ZodIssueTooBig | $ZodIssueTooSmall | $ZodIssueInvalidStringFormat | $ZodIssueNotMultipleOf | $ZodIssueUnrecognizedKeys | $ZodIssueInvalidUnion | $ZodIssueInvalidKey | $ZodIssueInvalidElement | $ZodIssueInvalidValue | $ZodIssueCustom;
export type $ZodIssueCode = $ZodIssue["code"];
export type $ZodInternalIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue<T> : never;
type RawIssue<T extends $ZodIssueBase> = T extends any ? util.Flatten<util.MakePartial<T, "message" | "path"> & {
    /** The input data */
    readonly input: unknown;
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** The schema that owns the issue. Equal to \`inst\` when a schema originated the issue, and the schema the check was attached to when a check did. */
    readonly schema?: $ZodType | undefined;
    /** If \`true\`, Zod will continue executing checks/refinements after this issue. */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
export type $ZodRawIssue<T extends $ZodIssueBase = $ZodIssue> = $ZodInternalIssue<T>;
export interface $ZodErrorMap<T extends $ZodIssueBase = $ZodIssue> {
    (issue: $ZodRawIssue<T>): {
        message: string;
    } | string | undefined | null;
}
export interface $ZodError<T = unknown> extends Error {
    type: T;
    issues: $ZodIssue[];
    _zod: {
        output: T;
        def: $ZodIssue[];
    };
    stack?: string;
    name: string;
}
export declare const $ZodError: $constructor<$ZodError>;
interface $ZodRealError<T = any> extends $ZodError<T> {
}
export declare const $ZodRealError: $constructor<$ZodRealError>;
export type $ZodFlattenedError<T, U = string> = _FlattenedError<T, U>;
type _FlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in keyof T]?: U[];
    };
};
export declare function flattenError<T>(error: $ZodError<T>): _FlattenedError<T>;
export declare function flattenError<T, U>(error: $ZodError<T>, mapper?: (issue: $ZodIssue) => U): _FlattenedError<T, U>;
type _ZodFormattedError<T, U = string> = T extends [any, ...any[]] ? {
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
} : T extends any[] ? {
    [k: number]: $ZodFormattedError<T[number], U>;
} : T extends object ? util.Flatten<{
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
}> : any;
export type $ZodFormattedError<T, U = string> = {
    _errors: U[];
} & util.Flatten<_ZodFormattedError<T, U>>;
export declare function formatError<T>(error: $ZodError<T>): $ZodFormattedError<T>;
export declare function formatError<T, U>(error: $ZodError<T>, mapper?: (issue: $ZodIssue) => U): $ZodFormattedError<T, U>;
export type $ZodErrorTree<T, U = string> = T extends util.Primitive ? {
    errors: U[];
} : T extends [any, ...any[]] ? {
    errors: U[];
    items?: {
        [K in keyof T]?: $ZodErrorTree<T[K], U>;
    };
} : T extends any[] ? {
    errors: U[];
    items?: Array<$ZodErrorTree<T[number], U>>;
} : T extends object ? {
    errors: U[];
    properties?: {
        [K in keyof T]?: $ZodErrorTree<T[K], U>;
    };
} : {
    errors: U[];
};
export declare function treeifyError<T>(error: $ZodError<T>): $ZodErrorTree<T>;
export declare function treeifyError<T, U>(error: $ZodError<T>, mapper?: (issue: $ZodIssue) => U): $ZodErrorTree<T, U>;
/** Format a ZodError as a human-readable string in the following form.
 *
 * From
 *
 * \`\`\`ts
 * ZodError {
 *   issues: [
 *     {
 *       expected: 'string',
 *       code: 'invalid_type',
 *       path: [ 'username' ],
 *       message: 'Invalid input: expected string'
 *     },
 *     {
 *       expected: 'number',
 *       code: 'invalid_type',
 *       path: [ 'favoriteNumbers', 1 ],
 *       message: 'Invalid input: expected number'
 *     }
 *   ];
 * }
 * \`\`\`
 *
 * to
 *
 * \`\`\`
 * username
 *   ✖ Expected number, received string at "username
 * favoriteNumbers[0]
 *   ✖ Invalid input: expected number
 * \`\`\`
 */
export declare function toDotPath(_path: readonly (string | number | symbol | StandardSchemaV1.PathSegment)[]): string;
export declare function prettifyError(error: StandardSchemaV1.FailureResult): string;
export {};
`,
    'file:///node_modules/zod/v4/core/index.d.ts': `export * from "./core.js";
export * from "./parse.js";
export * from "./errors.js";
export * from "./schemas.js";
export * from "./memoizer.js";
export * from "./checks.js";
export * from "./versions.js";
export * as util from "./util.js";
export { toZod } from "./util.js";
export * as regexes from "./regexes.js";
export * as locales from "../locales/index.js";
export * from "./registries.js";
export * from "./doc.js";
export * from "./compile.js";
export * from "./api.js";
export * from "./to-json-schema.js";
export { toJSONSchema } from "./json-schema-processors.js";
export { JSONSchemaGenerator } from "./json-schema-generator.js";
export * as JSONSchema from "./json-schema.js";
`,
    'file:///node_modules/zod/v4/core/json-schema-generator.d.ts': `import type * as JSONSchema from "./json-schema.js";
import type { $ZodRegistry } from "./registries.js";
import type * as schemas from "./schemas.js";
import { type JSONSchemaGeneratorParams, type ProcessParams, type Seen, type ToJSONSchemaContext } from "./to-json-schema.js";
/**
 * Parameters for the emit method of JSONSchemaGenerator.
 * @deprecated Use toJSONSchema function instead
 */
export type EmitParams = Pick<JSONSchemaGeneratorParams, "cycles" | "reused" | "external">;
/**
 * Parameters for JSONSchemaGenerator constructor.
 * @deprecated Use toJSONSchema function instead
 */
type JSONSchemaGeneratorConstructorParams = Pick<JSONSchemaGeneratorParams, "metadata" | "target" | "unrepresentable" | "override" | "io">;
/**
 * Legacy class-based interface for JSON Schema generation.
 * This class wraps the new functional implementation to provide backward compatibility.
 *
 * @deprecated Use the \`toJSONSchema\` function instead for new code.
 *
 * @example
 * \`\`\`typescript
 * // Legacy usage (still supported)
 * const gen = new JSONSchemaGenerator({ target: "draft-07" });
 * gen.process(schema);
 * const result = gen.emit(schema);
 *
 * // Preferred modern usage
 * const result = toJSONSchema(schema, { target: "draft-07" });
 * \`\`\`
 */
export declare class JSONSchemaGenerator {
    private ctx;
    /** @deprecated Access via ctx instead */
    get metadataRegistry(): $ZodRegistry<Record<string, any>>;
    /** @deprecated Access via ctx instead */
    get target(): ({} & string) | "draft-2020-12" | "draft-07" | "openapi-3.0" | "draft-04";
    /** @deprecated Access via ctx instead */
    get unrepresentable(): ToJSONSchemaContext["unrepresentable"];
    /** @deprecated Access via ctx instead */
    get override(): (ctx: {
        zodSchema: schemas.$ZodType;
        jsonSchema: JSONSchema.BaseSchema;
        path: (string | number)[];
    }) => void;
    /** @deprecated Access via ctx instead */
    get io(): "input" | "output";
    /** @deprecated Access via ctx instead */
    get counter(): number;
    set counter(value: number);
    /** @deprecated Access via ctx instead */
    get seen(): Map<schemas.$ZodType, Seen>;
    constructor(params?: JSONSchemaGeneratorConstructorParams);
    /**
     * Process a schema to prepare it for JSON Schema generation.
     * This must be called before emit().
     */
    process(schema: schemas.$ZodType, _params?: ProcessParams): JSONSchema.BaseSchema;
    /**
     * Emit the final JSON Schema after processing.
     * Must call process() first.
     */
    emit(schema: schemas.$ZodType, _params?: EmitParams): JSONSchema.BaseSchema;
}
export {};
`,
    'file:///node_modules/zod/v4/core/json-schema-processors.d.ts': `import type { $ZodRegistry } from "./registries.js";
import type * as schemas from "./schemas.js";
import { type Processor, type RegistryToJSONSchemaParams, type ToJSONSchemaParams, type ZodStandardJSONSchemaPayload } from "./to-json-schema.js";
type Bound = number | bigint | Date;
interface CheckAggregate<N extends Bound = Bound> {
    minimum?: N;
    maximum?: N;
    exclusiveMinimum?: N;
    exclusiveMaximum?: N;
    multipleOf?: number[];
    format?: string;
    isInt?: boolean;
    patterns?: Set<RegExp>;
    mime?: string[];
    contentEncoding?: string;
    laxFormat?: boolean;
}
export declare function aggregateChecks<N extends Bound = Bound>(schema: schemas.$ZodType): CheckAggregate<N>;
export declare const stringProcessor: Processor<schemas.$ZodString>;
export declare const numberProcessor: Processor<schemas.$ZodNumber>;
export declare const booleanProcessor: Processor<schemas.$ZodBoolean>;
export declare const bigintProcessor: Processor<schemas.$ZodBigInt>;
export declare const symbolProcessor: Processor<schemas.$ZodSymbol>;
export declare const nullProcessor: Processor<schemas.$ZodNull>;
export declare const undefinedProcessor: Processor<schemas.$ZodUndefined>;
export declare const voidProcessor: Processor<schemas.$ZodVoid>;
export declare const neverProcessor: Processor<schemas.$ZodNever>;
export declare const anyProcessor: Processor<schemas.$ZodAny>;
export declare const unknownProcessor: Processor<schemas.$ZodUnknown>;
export declare const dateProcessor: Processor<schemas.$ZodDate>;
export declare const enumProcessor: Processor<schemas.$ZodEnum>;
export declare const literalProcessor: Processor<schemas.$ZodLiteral>;
export declare const nanProcessor: Processor<schemas.$ZodNaN>;
export declare const templateLiteralProcessor: Processor<schemas.$ZodTemplateLiteral>;
export declare const fileProcessor: Processor<schemas.$ZodFile>;
export declare const successProcessor: Processor<schemas.$ZodSuccess>;
export declare const customProcessor: Processor<schemas.$ZodCustom>;
export declare const functionProcessor: Processor<schemas.$ZodFunction>;
export declare const transformProcessor: Processor<schemas.$ZodTransform>;
export declare const mapProcessor: Processor<schemas.$ZodMap>;
export declare const setProcessor: Processor<schemas.$ZodSet>;
export declare const arrayProcessor: Processor<schemas.$ZodArray>;
export declare const objectProcessor: Processor<schemas.$ZodObject>;
export declare const unionProcessor: Processor<schemas.$ZodUnion>;
export declare const intersectionProcessor: Processor<schemas.$ZodIntersection>;
export declare const tupleProcessor: Processor<schemas.$ZodTuple>;
export declare const recordProcessor: Processor<schemas.$ZodRecord>;
export declare const nullableProcessor: Processor<schemas.$ZodNullable>;
export declare const nonoptionalProcessor: Processor<schemas.$ZodNonOptional>;
export declare const defaultProcessor: Processor<schemas.$ZodDefault>;
export declare const prefaultProcessor: Processor<schemas.$ZodPrefault>;
export declare const catchProcessor: Processor<schemas.$ZodCatch>;
export declare const pipeProcessor: Processor<schemas.$ZodPipe>;
export declare const readonlyProcessor: Processor<schemas.$ZodReadonly>;
export declare const promiseProcessor: Processor<schemas.$ZodPromise>;
export declare const optionalProcessor: Processor<schemas.$ZodOptional>;
export declare const lazyProcessor: Processor<schemas.$ZodLazy>;
export declare const allProcessors: Record<string, Processor<any>>;
export declare function toJSONSchema<T extends schemas.$ZodType>(schema: T, params?: ToJSONSchemaParams): ZodStandardJSONSchemaPayload<T>;
export declare function toJSONSchema(registry: $ZodRegistry<{
    id?: string | undefined;
}>, params?: RegistryToJSONSchemaParams): {
    schemas: Record<string, ZodStandardJSONSchemaPayload<schemas.$ZodType>>;
};
export {};
`,
    'file:///node_modules/zod/v4/core/json-schema.d.ts': `export type Schema = ObjectSchema | ArraySchema | StringSchema | NumberSchema | IntegerSchema | BooleanSchema | NullSchema;
export type _JSONSchema = boolean | JSONSchema;
export type SchemaType = "object" | "array" | "string" | "number" | "boolean" | "null" | "integer";
export type JSONSchema = {
    [k: string]: unknown;
    $schema?: "https://json-schema.org/draft/2020-12/schema" | "http://json-schema.org/draft-07/schema#" | "http://json-schema.org/draft-04/schema#";
    $id?: string;
    $anchor?: string;
    $ref?: string;
    $dynamicRef?: string;
    $dynamicAnchor?: string;
    $vocabulary?: Record<string, boolean>;
    $comment?: string;
    $defs?: Record<string, JSONSchema>;
    type?: SchemaType | SchemaType[];
    additionalItems?: _JSONSchema;
    unevaluatedItems?: _JSONSchema;
    prefixItems?: _JSONSchema[];
    items?: _JSONSchema | _JSONSchema[];
    contains?: _JSONSchema;
    additionalProperties?: _JSONSchema;
    unevaluatedProperties?: _JSONSchema;
    properties?: Record<string, _JSONSchema>;
    patternProperties?: Record<string, _JSONSchema>;
    dependentSchemas?: Record<string, _JSONSchema>;
    propertyNames?: _JSONSchema;
    if?: _JSONSchema;
    then?: _JSONSchema;
    else?: _JSONSchema;
    allOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: _JSONSchema;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number | boolean;
    minimum?: number;
    exclusiveMinimum?: number | boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    dependentRequired?: Record<string, string[]>;
    enum?: Array<string | number | boolean | null>;
    const?: string | number | boolean | null;
    id?: string;
    title?: string;
    description?: string;
    default?: unknown;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    nullable?: boolean;
    examples?: unknown[];
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    contentSchema?: JSONSchema;
    _prefault?: unknown;
};
export type BaseSchema = JSONSchema;
export interface ObjectSchema extends JSONSchema {
    type: "object";
}
export interface ArraySchema extends JSONSchema {
    type: "array";
}
export interface StringSchema extends JSONSchema {
    type: "string";
}
export interface NumberSchema extends JSONSchema {
    type: "number";
}
export interface IntegerSchema extends JSONSchema {
    type: "integer";
}
export interface BooleanSchema extends JSONSchema {
    type: "boolean";
}
export interface NullSchema extends JSONSchema {
    type: "null";
}
`,
    'file:///node_modules/zod/v4/core/memoizer.d.ts': `import type { $ZodMemoizer, $ZodType } from "./schemas.js";
export declare class $ZodCyclicError extends Error {
    constructor();
}
/**
 * Whether one parse can re-enter this schema, i.e. its subtree contains a cycle.
 * Exported for \`z.compile\`, which refuses to compile such a schema: cycle
 * breaking is driven from here off state keyed on the parse context, and a
 * generated fast path has no context to key on.
 */
export declare function isRecursiveSchema(inst: $ZodType): boolean;
/** The memoizer that gives containers cycle support. \`zod\` installs it by default; \`zod/mini\` opts in with \`config({ memoizer: memoizer() })\`. */
export declare function memoizer(): $ZodMemoizer;
/** Whether this value is a node a back-edge resolved to before it finished. */
export declare function isBackEdge(ctx: object, value: unknown): boolean;
`,
    'file:///node_modules/zod/v4/core/parse.d.ts': `import * as core from "./core.js";
import * as errors from "./errors.js";
import type * as schemas from "./schemas.js";
import * as util from "./util.js";
export type $ZodErrorClass = {
    new (issues: errors.$ZodIssue[]): errors.$ZodError;
};
type $ParseParams = {
    callee?: util.AnyFunc;
    Err?: $ZodErrorClass | undefined;
};
export type $Parse = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => core.output<T>;
export declare const _parse: (_Err: $ZodErrorClass) => $Parse;
export declare const parse: $Parse;
export type $ParseAsync = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => Promise<core.output<T>>;
export declare const _parseAsync: (_Err: $ZodErrorClass) => $ParseAsync;
export declare const parseAsync: $ParseAsync;
export type $SafeParse = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => util.SafeParseResult<core.output<T>>;
export declare const _safeParse: (_Err: $ZodErrorClass) => $SafeParse;
export declare const safeParse: $SafeParse;
export type $SafeParseAsync = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => Promise<util.SafeParseResult<core.output<T>>>;
export declare const _safeParseAsync: (_Err: $ZodErrorClass) => $SafeParseAsync;
export declare const safeParseAsync: $SafeParseAsync;
export type $Validate = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => value is core.input<T>;
export declare const validate: $Validate;
export type $ValidateAsync = <T extends schemas.$ZodType>(schema: T, value: unknown, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => Promise<boolean>;
export declare const validateAsync: $ValidateAsync;
export type $Encode = <T extends schemas.$ZodType>(schema: T, value: core.output<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => core.input<T>;
export declare const _encode: (_Err: $ZodErrorClass) => $Encode;
export declare const encode: $Encode;
export type $Decode = <T extends schemas.$ZodType>(schema: T, value: core.input<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => core.output<T>;
export declare const _decode: (_Err: $ZodErrorClass) => $Decode;
export declare const decode: $Decode;
export type $EncodeAsync = <T extends schemas.$ZodType>(schema: T, value: core.output<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => Promise<core.input<T>>;
export declare const _encodeAsync: (_Err: $ZodErrorClass) => $EncodeAsync;
export declare const encodeAsync: $EncodeAsync;
export type $DecodeAsync = <T extends schemas.$ZodType>(schema: T, value: core.input<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>, _params?: $ParseParams) => Promise<core.output<T>>;
export declare const _decodeAsync: (_Err: $ZodErrorClass) => $DecodeAsync;
export declare const decodeAsync: $DecodeAsync;
export type $SafeEncode = <T extends schemas.$ZodType>(schema: T, value: core.output<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => util.SafeParseResult<core.input<T>>;
export declare const _safeEncode: (_Err: $ZodErrorClass) => $SafeEncode;
export declare const safeEncode: $SafeEncode;
export type $SafeDecode = <T extends schemas.$ZodType>(schema: T, value: core.input<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => util.SafeParseResult<core.output<T>>;
export declare const _safeDecode: (_Err: $ZodErrorClass) => $SafeDecode;
export declare const safeDecode: $SafeDecode;
export type $SafeEncodeAsync = <T extends schemas.$ZodType>(schema: T, value: core.output<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => Promise<util.SafeParseResult<core.input<T>>>;
export declare const _safeEncodeAsync: (_Err: $ZodErrorClass) => $SafeEncodeAsync;
export declare const safeEncodeAsync: $SafeEncodeAsync;
export type $SafeDecodeAsync = <T extends schemas.$ZodType>(schema: T, value: core.input<T>, _ctx?: schemas.ParseContext<errors.$ZodIssue>) => Promise<util.SafeParseResult<core.output<T>>>;
export declare const _safeDecodeAsync: (_Err: $ZodErrorClass) => $SafeDecodeAsync;
export declare const safeDecodeAsync: $SafeDecodeAsync;
export {};
`,
    'file:///node_modules/zod/v4/core/regexes.d.ts': `/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare const cuid: RegExp;
export declare const cuid2: RegExp;
export declare const ulid: RegExp;
export declare const xid: RegExp;
export declare const ksuid: RegExp;
export declare const nanoid: RegExp;
export declare function nanoidOfLength(length: number): RegExp;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
export declare const duration: RegExp;
/** Implements ISO 8601-2 extensions like explicit +- prefixes, mixing weeks with other units, and fractional/negative components. */
export declare const extendedDuration: RegExp;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
export declare const guid: RegExp;
/** Returns a regex for validating an RFC 9562/4122 UUID.
 *
 * @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
export declare const uuid: (version?: number | undefined) => RegExp;
export declare const uuid4: RegExp;
export declare const uuid6: RegExp;
export declare const uuid7: RegExp;
/** Practical email validation */
export declare const email: RegExp;
/** Equivalent to the HTML5 input[type=email] validation implemented by browsers. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email */
export declare const html5Email: RegExp;
/** The classic emailregex.com regex for RFC 5322-compliant emails */
export declare const rfc5322Email: RegExp;
/** A loose regex that allows Unicode characters, enforces length limits, and that's about it. */
export declare const unicodeEmail: RegExp;
export declare const idnEmail: RegExp;
export declare const browserEmail: RegExp;
export declare function emoji(): RegExp;
export declare const ipv4: RegExp;
export declare const ipv6: RegExp;
export declare const mac: (delimiter?: string) => RegExp;
export declare const cidrv4: RegExp;
export declare const cidrv6: RegExp;
export declare const base64: RegExp;
export declare const base64url: RegExp;
export declare const hostname: RegExp;
export declare const domain: RegExp;
export declare const httpProtocol: RegExp;
export declare const e164: RegExp;
export declare const creditCard: RegExp;
export declare const currencyCode: RegExp;
export declare const iban: RegExp;
export declare const date: RegExp;
export declare function time(args: {
    precision?: number | null;
}): RegExp;
export declare function datetime(args: {
    precision?: number | null;
    offset?: boolean;
    local?: boolean;
}): RegExp;
export declare const anyString: RegExp;
export declare const string: (params?: {
    minimum?: number | undefined;
    maximum?: number | undefined;
}) => RegExp;
export declare const bigint: RegExp;
export declare const integer: RegExp;
export declare const number: RegExp;
export declare const boolean: RegExp;
declare const _null: RegExp;
export { _null as null };
declare const _undefined: RegExp;
export { _undefined as undefined };
export declare const lowercase: RegExp;
export declare const uppercase: RegExp;
export declare const hex: RegExp;
export declare const md5_hex: RegExp;
export declare const md5_base64: RegExp;
export declare const md5_base64url: RegExp;
export declare const sha1_hex: RegExp;
export declare const sha1_base64: RegExp;
export declare const sha1_base64url: RegExp;
export declare const sha256_hex: RegExp;
export declare const sha256_base64: RegExp;
export declare const sha256_base64url: RegExp;
export declare const sha384_hex: RegExp;
export declare const sha384_base64: RegExp;
export declare const sha384_base64url: RegExp;
export declare const sha512_hex: RegExp;
export declare const sha512_base64: RegExp;
export declare const sha512_base64url: RegExp;
`,
    'file:///node_modules/zod/v4/core/registries.d.ts': `import type * as core from "./core.js";
import type { $ZodType } from "./schemas.js";
export declare const $output: unique symbol;
export type $output = typeof $output;
export declare const $input: unique symbol;
export type $input = typeof $input;
export type $replace<Meta, S extends $ZodType> = Meta extends $output ? core.output<S> : Meta extends $input ? core.input<S> : Meta extends (infer M)[] ? $replace<M, S>[] : Meta extends (...args: infer P) => infer R ? (...args: {
    [K in keyof P]: $replace<P[K], S>;
}) => $replace<R, S> : Meta extends object ? {
    [K in keyof Meta]: $replace<Meta[K], S>;
} : Meta;
type MetadataType = object | undefined;
export declare class $ZodRegistry<Meta extends MetadataType = MetadataType, Schema extends $ZodType = $ZodType> {
    _meta: Meta;
    _schema: Schema;
    _map: WeakMap<Schema, $replace<Meta, Schema>>;
    _idmap: Map<string, Schema>;
    add<S extends Schema>(schema: S, ..._meta: undefined extends Meta ? [$replace<Meta, S>?] : [$replace<Meta, S>]): this;
    clear(): this;
    remove(schema: Schema): this;
    get<S extends Schema>(schema: S): $replace<Meta, S> | undefined;
    has(schema: Schema): boolean;
}
export interface JSONSchemaMeta {
    id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    deprecated?: boolean | undefined;
    [k: string]: unknown;
}
export interface GlobalMeta extends JSONSchemaMeta {
}
export declare function registry<T extends MetadataType = MetadataType, S extends $ZodType = $ZodType>(): $ZodRegistry<T, S>;
export declare const globalRegistry: $ZodRegistry<GlobalMeta>;
export {};
`,
    'file:///node_modules/zod/v4/core/schemas.d.ts': `import * as checks from "./checks.js";
import type { $ZodNumberFormats } from "./checks.js";
import type { $ZodBigIntFormats } from "./checks.js";
import * as core from "./core.js";
import type * as errors from "./errors.js";
import type * as JSONSchema from "./json-schema.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import type { ProcessParams, ToJSONSchemaContext } from "./to-json-schema.js";
import * as util from "./util.js";
import { version } from "./versions.js";
export interface ParseContext<T extends errors.$ZodIssueBase = never> {
    /** Customize error messages. */
    readonly error?: errors.$ZodErrorMap<T>;
    /** Include the \`input\` field in issue objects. Default \`false\`. */
    readonly reportInput?: boolean;
    /** Skip eval-based fast path. Default \`false\`. */
    readonly jitless?: boolean;
}
/** @internal */
export interface ParseContextInternal<T extends errors.$ZodIssueBase = never> extends ParseContext<T> {
    readonly async?: boolean | undefined;
    readonly direction?: "forward" | "backward";
    readonly skipChecks?: boolean;
    /** Set only by \`validate\`/\`validateAsync\`. A container may stop before its next child, never inside one, so a map entry and a tuple's fixed items parse whole. */
    readonly abortEarly?: boolean;
}
/** Gives a container cycle support: \`attach\` wraps its parse, and \`alloc\` registers the object it builds into before any child is parsed so a reference back to the same input resolves to it. */
export interface $ZodMemoizer {
    attach(inst: $ZodType): void;
    guard(inst: $ZodType): void;
    alloc<T extends object>(inst: $ZodType, payload: ParsePayload, empty: T, ctx: ParseContextInternal): T;
}
export interface ParsePayload<T = unknown> {
    value: T;
    issues: errors.$ZodRawIssue[];
    /** A way to mark a whole payload as aborted. Used in codecs/pipes. */
    aborted?: boolean;
    /** @internal Set when the value came from a repeat visit to a node still being
     * parsed. Its checks run on the node itself, against the finished value. */
    memo?: boolean | undefined;
}
export type CheckFn<T> = (input: ParsePayload<T>) => util.MaybeAsync<void>;
export interface $ZodTypeDef {
    type: "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "null" | "undefined" | "void" | "never" | "any" | "unknown" | "date" | "object" | "record" | "file" | "array" | "tuple" | "union" | "intersection" | "map" | "set" | "enum" | "literal" | "nullable" | "optional" | "nonoptional" | "success" | "transform" | "default" | "prefault" | "catch" | "nan" | "pipe" | "readonly" | "template_literal" | "promise" | "lazy" | "function" | "custom";
    error?: errors.$ZodErrorMap<never> | undefined;
    checks?: checks.$ZodCheck<never>[];
}
export interface _$ZodTypeInternals {
    /** The \`@zod/core\` version of this schema */
    version: typeof version;
    /** Schema definition. */
    def: $ZodTypeDef;
    /** @internal Randomly generated ID for this schema. */
    /** @internal List of deferred initializers. */
    deferred: util.AnyFunc[] | undefined;
    /** @internal Parses input and runs all checks (refinements). */
    run(payload: ParsePayload<any>, ctx: ParseContextInternal): util.MaybeAsync<ParsePayload>;
    /** @internal Parses input, doesn't run checks. */
    parse(payload: ParsePayload<any>, ctx: ParseContextInternal): util.MaybeAsync<ParsePayload>;
    /** @internal  Stores identifiers for the set of traits implemented by this schema. */
    traits: Set<string>;
    /** @internal Indicates that a schema output type should be considered optional inside objects.
     * @default Required
     */
    /** @internal Three rungs, each strictly stronger than the last:
     *   undefined    — required; the container may not omit this slot
     *   "optional"   — the container may omit it; nothing is supplied in its place
     *   "defaulted"  — the container may omit it AND this schema substitutes a value
     * Consumers asking "may the slot be absent?" test \`!== undefined\`.
     * $ZodOptional asks the stronger question and tests \`=== "defaulted"\`. */
    optin?: "optional" | "defaulted" | undefined;
    /** @internal */
    optout?: "optional" | undefined;
    /** @internal The set of literal values that will pass validation. Must be an exhaustive set. Used to determine optionality in z.record().
     *
     * Defined on: enum, const, literal, null, undefined
     * Passthrough: optional, nullable, branded, default, catch, pipe
     * Todo: unions?
     */
    values?: util.PrimitiveSet | undefined;
    /** Default value bubbled up from  */
    /** @internal A set of literal discriminators used for the fast path in discriminated unions. */
    propValues?: util.PropValues | undefined;
    /** @internal This flag indicates that a schema validation can be represented with a regular expression. Used to determine allowable schemas in z.templateLiteral(). */
    pattern: RegExp | undefined;
    /** @internal The constructor function of this schema. */
    constr: new (def: any) => $ZodType;
    /** @internal A catchall object for bag metadata related to this schema. Commonly modified by checks using \`onattach\`. */
    bag: Record<string, unknown>;
    /** @internal The set of issues this schema might throw during type checking. */
    isst: errors.$ZodIssueBase;
    /** @internal Subject to change, not a public API. */
    processJSONSchema?: ((ctx: ToJSONSchemaContext, json: JSONSchema.BaseSchema, params: ProcessParams) => void) | undefined;
    /** An optional method used to override \`toJSONSchema\` logic. */
    toJSONSchema?: () => unknown;
    /** @internal The parent of this schema. Only set during certain clone operations. */
    parent?: $ZodType | undefined;
}
/** @internal */
export interface $ZodTypeInternals<out O = unknown, out I = unknown> extends _$ZodTypeInternals {
    /** @internal The inferred output type */
    output: O;
    /** @internal The inferred input type */
    input: I;
}
export type $ZodStandardSchema<T> = StandardSchemaV1.Props<core.input<T>, core.output<T>>;
export type SomeType = {
    _zod: _$ZodTypeInternals;
};
export interface $ZodType<O = unknown, I = unknown, Internals extends $ZodTypeInternals<O, I> = $ZodTypeInternals<O, I>> {
    _zod: Internals;
    "~standard": $ZodStandardSchema<this>;
}
export interface _$ZodType<T extends $ZodTypeInternals = $ZodTypeInternals> extends $ZodType<T["output"], T["input"], T> {
}
export declare const $ZodType: core.$constructor<$ZodType>;
export declare function standardProps(inst: $ZodType): StandardSchemaV1.Props<any, any>;
export { clone } from "./util.js";
export interface $ZodStringDef extends $ZodTypeDef {
    type: "string";
    coerce?: boolean;
    checks?: checks.$ZodCheck<string>[];
}
export interface $ZodStringInternals<Input> extends $ZodTypeInternals<string, Input> {
    def: $ZodStringDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: errors.$ZodIssueInvalidType;
    bag: util.LoosePartial<{
        minimum: number;
        maximum: number;
        patterns: Set<RegExp>;
        format: string;
        contentEncoding: string;
        /** the pattern admits strings its \`format\` keyword forbids, so \`toJSONSchema\` must not emit it */
        laxFormat: boolean;
    }>;
}
export interface $ZodString<Input = unknown> extends _$ZodType<$ZodStringInternals<Input>> {
}
export declare const $ZodString: core.$constructor<$ZodString>;
export interface $ZodStringFormatDef<Format extends string = string> extends $ZodStringDef, checks.$ZodCheckStringFormatDef<Format> {
}
export interface $ZodStringFormatInternals<Format extends string = string> extends $ZodStringInternals<string>, checks.$ZodCheckStringFormatInternals {
    def: $ZodStringFormatDef<Format>;
}
export interface $ZodStringFormat<Format extends string = string> extends $ZodType {
    _zod: $ZodStringFormatInternals<Format>;
}
export declare const $ZodStringFormat: core.$constructor<$ZodStringFormat>;
export interface $ZodGUIDDef extends $ZodStringFormatDef<"guid"> {
}
export interface $ZodGUIDInternals extends $ZodStringFormatInternals<"guid"> {
}
export interface $ZodGUID extends $ZodType {
    _zod: $ZodGUIDInternals;
}
export declare const $ZodGUID: core.$constructor<$ZodGUID>;
export interface $ZodUUIDDef extends $ZodStringFormatDef<"uuid"> {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
}
export interface $ZodUUIDInternals extends $ZodStringFormatInternals<"uuid"> {
    def: $ZodUUIDDef;
}
export interface $ZodUUID extends $ZodType {
    _zod: $ZodUUIDInternals;
}
export declare const $ZodUUID: core.$constructor<$ZodUUID>;
export interface $ZodEmailDef extends $ZodStringFormatDef<"email"> {
}
export interface $ZodEmailInternals extends $ZodStringFormatInternals<"email"> {
}
export interface $ZodEmail extends $ZodType {
    _zod: $ZodEmailInternals;
}
export declare const $ZodEmail: core.$constructor<$ZodEmail>;
export interface $ZodURLDef extends $ZodStringFormatDef<"url"> {
    hostname?: RegExp | undefined;
    protocol?: RegExp | undefined;
    normalize?: boolean | undefined;
}
export interface $ZodURLInternals extends $ZodStringFormatInternals<"url"> {
    def: $ZodURLDef;
}
export interface $ZodURL extends $ZodType {
    _zod: $ZodURLInternals;
}
/** The \`://\` guard rejected the input before the URL constructor saw it. */
export declare const URL_BAD_FORMAT = 1;
/** The URL parser rejected the input. */
export declare const URL_UNPARSEABLE = 2;
export declare function canParseURL(input: string): boolean;
export declare function validateURL(trimmed: string, def: Pick<$ZodURLDef, "protocol" | "hostname" | "normalize">): URL | true | typeof URL_BAD_FORMAT | typeof URL_UNPARSEABLE;
/** Parses a URL while preserving the non-normalizing HTTP guard. */
export declare function parseURLObject(trimmed: string, def: Pick<$ZodURLDef, "protocol" | "normalize">): URL | typeof URL_BAD_FORMAT | typeof URL_UNPARSEABLE;
/** The URL parser deletes every ASCII tab, LF and CR from its input before it parses, so \`new URL("https://exa\\nmple.com")\` reports on \`example.com\`. Applying the same deletion to the returned value closes the half of that divergence which can move the host; the parser's other rewrite, stripping C0 controls at the edges, cannot. */
export declare function stripTabAndNewline(value: string): string;
export declare function urlHostnameOk(url: URL, hostname: RegExp): boolean;
export declare function urlProtocolOk(url: URL, protocol: RegExp): boolean;
export declare const $ZodURL: core.$constructor<$ZodURL>;
export interface $ZodEmojiDef extends $ZodStringFormatDef<"emoji"> {
}
export interface $ZodEmojiInternals extends $ZodStringFormatInternals<"emoji"> {
}
export interface $ZodEmoji extends $ZodType {
    _zod: $ZodEmojiInternals;
}
export declare const $ZodEmoji: core.$constructor<$ZodEmoji>;
export interface $ZodNanoIDDef extends $ZodStringFormatDef<"nanoid"> {
    length?: number | undefined;
}
export interface $ZodNanoIDInternals extends $ZodStringFormatInternals<"nanoid"> {
    def: $ZodNanoIDDef;
}
export interface $ZodNanoID extends $ZodType {
    _zod: $ZodNanoIDInternals;
}
export declare const $ZodNanoID: core.$constructor<$ZodNanoID>;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export interface $ZodCUIDDef extends $ZodStringFormatDef<"cuid"> {
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export interface $ZodCUIDInternals extends $ZodStringFormatInternals<"cuid"> {
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export interface $ZodCUID extends $ZodType {
    _zod: $ZodCUIDInternals;
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare const $ZodCUID: core.$constructor<$ZodCUID>;
export interface $ZodCUID2Def extends $ZodStringFormatDef<"cuid2"> {
}
export interface $ZodCUID2Internals extends $ZodStringFormatInternals<"cuid2"> {
}
export interface $ZodCUID2 extends $ZodType {
    _zod: $ZodCUID2Internals;
}
export declare const $ZodCUID2: core.$constructor<$ZodCUID2>;
export interface $ZodULIDDef extends $ZodStringFormatDef<"ulid"> {
}
export interface $ZodULIDInternals extends $ZodStringFormatInternals<"ulid"> {
}
export interface $ZodULID extends $ZodType {
    _zod: $ZodULIDInternals;
}
export declare const $ZodULID: core.$constructor<$ZodULID>;
export interface $ZodXIDDef extends $ZodStringFormatDef<"xid"> {
}
export interface $ZodXIDInternals extends $ZodStringFormatInternals<"xid"> {
}
export interface $ZodXID extends $ZodType {
    _zod: $ZodXIDInternals;
}
export declare const $ZodXID: core.$constructor<$ZodXID>;
export interface $ZodKSUIDDef extends $ZodStringFormatDef<"ksuid"> {
}
export interface $ZodKSUIDInternals extends $ZodStringFormatInternals<"ksuid"> {
}
export interface $ZodKSUID extends $ZodType {
    _zod: $ZodKSUIDInternals;
}
export declare const $ZodKSUID: core.$constructor<$ZodKSUID>;
export interface $ZodISODateTimeDef extends $ZodStringFormatDef<"datetime"> {
    precision: number | null;
    offset: boolean;
    local: boolean;
}
export interface $ZodISODateTimeInternals extends $ZodStringFormatInternals {
    def: $ZodISODateTimeDef;
}
export interface $ZodISODateTime extends $ZodType {
    _zod: $ZodISODateTimeInternals;
}
export declare const $ZodISODateTime: core.$constructor<$ZodISODateTime>;
export interface $ZodISODateDef extends $ZodStringFormatDef<"date"> {
}
export interface $ZodISODateInternals extends $ZodStringFormatInternals<"date"> {
}
export interface $ZodISODate extends $ZodType {
    _zod: $ZodISODateInternals;
}
export declare const $ZodISODate: core.$constructor<$ZodISODate>;
export interface $ZodISOTimeDef extends $ZodStringFormatDef<"time"> {
    precision?: number | null;
}
export interface $ZodISOTimeInternals extends $ZodStringFormatInternals<"time"> {
    def: $ZodISOTimeDef;
}
export interface $ZodISOTime extends $ZodType {
    _zod: $ZodISOTimeInternals;
}
export declare const $ZodISOTime: core.$constructor<$ZodISOTime>;
export interface $ZodISODurationDef extends $ZodStringFormatDef<"duration"> {
}
export interface $ZodISODurationInternals extends $ZodStringFormatInternals<"duration"> {
}
export interface $ZodISODuration extends $ZodType {
    _zod: $ZodISODurationInternals;
}
export declare const $ZodISODuration: core.$constructor<$ZodISODuration>;
export interface $ZodIPv4Def extends $ZodStringFormatDef<"ipv4"> {
    version?: "v4";
}
export interface $ZodIPv4Internals extends $ZodStringFormatInternals<"ipv4"> {
    def: $ZodIPv4Def;
}
export interface $ZodIPv4 extends $ZodType {
    _zod: $ZodIPv4Internals;
}
export declare const $ZodIPv4: core.$constructor<$ZodIPv4>;
export interface $ZodIPv6Def extends $ZodStringFormatDef<"ipv6"> {
    version?: "v6";
}
export interface $ZodIPv6Internals extends $ZodStringFormatInternals<"ipv6"> {
    def: $ZodIPv6Def;
}
export interface $ZodIPv6 extends $ZodType {
    _zod: $ZodIPv6Internals;
}
export declare function isValidIPv6(value: string): boolean;
export declare const $ZodIPv6: core.$constructor<$ZodIPv6>;
export interface $ZodMACDef extends $ZodStringFormatDef<"mac"> {
    delimiter?: string;
}
export interface $ZodMACInternals extends $ZodStringFormatInternals<"mac"> {
    def: $ZodMACDef;
}
export interface $ZodMAC extends $ZodType {
    _zod: $ZodMACInternals;
}
export declare const $ZodMAC: core.$constructor<$ZodMAC>;
export interface $ZodCIDRv4Def extends $ZodStringFormatDef<"cidrv4"> {
    version?: "v4";
}
export interface $ZodCIDRv4Internals extends $ZodStringFormatInternals<"cidrv4"> {
    def: $ZodCIDRv4Def;
}
export interface $ZodCIDRv4 extends $ZodType {
    _zod: $ZodCIDRv4Internals;
}
export declare const $ZodCIDRv4: core.$constructor<$ZodCIDRv4>;
export interface $ZodCIDRv6Def extends $ZodStringFormatDef<"cidrv6"> {
    version?: "v6";
}
export interface $ZodCIDRv6Internals extends $ZodStringFormatInternals<"cidrv6"> {
    def: $ZodCIDRv6Def;
}
export interface $ZodCIDRv6 extends $ZodType {
    _zod: $ZodCIDRv6Internals;
}
export declare function isValidCIDRv6(value: string): boolean;
export declare const $ZodCIDRv6: core.$constructor<$ZodCIDRv6>;
export declare function isValidBase64(data: string): boolean;
export interface $ZodBase64Def extends $ZodStringFormatDef<"base64"> {
}
export interface $ZodBase64Internals extends $ZodStringFormatInternals<"base64"> {
}
export interface $ZodBase64 extends $ZodType {
    _zod: $ZodBase64Internals;
}
export declare const base64Charset: RegExp;
export declare const $ZodBase64: core.$constructor<$ZodBase64>;
export declare const base64urlCharset: RegExp;
export declare function isValidBase64URL(data: string): boolean;
export interface $ZodBase64URLDef extends $ZodStringFormatDef<"base64url"> {
}
export interface $ZodBase64URLInternals extends $ZodStringFormatInternals<"base64url"> {
}
export interface $ZodBase64URL extends $ZodType {
    _zod: $ZodBase64URLInternals;
}
export declare const $ZodBase64URL: core.$constructor<$ZodBase64URL>;
export interface $ZodE164Def extends $ZodStringFormatDef<"e164"> {
}
export interface $ZodE164Internals extends $ZodStringFormatInternals<"e164"> {
}
export interface $ZodE164 extends $ZodType {
    _zod: $ZodE164Internals;
}
export declare const $ZodE164: core.$constructor<$ZodE164>;
export declare function isValidCreditCard(input: string): boolean;
export interface $ZodCreditCardDef extends $ZodStringFormatDef<"credit_card"> {
}
export interface $ZodCreditCardInternals extends $ZodStringFormatInternals<"credit_card"> {
    def: $ZodCreditCardDef;
}
export interface $ZodCreditCard extends $ZodType {
    _zod: $ZodCreditCardInternals;
}
export declare const $ZodCreditCard: core.$constructor<$ZodCreditCard>;
export declare function isValidIBAN(input: string): boolean;
export interface $ZodIBANDef extends $ZodStringFormatDef<"iban"> {
}
export interface $ZodIBANInternals extends $ZodStringFormatInternals<"iban"> {
    def: $ZodIBANDef;
}
export interface $ZodIBAN extends $ZodType {
    _zod: $ZodIBANInternals;
}
export declare const $ZodIBAN: core.$constructor<$ZodIBAN>;
export declare function isValidJWT(token: string, algorithm?: util.JWTAlgorithm | null): boolean;
export interface $ZodJWTDef extends $ZodStringFormatDef<"jwt"> {
    alg?: util.JWTAlgorithm | undefined;
}
export interface $ZodJWTInternals extends $ZodStringFormatInternals<"jwt"> {
    def: $ZodJWTDef;
}
export interface $ZodJWT extends $ZodType {
    _zod: $ZodJWTInternals;
}
export declare const $ZodJWT: core.$constructor<$ZodJWT>;
export interface $ZodCustomStringFormatDef<Format extends string = string> extends $ZodStringFormatDef<Format> {
    fn: (val: string) => unknown;
}
export interface $ZodCustomStringFormatInternals<Format extends string = string> extends $ZodStringFormatInternals<Format> {
    def: $ZodCustomStringFormatDef<Format>;
}
export interface $ZodCustomStringFormat<Format extends string = string> extends $ZodStringFormat<Format> {
    _zod: $ZodCustomStringFormatInternals<Format>;
}
export declare const $ZodCustomStringFormat: core.$constructor<$ZodCustomStringFormat>;
export interface $ZodNumberDef extends $ZodTypeDef {
    type: "number";
    coerce?: boolean;
}
export interface $ZodNumberInternals<Input = unknown> extends $ZodTypeInternals<number, Input> {
    def: $ZodNumberDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: errors.$ZodIssueInvalidType;
    bag: util.LoosePartial<{
        minimum: number;
        maximum: number;
        exclusiveMinimum: number;
        exclusiveMaximum: number;
        format: string;
        pattern: RegExp;
    }>;
}
export interface $ZodNumber<Input = unknown> extends $ZodType {
    _zod: $ZodNumberInternals<Input>;
}
export declare const $ZodNumber: core.$constructor<$ZodNumber>;
export interface $ZodNumberFormatDef<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodNumberDef, checks.$ZodCheckNumberFormatDef<Format> {
}
export interface $ZodNumberFormatInternals<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodNumberInternals<number>, checks.$ZodCheckNumberFormatInternals<Format> {
    def: $ZodNumberFormatDef<Format>;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodNumberFormat<Format extends $ZodNumberFormats = $ZodNumberFormats> extends $ZodType {
    _zod: $ZodNumberFormatInternals<Format>;
}
export declare const $ZodNumberFormat: core.$constructor<$ZodNumberFormat>;
export interface $ZodBooleanDef extends $ZodTypeDef {
    type: "boolean";
    coerce?: boolean;
    checks?: checks.$ZodCheck<boolean>[];
}
export interface $ZodBooleanInternals<T = unknown> extends $ZodTypeInternals<boolean, T> {
    pattern: RegExp;
    def: $ZodBooleanDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodBoolean<T = unknown> extends $ZodType {
    _zod: $ZodBooleanInternals<T>;
}
export declare const $ZodBoolean: core.$constructor<$ZodBoolean>;
export interface $ZodBigIntDef extends $ZodTypeDef {
    type: "bigint";
    coerce?: boolean;
}
export interface $ZodBigIntInternals<T = unknown> extends $ZodTypeInternals<bigint, T> {
    pattern: RegExp;
    /** @internal Internal API, use with caution */
    def: $ZodBigIntDef;
    isst: errors.$ZodIssueInvalidType;
    bag: util.LoosePartial<{
        minimum: bigint;
        maximum: bigint;
        format: string;
    }>;
}
export interface $ZodBigInt<T = unknown> extends $ZodType {
    _zod: $ZodBigIntInternals<T>;
}
export declare const $ZodBigInt: core.$constructor<$ZodBigInt>;
export interface $ZodBigIntFormatDef<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodBigIntDef, checks.$ZodCheckBigIntFormatDef<Format> {
    check: "bigint_format";
}
export interface $ZodBigIntFormatInternals<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodBigIntInternals<bigint>, checks.$ZodCheckBigIntFormatInternals<Format> {
    def: $ZodBigIntFormatDef<Format>;
}
export interface $ZodBigIntFormat<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends $ZodType {
    _zod: $ZodBigIntFormatInternals<Format>;
}
export declare const $ZodBigIntFormat: core.$constructor<$ZodBigIntFormat>;
export interface $ZodSymbolDef extends $ZodTypeDef {
    type: "symbol";
}
export interface $ZodSymbolInternals extends $ZodTypeInternals<symbol, symbol> {
    def: $ZodSymbolDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodSymbol extends $ZodType {
    _zod: $ZodSymbolInternals;
}
export declare const $ZodSymbol: core.$constructor<$ZodSymbol>;
export interface $ZodUndefinedDef extends $ZodTypeDef {
    type: "undefined";
}
export interface $ZodUndefinedInternals extends $ZodTypeInternals<undefined, undefined> {
    pattern: RegExp;
    def: $ZodUndefinedDef;
    values: util.PrimitiveSet;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodUndefined extends $ZodType {
    _zod: $ZodUndefinedInternals;
}
export declare const $ZodUndefined: core.$constructor<$ZodUndefined>;
export interface $ZodNullDef extends $ZodTypeDef {
    type: "null";
}
export interface $ZodNullInternals extends $ZodTypeInternals<null, null> {
    pattern: RegExp;
    def: $ZodNullDef;
    values: util.PrimitiveSet;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodNull extends $ZodType {
    _zod: $ZodNullInternals;
}
export declare const $ZodNull: core.$constructor<$ZodNull>;
export interface $ZodAnyDef extends $ZodTypeDef {
    type: "any";
}
export interface $ZodAnyInternals extends $ZodTypeInternals<any, any> {
    def: $ZodAnyDef;
    isst: never;
}
export interface $ZodAny extends $ZodType {
    _zod: $ZodAnyInternals;
}
export declare const $ZodAny: core.$constructor<$ZodAny>;
export interface $ZodUnknownDef extends $ZodTypeDef {
    type: "unknown";
}
export interface $ZodUnknownInternals extends $ZodTypeInternals<unknown, unknown> {
    def: $ZodUnknownDef;
    isst: never;
}
export interface $ZodUnknown extends $ZodType {
    _zod: $ZodUnknownInternals;
}
export declare const $ZodUnknown: core.$constructor<$ZodUnknown>;
export interface $ZodNeverDef extends $ZodTypeDef {
    type: "never";
}
export interface $ZodNeverInternals extends $ZodTypeInternals<never, never> {
    def: $ZodNeverDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodNever extends $ZodType {
    _zod: $ZodNeverInternals;
}
export declare const $ZodNever: core.$constructor<$ZodNever>;
export interface $ZodVoidDef extends $ZodTypeDef {
    type: "void";
}
export interface $ZodVoidInternals extends $ZodTypeInternals<void, void> {
    def: $ZodVoidDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodVoid extends $ZodType {
    _zod: $ZodVoidInternals;
}
export declare const $ZodVoid: core.$constructor<$ZodVoid>;
export interface $ZodDateDef extends $ZodTypeDef {
    type: "date";
    coerce?: boolean;
}
export interface $ZodDateInternals<T = unknown> extends $ZodTypeInternals<Date, T> {
    def: $ZodDateDef;
    isst: errors.$ZodIssueInvalidType;
    bag: util.LoosePartial<{
        minimum: Date;
        maximum: Date;
        format: string;
    }>;
}
export interface $ZodDate<T = unknown> extends $ZodType {
    _zod: $ZodDateInternals<T>;
}
export declare const $ZodDate: core.$constructor<$ZodDate>;
export interface $ZodArrayDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "array";
    element: T;
}
export interface $ZodArrayInternals<T extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodArrayDef<T>;
    isst: errors.$ZodIssueInvalidType;
    output: core.output<T>[];
    input: core.input<T>[];
}
export interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType<any, any, $ZodArrayInternals<T>> {
}
export declare const $ZodArray: core.$constructor<$ZodArray>;
type OptionalOutSchema = {
    _zod: {
        optout: "optional";
    };
};
type OptionalInSchema = {
    _zod: {
        optin: "optional" | "defaulted";
    };
};
export type $InferObjectOutput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? util.IsAny<T[keyof T]> extends true ? Record<string, unknown> : {
    [k in string]: core.output<T[keyof T]>;
} : keyof (T & Extra) extends never ? Record<string, never> : util.Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["output"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["output"];
} & Extra>;
export type $InferObjectInput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? util.IsAny<T[keyof T]> extends true ? Record<string, unknown> : {
    [k in string]: core.input<T[keyof T]>;
} : keyof (T & Extra) extends never ? Record<string, never> : util.Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: T[k]["_zod"]["input"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: T[k]["_zod"]["input"];
} & Extra>;
export type $ZodObjectConfig = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
export type $loose = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
export type $strict = {
    out: {};
    in: {};
};
export type $strip = {
    out: {};
    in: {};
};
export type $catchall<T extends SomeType> = {
    out: {
        [k: string]: core.output<T>;
    };
    in: {
        [k: string]: core.input<T>;
    };
};
export type $ZodShape = Readonly<{
    [k: string]: $ZodType;
}>;
export interface $ZodObjectDef<Shape extends $ZodShape = $ZodShape> extends $ZodTypeDef {
    type: "object";
    shape: Shape;
    catchall?: $ZodType | undefined;
}
export interface $ZodObjectInternals<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodShape, out Config extends $ZodObjectConfig = $ZodObjectConfig> extends _$ZodTypeInternals {
    def: $ZodObjectDef<Shape>;
    config: Config;
    isst: errors.$ZodIssueInvalidType | errors.$ZodIssueUnrecognizedKeys;
    propValues: util.PropValues;
    output: $InferObjectOutput<Shape, Config["out"]>;
    input: $InferObjectInput<Shape, Config["in"]>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
export type $ZodLooseShape = Record<string, any>;
export interface $ZodObject<
/** @ts-ignore Cast variance */
out Shape extends Readonly<$ZodShape> = Readonly<$ZodShape>, out Params extends $ZodObjectConfig = $ZodObjectConfig> extends $ZodType<any, any, $ZodObjectInternals<Shape, Params>> {
}
export declare const $ZodObject: core.$constructor<$ZodObject>;
export declare const $ZodObjectJIT: core.$constructor<$ZodObject>;
export type $InferUnionOutput<T extends SomeType> = T extends any ? core.output<T> : never;
export type $InferUnionInput<T extends SomeType> = T extends any ? core.input<T> : never;
export interface $ZodUnionDef<Options extends readonly SomeType[] = readonly $ZodType[]> extends $ZodTypeDef {
    type: "union";
    options: Options;
    inclusive?: boolean;
}
type IsOptionalIn<T extends SomeType> = T extends OptionalInSchema ? true : false;
type IsOptionalOut<T extends SomeType> = T extends OptionalOutSchema ? true : false;
export interface $ZodUnionInternals<T extends readonly SomeType[] = readonly $ZodType[]> extends _$ZodTypeInternals {
    def: $ZodUnionDef<T>;
    isst: errors.$ZodIssueInvalidUnion;
    pattern: T[number]["_zod"]["pattern"];
    values: T[number]["_zod"]["values"];
    output: $InferUnionOutput<T[number]>;
    input: $InferUnionInput<T[number]>;
    optin: IsOptionalIn<T[number]> extends false ? "optional" | "defaulted" | undefined : "optional" | "defaulted";
    optout: IsOptionalOut<T[number]> extends false ? "optional" | undefined : "optional";
}
export interface $ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodUnionInternals<T>> {
    _zod: $ZodUnionInternals<T>;
}
export declare const $ZodUnion: core.$constructor<$ZodUnion>;
export interface $ZodXorInternals<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodUnionInternals<T> {
}
export interface $ZodXor<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodXorInternals<T>> {
    _zod: $ZodXorInternals<T>;
}
export declare const $ZodXor: core.$constructor<$ZodXor>;
export interface $ZodDiscriminatedUnionDef<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionDef<Options> {
    discriminator: Disc;
    unionFallback?: boolean;
}
export interface $ZodDiscriminatedUnionInternals<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionInternals<Options> {
    def: $ZodDiscriminatedUnionDef<Options, Disc>;
    propValues: util.PropValues;
    bag: util.LoosePartial<{
        optionsMap: Map<util.Primitive, $ZodType | null>;
    }>;
}
/** The discriminator values a member of \`Options\` can declare. An omittable discriminator contributes \`undefined\`, matching what \`propValues\` claims for it. */
export type $DiscriminatorValue<Options extends readonly SomeType[], Disc extends string> = {
    [I in keyof Options]: Options[I] extends {
        _zod: {
            output: infer Out;
        };
    } ? Disc extends keyof Out ? Out[Disc] : never : never;
}[number];
/** The member of \`Options\` that declares \`V\`. */
export type $DiscriminatedOption<Options extends readonly SomeType[], Disc extends string, V> = {
    [I in keyof Options]: Options[I] extends {
        _zod: {
            output: infer Out;
        };
    } ? Disc extends keyof Out ? V extends Out[Disc] ? Options[I] : never : never : never;
}[number];
/** Returns the option whose discriminator claims \`value\`, or throws if ambiguous. */
export declare function getDiscriminatedOption<Options extends readonly SomeType[], Disc extends string, const V extends $DiscriminatorValue<Options, Disc>>(union: $ZodDiscriminatedUnion<Options, Disc>, value: V): $DiscriminatedOption<Options, Disc, V>;
export interface $ZodDiscriminatedUnion<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodType {
    _zod: $ZodDiscriminatedUnionInternals<Options, Disc>;
}
export declare const $ZodDiscriminatedUnion: core.$constructor<$ZodDiscriminatedUnion>;
export interface $ZodIntersectionDef<Left extends SomeType = $ZodType, Right extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "intersection";
    left: Left;
    right: Right;
}
export interface $ZodIntersectionInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodIntersectionDef<A, B>;
    isst: never;
    optin: A["_zod"]["optin"] | B["_zod"]["optin"];
    optout: A["_zod"]["optout"] | B["_zod"]["optout"];
    output: core.output<A> & core.output<B>;
    input: core.input<A> & core.input<B>;
}
export interface $ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodIntersectionInternals<A, B>;
}
export declare const $ZodIntersection: core.$constructor<$ZodIntersection>;
export declare function mergeValues(a: any, b: any): {
    valid: true;
    data: any;
} | {
    valid: false;
    mergeErrorPath: (string | number)[];
};
export interface $ZodTupleDef<T extends util.TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodTypeDef {
    type: "tuple";
    items: T;
    rest: Rest;
}
export type $InferTupleInputType<T extends util.TupleItems, Rest extends SomeType | null> = [
    ...TupleInputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? core.input<Rest>[] : [])
];
type TupleInputTypeNoOptionals<T extends util.TupleItems> = {
    [k in keyof T]: core.input<T[k]>;
};
type TupleInputTypeWithOptionals<T extends util.TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optin"] extends "optional" | "defaulted" ? [...TupleInputTypeWithOptionals<Prefix>, core.input<Tail>?] : TupleInputTypeNoOptionals<T> : [];
export type $InferTupleOutputType<T extends util.TupleItems, Rest extends SomeType | null> = [
    ...TupleOutputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? core.output<Rest>[] : [])
];
type TupleOutputTypeNoOptionals<T extends util.TupleItems> = {
    [k in keyof T]: core.output<T[k]>;
};
type TupleOutputTypeWithOptionals<T extends util.TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optout"] extends "optional" ? [...TupleOutputTypeWithOptionals<Prefix>, core.output<Tail>?] : TupleOutputTypeNoOptionals<T> : [];
export interface $ZodTupleInternals<T extends util.TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _$ZodTypeInternals {
    def: $ZodTupleDef<T, Rest>;
    isst: errors.$ZodIssueInvalidType | errors.$ZodIssueTooBig<unknown[]> | errors.$ZodIssueTooSmall<unknown[]>;
    output: $InferTupleOutputType<T, Rest>;
    input: $InferTupleInputType<T, Rest>;
}
export interface $ZodTuple<T extends util.TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodType {
    _zod: $ZodTupleInternals<T, Rest>;
}
export declare const $ZodTuple: core.$constructor<$ZodTuple>;
export type $ZodRecordKey = $ZodType<string | number | symbol, unknown>;
export interface $ZodRecordDef<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "record";
    keyType: Key;
    valueType: Value;
    /** @default "strict" - errors on keys not matching keyType. "loose" passes through non-matching keys unchanged. */
    mode?: "strict" | "loose";
    partial?: boolean;
}
export type $InferZodRecordOutput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<core.output<Key>, core.output<Value>>> : Record<core.output<Key>, core.output<Value>>;
export type $InferZodRecordInput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<core.input<Key> & PropertyKey, core.input<Value>>> : [
    Value
] extends [OptionalInSchema] ? Partial<Record<core.input<Key> & PropertyKey, core.input<Value>>> : Record<core.input<Key> & PropertyKey, core.input<Value>>;
export interface $ZodRecordInternals<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeInternals {
    def: $ZodRecordDef<Key, Value>;
    output: $InferZodRecordOutput<Key, Value>;
    input: $InferZodRecordInput<Key, Value>;
    isst: errors.$ZodIssueInvalidType | errors.$ZodIssueInvalidKey<Record<PropertyKey, unknown>>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
export type $partial = {
    "~~partial": true;
};
export interface $ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodRecordInternals<Key, Value>;
}
export declare const $ZodRecord: core.$constructor<$ZodRecord>;
export interface $ZodMapDef<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "map";
    keyType: Key;
    valueType: Value;
}
export interface $ZodMapInternals<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeInternals<Map<core.output<Key>, core.output<Value>>, Map<core.input<Key>, core.input<Value>>> {
    def: $ZodMapDef<Key, Value>;
    isst: errors.$ZodIssueInvalidType | errors.$ZodIssueInvalidKey | errors.$ZodIssueInvalidElement<unknown>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
export interface $ZodMap<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodMapInternals<Key, Value>;
}
export declare const $ZodMap: core.$constructor<$ZodMap>;
export interface $ZodSetDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "set";
    valueType: T;
}
export interface $ZodSetInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Set<core.output<T>>, Set<core.input<T>>> {
    def: $ZodSetDef<T>;
    isst: errors.$ZodIssueInvalidType;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
export interface $ZodSet<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSetInternals<T>;
}
export declare const $ZodSet: core.$constructor<$ZodSet>;
export type $InferEnumOutput<T extends util.EnumLike> = T[keyof T] & {};
export type $InferEnumInput<T extends util.EnumLike> = T[keyof T] & {};
export interface $ZodEnumDef<T extends util.EnumLike = util.EnumLike> extends $ZodTypeDef {
    type: "enum";
    entries: T;
}
export interface $ZodEnumInternals<
/** @ts-ignore Cast variance */
out T extends util.EnumLike = util.EnumLike> extends $ZodTypeInternals<$InferEnumOutput<T>, $InferEnumInput<T>> {
    def: $ZodEnumDef<T>;
    /** @deprecated Internal API, use with caution (not deprecated) */
    values: util.PrimitiveSet;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    isst: errors.$ZodIssueInvalidValue;
}
export interface $ZodEnum<T extends util.EnumLike = util.EnumLike> extends $ZodType {
    _zod: $ZodEnumInternals<T>;
}
export declare const $ZodEnum: core.$constructor<$ZodEnum>;
export interface $ZodLiteralDef<T extends util.Literal> extends $ZodTypeDef {
    type: "literal";
    values: T[];
}
export interface $ZodLiteralInternals<T extends util.Literal = util.Literal> extends $ZodTypeInternals<T, T> {
    def: $ZodLiteralDef<T>;
    values: Set<T>;
    pattern: RegExp;
    isst: errors.$ZodIssueInvalidValue;
}
export interface $ZodLiteral<T extends util.Literal = util.Literal> extends $ZodType {
    _zod: $ZodLiteralInternals<T>;
}
export declare const $ZodLiteral: core.$constructor<$ZodLiteral>;
type _File = typeof globalThis extends {
    File: infer F extends new (...args: any[]) => any;
} ? InstanceType<F> : {};
/** Do not reference this directly. */
export interface File extends _File {
    readonly type: string;
    readonly size: number;
}
export interface $ZodFileDef extends $ZodTypeDef {
    type: "file";
}
export interface $ZodFileInternals extends $ZodTypeInternals<File, File> {
    def: $ZodFileDef;
    isst: errors.$ZodIssueInvalidType;
    bag: util.LoosePartial<{
        minimum: number;
        maximum: number;
        mime: util.MimeTypes[];
    }>;
}
export interface $ZodFile extends $ZodType {
    _zod: $ZodFileInternals;
}
export declare const $ZodFile: core.$constructor<$ZodFile>;
export interface $ZodTransformDef extends $ZodTypeDef {
    type: "transform";
    transform: (input: unknown, payload: ParsePayload<unknown>) => util.MaybeAsync<unknown>;
}
export interface $ZodTransformInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I> {
    def: $ZodTransformDef;
    isst: never;
}
export interface $ZodTransform<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodTransformInternals<O, I>;
}
export declare const $ZodTransform: core.$constructor<$ZodTransform>;
export interface $ZodOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "optional";
    innerType: T;
}
export interface $ZodOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<T> | undefined, core.input<T> | undefined> {
    def: $ZodOptionalDef<T>;
    optin: "optional" | "defaulted";
    optout: "optional";
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
export interface $ZodOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodOptionalInternals<T>;
}
export declare const $ZodOptional: core.$constructor<$ZodOptional>;
export interface $ZodExactOptionalDef<T extends SomeType = $ZodType> extends $ZodOptionalDef<T> {
}
export interface $ZodExactOptionalInternals<T extends SomeType = $ZodType> extends $ZodOptionalInternals<T> {
    def: $ZodExactOptionalDef<T>;
    output: core.output<T>;
    input: core.input<T>;
}
export interface $ZodExactOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodExactOptionalInternals<T>;
}
export declare const $ZodExactOptional: core.$constructor<$ZodExactOptional>;
export interface $ZodNullableDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nullable";
    innerType: T;
}
export interface $ZodNullableInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<T> | null, core.input<T> | null> {
    def: $ZodNullableDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
export interface $ZodNullable<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNullableInternals<T>;
}
export declare const $ZodNullable: core.$constructor<$ZodNullable>;
export interface $ZodDefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "default";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: util.NoUndefined<core.output<T>>;
}
export interface $ZodDefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<util.NoUndefined<core.output<T>>, core.input<T> | undefined> {
    def: $ZodDefaultDef<T>;
    optin: "defaulted";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
export interface $ZodDefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodDefaultInternals<T>;
}
export declare const $ZodDefault: core.$constructor<$ZodDefault>;
export interface $ZodPrefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "prefault";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: core.input<T>;
}
export interface $ZodPrefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<T>, core.input<T> | undefined> {
    def: $ZodPrefaultDef<T>;
    optin: "defaulted";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
export interface $ZodPrefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPrefaultInternals<T>;
}
export declare const $ZodPrefault: core.$constructor<$ZodPrefault>;
export interface $ZodNonOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nonoptional";
    innerType: T;
}
export interface $ZodNonOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<util.NoUndefined<core.output<T>>, util.NoUndefined<core.input<T>>> {
    def: $ZodNonOptionalDef<T>;
    isst: errors.$ZodIssueInvalidType;
    values: T["_zod"]["values"];
    optin: "optional" | undefined;
    optout: "optional" | undefined;
}
export interface $ZodNonOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNonOptionalInternals<T>;
}
export declare const $ZodNonOptional: core.$constructor<$ZodNonOptional>;
export interface $ZodSuccessDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "success";
    innerType: T;
}
export interface $ZodSuccessInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<boolean, core.input<T>> {
    def: $ZodSuccessDef<T>;
    isst: never;
    optin: T["_zod"]["optin"];
    optout: "optional" | undefined;
}
export interface $ZodSuccess<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSuccessInternals<T>;
}
export declare const $ZodSuccess: core.$constructor<$ZodSuccess>;
export interface $ZodCatchCtx extends ParsePayload {
    /** @deprecated Use \`ctx.issues\` */
    error: {
        issues: errors.$ZodIssue[];
    };
    /** @deprecated Use \`ctx.value\` */
    input: unknown;
}
export interface $ZodCatchDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "catch";
    innerType: T;
    catchValue: (ctx: $ZodCatchCtx) => unknown;
}
export interface $ZodCatchInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<T>, core.input<T>> {
    def: $ZodCatchDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
}
export interface $ZodCatch<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodCatchInternals<T>;
}
export declare const $ZodCatch: core.$constructor<$ZodCatch>;
export interface $ZodNaNDef extends $ZodTypeDef {
    type: "nan";
}
export interface $ZodNaNInternals extends $ZodTypeInternals<number, number> {
    def: $ZodNaNDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodNaN extends $ZodType {
    _zod: $ZodNaNInternals;
}
export declare const $ZodNaN: core.$constructor<$ZodNaN>;
export interface $ZodPipeDef<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "pipe";
    in: A;
    out: B;
    /** Only defined inside $ZodCodec instances. */
    transform?: (value: core.output<A>, payload: ParsePayload<core.output<A>>) => util.MaybeAsync<core.input<B>>;
    /** Only defined inside $ZodCodec instances. */
    reverseTransform?: (value: core.input<B>, payload: ParsePayload<core.input<B>>) => util.MaybeAsync<core.output<A>>;
}
export interface $ZodPipeInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<B>, core.input<A>> {
    def: $ZodPipeDef<A, B>;
    isst: never;
    values: A["_zod"]["values"];
    optin: A["_zod"]["optin"];
    optout: B["_zod"]["optout"];
    propValues: A["_zod"]["propValues"];
}
export interface $ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPipeInternals<A, B>;
}
export declare const $ZodPipe: core.$constructor<$ZodPipe>;
export interface $ZodCodecDef<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodPipeDef<A, B> {
    transform: (value: core.output<A>, payload: ParsePayload<core.output<A>>) => util.MaybeAsync<core.input<B>>;
    reverseTransform: (value: core.input<B>, payload: ParsePayload<core.input<B>>) => util.MaybeAsync<core.output<A>>;
}
export interface $ZodCodecInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<B>, core.input<A>> {
    def: $ZodCodecDef<A, B>;
    isst: never;
    values: A["_zod"]["values"];
    optin: A["_zod"]["optin"];
    optout: B["_zod"]["optout"];
    propValues: A["_zod"]["propValues"];
}
export interface $ZodCodec<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodCodecInternals<A, B>;
}
export declare const $ZodCodec: core.$constructor<$ZodCodec>;
export interface $ZodPreprocessDef<B extends SomeType = $ZodType, I = unknown> extends $ZodPipeDef<$ZodTransform<unknown, I>, B> {
    in: $ZodTransform<unknown, I>;
    out: B;
}
export interface $ZodPreprocessInternals<B extends SomeType = $ZodType, I = unknown> extends $ZodPipeInternals<$ZodTransform<unknown, I>, B> {
    def: $ZodPreprocessDef<B, I>;
    optin: B["_zod"]["optin"];
    optout: B["_zod"]["optout"];
}
export interface $ZodPreprocess<B extends SomeType = $ZodType, I = unknown> extends $ZodPipe<$ZodTransform<unknown, I>, B> {
    _zod: $ZodPreprocessInternals<B, I>;
}
export declare const $ZodPreprocess: core.$constructor<$ZodPreprocess>;
export interface $ZodReadonlyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "readonly";
    innerType: T;
}
export interface $ZodReadonlyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<util.MakeReadonly<core.output<T>>, util.MakeReadonly<core.input<T>>> {
    def: $ZodReadonlyDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    propValues: T["_zod"]["propValues"];
    values: T["_zod"]["values"];
}
export interface $ZodReadonly<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodReadonlyInternals<T>;
}
export declare const $ZodReadonly: core.$constructor<$ZodReadonly>;
export interface $ZodTemplateLiteralDef extends $ZodTypeDef {
    type: "template_literal";
    parts: $ZodTemplateLiteralPart[];
    format?: string | undefined;
}
export interface $ZodTemplateLiteralInternals<Template extends string = string> extends $ZodTypeInternals<Template, Template> {
    pattern: RegExp;
    def: $ZodTemplateLiteralDef;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodTemplateLiteral<Template extends string = string> extends $ZodType {
    _zod: $ZodTemplateLiteralInternals<Template>;
}
type LiteralPart = Exclude<util.Literal, symbol>;
interface SchemaPartInternals extends $ZodTypeInternals<LiteralPart, LiteralPart> {
    pattern: RegExp;
}
interface SchemaPart extends $ZodType {
    _zod: SchemaPartInternals;
}
export type $ZodTemplateLiteralPart = LiteralPart | SchemaPart;
type UndefinedToEmptyString<T> = T extends undefined ? "" : T;
type AppendToTemplateLiteral<Template extends string, Suffix extends LiteralPart | $ZodType> = Suffix extends LiteralPart ? \`\${Template}\${UndefinedToEmptyString<Suffix>}\` : Suffix extends $ZodType ? \`\${Template}\${core.output<Suffix> extends infer T extends LiteralPart ? UndefinedToEmptyString<T> : never}\` : never;
export type ConcatenateTupleOfStrings<T extends string[]> = T extends [
    infer First extends string,
    ...infer Rest extends string[]
] ? Rest extends string[] ? First extends "" ? ConcatenateTupleOfStrings<Rest> : \`\${First}\${ConcatenateTupleOfStrings<Rest>}\` : never : "";
export type ConvertPartsToStringTuple<Parts extends $ZodTemplateLiteralPart[]> = {
    [K in keyof Parts]: Parts[K] extends LiteralPart ? \`\${UndefinedToEmptyString<Parts[K]>}\` : Parts[K] extends $ZodType ? \`\${core.output<Parts[K]> extends infer T extends LiteralPart ? UndefinedToEmptyString<T> : never}\` : never;
};
export type ToTemplateLiteral<Parts extends $ZodTemplateLiteralPart[]> = ConcatenateTupleOfStrings<ConvertPartsToStringTuple<Parts>>;
export type $PartsToTemplateLiteral<Parts extends $ZodTemplateLiteralPart[]> = [] extends Parts ? \`\` : Parts extends [...infer Rest, infer Last extends $ZodTemplateLiteralPart] ? Rest extends $ZodTemplateLiteralPart[] ? AppendToTemplateLiteral<$PartsToTemplateLiteral<Rest>, Last> : never : never;
export declare const $ZodTemplateLiteral: core.$constructor<$ZodTemplateLiteral>;
export type $ZodFunctionArgs = $ZodType<unknown[], unknown[]>;
export type $ZodFunctionIn = $ZodFunctionArgs;
export type $ZodFunctionOut = $ZodType;
export type $InferInnerFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : core.output<Args>) => core.input<Returns>;
export type $InferInnerFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : core.output<Args>) => util.MaybeAsync<core.input<Returns>>;
export type $InferOuterFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : core.input<Args>) => core.output<Returns>;
export type $InferOuterFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : core.input<Args>) => Promise<core.output<Returns>>;
export interface $ZodFunctionDef<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodTypeDef {
    type: "function";
    input: In;
    output: Out;
}
export interface $ZodFunctionInternals<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> extends $ZodTypeInternals<$InferOuterFunctionType<Args, Returns>, $InferInnerFunctionType<Args, Returns>> {
    def: $ZodFunctionDef<Args, Returns>;
    isst: errors.$ZodIssueInvalidType;
}
export interface $ZodFunction<Args extends $ZodFunctionIn = $ZodFunctionIn, Returns extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodType<any, any, $ZodFunctionInternals<Args, Returns>> {
    /** @deprecated */
    _def: $ZodFunctionDef<Args, Returns>;
    _input: $InferInnerFunctionType<Args, Returns>;
    _output: $InferOuterFunctionType<Args, Returns>;
    implement<F extends $InferInnerFunctionType<Args, Returns>>(func: F): (...args: Parameters<this["_output"]>) => ReturnType<F> extends ReturnType<this["_output"]> ? ReturnType<F> : ReturnType<this["_output"]>;
    implementAsync<F extends $InferInnerFunctionTypeAsync<Args, Returns>>(func: F): F extends $InferOuterFunctionTypeAsync<Args, Returns> ? F : $InferOuterFunctionTypeAsync<Args, Returns>;
    input<const Items extends util.TupleItems, const Rest extends $ZodFunctionOut = $ZodFunctionOut>(args: Items, rest?: Rest): $ZodFunction<$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends $ZodFunctionIn>(args: NewArgs): $ZodFunction<NewArgs, Returns>;
    input(...args: any[]): $ZodFunction<any, Returns>;
    output<NewReturns extends $ZodType>(output: NewReturns): $ZodFunction<Args, NewReturns>;
}
export interface $ZodFunctionParams<I extends $ZodFunctionIn, O extends $ZodType> {
    input?: I;
    output?: O;
}
export declare const $ZodFunction: core.$constructor<$ZodFunction>;
export interface $ZodPromiseDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "promise";
    innerType: T;
}
export interface $ZodPromiseInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Promise<core.output<T>>, util.MaybeAsync<core.input<T>>> {
    def: $ZodPromiseDef<T>;
    isst: never;
}
export interface $ZodPromise<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPromiseInternals<T>;
}
export declare const $ZodPromise: core.$constructor<$ZodPromise>;
export interface $ZodLazyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "lazy";
    getter: () => T;
}
export interface $ZodLazyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<core.output<T>, core.input<T>> {
    def: $ZodLazyDef<T>;
    isst: never;
    /** Auto-cached way to retrieve the inner schema */
    innerType: T;
    pattern: T["_zod"]["pattern"];
    propValues: T["_zod"]["propValues"];
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
}
export interface $ZodLazy<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodLazyInternals<T>;
}
export declare const $ZodLazy: core.$constructor<$ZodLazy>;
export interface $ZodCustomDef<O = unknown> extends $ZodTypeDef, checks.$ZodCheckDef {
    type: "custom";
    check: "custom";
    path?: PropertyKey[] | undefined;
    error?: errors.$ZodErrorMap | undefined;
    params?: Record<string, any> | undefined;
    fn: (arg: O) => unknown;
}
export interface $ZodCustomInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I>, checks.$ZodCheckInternals<O> {
    def: $ZodCustomDef;
    issc: errors.$ZodIssue;
    isst: never;
    bag: util.LoosePartial<{
        Class: typeof util.Class;
    }>;
}
export interface $ZodCustom<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodCustomInternals<O, I>;
}
export declare const $ZodCustom: core.$constructor<$ZodCustom>;
export type $ZodTypes = $ZodString | $ZodNumber | $ZodBigInt | $ZodBoolean | $ZodDate | $ZodSymbol | $ZodUndefined | $ZodNullable | $ZodNull | $ZodAny | $ZodUnknown | $ZodNever | $ZodVoid | $ZodArray | $ZodObject | $ZodUnion | $ZodIntersection | $ZodTuple | $ZodRecord | $ZodMap | $ZodSet | $ZodLiteral | $ZodEnum | $ZodFunction | $ZodPromise | $ZodLazy | $ZodOptional | $ZodDefault | $ZodPrefault | $ZodTemplateLiteral | $ZodCustom | $ZodTransform | $ZodNonOptional | $ZodReadonly | $ZodNaN | $ZodPipe | $ZodSuccess | $ZodCatch | $ZodFile;
export type $ZodStringFormatTypes = $ZodGUID | $ZodUUID | $ZodEmail | $ZodURL | $ZodEmoji | $ZodNanoID | $ZodCUID | $ZodCUID2 | $ZodULID | $ZodXID | $ZodKSUID | $ZodISODateTime | $ZodISODate | $ZodISOTime | $ZodISODuration | $ZodIPv4 | $ZodIPv6 | $ZodMAC | $ZodCIDRv4 | $ZodCIDRv6 | $ZodBase64 | $ZodBase64URL | $ZodE164 | $ZodCreditCard | $ZodIBAN | $ZodJWT | $ZodCustomStringFormat<"hex"> | $ZodCustomStringFormat<util.HashFormat> | $ZodCustomStringFormat<"hostname"> | $ZodCustomStringFormat<"currency_code">;
`,
    'file:///node_modules/zod/v4/core/standard-schema.d.ts': `/** The Standard interface. */
export interface StandardTypedV1<Input = unknown, Output = Input> {
    /** The Standard properties. */
    readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
export declare namespace StandardTypedV1 {
    /** The Standard properties interface. */
    interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
export declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Validates unknown input values. */
        readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
    }
    /** The result interface of the validate function. */
    type Result<Output> = SuccessResult<Output> | FailureResult;
    /** The result interface if validation succeeds. */
    interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The absence of issues indicates success. */
        readonly issues?: undefined;
    }
    interface Options {
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The result interface if validation fails. */
    interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }
    /** The issue interface of the failure output. */
    interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /** The path segment interface of the issue. */
    interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
/** The Standard JSON Schema interface. */
export interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
    /** The Standard JSON Schema properties. */
    readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}
export declare namespace StandardJSONSchemaV1 {
    /** The Standard JSON Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Methods for generating the input/output JSON Schema. */
        readonly jsonSchema: Converter;
    }
    /** The Standard JSON Schema converter interface. */
    interface Converter {
        /** Converts the input type to JSON Schema. May throw if conversion is not supported. */
        readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
        /** Converts the output type to JSON Schema. May throw if conversion is not supported. */
        readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
    }
    /** The target version of the generated JSON Schema.
     *
     * It is *strongly recommended* that implementers support \`"draft-2020-12"\` and \`"draft-07"\`, as they are both in wide use.
     *
     * The \`"openapi-3.0"\` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema \`"draft-04"\`.
     *
     * All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
     */
    type Target = "draft-2020-12" | "draft-07" | "openapi-3.0" | ({} & string);
    /** The options for the input/output methods. */
    interface Options {
        /** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
        readonly target: Target;
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
export interface StandardSchemaWithJSONProps<Input = unknown, Output = Input> extends StandardSchemaV1.Props<Input, Output>, StandardJSONSchemaV1.Props<Input, Output> {
}
/**
 * An interface that combines StandardJSONSchema and StandardSchema.
 */
export interface StandardSchemaWithJSON<Input = unknown, Output = Input> {
    "~standard": StandardSchemaWithJSONProps<Input, Output>;
}
`,
    'file:///node_modules/zod/v4/core/to-json-schema.d.ts': `import type * as core from "../core/index.js";
import type * as JSONSchema from "./json-schema.js";
import { type $ZodRegistry } from "./registries.js";
import type * as schemas from "./schemas.js";
import type { StandardJSONSchemaV1, StandardSchemaWithJSONProps } from "./standard-schema.js";
export type Processor<T extends schemas.$ZodType = schemas.$ZodType> = (schema: T, ctx: ToJSONSchemaContext, json: JSONSchema.BaseSchema, params: ProcessParams) => void;
/**
 * Called for each schema that has no JSON Schema equivalent. Return a JSON Schema to use in its
 * place, \`"any"\` to fall back to the \`unrepresentable: "any"\` behavior, or \`"throw"\`/\`undefined\` to
 * throw the default error. Throwing from the handler propagates, so custom errors work too.
 */
export type UnrepresentableHandler<T extends schemas.$ZodType = schemas.$ZodType> = (ctx: {
    zodSchema: T;
    path: (string | number)[];
    /** The error Zod would throw. Distinguishes sites that share a \`zodSchema\`, e.g. an \`undefined\`
     *  vs a \`bigint\` member of the same literal. */
    message: string;
}) => JSONSchema.BaseSchema | "throw" | "any" | undefined;
export interface JSONSchemaGeneratorParams {
    processors: Record<string, Processor>;
    /** A registry used to look up metadata for each schema. Any schema with an \`id\` property will be extracted as a $def.
     *  @default globalRegistry */
    metadata?: $ZodRegistry<Record<string, any>>;
    /** The JSON Schema version to target.
     * - \`"draft-2020-12"\` — Default. JSON Schema Draft 2020-12
     * - \`"draft-07"\` — JSON Schema Draft 7
     * - \`"draft-04"\` — JSON Schema Draft 4
     * - \`"openapi-3.0"\` — OpenAPI 3.0 Schema Object */
    target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string) | undefined;
    /** How to handle unrepresentable types.
     * - \`"throw"\` — Default. Unrepresentable types throw an error
     * - \`"any"\` — Unrepresentable types become \`{}\`
     * - A function — called once per unrepresentable schema; see {@link UnrepresentableHandler}. */
    unrepresentable?: "throw" | "any" | UnrepresentableHandler<schemas.$ZodTypes>;
    /** Arbitrary custom logic that can be used to modify the generated JSON Schema. */
    override?: (ctx: {
        zodSchema: schemas.$ZodTypes;
        jsonSchema: JSONSchema.BaseSchema;
        path: (string | number)[];
    }) => void;
    /** Whether to extract the \`"input"\` or \`"output"\` type. Relevant to transforms, defaults, coerced primitives, etc.
     * - \`"output"\` — Default. Convert the output schema.
     * - \`"input"\` — Convert the input schema. */
    io?: "input" | "output";
    cycles?: "ref" | "throw";
    reused?: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, JSONSchema.BaseSchema>;
    } | undefined;
}
/**
 * Parameters for the toJSONSchema function.
 */
export type ToJSONSchemaParams = Omit<JSONSchemaGeneratorParams, "processors" | "external">;
/**
 * Parameters for the toJSONSchema function when passing a registry.
 */
export interface RegistryToJSONSchemaParams extends ToJSONSchemaParams {
    uri?: (id: string) => string;
}
export interface ProcessParams {
    schemaPath: schemas.$ZodType[];
    path: (string | number)[];
}
export interface Seen {
    /** JSON Schema result for this Zod schema */
    schema: JSONSchema.BaseSchema;
    /** A cached version of the schema that doesn't get overwritten during ref resolution */
    def?: JSONSchema.BaseSchema;
    defId?: string | undefined;
    /** Number of times this schema was encountered during traversal */
    count: number;
    /** Cycle path */
    cycle?: (string | number)[] | undefined;
    isParent?: boolean | undefined;
    /** Schema to inherit JSON Schema properties from (set by processor for wrappers) */
    ref?: schemas.$ZodType | null;
    /** JSON Schema property path for this schema */
    path?: (string | number)[] | undefined;
}
export interface ToJSONSchemaContext {
    processors: Record<string, Processor>;
    metadataRegistry: $ZodRegistry<Record<string, any>>;
    target: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string);
    unrepresentable: "throw" | "any" | UnrepresentableHandler;
    override: (ctx: {
        zodSchema: schemas.$ZodType;
        jsonSchema: JSONSchema.BaseSchema;
        path: (string | number)[];
    }) => void;
    io: "input" | "output";
    counter: number;
    seen: Map<schemas.$ZodType, Seen>;
    /** Registry conversions share one \`seen\` map across every emitted schema. These hold the
     * \`external\` the whole-map passes below last ran for, so the passes are not repeated once per
     * schema — and still re-run if the map grows or \`external\` is swapped. \`sharedEmitDoneFor\`
     * covers both passes in \`finalize\`: the ref flattening and the \`$defs\` build.
     *
     * The passes are valid only while nothing they read has changed, so both are cleared in
     * \`processSchema()\` when the map grows, and in \`JSONSchemaGenerator.emit()\`, which can also change
     * the \`cycles\` and \`reused\` they branch on.
     *
     * One case is deliberately not covered: an \`override\` callback that writes to
     * \`metadataRegistry\` mid-conversion. It runs inside \`finalize\`, so a registry conversion has
     * nowhere left to clear the guards, and later schemas keep the ids the first pass saw. That
     * output was never coherent — before this, whether a shared subschema was inlined or extracted
     * depended on which registry entry happened to be emitted when the callback fired. */
    sharedDefsExtractedFor?: ToJSONSchemaContext["external"];
    sharedEmitDoneFor?: ToJSONSchemaContext["external"];
    cycles: "ref" | "throw";
    reused: "ref" | "inline";
    /** The \`allOf\` array of each intersection encountered during traversal, innermost first. \`finalize\` folds every emitted object holding one; see \`foldIntersection\`. */
    intersections: JSONSchema.BaseSchema[][];
    /** Rewrites a processor deferred to \`finalize\`, where the flatten has resolved every ref and the union branches are in place. */
    deferred: (() => void)[];
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, JSONSchema.BaseSchema>;
    } | undefined;
}
export declare function initializeContext(params: JSONSchemaGeneratorParams): ToJSONSchemaContext;
/**
 * Applies the \`unrepresentable\` setting at a site that has no JSON Schema equivalent. Throws
 * \`message\` unless the setting (or the handler's return value) says otherwise. Returns \`true\` if a
 * custom JSON Schema was written into \`json\`, in which case the caller must not write its own.
 */
export declare function handleUnrepresentable(schema: schemas.$ZodType, ctx: ToJSONSchemaContext, json: JSONSchema.BaseSchema, params: ProcessParams, message: string): boolean;
export declare function processSchema<T extends schemas.$ZodType>(schema: T, ctx: ToJSONSchemaContext, _params?: ProcessParams): JSONSchema.BaseSchema;
/** @deprecated Renamed to \`processSchema\`. An export alias declares no binding, so it is safe to keep. */
export { processSchema as process };
export declare function extractDefs<T extends schemas.$ZodType>(ctx: ToJSONSchemaContext, schema: T): void;
export declare function finalize<T extends schemas.$ZodType>(ctx: ToJSONSchemaContext, schema: T): ZodStandardJSONSchemaPayload<T>;
export type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<core.input<T>, core.output<T>>;
export interface ZodStandardJSONSchemaPayload<T> extends JSONSchema.BaseSchema {
    "~standard": ZodStandardSchemaWithJSON<T>;
}
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
export declare const createToJSONSchemaMethod: <T extends schemas.$ZodType>(schema: T, processors?: Record<string, Processor>) => (params?: ToJSONSchemaParams) => ZodStandardJSONSchemaPayload<T>;
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
type StandardJSONSchemaMethodParams = Parameters<StandardJSONSchemaV1["~standard"]["jsonSchema"]["input"]>[0];
export declare const createStandardJSONSchemaMethod: <T extends schemas.$ZodType>(schema: T, io: "input" | "output", processors?: Record<string, Processor>) => (params?: StandardJSONSchemaMethodParams) => JSONSchema.BaseSchema;
`,
    'file:///node_modules/zod/v4/core/util.d.ts': `import type * as checks from "./checks.js";
import type { $ZodConfig } from "./core.js";
import type * as errors from "./errors.js";
import type * as schemas from "./schemas.js";
export type JSONType = string | number | boolean | null | JSONType[] | {
    [key: string]: JSONType;
};
export type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512";
export type HashEncoding = "hex" | "base64" | "base64url";
export type HashFormat = \`\${HashAlgorithm}_\${HashEncoding}\`;
export type IPVersion = "v4" | "v6";
export type MimeTypes = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "application/javascript" | "application/pdf" | "application/zip" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/octet-stream" | "application/graphql" | "text/html" | "text/plain" | "text/css" | "text/javascript" | "text/csv" | "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "video/mp4" | "video/webm" | "video/ogg" | "font/woff" | "font/woff2" | "font/ttf" | "font/otf" | "multipart/form-data" | (string & {});
export type ParsedTypes = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "file" | "date" | "array" | "map" | "set" | "nan" | "null" | "promise";
export type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
export type AssertNotEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? false : true;
export type AssertExtends<T, U> = T extends U ? T : never;
type ToZodMismatch<T, S extends schemas.$ZodType> = {
    "types do not match": {
        expected: T;
        received: S["_zod"]["output"];
    };
};
type ToZodKeyMismatch<Expected, Received> = schemas.$ZodType & {
    "types do not match": {
        expected: Expected;
        received: Received;
    };
};
declare const toZodDummy: unique symbol;
type ToZodNormalize<T> = [T] extends [(...args: any[]) => any] ? T : [T] extends [object] ? {
    [K in keyof T]: ToZodNormalize<T[K]>;
} : T | typeof toZodDummy;
type ToZodEqual<Output, T> = AssertEqual<Output, T> extends true ? true : IsAny<Output> extends true ? false : IsAny<T> extends true ? false : AssertEqual<ToZodNormalize<Output>, ToZodNormalize<T>>;
type ToZodShape<Shape, T> = {
    [K in keyof Shape]: Shape[K] extends schemas.$ZodType ? K extends keyof T ? ToZodEqual<Shape[K]["_zod"]["output"], T[K]> extends true ? Shape[K] : ToZodKeyMismatch<T[K], Shape[K]["_zod"]["output"]> : ToZodKeyMismatch<never, Shape[K]["_zod"]["output"]> : Shape[K];
} & {
    [K in Exclude<keyof T, keyof Shape>]: ToZodKeyMismatch<T[K], never>;
};
type ToZodExpand<X> = {
    [K in keyof X]: X[K];
} & {};
type ToZodTarget<S extends schemas.$ZodType, T> = S extends schemas.$ZodObject<infer Shape, infer Config> ? T extends object ? AssertEqual<ToZodExpand<ToZodShape<Shape, T>>, ToZodExpand<Shape>> extends true ? S & ToZodMismatch<T, S> : schemas.$ZodObject<ToZodExpand<ToZodShape<Shape, T>>, Config> : S & ToZodMismatch<T, S> : S & ToZodMismatch<T, S>;
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>;
export type MakePartial<T, K extends keyof T> = Omit<T, K> & InexactPartial<Pick<T, K>>;
export type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Exactly<T, X> = T & Record<Exclude<keyof X, keyof T>, never>;
export type NoUndefined<T> = T extends undefined ? never : T;
export type Whatever = {} | undefined | null;
export type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends bigint ? bigint : T;
export type LoosePartial<T extends object> = InexactPartial<T> & {
    [k: string]: unknown;
};
export type Mask<Keys extends PropertyKey> = {
    [K in Keys]?: true;
};
export type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
} & {};
export type InexactPartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
export type EmptyObject = Record<string, never>;
export type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
export type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
export type SomeObject = Record<PropertyKey, any>;
export type Identity<T> = T;
export type Flatten<T> = Identity<{
    [k in keyof T]: T[k];
}>;
export type Mapped<T> = {
    [k in keyof T]: T[k];
};
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type NoNeverKeys<T> = {
    [k in keyof T]: [T[k]] extends [never] ? never : k;
}[keyof T];
export type NoNever<T> = Identity<{
    [k in NoNeverKeys<T>]: k extends keyof T ? T[k] : never;
}>;
export type Extend<A extends SomeObject, B extends SomeObject> = Flatten<keyof A & keyof B extends never ? A & B : {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & {
    [K in keyof B]: B[K];
}>;
export type TupleItems = ReadonlyArray<schemas.SomeType>;
export type AnyFunc = (...args: any[]) => any;
export type IsProp<T, K extends keyof T> = T[K] extends AnyFunc ? never : K;
export type MaybeAsync<T> = T | Promise<T>;
export type KeyOf<T> = keyof OmitIndexSignature<T>;
export type OmitIndexSignature<T> = {
    [K in keyof T as string extends K ? never : K extends string ? K : never]: T[K];
};
export type ExtractIndexSignature<T> = {
    [K in keyof T as string extends K ? K : K extends string ? never : K]: T[K];
};
export type Keys<T extends object> = keyof OmitIndexSignature<T>;
export type SchemaClass<T extends schemas.SomeType> = {
    new (def: T["_zod"]["def"]): T;
};
export type EnumValue = string | number;
export type EnumLike = Readonly<Record<string, EnumValue>>;
export type ToEnum<T extends EnumValue> = Flatten<{
    [k in T]: k;
}>;
export type KeysEnum<T extends object> = ToEnum<Exclude<keyof T, symbol>>;
export type KeysArray<T extends object> = Flatten<(keyof T & string)[]>;
export type Literal = string | number | bigint | boolean | null | undefined;
export type LiteralArray = Array<Literal>;
export type Primitive = string | number | symbol | bigint | boolean | null | undefined;
export type PrimitiveArray = Array<Primitive>;
export type HasSize = {
    size: number;
};
export type HasLength = {
    length: number;
};
export type Numeric = number | bigint | Date;
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError<T>;
export type SafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
export type SafeParseError<T> = {
    success: false;
    data?: never;
    error: errors.$ZodError<T>;
};
export type PropValues = Record<string, Set<Primitive>>;
export type PrimitiveSet = Set<Primitive>;
export declare function assertEqual<A, B>(val: AssertEqual<A, B>): AssertEqual<A, B>;
export declare function assertNotEqual<A, B>(val: AssertNotEqual<A, B>): AssertNotEqual<A, B>;
export declare function toZod<T>(): <S extends schemas.$ZodType>(schema: ToZodEqual<S["_zod"]["output"], T> extends true ? S : ToZodTarget<S, T>) => S;
export declare function assertIs<T>(_arg: T): void;
export declare function assertNever(_x: never): never;
export declare function assert<T>(_: any): asserts _ is T;
export declare function getEnumValues(entries: EnumLike): EnumValue[];
export declare function joinValues<T extends Primitive[]>(array: T, separator?: string): string;
export declare function jsonStringifyReplacer(_: string, value: any): any;
export declare function cached<T>(getter: () => T): {
    value: T;
};
export declare function nullish(input: any): boolean;
export declare function cleanRegex(source: string): string;
export declare function floatSafeRemainder(val: number, step: number): number;
export declare function defineLazy<T, K extends keyof T>(object: T, key: K, getter: () => T[K]): void;
export declare function objectClone(obj: object): any;
export declare function assignProp<T extends object, K extends PropertyKey>(target: T, prop: K, value: K extends keyof T ? T[K] : any): void;
/** A def's \`shape\` accessor, carrying whichever object it currently answers from. */
export interface ShapeGetter {
    (): Record<PropertyKey, any>;
    raw: Record<PropertyKey, any>;
}
/**
 * Whichever object a def's \`shape\` currently answers from: the one the caller passed until the first read, the frozen copy after it.
 *
 * Its keys and descriptors read without invoking anything, which is what lets a discriminated union check its discriminator, and the cycle walk read a shape, without resolving a getter that references the schema being constructed. A def that answers \`shape\` from an accessor of its own has none.
 */
export declare function rawShape(def: any): Record<PropertyKey, any> | undefined;
export declare function mergeDefs(...defs: Record<string, any>[]): any;
export declare function cloneDef(schema: schemas.$ZodType): any;
export declare function getElementAtPath(obj: any, path: (string | number)[] | null | undefined): any;
export declare function promiseAllObject<T extends object>(promisesObj: T): Promise<{
    [k in keyof T]: Awaited<T[k]>;
}>;
export declare function randomString(length?: number): string;
export declare function esc(str: string): string;
export declare function slugify(input: string): string;
export declare const captureStackTrace: (targetObject: object, constructorOpt?: Function) => void;
export declare function isObject(data: any): data is Record<PropertyKey, unknown>;
export declare const allowsEval: {
    value: boolean;
};
export declare function isPlainObject(o: any): o is Record<PropertyKey, unknown>;
export declare function shallowClone(o: any): any;
export declare function numKeys(data: any): number;
export declare const getParsedType: (data: any) => ParsedTypes;
export declare const propertyKeyTypes: Set<string>;
export declare const primitiveTypes: Set<string>;
export declare function escapeRegex(str: string): string;
export declare function clone<T extends schemas.$ZodType>(inst: T, def?: T["_zod"]["def"], params?: {
    parent: boolean;
}): T;
export type EmptyToNever<T> = keyof T extends never ? never : T;
export type Normalize<T> = T extends undefined ? never : T extends Record<any, any> ? Flatten<{
    [k in keyof Omit<T, "error" | "message">]: T[k];
} & ("error" extends keyof T ? {
    error?: Exclude<T["error"], string>;
} : unknown)> : never;
export declare function normalizeParams<T>(_params: T): Normalize<T>;
export declare function createTransparentProxy<T extends object>(getter: () => T): T;
export declare function stringifyPrimitive(value: any): string;
export declare function optionalKeys(shape: schemas.$ZodShape): string[];
export type CleanKey<T extends PropertyKey> = T extends \`?\${infer K}\` ? K : T extends \`\${infer K}?\` ? K : T;
export type ToCleanMap<T extends schemas.$ZodLooseShape> = {
    [k in keyof T]: k extends \`?\${infer K}\` ? K : k extends \`\${infer K}?\` ? K : k;
};
export type FromCleanMap<T extends schemas.$ZodLooseShape> = {
    [k in keyof T as k extends \`?\${infer K}\` ? K : k extends \`\${infer K}?\` ? K : k]: k;
};
export declare const NUMBER_FORMAT_RANGES: Record<checks.$ZodNumberFormats, [number, number]>;
export declare const BIGINT_FORMAT_RANGES: Record<checks.$ZodBigIntFormats, [bigint, bigint]>;
export declare function pick(schema: schemas.$ZodObject, mask: Record<string, unknown>): any;
export declare function omit(schema: schemas.$ZodObject, mask: object): any;
export declare function extend(schema: schemas.$ZodObject, shape: schemas.$ZodShape): any;
export declare function safeExtend(schema: schemas.$ZodObject, shape: schemas.$ZodShape): any;
export declare function merge(a: schemas.$ZodObject, b: schemas.$ZodObject): any;
export declare function partial(Class: SchemaClass<schemas.$ZodOptional> | null, schema: schemas.$ZodObject, mask: object | undefined, name?: string): any;
export declare function required(Class: SchemaClass<schemas.$ZodNonOptional>, schema: schemas.$ZodObject, mask: object | undefined): any;
export type Constructor<T, Def extends any[] = any[]> = new (...args: Def) => T;
export declare function aborted(x: schemas.ParsePayload, startIndex?: number): boolean;
export declare function explicitlyAborted(x: schemas.ParsePayload, startIndex?: number): boolean;
export declare function prefixIssues(path: PropertyKey, issues: errors.$ZodRawIssue[]): errors.$ZodRawIssue[];
export declare function unwrapMessage(message: string | {
    message: string;
} | undefined | null): string | undefined;
/** The leading size checks of \`defChecks\` that set an upper bound, each paired with it. */
export declare function sizeCaps(defChecks: checks.$ZodCheck<never>[] | undefined): [number, checks.$ZodCheck<never>][];
export declare function attachSchema(issues: errors.$ZodRawIssue[], start: number, inst: schemas.$ZodType): void;
export declare function finalizeIssue(iss: errors.$ZodRawIssue, ctx: schemas.ParseContextInternal | undefined, config: $ZodConfig): errors.$ZodIssue;
export declare function getSizableOrigin(input: any): "set" | "map" | "file" | "unknown";
export declare function codePointLength(str: string): number;
export declare function getLengthableOrigin(input: any): "array" | "string" | "unknown";
export declare function parsedType(data: unknown): errors.$ZodInvalidTypeExpected;
export declare function issue(_iss: string, input: any, inst: any): errors.$ZodRawIssue;
export declare function issue(_iss: errors.$ZodRawIssue): errors.$ZodRawIssue;
export declare function cleanEnum(obj: Record<string, EnumValue>): EnumValue[];
export declare function base64ToUint8Array(base64: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToBase64(bytes: Uint8Array): string;
export declare function base64urlToUint8Array(base64url: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToBase64url(bytes: Uint8Array): string;
export declare function hexToUint8Array(hex: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToHex(bytes: Uint8Array): string;
export declare abstract class Class {
    constructor(..._args: any[]);
}
/**
 * Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached \`const { parse } = schema\` keeps working.
 *
 * Call this from a \`proto\` initializer, which runs once per prototype — never per instance.
 */
export declare function members(proto: object, table: object): void;
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
export declare function own<T>(inst: object, key: PropertyKey, value: T, enumerable?: boolean): T;
/** Like {@link own}, for a member that was never an own data property and has to stay out of \`Object.keys\`. */
export declare function hide<T>(inst: object, key: PropertyKey, value: T): T;
/** Adds members a table derives from the instance: each builds on first read and shadows as own data, and assignment shadows the same way, as when these were own properties. */
export declare function derived<T>(computes: {
    [K in keyof T]?: (inst: T) => T[K];
}, table: ProtoOf<T>): ProtoOf<T>;
/** A trait's prototype members: a partial view of its own interface, with \`this\` typed as the instance. */
export type ProtoOf<T> = {
    [K in keyof T]?: (T[K] extends (...args: infer A) => infer R ? (...args: A) => R : T[K]) | undefined;
} & ThisType<T>;
/**
 * Installs a lazily-derived internal on the \`_zod\` prototype of \`inst\`'s
 * constructor, computed from the internals object itself and cached there on
 * first read. One accessor per constructor rather than one per instance.
 */
export declare function defineLazyInternal<T extends {
    _zod: any;
}>(inst: T, key: string, compute: (zod: T["_zod"]) => unknown): void;
/**
 * Installs \`key\` on \`inst\`'s prototype, computed by \`make\` on first read and cached there as an own
 * data property. One accessor per constructor rather than one per instance, because an own accessor
 * puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
 */
export declare function installLazyProp(inst: object, key: string, make: (self: any) => unknown, enumerable: boolean): void;
/** Marks the thunk \`_catch\` synthesises for a constant catch value. \`Function.length\` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads \`ctx.error\`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than \`Symbol.for\`, whose call at module scope no bundler can prove pure — the same shape that anchored \`urlCanParse\` into every build. */
export declare const CONSTANT_CATCH = "~constantCatch";
/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
export declare function constantCatch<T>(value: T): () => T;
export {};
`,
    'file:///node_modules/zod/v4/core/versions.d.ts': `export declare const version: {
    readonly major: 4;
    readonly minor: 6;
    readonly patch: number;
};
`,
    'file:///node_modules/zod/v4/core/visit.d.ts': `import * as schemas from "./schemas.js";
type AnyZod = schemas.$ZodType;
type Kind = schemas.$ZodTypeDef["type"];
/** The concrete schema class for a \`def.type\`, or \`$ZodType\` for kinds with no dedicated class. */
type SchemaOfKind<K extends Kind> = [Extract<schemas.$ZodTypes, {
    _zod: {
        def: {
            type: K;
        };
    };
}>] extends [never] ? AnyZod : Extract<schemas.$ZodTypes, {
    _zod: {
        def: {
            type: K;
        };
    };
}>;
export type VisitFn = (node: AnyZod, rewritten: boolean) => AnyZod;
export type VisitHandlers = {
    [K in Kind]?: (node: SchemaOfKind<K>, rewritten: boolean) => AnyZod;
};
/**
 * @internal Bottom-up rewrite of a schema tree. Unhandled kinds and unchanged branches keep their
 * identity. Returns \`$ZodType\`: a visitor can swap in a schema of any type, so callers declare
 * their own return type. \`rewritten\` tells a handler whether the traversal replaced anything
 * below the node it is looking at.
 */
export declare function visit(schema: schemas.SomeType, fn: VisitFn): AnyZod;
export declare function visit(schema: schemas.SomeType, handlers: VisitHandlers): AnyZod;
export {};
`,
    'file:///node_modules/zod/v4/index.d.ts': `import * as z4 from "./classic/external.js";
export * from "./classic/index.js";
export { z4 as default };
`,
    'file:///node_modules/zod/v4/locales/ar.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/az.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/be.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/bg.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/bn.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ca.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ckb.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/cs.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/da.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/de.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/el.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/en.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/eo.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/es.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/fa.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/fi.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/fr-CA.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/fr.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/gu.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/he.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/hi.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/hr.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/hu.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/hy.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/id.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/index.d.ts': `export { default as ar } from "./ar.js";
export { default as az } from "./az.js";
export { default as be } from "./be.js";
export { default as bg } from "./bg.js";
export { default as bn } from "./bn.js";
export { default as ca } from "./ca.js";
export { default as ckb } from "./ckb.js";
export { default as cs } from "./cs.js";
export { default as da } from "./da.js";
export { default as de } from "./de.js";
export { default as el } from "./el.js";
export { default as en } from "./en.js";
export { default as eo } from "./eo.js";
export { default as es } from "./es.js";
export { default as fa } from "./fa.js";
export { default as fi } from "./fi.js";
export { default as fr } from "./fr.js";
export { default as frCA } from "./fr-CA.js";
export { default as gu } from "./gu.js";
export { default as he } from "./he.js";
export { default as hi } from "./hi.js";
export { default as hr } from "./hr.js";
export { default as hu } from "./hu.js";
export { default as hy } from "./hy.js";
export { default as id } from "./id.js";
export { default as is } from "./is.js";
export { default as it } from "./it.js";
export { default as ja } from "./ja.js";
export { default as ka } from "./ka.js";
export { default as kh } from "./kh.js";
export { default as km } from "./km.js";
export { default as kn } from "./kn.js";
export { default as ko } from "./ko.js";
export { default as lt } from "./lt.js";
export { default as mk } from "./mk.js";
export { default as ms } from "./ms.js";
export { default as ne } from "./ne.js";
export { default as nl } from "./nl.js";
export { default as nn } from "./nn.js";
export { default as no } from "./no.js";
export { default as ota } from "./ota.js";
export { default as ps } from "./ps.js";
export { default as pl } from "./pl.js";
export { default as pt } from "./pt.js";
export { default as ptBR } from "./pt-BR.js";
export { default as ro } from "./ro.js";
export { default as ru } from "./ru.js";
export { default as sk } from "./sk.js";
export { default as sl } from "./sl.js";
export { default as sv } from "./sv.js";
export { default as ta } from "./ta.js";
export { default as tg } from "./tg.js";
export { default as th } from "./th.js";
export { default as tk } from "./tk.js";
export { default as tr } from "./tr.js";
export { default as ua } from "./ua.js";
export { default as uk } from "./uk.js";
export { default as ur } from "./ur.js";
export { default as uz } from "./uz.js";
export { default as vi } from "./vi.js";
export { default as zhCN } from "./zh-CN.js";
export { default as zhTW } from "./zh-TW.js";
export { default as yo } from "./yo.js";
`,
    'file:///node_modules/zod/v4/locales/is.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/it.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ja.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ka.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/kh.d.ts': `import type * as errors from "../core/errors.js";
/** @deprecated Use \`km\` instead. */
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/km.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/kn.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ko.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/lt.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/mk.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ms.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ne.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/nl.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/nn.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/no.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ota.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/pl.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ps.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/pt-BR.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/pt.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ro.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ru.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/sk.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/sl.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/sv.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ta.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/tg.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/th.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/tk.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/tr.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ua.d.ts': `import type * as errors from "../core/errors.js";
/** @deprecated Use \`uk\` instead. */
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/uk.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/ur.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/uz.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/vi.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/yo.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/zh-CN.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/locales/zh-TW.d.ts': `import type * as errors from "../core/errors.js";
export default function (): {
    localeError: errors.$ZodErrorMap;
};
`,
    'file:///node_modules/zod/v4/mini/checks.d.ts': `export { _lt as lt, _lte as lte, _lte as maximum, _gt as gt, _gte as gte, _gte as minimum, _positive as positive, _negative as negative, _nonpositive as nonpositive, _nonnegative as nonnegative, _multipleOf as multipleOf, _maxSize as maxSize, _minSize as minSize, _size as size, _maxLength as maxLength, _minLength as minLength, _length as length, _regex as regex, _lowercase as lowercase, _uppercase as uppercase, _includes as includes, _startsWith as startsWith, _endsWith as endsWith, _property as property, _properties as properties, _mime as mime, _overwrite as overwrite, _normalize as normalize, _trim as trim, _toLowerCase as toLowerCase, _toUpperCase as toUpperCase, } from "../core/index.js";
`,
    'file:///node_modules/zod/v4/mini/coerce.d.ts': `import * as core from "../core/index.js";
import * as schemas from "./schemas.js";
export declare function string<T = unknown>(params?: string | core.$ZodStringParams): schemas.ZodMiniString<T>;
export declare function number<T = unknown>(params?: string | core.$ZodNumberParams): schemas.ZodMiniNumber<T>;
export declare function boolean<T = unknown>(params?: string | core.$ZodBooleanParams): schemas.ZodMiniBoolean<T>;
export declare function bigint<T = unknown>(params?: string | core.$ZodBigIntParams): schemas.ZodMiniBigInt<T>;
export declare function date<T = unknown>(params?: string | core.$ZodDateParams): schemas.ZodMiniDate<T>;
`,
    'file:///node_modules/zod/v4/mini/deep-partial.d.ts': `import type * as core from "../core/index.js";
import * as schemas from "./schemas.js";
/** Mini counterpart of \`classic/deep-partial.ts\`'s \`DeepPartial\`. */
export type DeepPartial<T extends core.SomeType> = T extends schemas.ZodMiniObject<infer Shape, infer Config> ? schemas.ZodMiniObject<{
    -readonly [K in keyof Shape]: schemas.ZodMiniOptional<DeepPartial<Shape[K]>>;
}, Config> : T extends schemas.ZodMiniDiscriminatedUnion<infer Options, any> ? schemas.ZodMiniUnion<{
    -readonly [I in keyof Options]: Options[I] extends core.SomeType ? DeepPartial<Options[I]> : Options[I];
}> : T extends schemas.ZodMiniUnion<infer Options> ? schemas.ZodMiniUnion<{
    -readonly [I in keyof Options]: Options[I] extends core.SomeType ? DeepPartial<Options[I]> : Options[I];
}> : T extends schemas.ZodMiniArray<infer El> ? schemas.ZodMiniArray<DeepPartial<El>> : T extends schemas.ZodMiniTuple<infer Items, infer Rest> ? schemas.ZodMiniTuple<{
    -readonly [K in keyof Items]: Items[K] extends core.SomeType ? DeepPartial<Items[K]> : Items[K];
}, Rest extends core.SomeType ? DeepPartial<Rest> : Rest> : T extends schemas.ZodMiniIntersection<infer A, infer B> ? schemas.ZodMiniIntersection<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodMiniRecord<infer K, infer V> ? schemas.ZodMiniRecord<K, DeepPartial<V>> : T extends schemas.ZodMiniMap<infer K, infer V> ? schemas.ZodMiniMap<K, DeepPartial<V>> : T extends schemas.ZodMiniSet<infer El> ? schemas.ZodMiniSet<DeepPartial<El>> : T extends schemas.ZodMiniOptional<infer Inner> ? schemas.ZodMiniOptional<DeepPartial<Inner>> : T extends schemas.ZodMiniNullable<infer Inner> ? schemas.ZodMiniNullable<DeepPartial<Inner>> : T extends schemas.ZodMiniDefault<infer Inner> ? schemas.ZodMiniDefault<DeepPartial<Inner>> : T extends schemas.ZodMiniPrefault<infer Inner> ? schemas.ZodMiniPrefault<DeepPartial<Inner>> : T extends schemas.ZodMiniNonOptional<infer Inner> ? schemas.ZodMiniNonOptional<DeepPartial<Inner>> : T extends schemas.ZodMiniCatch<infer Inner> ? schemas.ZodMiniCatch<DeepPartial<Inner>> : T extends schemas.ZodMiniReadonly<infer Inner> ? schemas.ZodMiniReadonly<DeepPartial<Inner>> : T extends schemas.ZodMiniSuccess<infer Inner> ? schemas.ZodMiniSuccess<DeepPartial<Inner>> : T extends schemas.ZodMiniPromise<infer Inner> ? schemas.ZodMiniPromise<DeepPartial<Inner>> : T extends schemas.ZodMiniCodec<infer A, infer B> ? schemas.ZodMiniCodec<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodMiniPipe<infer A, infer B> ? schemas.ZodMiniPipe<DeepPartial<A>, DeepPartial<B>> : T extends schemas.ZodMiniLazy<infer Inner> ? schemas.ZodMiniLazy<DeepPartial<Inner>> : T;
/** See \`classic/deep-partial.ts\`. Mini variant uses \`mini.partial(...)\`. */
export declare function deepPartial<T extends core.SomeType>(schema: T): DeepPartial<T>;
`,
    'file:///node_modules/zod/v4/mini/external.d.ts': `export * as core from "../core/index.js";
export * from "./parse.js";
export * from "./schemas.js";
export * from "./checks.js";
export { deepPartial } from "./deep-partial.js";
export { input, output } from "./in-out.js";
export type { infer } from "../core/index.js";
export type { JSONType } from "../core/util.js";
export type { CompileOptions } from "../core/index.js";
export { globalRegistry, registry, config, memoizer, $output, $input, $brand, clone, regexes, treeifyError, prettifyError, formatError, flattenError, TimePrecision, util, NEVER, INVALID, toZod, compile, withParser, ZodCompileAsyncError, ZodCompileUnsupportedError, getDiscriminatedOption, } from "../core/index.js";
export { toJSONSchema } from "../core/json-schema-processors.js";
export * as locales from "../locales/index.js";
/** A special constant with type \`never\` */
export * as iso from "./iso.js";
export { ZodMiniISODateTime, ZodMiniISODate, ZodMiniISOTime, ZodMiniISODuration, } from "./iso.js";
export * as coerce from "./coerce.js";
`,
    'file:///node_modules/zod/v4/mini/in-out.d.ts': `import type * as core from "../core/index.js";
import * as schemas from "./schemas.js";
export type input<T> = core.input<T>;
export type output<T> = core.output<T>;
/** See \`classic/in-out.ts\`. */
export declare function input<T extends core.$ZodType>(schema: T): schemas.ZodMiniType<core.input<T>, core.input<T>>;
/** See \`classic/in-out.ts\`. */
export declare function output<T extends core.$ZodType>(schema: T): schemas.ZodMiniType<core.output<T>, core.output<T>>;
`,
    'file:///node_modules/zod/v4/mini/index.d.ts': `import * as z from "./external.js";
export * from "./external.js";
export { z };
`,
    'file:///node_modules/zod/v4/mini/iso.d.ts': `import * as core from "../core/index.js";
import * as schemas from "./schemas.js";
export interface ZodMiniISODateTime extends schemas.ZodMiniStringFormat<"datetime"> {
    _zod: core.$ZodISODateTimeInternals;
}
export declare const ZodMiniISODateTime: core.$constructor<ZodMiniISODateTime>;
export declare function datetime(params?: string | core.$ZodISODateTimeParams): ZodMiniISODateTime;
export interface ZodMiniISODate extends schemas.ZodMiniStringFormat<"date"> {
    _zod: core.$ZodISODateInternals;
}
export declare const ZodMiniISODate: core.$constructor<ZodMiniISODate>;
export declare function date(params?: string | core.$ZodISODateParams): ZodMiniISODate;
export interface ZodMiniISOTime extends schemas.ZodMiniStringFormat<"time"> {
    _zod: core.$ZodISOTimeInternals;
}
export declare const ZodMiniISOTime: core.$constructor<ZodMiniISOTime>;
export declare function time(params?: string | core.$ZodISOTimeParams): ZodMiniISOTime;
export interface ZodMiniISODuration extends schemas.ZodMiniStringFormat<"duration"> {
    _zod: core.$ZodISODurationInternals;
}
export declare const ZodMiniISODuration: core.$constructor<ZodMiniISODuration>;
export declare function duration(params?: string | core.$ZodISODurationParams): ZodMiniISODuration;
`,
    'file:///node_modules/zod/v4/mini/parse.d.ts': `export { validate, validateAsync, parse, safeParse, parseAsync, safeParseAsync, encode, decode, encodeAsync, decodeAsync, safeEncode, safeDecode, safeEncodeAsync, safeDecodeAsync, } from "../core/index.js";
`,
    'file:///node_modules/zod/v4/mini/schemas.d.ts': `import * as core from "../core/index.js";
import type { $ZodBigIntFormats } from "../core/index.js";
import * as util from "../core/util.js";
type SomeType = core.SomeType;
export interface ZodMiniType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
    type: Internals["def"]["type"];
    check(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    with(...checks: (core.CheckFn<core.output<this>> | core.$ZodCheck<core.output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends core.$ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [core.$replace<R["_meta"], this>?] : [core.$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : core.$ZodBranded<this, T, Dir>;
    def: Internals["def"];
    parse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): core.output<this>;
    safeParse(data: unknown, params?: core.ParseContext<core.$ZodIssue>): util.SafeParseResult<core.output<this>>;
    parseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<core.output<this>>;
    safeParseAsync(data: unknown, params?: core.ParseContext<core.$ZodIssue>): Promise<util.SafeParseResult<core.output<this>>>;
    apply<T, TArgs extends unknown[] = []>(fn: (schema: this, ...args: TArgs) => T, ...args: TArgs): T;
}
interface _ZodMiniType<out Internals extends core.$ZodTypeInternals = core.$ZodTypeInternals> extends ZodMiniType<any, any, Internals> {
}
export declare const ZodMiniType: core.$constructor<ZodMiniType>;
export interface _ZodMiniString<T extends core.$ZodStringInternals<unknown> = core.$ZodStringInternals<unknown>> extends _ZodMiniType<T>, core.$ZodString<T["input"]> {
    _zod: T;
}
export interface ZodMiniString<Input = unknown> extends _ZodMiniString<core.$ZodStringInternals<Input>>, core.$ZodString<Input> {
}
export declare const ZodMiniString: core.$constructor<ZodMiniString>;
export declare function string(params?: string | core.$ZodStringParams): ZodMiniString<string>;
export interface ZodMiniStringFormat<Format extends string = string> extends _ZodMiniString<core.$ZodStringFormatInternals<Format>>, core.$ZodStringFormat<Format> {
}
export declare const ZodMiniStringFormat: core.$constructor<ZodMiniStringFormat>;
export interface ZodMiniEmail extends _ZodMiniString<core.$ZodEmailInternals> {
}
export declare const ZodMiniEmail: core.$constructor<ZodMiniEmail>;
export declare function email(params?: string | core.$ZodEmailParams): ZodMiniEmail;
export interface ZodMiniGUID extends _ZodMiniString<core.$ZodGUIDInternals> {
}
export declare const ZodMiniGUID: core.$constructor<ZodMiniGUID>;
export declare function guid(params?: string | core.$ZodGUIDParams): ZodMiniGUID;
export interface ZodMiniUUID extends _ZodMiniString<core.$ZodUUIDInternals> {
}
export declare const ZodMiniUUID: core.$constructor<ZodMiniUUID>;
export declare function uuid(params?: string | core.$ZodUUIDParams): ZodMiniUUID;
export declare function uuidv4(params?: string | core.$ZodUUIDv4Params): ZodMiniUUID;
export declare function uuidv6(params?: string | core.$ZodUUIDv6Params): ZodMiniUUID;
export declare function uuidv7(params?: string | core.$ZodUUIDv7Params): ZodMiniUUID;
export interface ZodMiniURL extends _ZodMiniString<core.$ZodURLInternals> {
}
export declare const ZodMiniURL: core.$constructor<ZodMiniURL>;
export declare function url(params?: string | core.$ZodURLParams): ZodMiniURL;
export declare function httpUrl(params?: string | Omit<core.$ZodURLParams, "protocol" | "hostname">): ZodMiniURL;
export interface ZodMiniEmoji extends _ZodMiniString<core.$ZodEmojiInternals> {
}
export declare const ZodMiniEmoji: core.$constructor<ZodMiniEmoji>;
export declare function emoji(params?: string | core.$ZodEmojiParams): ZodMiniEmoji;
export interface ZodMiniNanoID extends _ZodMiniString<core.$ZodNanoIDInternals> {
}
export declare const ZodMiniNanoID: core.$constructor<ZodMiniNanoID>;
export declare function nanoid(params?: string | core.$ZodNanoIDParams): ZodMiniNanoID;
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodMiniCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export interface ZodMiniCUID extends _ZodMiniString<core.$ZodCUIDInternals> {
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodMiniCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare const ZodMiniCUID: core.$constructor<ZodMiniCUID>;
/**
 * Validates a CUID v1 string.
 *
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2 | \`z.cuid2()\`} instead.
 * See https://github.com/paralleldrive/cuid.
 */
export declare function cuid(params?: string | core.$ZodCUIDParams): ZodMiniCUID;
export interface ZodMiniCUID2 extends _ZodMiniString<core.$ZodCUID2Internals> {
}
export declare const ZodMiniCUID2: core.$constructor<ZodMiniCUID2>;
export declare function cuid2(params?: string | core.$ZodCUID2Params): ZodMiniCUID2;
export interface ZodMiniULID extends _ZodMiniString<core.$ZodULIDInternals> {
}
export declare const ZodMiniULID: core.$constructor<ZodMiniULID>;
export declare function ulid(params?: string | core.$ZodULIDParams): ZodMiniULID;
export interface ZodMiniXID extends _ZodMiniString<core.$ZodXIDInternals> {
}
export declare const ZodMiniXID: core.$constructor<ZodMiniXID>;
export declare function xid(params?: string | core.$ZodXIDParams): ZodMiniXID;
export interface ZodMiniKSUID extends _ZodMiniString<core.$ZodKSUIDInternals> {
}
export declare const ZodMiniKSUID: core.$constructor<ZodMiniKSUID>;
export declare function ksuid(params?: string | core.$ZodKSUIDParams): ZodMiniKSUID;
export interface ZodMiniIPv4 extends _ZodMiniString<core.$ZodIPv4Internals> {
}
export declare const ZodMiniIPv4: core.$constructor<ZodMiniIPv4>;
export declare function ipv4(params?: string | core.$ZodIPv4Params): ZodMiniIPv4;
export interface ZodMiniIPv6 extends _ZodMiniString<core.$ZodIPv6Internals> {
}
export declare const ZodMiniIPv6: core.$constructor<ZodMiniIPv6>;
export declare function ipv6(params?: string | core.$ZodIPv6Params): ZodMiniIPv6;
export interface ZodMiniCIDRv4 extends _ZodMiniString<core.$ZodCIDRv4Internals> {
}
export declare const ZodMiniCIDRv4: core.$constructor<ZodMiniCIDRv4>;
export declare function cidrv4(params?: string | core.$ZodCIDRv4Params): ZodMiniCIDRv4;
export interface ZodMiniCIDRv6 extends _ZodMiniString<core.$ZodCIDRv6Internals> {
}
export declare const ZodMiniCIDRv6: core.$constructor<ZodMiniCIDRv6>;
export declare function cidrv6(params?: string | core.$ZodCIDRv6Params): ZodMiniCIDRv6;
export interface ZodMiniMAC extends _ZodMiniString<core.$ZodMACInternals> {
}
export declare const ZodMiniMAC: core.$constructor<ZodMiniMAC>;
export declare function mac(params?: string | core.$ZodMACParams): ZodMiniMAC;
export interface ZodMiniBase64 extends _ZodMiniString<core.$ZodBase64Internals> {
}
export declare const ZodMiniBase64: core.$constructor<ZodMiniBase64>;
export declare function base64(params?: string | core.$ZodBase64Params): ZodMiniBase64;
export interface ZodMiniBase64URL extends _ZodMiniString<core.$ZodBase64URLInternals> {
}
export declare const ZodMiniBase64URL: core.$constructor<ZodMiniBase64URL>;
export declare function base64url(params?: string | core.$ZodBase64URLParams): ZodMiniBase64URL;
export interface ZodMiniE164 extends _ZodMiniString<core.$ZodE164Internals> {
}
export declare const ZodMiniE164: core.$constructor<ZodMiniE164>;
export declare function e164(params?: string | core.$ZodE164Params): ZodMiniE164;
export interface ZodMiniCreditCard extends _ZodMiniString<core.$ZodCreditCardInternals> {
}
export declare const ZodMiniCreditCard: core.$constructor<ZodMiniCreditCard>;
export declare function creditCard(params?: string | core.$ZodCreditCardParams): ZodMiniCreditCard;
export interface ZodMiniIBAN extends _ZodMiniString<core.$ZodIBANInternals> {
}
export declare const ZodMiniIBAN: core.$constructor<ZodMiniIBAN>;
export declare function iban(params?: string | core.$ZodIBANParams): ZodMiniIBAN;
export interface ZodMiniJWT extends _ZodMiniString<core.$ZodJWTInternals> {
}
export declare const ZodMiniJWT: core.$constructor<ZodMiniJWT>;
export declare function jwt(params?: string | core.$ZodJWTParams): ZodMiniJWT;
export interface ZodMiniCustomStringFormat<Format extends string = string> extends ZodMiniStringFormat<Format>, core.$ZodCustomStringFormat<Format> {
    _zod: core.$ZodCustomStringFormatInternals<Format>;
}
export declare const ZodMiniCustomStringFormat: core.$constructor<ZodMiniCustomStringFormat>;
export declare function stringFormat<Format extends string>(format: Format, fnOrRegex: ((arg: string) => util.MaybeAsync<unknown>) | RegExp, _params?: string | core.$ZodStringFormatParams): ZodMiniCustomStringFormat<Format>;
export declare function hostname(_params?: string | core.$ZodStringFormatParams): ZodMiniCustomStringFormat<"hostname">;
export declare function hex(_params?: string | core.$ZodStringFormatParams): ZodMiniCustomStringFormat<"hex">;
export declare function currencyCode(_params?: string | core.$ZodStringFormatParams): ZodMiniCustomStringFormat<"currency_code">;
export declare function hash<Alg extends util.HashAlgorithm, Enc extends util.HashEncoding = "hex">(alg: Alg, params?: {
    enc?: Enc;
} & core.$ZodStringFormatParams): ZodMiniCustomStringFormat<\`\${Alg}_\${Enc}\`>;
interface _ZodMiniNumber<T extends core.$ZodNumberInternals<unknown> = core.$ZodNumberInternals<unknown>> extends _ZodMiniType<T>, core.$ZodNumber<T["input"]> {
    _zod: T;
}
export interface ZodMiniNumber<Input = unknown> extends _ZodMiniNumber<core.$ZodNumberInternals<Input>>, core.$ZodNumber<Input> {
}
export declare const ZodMiniNumber: core.$constructor<ZodMiniNumber>;
export declare function number(params?: string | core.$ZodNumberParams): ZodMiniNumber<number>;
export interface ZodMiniNumberFormat<Format extends core.$ZodNumberFormats = core.$ZodNumberFormats> extends _ZodMiniNumber<core.$ZodNumberFormatInternals<Format>>, core.$ZodNumberFormat<Format> {
}
export declare const ZodMiniNumberFormat: core.$constructor<ZodMiniNumberFormat>;
export interface ZodMiniInt extends ZodMiniNumberFormat<"safeint"> {
}
export declare function int(params?: string | core.$ZodCheckNumberFormatParams): ZodMiniInt;
export interface ZodMiniFloat32 extends ZodMiniNumberFormat<"float32"> {
}
export declare function float32(params?: string | core.$ZodCheckNumberFormatParams): ZodMiniFloat32;
export interface ZodMiniFloat64 extends ZodMiniNumberFormat<"float64"> {
}
export declare function float64(params?: string | core.$ZodCheckNumberFormatParams): ZodMiniFloat64;
export interface ZodMiniInt32 extends ZodMiniNumberFormat<"int32"> {
}
export declare function int32(params?: string | core.$ZodCheckNumberFormatParams): ZodMiniInt32;
export interface ZodMiniUInt32 extends ZodMiniNumberFormat<"uint32"> {
}
export declare function uint32(params?: string | core.$ZodCheckNumberFormatParams): ZodMiniUInt32;
export interface ZodMiniBoolean<T = unknown> extends _ZodMiniType<core.$ZodBooleanInternals<T>> {
}
export declare const ZodMiniBoolean: core.$constructor<ZodMiniBoolean>;
export declare function boolean(params?: string | core.$ZodBooleanParams): ZodMiniBoolean<boolean>;
export interface ZodMiniBigInt<T = unknown> extends _ZodMiniType<core.$ZodBigIntInternals<T>>, core.$ZodBigInt<T> {
}
export declare const ZodMiniBigInt: core.$constructor<ZodMiniBigInt>;
export declare function bigint(params?: string | core.$ZodBigIntParams): ZodMiniBigInt<bigint>;
export interface ZodMiniBigIntFormat<Format extends $ZodBigIntFormats = $ZodBigIntFormats> extends _ZodMiniType<core.$ZodBigIntFormatInternals<Format>> {
}
export declare const ZodMiniBigIntFormat: core.$constructor<ZodMiniBigIntFormat>;
export interface ZodMiniInt64 extends ZodMiniBigIntFormat<"int64"> {
}
export declare function int64(params?: string | core.$ZodBigIntFormatParams): ZodMiniInt64;
export interface ZodMiniUInt64 extends ZodMiniBigIntFormat<"uint64"> {
}
export declare function uint64(params?: string | core.$ZodBigIntFormatParams): ZodMiniUInt64;
export interface ZodMiniSymbol extends _ZodMiniType<core.$ZodSymbolInternals> {
}
export declare const ZodMiniSymbol: core.$constructor<ZodMiniSymbol>;
export declare function symbol(params?: string | core.$ZodSymbolParams): ZodMiniSymbol;
export interface ZodMiniUndefined extends _ZodMiniType<core.$ZodUndefinedInternals> {
}
export declare const ZodMiniUndefined: core.$constructor<ZodMiniUndefined>;
declare function _undefined(params?: string | core.$ZodUndefinedParams): ZodMiniUndefined;
export { _undefined as undefined };
export interface ZodMiniNull extends _ZodMiniType<core.$ZodNullInternals> {
}
export declare const ZodMiniNull: core.$constructor<ZodMiniNull>;
declare function _null(params?: string | core.$ZodNullParams): ZodMiniNull;
export { _null as null };
export interface ZodMiniAny extends _ZodMiniType<core.$ZodAnyInternals> {
}
export declare const ZodMiniAny: core.$constructor<ZodMiniAny>;
export declare function any(): ZodMiniAny;
export interface ZodMiniUnknown extends _ZodMiniType<core.$ZodUnknownInternals> {
}
export declare const ZodMiniUnknown: core.$constructor<ZodMiniUnknown>;
export declare function unknown(): ZodMiniUnknown;
export interface ZodMiniNever extends _ZodMiniType<core.$ZodNeverInternals> {
}
export declare const ZodMiniNever: core.$constructor<ZodMiniNever>;
export declare function never(params?: string | core.$ZodNeverParams): ZodMiniNever;
export interface ZodMiniVoid extends _ZodMiniType<core.$ZodVoidInternals> {
}
export declare const ZodMiniVoid: core.$constructor<ZodMiniVoid>;
declare function _void(params?: string | core.$ZodVoidParams): ZodMiniVoid;
export { _void as void };
export interface ZodMiniDate<T = unknown> extends _ZodMiniType<core.$ZodDateInternals<T>> {
}
export declare const ZodMiniDate: core.$constructor<ZodMiniDate>;
export declare function date(params?: string | core.$ZodDateParams): ZodMiniDate<Date>;
export interface ZodMiniArray<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodArrayInternals<T>>, core.$ZodArray<T> {
}
export declare const ZodMiniArray: core.$constructor<ZodMiniArray>;
export declare function array<T extends SomeType>(element: T, params?: string | core.$ZodArrayParams): ZodMiniArray<T>;
export declare function keyof<T extends ZodMiniObject>(schema: T): ZodMiniEnum<util.KeysEnum<T["shape"]>>;
export interface ZodMiniObject<
/** @ts-ignore Cast variance */
out Shape extends core.$ZodShape = core.$ZodShape, out Config extends core.$ZodObjectConfig = core.$strip> extends ZodMiniType<any, any, core.$ZodObjectInternals<Shape, Config>>, core.$ZodObject<Shape, Config> {
    shape: Shape;
}
export declare const ZodMiniObject: core.$constructor<ZodMiniObject>;
export declare function object<T extends core.$ZodLooseShape = Record<never, SomeType>>(shape?: T, params?: string | core.$ZodObjectParams): ZodMiniObject<util.Writeable<T>, core.$strip>;
export declare function strictObject<T extends core.$ZodLooseShape>(shape: T, params?: string | core.$ZodObjectParams): ZodMiniObject<util.Writeable<T>, core.$strict>;
export declare function looseObject<T extends core.$ZodLooseShape>(shape: T, params?: string | core.$ZodObjectParams): ZodMiniObject<util.Writeable<T>, core.$loose>;
export declare function extend<T extends ZodMiniObject, U extends core.$ZodLooseShape>(schema: T, shape: U): ZodMiniObject<util.Extend<T["shape"], util.Writeable<U>>, T["_zod"]["config"]>;
export type SafeExtendShape<Base extends core.$ZodShape, Ext extends core.$ZodLooseShape> = {
    [K in keyof Ext]: K extends keyof Base ? core.output<Ext[K]> extends core.output<Base[K]> ? core.input<Ext[K]> extends core.input<Base[K]> ? Ext[K] : never : never : Ext[K];
};
export declare function safeExtend<T extends ZodMiniObject, U extends core.$ZodLooseShape>(schema: T, shape: SafeExtendShape<T["shape"], U>): ZodMiniObject<util.Extend<T["shape"], util.Writeable<U>>, T["_zod"]["config"]>;
/**
 * @deprecated Use [\`z.extend(A, B.shape)\`](https://zod.dev/api?id=extend) instead.
 */
export declare function merge<T extends ZodMiniObject, U extends ZodMiniObject>(a: T, b: U): ZodMiniObject<util.Extend<T["shape"], U["shape"]>, U["_zod"]["config"]>;
export declare function pick<T extends ZodMiniObject, M extends util.Mask<keyof T["shape"]>>(schema: T, mask: M & Record<Exclude<keyof M, keyof T["shape"]>, never>): ZodMiniObject<util.Flatten<Pick<T["shape"], keyof T["shape"] & keyof M>>, T["_zod"]["config"]>;
export declare function omit<T extends ZodMiniObject, M extends util.Mask<keyof T["shape"]>>(schema: T, mask: M & Record<Exclude<keyof M, keyof T["shape"]>, never>): ZodMiniObject<util.Flatten<Omit<T["shape"], keyof M>>, T["_zod"]["config"]>;
export declare function partial<T extends ZodMiniObject>(schema: T): ZodMiniObject<{
    -readonly [k in keyof T["shape"]]: ZodMiniOptional<T["shape"][k]>;
}, T["_zod"]["config"]>;
export declare function partial<T extends ZodMiniObject, M extends util.Mask<keyof T["shape"]>>(schema: T, mask: M & Record<Exclude<keyof M, keyof T["shape"]>, never>): ZodMiniObject<{
    -readonly [k in keyof T["shape"]]: k extends keyof M ? ZodMiniOptional<T["shape"][k]> : T["shape"][k];
}, T["_zod"]["config"]>;
export declare function partial<T extends util.TupleItems, Rest extends SomeType | null>(schema: ZodMiniTuple<T, Rest>): ZodMiniTuple<{
    -readonly [k in keyof T]: ZodMiniOptional<T[k]>;
}, Rest>;
export declare function exactPartial<T extends ZodMiniObject>(schema: T): ZodMiniObject<{
    -readonly [k in keyof T["shape"]]: ZodMiniExactOptional<T["shape"][k]>;
}, T["_zod"]["config"]>;
export declare function exactPartial<T extends ZodMiniObject, M extends util.Mask<keyof T["shape"]>>(schema: T, mask: M & Record<Exclude<keyof M, keyof T["shape"]>, never>): ZodMiniObject<{
    -readonly [k in keyof T["shape"]]: k extends keyof M ? ZodMiniExactOptional<T["shape"][k]> : T["shape"][k];
}, T["_zod"]["config"]>;
export type RequiredInterfaceShape<Shape extends core.$ZodLooseShape, Keys extends PropertyKey = keyof Shape> = util.Identity<{
    [k in keyof Shape as k extends Keys ? k : never]: ZodMiniNonOptional<Shape[k]>;
} & {
    [k in keyof Shape as k extends Keys ? never : k]: Shape[k];
}>;
export declare function required<T extends ZodMiniObject>(schema: T): ZodMiniObject<{
    -readonly [k in keyof T["shape"]]: ZodMiniNonOptional<T["shape"][k]>;
}, T["_zod"]["config"]>;
export declare function required<T extends ZodMiniObject, M extends util.Mask<keyof T["shape"]>>(schema: T, mask: M & Record<Exclude<keyof M, keyof T["shape"]>, never>): ZodMiniObject<util.Extend<T["shape"], {
    [k in keyof M & keyof T["shape"]]: ZodMiniNonOptional<T["shape"][k]>;
}>, T["_zod"]["config"]>;
export declare function catchall<T extends ZodMiniObject, U extends SomeType>(inst: T, catchall: U): ZodMiniObject<T["shape"], core.$catchall<U>>;
export interface ZodMiniUnion<T extends readonly SomeType[] = readonly core.$ZodType[]> extends _ZodMiniType<core.$ZodUnionInternals<T>> {
}
export declare const ZodMiniUnion: core.$constructor<ZodMiniUnion>;
export declare function union<const T extends readonly SomeType[]>(options: T, params?: string | core.$ZodUnionParams): ZodMiniUnion<T>;
export interface ZodMiniXor<T extends readonly SomeType[] = readonly core.$ZodType[]> extends _ZodMiniType<core.$ZodXorInternals<T>> {
}
export declare const ZodMiniXor: core.$constructor<ZodMiniXor>;
/** Creates an exclusive union (XOR) where exactly one option must match.
 * Unlike regular unions that succeed when any option matches, xor fails if
 * zero or more than one option matches the input. */
export declare function xor<const T extends readonly SomeType[]>(options: T, params?: string | core.$ZodXorParams): ZodMiniXor<T>;
export interface ZodMiniDiscriminatedUnion<Options extends readonly SomeType[] = readonly core.$ZodType[], Disc extends string = string> extends ZodMiniUnion<Options> {
    _zod: core.$ZodDiscriminatedUnionInternals<Options, Disc>;
}
export declare const ZodMiniDiscriminatedUnion: core.$constructor<ZodMiniDiscriminatedUnion>;
export declare function discriminatedUnion<Types extends readonly [core.$ZodTypeDiscriminable, ...core.$ZodTypeDiscriminable[]], Disc extends string>(discriminator: Disc, options: Types, params?: string | core.$ZodDiscriminatedUnionParams): ZodMiniDiscriminatedUnion<Types, Disc>;
export interface ZodMiniIntersection<A extends SomeType = core.$ZodType, B extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodIntersectionInternals<A, B>> {
}
export declare const ZodMiniIntersection: core.$constructor<ZodMiniIntersection>;
export declare function intersection<T extends SomeType, U extends SomeType>(left: T, right: U): ZodMiniIntersection<T, U>;
export interface ZodMiniTuple<T extends util.TupleItems = readonly core.$ZodType[], Rest extends SomeType | null = core.$ZodType | null> extends _ZodMiniType<core.$ZodTupleInternals<T, Rest>> {
}
export declare const ZodMiniTuple: core.$constructor<ZodMiniTuple>;
export declare function tuple<const T extends readonly [SomeType, ...SomeType[]]>(items: T, params?: string | core.$ZodTupleParams): ZodMiniTuple<T, null>;
export declare function tuple<const T extends readonly [SomeType, ...SomeType[]], Rest extends SomeType>(items: T, rest: Rest, params?: string | core.$ZodTupleParams): ZodMiniTuple<T, Rest>;
export declare function tuple(items: [], params?: string | core.$ZodTupleParams): ZodMiniTuple<[], null>;
export interface ZodMiniRecord<Key extends core.$ZodRecordKey = core.$ZodRecordKey, Value extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodRecordInternals<Key, Value>> {
}
export declare const ZodMiniRecord: core.$constructor<ZodMiniRecord>;
export declare function record<Key extends core.$ZodRecordKey, Value extends SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodMiniRecord<Key, Value>;
export declare function partialRecord<Key extends core.$ZodRecordKey, Value extends SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodMiniRecord<Key & core.$partial, Value>;
export declare function looseRecord<Key extends core.$ZodRecordKey, Value extends SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodMiniRecord<Key, Value>;
export interface ZodMiniMap<Key extends SomeType = core.$ZodType, Value extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodMapInternals<Key, Value>> {
}
export declare const ZodMiniMap: core.$constructor<ZodMiniMap>;
export declare function map<Key extends SomeType, Value extends SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodMapParams): ZodMiniMap<Key, Value>;
export interface ZodMiniSet<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodSetInternals<T>> {
}
export declare const ZodMiniSet: core.$constructor<ZodMiniSet>;
export declare function set<Value extends SomeType>(valueType: Value, params?: string | core.$ZodSetParams): ZodMiniSet<Value>;
export interface ZodMiniEnum<T extends util.EnumLike = util.EnumLike> extends _ZodMiniType<core.$ZodEnumInternals<T>> {
    options: Array<T[keyof T]>;
}
export declare const ZodMiniEnum: core.$constructor<ZodMiniEnum>;
declare function _enum<const T extends readonly string[]>(values: T, params?: string | core.$ZodEnumParams): ZodMiniEnum<util.ToEnum<T[number]>>;
declare function _enum<T extends util.EnumLike>(entries: T, params?: string | core.$ZodEnumParams): ZodMiniEnum<T>;
export { _enum as enum };
/** @deprecated This API has been merged into \`z.enum()\`. Use \`z.enum()\` instead.
 *
 * \`\`\`ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * \`\`\`
 */
export declare function nativeEnum<T extends util.EnumLike>(entries: T, params?: string | core.$ZodEnumParams): ZodMiniEnum<T>;
export interface ZodMiniLiteral<T extends util.Literal = util.Literal> extends _ZodMiniType<core.$ZodLiteralInternals<T>> {
}
export declare const ZodMiniLiteral: core.$constructor<ZodMiniLiteral>;
export declare function literal<const T extends ReadonlyArray<util.Literal>>(value: T, params?: string | core.$ZodLiteralParams): ZodMiniLiteral<T[number]>;
export declare function literal<const T extends util.Literal>(value: T, params?: string | core.$ZodLiteralParams): ZodMiniLiteral<T>;
export interface ZodMiniFile extends _ZodMiniType<core.$ZodFileInternals> {
}
export declare const ZodMiniFile: core.$constructor<ZodMiniFile>;
export declare function file(params?: string | core.$ZodFileParams): ZodMiniFile;
export interface ZodMiniTransform<O = unknown, I = unknown> extends _ZodMiniType<core.$ZodTransformInternals<O, I>> {
}
export declare const ZodMiniTransform: core.$constructor<ZodMiniTransform>;
export declare function transform<I = unknown, O = I>(fn: (input: I, ctx: core.ParsePayload) => O): ZodMiniTransform<Awaited<O>, I>;
export interface ZodMiniOptional<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodOptionalInternals<T>>, core.$ZodOptional<T> {
}
export declare const ZodMiniOptional: core.$constructor<ZodMiniOptional>;
export declare function optional<T extends SomeType>(innerType: T): ZodMiniOptional<T>;
export interface ZodMiniExactOptional<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodExactOptionalInternals<T>>, core.$ZodExactOptional<T> {
}
export declare const ZodMiniExactOptional: core.$constructor<ZodMiniExactOptional>;
export declare function exactOptional<T extends SomeType>(innerType: T): ZodMiniExactOptional<T>;
export interface ZodMiniNullable<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodNullableInternals<T>> {
}
export declare const ZodMiniNullable: core.$constructor<ZodMiniNullable>;
export declare function nullable<T extends SomeType>(innerType: T): ZodMiniNullable<T>;
export declare function nullish<T extends SomeType>(innerType: T): ZodMiniOptional<ZodMiniNullable<T>>;
export interface ZodMiniDefault<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodDefaultInternals<T>> {
}
export declare const ZodMiniDefault: core.$constructor<ZodMiniDefault>;
export declare function _default<T extends SomeType>(innerType: T, defaultValue: util.NoUndefined<core.output<T>> | (() => util.NoUndefined<core.output<T>>)): ZodMiniDefault<T>;
export interface ZodMiniPrefault<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodPrefaultInternals<T>> {
}
export declare const ZodMiniPrefault: core.$constructor<ZodMiniPrefault>;
export declare function prefault<T extends SomeType>(innerType: T, defaultValue: core.input<T> | (() => core.input<T>)): ZodMiniPrefault<T>;
export interface ZodMiniNonOptional<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodNonOptionalInternals<T>> {
}
export declare const ZodMiniNonOptional: core.$constructor<ZodMiniNonOptional>;
export declare function nonoptional<T extends SomeType>(innerType: T, params?: string | core.$ZodNonOptionalParams): ZodMiniNonOptional<T>;
export interface ZodMiniSuccess<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodSuccessInternals<T>> {
}
export declare const ZodMiniSuccess: core.$constructor<ZodMiniSuccess>;
export declare function success<T extends SomeType>(innerType: T): ZodMiniSuccess<T>;
export interface ZodMiniCatch<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodCatchInternals<T>> {
}
export declare const ZodMiniCatch: core.$constructor<ZodMiniCatch>;
declare function _catch<T extends SomeType>(innerType: T, catchValue: core.output<T> | ((ctx: core.$ZodCatchCtx) => core.output<T>)): ZodMiniCatch<T>;
export { _catch as catch };
export interface ZodMiniNaN extends _ZodMiniType<core.$ZodNaNInternals> {
}
export declare const ZodMiniNaN: core.$constructor<ZodMiniNaN>;
export declare function nan(params?: string | core.$ZodNaNParams): ZodMiniNaN;
export interface ZodMiniPipe<A extends SomeType = core.$ZodType, B extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodPipeInternals<A, B>> {
}
export declare const ZodMiniPipe: core.$constructor<ZodMiniPipe>;
export declare function pipe<const A extends SomeType, B extends core.$ZodType<unknown, core.output<A>> = core.$ZodType<unknown, core.output<A>>>(in_: A, out: B | core.$ZodType<unknown, core.output<A>>): ZodMiniPipe<A, B>;
export interface ZodMiniCodec<A extends SomeType = core.$ZodType, B extends SomeType = core.$ZodType> extends ZodMiniPipe<A, B>, core.$ZodCodec<A, B> {
    _zod: core.$ZodCodecInternals<A, B>;
    def: core.$ZodCodecDef<A, B>;
}
export declare const ZodMiniCodec: core.$constructor<ZodMiniCodec>;
export declare function codec<const A extends SomeType, B extends core.SomeType = core.$ZodType>(in_: A, out: B, params: {
    decode: (value: core.output<A>, payload: core.ParsePayload<core.output<A>>) => core.util.MaybeAsync<core.input<B>>;
    encode: (value: core.input<B>, payload: core.ParsePayload<core.input<B>>) => core.util.MaybeAsync<core.output<A>>;
}): ZodMiniCodec<A, B>;
export declare function invertCodec<A extends SomeType, B extends SomeType>(codec: ZodMiniCodec<A, B>): ZodMiniCodec<B, A>;
export interface ZodMiniReadonly<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodReadonlyInternals<T>> {
}
export declare const ZodMiniReadonly: core.$constructor<ZodMiniReadonly>;
export declare function readonly<T extends SomeType>(innerType: T): ZodMiniReadonly<T>;
export interface ZodMiniTemplateLiteral<Template extends string = string> extends _ZodMiniType<core.$ZodTemplateLiteralInternals<Template>> {
}
export declare const ZodMiniTemplateLiteral: core.$constructor<ZodMiniTemplateLiteral>;
export declare function templateLiteral<const Parts extends core.$ZodTemplateLiteralPart[]>(parts: Parts, params?: string | core.$ZodTemplateLiteralParams): ZodMiniTemplateLiteral<core.$PartsToTemplateLiteral<Parts>>;
export interface ZodMiniLazy<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodLazyInternals<T>> {
}
export declare const ZodMiniLazy: core.$constructor<ZodMiniLazy>;
declare function _lazy<T extends SomeType>(getter: () => T): ZodMiniLazy<T>;
export { _lazy as lazy };
export interface ZodMiniPromise<T extends SomeType = core.$ZodType> extends _ZodMiniType<core.$ZodPromiseInternals<T>> {
}
export declare const ZodMiniPromise: core.$constructor<ZodMiniPromise>;
export declare function promise<T extends SomeType>(innerType: T): ZodMiniPromise<T>;
export interface ZodMiniCustom<O = unknown, I = unknown> extends _ZodMiniType<core.$ZodCustomInternals<O, I>> {
}
export declare const ZodMiniCustom: core.$constructor<ZodMiniCustom>;
export declare function check<O = unknown>(fn: core.CheckFn<O>, params?: string | core.$ZodCustomParams): core.$ZodCheck<O>;
export declare function custom<O = unknown, I = O>(fn?: (data: O) => unknown, _params?: string | core.$ZodCustomParams | undefined): ZodMiniCustom<O, I>;
export declare function refine<T>(fn: (arg: NoInfer<T>) => util.MaybeAsync<unknown>, _params?: string | core.$ZodCustomParams): core.$ZodCheck<T>;
export declare function superRefine<T>(fn: (arg: T, payload: core.$RefinementCtx<T>) => void | Promise<void>, params?: core.$ZodSuperRefineParams): core.$ZodCheck<T>;
export declare const describe: typeof core.describe;
export declare const meta: typeof core.meta;
declare abstract class Class {
    constructor(..._args: any[]);
}
declare function _instanceof<T extends typeof Class>(cls: T, params?: core.$ZodCustomParams): ZodMiniCustom<InstanceType<T>, InstanceType<T>>;
export { _instanceof as instanceof };
export declare const stringbool: (_params?: string | core.$ZodStringBoolParams) => ZodMiniCodec<ZodMiniString, ZodMiniBoolean>;
export type _ZodMiniJSONSchema = ZodMiniUnion<[
    ZodMiniString,
    ZodMiniNumber,
    ZodMiniBoolean,
    ZodMiniNull,
    ZodMiniArray<ZodMiniJSONSchema>,
    ZodMiniRecord<ZodMiniString<string>, ZodMiniJSONSchema>
]>;
export type _ZodMiniJSONSchemaInternals = _ZodMiniJSONSchema["_zod"];
export interface ZodMiniJSONSchemaInternals extends _ZodMiniJSONSchemaInternals {
    output: util.JSONType;
    input: util.JSONType;
}
export interface ZodMiniJSONSchema extends _ZodMiniJSONSchema {
    _zod: ZodMiniJSONSchemaInternals;
}
export declare function json(): ZodMiniJSONSchema;
export interface ZodMiniFunction<Args extends core.$ZodFunctionIn = core.$ZodFunctionIn, Returns extends core.$ZodFunctionOut = core.$ZodFunctionOut> extends _ZodMiniType<core.$ZodFunctionInternals<Args, Returns>>, core.$ZodFunction<Args, Returns> {
    _def: core.$ZodFunctionDef<Args, Returns>;
    _input: core.$InferInnerFunctionType<Args, Returns>;
    _output: core.$InferOuterFunctionType<Args, Returns>;
    input<const Items extends util.TupleItems, const Rest extends core.$ZodFunctionOut = core.$ZodFunctionOut>(args: Items, rest?: Rest): ZodMiniFunction<ZodMiniTuple<Items, Rest>, Returns>;
    input<NewArgs extends core.$ZodFunctionIn>(args: NewArgs): ZodMiniFunction<NewArgs, Returns>;
    input(...args: any[]): ZodMiniFunction<any, Returns>;
    output<NewReturns extends core.$ZodFunctionOut>(output: NewReturns): ZodMiniFunction<Args, NewReturns>;
}
export declare const ZodMiniFunction: core.$constructor<ZodMiniFunction>;
export declare function _function(): ZodMiniFunction;
export declare function _function<const In extends Array<SomeType> = Array<SomeType>>(params: {
    input: In;
}): ZodMiniFunction<ZodMiniTuple<In, null>, core.$ZodFunctionOut>;
export declare function _function<const In extends Array<SomeType> = Array<SomeType>, const Out extends core.$ZodFunctionOut = core.$ZodFunctionOut>(params: {
    input: In;
    output: Out;
}): ZodMiniFunction<ZodMiniTuple<In, null>, Out>;
export declare function _function<const In extends core.$ZodFunctionIn = core.$ZodFunctionIn>(params: {
    input: In;
}): ZodMiniFunction<In, core.$ZodFunctionOut>;
export declare function _function<const Out extends core.$ZodFunctionOut = core.$ZodFunctionOut>(params: {
    output: Out;
}): ZodMiniFunction<core.$ZodFunctionIn, Out>;
export declare function _function<In extends core.$ZodFunctionIn = core.$ZodFunctionIn, Out extends core.$ZodFunctionOut = core.$ZodFunctionOut>(params?: {
    input: In;
    output: Out;
}): ZodMiniFunction<In, Out>;
export { _function as function };
`
};
