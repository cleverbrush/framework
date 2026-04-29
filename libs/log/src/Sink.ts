import type { LogEvent } from './LogEvent.js';

/**
 * A sink that receives batches of log events for output.
 *
 * Sinks must implement `AsyncDisposable` for graceful shutdown.
 * The `flush()` method is optional and forces immediate delivery
 * of any buffered events.
 */
export interface LogSink extends AsyncDisposable {
    /** Write a batch of events to the output target. */
    emit(events: LogEvent[]): Promise<void>;
    /** Force immediate delivery of buffered events. */
    flush?(): Promise<void>;
}
