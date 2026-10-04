import type { ActionContext, Handler, ResponsesOf } from './Endpoint.js';
import type { ErrorMap, ErrorResponsesOf } from './ErrorMap.js';
import type { Middleware } from './types.js';

/** Identity components are serialized without ambiguous string concatenation. */
export type IdempotencyScope = string | readonly (string | number)[];

/** Per-endpoint, process-local replay limits. */
export interface EndpointIdempotencyLimits {
    ttl?: number;
    maxEntries?: number;
    maxResponseBytes?: number;
}

/** Server-only callbacks, inferred from the endpoint's validated request and DI. */
export type EndpointOptions<E> = {
    middlewares?: Middleware[];
    /** Runs on every request, including replays; return the request used by scope and handler. */
    prepare?: (
        ...args: Parameters<Handler<E>>
    ) => ActionContext<E> | Promise<ActionContext<E>>;
    idempotency?: EndpointIdempotencyLimits & {
        scope: (
            ...args: Parameters<Handler<E>>
        ) => IdempotencyScope | Promise<IdempotencyScope>;
    };
    errors?: keyof ResponsesOf<E> extends never
        ? never
        : ErrorMap<ErrorResponsesOf<E>>;
};

/** @internal Erased callback types retained through registration/composition. */
export interface RuntimeEndpointOptions {
    /** @internal Handler invocation already owns its error policy. */
    handlerErrorsMapped?: boolean;
    prepare?: (...args: any[]) => any;
    idempotency?: EndpointIdempotencyLimits & {
        scope: (...args: any[]) => IdempotencyScope | Promise<IdempotencyScope>;
    };
    errors?: ErrorMap<any, any>;
}
