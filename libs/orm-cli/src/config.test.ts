import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

let dir: string;
let prevCwd: string;

function withCwd(d: string): void {
    prevCwd = process.cwd();
    process.chdir(d);
}

afterEach(() => {
    if (prevCwd) process.chdir(prevCwd);
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = '';
    prevCwd = '';
});

function writeConfig(filename: string, body: string): string {
    const filePath = path.join(dir, filename);
    writeFileSync(filePath, body, 'utf8');
    return filePath;
}

const validBody = `
const knex = { schema: {} };
const entities = { users: {} };
const migrations = { directory: './migrations' };
export default { knex, entities, migrations };
`;

describe('loadConfig', () => {
    it('throws when explicit configPath does not exist', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        await expect(loadConfig(path.join(dir, 'missing.ts'))).rejects.toThrow(
            /not found/
        );
    });

    it('throws when no config file is in cwd', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        withCwd(dir);
        await expect(loadConfig()).rejects.toThrow(/No config file found/);
    });

    it('loads a valid db.config.mjs from cwd', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        writeConfig('db.config.mjs', validBody);
        withCwd(dir);

        const cfg = await loadConfig();
        expect(cfg.entities).toMatchObject({ users: {} });
        expect(cfg.migrations.directory).toBe('./migrations');
    });

    it('loads a config file via explicit path', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        const file = writeConfig('custom.mjs', validBody);
        const cfg = await loadConfig(file);
        expect(cfg.migrations.directory).toBe('./migrations');
    });

    it('throws when the module default export is not an object', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        const file = writeConfig('bad.mjs', `export default 42;`);
        await expect(loadConfig(file)).rejects.toThrow(/must be an object/);
    });

    it('throws when knex is missing or has no schema', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        const file = writeConfig(
            'bad.mjs',
            `export default { entities: {}, migrations: { directory: './m' } };`
        );
        await expect(loadConfig(file)).rejects.toThrow(/knex/);
    });

    it('throws when entities is missing', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        const file = writeConfig(
            'bad.mjs',
            `export default { knex: { schema: {} }, migrations: { directory: './m' } };`
        );
        await expect(loadConfig(file)).rejects.toThrow(/entities/);
    });

    it('throws when migrations.directory is missing', async () => {
        dir = mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
        const file = writeConfig(
            'bad.mjs',
            `export default { knex: { schema: {} }, entities: {}, migrations: {} };`
        );
        await expect(loadConfig(file)).rejects.toThrow(/directory/);
    });
});
