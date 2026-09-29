import {
    type ContentResult,
    type FileResult,
    JsonResult,
    NoContentResult,
    type RawResult,
    type RedirectResult,
    StatusCodeResult,
    type StreamResult
} from './ActionResult.js';
import type { EndpointBuilder, Handler, ResponsesOf } from './Endpoint.js';

/** Explicit, contract-checkable responses supported by error policies. */
export type ErrorResponse =
    | JsonResult<number, unknown>
    | NoContentResult
    | StatusCodeResult<number>;

/** The declared JSON and bodyless responses of an HTTP endpoint. */
export type ErrorResponsesOf<E> = {
    [K in keyof ResponsesOf<E> & number]: ResponsesOf<E>[K] extends null
        ? K extends 204
            ? NoContentResult
            : StatusCodeResult<K>
        : JsonResult<K, ResponsesOf<E>[K]>;
}[keyof ResponsesOf<E> & number];

type ErrorConstructor<E extends Error> = abstract new (...args: any[]) => E;
const responseTypes: unique symbol = Symbol('errorResponseTypes');
// Result classes are structural (NoContentResult only has executeAsync).
// Keep a discriminated description as well as R so a declared 204 cannot
// accidentally admit every other ActionResult through structural assignability.
type ResponseSignature<R> = R extends
    | FileResult
    | StreamResult
    | ContentResult
    | RedirectResult
    | RawResult
    ? { kind: 'unsupported' }
    : R extends JsonResult<infer S, infer B>
      ? { kind: 'json'; status: S; body: B }
      : R extends StatusCodeResult<infer S>
        ? { kind: 'empty'; status: S }
        : R extends NoContentResult
          ? { kind: 'empty'; status: 204 }
          : never;
type Rule = {
    matches: (error: unknown) => boolean;
    translate: (error: any) => ErrorResponse | Promise<ErrorResponse>;
};

/**
 * Immutable, ordered exception translators. Create one with {@link errorMap}.
 *
 * Policies retain their exact response union until attached to an endpoint.
 * They do not change that endpoint's responses, catch infrastructure errors,
 * or automatically expose exception messages.
 *
 * @typeParam R - Union of all responses produced by this policy.
 */
export class ErrorMap<
    R extends ErrorResponse = never,
    Signature = ResponseSignature<R>
> {
    /** @internal Retains status/body discrimination across exported policies. */
    declare readonly [responseTypes]: Signature;
    readonly #rules: readonly Rule[];

    /** @internal Use {@link errorMap}. */
    constructor(rules: readonly Rule[] = []) {
        this.#rules = [...rules];
    }

    /**
     * Return a new policy with a translator appended. First matching rule wins.
     * Put subclass rules before base-class rules. Translators may be async;
     * translator failures propagate without re-entering this policy.
     *
     * @param errorType - Error constructor matched using `instanceof`.
     * @param translate - Application-owned conversion to an explicit response.
     */
    on<E extends Error, T extends ErrorResponse>(
        errorType: ErrorConstructor<E>,
        translate: (error: E) => T | Promise<T>
    ): ErrorMap<R | T, Signature | ResponseSignature<T>> {
        return new ErrorMap([
            ...this.#rules,
            {
                matches: error => error instanceof errorType,
                translate
            }
        ]);
    }

    /**
     * Translate a recognized exception or rethrow the original value unchanged.
     * Usually invoked by {@link withErrors}, not directly by an application.
     */
    async translate(error: unknown): Promise<R> {
        const rule = this.#rules.find(candidate => candidate.matches(error));
        if (!rule) throw error;
        const result = await rule.translate(error);
        if (
            !(result instanceof JsonResult) &&
            !(result instanceof NoContentResult) &&
            !(result instanceof StatusCodeResult)
        ) {
            throw new TypeError(
                'Error translators must return an explicit JSON or bodyless status result'
            );
        }
        return result as R;
    }
}

/**
 * Create an empty, immutable error policy. Unknown exceptions are rethrown.
 *
 * @example
 * ```ts
 * const errors = errorMap().on(MissingItemError, () =>
 *     ActionResult.notFound({ message: 'Item not found' })
 * );
 * ```
 */
export function errorMap(): ErrorMap<never> {
    return new ErrorMap();
}

/**
 * Wrap only a handler's invocation in an endpoint-checked error policy.
 *
 * Requires explicit `.responses()` declarations. Every possible translated
 * status/body must fit the endpoint; file/raw/stream escape hatches are not
 * accepted. Request and injected-service types are unchanged. Authentication,
 * validation, middleware, DI and response serialization remain outside this
 * wrapper and use the server's normal error handling.
 *
 * @param endpoint - Configured HTTP endpoint, the sole source of handler types.
 * @param policy - Reusable policy compatible with the endpoint's responses.
 * @param handler - Named or inline handler to wrap.
 * @returns A handler suitable for `handle`, `mapHandlers`, or implementation scopes.
 */
export function withErrors<
    E extends EndpointBuilder<any, any, any, any, any, any, any, any, any, any>
>(
    endpoint: E,
    policy: keyof ResponsesOf<NoInfer<E>> extends never
        ? never
        : ErrorMap<ErrorResponsesOf<NoInfer<E>>>,
    handler: Handler<NoInfer<E>>
): Handler<E> {
    const responses = endpoint.introspect().responsesSchemas;
    if (!responses || Object.keys(responses).length === 0) {
        throw new TypeError(
            'Error policies require explicit endpoint responses'
        );
    }
    return (async (...args: unknown[]) => {
        try {
            return await (handler as (...args: unknown[]) => unknown)(...args);
        } catch (error) {
            return policy.translate(error);
        }
    }) as Handler<E>;
}
