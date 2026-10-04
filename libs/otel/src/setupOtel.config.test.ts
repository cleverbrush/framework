import { expect, it, vi } from 'vitest';
import { setupOtel } from './setupOtel.js';

const { configured } = vi.hoisted(() => ({ configured: vi.fn() }));
vi.mock('@opentelemetry/sdk-node', () => ({
    NodeSDK: class {
        constructor(options: unknown) {
            configured(options);
        }
        start() {}
        async shutdown() {}
    }
}));

it('explicitly disables every signal without allowing SDK environment defaults', async () => {
    const handle = setupOtel({
        serviceName: 'disabled-signals',
        disableTraces: true,
        disableLogs: true,
        disableMetrics: true
    });
    expect(configured).toHaveBeenCalledWith(
        expect.objectContaining({
            spanProcessors: [],
            logRecordProcessors: [],
            metricReaders: []
        })
    );
    await handle.shutdown();
});
