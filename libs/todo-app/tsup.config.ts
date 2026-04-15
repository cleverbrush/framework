import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    minify: false,
    sourcemap: true,
    clean: true,
    target: 'es2022'
});
