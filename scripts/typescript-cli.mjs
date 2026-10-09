import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/** Resolve the installed compiler through its public package metadata. */
export function typescriptCli(from = import.meta.url) {
    const manifest = createRequire(from).resolve('typescript/package.json');
    const { bin } = JSON.parse(readFileSync(manifest, 'utf8'));
    return resolve(dirname(manifest), bin.tsc);
}
