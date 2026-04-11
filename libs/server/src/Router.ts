import type { ParseStringSchemaBuilder } from '@cleverbrush/schema';
import type {
    ControllerRegistration,
    RouteDefinition,
    RouteMatch
} from './types.js';

interface RegisteredRoute {
    readonly basePath: string;
    readonly routePath:
        | string
        | ParseStringSchemaBuilder<any, any, any, any, any>;
    readonly registration: ControllerRegistration;
    readonly methodName: string;
    readonly routeDef: RouteDefinition;
}

function normalizePath(p: string): string {
    // Decode URI components, strip trailing slash (keep root "/")
    let decoded = decodeURIComponent(p);
    if (decoded.length > 1 && decoded.endsWith('/')) {
        decoded = decoded.slice(0, -1);
    }
    return decoded;
}

function isParseStringSchema(
    p: string | ParseStringSchemaBuilder<any, any, any, any, any>
): p is ParseStringSchemaBuilder<any, any, any, any, any> {
    return typeof p !== 'string' && typeof (p as any).validate === 'function';
}

export class Router {
    readonly #routes: Map<string, RegisteredRoute[]> = new Map();
    /** All unique paths (for 405 detection) mapped to allowed methods */
    readonly #pathMethods: Map<string, Set<string>> = new Map();

    addRoute(
        registration: ControllerRegistration,
        methodName: string,
        routeDef: RouteDefinition
    ): void {
        const method = routeDef.method.toUpperCase();
        const basePath = normalizePath(registration.config.basePath ?? '');

        const route: RegisteredRoute = {
            basePath,
            routePath: routeDef.path,
            registration,
            methodName,
            routeDef
        };

        if (!this.#routes.has(method)) {
            this.#routes.set(method, []);
        }
        this.#routes.get(method)!.push(route);

        // Track path patterns for 405 detection
        const patternKey =
            typeof routeDef.path === 'string'
                ? `${basePath}${normalizePath(routeDef.path)}`
                : `${basePath}/__dynamic_${this.#routes.get(method)!.length}`;

        if (!this.#pathMethods.has(patternKey)) {
            this.#pathMethods.set(patternKey, new Set());
        }
        this.#pathMethods.get(patternKey)!.add(method);
    }

    match(
        method: string,
        url: string
    ): {
        match: RouteMatch | null;
        methodNotAllowed: boolean;
        allowedMethods?: string[];
    } {
        const normalized = normalizePath(url);
        const upperMethod = method.toUpperCase();

        // Try exact method match first
        const methodRoutes = this.#routes.get(upperMethod);
        if (methodRoutes) {
            for (const route of methodRoutes) {
                const result = this.#tryMatch(route, normalized);
                if (result) return { match: result, methodNotAllowed: false };
            }
        }

        // Check if any other method matches this path (405 detection)
        const allowedMethods: string[] = [];
        for (const [m, routes] of this.#routes) {
            if (m === upperMethod) continue;
            for (const route of routes) {
                if (this.#tryMatch(route, normalized)) {
                    allowedMethods.push(m);
                    break;
                }
            }
        }

        if (allowedMethods.length > 0) {
            return { match: null, methodNotAllowed: true, allowedMethods };
        }

        return { match: null, methodNotAllowed: false };
    }

    #tryMatch(
        route: RegisteredRoute,
        normalizedUrl: string
    ): RouteMatch | null {
        const { basePath, routePath, registration, methodName, routeDef } =
            route;

        // Check basePath prefix
        if (basePath && !normalizedUrl.startsWith(basePath)) {
            return null;
        }

        const remainder = basePath
            ? normalizedUrl.slice(basePath.length)
            : normalizedUrl;

        if (isParseStringSchema(routePath)) {
            // Dynamic route: validate remainder via parseString schema
            const result = routePath.validate(remainder);
            if (result.valid) {
                return {
                    registration,
                    methodName,
                    routeDef,
                    parsedPath: result.object as Record<string, any>
                };
            }
            return null;
        }

        // Static route: exact match
        const normalizedRoutePath = normalizePath(routePath);
        const normalizedRemainder = remainder.length === 0 ? '/' : remainder;

        if (normalizedRemainder === normalizedRoutePath) {
            return {
                registration,
                methodName,
                routeDef,
                parsedPath: null
            };
        }

        return null;
    }
}
