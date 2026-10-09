import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '../types.js';
import { useSubscription } from './useSubscription.js';

class Feed implements Subscription<number, string> {
    state: Subscription<number, string>['state'] = 'connecting';
    private resolve?: (result: IteratorResult<number>) => void;
    private reject?: (error: unknown) => void;
    send = vi.fn();
    close = vi.fn(() => {
        this.state = 'closed';
        this.resolve?.({ done: true, value: undefined });
    });
    emit(value: number) {
        this.resolve?.({ done: false, value });
    }
    fail(error: unknown) {
        this.reject?.(error);
    }
    [Symbol.asyncIterator](): AsyncIterator<number> {
        return {
            next: () =>
                new Promise((resolve, reject) => {
                    this.resolve = resolve;
                    this.reject = reject;
                })
        };
    }
}
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('subscription hook lifecycle', () => {
    it('tracks connection state, retains bounded events and forwards send/close', async () => {
        vi.useFakeTimers();
        const feed = new Feed();
        const subscribe = vi.fn(() => feed);
        const { result, rerender, unmount } = renderHook(
            ({ maxEvents }) => useSubscription(subscribe, { maxEvents }),
            { initialProps: { maxEvents: 2 } }
        );
        expect(result.current.state).toBe('connecting');
        act(() => {
            feed.state = 'connected';
            vi.advanceTimersByTime(400);
        });
        expect(result.current.state).toBe('connected');
        for (const value of [1, 2, 3]) await act(async () => feed.emit(value));
        expect(result.current.events).toEqual([2, 3]);
        expect(result.current.lastEvent).toBe(3);
        rerender({ maxEvents: 1 });
        await act(async () => feed.emit(4));
        expect(result.current.events).toEqual([4]);
        expect(subscribe).toHaveBeenCalledTimes(1);
        act(() => result.current.send('message'));
        expect(feed.send).toHaveBeenCalledExactlyOnceWith('message');
        await act(async () => result.current.close());
        expect(result.current.state).toBe('closed');
        act(() => result.current.send('ignored'));
        expect(feed.send).toHaveBeenCalledTimes(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('supports disabled hooks, re-enabling and cleanup', async () => {
        vi.useFakeTimers();
        const feeds: Feed[] = [];
        const subscribe = vi.fn(() => {
            const feed = new Feed();
            feeds.push(feed);
            return feed;
        });
        const { result, rerender, unmount } = renderHook(
            ({ enabled }) => useSubscription(subscribe, { enabled }),
            { initialProps: { enabled: false } }
        );
        act(() => {
            result.current.send('ignored');
            result.current.close();
        });
        expect(subscribe).not.toHaveBeenCalled();
        rerender({ enabled: true });
        await act(async () => feeds[0].emit(1));
        rerender({ enabled: false });
        expect(feeds[0].close).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        rerender({ enabled: true });
        expect(subscribe).toHaveBeenCalledTimes(2);
        unmount();
        expect(feeds[1].close).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it.each([new Error('disconnect'), 'disconnect'])(
        'normalizes iterator failure %s and closes state',
        async error => {
            const feed = new Feed();
            const { result } = renderHook(() => useSubscription(() => feed));
            await act(async () => feed.fail(error));
            expect(result.current.error).toEqual(new Error('disconnect'));
            expect(result.current.state).toBe('closed');
        }
    );

    it('keeps the latest event without retaining history when maxEvents is zero', async () => {
        const feed = new Feed();
        const { result } = renderHook(() =>
            useSubscription(() => feed, { maxEvents: 0 })
        );
        await act(async () => feed.emit(5));
        expect(result.current.lastEvent).toBe(5);
        expect(result.current.events).toEqual([]);
    });

    it('retains unlimited history when no maximum is configured', async () => {
        const feed = new Feed();
        const { result } = renderHook(() => useSubscription(() => feed));
        for (const value of [1, 2, 3]) await act(async () => feed.emit(value));
        expect(result.current.events).toEqual([1, 2, 3]);
    });
});
