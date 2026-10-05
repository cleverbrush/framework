import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { push } from './push.js';

const mocks = vi.hoisted(() => ({
    exists: vi.fn(),
    create: vi.fn(),
    introspect: vi.fn(),
    diff: vi.fn(),
    empty: vi.fn(),
    apply: vi.fn(),
    snapshot: vi.fn(),
    write: vi.fn(),
    variants: vi.fn(),
    prompt: vi.fn(),
    close: vi.fn()
}));
vi.mock('@cleverbrush/knex-schema', () => ({
    getTableName: (s: any) => s.table,
    getPolymorphicVariantSchemas: mocks.variants,
    tableExistsInDb: mocks.exists,
    generateCreateTable: () => mocks.create,
    introspectDatabase: mocks.introspect,
    diffSchema: mocks.diff,
    isDiffEmpty: mocks.empty,
    applyDiff: mocks.apply,
    entitiesToSnapshot: mocks.snapshot,
    writeSnapshot: mocks.write
}));
vi.mock('node:readline', () => ({
    default: {
        createInterface: () => ({ question: mocks.prompt, close: mocks.close })
    }
}));

describe('schema push', () => {
    const trx = {};
    const transaction = vi.fn(async callback => callback(trx));
    const schema = { table: 'items' };
    const config = {
        knex: { transaction },
        entities: { items: { schema } },
        migrations: { directory: './migrations' }
    } as any;
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('NODE_ENV', 'test');
        vi.spyOn(console, 'log').mockImplementation(() => {});
        mocks.variants.mockReturnValue([]);
        mocks.exists.mockResolvedValue(false);
        mocks.empty.mockReturnValue(true);
        mocks.snapshot.mockReturnValue({ version: 1, tables: {} });
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('creates new tables and snapshots only after the transaction succeeds', async () => {
        await push(config, { '--yes': true });
        expect(mocks.create).toHaveBeenCalledWith(trx);
        expect(mocks.write).toHaveBeenCalledWith(
            expect.stringContaining('/migrations/snapshot.json'),
            { version: 1, tables: {} }
        );
        expect(mocks.write.mock.invocationCallOrder[0]).toBeGreaterThan(
            mocks.create.mock.invocationCallOrder[0]
        );
        expect(mocks.prompt).not.toHaveBeenCalled();
    });

    it('deduplicates shared tables and applies only non-empty diffs', async () => {
        mocks.variants.mockReturnValue([
            { getExtension: () => 'items' },
            { getExtension: () => 'details' },
            { getExtension: () => undefined }
        ]);
        mocks.exists.mockResolvedValue(true);
        mocks.empty.mockReturnValueOnce(false).mockReturnValueOnce(true);
        mocks.diff.mockReturnValue({ addColumns: ['name'] });
        await push(
            {
                ...config,
                migrations: { directory: '.', snapshot: './custom.json' }
            },
            { '--yes': true }
        );
        expect(mocks.exists).toHaveBeenCalledTimes(2);
        expect(mocks.apply).toHaveBeenCalledWith(
            trx,
            { addColumns: ['name'] },
            'items'
        );
        expect(mocks.write).toHaveBeenCalledWith(
            expect.stringContaining('/custom.json'),
            expect.any(Object)
        );
    });

    it.each(['y', 'YES'])(
        'accepts confirmation %s and reports an unchanged schema',
        async answer => {
            mocks.prompt.mockImplementation((_question, callback) =>
                callback(answer)
            );
            mocks.exists.mockResolvedValue(true);
            await push(config, {});
            expect(mocks.close).toHaveBeenCalledOnce();
            expect(console.log).toHaveBeenCalledWith(
                'No schema changes detected.'
            );
            expect(mocks.apply).not.toHaveBeenCalled();
        }
    );

    it('does not access the database or snapshot after rejected confirmation', async () => {
        mocks.prompt.mockImplementation((_question, callback) =>
            callback('no')
        );
        await push(config, {});
        expect(transaction).not.toHaveBeenCalled();
        expect(mocks.write).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Aborted.');
    });

    it('does not advance the snapshot after a failed write', async () => {
        mocks.create.mockRejectedValueOnce(new Error('DDL failed'));
        await expect(push(config, { '--yes': true })).rejects.toThrow(
            'DDL failed'
        );
        expect(mocks.write).not.toHaveBeenCalled();
    });
});
