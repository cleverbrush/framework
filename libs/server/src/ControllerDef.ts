import type { InferType, SchemaBuilder } from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the instance-method shape from `InferType<TSchema>`, stripping
 * any `new(…)` construct signatures added by `addConstructor()`.
 *
 * Works because `keyof` never includes construct signatures — it only
 * produces string/symbol/number property keys.
 */
type MethodsOf<TSchema extends SchemaBuilder<any, any, any, any, any>> = {
    [K in keyof InferType<TSchema>]: InferType<TSchema>[K];
};

/**
 * Extracts the constructor parameter tuple from a schema that used
 * `addConstructor(func().addParameter(…))`.  Returns `[]` when the
 * inferred type has no construct signature.
 */
type CtorParamsOf<TSchema extends SchemaBuilder<any, any, any, any, any>> =
    InferType<TSchema> extends new (...args: infer P) => any ? P : [];

// ---------------------------------------------------------------------------
// defineController — Overload 1: no DI (plain object)
// ---------------------------------------------------------------------------

/**
 * Define a controller as a plain method-map.  All parameter types are
 * inferred from the schema — no manual annotations needed.
 *
 * ```ts
 * const Ctrl = defineController(MySchema, {
 *     async getById({ id }) { // id: number — inferred!
 *         return db.get(id);
 *     }
 * });
 * ```
 */
export function defineController<
    TSchema extends SchemaBuilder<any, any, any, any, any>
>(schema: TSchema, impl: MethodsOf<TSchema>): new () => MethodsOf<TSchema>;

// ---------------------------------------------------------------------------
// defineController — Overload 2: with DI (factory function)
// ---------------------------------------------------------------------------

/**
 * Define a controller with DI dependencies.  The factory receives the
 * resolved dependencies (typed from the schema's `addConstructor()`) and
 * returns the method-map.
 *
 * ```ts
 * const Ctrl = defineController(Schema, (config, logger) => ({
 *     // config & logger types inferred from addConstructor()
 *     getConfig() { return { dbUrl: config.dbUrl }; }
 * }));
 * ```
 */
export function defineController<
    TSchema extends SchemaBuilder<any, any, any, any, any>
>(
    schema: TSchema,
    factory: (...deps: CtorParamsOf<TSchema>) => MethodsOf<TSchema>
): new (
    ...args: CtorParamsOf<TSchema>
) => MethodsOf<TSchema>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function defineController(
    _schema: SchemaBuilder<any, any, any, any, any>,
    implOrFactory: any
): new (
    ...args: any[]
) => any {
    if (typeof implOrFactory === 'function') {
        // Overload 2: factory function — DI deps passed to constructor
        return class {
            constructor(...args: any[]) {
                const methods = implOrFactory(...args);
                for (const key of Object.keys(methods)) {
                    (this as any)[key] = methods[key];
                }
            }
        };
    }

    // Overload 1: plain method-map — no constructor args
    return class {
        constructor() {
            for (const key of Object.keys(implOrFactory)) {
                (this as any)[key] = implOrFactory[key];
            }
        }
    };
}
