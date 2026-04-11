import {
    type InferType,
    object,
    type ObjectSchemaBuilder,
    type ParseStringSchemaBuilder,
    parseString,
    type ParseStringTemplateTag,
    type PropertyDescriptor,
    type PropertyDescriptorTree,
    type SchemaBuilder
} from '@cleverbrush/schema';

type RouteTemplateTag<
    TProps extends Record<string, SchemaBuilder<any, any, any, any, any>>
> = (
    strings: TemplateStringsArray,
    ...selectors: Array<
        (
            tree: PropertyDescriptorTree<
                ObjectSchemaBuilder<
                    TProps,
                    true,
                    false,
                    undefined,
                    false,
                    {},
                    []
                >,
                ObjectSchemaBuilder<
                    TProps,
                    true,
                    false,
                    undefined,
                    false,
                    {},
                    []
                >,
                string | number | boolean | Date
            >
        ) => PropertyDescriptor<
            ObjectSchemaBuilder<TProps, true, false, undefined, false, {}, []>,
            any,
            any
        >
    >
) => ParseStringSchemaBuilder<
    InferType<
        ObjectSchemaBuilder<TProps, true, false, undefined, false, {}, []>
    >
>;

function createRouteTag<
    TProps extends Record<string, SchemaBuilder<any, any, any, any, any>>
>(props: TProps): RouteTemplateTag<TProps> {
    type TSchema = ObjectSchemaBuilder<
        TProps,
        true,
        false,
        undefined,
        false,
        {},
        []
    >;
    const objectSchema = object(props) as unknown as TSchema;

    return ((strings: TemplateStringsArray, ...selectors: any[]) =>
        parseString(objectSchema, ($t: ParseStringTemplateTag<TSchema>) =>
            ($t as any)(strings, ...selectors)
        )) as any;
}

// Overload: route`/some/path` — used directly as a tagged template (no params)
export function route(
    strings: TemplateStringsArray,
    ...selectors: never[]
): ParseStringSchemaBuilder<
    InferType<ObjectSchemaBuilder<{}, true, false, undefined, false, {}, []>>
>;

// Overload: route() — called with no args, returns a tagged template (no params)
export function route(): RouteTemplateTag<{}>;

// Overload: route({ id: number() }) — called with props, returns a tagged template
export function route<
    TProps extends Record<string, SchemaBuilder<any, any, any, any, any>>
>(props: TProps): RouteTemplateTag<TProps>;

/**
 * Concise shorthand for defining a typed path template.
 *
 * @example With parameters
 * ```ts
 * const TodoById = route({ id: number().coerce() })`/${t => t.id}`;
 * ```
 *
 * @example Static path (no parameters)
 * ```ts
 * const Path = route`/some/path`;
 * // or
 * const Path = route()`/some/path`;
 * ```
 *
 * @param propsOrStrings - Either a property map for typed path segments,
 *   or a `TemplateStringsArray` when used directly as a tagged template.
 * @returns A `ParseStringSchemaBuilder`, or a tagged-template function
 *   that produces one.
 */
export function route(propsOrStrings?: any, ..._rest: any[]): any {
    // route`/some/path` — called as tagged template directly
    if (
        propsOrStrings != null &&
        Array.isArray((propsOrStrings as TemplateStringsArray).raw)
    ) {
        return createRouteTag({})(propsOrStrings as TemplateStringsArray);
    }

    // route() or route({...})
    return createRouteTag(propsOrStrings ?? {});
}
