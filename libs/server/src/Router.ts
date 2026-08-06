import type { ParseStringSchemaBuilder } from '@cleverbrush/schema';
import type {
    EndpointRegistration,
    RouteMatch,
    SubscriptionRegistration
} from './types.js';

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

/** Structural route precedence used to rank successful path matches. */
interface RouteSpecificity {
    readonly isStatic: boolean;
    readonly literalSegments: number;
    readonly dynamicSegments: number;
}

interface RegisteredRoute<TRegistration> {
    readonly basePath: string;
    readonly routePath: RoutePath;
    readonly specificity: RouteSpecificity;
    readonly exactPath: string | null;
    readonly registration: TRegistration;
}

interface RegisteredRouteMatch<TRegistration> {
    readonly registration: TRegistration;
    readonly parsedPath: Record<string, any> | null;
}

interface RouteCollection<TRegistration> {
    readonly exactRoutes: Map<string, RegisteredRoute<TRegistration>>;
    readonly dynamicRoutes: RegisteredRoute<TRegistration>[];
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
    p: RoutePath
): p is ParseStringSchemaBuilder<any, any, any, any, any> {
    return typeof p !== 'string' && typeof (p as any).validate === 'function';
}

/**
 * Counts slash-delimited segments that contain literal route content.
 * Interpolations do not add literal content, even when they can consume `/`.
 */
function countLiteralSegments(literals: readonly string[]): number {
    let count = 0;
    let currentSegmentHasLiteral = false;

    for (const literal of literals) {
        for (const character of literal) {
            if (character === '/') {
                if (currentSegmentHasLiteral) count++;
                currentSegmentHasLiteral = false;
            } else {
                currentSegmentHasLiteral = true;
            }
        }
    }

    return count + (currentSegmentHasLiteral ? 1 : 0);
}

/** Derives registration-order-independent precedence from route structure. */
function getSpecificity(
    basePath: string,
    routePath: RoutePath
): RouteSpecificity {
    if (!isParseStringSchema(routePath)) {
        const suffix = normalizePath(routePath);
        const fullPath = suffix === '/' ? basePath || '/' : basePath + suffix;
        return {
            isStatic: true,
            literalSegments: countLiteralSegments([fullPath]),
            dynamicSegments: 0
        };
    }

    const { literals, segments } = routePath.introspect().templateDefinition;
    const fullLiterals = [basePath + (literals[0] ?? ''), ...literals.slice(1)];

    return {
        isStatic: segments.length === 0,
        literalSegments: countLiteralSegments(fullLiterals),
        dynamicSegments: segments.length
    };
}

/**
 * Returns a positive value when `candidate` is more specific than `current`.
 * Equal scores deliberately preserve registration order.
 */
function compareSpecificity(
    candidate: RouteSpecificity,
    current: RouteSpecificity
): number {
    if (candidate.isStatic !== current.isStatic) {
        return candidate.isStatic ? 1 : -1;
    }
    if (candidate.literalSegments !== current.literalSegments) {
        return candidate.literalSegments - current.literalSegments;
    }
    return current.dynamicSegments - candidate.dynamicSegments;
}

/** Returns the complete exact path for routes without interpolations. */
function getExactPath(basePath: string, routePath: RoutePath): string | null {
    if (!isParseStringSchema(routePath)) {
        const suffix = normalizePath(routePath);
        return suffix === '/' ? basePath || '/' : basePath + suffix;
    }

    const { literals, segments } = routePath.introspect().templateDefinition;
    if (segments.length > 0) return null;
    return basePath + (literals[0] ?? '');
}

function createRegisteredRoute<TRegistration>(
    basePath: string,
    routePath: RoutePath,
    registration: TRegistration
): RegisteredRoute<TRegistration> {
    const normalizedBase = normalizePath(basePath);
    return {
        basePath: normalizedBase,
        routePath,
        specificity: getSpecificity(normalizedBase, routePath),
        exactPath: getExactPath(normalizedBase, routePath),
        registration
    };
}

function createRouteCollection<
    TRegistration
>(): RouteCollection<TRegistration> {
    return {
        exactRoutes: new Map(),
        dynamicRoutes: []
    };
}

/** Adds a route while preserving the first registration for exact-path ties. */
function addRegisteredRoute<TRegistration>(
    collection: RouteCollection<TRegistration>,
    route: RegisteredRoute<TRegistration>
): void {
    if (route.exactPath !== null) {
        if (!collection.exactRoutes.has(route.exactPath)) {
            collection.exactRoutes.set(route.exactPath, route);
        }
        return;
    }

    collection.dynamicRoutes.push(route);
}

/**
 * HTTP and WebSocket router that maps paths to endpoint registrations.
 *
 * Both static string paths (exact-match only) and `ParseStringSchemaBuilder`
 * typed path templates are supported. For dynamic path parameters use
 * `route()` / `parseString()` templates rather than colon-param strings.
 * When multiple templates validate the same URL, static routes win, followed
 * by routes with more literal segments and then fewer dynamic segments.
 * Registration order breaks equal-specificity ties.
 */
export class Router {
    readonly #routes: Map<string, RouteCollection<EndpointRegistration>> =
        new Map();
    readonly #subscriptionRoutes: RouteCollection<SubscriptionRegistration> =
        createRouteCollection();
    #finalized = true;

    /**
     * Register an endpoint with the router.
     */
    addRoute(registration: EndpointRegistration): void {
        const { method, basePath, pathTemplate } = registration.endpoint;
        const upperMethod = method.toUpperCase();
        const route = createRegisteredRoute(
            basePath,
            pathTemplate,
            registration
        );

        let collection = this.#routes.get(upperMethod);
        if (!collection) {
            collection = createRouteCollection();
            this.#routes.set(upperMethod, collection);
        }
        addRegisteredRoute(collection, route);
        this.#finalized = false;
    }

    /**
     * Prepare all dynamic route collections for request-time matching.
     *
     * Sorting is stable, so registration order remains the tie-breaker for
     * routes with equal specificity. The method is idempotent and is also
     * called lazily by match operations if routes have changed.
     */
    finalize(): void {
        if (this.#finalized) return;

        for (const collection of this.#routes.values()) {
            this.#sortDynamicRoutes(collection.dynamicRoutes);
        }
        this.#sortDynamicRoutes(this.#subscriptionRoutes.dynamicRoutes);
        this.#finalized = true;
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
     *
     * Exact paths are indexed directly. Dynamic candidates are ordered by
     * specificity during finalization and evaluated until the first match.
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
        this.finalize();

        // Try exact method match first
        const methodRoutes = this.#routes.get(upperMethod);
        if (methodRoutes) {
            const result = this.#findFirstMatch(methodRoutes, normalized);
            if (result) {
                return { match: result, methodNotAllowed: false };
            }
        }

        // Check if any other method matches this path (405 detection)
        const allowedMethods: string[] = [];
        for (const [m, routes] of this.#routes) {
            if (m === upperMethod) continue;
            if (this.#findFirstMatch(routes, normalized)) {
                allowedMethods.push(m);
            }
        }

        if (allowedMethods.length > 0) {
            return { match: null, methodNotAllowed: true, allowedMethods };
        }

        return { match: null, methodNotAllowed: false };
    }

    /** Returns the first successful match from an indexed route collection. */
    #findFirstMatch<TRegistration>(
        collection: RouteCollection<TRegistration>,
        normalizedUrl: string
    ): RegisteredRouteMatch<TRegistration> | null {
        const exactRoute = collection.exactRoutes.get(normalizedUrl);
        if (exactRoute) {
            const match = this.#tryMatch(exactRoute, normalizedUrl);
            if (match) return match;
        }

        for (const route of collection.dynamicRoutes) {
            const match = this.#tryMatch(route, normalizedUrl);
            if (match) return match;
        }

        return null;
    }

    #sortDynamicRoutes<TRegistration>(
        routes: RegisteredRoute<TRegistration>[]
    ): void {
        routes.sort((a, b) => compareSpecificity(b.specificity, a.specificity));
    }

    #tryMatch<TRegistration>(
        route: RegisteredRoute<TRegistration>,
        normalizedUrl: string
    ): RegisteredRouteMatch<TRegistration> | null {
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

    // -----------------------------------------------------------------------
    // Subscription routing
    // -----------------------------------------------------------------------

    /**
     * Register a subscription endpoint with the router.
     */
    addSubscriptionRoute(registration: SubscriptionRegistration): void {
        const { basePath, pathTemplate } = registration.endpoint;
        addRegisteredRoute(
            this.#subscriptionRoutes,
            createRegisteredRoute(basePath, pathTemplate, registration)
        );
        this.#finalized = false;
    }

    /**
     * Match an incoming WebSocket upgrade URL to a registered subscription.
     *
     * Returns the most specific matched registration and parsed path params,
     * or `null`. Registration order breaks equal-specificity ties.
     */
    matchSubscription(url: string): {
        registration: SubscriptionRegistration;
        parsedPath: Record<string, any> | null;
    } | null {
        let normalized: string;
        try {
            normalized = normalizePath(url);
        } catch {
            return null;
        }

        this.finalize();
        return this.#findFirstMatch(this.#subscriptionRoutes, normalized);
    }
}
