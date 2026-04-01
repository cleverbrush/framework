#!/usr/bin/env node
/**
 * Builds a self-contained ESM bundle of @cleverbrush/schema for the
 * interactive playground. Output is placed in website/public/playground/.
 *
 * Usage:  node scripts/build-playground-bundle.js
 */
import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'website/public/playground');

mkdirSync(outDir, { recursive: true });

await build({
    entryPoints: [resolve(root, 'libs/schema/src/index.ts')],
    bundle: true,
    format: 'iife',
    globalName: '__schema',
    target: 'es2022',
    outfile: resolve(outDir, 'schema-bundle.js'),
    sourcemap: false,
    minify: true,
    external: [],
    // @cleverbrush/deep is a peer dep — bundle it inline
    packages: 'bundle',
    tsconfig: resolve(root, 'libs/schema/tsconfig.build.json')
});

console.log('✅ Playground schema bundle built → website/public/playground/schema-bundle.js');
