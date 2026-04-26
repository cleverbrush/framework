import { func, number, object, string } from '@cleverbrush/schema';
import { describe, expect, test, vi } from 'vitest';

import { ServiceCollection } from './ServiceCollection.js';

// ---------------------------------------------------------------------------
// Service schemas used across tests
// ---------------------------------------------------------------------------

const IConfig = object({
    port: number(),
    host: string()
});

// ---------------------------------------------------------------------------
// ServiceScope
// ---------------------------------------------------------------------------

describe('ServiceScope', () => {
    // ── Basic scope isolation ────────────────────────

    test('scoped services are isolated between scopes', () => {
        let count = 0;
        const ICounter = object({ value: number() });

        const services = new ServiceCollection();
        services.addScoped(ICounter, () => ({ value: ++count }));

        const provider = services.buildServiceProvider();
        const scope1 = provider.createScope();
        const scope2 = provider.createScope();

        const counter1 = scope1.serviceProvider.get(ICounter);
        const counter2 = scope2.serviceProvider.get(ICounter);
        expect(counter1.value).toBe(1);
        expect(counter2.value).toBe(2);
        expect(counter1).not.toBe(counter2);
    });

    test('same scoped service within same scope returns same instance', () => {
        const IService = object({ id: number() });
        let count = 0;

        const services = new ServiceCollection();
        services.addScoped(IService, () => ({ id: ++count }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        const first = scope.serviceProvider.get(IService);
        const second = scope.serviceProvider.get(IService);
        expect(first).toBe(second);
        expect(first.id).toBe(1);
    });

    // ── Sync disposal ────────────────────────────────

    test('dispose calls Symbol.dispose on scoped services', () => {
        const disposeFn = vi.fn();
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'resource',
            [Symbol.dispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        scope.dispose();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('dispose is idempotent', () => {
        const disposeFn = vi.fn();
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'resource',
            [Symbol.dispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        scope.dispose();
        scope.dispose();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('dispose in LIFO order', () => {
        const order: number[] = [];
        const IFirst = object({ id: number() });
        const ISecond = object({ id: number() });

        const services = new ServiceCollection();
        services.addScoped(IFirst, () => ({
            id: 1,
            [Symbol.dispose]: () => order.push(1)
        }));
        services.addScoped(ISecond, () => ({
            id: 2,
            [Symbol.dispose]: () => order.push(2)
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        // Resolve in order: IFirst, then ISecond
        scope.serviceProvider.get(IFirst);
        scope.serviceProvider.get(ISecond);

        scope.dispose();
        // Should dispose in reverse: ISecond first, then IFirst
        expect(order).toEqual([2, 1]);
    });

    // ── Async disposal ───────────────────────────────

    test('asyncDispose calls Symbol.asyncDispose on scoped services', async () => {
        const disposeFn = vi.fn().mockResolvedValue(undefined);
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'async-resource',
            [Symbol.asyncDispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        await scope.asyncDispose();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('asyncDispose falls back to Symbol.dispose', async () => {
        const disposeFn = vi.fn();
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'sync-resource',
            [Symbol.dispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        await scope.asyncDispose();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('asyncDispose is idempotent', async () => {
        const disposeFn = vi.fn().mockResolvedValue(undefined);
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'resource',
            [Symbol.asyncDispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        await scope.asyncDispose();
        await scope.asyncDispose();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('asyncDispose in LIFO order', async () => {
        const order: number[] = [];
        const IFirst = object({ id: number() });
        const ISecond = object({ id: number() });

        const services = new ServiceCollection();
        services.addScoped(IFirst, () => ({
            id: 1,
            [Symbol.asyncDispose]: async () => order.push(1)
        }));
        services.addScoped(ISecond, () => ({
            id: 2,
            [Symbol.asyncDispose]: async () => order.push(2)
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        scope.serviceProvider.get(IFirst);
        scope.serviceProvider.get(ISecond);

        await scope.asyncDispose();
        expect(order).toEqual([2, 1]);
    });

    // ── Symbol.dispose / Symbol.asyncDispose ─────────

    test('[Symbol.dispose] delegates to dispose()', () => {
        const disposeFn = vi.fn();
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'resource',
            [Symbol.dispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        scope[Symbol.dispose]();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    test('[Symbol.asyncDispose] delegates to asyncDispose()', async () => {
        const disposeFn = vi.fn().mockResolvedValue(undefined);
        const IResource = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IResource, () => ({
            value: 'resource',
            [Symbol.asyncDispose]: disposeFn
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IResource);

        await scope[Symbol.asyncDispose]();
        expect(disposeFn).toHaveBeenCalledOnce();
    });

    // ── Scoped invoke ────────────────────────────────

    test('scoped serviceProvider.invoke resolves from scope', () => {
        const IRequestId = object({ id: string() });
        let count = 0;

        const services = new ServiceCollection();
        services.addScoped(IRequestId, () => ({
            id: `req-${++count}`
        }));
        services.addSingleton(IConfig, { port: 3000, host: 'localhost' });

        const handler = func()
            .addParameter(IRequestId)
            .addParameter(IConfig)
            .hasReturnType(string());

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        const result = scope.serviceProvider.invoke(
            handler,
            (reqId: any, config: any) => `${reqId.id}@${config.host}`
        );
        expect(result).toBe('req-1@localhost');

        // Within same scope, same request id
        const result2 = scope.serviceProvider.invoke(
            handler,
            (reqId: any, config: any) => `${reqId.id}@${config.host}`
        );
        expect(result2).toBe('req-1@localhost');
    });

    // ── Error during disposal ────────────────────────

    test('dispose re-throws first error but disposes all', () => {
        const order: number[] = [];
        const IFirst = object({ id: number() });
        const ISecond = object({ id: number() });

        const services = new ServiceCollection();
        services.addScoped(IFirst, () => ({
            id: 1,
            [Symbol.dispose]: () => {
                order.push(1);
            }
        }));
        services.addScoped(ISecond, () => ({
            id: 2,
            [Symbol.dispose]: () => {
                order.push(2);
                throw new Error('disposal error');
            }
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IFirst);
        scope.serviceProvider.get(ISecond);

        expect(() => scope.dispose()).toThrow('disposal error');
        // Both were attempted (LIFO: ISecond first, then IFirst)
        expect(order).toEqual([2, 1]);
    });

    // ── Non-disposable services are not tracked ──────

    test('non-disposable services do not cause errors on dispose', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({
            port: 3000,
            host: 'localhost'
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IConfig);

        expect(() => scope.dispose()).not.toThrow();
    });

    // ── Circular dependency detection in scope ───────

    test('circular dependency in scoped factories throws descriptive error', () => {
        const IA = object({ value: string() });
        const IB = object({ value: string() });

        const services = new ServiceCollection();
        services.addScoped(IA, p => {
            p.get(IB);
            return { value: 'a' };
        });
        services.addScoped(IB, p => {
            p.get(IA);
            return { value: 'b' };
        });

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        expect(() => scope.serviceProvider.get(IA)).toThrow(
            /Circular dependency detected/
        );
    });

    // ── getOptional ──────────────────────────────────

    test('getOptional returns service when registered', () => {
        const services = new ServiceCollection();
        services.addScoped(IConfig, () => ({ port: 8080, host: 'localhost' }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        const result = scope.serviceProvider.getOptional(IConfig);
        expect(result).toEqual({ port: 8080, host: 'localhost' });
    });

    test('getOptional returns undefined when not registered', () => {
        const IUnknown = object({ x: number() });
        const services = new ServiceCollection();
        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        const result = scope.serviceProvider.getOptional(IUnknown);
        expect(result).toBeUndefined();
    });

    // ── Unregistered service throws ──────────────────

    test('get throws when service is not registered', () => {
        const IUnregistered = object({ x: number() });
        const services = new ServiceCollection();
        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        expect(() => scope.serviceProvider.get(IUnregistered)).toThrow(
            /Service not registered/
        );
    });

    // ── Singleton accessed via scope ─────────────────

    test('singleton service is accessible via scoped provider', () => {
        const ISingleton = object({ value: string() });
        const services = new ServiceCollection();
        services.addSingleton(ISingleton, { value: 'shared' });

        const provider = services.buildServiceProvider();
        const scope1 = provider.createScope();
        const scope2 = provider.createScope();

        const a = scope1.serviceProvider.get(ISingleton);
        const b = scope2.serviceProvider.get(ISingleton);
        expect(a).toBe(b); // same singleton instance across scopes
        expect(a.value).toBe('shared');
    });

    // ── Validation ───────────────────────────────────

    test('service validation throws when factory produces invalid value', () => {
        const IStrict = object({ name: string() });

        const services = new ServiceCollection();
        services.addScoped(IStrict, () => ({ name: 123 as any }), {
            validate: true
        });

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        expect(() => scope.serviceProvider.get(IStrict)).toThrow(
            /validation failed/i
        );
    });

    // ── asyncDispose re-throws ────────────────────────

    test('asyncDispose re-throws first error but disposes all', async () => {
        const order: number[] = [];
        const IFirst = object({ id: number() });
        const ISecond = object({ id: number() });

        const services = new ServiceCollection();
        services.addScoped(IFirst, () => ({
            id: 1,
            [Symbol.asyncDispose]: async () => {
                order.push(1);
            }
        }));
        services.addScoped(ISecond, () => ({
            id: 2,
            [Symbol.asyncDispose]: async () => {
                order.push(2);
                throw new Error('async disposal error');
            }
        }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();
        scope.serviceProvider.get(IFirst);
        scope.serviceProvider.get(ISecond);

        await expect(scope.asyncDispose()).rejects.toThrow(
            'async disposal error'
        );
        expect(order).toEqual([2, 1]);
    });

    // ── Transient via scope ───────────────────────────

    test('transient service via scope returns new instance each time', () => {
        const IService = object({ value: number() });

        let count = 0;
        const services = new ServiceCollection();
        services.addTransient(IService, () => ({ value: ++count }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        const a = scope.serviceProvider.get(IService);
        const b = scope.serviceProvider.get(IService);
        expect(a).not.toBe(b);
        expect(a.value).toBe(1);
        expect(b.value).toBe(2);
    });

    // ── getOptional via scope ─────────────────────────

    test('scope.serviceProvider.getOptional delegates to provider', () => {
        const IService = object({ value: number() });

        const services = new ServiceCollection();
        services.addScoped(IService, () => ({ value: 42 }));

        const provider = services.buildServiceProvider();
        const scope = provider.createScope();

        const result = scope.serviceProvider.getOptional(IService);
        expect(result).toEqual({ value: 42 });
    });
});
