import { throttle } from './throttle.js';

test('throttle - 1', async () => {
    let numCalled = 0;
    const fn = () => {
        numCalled++;
    };

    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(numCalled).toBe(1);
});

test('throttle - 2', async () => {
    let numCalled = 0;
    const fn = () => {
        numCalled++;
    };

    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    await new Promise((resolve) => setTimeout(resolve, 10));
    throttledFn();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(numCalled).toBe(1);
});
