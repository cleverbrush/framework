#!/usr/bin/env node
/**
 * Reads .d.ts files from Zod's v3 API surface in node_modules and generates
 * a TypeScript module that the playground editor uses to feed Monaco's TS
 * language service with Zod types (needed for the extern() example).
 *
 * Usage:  node scripts/generate-zod-declarations.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ZOD_DIR = join(__dirname, '..', 'node_modules', 'zod');
const OUTPUT = join(
    __dirname,
    '..',
    'website',
    'app',
    'playground',
    'zodDeclarations.ts'
);

/** Recursively collect all .d.ts files under `dir`. */
function collectDts(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            // Only recurse into v3/ and v3/helpers/ — skip v4, locales, etc.
            if (
                full.endsWith('/v3') ||
                full.endsWith('/v3/helpers')
            ) {
                collectDts(full, acc);
            }
        } else if (entry.endsWith('.d.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

const files = collectDts(ZOD_DIR);

const entries = files.map((absPath) => {
    const rel = relative(ZOD_DIR, absPath); // e.g. "v3/types.d.ts"
    const monacoPath = `file:///node_modules/zod/${rel}`;
    const content = readFileSync(absPath, 'utf-8');
    return { monacoPath, content };
});

let output = `// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-zod-declarations.js
//
// Maps Monaco virtual-FS paths to .d.ts content from node_modules/zod.

export const zodDeclarations: Record<string, string> = {\n`;

for (const { monacoPath, content } of entries) {
    // Escape backticks and ${} in the content for template literal safety
    const escaped = content
        .replaceAll('\\', '\\\\')
        .replaceAll('`', '\\`')
        .replaceAll('${', '\\${');
    output += `    ${JSON.stringify(monacoPath)}: \`${escaped}\`,\n`;
}

output += `};\n`;

writeFileSync(OUTPUT, output, 'utf-8');
console.log(`Generated ${entries.length} Zod declarations → ${OUTPUT}`);
