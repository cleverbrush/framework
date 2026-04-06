#!/usr/bin/env node
/**
 * Measures the minified + compressed size of each @cleverbrush/schema
 * entry-point and writes the results to bundle-sizes.json at the repo root.
 *
 * Each entry point is bundled in-memory with esbuild (no output file written),
 * then the output bytes are compressed at gzip level 9 and with brotli
 * default-quality, matching what a CDN/browser typically serves.
 *
 * Usage:  node scripts/measure-bundle-sizes.js
 * Run automatically as part of `npm run build:all`.
 */
import { build } from 'esbuild';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const schemaDir = resolve(root, 'libs', 'schema');
const tsconfigPath = resolve(schemaDir, 'tsconfig.build.json');

const ENTRY_POINTS = [
    {
        label: '@cleverbrush/schema',
        description: 'full',
        import: '@cleverbrush/schema',
        src: 'src/index.ts'
    },
    {
        label: '@cleverbrush/schema/core',
        description: 'no built-in extensions',
        import: '@cleverbrush/schema/core',
        src: 'src/core.ts'
    },
    {
        label: '@cleverbrush/schema/string',
        description: 'single builder',
        import: '@cleverbrush/schema/string',
        src: 'src/builders/StringSchemaBuilder.ts'
    },
    {
        label: '@cleverbrush/schema/number',
        description: '',
        import: '@cleverbrush/schema/number',
        src: 'src/builders/NumberSchemaBuilder.ts'
    },
    {
        label: '@cleverbrush/schema/object',
        description: '',
        import: '@cleverbrush/schema/object',
        src: 'src/builders/ObjectSchemaBuilder.ts'
    },
    {
        label: '@cleverbrush/schema/array',
        description: '',
        import: '@cleverbrush/schema/array',
        src: 'src/builders/ArraySchemaBuilder.ts'
    }
];

async function measureEntry(entry) {
    const result = await build({
        entryPoints: [resolve(schemaDir, entry.src)],
        bundle: true,
        format: 'esm',
        target: 'es2022',
        write: false,
        sourcemap: false,
        minify: true,
        packages: 'bundle',
        tsconfig: tsconfigPath
    });

    const code = result.outputFiles[0].contents; // Uint8Array
    const gzip = gzipSync(code, { level: 9 }).byteLength;
    const brotli = brotliCompressSync(code, {
        params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]:
                zlibConstants.BROTLI_MAX_QUALITY
        }
    }).byteLength;

    return { ...entry, gzip, brotli };
}

console.log('📦 Measuring bundle sizes for @cleverbrush/schema…');

const entries = await Promise.all(ENTRY_POINTS.map(measureEntry));

const output = {
    generatedAt: new Date().toISOString(),
    entries: entries.map(({ label, description, import: imp, gzip, brotli }) => ({
        label,
        description,
        import: imp,
        gzip,
        brotli
    }))
};

const outPath = resolve(root, 'bundle-sizes.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

const fmt = (n) => (n / 1024).toFixed(1) + ' KB';
for (const e of output.entries) {
    console.log(`  ${e.label.padEnd(36)} gzip: ${fmt(e.gzip).padStart(8)}  brotli: ${fmt(e.brotli).padStart(8)}`);
}
console.log(`✅ bundle-sizes.json written → ${outPath}`);
