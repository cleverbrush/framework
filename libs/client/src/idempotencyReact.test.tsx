import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useIdempotentOperation } from './idempotencyReact.js';

it('retains attempts across renders, uses current callbacks, and clears on unmount', async () => {
    const first = vi.fn().mockRejectedValue(new Error('Lost'));
    const second = vi.fn().mockResolvedValue('saved');
    const { result, rerender, unmount } = renderHook(
        ({ execute }) =>
            useIdempotentOperation({
                prepare: (value: number) => ({ value }),
                execute
            }),
        { initialProps: { execute: first } }
    );
    const operation = result.current;
    await act(async () => {
        await expect(operation.run(1)).rejects.toThrow('Lost');
    });
    const request = operation.prepare(1);
    rerender({ execute: second });
    expect(result.current).toBe(operation);
    await act(async () => {
        await operation.run(1);
    });
    expect(second).toHaveBeenCalledWith(request);
    const next = operation.prepare(1);
    unmount();
    expect(operation.prepare(1).idempotencyKey).not.toBe(next.idempotencyKey);
});
