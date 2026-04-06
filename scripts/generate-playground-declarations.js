#!/usr/bin/env node
/**
 * Reads all .d.ts files from libs/schema/dist and generates a TypeScript
 * module that the playground editor uses to feed Monaco's TS language service
 * with the real @cleverbrush/schema types.
 *
 * Usage:  node scripts/generate-playground-declarations.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'libs', 'schema', 'dist');
const OUTPUT = join(
    __dirname,
    '..',
    'website',
    'app',
    'playground',
    'schemaDeclarations.ts'
);

/** Recursively collect all .d.ts files under `dir`. */
function collectDts(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            collectDts(full, acc);
        } else if (entry.endsWith('.d.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

const files = collectDts(DIST_DIR);

const entries = files.map((absPath) => {
    const rel = relative(DIST_DIR, absPath); // e.g. "builders/SchemaBuilder.d.ts"
    const monacoPath = `file:///node_modules/@cleverbrush/schema/${rel}`;
    const content = readFileSync(absPath, 'utf-8');
    return { monacoPath, content };
});

// Also include @standard-schema/spec types (required by ExternSchemaBuilder).
// Register at multiple paths to ensure Monaco resolves bare `@standard-schema/spec` imports.
const STANDARD_SCHEMA_DTS = join(
    __dirname, '..', 'node_modules', '@standard-schema', 'spec', 'dist', 'index.d.ts'
);
try {
    const ssContent = readFileSync(STANDARD_SCHEMA_DTS, 'utf-8');
    for (const monacoPath of [
        'file:///node_modules/@standard-schema/spec/dist/index.d.ts',
        'file:///node_modules/@standard-schema/spec/index.d.ts',
    ]) {
        entries.push({ monacoPath, content: ssContent });
    }
} catch {
    console.warn('⚠ @standard-schema/spec not found — extern() types may not work in playground');
}

let output = `// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-playground-declarations.js
//
// Maps Monaco virtual-FS paths to .d.ts content from libs/schema/dist.

export const schemaDeclarations: Record<string, string> = {\n`;

for (const { monacoPath, content } of entries) {
    // Escape backticks and ${} in the content for template literal safety
    const escaped = content.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
    output += `    ${JSON.stringify(monacoPath)}: \`${escaped}\`,\n`;
}

output += `};\n`;

writeFileSync(OUTPUT, output, 'utf-8');
console.log(`Generated ${entries.length} declarations → ${OUTPUT}`);
