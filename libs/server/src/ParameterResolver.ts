import type { FunctionSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { ProblemDetails, ValidationErrorItem } from './ProblemDetails.js';
import { createValidationProblemDetails } from './ProblemDetails.js';
import type { RequestContext } from './RequestContext.js';
import type { RouteMatch } from './types.js';

const WELL_KNOWN_KEYS = new Set([
    'params',
    'body',
    'query',
    'headers',
    'context'
]);

export type ResolveResult =
    | { valid: true; args: unknown[] }
    | { valid: false; problemDetails: ProblemDetails };

/**
 * Returns true if the given func schema has a single parameter whose
 * properties include `body` — used to decide whether to parse the
 * request body before invoking the resolver.
 */
export function needsBody(
    funcSchema: FunctionSchemaBuilder<any, any, any, any, any, any>
): boolean {
    const params = funcSchema.introspect().parameters as SchemaBuilder<
        any,
        any,
        any,
        any,
        any
    >[];
    if (params.length !== 1) return false;
    const intro = params[0].introspect() as any;
    if (intro.type !== 'object' || !intro.properties) return false;
    return 'body' in intro.properties;
}

/**
 * Resolve a single context object for a controller method.
 *
 * The func schema's first (and only) parameter must be an ObjectSchemaBuilder
 * whose property keys are a subset of the well-known keys:
 * `params`, `body`, `query`, `headers`, `context`.
 *
 * Each key is resolved from the corresponding HTTP source.
 */
export async function resolveContextObject(
    funcSchema: FunctionSchemaBuilder<any, any, any, any, any, any>,
    routeMatch: RouteMatch,
    context: RequestContext,
    parsedBody: unknown
): Promise<ResolveResult> {
    const paramSchemas = funcSchema.introspect().parameters as SchemaBuilder<
        any,
        any,
        any,
        any,
        any
    >[];

    // No parameters → no args
    if (paramSchemas.length === 0) {
        return { valid: true, args: [] };
    }

    const paramSchema = paramSchemas[0];
    const intro = paramSchema.introspect() as any;

    if (intro.type !== 'object' || !intro.properties) {
        throw new Error(
            'Controller method parameter must be an object schema with well-known keys (params, body, query, headers, context).'
        );
    }

    const properties = intro.properties as Record<
        string,
        SchemaBuilder<any, any, any, any, any>
    >;
    const keys = Object.keys(properties);

    // Validate all keys are well-known
    for (const key of keys) {
        if (!WELL_KNOWN_KEYS.has(key)) {
            throw new Error(
                `Unknown key "${key}" in controller method parameter schema. ` +
                    `Valid keys are: ${[...WELL_KNOWN_KEYS].join(', ')}.`
            );
        }
    }

    const errors: ValidationErrorItem[] = [];
    const contextObj: Record<string, unknown> = {};

    for (const key of keys) {
        const subSchema = properties[key];

        switch (key) {
            case 'params': {
                // Already validated by parseString during routing
                contextObj.params = routeMatch.parsedPath;
                break;
            }

            case 'context': {
                contextObj.context = context;
                break;
            }

            case 'body': {
                const result = await subSchema.validateAsync(parsedBody, {
                    doNotStopOnFirstError: true
                });
                if (result.valid) {
                    contextObj.body = result.object;
                } else {
                    for (const err of result.errors ?? []) {
                        errors.push({
                            pointer: '/body',
                            detail: err.message
                        });
                    }
                }
                break;
            }

            case 'query': {
                // Build query object from sub-schema properties
                const queryIntro = subSchema.introspect() as any;
                if (queryIntro.type !== 'object' || !queryIntro.properties) {
                    throw new Error(
                        'The "query" key must be an object schema whose properties map to query parameter names.'
                    );
                }
                const queryProps = queryIntro.properties as Record<
                    string,
                    SchemaBuilder<any, any, any, any, any>
                >;
                const queryObj: Record<string, unknown> = {};
                for (const [qName, qSchema] of Object.entries(queryProps)) {
                    const raw = context.queryParams[qName];
                    const coerced = coerceValue(raw, qSchema);
                    const result = await qSchema.validateAsync(coerced, {
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
                break;
            }

            case 'headers': {
                // Build headers object from sub-schema properties
                const headersIntro = subSchema.introspect() as any;
                if (
                    headersIntro.type !== 'object' ||
                    !headersIntro.properties
                ) {
                    throw new Error(
                        'The "headers" key must be an object schema whose properties map to header names.'
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
                break;
            }
        }
    }

    if (errors.length > 0) {
        return {
            valid: false,
            problemDetails: createValidationProblemDetails(errors)
        };
    }

    return { valid: true, args: [contextObj] };
}

function coerceValue(
    raw: string | undefined,
    schema: SchemaBuilder<any, any, any, any, any>
): unknown {
    if (raw === undefined) return undefined;

    const type = schema.introspect().type;
    if (type === 'number') {
        const n = Number(raw);
        return Number.isNaN(n) ? raw : n;
    }
    if (type === 'boolean') {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        return raw;
    }
    return raw;
}
