import { expect, it, vi } from 'vitest';
import {
    createIdempotentOperation,
    readIdempotencyKey,
    withIdempotencyKey
} from './idempotency.js';

it('retains the key and prepared defaults after failures, and creates fresh intentional saves', async () => {
    const prepare = vi.fn((value: { amount: number }) => ({
        ...value,
        at: new Date()
    }));
    const execute = vi
        .fn()
        .mockRejectedValueOnce(new Error('Lost response'))
        .mockResolvedValue({ ok: true });
    const save = createIdempotentOperation({ prepare, execute });
    await expect(save.run({ amount: 1 })).rejects.toThrow('Lost response');
    await save.run({ amount: 1 });
    expect(execute.mock.calls[1][0]).toEqual(execute.mock.calls[0][0]);
    expect(prepare).toHaveBeenCalledOnce();
    await save.run({ amount: 1 });
    expect(execute.mock.calls[2][0].idempotencyKey).not.toBe(
        execute.mock.calls[0][0].idempotencyKey
    );
});

it('isolates drafts, changes keys with edited input, and snapshots mutable values', () => {
    const save = createIdempotentOperation({
        prepare: (input: { tags: string[]; at: Date; amount: number }) => input,
        execute: () => undefined
    });
    const input = { tags: ['one'], at: new Date('2026-01-01'), amount: 1 };
    const first = save.prepare(input, 'a');
    first.value.tags.push('external mutation');
    expect(save.prepare({ ...input }, 'a').value.tags).toEqual(['one']);
    expect(
        save.prepare({ amount: 1, at: input.at, tags: ['one'] }, 'a')
            .idempotencyKey
    ).toBe(first.idempotencyKey);
    expect(save.prepare(input, 'b').idempotencyKey).not.toBe(
        first.idempotencyKey
    );
    expect(save.prepare({ ...input, amount: 2 }, 'a').idempotencyKey).not.toBe(
        first.idempotencyKey
    );
    save.clear();
    expect(save.prepare(input, 'b').idempotencyKey).not.toBe(
        first.idempotencyKey
    );
});

it('coalesces pending submissions and preserves returned failures', async () => {
    let finish!: (value: { ok: boolean }) => void;
    const execute = vi.fn(
        () =>
            new Promise<{ ok: boolean }>(resolve => {
                finish = resolve;
            })
    );
    const save = createIdempotentOperation({
        prepare: (input: number) => input,
        execute,
        isSuccess: result => result.ok
    });
    const before = save.prepare(1);
    const first = save.run(1);
    expect(save.run(2)).toBe(first);
    await Promise.resolve();
    finish({ ok: false });
    await first;
    expect(save.prepare(1).idempotencyKey).toBe(before.idempotencyKey);
    const second = save.run(1);
    await Promise.resolve();
    save.reset();
    const next = save.prepare(1);
    finish({ ok: true });
    await second;
    expect(save.prepare(1).idempotencyKey).toBe(next.idempotencyKey);
    expect(execute).toHaveBeenCalledTimes(2);
});

it('carries optional action metadata without encoding it into the request value', () => {
    const form = new FormData();
    form.set('title', 'Hello');
    expect(readIdempotencyKey(form)).toBeUndefined();
    expect(withIdempotencyKey(form, 'attempt')).toBe(form);
    expect(readIdempotencyKey(form)).toBe('attempt');
    expect(form.get('title')).toBe('Hello');
    form.set('idempotencyKey', '');
    expect(() => readIdempotencyKey(form)).toThrow('Invalid');
});
