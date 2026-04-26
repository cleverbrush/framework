// @cleverbrush/orm-cli — unit tests
//
// Tests run without a live database.  They verify:
// 1. parseFlags helper
// 2. generate command writes a file + snapshot with the expected shape (mock knex-schema)
// 3. push command exits 1 in NODE_ENV=production without --yes

import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { parseFlags } from './cli.js';

// ---------------------------------------------------------------------------
// Module-level mock — must be at top-level so Vitest can hoist it
// ---------------------------------------------------------------------------

const _mockGenerateMigrationsForContext = vi.fn();
const _mockLoadSnapshot = vi.fn();
const _mockWriteSnapshot = vi.fn();

vi.mock('@cleverbrush/knex-schema', async importOriginal => {
    const actual =
        await importOriginal<typeof import('@cleverbrush/knex-schema')>();
    return {
        ...actual,
        generateMigrationsForContext: _mockGenerateMigrationsForContext,
        loadSnapshot: _mockLoadSnapshot,
        writeSnapshot: _mockWriteSnapshot,
        getPolymorphicVariantSchemas: vi.fn().mockReturnValue([]),
        getTableName: vi.fn().mockReturnValue('users'),
        tableExistsInDb: vi.fn().mockResolvedValue(false),
        introspectDatabase: vi.fn().mockResolvedValue({
            columns: {},
            indexes: [],
            foreignKeys: [],
            checks: []
        }),
        diffSchema: vi.fn().mockReturnValue({
            addColumns: [],
            dropColumns: [],
            alterColumns: [],
            addIndexes: [],
            dropIndexes: [],
            addForeignKeys: [],
            dropForeignKeys: []
        }),
        isDiffEmpty: vi.fn().mockReturnValue(true),
        generateCreateTable: vi.fn().mockReturnValue(vi.fn()),
        applyDiff: vi.fn().mockResolvedValue(undefined)
    };
});

// ═══════════════════════════════════════════════════════════════════════════
describe('parseFlags', () => {
    it('parses boolean flags', () => {
        expect(parseFlags(['--all'])).toEqual({ '--all': true });
    });

    it('parses flags with values', () => {
        expect(
            parseFlags(['--config', 'db.config.ts', '--dir', './migs'])
        ).toEqual({ '--config': 'db.config.ts', '--dir': './migs' });
    });

    it('parses mixed flags and positional args', () => {
        const flags = parseFlags(['--dir', './migs', '--yes']);
        expect(flags['--dir']).toBe('./migs');
        expect(flags['--yes']).toBe(true);
    });

    it('handles empty argv', () => {
        expect(parseFlags([])).toEqual({});
    });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('generate command', () => {
    let tmpDir: string;

    beforeAll(() => {
        tmpDir = path.join(os.tmpdir(), `orm-cli-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('writes a timestamped migration file and updates the snapshot', async () => {
        const mockNextSnapshot = { version: 1 as const, tables: {} };
        const mockSource = [
            `import type { Knex } from 'knex';`,
            ``,
            `export async function up(knex: Knex): Promise<void> {`,
            `    await knex.schema.createTable('users', (table) => { table.increments('id'); });`,
            `}`,
            ``,
            `export async function down(knex: Knex): Promise<void> {`,
            `    await knex.schema.dropTableIfExists('users');`,
            `}`,
            ``
        ].join('\n');

        _mockLoadSnapshot.mockReturnValueOnce({ version: 1, tables: {} });
        _mockGenerateMigrationsForContext.mockReturnValueOnce({
            isEmpty: false,
            up: `    await knex.schema.createTable('users', (table) => { table.increments('id'); });`,
            down: `    await knex.schema.dropTableIfExists('users');`,
            full: mockSource,
            nextSnapshot: mockNextSnapshot
        });

        const { generate } = await import('./commands/generate.js');
        const config = {
            knex: {} as any,
            entities: {},
            migrations: { directory: tmpDir }
        };

        await generate('init', config, {});

        const files = readdirSync(tmpDir).filter(f => f.endsWith('_init.ts'));
        expect(files).toHaveLength(1);

        const content = readFileSync(path.join(tmpDir, files[0]), 'utf-8');
        expect(content).toContain("import type { Knex } from 'knex'");
        expect(content).toContain('export async function up');
        expect(content).toContain('export async function down');

        // Filename matches YYYYMMDDHHmmss_init.ts pattern
        expect(files[0]).toMatch(/^\d{14}_init\.ts$/);

        // Snapshot must have been written
        expect(_mockWriteSnapshot).toHaveBeenCalledWith(
            expect.stringContaining('snapshot.json'),
            mockNextSnapshot
        );
    });

    it('prints a no-changes message and writes no file when diff is empty', async () => {
        _mockLoadSnapshot.mockReturnValueOnce({ version: 1, tables: {} });
        _mockGenerateMigrationsForContext.mockReturnValueOnce({
            isEmpty: true,
            up: '',
            down: '',
            full: '',
            nextSnapshot: { version: 1, tables: {} }
        });

        const consoleSpy = vi
            .spyOn(console, 'log')
            .mockImplementation(() => {});

        const { generate } = await import('./commands/generate.js');
        const config = {
            knex: {} as any,
            entities: {},
            migrations: { directory: tmpDir }
        };

        const before = readdirSync(tmpDir).length;
        await generate('noop', config, {});

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('No schema changes')
        );
        // No new file written
        expect(readdirSync(tmpDir).length).toBe(before);

        consoleSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('push command — production guard', () => {
    it('exits 1 in NODE_ENV=production without --yes', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);

        const { push } = await import('./commands/push.js');
        const config = {
            knex: {} as any,
            entities: {},
            migrations: { directory: './migrations' }
        };

        await expect(push(config, {})).rejects.toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);

        exitSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Regression: the CLI must close the knex pool after running a command so
// the host process can exit promptly (knex pools otherwise keep idle TCP
// sockets for ~30 s).
describe('cli.run — knex pool cleanup', () => {
    it('calls knex.destroy() after a successful command', async () => {
        const destroy = vi.fn().mockResolvedValue(undefined);
        const fakeKnex = {
            schema: {},
            destroy,
            migrate: {
                list: vi.fn().mockResolvedValue([[], []])
            }
        };

        const tmp = path.join(os.tmpdir(), `orm-cli-destroy-${Date.now()}`);
        mkdirSync(tmp, { recursive: true });
        const cfgPath = path.join(tmp, 'db.config.mjs');
        const stash = (globalThis as any).__cbOrmFakeKnex;
        (globalThis as any).__cbOrmFakeKnex = fakeKnex;
        try {
            const cfgSrc = `
                export default {
                    knex: globalThis.__cbOrmFakeKnex,
                    entities: {},
                    migrations: { directory: ${JSON.stringify(tmp)} }
                };
            `;
            const fs = await import('node:fs');
            fs.writeFileSync(cfgPath, cfgSrc, 'utf-8');

            const { run } = await import('./cli.js');
            await run(['migrate', 'status', '--config', cfgPath]);

            expect(destroy).toHaveBeenCalledTimes(1);
        } finally {
            (globalThis as any).__cbOrmFakeKnex = stash;
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('calls knex.destroy() even when the command throws', async () => {
        const destroy = vi.fn().mockResolvedValue(undefined);
        const fakeKnex = {
            schema: {},
            destroy,
            migrate: {
                list: vi.fn().mockRejectedValue(new Error('boom'))
            }
        };

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const tmp = path.join(os.tmpdir(), `orm-cli-destroy-err-${Date.now()}`);
        mkdirSync(tmp, { recursive: true });
        const cfgPath = path.join(tmp, 'db.config.mjs');
        const stash = (globalThis as any).__cbOrmFakeKnex;
        (globalThis as any).__cbOrmFakeKnex = fakeKnex;
        try {
            const cfgSrc = `
                export default {
                    knex: globalThis.__cbOrmFakeKnex,
                    entities: {},
                    migrations: { directory: ${JSON.stringify(tmp)} }
                };
            `;
            const fs = await import('node:fs');
            fs.writeFileSync(cfgPath, cfgSrc, 'utf-8');

            const { run } = await import('./cli.js');
            await expect(
                run(['migrate', 'status', '--config', cfgPath])
            ).rejects.toThrow('process.exit called');

            expect(destroy).toHaveBeenCalledTimes(1);
            expect(exitSpy).toHaveBeenCalledWith(1);
        } finally {
            (globalThis as any).__cbOrmFakeKnex = stash;
            exitSpy.mockRestore();
            errSpy.mockRestore();
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
