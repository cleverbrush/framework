import { randomUUID } from 'node:crypto';
import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/index.js';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection, pool: { min: 0, max: 5 } });
const db = createDb(knex, {});
afterAll(() => knex.destroy());

describe('PostgreSQL advisory transactions', () => {
    it.each(['commit', 'rollback'])(
        'releases locks after %s and allows unrelated keys',
        async outcome => {
            const key = `transaction-test:${randomUUID()}`;
            let release!: () => void;
            let acquired!: () => void;
            const ready = new Promise<void>(resolve => {
                acquired = resolve;
            });
            const hold = new Promise<void>(resolve => {
                release = resolve;
            });
            const first = db.transaction(
                async () => {
                    acquired();
                    await hold;
                    if (outcome === 'rollback')
                        throw new Error('rollback fixture');
                },
                { advisoryLocks: [key] }
            );
            const finished = first.catch(error => {
                if (outcome !== 'rollback') throw error;
            });
            try {
                await ready;
                const locked = await knex.transaction(async trx => {
                    const result = await trx.raw(
                        'SELECT pg_try_advisory_xact_lock(hashtextextended(?, 0)) AS acquired',
                        [key]
                    );
                    return result.rows[0].acquired;
                });
                expect(locked).toBe(false);
                expect(
                    await db.transaction(async () => 'independent', {
                        advisoryLocks: [key + ':other']
                    })
                ).toBe('independent');
            } finally {
                release();
                await finished;
            }
            expect(
                await db.transaction(async () => 'reacquired', {
                    advisoryLocks: [key]
                })
            ).toBe('reacquired');
        }
    );
    it('serializes callers with the same key', async () => {
        const key = `transaction-test:${randomUUID()}`;
        let active = 0;
        let maximum = 0;
        await Promise.all(
            Array.from({ length: 4 }, () =>
                db.transaction(
                    async scope => {
                        maximum = Math.max(maximum, ++active);
                        await scope.knex.raw('SELECT 1');
                        active--;
                    },
                    { advisoryLocks: [key] }
                )
            )
        );
        expect(maximum).toBe(1);
    });
});
