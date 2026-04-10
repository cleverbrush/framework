import { func, number, object, string } from '@cleverbrush/schema';
import { describe, expect, test } from 'vitest';

import { ServiceCollection } from './ServiceCollection.js';

// ---------------------------------------------------------------------------
// Service schemas used across tests
// ---------------------------------------------------------------------------

const IConfig = object({
    port: number(),
    host: string()
});

const ILogger = object({
    info: func()
});

// ---------------------------------------------------------------------------
// ServiceProvider
// ---------------------------------------------------------------------------

describe('ServiceProvider', () => {
    // ── Singleton ────────────────────────────────────

    test('singleton returns the same instance across calls', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const first = provider.get(IConfig);
        const second = provider.get(IConfig);
        expect(first).toBe(second);
    });

    // ── Transient ────────────────────────────────────

    test('transient returns different instances each call', () => {
        const services = new ServiceCollection();
        services.addTransient(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const first = provider.get(IConfig);
        const second = provider.get(IConfig);
        expect(first).not.toBe(second);
        expect(first).toEqual(second);
    });

    // ── Scoped ───────────────────────────────────────

    test('scoped returns same instance within a scope', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        const first = scope.serviceProvider.get(IConfig);
        const second = scope.serviceProvider.get(IConfig);
        expect(first).toBe(second);
    });

    test('scoped returns different instances across scopes', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider();
        const scope1 = provider.createScope();
        const scope2 = provider.createScope();

        const fromScope1 = scope1.serviceProvider.get(IConfig);
        const fromScope2 = scope2.serviceProvider.get(IConfig);
        expect(fromScope1).not.toBe(fromScope2);
    });

    // ── get / getOptional ────────────────────────────

    test('get throws for unregistered schema', () => {
        const services = new ServiceCollection();
        const provider = services.buildServiceProvider({
            validateScopes: false
        });

        expect(() => provider.get(IConfig)).toThrow(/Service not registered/);
    });

    test('getOptional returns undefined for unregistered schema', () => {
        const services = new ServiceCollection();
        const provider = services.buildServiceProvider({
            validateScopes: false
        });

        expect(provider.getOptional(IConfig)).toBeUndefined();
    });

    test('getOptional returns value for registered schema', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const config = provider.getOptional(IConfig);
        expect(config).toBeDefined();
        expect(config!.port).toBe(3000);
    });

    // ── validateScopes ───────────────────────────────

    test('resolving scoped from root throws when validateScopes is true', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider({
            validateScopes: true
        });

        expect(() => provider.get(IConfig)).toThrow(
            /Cannot resolve scoped service from the root/
        );
    });

    test('resolving scoped from root works when validateScopes is false', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const config = provider.get(IConfig);
        expect(config.port).toBe(3000);
    });

    // ── Circular dependency ──────────────────────────

    test('circular dependency throws descriptive error', () => {
        const IA = object({ value: string() });
        const IB = object({ value: string() });

        const services = new ServiceCollection();
        services.addSingleton(IA, p => {
            p.get(IB);
            return { value: 'a' };
        });
        services.addSingleton(IB, p => {
            p.get(IA);
            return { value: 'b' };
        });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        expect(() => provider.get(IA)).toThrow(/Circular dependency detected/);
    });

    // ── Optional validation ──────────────────────────

    test('validation passes when factory returns valid value', () => {
        const services = new ServiceCollection();
        services.addSingleton(
            IConfig,
            { port: 3000, host: 'localhost' },
            { validate: true }
        );

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        expect(() => provider.get(IConfig)).not.toThrow();
    });

    test('validation fails when factory returns invalid value', () => {
        const services = new ServiceCollection();
        services.addSingleton(
            IConfig,
            { port: 'not a number', host: 123 } as any,
            { validate: true }
        );

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        expect(() => provider.get(IConfig)).toThrow(
            /Service validation failed/
        );
    });

    test('validation is skipped when validate option is false', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 'bad', host: 123 } as any, {
            validate: false
        });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        expect(() => provider.get(IConfig)).not.toThrow();
    });

    // ── invoke ───────────────────────────────────────

    test('invoke resolves params and calls implementation', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
        services.addSingleton(ILogger, () => ({
            info: () => {}
        }));

        const handler = func()
            .addParameter(IConfig)
            .addParameter(ILogger)
            .hasReturnType(string());

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const result = provider.invoke(handler, (config: any, _logger: any) => {
            return `${config.host}:${config.port}`;
        });

        expect(result).toBe('localhost:3000');
    });

    test('invoke works with zero parameters', () => {
        const services = new ServiceCollection();
        const handler = func().hasReturnType(number());

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const result = provider.invoke(handler, () => 42);
        expect(result).toBe(42);
    });

    // ── Factory receives provider for nested resolution ──

    test('factory can resolve other services from provider', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
        services.addSingleton(ILogger, provider => {
            const config = provider.get(IConfig);
            return {
                info: () => `Logger for ${config.host}`
            };
        });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const logger = provider.get(ILogger);
        expect(logger.info()).toBe('Logger for localhost');
    });

    // ── Singleton in scope comes from root ───────────

    test('singleton in scope uses root cache', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider();

        // Resolve from root
        const fromRoot = provider.get(IConfig);

        // Resolve from scope — should be same instance
        const scope = provider.createScope();
        const fromScope = scope.serviceProvider.get(IConfig);
        expect(fromScope).toBe(fromRoot);
    });
});
