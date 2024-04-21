import {
    RateLimitReachedException,
    rateLimit,
    rateLimitObject
} from './rateLimit.js';

test('rateLimit - 1', async () => {
    const fn = () => 'success';
    const limitedFn = rateLimit(
        {
            interval: { type: 'second' },
            maxCostPerInterval: 3000,
            costPerCall: 1000
        },
        fn
    );

    expect(limitedFn()).toBe('success');
    expect(limitedFn()).toBe('success');
    expect(limitedFn()).toBe('success');
    expect(limitedFn).toThrowError(RateLimitReachedException);
});

test('rateLimit - 2', async () => {
    const fn = () => 'success';
    const limitedFn = rateLimit(
        { interval: { type: 'second' }, maxCostPerInterval: 1 },
        fn
    );

    expect(limitedFn()).toBe('success');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(limitedFn()).toBe('success');
});

test('rateLimit - 3', async () => {
    const fn = () => 'success';
    const limitedFn = rateLimit(
        { interval: { type: 'second' }, maxCostPerInterval: 2, costPerCall: 1 },
        fn
    );

    expect(limitedFn()).toBe('success');
    expect(limitedFn()).toBe('success');
    expect(limitedFn).toThrowError(RateLimitReachedException);
});

test('rateLimit - 4', async () => {
    const fn = () => 'success';
    const limitedFn = rateLimit(
        { interval: { type: 'second' }, maxCostPerInterval: 2, costPerCall: 1 },
        fn
    );

    expect(limitedFn()).toBe('success');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(limitedFn()).toBe('success');
    expect(limitedFn()).toBe('success');
    expect(limitedFn).toThrowError(RateLimitReachedException);
});

test('rateLimitObject - 1', async () => {
    const obj = {
        num: 1,
        str: 'string',
        f1: (a: number) => a + 10,
        f2: (a: number, b: number) => a + b
    };

    const rateLimitedObject = rateLimitObject(obj, {
        maxCostPerInterval: 2,
        interval: {
            type: 'second',
            count: 1
        }
    });

    expect(rateLimitedObject.num).toBe(1);
    expect(rateLimitedObject.str).toBe('string');
    expect(typeof rateLimitedObject.f1).toBe('function');
    expect(typeof rateLimitedObject.f2).toBe('function');
});

test('rateLimitObject - 2', async () => {
    const obj = {
        num: 1,
        str: 'string',
        f1: (a: number) => a + 10,
        f2: (a: number, b: number) => a + b
    };

    const rateLimitedObject = rateLimitObject(obj, {
        maxCostPerInterval: 2,
        interval: {
            type: 'second',
            count: 1
        },
        limits: {
            f1: {
                costPerCall: 0
            }
        }
    });

    for (let i = 0; i < 100; i++) {
        expect(await rateLimitedObject.f1(1)).toBe(11);
    }

    expect(await rateLimitedObject.f2(1, 2)).toBe(3);
    expect(await rateLimitedObject.f2(1, 2)).toBe(3);
    expect(async () => await rateLimitedObject.f2(1, 2)).toThrowError(
        RateLimitReachedException
    );
});
