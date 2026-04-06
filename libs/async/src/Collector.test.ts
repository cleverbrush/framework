import { expect, test, vi } from 'vitest';

import Collector from './Collector.js';

test('Collector - 1', async () => {
    const c = new Collector<{ a: number; b: string }>(['a', 'b']);
    c.on('end', result => {
        expect(result).toHaveProperty('a', 10);
        expect(result).toHaveProperty('b', 'abc');
    });

    c.collect('a', 10).collect('b', 'abc');
});

test('Collector - 2', async () => {
    const c = new Collector<{ a: number; b: string }>(['a', 'b']);

    const promise = c.toPromise();

    c.collect('a', 10).collect('b', 'abc');

    const result = await promise;
    expect(result).toHaveProperty('a', 10);
    expect(result).toHaveProperty('b', 'abc');
});

test('Collector - 3', async () => {
    const c = new Collector<{ a: number; b: string }>(['a', 'b']);
    const promise = c.toPromise();

    c.collect('a', 10);

    const thenFunct = vi.fn();
    promise.then(thenFunct);

    // wait for 200ms
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(thenFunct).not.toHaveBeenCalled();
});

test('Collector - 4', async () => {
    const timeoutHandler = vi.fn();
    type Obj = { a: number; b: string };

    const c = new Collector<Obj>(['a', 'b'], 500);
    c.on('end', result => {
        expect(result).toHaveProperty('a', 10);
        expect(result).toHaveProperty('b', 'abc');
    });

    c.on('timeout', timeoutHandler);

    c.collect('a', 10);
    setTimeout(() => {
        expect(timeoutHandler).toBeCalled();
    }, 600);
});

test('Collector - 5: timeout rejects the promise and provides partial results', async () => {
    type Obj = { a: number; b: string };

    const c = new Collector<Obj>(['a', 'b'], 100);
    const promise = c.toPromise();

    c.collect('a', 10);
    // 'b' is never collected — timeout fires

    const rejected = await promise.catch(err => err);
    expect(rejected).toMatchObject({
        reason: 'timeout',
        results: { a: 10 }
    });
});

test('Collector - 6: collect() after timeout is ignored (no double-fire)', async () => {
    type Obj = { a: number; b: string };

    const endHandler = vi.fn();
    const c = new Collector<Obj>(['a', 'b'], 50);
    c.on('end', endHandler);
    const promise = c.toPromise();

    // Let timeout fire
    await promise.catch(() => {});

    // Collect after timeout — should be a no-op
    c.collect('b', 'late');

    // Give microtasks time to settle
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(endHandler).not.toHaveBeenCalled();
});

test('Collector - 7: collect with rejected promise rejects toPromise()', async () => {
    type Obj = { a: number };

    const c = new Collector<Obj>(['a']);
    const promise = c.toPromise();

    c.collect('a', Promise.reject(new Error('fetch failed')) as any);

    const rejected = await promise.catch(err => err);
    expect(rejected).toMatchObject({
        reason: 'error',
        results: { key: 'a' }
    });
});

test('Collector - 8: collect with rejected promise emits error when no promise set up', async () => {
    type Obj = { a: number };

    const c = new Collector<Obj>(['a']);
    const errorHandler = vi.fn();
    c.on('error' as any, errorHandler);

    c.collect('a', Promise.reject(new Error('oops')) as any);

    // Wait for microtask
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(errorHandler).toHaveBeenCalledOnce();
    expect(errorHandler.mock.calls[0][0]).toMatchObject({ key: 'a' });
});
