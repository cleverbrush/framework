import type { Enricher } from './Enricher.js';
import type { LogFilter } from './Filter.js';
import type { LogEvent } from './LogEvent.js';
import { type LogLevel, type LogLevelName, parseLogLevel } from './LogLevel.js';
import { SelfLog } from './SelfLog.js';
import type { LogSink } from './Sink.js';

/**
 * Configuration for the logger pipeline.
 */
export interface PipelineConfig {
    minimumLevel: LogLevel;
    levelOverrides?: Record<string, LogLevelName>;
    sinks: LogSink[];
    enrichers?: Enricher[];
    filters?: LogFilter[];
    maxQueueSize?: number;
    dropPolicy?: 'dropOldest' | 'dropNewest' | 'block';
}

/**
 * Internal pipeline that processes log events asynchronously.
 *
 * Events are pushed into a queue and processed via microtask. The
 * pipeline applies enrichers, filters, and level overrides before
 * fanning out to all configured sinks.
 */
export class LoggerPipeline {
    readonly #sinks: LogSink[];
    readonly #enrichers: Enricher[];
    readonly #filters: LogFilter[];
    readonly #levelOverrides: Map<string, LogLevel>;
    #minimumLevel: LogLevel;
    readonly #maxQueueSize: number;
    readonly #dropPolicy: 'dropOldest' | 'dropNewest' | 'block';
    readonly #queue: LogEvent[] = [];
    #flushing = false;
    #disposed = false;

    constructor(config: PipelineConfig) {
        this.#sinks = config.sinks;
        this.#enrichers = config.enrichers ?? [];
        this.#filters = config.filters ?? [];
        this.#minimumLevel = config.minimumLevel;
        this.#maxQueueSize = config.maxQueueSize ?? 10_000;
        this.#dropPolicy = config.dropPolicy ?? 'dropOldest';

        this.#levelOverrides = new Map();
        if (config.levelOverrides) {
            for (const [ns, level] of Object.entries(config.levelOverrides)) {
                this.#levelOverrides.set(ns, parseLogLevel(level));
            }
        }
    }

    get minimumLevel(): LogLevel {
        return this.#minimumLevel;
    }

    set minimumLevel(level: LogLevel) {
        this.#minimumLevel = level;
    }

    /**
     * Checks if the given level would pass the minimum level check
     * for the given source context.
     */
    isEnabled(level: LogLevel, sourceContext?: string): boolean {
        if (sourceContext && this.#levelOverrides.size > 0) {
            const overrideLevel = this.#findOverride(sourceContext);
            if (overrideLevel !== undefined) {
                return level >= overrideLevel;
            }
        }
        return level >= this.#minimumLevel;
    }

    /**
     * Enqueues a log event for processing.
     * Fire-and-forget — callers never await.
     */
    push(event: LogEvent): void {
        if (this.#disposed) return;

        if (this.#queue.length >= this.#maxQueueSize) {
            switch (this.#dropPolicy) {
                case 'dropOldest':
                    this.#queue.shift();
                    break;
                case 'dropNewest':
                    return;
                case 'block':
                    // In block mode, we still accept — real blocking
                    // would require async log calls which we avoid.
                    break;
            }
        }

        this.#queue.push(event);
        this.#scheduleFlush();
    }

    /**
     * Forces all queued events through the pipeline and into sinks.
     */
    async flush(): Promise<void> {
        await this.#processQueue();
        const flushPromises: Promise<void>[] = [];
        for (const sink of this.#sinks) {
            if (sink.flush) {
                flushPromises.push(
                    sink.flush().catch(err => {
                        SelfLog.write('Sink flush failed', err);
                    })
                );
            }
        }
        await Promise.all(flushPromises);
    }

    /**
     * Flushes remaining events and disposes all sinks.
     */
    async dispose(): Promise<void> {
        if (this.#disposed) return;
        this.#disposed = true;

        await this.flush();

        const disposePromises: Promise<void>[] = [];
        for (const sink of this.#sinks) {
            disposePromises.push(
                Promise.resolve(sink[Symbol.asyncDispose]()).catch(
                    (err: unknown) => {
                        SelfLog.write(
                            'Sink dispose failed',
                            err instanceof Error ? err : undefined
                        );
                    }
                )
            );
        }
        await Promise.all(disposePromises);
    }

    #scheduleFlush(): void {
        if (this.#flushing) return;
        this.#flushing = true;
        queueMicrotask(() => {
            this.#processQueue()
                .catch(err => {
                    SelfLog.write('Pipeline processing error', err);
                })
                .finally(() => {
                    this.#flushing = false;
                    if (this.#queue.length > 0) {
                        this.#scheduleFlush();
                    }
                });
        });
    }

    async #processQueue(): Promise<void> {
        if (this.#queue.length === 0) return;

        const batch = this.#queue.splice(0, this.#queue.length);
        const processed: LogEvent[] = [];

        for (let event of batch) {
            // Apply enrichers
            for (const enricher of this.#enrichers) {
                try {
                    event = enricher(event);
                } catch (err) {
                    SelfLog.write('Enricher failed', err);
                }
            }

            // Check level overrides
            const sourceContext = event.properties.SourceContext as
                | string
                | undefined;
            if (sourceContext && this.#levelOverrides.size > 0) {
                const overrideLevel = this.#findOverride(sourceContext);
                if (
                    overrideLevel !== undefined &&
                    event.level < overrideLevel
                ) {
                    continue;
                }
            }

            // Apply filters
            let pass = true;
            for (const filter of this.#filters) {
                try {
                    if (!filter(event)) {
                        pass = false;
                        break;
                    }
                } catch (err) {
                    SelfLog.write('Filter failed', err);
                }
            }
            if (!pass) continue;

            processed.push(event);
        }

        if (processed.length === 0) return;

        // Fan-out to sinks
        const emitPromises: Promise<void>[] = [];
        for (const sink of this.#sinks) {
            emitPromises.push(
                sink.emit(processed).catch(err => {
                    SelfLog.write('Sink emit failed', err);
                })
            );
        }
        await Promise.all(emitPromises);
    }

    #findOverride(sourceContext: string): LogLevel | undefined {
        // Exact match first
        const exact = this.#levelOverrides.get(sourceContext);
        if (exact !== undefined) return exact;

        // Prefix match — longest wins
        let bestLen = 0;
        let bestLevel: LogLevel | undefined;
        for (const [prefix, level] of this.#levelOverrides) {
            if (sourceContext.startsWith(prefix) && prefix.length > bestLen) {
                bestLen = prefix.length;
                bestLevel = level;
            }
        }
        return bestLevel;
    }
}
