import { describe, expect, it, vi } from 'vitest';
import { rollback } from './rollback.js';
import { run } from './run.js';

function makeConfig(options: {
    latest?: any;
    up?: any;
    rollbackResult?: any;
    dir?: string;
    tableName?: string;
}) {
    const knex: any = {
        migrate: {
            latest: vi.fn().mockResolvedValue(options.latest ?? [0, []]),
            up: vi.fn().mockResolvedValue(options.up ?? [0, []]),
            rollback: vi
                .fn()
                .mockResolvedValue(options.rollbackResult ?? [0, []])
        }
    };
    return {
        config: {
            knex,
            entities: {} as any,
            migrations: {
                directory: options.dir ?? './migrations',
                tableName: options.tableName
            }
        },
        knex
    };
}

describe('migrate run', () => {
    it('calls knex.migrate.latest and reports applied migrations', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config, knex } = makeConfig({
            latest: [3, ['2024_init.ts', '2024_users.ts']]
        });

        await run(config, {});

        expect(knex.migrate.latest).toHaveBeenCalledWith({
            directory: './migrations',
            tableName: 'knex_migrations',
            loadExtensions: ['.ts', '.js']
        });
        expect(log.mock.calls.flat().join(' ')).toMatch(/Batch 3/);
        log.mockRestore();
    });

    it('reports "Already up to date." when nothing to apply', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig({ latest: [0, []] });
        await run(config, {});
        expect(log).toHaveBeenCalledWith('Already up to date.');
        log.mockRestore();
    });

    it('honours --to and uses migrate.up', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config, knex } = makeConfig({
            up: [5, ['2024_target.ts']]
        });

        await run(config, { '--to': '2024_target.ts' });

        expect(knex.migrate.up).toHaveBeenCalledWith({
            directory: './migrations',
            tableName: 'knex_migrations',
            loadExtensions: ['.ts', '.js'],
            name: '2024_target.ts'
        });
        expect(log.mock.calls.flat().join(' ')).toMatch(/2024_target\.ts/);
        log.mockRestore();
    });

    it('reports "already applied" for --to when migrate.up returns empty', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig({ up: [0, []] });

        await run(config, { '--to': '2024_target.ts' });

        expect(log).toHaveBeenCalledWith('2024_target.ts — already applied.');
        log.mockRestore();
    });

    it('honours --dir and a custom tableName from config', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config, knex } = makeConfig({
            tableName: 'custom_migrations'
        });

        await run(config, { '--dir': '/tmp/migs' });

        expect(knex.migrate.latest).toHaveBeenCalledWith({
            directory: '/tmp/migs',
            tableName: 'custom_migrations',
            loadExtensions: ['.ts', '.js']
        });
        log.mockRestore();
    });
});

describe('migrate rollback', () => {
    it('calls knex.migrate.rollback and reports reverted migrations', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config, knex } = makeConfig({
            rollbackResult: [2, ['2024_users.ts']]
        });

        await rollback(config, {});

        expect(knex.migrate.rollback).toHaveBeenCalledWith(
            expect.objectContaining({ directory: './migrations' }),
            false
        );
        expect(log.mock.calls.flat().join(' ')).toMatch(/Batch 2/);
        log.mockRestore();
    });

    it('passes the --all flag through to knex', async () => {
        const { config, knex } = makeConfig({
            rollbackResult: [3, ['a.ts', 'b.ts']]
        });

        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        await rollback(config, { '--all': true });
        expect(knex.migrate.rollback).toHaveBeenCalledWith(
            expect.anything(),
            true
        );
        log.mockRestore();
    });

    it('reports "Nothing to roll back." when result is empty', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig({ rollbackResult: [0, []] });

        await rollback(config, {});

        expect(log).toHaveBeenCalledWith('Nothing to roll back.');
        log.mockRestore();
    });
});
