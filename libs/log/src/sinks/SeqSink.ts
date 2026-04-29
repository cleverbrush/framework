import { formatClefBatch } from '../formatters/ClefFormatter.js';
import type { LogEvent } from '../LogEvent.js';
import { type LogLevel, parseLogLevel } from '../LogLevel.js';
import type { LogSink } from '../Sink.js';
import { BatchingSink } from './BatchingSink.js';

/**
 * Seq sink configuration.
 */
export interface SeqSinkOptions {
    /** Base URL of the Seq server (e.g. `http://localhost:5341`). */
    serverUrl: string;
    /** Optional API key sent as `X-Seq-ApiKey` header. */
    apiKey?: string;
    /** Events per batch. @default 100 */
    batchSize?: number;
    /** Max milliseconds between flushes. @default 2000 */
    flushInterval?: number;
    /** Maximum retry attempts. @default 5 */
    maxRetries?: number;
    /** Initial retry delay in ms. @default 1000 */
    retryDelay?: number;
}

/**
 * Creates a sink that sends log events to a Seq server via HTTP in CLEF format.
 *
 * Events are batched and sent to `POST {serverUrl}/ingest/clef`. The sink
 * respects Seq's `MinimumLevelAccepted` response to dynamically reduce
 * bandwidth when the server applies level filtering.
 *
 * @param options - Seq connection and batching configuration
 * @returns a `LogSink` that batches and sends events to Seq
 *
 * @example
 * ```ts
 * const sink = seqSink({
 *     serverUrl: 'https://seq.mycompany.com',
 *     apiKey: process.env.SEQ_API_KEY,
 * });
 * ```
 */
export function seqSink(options: SeqSinkOptions): LogSink {
    const url = options.serverUrl.replace(/\/$/, '');
    const ingestUrl = `${url}/ingest/clef`;
    let dynamicMinLevel: LogLevel | undefined;

    const batcher = new BatchingSink({
        batchSize: options.batchSize ?? 100,
        flushInterval: options.flushInterval ?? 2_000,
        maxRetries: options.maxRetries ?? 5,
        retryDelay: options.retryDelay ?? 1_000,
        emit: async (batch: LogEvent[]) => {
            // Apply dynamic level filtering
            const filtered =
                dynamicMinLevel !== undefined
                    ? batch.filter(e => e.level >= dynamicMinLevel!)
                    : batch;

            if (filtered.length === 0) return;

            const payload = formatClefBatch(filtered);
            const headers: Record<string, string> = {
                'Content-Type': 'application/vnd.serilog.clef'
            };
            if (options.apiKey) {
                headers['X-Seq-ApiKey'] = options.apiKey;
            }

            const response = await fetch(ingestUrl, {
                method: 'POST',
                headers,
                body: payload
            });

            if (!response.ok) {
                throw new Error(
                    `Seq ingestion failed: ${response.status} ${response.statusText}`
                );
            }

            // Check for MinimumLevelAccepted header
            const minLevelHeader = response.headers.get(
                'X-Seq-MinimumLevelAccepted'
            );
            if (minLevelHeader) {
                try {
                    dynamicMinLevel = parseLogLevel(
                        minLevelHeader.toLowerCase()
                    );
                } catch {
                    // ignore invalid level
                }
            } else {
                dynamicMinLevel = undefined;
            }
        }
    });

    return {
        async emit(events: LogEvent[]): Promise<void> {
            await batcher.emit(events);
        },

        async flush(): Promise<void> {
            await batcher.flush();
        },

        async [Symbol.asyncDispose](): Promise<void> {
            await batcher[Symbol.asyncDispose]();
        }
    };
}
