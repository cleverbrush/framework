import { afterEach, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

afterEach(() => vi.useRealTimers());

it('delays execution and replaces both the pending arguments and deadline', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = debounce(callback, 100);
    debounced('first', 1);
    vi.advanceTimersByTime(75);
    expect(callback).not.toHaveBeenCalled();
    debounced('second', 2);
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('second', 2);
    debounced('third', 3);
    vi.advanceTimersByTime(100);
    expect(callback.mock.calls).toEqual([
        ['second', 2],
        ['third', 3]
    ]);
    expect(vi.getTimerCount()).toBe(0);
});
