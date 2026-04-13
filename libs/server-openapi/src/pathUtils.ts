import type {
    ParseStringSchemaBuilder,
    SchemaBuilder
} from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';
import type { EndpointMetadata } from '@cleverbrush/server';

type RoutePath = string | ParseStringSchemaBuilder<any, any, any, any, any>;

function isParseStringSchema(
    p: RoutePath
): p is ParseStringSchemaBuilder<any, any, any, any, any> {
    return typeof p !== 'string' && typeof (p as any).validate === 'function';
}

/**
 * Describes a single path parameter extracted from a route template,
 * including its name and the JSON Schema representation of its type.
 */
export interface PathParameterInfo {
    readonly name: string;
    readonly schema: Record<string, unknown>;
}

/**
 * The output of resolving a route path template to an OpenAPI-compatible
 * path string and its parameter list.
 */
export interface ResolvedPath {
    /** OpenAPI-formatted path, e.g. `/api/users/{id}` */
    readonly path: string;
    /** Extracted path parameters with their JSON Schema */
    readonly parameters: readonly PathParameterInfo[];
}

/**
 * Convert a colon-style static path to OpenAPI `{param}` format.
 * E.g. `/users/:id/posts/:pid` → `/users/{id}/posts/{pid}`
 */
function convertColonParams(path: string): {
    converted: string;
    paramNames: string[];
} {
    const paramNames: string[] = [];
    const converted = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        paramNames.push(name);
        return `{${name}}`;
    });
    return { converted, paramNames };
}

/**
 * Convert a `ParseStringSchemaBuilder` path template to an OpenAPI-formatted
 * path string and extract parameter schemas.
 */
function convertParseStringPath(
    pathTemplate: ParseStringSchemaBuilder<any, any, any, any, any>
): { pathString: string; parameters: PathParameterInfo[] } {
    const info = pathTemplate.introspect() as any;
    const templateDef = info.templateDefinition as {
        literals: string[];
        segments: { path: string }[];
    };
    const objectSchema = info.objectSchema;
    const objInfo = objectSchema.introspect() as any;
    const props: Record<
        string,
        SchemaBuilder<any, any, any>
    > = objInfo.properties ?? {};

    let pathString = '';
    for (let i = 0; i < templateDef.segments.length; i++) {
        pathString +=
            templateDef.literals[i] + `{${templateDef.segments[i].path}}`;
    }
    pathString += templateDef.literals[templateDef.segments.length] ?? '';

    const parameters: PathParameterInfo[] = templateDef.segments.map(seg => ({
        name: seg.path,
        schema: props[seg.path]
            ? toJsonSchema(props[seg.path], { $schema: false })
            : { type: 'string' }
    }));

    return { pathString, parameters };
}

/**
 * Combines `basePath` and `pathTemplate` from an endpoint into an
 * OpenAPI-formatted path with extracted parameter information.
 */
export function resolvePath(meta: EndpointMetadata): ResolvedPath {
    const basePath = meta.basePath.replace(/\/$/, '');
    const pathTemplate = meta.pathTemplate;

    if (isParseStringSchema(pathTemplate)) {
        const { pathString, parameters } = convertParseStringPath(pathTemplate);
        const fullPath = normalizeSlashes(basePath + pathString);
        return { path: fullPath, parameters };
    }

    // Static string path template
    const templateStr = pathTemplate === '/' ? '' : pathTemplate;
    const combined = basePath + templateStr;
    const { converted, paramNames } = convertColonParams(combined);
    const fullPath = normalizeSlashes(converted);

    const parameters: PathParameterInfo[] = paramNames.map(name => ({
        name,
        schema: { type: 'string' }
    }));

    return { path: fullPath, parameters };
}

function normalizeSlashes(path: string): string {
    // Replace double slashes with single, ensure leading slash
    let result = path.replace(/\/+/g, '/');
    if (!result.startsWith('/')) result = '/' + result;
    if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
    return result || '/';
}
