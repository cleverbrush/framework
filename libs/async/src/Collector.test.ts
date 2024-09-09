import Collector from './Collector.js';

test('Collector - 1', async () => {
    const c = new Collector<{ a: number; b: string }>(['a', 'b']);
    c.on('end', (result) => {
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
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(thenFunct).not.toHaveBeenCalled();
});

test('Collector - 4', async () => {
    const timeoutHandler = vi.fn();
    type Obj = { a: number; b: string };

    const c = new Collector<Obj>(['a', 'b'], 500);
    c.on('end', (result) => {
        expect(result).toHaveProperty('a', 10);
        expect(result).toHaveProperty('b', 'abc');
    });

    c.on('timeout', timeoutHandler);

    c.collect('a', 10);
    setTimeout(() => {
        expect(timeoutHandler).toBeCalled();
    }, 600);
});
