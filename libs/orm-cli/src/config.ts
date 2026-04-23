// @cleverbrush/orm-cli — config loader

import { existsSync } from 'node:fs';
import path from 'node:path';
import type { OrmCliConfig } from './types.js';

const CANDIDATE_NAMES = [
    'db.config.ts',
    'db.config.js',
    'db.config.mjs'
] as const;

/**
 * Load and validate a CLI config file.
 *
 * Resolution order:
 * 1. Explicit `configPath` argument (relative to `process.cwd()`).
 * 2. `db.config.ts`, `db.config.js`, `db.config.mjs` in `process.cwd()`.
 *
 * The file must export a default {@link OrmCliConfig} object (or use the
 * {@link defineConfig} helper).  TypeScript files work because the tsx ESM
 * hook was registered in `bin.ts` before this module is imported.
 */
export async function loadConfig(configPath?: string): Promise<OrmCliConfig> {
    const resolved = configPath
        ? path.resolve(process.cwd(), configPath)
        : findConfigFile();

    if (!existsSync(resolved)) {
        throw new Error(`Config file not found: ${resolved}`);
    }

    // Use a file:// URL so Node's ESM loader accepts absolute paths on all
    // platforms (including Windows).
    const mod = await import(
        process.platform === 'win32' ? `file://${resolved}` : resolved
    );

    const config: unknown = mod.default ?? mod;
    assertConfig(config);
    return config;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findConfigFile(): string {
    for (const name of CANDIDATE_NAMES) {
        const candidate = path.resolve(process.cwd(), name);
        if (existsSync(candidate)) return candidate;
    }
    throw new Error(
        `No config file found. Create db.config.ts in your project root, ` +
            `or pass --config <path>.`
    );
}

function assertConfig(config: unknown): asserts config is OrmCliConfig {
    if (!config || typeof config !== 'object') {
        throw new Error(
            'Config must be an object (default export of db.config.ts).'
        );
    }
    const c = config as Record<string, unknown>;
    if (!c.knex || typeof (c.knex as any).schema !== 'object') {
        throw new Error('config.knex must be a Knex instance.');
    }
    if (!c.entities || typeof c.entities !== 'object') {
        throw new Error(
            'config.entities must be an object mapping names to Entity instances.'
        );
    }
    if (!c.migrations || typeof (c.migrations as any).directory !== 'string') {
        throw new Error(
            'config.migrations.directory must be a non-empty string path.'
        );
    }
}
