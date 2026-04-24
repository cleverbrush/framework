import { defineConfig } from 'tsup';

export default defineConfig([
    // Library exports — defineConfig helper for user db.config.ts files
    {
        entry: ['src/index.ts'],
        format: ['esm'],
        tsconfig: './tsconfig.build.json',
        clean: true,
        target: 'es2022',
        external: ['@cleverbrush/knex-schema', 'knex']
    },
    // CLI binary — bundled into a single dist/bin.js with shebang
    {
        entry: { bin: 'src/bin.ts' },
        format: ['esm'],
        tsconfig: './tsconfig.build.json',
        target: 'es2022',
        // tsx + knex + knex-schema stay as runtime dependencies (not bundled)
        external: ['@cleverbrush/knex-schema', 'knex', /^tsx/],
        banner: { js: '#!/usr/bin/env node' },
        noExternal: []
    }
]);
