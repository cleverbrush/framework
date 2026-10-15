import type { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { createDb } from './index.js';

function database(client = 'pg', tracking = false) {
    const raw = vi.fn().mockResolvedValue(undefined);
    const transaction = { client: { config: { client } }, raw };
    const knex = {
        transaction: vi.fn(async callback => callback(transaction))
    } as unknown as Knex;
    return { db: createDb(knex, {}, { tracking }), raw, transaction };
}

describe('advisory transaction options', () => {
    it.each([false, true])(
        'locks once in stable order before callback (tracking=%s)',
        async tracking => {
            const { db, raw, transaction } = database('pg', tracking);
            const value = await db.transaction(
                async scope => {
                    expect(scope.knex).toBe(transaction);
                    expect(raw.mock.calls.map(call => call[1])).toEqual([
                        ['asset:a'],
                        ['asset:z']
                    ]);
                    return 'done';
                },
                { advisoryLocks: ['asset:z', 'asset:a', 'asset:z'] }
            );
            expect(value).toBe('done');
        }
    );
    it('preserves transactions without locking on other dialects', async () => {
        const { db, raw } = database('sqlite3');
        expect(await db.transaction(async () => 7)).toBe(7);
        expect(raw).not.toHaveBeenCalled();
    });
    it('rejects unsupported dialects and invalid keys before running the callback', async () => {
        const callback = vi.fn();
        await expect(
            database('sqlite3').db.transaction(callback, {
                advisoryLocks: ['one']
            })
        ).rejects.toThrow('PostgreSQL');
        for (const keys of [[''], [7] as any]) {
            await expect(
                database().db.transaction(callback, { advisoryLocks: keys })
            ).rejects.toThrow('nonempty strings');
        }
        expect(callback).not.toHaveBeenCalled();
    });
    it('propagates lock errors without executing work', async () => {
        const { db, raw } = database();
        raw.mockRejectedValue(new Error('lock timeout'));
        const callback = vi.fn();
        await expect(
            db.transaction(callback, { advisoryLocks: ['one'] })
        ).rejects.toThrow('lock timeout');
        expect(callback).not.toHaveBeenCalled();
    });
});
