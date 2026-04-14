import type { SchemaBuilder } from '@cleverbrush/schema';
import type {
    AuthenticationConfig,
    EndpointMetadata,
    EndpointRegistration
} from '@cleverbrush/server';
import { resolvePath } from './pathUtils.js';
import { convertSchema } from './schemaConverter.js';
import {
    mapOperationSecurity,
    mapSecuritySchemes,
    type OpenApiSecurityScheme
} from './securityMapper.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * API metadata included in the OpenAPI `info` object.
 * Maps directly to the OpenAPI 3.1 Info Object.
 */
export interface OpenApiInfo {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
    readonly termsOfService?: string;
    readonly contact?: {
        readonly name?: string;
        readonly url?: string;
        readonly email?: string;
    };
    readonly license?: {
        readonly name: string;
        readonly url?: string;
    };
}

/**
 * A server entry in the OpenAPI `servers` array.
 * Describes a base URL where the API is accessible.
 */
export interface OpenApiServer {
    readonly url: string;
    readonly description?: string;
}

/**
 * Options passed to {@link generateOpenApiSpec}.
 */
export interface OpenApiOptions {
    readonly registrations: readonly EndpointRegistration[];
    readonly info: OpenApiInfo;
    readonly servers?: readonly OpenApiServer[];
    readonly authConfig?: AuthenticationConfig | null;
    readonly securitySchemes?: Record<string, OpenApiSecurityScheme>;
}

// ---------------------------------------------------------------------------
// OpenAPI Document (partial typing — plain objects for flexibility)
// ---------------------------------------------------------------------------

/**
 * A generated OpenAPI 3.1 document. Typed as a plain object map to allow
 * any extension fields without requiring a full OpenAPI type library.
 */
export type OpenApiDocument = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function buildParameterObject(
    name: string,
    location: 'query' | 'header' | 'path',
    schema: Record<string, unknown>,
    required: boolean,
    description?: string
): Record<string, unknown> {
    const param: Record<string, unknown> = {
        name,
        in: location,
        schema
    };
    if (required) param['required'] = true;
    if (description) param['description'] = description;
    return param;
}

function buildRequestBody(
    bodySchema: SchemaBuilder<any, any, any, any, any>
): Record<string, unknown> {
    const jsonSchema = convertSchema(bodySchema);
    const bodyInfo = bodySchema.introspect() as any;
    const body: Record<string, unknown> = {
        required: bodyInfo.isRequired !== false,
        content: {
            'application/json': { schema: jsonSchema }
        }
    };
    if (typeof bodyInfo.description === 'string' && bodyInfo.description !== '')
        body['description'] = bodyInfo.description;
    return body;
}

// Default descriptions for common HTTP status codes
const HTTP_STATUS_DESCRIPTIONS: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error'
};

// Minimal inline schema for ProblemDetails error responses
const PROBLEM_DETAILS_SCHEMA = {
    type: 'object',
    properties: {
        status: { type: 'integer' },
        title: { type: 'string' },
        detail: { type: 'string' }
    }
};

function buildResponses(
    meta: EndpointMetadata,
    method: string
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Multi-code path — .responses() was called
    if (meta.responsesSchemas) {
        for (const [codeStr, schema] of Object.entries(meta.responsesSchemas)) {
            const code = Number(codeStr);
            const desc =
                HTTP_STATUS_DESCRIPTIONS[code] ?? `Response ${codeStr}`;
            if (schema) {
                const jsonSchema = convertSchema(schema);
                const respInfo = schema.introspect() as any;
                const customDesc =
                    typeof respInfo.description === 'string' &&
                    respInfo.description !== ''
                        ? respInfo.description
                        : desc;
                result[codeStr] = {
                    description: customDesc,
                    content: { 'application/json': { schema: jsonSchema } }
                };
            } else {
                result[codeStr] = { description: desc };
            }
        }
    } else if (meta.responseSchema) {
        // Legacy single-code path — .returns() was called
        const jsonSchema = convertSchema(meta.responseSchema);
        const respInfo = meta.responseSchema.introspect() as any;
        const desc =
            typeof respInfo.description === 'string' &&
            respInfo.description !== ''
                ? respInfo.description
                : 'Successful response';
        result['200'] = {
            description: desc,
            content: { 'application/json': { schema: jsonSchema } }
        };
    } else if (method === 'DELETE' || method === 'HEAD') {
        result['204'] = { description: 'No content' };
    } else {
        result['200'] = { description: 'Successful response' };
    }

    // Auto-add framework-generated error responses
    if (meta.bodySchema && !result['422']) {
        result['422'] = {
            description: 'Validation error',
            content: {
                'application/problem+json': { schema: PROBLEM_DETAILS_SCHEMA }
            }
        };
    }

    if (meta.authRoles !== null) {
        if (!result['401']) {
            result['401'] = {
                description: 'Unauthorized',
                content: {
                    'application/problem+json': {
                        schema: PROBLEM_DETAILS_SCHEMA
                    }
                }
            };
        }
        if (!result['403']) {
            result['403'] = {
                description: 'Forbidden',
                content: {
                    'application/problem+json': {
                        schema: PROBLEM_DETAILS_SCHEMA
                    }
                }
            };
        }
    }

    return result;
}

function buildOperation(
    meta: EndpointMetadata,
    pathParams: { name: string; schema: Record<string, unknown> }[],
    securitySchemeNames: string[]
): Record<string, unknown> {
    const operation: Record<string, unknown> = {};

    // Metadata
    if (meta.summary) operation['summary'] = meta.summary;
    if (meta.description) operation['description'] = meta.description;
    if (meta.tags.length > 0) operation['tags'] = [...meta.tags];
    if (meta.operationId) operation['operationId'] = meta.operationId;
    if (meta.deprecated) operation['deprecated'] = true;

    // Parameters
    const parameters: Record<string, unknown>[] = [];

    // Path parameters
    for (const pp of pathParams) {
        parameters.push(buildParameterObject(pp.name, 'path', pp.schema, true));
    }

    // Query parameters
    if (meta.querySchema) {
        const queryInfo = meta.querySchema.introspect() as any;
        const props: Record<
            string,
            SchemaBuilder<any, any, any>
        > = queryInfo.properties ?? {};
        for (const [name, propSchema] of Object.entries(props)) {
            const propInfo = propSchema.introspect() as any;
            const isRequired = propInfo.isRequired !== false;
            const description =
                typeof propInfo.description === 'string' &&
                propInfo.description !== ''
                    ? propInfo.description
                    : undefined;
            parameters.push(
                buildParameterObject(
                    name,
                    'query',
                    convertSchema(propSchema),
                    isRequired,
                    description
                )
            );
        }
    }

    // Header parameters
    if (meta.headerSchema) {
        const headerInfo = meta.headerSchema.introspect() as any;
        const props: Record<
            string,
            SchemaBuilder<any, any, any>
        > = headerInfo.properties ?? {};
        for (const [name, propSchema] of Object.entries(props)) {
            const propInfo = propSchema.introspect() as any;
            const isRequired = propInfo.isRequired !== false;
            const description =
                typeof propInfo.description === 'string' &&
                propInfo.description !== ''
                    ? propInfo.description
                    : undefined;
            parameters.push(
                buildParameterObject(
                    name,
                    'header',
                    convertSchema(propSchema),
                    isRequired,
                    description
                )
            );
        }
    }

    if (parameters.length > 0) operation['parameters'] = parameters;

    // Request body
    if (meta.bodySchema) {
        operation['requestBody'] = buildRequestBody(meta.bodySchema);
    }

    // Responses
    operation['responses'] = buildResponses(meta, meta.method.toUpperCase());

    // Security
    const security = mapOperationSecurity(authRoles(meta), securitySchemeNames);
    if (security.length > 0) operation['security'] = security;

    return operation;
}

function authRoles(meta: EndpointMetadata): readonly string[] | null {
    return meta.authRoles;
}

/**
 * Generate an OpenAPI 3.1 specification document from registered endpoints.
 */
export function generateOpenApiSpec(options: OpenApiOptions): OpenApiDocument {
    const { registrations, info, servers, authConfig, securitySchemes } =
        options;

    // Security schemes — from explicit config or auto-mapped
    const resolvedSchemes: Record<string, OpenApiSecurityScheme> =
        securitySchemes ?? mapSecuritySchemes(authConfig);
    const securitySchemeNames = Object.keys(resolvedSchemes);

    // Build paths
    const paths: Record<string, Record<string, unknown>> = {};

    for (const reg of registrations) {
        const meta = reg.endpoint;
        const { path, parameters: pathParams } = resolvePath(meta);
        const method = meta.method.toLowerCase();

        if (!paths[path]) paths[path] = {};
        paths[path][method] = buildOperation(
            meta,
            pathParams as { name: string; schema: Record<string, unknown> }[],
            securitySchemeNames
        );
    }

    // Assemble document
    const doc: OpenApiDocument = {
        openapi: '3.1.0',
        info: { ...info }
    };

    if (servers && servers.length > 0) {
        doc['servers'] = servers.map(s => ({ ...s }));
    }

    doc['paths'] = paths;

    // Components
    if (securitySchemeNames.length > 0) {
        doc['components'] = {
            securitySchemes: { ...resolvedSchemes }
        };
    }

    return doc;
}
