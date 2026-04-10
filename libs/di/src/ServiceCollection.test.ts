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
// Registration
// ---------------------------------------------------------------------------

describe('ServiceCollection', () => {
    test('addSingleton registers a service with Singleton lifetime', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const config = provider.get(IConfig);
        expect(config.port).toBe(3000);
        expect(config.host).toBe('localhost');
    });

    test('addSingleton with factory', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, () => ({
            port: 8080,
            host: '0.0.0.0'
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const config = provider.get(IConfig);
        expect(config.port).toBe(8080);
    });

    test('addScoped registers a service with Scoped lifetime', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        const config = scope.serviceProvider.get(IConfig);
        expect(config.port).toBe(3000);
    });

    test('addTransient registers a service with Transient lifetime', () => {
        let callCount = 0;
        const services = new ServiceCollection();
        services.addTransient(IConfig, () => {
            callCount++;
            return { port: callCount, host: 'localhost' };
        });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const first = provider.get(IConfig);
        const second = provider.get(IConfig);
        expect(first.port).toBe(1);
        expect(second.port).toBe(2);
        expect(first).not.toBe(second);
    });

    test('duplicate registration replaces the previous (last-wins)', () => {
        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 1, host: 'a' });
        services.addSingleton(IConfig, { port: 2, host: 'b' });

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const config = provider.get(IConfig);
        expect(config.port).toBe(2);
        expect(config.host).toBe('b');
    });

    test('chaining — add methods return this', () => {
        const services = new ServiceCollection();
        const result = services
            .addSingleton(IConfig, { port: 1, host: 'a' })
            .addSingleton(ILogger, () => ({ info: () => {} }));

        expect(result).toBe(services);
    });

    test('addSingletonInstance registers a function value without invoking it as a factory', () => {
        const IHandler = object({ greet: func() });
        let callCount = 0;
        const handler = { greet: () => { callCount++; } };

        const services = new ServiceCollection();
        services.addSingletonInstance(IHandler, handler);

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const resolved = provider.get(IHandler);
        expect(resolved).toBe(handler);
        // The handler object itself must not have been invoked as a factory
        expect(callCount).toBe(0);
    });

    test('addSingletonInstance with a raw function value (func() schema)', () => {
        const IFn = func();
        let invoked = false;
        const myFn = () => { invoked = true; };

        const services = new ServiceCollection();
        // addSingleton would call myFn() as a factory; addSingletonInstance must not
        services.addSingletonInstance(IFn, myFn as any);

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const resolved = provider.get(IFn);
        expect(resolved).toBe(myFn);
        expect(invoked).toBe(false);
    });

    test('addSingletonFromSchema resolves function schema parameters', () => {
        const IGreeter = object({ greeting: string() });
        const greeterDeps = func().addParameter(IConfig);

        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
        services.addSingletonFromSchema(IGreeter, greeterDeps, config => ({
            greeting: `Hello from ${config.host}:${config.port}`
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        const greeter = provider.get(IGreeter);
        expect(greeter.greeting).toBe('Hello from localhost:3000');
    });

    test('addScopedFromSchema registers scoped with func schema', () => {
        const IGreeter = object({ greeting: string() });
        const greeterDeps = func().addParameter(IConfig);

        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000, host: 'test' });
        services.addScopedFromSchema(IGreeter, greeterDeps, config => ({
            greeting: `Hi from ${config.host}`
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        const greeter = scope.serviceProvider.get(IGreeter);
        expect(greeter.greeting).toBe('Hi from test');
    });

    test('addTransientFromSchema registers transient with func schema', () => {
        let count = 0;
        const ICounter = object({ value: number() });
        const counterDeps = func().addParameter(IConfig);

        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 1, host: 'x' });
        services.addTransientFromSchema(ICounter, counterDeps, config => ({
            value: ++count + config.port
        }));

        const provider = services.buildServiceProvider({
            validateScopes: false
        });
        expect(provider.get(ICounter).value).toBe(2);
        expect(provider.get(ICounter).value).toBe(3);
    });
});
