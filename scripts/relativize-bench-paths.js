#!/usr/bin/env node
/**
 * Replaces absolute file paths in bench-results.json with paths relative to
 * the repository root, so the committed file is machine-independent.
 *
 * Usage: node scripts/relativize-bench-paths.js [bench-results.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const outputPath = join(ROOT, process.argv[2] ?? 'bench-results.json');

if (!existsSync(outputPath)) {
    console.error(`Error: ${outputPath} not found.`);
    process.exit(1);
}

/**
 * Convert an absolute filepath to one relative to the repo root.
 * If the path is already relative, or is a sub-path of ROOT, use
 * Node's `relative()`. Otherwise, find the first segment that matches
 * a known top-level repo directory so the result stays repo-relative
 * even when the file was generated on a different machine.
 */
function toRelative(filepath) {
    // Already relative
    if (!filepath.startsWith('/')) return filepath;

    // Same machine: path is inside ROOT
    if (filepath.startsWith(ROOT + '/') || filepath === ROOT) {
        return relative(ROOT, filepath);
    }

    // Different machine: find the first known repo top-level directory
    // (libs, website, scripts, …) in the absolute path and use that as
    // the relative root. This is only needed when bench-results.json was
    // generated on a machine with a different repo checkout path.
    // Add more top-level dirs here if the project structure changes.
    const knownRoots = ['libs/', 'websites/', 'scripts/', 'examples/'];
    for (const prefix of knownRoots) {
        const idx = filepath.indexOf('/' + prefix);
        if (idx !== -1) {
            return filepath.slice(idx + 1); // strip leading '/'
        }
    }

    // Fallback: best-effort relative path
    return relative(ROOT, filepath);
}

const data = JSON.parse(readFileSync(outputPath, 'utf-8'));

for (const file of data.files ?? []) {
    if (file.filepath) {
        file.filepath = toRelative(file.filepath);
    }
}

writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Relativized paths in ${outputPath}`);
