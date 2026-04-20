// ---------------------------------------------------------------------------
// Core types & models
// ---------------------------------------------------------------------------

export {
    extractCorrelationId,
    generateCorrelationId
} from './correlation.js';
export { createLogger, type LoggerConfig } from './createLogger.js';
// ---------------------------------------------------------------------------
// DI integration
// ---------------------------------------------------------------------------
export { configureLogging, ILogger } from './di.js';
export type { Enricher } from './Enricher.js';
export { applicationEnricher } from './enrichers/application.js';
export { callerEnricher } from './enrichers/caller.js';
export { correlationIdEnricher } from './enrichers/correlationId.js';
export { environmentEnricher } from './enrichers/environment.js';
// ---------------------------------------------------------------------------
// Enrichers
// ---------------------------------------------------------------------------
export { hostnameEnricher } from './enrichers/hostname.js';
export { processIdEnricher } from './enrichers/processId.js';
export { traceEnricher } from './enrichers/trace.js';
export type { LogFilter } from './Filter.js';
// ---------------------------------------------------------------------------
// CLEF formatting
// ---------------------------------------------------------------------------
export {
    formatClef,
    formatClefBatch
} from './formatters/ClefFormatter.js';
// ---------------------------------------------------------------------------
// Context & Correlation
// ---------------------------------------------------------------------------
export { LogContext, type LogContextStore } from './LogContext.js';
export type { LogEvent } from './LogEvent.js';
// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
export { Logger, type TypedTemplate } from './Logger.js';
export {
    LogLevel,
    type LogLevelName,
    levelToShortString,
    levelToString,
    parseLogLevel
} from './LogLevel.js';
// ---------------------------------------------------------------------------
// Message template
// ---------------------------------------------------------------------------
export {
    captureProperties,
    computeEventId,
    createLogEvent,
    parseTemplate,
    renderTemplate
} from './MessageTemplate.js';
export {
    type CorrelationIdMiddlewareOptions,
    correlationIdMiddleware
} from './middleware/correlationId.js';
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export {
    type RequestLoggingOptions,
    requestLoggingMiddleware
} from './middleware/requestLogging.js';
// ---------------------------------------------------------------------------
// Self-diagnostics
// ---------------------------------------------------------------------------
export { SelfLog } from './SelfLog.js';
export type { LogSink } from './Sink.js';
// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export {
    type SamplingRates,
    samplingFilter
} from './samplingFilter.js';
// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------
export {
    type SerializationOptions,
    safeSerialize
} from './serialization.js';
// ---------------------------------------------------------------------------
// Sinks
// ---------------------------------------------------------------------------
export {
    BatchingSink,
    type BatchingSinkOptions
} from './sinks/BatchingSink.js';
export {
    type ConsoleSinkOptions,
    consoleSink
} from './sinks/ConsoleSink.js';
export {
    type CreateSinkOptions,
    createSink
} from './sinks/createSink.js';
export {
    type FileSinkOptions,
    fileSink,
    type RotationOptions
} from './sinks/FileSink.js';
export { type SeqSinkOptions, seqSink } from './sinks/SeqSink.js';

// ---------------------------------------------------------------------------
// Convenience: useLogging
// ---------------------------------------------------------------------------
export { useLogging } from './useLogging.js';
