/**
 * Opt-in auto-instrumentations.
 *
 * These helpers wrap upstream OpenTelemetry instrumentation packages
 * for outbound HTTP and Node.js runtime metrics. They are kept in a
 * separate entry point so projects that don't want them avoid the
 * extra dependencies and the `require-in-the-middle` patching at
 * startup.
 *
 * Pass the returned arrays to `setupOtel({ instrumentations: [...] })`.
 *
 * @module
 */
import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);

/**
 * Returns instrumentations for outbound HTTP traffic — Node `http`/`https`
 * (covers `node-fetch` etc.) and `undici` (covers global `fetch`).
 *
 * Both packages are declared as optional peer dependencies of
 * `@cleverbrush/otel`. Install them in the host project to use:
 *
 * ```sh
 * npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-undici
 * ```
 *
 * @returns an array of instrumentation instances ready to pass to {@link import('./setupOtel.js').setupOtel}
 *
 * @example
 * ```ts
 * import { setupOtel } from '@cleverbrush/otel';
 * import { outboundHttpInstrumentations } from '@cleverbrush/otel/instrumentations';
 *
 * setupOtel({
 *     serviceName: 'todo-backend',
 *     instrumentations: outboundHttpInstrumentations(),
 * });
 * ```
 */
export function outboundHttpInstrumentations(): unknown[] {
    const result: unknown[] = [];
    try {
        const mod = requireFromHere(
            '@opentelemetry/instrumentation-http'
        ) as any;
        const Cls = mod.HttpInstrumentation ?? mod.default;
        if (Cls) result.push(new Cls());
    } catch {
        // optional peer dependency not installed
    }
    try {
        const mod = requireFromHere(
            '@opentelemetry/instrumentation-undici'
        ) as any;
        const Cls = mod.UndiciInstrumentation ?? mod.default;
        if (Cls) result.push(new Cls());
    } catch {
        // optional peer dependency not installed
    }
    return result;
}

/**
 * Returns the Node.js runtime metrics instrumentation, which emits
 * basic process gauges (event loop lag, GC, heap size).
 *
 * Requires `@opentelemetry/instrumentation-runtime-node` to be
 * installed in the host project.
 *
 * @returns an array containing one instrumentation instance, or empty if the package is not installed
 *
 * @example
 * ```ts
 * import { setupOtel } from '@cleverbrush/otel';
 * import { runtimeMetrics } from '@cleverbrush/otel/instrumentations';
 *
 * setupOtel({
 *     serviceName: 'todo-backend',
 *     instrumentations: runtimeMetrics(),
 * });
 * ```
 */
export function runtimeMetrics(): unknown[] {
    try {
        const mod = requireFromHere(
            '@opentelemetry/instrumentation-runtime-node'
        ) as any;
        const Cls = mod.RuntimeNodeInstrumentation ?? mod.default;
        if (Cls) return [new Cls()];
    } catch {
        // optional peer dependency not installed
    }
    return [];
}
