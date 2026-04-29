import { describe, expect, it, vi } from 'vitest';
import { configureLogging, ILogger } from './di.js';
import type { Logger } from './Logger.js';

describe('configureLogging', () => {
    it('registers the logger as a singleton on services with addSingleton', () => {
        const addSingleton = vi.fn();
        const services = { addSingleton };
        const logger = { tag: 'logger' } as unknown as Logger;

        configureLogging(services, logger);

        expect(addSingleton).toHaveBeenCalledTimes(1);
        const [key, factory] = addSingleton.mock.calls[0];
        expect(key).toBe(ILogger);
        expect(typeof factory).toBe('function');
        expect((factory as () => Logger)()).toBe(logger);
    });

    it('is a no-op when services has no addSingleton method', () => {
        const services = {};
        const logger = {} as Logger;

        expect(() => configureLogging(services as any, logger)).not.toThrow();
    });

    it('exposes ILogger as a stable Symbol.for token', () => {
        expect(typeof ILogger).toBe('symbol');
        expect(ILogger).toBe(Symbol.for('ILogger'));
    });
});
