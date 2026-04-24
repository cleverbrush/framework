import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
    BatchSpanProcessor,
    type SpanProcessor
} from '@opentelemetry/sdk-trace-node';
import {
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions/incubating';

/**
 * Configuration for {@link setupOtel}.
 */
export interface OtelConfig {
    /**
     * Logical name of the service emitting telemetry.
     * Becomes the `service.name` resource attribute and is the primary
     * identifier in observability backends.
     */
    serviceName: string;

    /** Optional service version → `service.version` resource attribute. */
    serviceVersion?: string;

    /**
     * Deployment environment name (e.g. `production`, `staging`, `dev`).
     * Becomes the `deployment.environment.name` resource attribute.
     */
    environment?: string;

    /**
     * Additional resource attributes merged onto the default resource.
     * Useful for `host.name`, `cloud.region`, custom team tags, etc.
     */
    resourceAttributes?: Record<string, string | number | boolean>;

    /**
     * Base OTLP/HTTP endpoint for traces, logs, and metrics.
     *
     * If not provided, falls back to the standard OTel environment
     * variables (`OTEL_EXPORTER_OTLP_ENDPOINT`,
     * `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, etc.).
     *
     * Per-signal endpoints below take precedence over this value.
     *
     * @default process.env.OTEL_EXPORTER_OTLP_ENDPOINT
     */
    otlpEndpoint?: string;

    /** Override the OTLP traces endpoint (`/v1/traces` is appended). */
    tracesEndpoint?: string;

    /** Override the OTLP logs endpoint (`/v1/logs` is appended). */
    logsEndpoint?: string;

    /** Override the OTLP metrics endpoint (`/v1/metrics` is appended). */
    metricsEndpoint?: string;

    /**
     * Optional headers to send with every OTLP export request
     * (e.g. authentication tokens for hosted backends).
     */
    headers?: Record<string, string>;

    /** Disable trace export. @default false */
    disableTraces?: boolean;

    /** Disable log export. @default false */
    disableLogs?: boolean;

    /** Disable metrics export. @default false */
    disableMetrics?: boolean;

    /**
     * Metric export interval in milliseconds.
     * @default 60000
     */
    metricsExportIntervalMs?: number;

    /**
     * Auto-instrumentations to register at SDK startup.
     *
     * Use the helpers from `@cleverbrush/otel/instrumentations`
     * (e.g. `outboundHttpInstrumentations()`, `runtimeMetrics()`).
     */
    instrumentations?: unknown[];

    /**
     * Enable verbose OTel SDK diagnostics (sets the global `diag` logger).
     *
     * @default false
     */
    debug?: boolean;
}

/**
 * Handle returned by {@link setupOtel} for lifecycle management.
 */
export interface OtelHandle {
    /**
     * Gracefully flushes and shuts down all exporters.
     *
     * Idempotent — safe to call multiple times.
     * Should be invoked from your process's shutdown hook
     * (`SIGTERM`/`SIGINT`) before `process.exit`.
     */
    shutdown(): Promise<void>;

    /**
     * The underlying `NodeSDK` instance.
     *
     * Exposed for advanced use cases (custom span processors, runtime
     * configuration). Most consumers do not need to touch this directly.
     */
    sdk: NodeSDK;
}

function buildExporterUrl(
    base: string | undefined,
    perSignal: string | undefined,
    suffix: string
): string | undefined {
    if (perSignal) return perSignal;
    if (!base) return undefined;
    return `${base.replace(/\/$/, '')}${suffix}`;
}

/**
 * Initializes the OpenTelemetry Node SDK with sensible defaults for
 * the Cleverbrush framework.
 *
 * This must be called **before** any instrumented modules are imported
 * — typically via `node --import ./telemetry.js entrypoint.js`.
 *
 * Configures W3C Trace Context propagation, OTLP/HTTP exporters for
 * traces, logs, and metrics, and the resource attributes that identify
 * the service in observability backends.
 *
 * @param config - service identity and exporter configuration
 * @returns a handle exposing `shutdown()` and the underlying SDK
 *
 * @example
 * ```ts
 * // telemetry.ts — loaded via `node --import ./telemetry.js`
 * import { setupOtel } from '@cleverbrush/otel';
 * import { outboundHttpInstrumentations, runtimeMetrics } from '@cleverbrush/otel/instrumentations';
 *
 * export const otel = setupOtel({
 *     serviceName: 'todo-backend',
 *     serviceVersion: '1.0.0',
 *     environment: process.env.NODE_ENV,
 *     otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
 *     instrumentations: [...outboundHttpInstrumentations(), runtimeMetrics()],
 * });
 *
 * process.on('SIGTERM', () => otel.shutdown());
 * ```
 */
export function setupOtel(config: OtelConfig): OtelHandle {
    if (!config.serviceName) {
        throw new Error('setupOtel: `serviceName` is required');
    }

    if (config.debug) {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    }

    const attrs: Record<string, string | number | boolean> = {
        [ATTR_SERVICE_NAME]: config.serviceName,
        ...(config.serviceVersion
            ? { [ATTR_SERVICE_VERSION]: config.serviceVersion }
            : {}),
        ...(config.environment
            ? { [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment }
            : {}),
        ...(config.resourceAttributes ?? {})
    };
    const resource = resourceFromAttributes(attrs);

    const headers = config.headers;

    let spanProcessors: SpanProcessor[] | undefined;
    if (!config.disableTraces) {
        const url = buildExporterUrl(
            config.otlpEndpoint,
            config.tracesEndpoint,
            '/v1/traces'
        );
        const traceExporter = new OTLPTraceExporter({
            ...(url ? { url } : {}),
            ...(headers ? { headers } : {})
        });
        spanProcessors = [new BatchSpanProcessor(traceExporter)];
    }

    let logRecordProcessors: BatchLogRecordProcessor[] | undefined;
    if (!config.disableLogs) {
        const url = buildExporterUrl(
            config.otlpEndpoint,
            config.logsEndpoint,
            '/v1/logs'
        );
        const logExporter = new OTLPLogExporter({
            ...(url ? { url } : {}),
            ...(headers ? { headers } : {})
        });
        logRecordProcessors = [new BatchLogRecordProcessor(logExporter)];
    }

    let metricReader: PeriodicExportingMetricReader | undefined;
    if (!config.disableMetrics) {
        const url = buildExporterUrl(
            config.otlpEndpoint,
            config.metricsEndpoint,
            '/v1/metrics'
        );
        const metricExporter = new OTLPMetricExporter({
            ...(url ? { url } : {}),
            ...(headers ? { headers } : {})
        });
        metricReader = new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: config.metricsExportIntervalMs ?? 60_000
        });
    }

    const sdk = new NodeSDK({
        resource,
        ...(spanProcessors ? { spanProcessors } : {}),
        ...(logRecordProcessors ? { logRecordProcessors } : {}),
        ...(metricReader ? { metricReader } : {}),
        instrumentations: (config.instrumentations ?? []) as any
    });

    sdk.start();

    let shuttingDown: Promise<void> | null = null;

    return {
        sdk,
        shutdown(): Promise<void> {
            if (!shuttingDown) {
                shuttingDown = sdk.shutdown().catch(err => {
                    // Best-effort shutdown — log but don't throw
                    console.error('[otel] shutdown error:', err);
                });
            }
            return shuttingDown;
        }
    };
}
