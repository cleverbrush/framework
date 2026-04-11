import {
    ObjectSchemaBuilder,
    type ParseStringSchemaBuilder,
    type PropertyDescriptor,
    type PropertyDescriptorTree,
    type SchemaBuilder
} from '@cleverbrush/schema';
import type {
    ControllerConfig,
    ControllerRoutes,
    Middleware,
    RouteDefinition
} from './types.js';

// ---------------------------------------------------------------------------
// RouteBuilder — fluent route configuration with PropertyDescriptor selectors
// ---------------------------------------------------------------------------

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

type MethodSelector<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = (
    tree: PropertyDescriptorTree<TSchema>
) => PropertyDescriptor<TSchema, any, any>;

export class RouteBuilder<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> {
    readonly #schema: TSchema;
    readonly #tree: PropertyDescriptorTree<TSchema>;
    readonly #reverseMap = new Map<unknown, string>();
    readonly #routes: Record<string, RouteDefinition> = {};
    readonly #middlewares: Middleware[] = [];
    #basePath: string | undefined;

    constructor(schema: TSchema) {
        this.#schema = schema;
        this.#tree = ObjectSchemaBuilder.getPropertiesFor(
            schema
        ) as PropertyDescriptorTree<TSchema>;

        // Build reverse map: descriptor → property key name
        for (const key of Object.keys(this.#tree)) {
            this.#reverseMap.set(
                (this.#tree as Record<string, unknown>)[key],
                key
            );
        }
    }

    basePath(path: string): this {
        this.#basePath = path;
        return this;
    }

    use(middleware: Middleware): this {
        this.#middlewares.push(middleware);
        return this;
    }

    get(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('GET', selector, path);
    }

    post(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('POST', selector, path);
    }

    put(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('PUT', selector, path);
    }

    patch(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('PATCH', selector, path);
    }

    delete(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('DELETE', selector, path);
    }

    head(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('HEAD', selector, path);
    }

    options(path: RoutePath, selector: MethodSelector<TSchema>): this {
        return this.#route('OPTIONS', selector, path);
    }

    build(): ControllerConfig {
        const config: ControllerConfig = {
            routes: this.#routes as ControllerRoutes,
            ...(this.#basePath !== undefined
                ? { basePath: this.#basePath }
                : {}),
            ...(this.#middlewares.length > 0
                ? { middlewares: this.#middlewares }
                : {})
        };
        return config;
    }

    #route(
        method: string,
        selector: MethodSelector<TSchema>,
        path: RoutePath
    ): this {
        const descriptor = selector(this.#tree);
        const methodName = this.#reverseMap.get(descriptor);
        if (methodName === undefined) {
            throw new Error(
                'Unknown property descriptor. The selector must return a property from the schema.'
            );
        }

        const routeDef: RouteDefinition = {
            method,
            path
        };

        this.#routes[methodName] = routeDef;
        return this;
    }
}
