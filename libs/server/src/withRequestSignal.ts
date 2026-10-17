import type { IncomingMessage, ServerResponse } from 'node:http';

/** HTTP lifecycle fields required to cancel request-owned work. */
export interface RequestSignalContext {
    readonly request: Pick<IncomingMessage, 'aborted' | 'once' | 'off'>;
    readonly response: Pick<
        ServerResponse,
        'destroyed' | 'writableFinished' | 'once' | 'off'
    >;
}

/** Application-owned deadline and optional cancellation for request work. */
export interface RequestSignalOptions {
    /** Positive integer deadline in milliseconds, at most 2,147,483,647. */
    timeoutMs: number;
    /** Additional cancellation, such as application shutdown. */
    signal?: AbortSignal;
}

/**
 * Run cooperative work with cancellation on disconnect, deadline or caller abort.
 *
 * The visitor must observe its signal; this helper does not forcibly interrupt
 * arbitrary promises. A normal response finish does not cancel the work. The
 * deadline timer and all listeners are removed when work settles, including on
 * failure. Already-aborted inputs reject without invoking the visitor.
 *
 * @example
 * ```ts
 * await withRequestSignal(context, signal => loadReport(signal), {
 *     timeoutMs: 30_000
 * });
 * ```
 */
export async function withRequestSignal<T>(
    context: RequestSignalContext,
    work: (signal: AbortSignal) => T | PromiseLike<T>,
    options: RequestSignalOptions
): Promise<T> {
    if (
        !Number.isSafeInteger(options.timeoutMs) ||
        options.timeoutMs <= 0 ||
        options.timeoutMs > 2_147_483_647
    ) {
        throw new RangeError(
            'timeoutMs must be a positive timer-safe integer.'
        );
    }
    const controller = new AbortController();
    const disconnected = () =>
        controller.abort(
            new DOMException('Request disconnected.', 'AbortError')
        );
    const closed = () => {
        if (!context.response.writableFinished) disconnected();
    };
    const cancelled = () => controller.abort(options.signal!.reason);
    const timer = setTimeout(
        () =>
            controller.abort(
                new DOMException('Request deadline exceeded.', 'TimeoutError')
            ),
        options.timeoutMs
    );
    context.request.once('aborted', disconnected);
    context.response.once('close', closed);
    options.signal?.addEventListener('abort', cancelled, { once: true });
    try {
        if (context.request.aborted || context.response.destroyed) closed();
        if (context.request.aborted) disconnected();
        if (options.signal?.aborted) cancelled();
        controller.signal.throwIfAborted();
        return await work(controller.signal);
    } finally {
        clearTimeout(timer);
        context.request.off('aborted', disconnected);
        context.response.off('close', closed);
        options.signal?.removeEventListener('abort', cancelled);
    }
}
