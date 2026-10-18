// @vitest-environment node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { typescriptCli } from '../../../scripts/typescript-cli.mjs';

test('consumers can emit declarations for exported inferred form systems', () => {
    const fixture = fileURLToPath(
        new URL('../test-fixtures/exported-system.tsx', import.meta.url)
    );
    const output = mkdtempSync(join(tmpdir(), 'framework-form-declarations-'));
    try {
        const result = spawnSync(
            process.execPath,
            [
                typescriptCli(),
                '--ignoreConfig',
                '--declaration',
                '--emitDeclarationOnly',
                '--strict',
                '--skipLibCheck',
                '--target',
                'ES2022',
                '--module',
                'ESNext',
                '--moduleResolution',
                'bundler',
                '--jsx',
                'react-jsx',
                '--outDir',
                output,
                '--rootDir',
                dirname(fixture),
                fixture
            ],
            { encoding: 'utf8', timeout: 60_000 }
        );
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(0);
        expect(
            readFileSync(join(output, 'exported-system.d.ts'), 'utf8')
        ).toContain('TypedFormSystem');
    } finally {
        rmSync(output, { recursive: true, force: true });
    }
}, 60_000);
