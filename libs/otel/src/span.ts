import {
    type Span,
    type SpanAttributes,
    SpanKind,
    SpanStatusCode,
    trace
} from '@opentelemetry/api';

const DEFAULT_TRACER_NAME = '@cleverbrush/otel';

/**
 * Options shared by both calling conventions of {@link withSpan}.
 */
export interface WithSpanOptions {
    /**
     * OTel span kind.
     * @default SpanKind.INTERNAL
     */
    kind?: SpanKind;

    /** Initial attributes to set on the span. */
    attributes?: SpanAttributes;

    /**
     * Tracer name used when resolving the OTel tracer.
     * @default '@cleverbrush/otel'
     */
    tracerName?: string;

    /** Tracer version. */
    tracerVersion?: string;
}

/**
 * Handle returned by the disposable form of {@link withSpan}.
 *
 * Implements `AsyncDisposable` so it can be used with `await using`:
 * ```ts
 * await using handle = withSpan('my.operation');
 * handle.span.setAttribute('key', value);
 * try {
 *     // ... do work ...
 * } catch (err) {
 *     handle.fail(err);
 *     throw err;
 * }
 * // span.end() is called automatically when the block exits
 * ```
 *
 * **Note:** The span created by the disposable form is NOT activated as
 * the current context span (OTel's public API requires a callback scope
 * for context propagation). DB / outbound-HTTP child spans created
 * inside the `await using` block will be siblings of this span (both
 * children of the enclosing HTTP span) rather than nested under it.
 * Use the callback form of `withSpan` when proper nesting is required.
 */
export interface SpanHandle {
    /** The underlying OTel span. Use it to set attributes or add events. */
    readonly span: Span;

    /**
     * Records an exception and marks the span as errored.
     *
     * Idempotent — safe to call in a `catch` block even if the same
     * error might be reported elsewhere.
     */
    fail(err: unknown): void;

    /** Ends the span. Called automatically when exiting an `await using` block. */
    [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Wraps `fn` in a custom OTel span and returns whatever `fn` returns.
 *
 * The span is activated as the current context span via
 * `startActiveSpan`, so any child spans created inside `fn` (e.g. DB
 * queries from `instrumentKnex`) will be correctly nested under it.
 * Error handling is automatic — exceptions are recorded and the span is
 * marked `ERROR` before re-throwing.
 *
 * @example
 * ```ts
 * const result = await withSpan('order.process', async span => {
 *     span.setAttribute('order.id', orderId);
 *     return processOrder(orderId); // DB spans nest under this span
 * });
 * ```
 */
export function withSpan<T>(
    name: string,
    fn: (span: Span) => T,
    options?: WithSpanOptions
): T;

/**
 * Creates a custom OTel span and returns a {@link SpanHandle} that
 * implements `AsyncDisposable`.
 *
 * Use with `await using` for an ergonomic resource-management syntax.
 * Note that the span is **not** the active context span (see
 * {@link SpanHandle} for details). Call {@link SpanHandle.fail} in a
 * `catch` block to record errors before re-throwing.
 *
 * @example
 * ```ts
 * await using handle = withSpan('todo.create', { attributes: { 'todo.user_id': userId } });
 * try {
 *     const todo = await db.todos.insert({...});
 *     handle.span.setAttribute('todo.id', todo.id);
 * } catch (err) {
 *     handle.fail(err);
 *     throw err;
 * }
 * ```
 */
export function withSpan(name: string, options?: WithSpanOptions): SpanHandle;

export function withSpan<T>(
    name: string,
    fnOrOptions?: ((span: Span) => T) | WithSpanOptions,
    maybeOptions?: WithSpanOptions
): T | SpanHandle {
    const isCallback = typeof fnOrOptions === 'function';
    const fn = isCallback ? (fnOrOptions as (span: Span) => T) : undefined;
    const opts: WithSpanOptions | undefined = isCallback
        ? maybeOptions
        : (fnOrOptions as WithSpanOptions | undefined);

    const tracerName = opts?.tracerName ?? DEFAULT_TRACER_NAME;
    const tracerVersion = opts?.tracerVersion;
    const kind = opts?.kind ?? SpanKind.INTERNAL;
    const attributes = opts?.attributes;

    const tracer = trace.getTracer(tracerName, tracerVersion);

    if (fn !== undefined) {
        // Callback form — startActiveSpan propagates the span into context so
        // child spans (e.g. Knex DB spans) nest under it automatically.
        return tracer.startActiveSpan(name, { kind, attributes }, span => {
            let result: T;
            try {
                result = fn(span);
            } catch (err) {
                span.recordException(err as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                span.end();
                throw err;
            }
            if (result instanceof Promise) {
                return result.then(
                    v => {
                        span.end();
                        return v;
                    },
                    err => {
                        span.recordException(err);
                        span.setStatus({ code: SpanStatusCode.ERROR });
                        span.end();
                        throw err;
                    }
                ) as T;
            }
            span.end();
            return result;
        });
    }

    // Disposable form — span is not activated in context (no callback scope
    // available in the OTel public API for context.with).
    const span = tracer.startSpan(name, { kind, attributes });
    let failed = false;

    const handle: SpanHandle = {
        span,
        fail(err: unknown): void {
            if (failed) return;
            failed = true;
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
        },
        [Symbol.asyncDispose](): Promise<void> {
            span.end();
            return Promise.resolve();
        }
    };

    return handle;
}
