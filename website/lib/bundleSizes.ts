import fs from 'fs';
import path from 'path';

export interface BundleSizeEntry {
    /** e.g. "@cleverbrush/schema" */
    label: string;
    /** e.g. "no built-in extensions" — empty string if not applicable */
    description: string;
    /** e.g. "@cleverbrush/schema/core" */
    import: string;
    /** minified + gzip (level 9) bytes */
    gzip: number;
    /** minified + brotli (max quality) bytes */
    brotli: number;
}

export interface BundleSizes {
    generatedAt: string;
    entries: BundleSizeEntry[];
}

/** Module-level cache — populated on first call, reused on all subsequent calls */
let cached: BundleSizes | null = null;

export function loadBundleSizes(): BundleSizes {
    if (cached !== null) {
        return cached;
    }

    const candidatePaths = [
        path.resolve(process.cwd(), 'bundle-sizes.json'),
        path.resolve(process.cwd(), '..', 'bundle-sizes.json'),
        path.resolve(process.cwd(), '..', '..', 'bundle-sizes.json')
    ];

    for (const candidate of candidatePaths) {
        try {
            const raw = JSON.parse(
                fs.readFileSync(candidate, 'utf-8')
            ) as BundleSizes;
            cached = raw;
            return cached;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(
                    `[loadBundleSizes] Error reading ${candidate}:`,
                    err
                );
            }
        }
    }

    console.warn(
        '[loadBundleSizes] bundle-sizes.json not found — run `node scripts/measure-bundle-sizes.js`'
    );
    cached = { generatedAt: '', entries: [] };
    return cached;
}

/** Format bytes as "14.0 KB" */
export function fmtKB(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
}
