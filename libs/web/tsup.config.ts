import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/retry.ts',
        'src/timeout.ts',
        'src/dedupe.ts',
        'src/cache.ts'
    ],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    minify: true,
    sourcemap: true,
    clean: true,
    target: 'es2022'
});
