import { AsyncLocalStorage } from 'node:async_hooks';
import type { ServerResponse } from 'node:http';

/** Final HTTP response outcome; a disconnect alone is not cancellation. */
export type ResponseOutcome =
    | 'success'
    | 'rejected'
    | 'failure'
    | 'interrupted'
    | 'timeout'
    | 'cancelled';

/** One terminal observation, after serialization and response completion. */
export interface ResponseCompletion {
    /** Absent if no response headers were sent. */
    readonly statusCode?: number;
    readonly elapsedMs: number;
    readonly outcome: ResponseOutcome;
    /** Original error for trusted observers; sanitize before exporting it. */
    readonly error?: unknown;
}

export type ResponseCompletionListener = (
    completion: ResponseCompletion
) => void | Promise<void>;

const responses = new WeakMap<ServerResponse, ResponseLifecycle>();

/** @internal Record source failures before stream.pipeline closes the response. */
export function recordResponseFailure(
    response: ServerResponse,
    error: unknown
): void {
    responses.get(response)?.recordError(error);
}

/** @internal Owns response listeners independently of middleware return. */
export class ResponseLifecycle {
    readonly #response: ServerResponse;
    readonly #start = performance.now();
    readonly #listeners = new Set<ResponseCompletionListener>();
    #completion?: ResponseCompletion;
    #cause?: 'timeout' | 'cancelled';
    #error: unknown;
    #hasError = false;

    constructor(response: ServerResponse) {
        this.#response = response;
        responses.set(response, this);
        response.once?.('finish', this.#finished);
        response.once?.('close', this.#closed);
        response.on?.('error', this.#failed);
    }

    subscribe(listener: ResponseCompletionListener): () => void {
        const run = AsyncLocalStorage.snapshot();
        const bound: ResponseCompletionListener = completion =>
            run(() => listener(completion));
        if (this.#completion) this.#notify(bound, this.#completion);
        else this.#listeners.add(bound);
        return () => this.#listeners.delete(bound);
    }

    mark(outcome: 'timeout' | 'cancelled'): void {
        if (!this.#completion) this.#cause = outcome;
    }

    recordError(error: unknown): void {
        if (this.#completion) return;
        this.#error = error;
        this.#hasError = true;
    }

    readonly #finished = () => this.#complete(true);
    readonly #closed = () =>
        this.#complete(this.#response.writableFinished === true);
    readonly #failed = (error: Error & { code?: string }) => {
        // These transport failures establish an interruption, not an explicit
        // application cancellation or a known handler/serializer failure.
        if (
            error?.code === 'ECONNRESET' ||
            error?.code === 'EPIPE' ||
            error?.code === 'ERR_STREAM_PREMATURE_CLOSE'
        )
            return;
        this.recordError(error);
    };

    #complete(finished: boolean): void {
        if (this.#completion) return;
        const response = this.#response;
        const statusCode = response.headersSent
            ? response.statusCode
            : undefined;
        let outcome: ResponseOutcome;
        if (finished && statusCode !== undefined && statusCode < 400) {
            outcome = 'success';
        } else if (this.#cause) {
            outcome = this.#cause;
        } else if (!finished) {
            outcome = this.#hasError ? 'failure' : 'interrupted';
        } else if (statusCode !== undefined && statusCode >= 500) {
            outcome = 'failure';
        } else if (statusCode !== undefined && statusCode >= 400) {
            outcome = 'rejected';
        } else {
            outcome = this.#hasError ? 'failure' : 'success';
        }
        const completion: ResponseCompletion = Object.freeze({
            ...(statusCode === undefined ? {} : { statusCode }),
            elapsedMs: performance.now() - this.#start,
            outcome,
            ...(this.#hasError ? { error: this.#error } : {})
        });
        this.#completion = completion;
        responses.delete(response);
        response.off?.('finish', this.#finished);
        response.off?.('close', this.#closed);
        response.off?.('error', this.#failed);
        for (const listener of this.#listeners)
            this.#notify(listener, completion);
        this.#listeners.clear();
        this.#error = undefined;
    }

    #notify(
        listener: ResponseCompletionListener,
        completion: ResponseCompletion
    ): void {
        try {
            const result = listener(completion);
            if (result) Promise.resolve(result).catch(() => {});
        } catch {
            // Observability callbacks cannot affect application responses.
        }
    }
}
