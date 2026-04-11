import type { FunctionSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { ProblemDetails, ValidationErrorItem } from './ProblemDetails.js';
import { createValidationProblemDetails } from './ProblemDetails.js';
import type { RequestContext } from './RequestContext.js';
import type { ParameterSource, RouteMatch } from './types.js';

export type ResolveResult =
    | { valid: true; args: unknown[] }
    | { valid: false; problemDetails: ProblemDetails };

export async function resolveParameters(
    funcSchema: FunctionSchemaBuilder<any, any, any, any, any, any>,
    sources: readonly ParameterSource[],
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
    const args: unknown[] = [];
    const errors: ValidationErrorItem[] = [];

    for (let i = 0; i < paramSchemas.length; i++) {
        const schema = paramSchemas[i];
        const source = sources[i];

        if (!source) {
            // No source specified — skip (will be undefined)
            args.push(undefined);
            continue;
        }

        switch (source.from) {
            case 'path': {
                // Already validated by parseString during routing
                args.push(routeMatch.parsedPath);
                break;
            }

            case 'context': {
                // Inject RequestContext directly, no validation needed
                args.push(context);
                break;
            }

            case 'body': {
                const result = await schema.validateAsync(parsedBody, {
                    doNotStopOnFirstError: true
                });
                if (result.valid) {
                    args.push(result.object);
                } else {
                    for (const err of result.errors ?? []) {
                        errors.push({
                            pointer: '/body',
                            detail: err.message
                        });
                    }
                    args.push(undefined);
                }
                break;
            }

            case 'query': {
                const raw = context.queryParams[source.name!];
                const coerced = coerceValue(raw, schema);
                const result = await schema.validateAsync(coerced, {
                    doNotStopOnFirstError: true
                });
                if (result.valid) {
                    args.push(result.object);
                } else {
                    for (const err of result.errors ?? []) {
                        errors.push({
                            pointer: `/query/${source.name}`,
                            detail: err.message
                        });
                    }
                    args.push(undefined);
                }
                break;
            }

            case 'header': {
                const raw = context.headers[source.name!];
                const result = await schema.validateAsync(raw, {
                    doNotStopOnFirstError: true
                });
                if (result.valid) {
                    args.push(result.object);
                } else {
                    for (const err of result.errors ?? []) {
                        errors.push({
                            pointer: `/headers/${source.name}`,
                            detail: err.message
                        });
                    }
                    args.push(undefined);
                }
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

    return { valid: true, args };
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
