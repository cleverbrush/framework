import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// TypeDoc still needs the TypeScript 6 compiler API. Keep its dependency
// resolution separate from the native compiler used by builds and tests.
const tooling = createRequire(new URL('./api-docs/package.json', import.meta.url));
const manifest = tooling.resolve('typedoc-legacy/package.json');
const { bin } = JSON.parse(readFileSync(manifest, 'utf8'));
const result = spawnSync(
    process.execPath,
    [resolve(dirname(manifest), bin.typedoc), ...process.argv.slice(2)],
    {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        stdio: 'inherit'
    }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
