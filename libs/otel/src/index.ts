// ---------------------------------------------------------------------------
// SDK bootstrap
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DI
// ---------------------------------------------------------------------------
export {
    type ConfigureOtelOptions,
    configureOtel,
    IMeter,
    ITracer
} from './di.js';
// ---------------------------------------------------------------------------
// Log integration
// ---------------------------------------------------------------------------
export { traceEnricher } from './enrichers/trace.js';

// ---------------------------------------------------------------------------
// ORM / Knex instrumentation
// ---------------------------------------------------------------------------
export {
    type InstrumentKnexOptions,
    instrumentKnex
} from './knex/instrumentKnex.js';
// ---------------------------------------------------------------------------
// Server tracing middleware
// ---------------------------------------------------------------------------
export {
    OTEL_SPAN_ITEM_KEY,
    type TracingMiddlewareOptions,
    tracingMiddleware
} from './middleware/tracing.js';
export {
    type OtelConfig,
    type OtelHandle,
    setupOtel
} from './setupOtel.js';
export {
    type OtelLogSinkOptions,
    otelLogSink
} from './sinks/OtelLogSink.js';
// ---------------------------------------------------------------------------
// Custom span helpers
// ---------------------------------------------------------------------------
export {
    type SpanHandle,
    type WithSpanOptions,
    withSpan
} from './span.js';
