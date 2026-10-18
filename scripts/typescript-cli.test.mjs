import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { typescriptCli } from './typescript-cli.mjs';

test('builds and consumer checks resolve the pinned native compiler', () => {
    const result = spawnSync(process.execPath, [typescriptCli(), '--version'], {
        encoding: 'utf8'
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('Version 7.1.0-dev.20261007.1');
});

test('the legacy compiler is confined to the TypeDoc dependency tree', () => {
    const tooling = createRequire(new URL('./api-docs/package.json', import.meta.url));
    const typedoc = tooling.resolve('typedoc-legacy/package.json');
    const compiler = createRequire(typedoc).resolve('typescript/package.json');
    expect(JSON.parse(readFileSync(compiler, 'utf8')).version).toBe('6.0.3');
    expect(resolve(dirname(compiler), 'bin/tsc')).not.toBe(typescriptCli());
    const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
    const legacy = Object.entries(lock.packages).filter(([name, pkg]) =>
        name.endsWith('node_modules/typescript') && pkg.version !== '7.1.0-dev.20261007.1'
    );
    expect(legacy.map(([name]) => name)).toEqual([
        'scripts/api-docs/node_modules/typescript'
    ]);
});
