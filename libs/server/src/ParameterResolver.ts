import type { SchemaBuilder } from '@cleverbrush/schema';
import type { EndpointMetadata } from './Endpoint.js';
import type { ProblemDetails, ValidationErrorItem } from './ProblemDetails.js';
import { createValidationProblemDetails } from './ProblemDetails.js';
import type { RequestContext } from './RequestContext.js';

export type ResolveResult =
    | { valid: true; args: unknown[] }
    | { valid: false; problemDetails: ProblemDetails };

/**
 * Returns true if the endpoint declares a body schema.
 */
export function needsBody(meta: EndpointMetadata): boolean {
    return meta.bodySchema != null;
}

/**
 * Resolve the action context object for an endpoint-based handler.
 *
 * Builds `{ context, params?, body?, query?, headers? }` based on
 * what the endpoint declares.
 */
export async function resolveArgs(
    meta: EndpointMetadata,
    parsedPath: Record<string, any> | null,
    context: RequestContext,
    parsedBody: unknown
): Promise<ResolveResult> {
    const errors: ValidationErrorItem[] = [];
    const contextObj: Record<string, unknown> = {};

    // Always provide context
    contextObj.context = context;

    // Principal — from authentication middleware (if endpoint requires auth)
    if (meta.authRoles !== null && context.principal !== undefined) {
        contextObj.principal = context.principal;
    }

    // Params — from parsed path (already validated by ParseStringSchemaBuilder)
    if (parsedPath && Object.keys(parsedPath).length > 0) {
        contextObj.params = parsedPath;
    }

    // Body — validate against endpoint's body schema
    if (meta.bodySchema) {
        const result = await meta.bodySchema.validateAsync(parsedBody, {
            doNotStopOnFirstError: true
        });
        if (result.valid) {
            contextObj.body = result.object;
        } else {
            const getInvalidProperties =
                typeof (result as any).getInvalidProperties === 'function'
                    ? ((result as any)
                          .getInvalidProperties as () => ReadonlyArray<{
                          errors: ReadonlyArray<string>;
                          descriptor: { toJsonPointer: () => string };
                      }>)
                    : null;

            let errorsAdded = false;
            if (getInvalidProperties) {
                for (const prop of getInvalidProperties()) {
                    const pointer = prop.descriptor.toJsonPointer();
                    for (const msg of prop.errors) {
                        errors.push({
                            pointer: `/body${pointer}`,
                            detail: msg
                        });
                        errorsAdded = true;
                    }
                }
            }
            // Fallback: required-check failures surface in result.errors
            // but not in the property descriptor map (e.g. null body)
            if (!errorsAdded) {
                for (const err of result.errors ?? []) {
                    errors.push({ pointer: '/body', detail: err.message });
                }
            }
        }
    }

    // Query — validate against endpoint's query schema
    if (meta.querySchema) {
        const queryIntro = meta.querySchema.introspect() as any;
        if (queryIntro.type !== 'object' || !queryIntro.properties) {
            throw new Error(
                'Endpoint query schema must be an object schema whose properties map to query parameter names.'
            );
        }
        const queryProps = queryIntro.properties as Record<
            string,
            SchemaBuilder<any, any, any, any, any>
        >;
        const queryObj: Record<string, unknown> = {};
        for (const [qName, qSchema] of Object.entries(queryProps)) {
            const raw = context.queryParams[qName];
            const result = await qSchema.validateAsync(raw, {
                doNotStopOnFirstError: true
            });
            if (result.valid) {
                queryObj[qName] = result.object;
            } else {
                for (const err of result.errors ?? []) {
                    errors.push({
                        pointer: `/query/${qName}`,
                        detail: err.message
                    });
                }
            }
        }
        contextObj.query = queryObj;
    }

    // Headers — validate against endpoint's header schema
    if (meta.headerSchema) {
        const headersIntro = meta.headerSchema.introspect() as any;
        if (headersIntro.type !== 'object' || !headersIntro.properties) {
            throw new Error(
                'Endpoint headers schema must be an object schema whose properties map to header names.'
            );
        }
        const headerProps = headersIntro.properties as Record<
            string,
            SchemaBuilder<any, any, any, any, any>
        >;
        const headersObj: Record<string, unknown> = {};
        for (const [hName, hSchema] of Object.entries(headerProps)) {
            const raw = context.headers[hName.toLowerCase()];
            const result = await hSchema.validateAsync(raw, {
                doNotStopOnFirstError: true
            });
            if (result.valid) {
                headersObj[hName] = result.object;
            } else {
                for (const err of result.errors ?? []) {
                    errors.push({
                        pointer: `/headers/${hName}`,
                        detail: err.message
                    });
                }
            }
        }
        contextObj.headers = headersObj;
    }

    if (errors.length > 0) {
        return {
            valid: false,
            problemDetails: createValidationProblemDetails(errors)
        };
    }

    // Services — resolve declared dependencies from the DI container
    if (meta.serviceSchemas) {
        if (!context.services) {
            throw new Error(
                'Endpoint declares .inject() dependencies but no service provider is available. ' +
                    'Register services via createServer().services() before handling this endpoint.'
            );
        }
        const servicesObj: Record<string, unknown> = {};
        for (const [name, schema] of Object.entries(meta.serviceSchemas)) {
            servicesObj[name] = context.services.get(schema);
        }
        return { valid: true, args: [contextObj, servicesObj] };
    }

    return { valid: true, args: [contextObj] };
}
