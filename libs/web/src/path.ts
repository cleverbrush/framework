/**
 * Builds the full request URL from endpoint metadata and optional path
 * parameters.
 *
 * When the endpoint uses a `route()` path template (a
 * `ParseStringSchemaBuilder`), the template is serialized with the
 * supplied `params`.  Otherwise the plain `basePath` is used directly.
 *
 * @param basePath - The base path segment (e.g. `'/api/todos'`).
 * @param pathTemplate - Either a plain string or a `ParseStringSchemaBuilder`
 *   created via `route()`.
 * @param params - Path parameters to interpolate into the template.
 * @returns The resolved URL path (e.g. `'/api/todos/42'`).
 *
 * @internal
 */
export function buildPath(
    basePath: string,
    pathTemplate: { serialize?: (params: any) => string } | string,
    params?: Record<string, unknown>
): string {
    if (typeof pathTemplate === 'string') {
        return basePath + pathTemplate;
    }

    if (typeof pathTemplate.serialize === 'function' && params) {
        return basePath + pathTemplate.serialize(params);
    }

    return basePath;
}
