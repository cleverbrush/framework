import { describe, expect, it, vi } from 'vitest';
import { status } from './status.js';

function makeConfig(completed: any[] = [], pending: any[] = []) {
    const knex: any = {
        migrate: {
            list: vi.fn().mockResolvedValue([completed, pending])
        }
    };
    return {
        config: {
            knex,
            entities: {} as any,
            migrations: { directory: './migrations' }
        },
        knex
    };
}

describe('migrate status', () => {
    it('reports "No migrations found" when both lists are empty', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig([], []);
        await status(config, {});
        expect(log).toHaveBeenCalledWith(
            'No migrations found in the configured directory.'
        );
        log.mockRestore();
    });

    it('lists applied migrations', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig(
            [{ name: '2024_init.ts' }, '2024_users.ts'],
            []
        );
        await status(config, {});
        const output = log.mock.calls.flat().join('\n');
        expect(output).toMatch(/Applied migrations/);
        expect(output).toMatch(/2024_init\.ts/);
        expect(output).toMatch(/2024_users\.ts/);
        expect(output).toMatch(/up to date/);
        log.mockRestore();
    });

    it('lists pending migrations', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig(
            ['2024_init.ts'],
            [{ file: '2024_pending.ts' }]
        );
        await status(config, {});
        const output = log.mock.calls.flat().join('\n');
        expect(output).toMatch(/Pending migrations/);
        expect(output).toMatch(/2024_pending\.ts/);
        log.mockRestore();
    });

    it('handles applied migrations with .file property', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig([{ file: 'v1.ts' }], []);
        await status(config, {});
        const output = log.mock.calls.flat().join('\n');
        expect(output).toMatch(/v1\.ts/);
        log.mockRestore();
    });

    it('handles pending migrations with .name property', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { config } = makeConfig([], [{ name: 'v2.ts' }]);
        await status(config, {});
        const output = log.mock.calls.flat().join('\n');
        expect(output).toMatch(/v2\.ts/);
        log.mockRestore();
    });

    it('handles object migration entries with neither name nor file', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const migration = { id: 99 };
        const { config } = makeConfig([migration], []);
        await status(config, {});
        const output = log.mock.calls.flat().join('\n');
        expect(output).toMatch(/\[object Object\]/);
        log.mockRestore();
    });
});
