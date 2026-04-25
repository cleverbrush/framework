import type { LogEvent } from '../LogEvent.js';
import { SelfLog } from '../SelfLog.js';
import type { LogSink } from '../Sink.js';

/**
 * Configuration for the batching sink wrapper.
 */
export interface BatchingSinkOptions {
    /** Flush after this many events. @default 100 */
    batchSize?: number;
    /** Flush after this many milliseconds of inactivity. @default 2000 */
    flushInterval?: number;
    /** Maximum buffered events before dropping. @default 50000 */
    maxQueueSize?: number;
    /** Maximum retry attempts for failed flushes. @default 5 */
    maxRetries?: number;
    /** Initial retry delay in ms (exponential backoff). @default 1000 */
    retryDelay?: number;
    /** Consecutive failures before circuit breaker opens. @default 3 */
    circuitBreakerThreshold?: number;
    /** The emit function that writes a batch to the target. */
    emit: (batch: LogEvent[]) => Promise<void>;
}

/**
 * Production-grade batching wrapper for log sinks.
 *
 * Provides buffering, retry with exponential backoff, and circuit
 * breaking. All network/file sinks use this internally.
 *
 * @example
 * ```ts
 * const sink = new BatchingSink({
 *     batchSize: 100,
 *     flushInterval: 2000,
 *     emit: async (batch) => {
 *         await fetch('/logs', { method: 'POST', body: JSON.stringify(batch) });
 *     },
 * });
 * ```
 */
export class BatchingSink implements LogSink {
    readonly #emitFn: (batch: LogEvent[]) => Promise<void>;
    readonly #batchSize: number;
    readonly #flushInterval: number;
    readonly #maxQueueSize: number;
    readonly #maxRetries: number;
    readonly #retryDelay: number;
    readonly #circuitBreakerThreshold: number;
    readonly #buffer: LogEvent[] = [];
    #timer: ReturnType<typeof setTimeout> | undefined;
    #consecutiveFailures = 0;
    #circuitOpen = false;
    #circuitResetTimer: ReturnType<typeof setTimeout> | undefined;
    #disposed = false;
    /**
     * Promise for any in-progress background flush.  Multiple callers
     * join this promise rather than spawning concurrent writes.
     */
    #activeFlush: Promise<void> | undefined;

    constructor(options: BatchingSinkOptions) {
        this.#emitFn = options.emit;
        this.#batchSize = options.batchSize ?? 100;
        this.#flushInterval = options.flushInterval ?? 2_000;
        this.#maxQueueSize = options.maxQueueSize ?? 50_000;
        this.#maxRetries = options.maxRetries ?? 5;
        this.#retryDelay = options.retryDelay ?? 1_000;
        this.#circuitBreakerThreshold = options.circuitBreakerThreshold ?? 3;
    }

    /**
     * Buffers events and triggers a background flush when the batch
     * size threshold is reached.  Returns immediately — callers are
     * never blocked by network I/O.
     */
    async emit(events: LogEvent[]): Promise<void> {
        if (this.#disposed) return;

        for (const event of events) {
            if (this.#buffer.length >= this.#maxQueueSize) {
                this.#buffer.shift(); // drop oldest
            }
            this.#buffer.push(event);
        }

        if (this.#buffer.length >= this.#batchSize) {
            // Fire-and-forget: the actual write runs in the background.
            // The caller's async chain is not held up by ClickHouse I/O.
            this.flush().catch(err => {
                SelfLog.write('BatchingSink background flush failed', err);
            });
        } else {
            this.#resetTimer();
        }
    }

    /**
     * Flushes buffered events to the underlying sink.
     *
     * If a flush is already in progress, returns that same promise so
     * that multiple concurrent callers share a single write rather than
     * spawning concurrent network requests.
     */
    async flush(): Promise<void> {
        this.#clearTimer();

        // Join an already-running flush instead of starting another one.
        if (this.#activeFlush) {
            return this.#activeFlush;
        }

        if (this.#buffer.length === 0) return;

        this.#activeFlush = this.#doFlush().finally(() => {
            this.#activeFlush = undefined;
            // If more events arrived while we were writing, kick off
            // another background flush so nothing sits in the buffer.
            if (this.#buffer.length > 0 && !this.#disposed) {
                this.flush().catch(err => {
                    SelfLog.write(
                        'BatchingSink post-flush background flush failed',
                        err
                    );
                });
            }
        });

        return this.#activeFlush;
    }

    async [Symbol.asyncDispose](): Promise<void> {
        this.#disposed = true;
        this.#clearTimer();
        if (this.#circuitResetTimer) {
            clearTimeout(this.#circuitResetTimer);
        }
        // Wait for any in-progress background flush to finish before
        // draining the remaining buffer.
        if (this.#activeFlush) {
            await this.#activeFlush.catch(() => {});
        }
        // Flush remaining events (best-effort)
        if (this.#buffer.length > 0 && !this.#circuitOpen) {
            try {
                await this.#emitFn(this.#buffer.splice(0, this.#buffer.length));
            } catch (err) {
                SelfLog.write('BatchingSink dispose flush failed', err);
            }
        }
    }

    async #doFlush(): Promise<void> {
        while (this.#buffer.length > 0) {
            if (this.#circuitOpen) {
                SelfLog.write(
                    'BatchingSink circuit breaker open — deferring flush'
                );
                return;
            }

            const batch = this.#buffer.splice(0, this.#batchSize);

            let lastError: unknown;
            let emitted = false;
            for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
                try {
                    await this.#emitFn(batch);
                    this.#consecutiveFailures = 0;
                    emitted = true;
                    break;
                } catch (err) {
                    lastError = err;
                    if (attempt < this.#maxRetries) {
                        const delay = this.#retryDelay * 2 ** attempt;
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }

            if (!emitted) {
                this.#consecutiveFailures++;
                SelfLog.write(
                    `BatchingSink flush failed after ${this.#maxRetries + 1} attempts`,
                    lastError
                );

                if (
                    this.#consecutiveFailures >= this.#circuitBreakerThreshold
                ) {
                    this.#circuitOpen = true;
                    SelfLog.write(
                        `BatchingSink circuit breaker opened — backing off 30s`
                    );
                    this.#circuitResetTimer = setTimeout(() => {
                        this.#circuitOpen = false;
                        this.#consecutiveFailures = 0;
                        SelfLog.write('BatchingSink circuit breaker closed');
                        if (this.#buffer.length > 0) {
                            this.flush().catch(err => {
                                SelfLog.write(
                                    'BatchingSink post-circuit flush failed',
                                    err
                                );
                            });
                        }
                    }, 30_000);
                    if (this.#circuitResetTimer.unref) {
                        this.#circuitResetTimer.unref();
                    }
                }
                return;
            }
        }
    }

    #resetTimer(): void {
        this.#clearTimer();
        this.#timer = setTimeout(() => {
            this.flush().catch(err => {
                SelfLog.write('BatchingSink timer flush failed', err);
            });
        }, this.#flushInterval);
        if (this.#timer.unref) {
            this.#timer.unref();
        }
    }

    #clearTimer(): void {
        if (this.#timer) {
            clearTimeout(this.#timer);
            this.#timer = undefined;
        }
    }
}
