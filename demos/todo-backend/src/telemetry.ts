/**
 * OpenTelemetry SDK bootstrap for the ToDo backend demo.
 *
 * **Must be loaded before any other module** (especially before
 * `import knex` and `createLogger`) so auto-instrumentations can patch
 * dependencies at require time. Load via `node --import ./dist/telemetry.js`
 * or as the very first import in `index.ts`.
 *
 * Sends traces, logs, and metrics over OTLP/HTTP to the endpoint set by
 * `OTEL_EXPORTER_OTLP_ENDPOINT` (defaults to the HyperDX/ClickStack
 * collector at `http://hyperdx:4318` in `docker-compose.yml`).
 */
import { setupOtel } from '@cleverbrush/otel';
import {
    outboundHttpInstrumentations,
    runtimeMetrics
} from '@cleverbrush/otel/instrumentations';

const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://hyperdx:4318';

export const otel = setupOtel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'todo-backend',
    serviceVersion: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    otlpEndpoint: endpoint,
    instrumentations: [
        ...outboundHttpInstrumentations(),
        ...runtimeMetrics()
    ]
});
