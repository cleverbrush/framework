import {
    ObjectSchemaBuilder,
    type SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type {
    AuthenticationConfig,
    EndpointMetadata,
    EndpointRegistration,
    WebhookDefinition
} from '@cleverbrush/server';
import { resolvePath } from './pathUtils.js';
import { convertSchema } from './schemaConverter.js';
import { SchemaRegistry, walkSchemas } from './schemaRegistry.js';
import {
    mapOperationSecurity,
    mapSecuritySchemes,
    type OpenApiSecurityScheme
} from './securityMapper.js';

// ---------------------------------------------------------------------------
// Server interface (structural — avoids hard dependency on ServerBuilder class)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for a `@cleverbrush/server` server instance. Matches
 * the relevant subset of `ServerBuilder` so that callers can pass the
 * server directly without importing the class.
 */
export interface OpenApiServer_ServerLike {
    getRegistrations(): readonly EndpointRegistration[];
    getAuthenticationConfig(): AuthenticationConfig | null;
    getWebhooks(): readonly WebhookDefinition[];
}

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
 * A tag entry in the OpenAPI top-level `tags` array.
 * Provides a name, optional description, and optional external documentation
 * for a tag group.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#tag-object
 */
export interface OpenApiTag {
    /** Tag name. Must match the tag strings used on individual operations. */
    readonly name: string;
    /** Short description for the tag group, displayed in Swagger UI / Redoc. */
    readonly description?: string;
    /** Link to external documentation for this tag. */
    readonly externalDocs?: {
        readonly url: string;
        readonly description?: string;
    };
}

/**
 * Options passed to {@link generateOpenApiSpec}.
 *
 * When `server` is provided, `registrations` and `authConfig` are derived
 * from it automatically (unless explicitly overridden).
 */
export interface OpenApiOptions {
    /**
     * A `ServerBuilder` (or any object implementing the same methods).
     * When set, `registrations`, `authConfig`, and `webhooks` are
     * automatically read from the server instance. Explicit values for
     * those fields take precedence over the server-derived ones.
     */
    readonly server?: OpenApiServer_ServerLike;
    readonly registrations?: readonly EndpointRegistration[];
    readonly info: OpenApiInfo;
    readonly servers?: readonly OpenApiServer[];
    readonly authConfig?: AuthenticationConfig | null;
    readonly securitySchemes?: Record<string, OpenApiSecurityScheme>;
    /**
     * Top-level tag definitions with optional descriptions and external docs.
     *
     * When provided, these entries are emitted as the top-level `tags` array.
     * Any tag names used by registered endpoints but absent from this list are
     * automatically appended as name-only entries (sorted alphabetically).
     *
     * When omitted, unique tag names are still auto-collected from all
     * registered endpoints and emitted as name-only entries.
     *
     * @see https://spec.openapis.org/oas/v3.1.0#tag-object
     */
    readonly tags?: readonly OpenApiTag[];
    /**
     * Webhook definitions to emit in the top-level `webhooks` map of the
     * generated OpenAPI document.
     *
     * Webhooks are not served as HTTP routes — they merely document async
     * out-of-band requests that your API sends to subscribers.
     *
     * @see https://spec.openapis.org/oas/v3.1.0#fixed-fields
     */
    readonly webhooks?: readonly WebhookDefinition[];
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
    bodySchema: SchemaBuilder<any, any, any, any, any>,
    registry: SchemaRegistry,
    example?: unknown | null,
    examples?: Record<
        string,
        { summary?: string; description?: string; value: unknown }
    > | null
): Record<string, unknown> {
    const jsonSchema = convertSchema(bodySchema, registry);
    const bodyInfo = bodySchema.introspect() as any;
    const mediaType: Record<string, unknown> = { schema: jsonSchema };
    if (example != null) {
        mediaType['example'] = example;
    } else if (examples != null) {
        mediaType['examples'] = examples;
    }
    const body: Record<string, unknown> = {
        required: bodyInfo.isRequired !== false,
        content: {
            'application/json': mediaType
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

function buildResponseHeaders(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    registry: SchemaRegistry
): Record<string, unknown> {
    const info = schema.introspect() as any;
    const props: Record<
        string,
        SchemaBuilder<any, any, any, any, any>
    > = info.properties ?? {};
    const headers: Record<string, unknown> = {};
    for (const [name, propSchema] of Object.entries(props)) {
        const propInfo = propSchema.introspect() as any;
        const header: Record<string, unknown> = {
            schema: convertSchema(propSchema, registry)
        };
        if (
            typeof propInfo.description === 'string' &&
            propInfo.description !== ''
        ) {
            header['description'] = propInfo.description;
        }
        headers[name] = header;
    }
    return headers;
}

function buildResponses(
    meta: EndpointMetadata,
    method: string,
    registry: SchemaRegistry
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Binary file response — takes precedence over JSON schema
    if (meta.producesFile) {
        const ct = meta.producesFile.contentType ?? 'application/octet-stream';
        const desc = meta.producesFile.description ?? 'File download';
        result['200'] = {
            description: desc,
            content: {
                [ct]: { schema: { type: 'string', format: 'binary' } }
            }
        };
    } else if (meta.responsesSchemas) {
        for (const [codeStr, schema] of Object.entries(meta.responsesSchemas)) {
            const code = Number(codeStr);
            const desc =
                HTTP_STATUS_DESCRIPTIONS[code] ?? `Response ${codeStr}`;
            if (schema) {
                const jsonSchema = convertSchema(schema, registry);
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
        const jsonSchema = convertSchema(meta.responseSchema, registry);
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

    // Multiple content types — augment each response's content map with extra
    // MIME types from .produces(). producesFile already handled above (binary wins).
    if (meta.produces && !meta.producesFile) {
        for (const code of Object.keys(result)) {
            const entry = result[code] as Record<string, unknown>;
            const existingContent = entry['content'] as
                | Record<string, unknown>
                | undefined;
            // Only augment success responses that already have a content map
            // (skip error responses whose content is application/problem+json)
            if (
                !existingContent ||
                existingContent['application/problem+json']
            ) {
                continue;
            }
            const baseSchema =
                (existingContent['application/json'] as Record<string, unknown>)
                    ?.schema ?? {};
            for (const [mimeType, typeEntry] of Object.entries(meta.produces)) {
                if (mimeType === 'application/json') continue;
                existingContent[mimeType] = {
                    schema: typeEntry.schema
                        ? convertSchema(typeEntry.schema, registry)
                        : baseSchema
                };
            }
        }
    }

    // Response headers — inject into every response code when declared
    if (meta.responseHeaderSchema) {
        const headers = buildResponseHeaders(
            meta.responseHeaderSchema,
            registry
        );
        for (const code of Object.keys(result)) {
            (result[code] as Record<string, unknown>)['headers'] = headers;
        }
    }

    // Links — attach to the lowest 2xx response
    if (meta.links) {
        const linksOut: Record<string, unknown> = {};
        for (const [linkName, linkDef] of Object.entries(meta.links)) {
            const link: Record<string, unknown> = {
                operationId: linkDef.operationId
            };
            if (linkDef.description) link['description'] = linkDef.description;
            if (linkDef.requestBody) link['requestBody'] = linkDef.requestBody;
            if (linkDef.parameters) {
                let params: Record<string, unknown>;
                if (
                    typeof linkDef.parameters === 'function' &&
                    meta.responseSchema
                ) {
                    const tree = ObjectSchemaBuilder.getPropertiesFor(
                        meta.responseSchema as ObjectSchemaBuilder<
                            any,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >
                    );
                    const raw = (
                        linkDef.parameters as (
                            r: any
                        ) => Record<string, unknown>
                    )(tree);
                    params = {};
                    for (const [paramName, value] of Object.entries(raw)) {
                        if (
                            value &&
                            typeof value === 'object' &&
                            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in
                                (value as object)
                        ) {
                            const pointer = (value as any)[
                                SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                            ].toJsonPointer();
                            params[paramName] = `$response.body#${pointer}`;
                        } else {
                            params[paramName] = value;
                        }
                    }
                } else {
                    params = linkDef.parameters as Record<string, unknown>;
                }
                link['parameters'] = params;
            }
            linksOut[linkName] = link;
        }
        const successCode = Object.keys(result)
            .filter(k => Number(k) >= 200 && Number(k) < 300)
            .sort()[0];
        if (successCode) {
            (result[successCode] as Record<string, unknown>)['links'] =
                linksOut;
        }
    }

    return result;
}

function buildOperation(
    meta: EndpointMetadata,
    pathParams: { name: string; schema: Record<string, unknown> }[],
    securitySchemeNames: string[],
    registry: SchemaRegistry
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
                    convertSchema(propSchema, registry),
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
                    convertSchema(propSchema, registry),
                    isRequired,
                    description
                )
            );
        }
    }

    if (parameters.length > 0) operation['parameters'] = parameters;

    // Request body
    if (meta.bodySchema) {
        operation['requestBody'] = buildRequestBody(
            meta.bodySchema,
            registry,
            meta.example,
            meta.examples
        );
    }

    // Responses
    operation['responses'] = buildResponses(
        meta,
        meta.method.toUpperCase(),
        registry
    );

    // Security
    const security = mapOperationSecurity(authRoles(meta), securitySchemeNames);
    if (security.length > 0) operation['security'] = security;

    // External documentation
    if (meta.externalDocs) {
        const ed: Record<string, unknown> = { url: meta.externalDocs.url };
        if (meta.externalDocs.description)
            ed['description'] = meta.externalDocs.description;
        operation['externalDocs'] = ed;
    }

    // Callbacks
    if (meta.callbacks) {
        const callbacksOut: Record<string, unknown> = {};
        for (const [cbName, cbDef] of Object.entries(meta.callbacks)) {
            // Determine URL expression
            let expression: string;
            if (cbDef.expression) {
                expression = cbDef.expression;
            } else if (cbDef.urlFrom && meta.bodySchema) {
                const tree = ObjectSchemaBuilder.getPropertiesFor(
                    meta.bodySchema as ObjectSchemaBuilder<
                        any,
                        any,
                        any,
                        any,
                        any,
                        any,
                        any
                    >
                );
                const selected = cbDef.urlFrom(tree);
                if (
                    selected &&
                    typeof selected === 'object' &&
                    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in (selected as object)
                ) {
                    const pointer = (selected as any)[
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                    ].toJsonPointer();
                    expression = `{$request.body#${pointer}}`;
                } else {
                    expression = String(
                        selected ?? '{$request.body#/callbackUrl}'
                    );
                }
            } else {
                expression = '{$request.body#/callbackUrl}';
            }

            const cbMethod = (cbDef.method ?? 'post').toLowerCase();
            const cbOperation: Record<string, unknown> = {};
            if (cbDef.summary) cbOperation['summary'] = cbDef.summary;
            if (cbDef.description)
                cbOperation['description'] = cbDef.description;
            if (cbDef.body) {
                cbOperation['requestBody'] = buildRequestBody(
                    cbDef.body,
                    registry
                );
            }
            const cbResponses: Record<string, unknown> = {};
            if (cbDef.response) {
                cbResponses['200'] = {
                    description: 'OK',
                    content: {
                        'application/json': {
                            schema: convertSchema(cbDef.response, registry)
                        }
                    }
                };
            } else {
                cbResponses['200'] = { description: 'OK' };
            }
            cbOperation['responses'] = cbResponses;
            callbacksOut[cbName] = {
                [expression]: { [cbMethod]: cbOperation }
            };
        }
        operation['callbacks'] = callbacksOut;
    }

    return operation;
}

function authRoles(meta: EndpointMetadata): readonly string[] | null {
    return meta.authRoles;
}

/**
 * Generate an OpenAPI 3.1 specification document from registered endpoints.
 */
export function generateOpenApiSpec(options: OpenApiOptions): OpenApiDocument {
    const srv = options.server;
    const registrations =
        options.registrations ?? srv?.getRegistrations() ?? [];
    const authConfig =
        options.authConfig !== undefined
            ? options.authConfig
            : (srv?.getAuthenticationConfig() ?? undefined);
    const webhooks =
        options.webhooks ??
        (srv && srv.getWebhooks().length > 0 ? srv.getWebhooks() : undefined);
    const { info, servers, securitySchemes, tags } = options;

    // Security schemes — from explicit config or auto-mapped
    const resolvedSchemes: Record<string, OpenApiSecurityScheme> =
        securitySchemes ?? mapSecuritySchemes(authConfig);
    const securitySchemeNames = Object.keys(resolvedSchemes);

    // Pre-pass: collect all named schemas from every endpoint into a registry.
    // Walking happens before path generation so that $ref pointers are emitted
    // correctly at every call site within buildOperation.
    const registry = new SchemaRegistry();
    const visited = new Set<SchemaBuilder<any, any, any>>();
    for (const reg of registrations) {
        const meta = reg.endpoint;
        if (meta.bodySchema) walkSchemas(meta.bodySchema, registry, visited);
        if (meta.responseSchema)
            walkSchemas(meta.responseSchema, registry, visited);
        if (meta.responsesSchemas) {
            for (const schema of Object.values(meta.responsesSchemas)) {
                if (schema) walkSchemas(schema, registry, visited);
            }
        }
        if (meta.querySchema) {
            const queryProps =
                (meta.querySchema.introspect() as any).properties ?? {};
            for (const propSchema of Object.values<
                SchemaBuilder<any, any, any>
            >(queryProps)) {
                walkSchemas(propSchema, registry, visited);
            }
        }
        if (meta.headerSchema) {
            const headerProps =
                (meta.headerSchema.introspect() as any).properties ?? {};
            for (const propSchema of Object.values<
                SchemaBuilder<any, any, any>
            >(headerProps)) {
                walkSchemas(propSchema, registry, visited);
            }
        }
        if (meta.callbacks) {
            for (const cbDef of Object.values(meta.callbacks)) {
                if (cbDef.body) walkSchemas(cbDef.body, registry, visited);
                if (cbDef.response)
                    walkSchemas(cbDef.response, registry, visited);
            }
        }
    }
    if (webhooks) {
        for (const webhook of webhooks) {
            if (webhook.body) walkSchemas(webhook.body, registry, visited);
            if (webhook.response)
                walkSchemas(webhook.response, registry, visited);
        }
    }

    const resolveComponentSchemaName = (
        rootSchema: SchemaBuilder<any, any, any>
    ) => {
        // The root schema must be inlined exactly once — for the component
        // definition itself. Any subsequent encounter (e.g. through a lazy
        // self-reference) should emit a $ref instead of inlining again,
        // which would otherwise cause infinite recursion.
        let inlinedRoot = false;
        return (
            candidate: SchemaBuilder<any, any, any>
        ): string | undefined => {
            if (candidate === rootSchema && !inlinedRoot) {
                inlinedRoot = true;
                return undefined; // inline the root definition once
            }
            return registry.getName(candidate) ?? undefined;
        };
    };

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
            securitySchemeNames,
            registry
        );
    }

    // Build top-level tags array: explicit entries first, then auto-collected
    // tag names from endpoints that are not already covered.
    const explicitNames = new Set((tags ?? []).map(t => t.name));
    const autoNames: string[] = [];
    for (const reg of registrations) {
        for (const tag of reg.endpoint.tags) {
            if (!explicitNames.has(tag) && !autoNames.includes(tag)) {
                autoNames.push(tag);
            }
        }
    }
    autoNames.sort();
    const mergedTags: OpenApiTag[] = [
        ...(tags ?? []),
        ...autoNames.map(name => ({ name }))
    ];

    // Assemble document
    const doc: OpenApiDocument = {
        openapi: '3.1.0',
        info: { ...info }
    };

    if (servers && servers.length > 0) {
        doc['servers'] = servers.map(s => ({ ...s }));
    }

    if (mergedTags.length > 0) {
        doc['tags'] = mergedTags.map(t => ({ ...t }));
    }

    doc['paths'] = paths;

    // Webhooks — out-of-band async requests documented alongside paths
    if (webhooks && webhooks.length > 0) {
        const webhooksObj: Record<string, unknown> = {};
        for (const webhook of webhooks) {
            const whMethod = (webhook.method ?? 'post').toLowerCase();
            const whOperation: Record<string, unknown> = {};
            if (webhook.summary) whOperation['summary'] = webhook.summary;
            if (webhook.description)
                whOperation['description'] = webhook.description;
            if (webhook.tags && webhook.tags.length > 0)
                whOperation['tags'] = [...webhook.tags];
            if (webhook.body) {
                whOperation['requestBody'] = buildRequestBody(
                    webhook.body,
                    registry
                );
            }
            const whResponses: Record<string, unknown> = {};
            if (webhook.response) {
                whResponses['200'] = {
                    description: 'OK',
                    content: {
                        'application/json': {
                            schema: convertSchema(webhook.response, registry)
                        }
                    }
                };
            } else {
                whResponses['200'] = { description: 'OK' };
            }
            whOperation['responses'] = whResponses;
            webhooksObj[webhook.name] = { [whMethod]: whOperation };
        }
        doc['webhooks'] = webhooksObj;
    }

    // Components — security schemes + named component schemas
    const componentSchemas: Record<string, unknown> = {};
    for (const [name, schema] of registry.entries()) {
        // Inline the root schema to avoid a self-referential $ref, but resolve
        // nested named schemas through the shared registry so component
        // definitions can still deduplicate via $ref.
        componentSchemas[name] = convertSchema(
            schema,
            resolveComponentSchemaName(schema)
        );
    }
    const hasSchemas = Object.keys(componentSchemas).length > 0;

    if (securitySchemeNames.length > 0 || hasSchemas) {
        const components: Record<string, unknown> = {};
        if (securitySchemeNames.length > 0)
            components['securitySchemes'] = { ...resolvedSchemes };
        if (hasSchemas) components['schemas'] = componentSchemas;
        doc['components'] = components;
    }

    return doc;
}
