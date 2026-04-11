import {
    ObjectSchemaBuilder,
    type ParseStringSchemaBuilder,
    type PropertyDescriptor,
    type PropertyDescriptorTree
} from '@cleverbrush/schema';
import type {
    ControllerConfig,
    ControllerRoutes,
    Middleware,
    ParameterSource,
    RouteDefinition
} from './types.js';

// ---------------------------------------------------------------------------
// ParamBuilder — fluent builder for per-route parameter sources
// ---------------------------------------------------------------------------

export class ParamBuilder {
    readonly #sources: ParameterSource[] = [];

    path(): this {
        this.#sources.push({ from: 'path' });
        return this;
    }

    body(): this {
        this.#sources.push({ from: 'body' });
        return this;
    }

    query(name: string): this {
        this.#sources.push({ from: 'query', name });
        return this;
    }

    header(name: string): this {
        this.#sources.push({ from: 'header', name: name.toLowerCase() });
        return this;
    }

    context(): this {
        this.#sources.push({ from: 'context' });
        return this;
    }

    build(): ParameterSource[] {
        return [...this.#sources];
    }
}

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
    readonly #tree: PropertyDescriptorTree<TSchema>;
    readonly #reverseMap = new Map<unknown, string>();
    readonly #routes: Record<string, RouteDefinition> = {};
    readonly #middlewares: Middleware[] = [];
    #basePath: string | undefined;

    constructor(schema: TSchema) {
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

    get(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('GET', selector, path, params);
    }

    post(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('POST', selector, path, params);
    }

    put(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('PUT', selector, path, params);
    }

    patch(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('PATCH', selector, path, params);
    }

    delete(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('DELETE', selector, path, params);
    }

    head(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('HEAD', selector, path, params);
    }

    options(
        selector: MethodSelector<TSchema>,
        path: RoutePath,
        params?: (b: ParamBuilder) => ParamBuilder
    ): this {
        return this.#route('OPTIONS', selector, path, params);
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
        path: RoutePath,
        paramsCallback?: (b: ParamBuilder) => ParamBuilder
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
            path,
            ...(paramsCallback !== undefined
                ? { params: paramsCallback(new ParamBuilder()).build() }
                : {})
        };

        this.#routes[methodName] = routeDef;
        return this;
    }
}
