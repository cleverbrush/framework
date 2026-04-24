import { afterEach, describe, expect, it } from 'vitest';
import { setupOtel } from './setupOtel.js';

describe('setupOtel', () => {
    let handle: { shutdown(): Promise<void> } | undefined;

    afterEach(async () => {
        if (handle) {
            await handle.shutdown();
            handle = undefined;
        }
    });

    it('throws when serviceName is missing', () => {
        expect(() => setupOtel({} as any)).toThrowError(/serviceName/);
    });

    it('starts the SDK with a service name', () => {
        handle = setupOtel({
            serviceName: 'test-service',
            disableTraces: true,
            disableLogs: true,
            disableMetrics: true
        });
        expect(handle.sdk).toBeDefined();
    });

    it('shutdown is idempotent', async () => {
        handle = setupOtel({
            serviceName: 'test-service',
            disableTraces: true,
            disableLogs: true,
            disableMetrics: true
        });
        const a = handle.shutdown();
        const b = handle.shutdown();
        await Promise.all([a, b]);
        expect(a).toBe(b);
    });

    it('accepts environment + resourceAttributes + endpoints without throwing', () => {
        handle = setupOtel({
            serviceName: 'test-service',
            serviceVersion: '1.0.0',
            environment: 'test',
            resourceAttributes: {
                'team.name': 'platform',
                'host.name': 'unit-test'
            },
            otlpEndpoint: 'http://localhost:4318',
            tracesEndpoint: 'http://localhost:4318/v1/traces',
            headers: { 'x-token': 'abc' },
            metricsExportIntervalMs: 5_000,
            disableTraces: true,
            disableLogs: true,
            disableMetrics: true
        });
        expect(handle.sdk).toBeDefined();
    });
});
