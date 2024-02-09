import { retry } from './retry.js';

test('retry - 1', async () => {
    let numCalled = 0;
    const fn = () =>
        new Promise((resolve, reject) => {
            numCalled++;
            if (numCalled < 2) {
                reject('error');
                return;
            }
            resolve('success');
        });

    const start = performance.now();
    await expect(retry(fn)).resolves.toBe('success');
    const end = performance.now();
    expect(end - start).toBeGreaterThan(100);
    expect(numCalled).toBe(2);
});

test('retry - 2', async () => {
    let numCalled = 0;
    const fn = () =>
        new Promise((resolve, reject) => {
            numCalled++;
            if (numCalled < 4) {
                reject('error');
                return;
            }
            resolve('success');
        });

    const start = performance.now();
    await expect(
        retry(fn, { maxRetries: 5, minDelay: 10, delayFactor: 1 })
    ).resolves.toBe('success');
    const end = performance.now();
    expect(end - start).toBeGreaterThan(30);
    expect(numCalled).toBe(4);
});

test('retry - 3', async () => {
    let numCalled = 0;
    const fn = () =>
        new Promise(() => {
            numCalled++;
            throw new Error('error');
        });

    const start = performance.now();
    await expect(
        retry(fn, { maxRetries: 5, minDelay: 10, delayFactor: 2 })
    ).rejects.toThrow('error');
    const end = performance.now();
    expect(end - start).toBeGreaterThan(10 + 20 + 40 + 80 + 160);
    expect(numCalled).toBe(6);
});
