import { debounce } from './debounce.js';

test('debounce - 1', async () => {
    let numCalled = 0;
    const fn = () => {
        numCalled++;
    };

    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(numCalled).toBe(1);
});

test('debounce - 2', async () => {
    let numCalled = 0;
    const fn = () => {
        numCalled++;
    };

    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    await new Promise((resolve) => setTimeout(resolve, 10));
    debouncedFn();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(numCalled).toBe(1);
});

test('debounce - 3', async () => {
    let numCalled = 0;
    const fn = () => {
        numCalled++;
    };

    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    await new Promise((resolve) => setTimeout(resolve, 200));
    debouncedFn();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(numCalled).toBe(2);
});
