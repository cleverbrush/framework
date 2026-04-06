#!/usr/bin/env node
/**
 * Measures the gzipped size of the @cleverbrush/schema build output and
 * updates the bundle-size badge in libs/schema/README.md.
 *
 * All non-sourcemap .js files under libs/schema/dist/ are concatenated and
 * gzip-compressed at level 9. The result represents the total JavaScript
 * payload of the published package (full build, all entry points).
 *
 * Badge placement uses HTML comment markers so subsequent runs update
 * in-place rather than appending:
 *   <!-- bundle-badge-start -->
 *   [![Bundle size](...)](...)
 *   <!-- bundle-badge-end -->
 *
 * Usage: node scripts/update-bundle-badge.js
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { gzipSync } from 'zlib';

const ROOT = resolve(import.meta.dirname, '..');
const SCHEMA_DIST = join(ROOT, 'libs', 'schema', 'dist');
const README_PATH = join(ROOT, 'libs', 'schema', 'README.md');

if (!existsSync(SCHEMA_DIST)) {
    console.error(
        'Error: libs/schema/dist not found.\n' +
            'Run `npm run build` to generate it.'
    );
    process.exit(1);
}

// Collect all .js files (non-sourcemap) recursively, sorted for reproducibility
function collectJsFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir).sort()) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
            files.push(...collectJsFiles(fullPath));
        } else if (entry.endsWith('.js') && !entry.endsWith('.js.map')) {
            files.push(fullPath);
        }
    }
    return files;
}

const jsFiles = collectJsFiles(SCHEMA_DIST);
const combined = Buffer.concat(jsFiles.map((f) => readFileSync(f)));
const gzipped = gzipSync(combined, { level: 9 });
const kb = (gzipped.length / 1024).toFixed(1);

console.log(
    `\n@cleverbrush/schema bundle: ${kb} KB gzip` +
        ` (${gzipped.length} bytes across ${jsFiles.length} files)`
);

// --- Badge helpers ---

function getColor(kb) {
    const n = parseFloat(kb);
    if (n <= 15) return 'brightgreen';
    if (n <= 25) return 'green';
    if (n <= 40) return 'yellow';
    return 'red';
}

function makeBadge(kb) {
    // Encode spaces as %20 for shields.io path segment
    const label = `${kb}%20KB%20gzip`;
    const color = getColor(kb);
    const url = `https://img.shields.io/badge/bundle-${label}-${color}`;
    const link = 'https://github.com/cleverbrush/framework/blob/master/libs/schema';
    return `[![Bundle size](${url})](${link})`;
}

// --- README badge injection ---

const BADGE_START = '<!-- bundle-badge-start -->';
const BADGE_END = '<!-- bundle-badge-end -->';

if (!existsSync(README_PATH)) {
    console.error(`Error: ${README_PATH} not found.`);
    process.exit(1);
}

let content = readFileSync(README_PATH, 'utf-8');

if (!content.includes(BADGE_START)) {
    console.warn(
        `Warning: ${BADGE_START} markers not found in README.md — badge not updated.\n` +
            'Add <!-- bundle-badge-start --> and <!-- bundle-badge-end --> markers manually.'
    );
    process.exit(0);
}

const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(`${escaped(BADGE_START)}[\\s\\S]*?${escaped(BADGE_END)}`);
content = content.replace(
    regex,
    `${BADGE_START}\n${makeBadge(kb)}\n${BADGE_END}`
);
writeFileSync(README_PATH, content);
console.log(`  updated: ${README_PATH}`);
