import { type Meter, metrics, type Tracer, trace } from '@opentelemetry/api';

/**
 * DI service key for an OpenTelemetry `Tracer`.
 *
 * Resolved from the global `TracerProvider` set by
 * {@link import('./setupOtel.js').setupOtel}. Components that prefer
 * dependency injection over the global API can inject this token.
 */
export const ITracer = Symbol.for('ITracer') as unknown as {
    __brand: 'ITracer';
};

/**
 * DI service key for an OpenTelemetry `Meter`.
 *
 * Resolved from the global `MeterProvider` set by
 * {@link import('./setupOtel.js').setupOtel}.
 */
export const IMeter = Symbol.for('IMeter') as unknown as {
    __brand: 'IMeter';
};

/**
 * Configuration for {@link configureOtel}.
 */
export interface ConfigureOtelOptions {
    /**
     * Tracer name.
     *
     * @default '@cleverbrush/otel'
     */
    tracerName?: string;

    /**
     * Meter name.
     *
     * @default '@cleverbrush/otel'
     */
    meterName?: string;

    /** Optional version string used for both tracer and meter. */
    version?: string;
}

/**
 * Registers OTel `Tracer` and `Meter` instances in the DI container.
 *
 * Both are resolved lazily from the global providers configured by
 * {@link import('./setupOtel.js').setupOtel}, so this helper can be
 * called at DI setup time even before the SDK has fully started.
 *
 * @param services - the `ServiceCollection` to register with
 * @param options - tracer / meter naming overrides
 *
 * @example
 * ```ts
 * import { configureOtel, ITracer } from '@cleverbrush/otel';
 *
 * configureOtel(services, { tracerName: 'todo-backend' });
 *
 * const tracer = provider.get(ITracer);
 * tracer.startActiveSpan('custom-work', span => {
 *     // …
 *     span.end();
 * });
 * ```
 */
export function configureOtel(
    services: any,
    options?: ConfigureOtelOptions
): void {
    const tracerName = options?.tracerName ?? '@cleverbrush/otel';
    const meterName = options?.meterName ?? '@cleverbrush/otel';
    const version = options?.version;

    if (typeof services?.addSingleton === 'function') {
        services.addSingleton(
            ITracer,
            (): Tracer => trace.getTracer(tracerName, version)
        );
        services.addSingleton(
            IMeter,
            (): Meter => metrics.getMeter(meterName, version)
        );
    }
}
