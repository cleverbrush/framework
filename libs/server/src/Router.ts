import type { ParseStringSchemaBuilder } from '@cleverbrush/schema';
import type { EndpointRegistration, RouteMatch } from './types.js';

interface RegisteredRoute {
    readonly basePath: string;
    readonly routePath:
        | string
        | ParseStringSchemaBuilder<any, any, any, any, any>;
    readonly registration: EndpointRegistration;
}

function normalizePath(p: string): string {
    // Use decodeURI (not decodeURIComponent) so that reserved characters such
    // as %2F (encoded slash) are kept encoded and do not alter path segmentation.
    // Throws URIError on malformed percent-encoding – callers that process
    // untrusted input (e.g. match()) must catch that and return a 400.
    const decoded = decodeURI(p);
    if (decoded.length > 1 && decoded.endsWith('/')) {
        return decoded.slice(0, -1);
    }
    return decoded;
}

function isParseStringSchema(
    p: string | ParseStringSchemaBuilder<any, any, any, any, any>
): p is ParseStringSchemaBuilder<any, any, any, any, any> {
    return typeof p !== 'string' && typeof (p as any).validate === 'function';
}

/**
 * Radix-style HTTP router that maps method + path to endpoint registrations.
 *
 * Both static string paths (colon params style) and `ParseStringSchemaBuilder`
 * typed path templates are supported.
 */
export class Router {
    readonly #routes: Map<string, RegisteredRoute[]> = new Map();

    /**
     * Register an endpoint with the router.
     */
    addRoute(registration: EndpointRegistration): void {
        const { method, basePath, pathTemplate } = registration.endpoint;
        const upperMethod = method.toUpperCase();
        const normalizedBase = normalizePath(basePath);

        const route: RegisteredRoute = {
            basePath: normalizedBase,
            routePath: pathTemplate,
            registration
        };

        if (!this.#routes.has(upperMethod)) {
            this.#routes.set(upperMethod, []);
        }
        this.#routes.get(upperMethod)!.push(route);
    }

    /**
     * Match an incoming HTTP method and URL to a registered endpoint.
     *
     * Returns:
     * - `{ match }` — a successful match with parsed path parameters.
     * - `{ match: null, methodNotAllowed: true, allowedMethods }` — path matches
     *   but the method does not (405 Method Not Allowed).
     * - `{ match: null, methodNotAllowed: false }` — no match at all (404).
     * - `{ match: null, methodNotAllowed: false, badRequest: true }` — the URL
     *   contains malformed percent-encoding (caller should respond with 400).
     */
    match(
        method: string,
        url: string
    ): {
        match: RouteMatch | null;
        methodNotAllowed: boolean;
        badRequest?: boolean;
        allowedMethods?: string[];
    } {
        let normalized: string;
        try {
            normalized = normalizePath(url);
        } catch {
            // URIError from decodeURI – malformed percent-encoding in the URL
            return { match: null, methodNotAllowed: false, badRequest: true };
        }
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
        const { basePath, routePath } = route;

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
                    registration: route.registration,
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
                registration: route.registration,
                parsedPath: null
            };
        }

        return null;
    }
}
