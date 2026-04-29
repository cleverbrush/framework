import { describe, expect, it } from 'vitest';
import { configureOtel, IMeter, ITracer } from './di.js';

describe('configureOtel', () => {
    it('registers tracer + meter as singletons resolved from globals', () => {
        const calls: Array<[unknown, unknown]> = [];
        const services = {
            addSingleton(token: unknown, factory: unknown) {
                calls.push([token, factory]);
            }
        };
        configureOtel(services, {
            tracerName: 'test-svc',
            meterName: 'test-svc'
        });
        expect(calls).toHaveLength(2);
        expect(calls[0]![0]).toBe(ITracer);
        expect(calls[1]![0]).toBe(IMeter);

        const tracer = (calls[0]![1] as Function)();
        const meter = (calls[1]![1] as Function)();
        expect(typeof (tracer as any).startSpan).toBe('function');
        expect(typeof (meter as any).createCounter).toBe('function');
    });

    it('is a no-op when services has no addSingleton method', () => {
        expect(() => configureOtel({}, {})).not.toThrow();
    });
});
