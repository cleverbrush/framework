import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { extern, number, object } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { zodDeclarations } from '../websites/schema/app/playground/zodDeclarations.ts';

describe('Zod playground assets', () => {
    it('composes bundled Zod schemas through Standard Schema interop', () => {
        const sandbox = {};
        runInNewContext(readFileSync(new URL(
            '../websites/schema/public/playground/zod-bundle.js', import.meta.url
        ), 'utf8'), sandbox);
        const { z } = sandbox.__zod;
        const schema = object({
            address: extern(z.object({ city: z.string().min(1) })),
            total: number().min(1)
        });
        expect(schema.validate({ address: { city: 'Example' }, total: 5 }).valid)
            .toBe(true);
        expect(schema.validate({ address: { city: '' }, total: 5 }).valid)
            .toBe(false);
    });

    it('resolves the editor declarations for a typed Zod consumer', () => {
        const directory = mkdtempSync(join(tmpdir(), 'framework-zod-types-'));
        try {
            for (const [url, content] of Object.entries(zodDeclarations)) {
                const path = join(directory, new URL(url).pathname.slice(1));
                mkdirSync(dirname(path), { recursive: true });
                writeFileSync(path, content);
            }
            writeFileSync(join(directory, 'package.json'),
                JSON.stringify({ type: 'module' }));
            writeFileSync(join(directory, 'consumer.ts'), `import { z } from 'zod';
import type { $ZodType } from 'zod/v4/core';
const Address = z.object({ city: z.string().min(1) });
const standardSchema: $ZodType = Address;
const address: z.infer<typeof Address> = { city: 'Example' };
Address.safeParse(address);`);
            writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({
                compilerOptions: {
                    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
                    strict: true, noEmit: true, types: [], lib: ['ES2022', 'DOM']
                },
                files: ['consumer.ts']
            }));
            // Keep compiler memory out of the long-lived Vitest worker.
            execFileSync(process.execPath, [fileURLToPath(new URL(
                '../node_modules/typescript/bin/tsc', import.meta.url
            )), '-p', join(directory, 'tsconfig.json')], {
                encoding: 'utf8', timeout: 20000
            });
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    }, 30000);
});
