#!/usr/bin/env node
/**
 * Builds a self-contained IIFE bundle of Zod for the interactive playground.
 * Output is placed in websites/schema/public/playground/ alongside schema-bundle.js.
 *
 * Usage:  node scripts/build-zod-bundle.js
 */
import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'websites/schema/public/playground');

mkdirSync(outDir, { recursive: true });

await build({
    entryPoints: [resolve(root, 'node_modules/zod/index.js')],
    bundle: true,
    format: 'iife',
    globalName: '__zod',
    target: 'es2022',
    outfile: resolve(outDir, 'zod-bundle.js'),
    sourcemap: false,
    minify: true,
    external: [],
    packages: 'bundle'
});

console.log(
    '✅ Playground Zod bundle built → websites/schema/public/playground/zod-bundle.js'
);
